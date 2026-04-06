import type { Discussion } from './types';

interface RedditPost {
	name: string;
	title: string;
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

export async function searchReddit(url: string): Promise<Discussion[]> {
	try {
		const params = new URLSearchParams({
			q: `url:${url}`,
			sort: 'top',
			limit: '25',
		});

		const response = await fetch(`${REDDIT_SEARCH}?${params}`, {
			headers: { 'User-Agent': 'discussed/0.1' },
		});
		if (!response.ok) return [];

		const data: RedditListing = await response.json();

		return data.data.children.map(({ data: post }) => ({
			platform: 'reddit' as const,
			title: post.title,
			url: `https://www.reddit.com${post.permalink}`,
			points: post.score,
			commentCount: post.num_comments,
			createdAt: new Date(post.created_utc * 1000),
			externalId: post.name,
			subreddit: post.subreddit,
		}));
	} catch {
		return [];
	}
}
