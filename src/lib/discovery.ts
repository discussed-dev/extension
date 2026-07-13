import { cacheGet, cacheSet } from './cache';
import { searchHn } from './hn';
import { searchLobsters } from './lobsters';
import { searchReddit } from './reddit';
import { settings } from './settings';
import type { Discussion, Platform } from './types';
import { normalizeUrl, shouldSkipUrl } from './url';

export interface DiscoverOptions {
	force?: boolean;
}

export interface DiscoveryResult {
	discussions: Discussion[];
	/** Enabled sources that could not be reached (blocked, rate-limited, timed out). */
	unavailable: Platform[];
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
): Promise<DiscoveryResult> {
	if (shouldSkipUrl(rawUrl)) return { discussions: [], unavailable: [] };

	const userSettings = await settings.getValue();
	const keepQuery = !userSettings.ignoreQueryString;
	const url = normalizeUrl(rawUrl, { keepQueryString: keepQuery });

	// Skip if query string stripping reduced URL to bare domain root — too generic
	if (!options.force && !keepQuery) {
		try {
			const original = new URL(rawUrl);
			const normalized = new URL(url);
			if (original.search && normalized.pathname === '/') {
				return { discussions: [], unavailable: [] };
			}
		} catch {
			// ignore parse errors
		}
	}

	const cacheTtlMs = userSettings.cacheDurationMinutes * 60 * 1000;
	const cacheKey = `discussions:${url}`;

	if (!options.force) {
		const cached = await cacheGet<Discussion[]>(cacheKey);
		if (cached) return { discussions: cached, unavailable: [] };
	}

	const searches: Array<{ platform: Platform; promise: Promise<Discussion[]> }> = [];
	if (userSettings.enableHn)
		searches.push({ platform: 'hn', promise: withTimeout(searchHn(url), SOURCE_TIMEOUT_MS) });
	if (userSettings.enableReddit)
		searches.push({
			platform: 'reddit',
			promise: withTimeout(
				searchReddit(url, { exactMatch: userSettings.redditExactMatch }),
				SOURCE_TIMEOUT_MS,
			),
		});
	if (userSettings.enableLobsters)
		searches.push({
			platform: 'lobsters',
			promise: withTimeout(searchLobsters(url), SOURCE_TIMEOUT_MS),
		});

	const results = await Promise.allSettled(searches.map((search) => search.promise));

	const discussions: Discussion[] = [];
	const unavailable: Platform[] = [];
	results.forEach((result, index) => {
		if (result.status === 'fulfilled') {
			discussions.push(...result.value);
		} else {
			unavailable.push(searches[index].platform);
		}
	});

	// Only cache a clean sweep; a transient failure must not freeze a source as empty.
	if (unavailable.length === 0) {
		await cacheSet(cacheKey, discussions, cacheTtlMs);
	}

	return { discussions, unavailable };
}
