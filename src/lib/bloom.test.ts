import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { checkBloomFilter } from './bloom';

// Build a minimal test bloom filter
function makeTestFilter(urls: string[], numHashes = 3, numBits = 1024) {
	const buffer = new Uint8Array(Math.ceil(numBits / 8));
	const encoder = new TextEncoder();

	for (const url of urls) {
		const encoded = encoder.encode(url);
		for (let i = 0; i < numHashes; i++) {
			let hash = 2166136261 ^ i;
			for (const byte of encoded) {
				hash ^= byte;
				hash = Math.imul(hash, 16777619);
			}
			hash = hash >>> 0;
			const bitIndex = hash % numBits;
			const byteIndex = bitIndex >>> 3;
			const bitOffset = bitIndex & 7;
			buffer[byteIndex] |= 1 << bitOffset;
		}
	}

	return { buffer, numHashes, numBits };
}

// Serialize a test filter into the bloom.bin wire format:
// [4 bytes num_hashes LE] [4 bytes num_bits LE] [bit array]
function makeBloomBin(urls: string[], numHashes = 3, numBits = 1024): ArrayBuffer {
	const { buffer } = makeTestFilter(urls, numHashes, numBits);
	const bin = new Uint8Array(8 + buffer.length);
	const view = new DataView(bin.buffer);
	view.setUint32(0, numHashes, true);
	view.setUint32(4, numBits, true);
	bin.set(buffer, 8);
	return bin.buffer;
}

function mockGithubFetch(bin: ArrayBuffer, tag = 'bloom-test') {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => {
			if (url.includes('/releases/latest')) {
				return new Response(
					JSON.stringify({
						tag_name: tag,
						assets: [{ name: 'bloom.bin', url: 'https://api.github.com/assets/1' }],
					}),
				);
			}
			return new Response(bin);
		}),
	);
}

describe('checkBloomFilter', () => {
	it('returns true for inserted URLs', () => {
		const filter = makeTestFilter(['https://example.com', 'https://test.org']);
		expect(checkBloomFilter(filter, 'https://example.com')).toBe(true);
		expect(checkBloomFilter(filter, 'https://test.org')).toBe(true);
	});

	it('returns false for URLs not in filter (with high probability)', () => {
		const filter = makeTestFilter(['https://example.com']);
		// With 1024 bits and 3 hashes, false positive rate for 1 item is very low
		expect(checkBloomFilter(filter, 'https://definitely-not-in-filter.example.org')).toBe(false);
	});

	it('handles empty filter', () => {
		const filter = makeTestFilter([]);
		expect(checkBloomFilter(filter, 'https://example.com')).toBe(false);
	});
});

describe('bloom filter storage', () => {
	beforeEach(() => {
		fakeBrowser.reset();
		vi.resetModules();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('persists the filter as a base64 string, not a number array', async () => {
		// A 4.5MB filter stored as number[] serializes to ~17MB JSON, blowing
		// Chrome's 10MB storage.local quota; base64 stays at ~1.33x binary size.
		mockGithubFetch(makeBloomBin(['https://example.com']));
		const bloom = await import('./bloom');

		await bloom.updateBloomFilter();

		const raw = await fakeBrowser.storage.local.get('bloom:filter');
		const stored = raw['bloom:filter'] as { buffer: unknown };
		expect(stored).toBeTruthy();
		expect(typeof stored.buffer).toBe('string');
	});

	it('round-trips a downloaded filter through storage', async () => {
		mockGithubFetch(makeBloomBin(['https://example.com', 'https://test.org']));
		const bloom = await import('./bloom');

		await bloom.updateBloomFilter();

		// Fresh module context = cold load from storage (popup vs background)
		vi.resetModules();
		const bloomReloaded = await import('./bloom');
		const filter = await bloomReloaded.getBloomFilter();

		expect(filter).not.toBeNull();
		if (!filter) return;
		expect(bloomReloaded.checkBloomFilter(filter, 'https://example.com')).toBe(true);
		expect(bloomReloaded.checkBloomFilter(filter, 'https://not-inserted.example.org')).toBe(false);
	});

	it('reads a legacy number[] filter from storage', async () => {
		const legacy = makeTestFilter(['https://example.com']);
		await fakeBrowser.storage.local.set({
			'bloom:filter': {
				buffer: Array.from(legacy.buffer),
				numHashes: legacy.numHashes,
				numBits: legacy.numBits,
			},
			'bloom:version': 'bloom-legacy',
		});
		const bloom = await import('./bloom');

		const filter = await bloom.getBloomFilter();

		expect(filter).not.toBeNull();
		if (!filter) return;
		expect(bloom.checkBloomFilter(filter, 'https://example.com')).toBe(true);
	});
});
