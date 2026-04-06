import { cacheGet, cacheSet } from './cache';
import { searchHn } from './hn';
import { searchLobsters } from './lobsters';
import { searchReddit } from './reddit';
import { settings } from './settings';
import type { Discussion } from './types';
import { normalizeUrl } from './url';

export interface DiscoverOptions {
	force?: boolean;
}

export async function discoverDiscussions(
	rawUrl: string,
	options: DiscoverOptions = {},
): Promise<Discussion[]> {
	const userSettings = await settings.getValue();
	const keepQuery = !userSettings.ignoreQueryString;
	const url = normalizeUrl(rawUrl, { keepQueryString: keepQuery });
	const cacheTtlMs = userSettings.cacheDurationMinutes * 60 * 1000;
	const cacheKey = `discussions:${url}`;

	if (!options.force) {
		const cached = await cacheGet<Discussion[]>(cacheKey);
		if (cached) return cached;
	}

	const searches: Array<Promise<Discussion[]>> = [];
	if (userSettings.enableHn) searches.push(searchHn(url));
	if (userSettings.enableReddit) searches.push(searchReddit(url));
	if (userSettings.enableLobsters) searches.push(searchLobsters(url));

	const results = await Promise.allSettled(searches);

	const discussions = results.flatMap((result) =>
		result.status === 'fulfilled' ? result.value : [],
	);

	await cacheSet(cacheKey, discussions, cacheTtlMs);

	return discussions;
}
