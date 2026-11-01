import { searchRedditArchive } from './arctic-shift';
import { PermissionRequiredError, SignInRequiredError } from './errors';
import { hasRedditSearchAccess } from './reddit-access';
import { type RedditSearchOptions, postMatchesTarget } from './reddit-match';
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

const REDDIT_SEARCH = 'https://old.reddit.com/search.json';

export type { RedditSearchOptions };

export async function searchReddit(
	url: string,
	options: RedditSearchOptions = {},
): Promise<Discussion[]> {
	// The same grant covers old.reddit.com and the archive, so without it neither can answer.
	if (!(await hasRedditSearchAccess())) throw new PermissionRequiredError('reddit');

	try {
		return await searchLive(url, options);
	} catch (liveError) {
		try {
			return await searchRedditArchive(url, options);
		} catch {
			// Report Reddit's own failure: it is the one the user can act on (e.g. sign in).
			throw liveError;
		}
	}
}

async function searchLive(url: string, options: RedditSearchOptions): Promise<Discussion[]> {
	const params = new URLSearchParams({
		q: `url:${url}`,
		sort: 'top',
		limit: '25',
	});

	const response = await fetch(`${REDDIT_SEARCH}?${params}`, {
		credentials: 'include',
		headers: { 'User-Agent': 'web:discussed:v0.1.0 (https://discussed.dev)' },
	});
	// Reddit answers logged-out JSON requests with 403; the user's session cookie passes.
	if (response.status === 403) throw new SignInRequiredError('reddit');
	if (!response.ok) throw new Error(`Reddit search failed: ${response.status}`);

	const data: RedditListing = await response.json();

	return data.data.children
		.filter(({ data: post }) => postMatchesTarget(post.url, url, options))
		.map(({ data: post }) => ({
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
