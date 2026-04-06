import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchReddit } from './reddit';

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

function redditResponse(posts: Record<string, unknown>[]) {
	return {
		ok: true,
		json: () =>
			Promise.resolve({
				kind: 'Listing',
				data: {
					children: posts.map((p) => ({ kind: 't3', data: p })),
				},
			}),
	};
}

const POST = {
	name: 't3_abc123',
	title: 'Example post',
	subreddit: 'programming',
	score: 500,
	num_comments: 42,
	created_utc: 1639999790,
	permalink: '/r/programming/comments/abc123/example_post/',
};

describe('searchReddit', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns discussions from Reddit search', async () => {
		mockFetch.mockResolvedValueOnce(redditResponse([POST]));

		const results = await searchReddit('https://example.com');

		expect(results).toHaveLength(1);
		expect(results[0]).toEqual({
			platform: 'reddit',
			title: 'Example post',
			url: 'https://www.reddit.com/r/programming/comments/abc123/example_post/',
			points: 500,
			commentCount: 42,
			createdAt: '2021-12-20T11:29:50.000Z',
			externalId: 't3_abc123',
			subreddit: 'programming',
		});
	});

	it('queries Reddit with url: prefix', async () => {
		mockFetch.mockResolvedValueOnce(redditResponse([]));

		await searchReddit('https://example.com/page');

		const calledUrl = new URL(mockFetch.mock.calls[0][0]);
		expect(calledUrl.hostname).toBe('www.reddit.com');
		expect(calledUrl.pathname).toBe('/search.json');
		expect(calledUrl.searchParams.get('q')).toBe('url:https://example.com/page');
		expect(calledUrl.searchParams.get('sort')).toBe('top');
	});

	it('returns empty array on no results', async () => {
		mockFetch.mockResolvedValueOnce(redditResponse([]));

		const results = await searchReddit('https://nothing.example.com');
		expect(results).toEqual([]);
	});

	it('returns empty array on fetch failure', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

		const results = await searchReddit('https://example.com');
		expect(results).toEqual([]);
	});

	it('returns empty array on network error', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const results = await searchReddit('https://example.com');
		expect(results).toEqual([]);
	});
});
