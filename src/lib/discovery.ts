import { cacheGet, cacheSet } from './cache';
import { searchHn } from './hn';
import { searchLobsters } from './lobsters';
import { searchReddit } from './reddit';
import type { Discussion } from './types';
import { normalizeUrl } from './url';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface DiscoverOptions {
	force?: boolean;
}

export async function discoverDiscussions(
	rawUrl: string,
	options: DiscoverOptions = {},
): Promise<Discussion[]> {
	const url = normalizeUrl(rawUrl);
	const cacheKey = `discussions:${url}`;

	if (!options.force) {
		const cached = await cacheGet<Discussion[]>(cacheKey);
		if (cached) return cached;
	}

	const results = await Promise.allSettled([searchHn(url), searchReddit(url), searchLobsters(url)]);

	const discussions = results.flatMap((result) =>
		result.status === 'fulfilled' ? result.value : [],
	);

	await cacheSet(cacheKey, discussions, CACHE_TTL_MS);

	return discussions;
}
