import type { Discussion } from './types';
import { normalizeUrl } from './url';

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

async function queryAlgolia(url: string): Promise<Discussion[]> {
	const params = new URLSearchParams({
		query: url,
		restrictSearchableAttributes: 'url',
		hitsPerPage: '20',
	});

	const response = await fetch(`${ALGOLIA_SEARCH}?${params}`);
	if (!response.ok) throw new Error(`HN search failed: ${response.status}`);

	const data: AlgoliaResponse = await response.json();
	const normalizedTarget = normalizeUrl(url);

	return data.hits
		.filter((hit) => {
			try {
				return hit.url && normalizeUrl(hit.url) === normalizedTarget;
			} catch {
				return false;
			}
		})
		.map((hit) => ({
			platform: 'hn' as const,
			title: hit.title,
			url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
			points: hit.points,
			commentCount: hit.num_comments,
			createdAt: new Date(hit.created_at).toISOString(),
			externalId: hit.objectID,
		}));
}

export async function searchHn(url: string): Promise<Discussion[]> {
	return queryAlgolia(url);
}
