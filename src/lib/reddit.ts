import { searchRedditArchive } from './arctic-shift';
import { PermissionRequiredError, SignInRequiredError } from './errors';
import { hasRedditSearchAccess } from './reddit-access';
import { type RedditSearchOptions, postMatchesTarget } from './reddit-match';
import { redditRateGuard } from './reddit-rate';
import type { Discussion } from './types';

interface RedditPost {
	name: string;
	title: string;
	url: string;
	subreddit: string;
	score: number;
	num_comments: number;
	created_utc: number;
	permalink: string;
}

interface RedditListing {
	kind: 'Listing';
	data: {
		children: Array<{ kind: string; data: RedditPost }>;
	};
}

// Reddit's exact-URL index. Since 2026-11-04 Reddit blocks /search.json and /api/info.json even
// for signed-in users; the same listing under /api/info.api still answers with the session.
const REDDIT_INFO = 'https://old.reddit.com/api/info.api';

// Below discovery's per-source timeout, so a hung branch fails alone instead of taking down
// whatever the other branch already found.
const BRANCH_TIMEOUT_MS = 3000;

export type { RedditSearchOptions };

/**
 * Reddit and the archive are asked together: Reddit has live counts and posts too new for the
 * archive, while the archive prefix-matches spellings the exact-URL index misses (and whole
 * domains when exact match is off).
 */
export async function searchReddit(
	url: string,
	options: RedditSearchOptions = {},
): Promise<Discussion[]> {
	// The same grant covers old.reddit.com and the archive, so without it neither can answer.
	if (!(await hasRedditSearchAccess())) throw new PermissionRequiredError('reddit');

	const controller = new AbortController();
	const timer = setTimeout(
		() => controller.abort(new DOMException('Reddit lookup timed out', 'TimeoutError')),
		BRANCH_TIMEOUT_MS,
	);
	const [live, archived] = await Promise.allSettled([
		searchLive(url, options, controller.signal),
		searchRedditArchive(url, options, controller.signal),
	]).finally(() => clearTimeout(timer));
	// Report Reddit's own failure: it is the one the user can act on (e.g. sign in).
	if (live.status === 'rejected' && archived.status === 'rejected') throw live.reason;

	const byId = new Map<string, Discussion>();
	// Live entries come first, so the archive's snapshot never replaces Reddit's own counts.
	const merged = [
		...(live.status === 'fulfilled' ? live.value : []),
		...(archived.status === 'fulfilled' ? archived.value : []),
	];
	for (const discussion of merged) {
		if (!byId.has(discussion.externalId)) byId.set(discussion.externalId, discussion);
	}
	return [...byId.values()];
}

/** The index matches the submitted URL literally, so ask for each host and trailing-slash form. */
function exactSpellings(url: string): string[] {
	const spellings = new Set<string>();
	const bare = new URL(url);
	bare.hostname = bare.hostname.replace(/^www\./, '');
	for (const host of [bare.hostname, `www.${bare.hostname}`]) {
		const variant = new URL(bare);
		variant.hostname = host;
		const path = variant.pathname.replace(/\/+$/, '');
		for (const pathname of [path || '/', `${path}/`]) {
			variant.pathname = pathname;
			spellings.add(variant.toString());
		}
	}
	return [...spellings];
}

async function lookupSpelling(spelling: string, signal: AbortSignal): Promise<RedditPost[]> {
	const params = new URLSearchParams({ url: spelling, limit: '100', raw_json: '1' });

	const response = await fetch(`${REDDIT_INFO}?${params}`, {
		credentials: 'include',
		headers: { 'User-Agent': 'web:discussed:v0.1.0 (https://discussed.dev)' },
		signal,
	});
	redditRateGuard.observe(response);
	// Reddit answers logged-out JSON requests with 403; the user's session cookie passes.
	if (response.status === 403) throw new SignInRequiredError('reddit');
	if (!response.ok) throw new Error(`Reddit lookup failed: ${response.status}`);

	const data: RedditListing = await response.json();
	return data.data.children.map(({ data: post }) => post);
}

async function searchLive(
	url: string,
	options: RedditSearchOptions,
	signal: AbortSignal,
): Promise<Discussion[]> {
	if (redditRateGuard.isPaused()) throw new Error('Reddit rate limit reached; waiting for reset');
	const lookups = await Promise.allSettled(
		exactSpellings(url).map((spelling) => lookupSpelling(spelling, signal)),
	);
	const byName = new Map<string, RedditPost>();
	const failures: unknown[] = [];
	for (const lookup of lookups) {
		if (lookup.status === 'rejected') failures.push(lookup.reason);
		else for (const post of lookup.value) byName.set(post.name, post);
	}
	// One spelling hitting a rate limit should not discard what the others found.
	if (failures.length === lookups.length) {
		throw failures.find((e) => e instanceof SignInRequiredError) ?? failures[0];
	}

	return [...byName.values()]
		.filter((post) => postMatchesTarget(post.url, url, options))
		.map((post) => ({
			platform: 'reddit' as const,
			title: post.title,
			url: `https://www.reddit.com${post.permalink}`,
			points: post.score,
			commentCount: post.num_comments,
			createdAt: new Date(post.created_utc * 1000).toISOString(),
			externalId: post.name,
			subreddit: post.subreddit,
		}));
}
