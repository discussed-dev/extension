import { checkBloomFilter, getBloomFilter } from './bloom';
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

async function queryAlgolia(url: string): Promise<Discussion[]> {
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
		createdAt: new Date(hit.created_at).toISOString(),
		externalId: hit.objectID,
	}));
}

export async function searchHn(url: string): Promise<Discussion[]> {
	try {
		const filter = await getBloomFilter();

		if (filter) {
			// Bloom filter available: check before querying
			const maybePresent = checkBloomFilter(filter, url);
			if (!maybePresent) return []; // Definitely not on HN
		}

		// Either Bloom filter says "maybe" or no filter available — query Algolia
		return await queryAlgolia(url);
	} catch {
		return [];
	}
}
