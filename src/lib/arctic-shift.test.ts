import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchRedditArchive } from './arctic-shift';

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

function archiveResponse(posts: Record<string, unknown>[]) {
	return { ok: true, json: () => Promise.resolve({ data: posts }) };
}

const POST = {
	id: 'abc123',
	title: 'Example post',
	url: 'https://www.example.com/page',
	subreddit: 'programming',
	score: 500,
	num_comments: 42,
	created_utc: 1639999790,
};

describe('searchRedditArchive', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('queries URL prefixes with and without www, since the archive matches scheme and host literally', async () => {
		mockFetch.mockResolvedValue(archiveResponse([]));

		await searchRedditArchive('https://example.com/page');

		const queried = mockFetch.mock.calls.map(([u]) => new URL(u as string));
		expect(queried.map((u) => u.origin)).toEqual([
			'https://arctic-shift.photon-reddit.com',
			'https://arctic-shift.photon-reddit.com',
		]);
		expect(queried.map((u) => u.searchParams.get('url'))).toEqual([
			'https://example.com/page',
			'https://www.example.com/page',
		]);
		expect(queried.every((u) => u.searchParams.get('url_exact') === 'false')).toBe(true);
	});

	it('maps archived posts to Reddit discussions and drops duplicates across variants', async () => {
		mockFetch.mockResolvedValue(archiveResponse([POST]));

		const results = await searchRedditArchive('https://example.com/page');

		expect(results).toEqual([
			{
				platform: 'reddit',
				title: 'Example post',
				url: 'https://www.reddit.com/r/programming/comments/abc123',
				points: 500,
				commentCount: 42,
				createdAt: '2021-12-20T11:29:50.000Z',
				externalId: 't3_abc123',
				subreddit: 'programming',
			},
		]);
	});

	it('keeps only exact URL matches in exact-match mode', async () => {
		mockFetch.mockResolvedValue(
			archiveResponse([POST, { ...POST, id: 'other', url: 'https://example.com/page-two' }]),
		);

		const results = await searchRedditArchive('https://example.com/page', { exactMatch: true });

		expect(results.map((d) => d.externalId)).toEqual(['t3_abc123']);
	});

	it('throws when the archive rejects the request', async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 422 });

		await expect(searchRedditArchive('https://example.com/page')).rejects.toThrow('422');
	});

	it("passes the caller's abort signal to each request", async () => {
		mockFetch.mockResolvedValue(archiveResponse([]));
		const signal = new AbortController().signal;

		await searchRedditArchive('https://example.com/page', {}, signal);

		for (const [, init] of mockFetch.mock.calls) {
			expect(init).toMatchObject({ signal });
		}
	});
});
