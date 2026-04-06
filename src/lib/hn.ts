import type { Discussion } from './types';

interface AlgoliaHit {
	objectID: string;
	title: string;
	url: string;
	points: number;
	num_comments: number;
	created_at: string;
}

interface AlgoliaResponse {
	hits: AlgoliaHit[];
	nbHits: number;
}

const ALGOLIA_SEARCH = 'https://hn.algolia.com/api/v1/search';

export async function searchHn(url: string): Promise<Discussion[]> {
	try {
		const params = new URLSearchParams({
			query: url,
			restrictSearchableAttributes: 'url',
			hitsPerPage: '20',
		});

		const response = await fetch(`${ALGOLIA_SEARCH}?${params}`);
		if (!response.ok) return [];

		const data: AlgoliaResponse = await response.json();

		return data.hits.map((hit) => ({
			platform: 'hn' as const,
			title: hit.title,
			url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
			points: hit.points,
			commentCount: hit.num_comments,
			createdAt: new Date(hit.created_at),
			externalId: hit.objectID,
		}));
	} catch {
		return [];
	}
}
