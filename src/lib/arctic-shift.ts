import { type RedditSearchOptions, postMatchesTarget } from './reddit-match';
import type { Discussion } from './types';

/**
 * Public Reddit archive used when Reddit itself refuses the search (signed out or blocked).
 * Scores and comment counts are snapshots, so it only fills in discovery.
 */
const ARCHIVE_SEARCH = 'https://arctic-shift.photon-reddit.com/api/posts/search';
const FIELDS = 'id,title,url,subreddit,score,num_comments,created_utc';

interface ArchivedPost {
	id: string;
	title: string;
	url: string | null;
	subreddit: string;
	score: number;
	num_comments: number;
	created_utc: number;
}

/** The archive prefix-matches scheme and host literally, so ask for both host spellings. */
function prefixVariants(url: string): string[] {
	const bare = new URL(url);
	bare.hostname = bare.hostname.replace(/^www\./, '');
	const www = new URL(bare);
	www.hostname = `www.${bare.hostname}`;
	return [bare.toString(), www.toString()];
}

async function queryPrefix(prefix: string, signal?: AbortSignal): Promise<ArchivedPost[]> {
	const params = new URLSearchParams({
		url: prefix,
		url_exact: 'false',
		limit: '100',
		fields: FIELDS,
	});
	const response = await fetch(`${ARCHIVE_SEARCH}?${params}`, { signal });
	if (!response.ok) throw new Error(`Reddit archive search failed: ${response.status}`);
	const body: { data: ArchivedPost[] | null } = await response.json();
	return body.data ?? [];
}

export async function searchRedditArchive(
	url: string,
	options: RedditSearchOptions = {},
	signal?: AbortSignal,
): Promise<Discussion[]> {
	// Two requests in parallel stays within the archive's couple-per-second guidance and keeps
	// the fallback inside discovery's per-source timeout (each request takes about a second).
	const batches = await Promise.all(
		prefixVariants(url).map((prefix) => queryPrefix(prefix, signal)),
	);
	const byId = new Map<string, ArchivedPost>();
	for (const post of batches.flat()) byId.set(post.id, post);

	return [...byId.values()]
		.filter((post) => postMatchesTarget(post.url, url, options))
		.map((post) => ({
			platform: 'reddit' as const,
			title: post.title,
			url: `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}`,
			points: post.score,
			commentCount: post.num_comments,
			createdAt: new Date(post.created_utc * 1000).toISOString(),
			externalId: `t3_${post.id}`,
			subreddit: post.subreddit,
		}));
}
