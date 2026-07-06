/**
 * Bloom filter for fast HN URL lookup.
 *
 * The filter is a binary file distributed via GitHub Releases.
 * Format: [4 bytes num_hashes (uint32 LE)] [4 bytes num_bits (uint32 LE)] [bit array]
 */

const BLOOM_STORAGE_KEY = 'bloom:filter';
const BLOOM_VERSION_KEY = 'bloom:version';
const BLOOM_REPO = 'discussed-dev/extension';

interface BloomFilter {
	buffer: Uint8Array;
	numHashes: number;
	numBits: number;
}

interface StoredBloom {
	// base64: a 4.5MB filter serializes to ~6MB JSON vs ~17MB as number[],
	// which exceeds Chrome's storage.local quota. Legacy number[] still readable.
	buffer: string | number[];
	numHashes: number;
	numBits: number;
}

let cachedFilter: BloomFilter | null = null;

const BASE64_CHUNK = 0x8000;

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
		binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
	}
	return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

// FNV-1a hash variant for Bloom filter probing
function fnv1a(data: Uint8Array, seed: number): number {
	let hash = 2166136261 ^ seed;
	for (const byte of data) {
		hash ^= byte;
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function bloomCheck(filter: BloomFilter, value: string): boolean {
	const encoded = new TextEncoder().encode(value);
	for (let i = 0; i < filter.numHashes; i++) {
		const hash = fnv1a(encoded, i);
		const bitIndex = hash % filter.numBits;
		const byteIndex = bitIndex >>> 3;
		const bitOffset = bitIndex & 7;
		if ((filter.buffer[byteIndex] & (1 << bitOffset)) === 0) {
			return false;
		}
	}
	return true;
}

function parseBloomFilter(data: ArrayBuffer): BloomFilter {
	const view = new DataView(data);
	const numHashes = view.getUint32(0, true);
	const numBits = view.getUint32(4, true);
	const buffer = new Uint8Array(data, 8);
	return { buffer, numHashes, numBits };
}

async function loadFromStorage(): Promise<BloomFilter | null> {
	const result = await browser.storage.local.get(BLOOM_STORAGE_KEY);
	const stored = result[BLOOM_STORAGE_KEY] as StoredBloom | undefined;
	if (!stored) return null;
	const buffer =
		typeof stored.buffer === 'string'
			? base64ToBytes(stored.buffer)
			: new Uint8Array(stored.buffer);
	return { buffer, numHashes: stored.numHashes, numBits: stored.numBits };
}

async function saveToStorage(filter: BloomFilter, version: string): Promise<void> {
	const stored: StoredBloom = {
		buffer: bytesToBase64(filter.buffer),
		numHashes: filter.numHashes,
		numBits: filter.numBits,
	};
	await browser.storage.local.set({
		[BLOOM_STORAGE_KEY]: stored,
		[BLOOM_VERSION_KEY]: version,
	});
}

export async function getBloomFilter(): Promise<BloomFilter | null> {
	if (cachedFilter) return cachedFilter;
	cachedFilter = await loadFromStorage();
	return cachedFilter;
}

export function checkBloomFilter(filter: BloomFilter, url: string): boolean {
	return bloomCheck(filter, url);
}

export async function updateBloomFilter(): Promise<void> {
	try {
		// Check latest release
		const releaseResp = await fetch(`https://api.github.com/repos/${BLOOM_REPO}/releases/latest`);
		if (!releaseResp.ok) return;

		const release: {
			tag_name: string;
			assets: Array<{ name: string; url: string }>;
		} = await releaseResp.json();

		// Check if we already have this version
		const stored = await browser.storage.local.get(BLOOM_VERSION_KEY);
		const currentVersion = stored[BLOOM_VERSION_KEY] as string | undefined;
		if (currentVersion === release.tag_name) return;

		// Find bloom filter asset
		const asset = release.assets.find((a) => a.name === 'bloom.bin');
		if (!asset) return;

		// Download via GitHub API (avoids CORS redirect issues with browser_download_url)
		const filterResp = await fetch(asset.url, {
			headers: { Accept: 'application/octet-stream' },
		});
		if (!filterResp.ok) return;

		const data = await filterResp.arrayBuffer();
		const filter = parseBloomFilter(data);

		await saveToStorage(filter, release.tag_name);
		cachedFilter = filter;
	} catch (error) {
		console.error('[discussed] bloom filter update failed:', error);
	}
}
