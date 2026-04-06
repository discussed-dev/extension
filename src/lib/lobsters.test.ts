import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchLobsters } from './lobsters';

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

function lobstersResponse(stories: Record<string, unknown>[]) {
	return {
		ok: true,
		json: () => Promise.resolve(stories),
	};
}

const STORY = {
	short_id: 'abc123',
	title: 'Example Post',
	url: 'https://example.com/article',
	score: 15,
	comment_count: 8,
	created_at: '2021-12-20T11:29:50.000-06:00',
	short_id_url: 'https://lobste.rs/s/abc123',
	comments_url: 'https://lobste.rs/s/abc123/example_post',
};

describe('searchLobsters', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns discussions from Lobsters domain search', async () => {
		mockFetch.mockResolvedValueOnce(lobstersResponse([STORY]));

		const results = await searchLobsters('https://example.com/article');

		expect(results).toHaveLength(1);
		expect(results[0]).toEqual({
			platform: 'lobsters',
			title: 'Example Post',
			url: 'https://lobste.rs/s/abc123/example_post',
			points: 15,
			commentCount: 8,
			createdAt: '2021-12-20T17:29:50.000Z',
			externalId: 'abc123',
		});
	});

	it('queries Lobsters by domain', async () => {
		mockFetch.mockResolvedValueOnce(lobstersResponse([]));

		await searchLobsters('https://blog.example.com/post');

		const calledUrl = mockFetch.mock.calls[0][0];
		expect(calledUrl).toBe('https://lobste.rs/domains/blog.example.com.json');
	});

	it('returns empty array on no results', async () => {
		mockFetch.mockResolvedValueOnce(lobstersResponse([]));

		const results = await searchLobsters('https://nothing.example.com');
		expect(results).toEqual([]);
	});

	it('returns empty array on fetch failure', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

		const results = await searchLobsters('https://example.com');
		expect(results).toEqual([]);
	});

	it('returns empty array on network error', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const results = await searchLobsters('https://example.com');
		expect(results).toEqual([]);
	});
});
