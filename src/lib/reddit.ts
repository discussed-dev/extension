import type { Discussion } from './types';
import { normalizeUrl } from './url';

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

const REDDIT_SEARCH = 'https://www.reddit.com/search.json';

export interface RedditSearchOptions {
	exactMatch?: boolean;
}

function stripWww(hostname: string): string {
	return hostname.replace(/^www\./, '');
}

function hostnamesMatch(a: string, b: string): boolean {
	const ha = stripWww(a);
	const hb = stripWww(b);
	return ha === hb || ha.endsWith(`.${hb}`) || hb.endsWith(`.${ha}`);
}

export async function searchReddit(
	url: string,
	options: RedditSearchOptions = {},
): Promise<Discussion[]> {
	try {
		const params = new URLSearchParams({
			q: `url:${url}`,
			sort: 'top',
			limit: '25',
		});

		const response = await fetch(`${REDDIT_SEARCH}?${params}`, {
			headers: { 'User-Agent': 'web:discussed:v0.1.0 (https://discussed.dev)' },
		});
		if (!response.ok) return [];

		const data: RedditListing = await response.json();
		const searchHost = new URL(url).hostname;

		return data.data.children
			.filter(({ data: post }) => {
				if (post.url == null) return false;
				if (options.exactMatch) {
					try {
						return normalizeUrl(post.url) === normalizeUrl(url);
					} catch {
						return false;
					}
				}
				try {
					return hostnamesMatch(new URL(post.url).hostname, searchHost);
				} catch {
					return false;
				}
			})
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
	} catch {
		return [];
	}
}
