import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { cacheGet, cacheSet } from './cache';

describe('cache', () => {
	beforeEach(() => {
		fakeBrowser.reset();
	});

	it('returns null for missing key', async () => {
		const result = await cacheGet<string>('nonexistent');
		expect(result).toBeNull();
	});

	it('stores and retrieves a value', async () => {
		await cacheSet('test-key', { hello: 'world' }, 60_000);
		const result = await cacheGet<{ hello: string }>('test-key');
		expect(result).toEqual({ hello: 'world' });
	});

	it('returns null for expired entries', async () => {
		await cacheSet('expired', 'data', 1_000);

		// Advance time past TTL
		vi.setSystemTime(Date.now() + 2_000);

		const result = await cacheGet<string>('expired');
		expect(result).toBeNull();
	});

	it('returns value within TTL window', async () => {
		await cacheSet('fresh', 'data', 10_000);

		vi.setSystemTime(Date.now() + 5_000);

		const result = await cacheGet<string>('fresh');
		expect(result).toBe('data');
	});

	it('overwrites existing cache entry', async () => {
		await cacheSet('key', 'old', 60_000);
		await cacheSet('key', 'new', 60_000);

		const result = await cacheGet<string>('key');
		expect(result).toBe('new');
	});
});
