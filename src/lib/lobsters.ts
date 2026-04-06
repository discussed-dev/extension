import type { Discussion } from './types';

interface LobstersStory {
	short_id: string;
	title: string;
	url: string;
	score: number;
	comment_count: number;
	created_at: string;
	short_id_url: string;
	comments_url: string;
}

export async function searchLobsters(url: string): Promise<Discussion[]> {
	try {
		const { hostname } = new URL(url);
		const response = await fetch(`https://lobste.rs/domains/${hostname}.json`);
		if (!response.ok) return [];

		const stories: LobstersStory[] = await response.json();

		return stories.map((story) => ({
			platform: 'lobsters' as const,
			title: story.title,
			url: story.comments_url,
			points: story.score,
			commentCount: story.comment_count,
			createdAt: new Date(story.created_at),
			externalId: story.short_id,
		}));
	} catch {
		return [];
	}
}
