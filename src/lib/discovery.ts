import { cacheGet, cacheSet } from './cache';
import { PermissionRequiredError, SignInRequiredError } from './errors';
import { searchHn } from './hn';
import { searchLobsters } from './lobsters';
import { searchReddit } from './reddit';
import { type Settings, settings } from './settings';
import type { Discussion, Platform } from './types';
import { normalizeUrl, shouldSkipUrl } from './url';

export interface DiscoverOptions {
	force?: boolean;
}

export interface DiscoveryResult {
	discussions: Discussion[];
	/** Enabled sources that could not be reached (blocked, rate-limited, timed out). */
	unavailable: Platform[];
	/** Enabled sources that refused a logged-out request; signing in on the site restores them. */
	signInRequired: Platform[];
	/** Enabled sources that need an optional host permission the user has not granted. */
	permissionRequired: Platform[];
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
	if (shouldSkipUrl(rawUrl))
		return { discussions: [], unavailable: [], signInRequired: [], permissionRequired: [] };

	const userSettings = await settings.getValue();
	const keepQuery = !userSettings.ignoreQueryString;
	const url = normalizeUrl(rawUrl, { keepQueryString: keepQuery });

	// Skip if query string stripping reduced URL to bare domain root — too generic
	if (!options.force && !keepQuery) {
		try {
			const original = new URL(rawUrl);
			const normalized = new URL(url);
			if (original.search && normalized.pathname === '/') {
				return { discussions: [], unavailable: [], signInRequired: [], permissionRequired: [] };
			}
		} catch {
			// ignore parse errors
		}
	}

	const cacheTtlMs = userSettings.cacheDurationMinutes * 60 * 1000;
	const cacheKey = `discussions:${url}`;

	if (options.force) return searchAll(url, userSettings, cacheKey, cacheTtlMs);

	const cached = await cacheGet<Discussion[]>(cacheKey);
	if (cached)
		return {
			discussions: cached,
			unavailable: [],
			signInRequired: [],
			permissionRequired: [],
		};

	// Tab events and the popup often ask for the same page at once; share one network sweep.
	const existing = inFlight.get(cacheKey);
	if (existing) return existing;
	const task = searchAll(url, userSettings, cacheKey, cacheTtlMs).finally(() =>
		inFlight.delete(cacheKey),
	);
	inFlight.set(cacheKey, task);
	return task;
}

const inFlight = new Map<string, Promise<DiscoveryResult>>();

async function searchAll(
	url: string,
	userSettings: Settings,
	cacheKey: string,
	cacheTtlMs: number,
): Promise<DiscoveryResult> {
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
	const signInRequired: Platform[] = [];
	const permissionRequired: Platform[] = [];
	results.forEach((result, index) => {
		if (result.status === 'fulfilled') {
			discussions.push(...result.value);
		} else if (result.reason instanceof SignInRequiredError) {
			signInRequired.push(searches[index].platform);
		} else if (result.reason instanceof PermissionRequiredError) {
			permissionRequired.push(searches[index].platform);
		} else {
			unavailable.push(searches[index].platform);
		}
	});

	// Only cache a clean sweep; a failure, missing sign-in or missing permission must not freeze a source as empty.
	if (unavailable.length === 0 && signInRequired.length === 0 && permissionRequired.length === 0) {
		await cacheSet(cacheKey, discussions, cacheTtlMs);
	}

	return { discussions, unavailable, signInRequired, permissionRequired };
}
