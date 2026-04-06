interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}

const PREFIX = 'cache:';

export async function cacheGet<T>(key: string): Promise<T | null> {
	const storageKey = `${PREFIX}${key}`;
	const result = await browser.storage.local.get(storageKey);
	const entry = result[storageKey] as CacheEntry<T> | undefined;

	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		await browser.storage.local.remove(storageKey);
		return null;
	}

	return entry.data;
}

export async function cacheSet<T>(key: string, data: T, ttlMs: number): Promise<void> {
	const storageKey = `${PREFIX}${key}`;
	const entry: CacheEntry<T> = {
		data,
		expiresAt: Date.now() + ttlMs,
	};
	await browser.storage.local.set({ [storageKey]: entry });
}
