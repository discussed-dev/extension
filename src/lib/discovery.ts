import { cacheGet, cacheSet } from './cache';
import { searchHn } from './hn';
import { searchLobsters } from './lobsters';
import { searchReddit } from './reddit';
import { settings } from './settings';
import type { Discussion } from './types';
import { normalizeUrl, shouldSkipUrl } from './url';

export interface DiscoverOptions {
	force?: boolean;
}

const SOURCE_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error(`Source timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		promise.then(
			(value) => {
				clearTimeout(timeout);
				resolve(value);
			},
			(error) => {
				clearTimeout(timeout);
				reject(error);
			},
		);
	});
}

export async function discoverDiscussions(
	rawUrl: string,
	options: DiscoverOptions = {},
): Promise<Discussion[]> {
	if (shouldSkipUrl(rawUrl)) return [];

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
	if (userSettings.enableHn) searches.push(withTimeout(searchHn(url), SOURCE_TIMEOUT_MS));
	if (userSettings.enableReddit) searches.push(withTimeout(searchReddit(url), SOURCE_TIMEOUT_MS));
	if (userSettings.enableLobsters)
		searches.push(withTimeout(searchLobsters(url), SOURCE_TIMEOUT_MS));

	const results = await Promise.allSettled(searches);

	const discussions = results.flatMap((result) =>
		result.status === 'fulfilled' ? result.value : [],
	);

	await cacheSet(cacheKey, discussions, cacheTtlMs);

	return discussions;
}
