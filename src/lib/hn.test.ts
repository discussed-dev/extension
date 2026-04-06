import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchHn } from './hn';

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

function algoliaResponse(hits: Record<string, unknown>[]) {
	return {
		ok: true,
		json: () =>
			Promise.resolve({
				hits,
				nbHits: hits.length,
			}),
	};
}

const HIT = {
	objectID: '29623646',
	title: 'Example Domain',
	url: 'https://example.com',
	points: 120,
	num_comments: 64,
	created_at: '2021-12-20T11:29:50Z',
	story_id: 29623646,
};

describe('searchHn', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns discussions from Algolia search', async () => {
		mockFetch.mockResolvedValueOnce(algoliaResponse([HIT]));

		const results = await searchHn('https://example.com');

		expect(results).toHaveLength(1);
		expect(results[0]).toEqual({
			platform: 'hn',
			title: 'Example Domain',
			url: 'https://news.ycombinator.com/item?id=29623646',
			points: 120,
			commentCount: 64,
			createdAt: new Date('2021-12-20T11:29:50Z'),
			externalId: '29623646',
		});
	});

	it('queries Algolia with URL restricted to url field', async () => {
		mockFetch.mockResolvedValueOnce(algoliaResponse([]));

		await searchHn('https://example.com/page');

		const calledUrl = new URL(mockFetch.mock.calls[0][0]);
		expect(calledUrl.origin).toBe('https://hn.algolia.com');
		expect(calledUrl.pathname).toBe('/api/v1/search');
		expect(calledUrl.searchParams.get('query')).toBe('https://example.com/page');
		expect(calledUrl.searchParams.get('restrictSearchableAttributes')).toBe('url');
	});

	it('returns empty array on no hits', async () => {
		mockFetch.mockResolvedValueOnce(algoliaResponse([]));

		const results = await searchHn('https://nothing.example.com');
		expect(results).toEqual([]);
	});

	it('returns empty array on fetch failure', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

		const results = await searchHn('https://example.com');
		expect(results).toEqual([]);
	});

	it('returns empty array on network error', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const results = await searchHn('https://example.com');
		expect(results).toEqual([]);
	});
});
