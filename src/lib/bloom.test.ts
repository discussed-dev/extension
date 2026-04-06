import { describe, expect, it } from 'vitest';
import { checkBloomFilter } from './bloom';

// Build a minimal test bloom filter
function makeTestFilter(urls: string[], numHashes = 3, numBits = 1024) {
	const buffer = new Array<number>(Math.ceil(numBits / 8)).fill(0);
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
