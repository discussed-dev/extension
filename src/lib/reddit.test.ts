import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionRequiredError, SignInRequiredError } from './errors';
import { searchReddit } from './reddit';
import { hasRedditSearchAccess } from './reddit-access';

import { searchRedditArchive } from './arctic-shift';

vi.mock('./reddit-access', () => ({ hasRedditSearchAccess: vi.fn() }));
vi.mock('./arctic-shift', () => ({ searchRedditArchive: vi.fn() }));
const accessMock = vi.mocked(hasRedditSearchAccess);
const archiveMock = vi.mocked(searchRedditArchive);

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
	url: 'https://example.com',
	subreddit: 'programming',
	score: 500,
	num_comments: 42,
	created_utc: 1639999790,
	permalink: '/r/programming/comments/abc123/example_post/',
};

describe('searchReddit', () => {
	beforeEach(() => {
		mockFetch.mockReset();
		accessMock.mockReset();
		accessMock.mockResolvedValue(true);
		archiveMock.mockReset();
		archiveMock.mockRejectedValue(new Error('archive down'));
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
		expect(calledUrl.hostname).toBe('old.reddit.com');
		expect(calledUrl.pathname).toBe('/search.json');
		expect(calledUrl.searchParams.get('q')).toBe('url:https://example.com/page');
		expect(calledUrl.searchParams.get('sort')).toBe('top');
	});

	it('returns empty array on no results', async () => {
		mockFetch.mockResolvedValueOnce(redditResponse([]));

		const results = await searchReddit('https://nothing.example.com');
		expect(results).toEqual([]);
	});

	it('throws on fetch failure so the source is marked unavailable', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

		const error = await searchReddit('https://example.com').catch((e: unknown) => e);
		expect(error).toBeInstanceOf(Error);
		expect(error).not.toBeInstanceOf(SignInRequiredError);
	});

	it('falls back to the archive when Reddit refuses the search', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
		const archived = [
			{
				platform: 'reddit' as const,
				title: 'A',
				url: 'u',
				points: 1,
				commentCount: 1,
				createdAt: 'c',
				externalId: 't3_a',
			},
		];
		archiveMock.mockResolvedValueOnce(archived);

		await expect(searchReddit('https://example.com', { exactMatch: true })).resolves.toBe(archived);
		expect(archiveMock).toHaveBeenCalledWith('https://example.com', { exactMatch: true });
	});

	it('falls back to the archive when Reddit cannot be reached', async () => {
		mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		archiveMock.mockResolvedValueOnce([]);

		await expect(searchReddit('https://example.com')).resolves.toEqual([]);
	});

	it('keeps the sign-in error when the archive also fails', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

		await expect(searchReddit('https://example.com')).rejects.toBeInstanceOf(SignInRequiredError);
	});

	it('sends the Reddit session cookie with the search request', async () => {
		mockFetch.mockResolvedValueOnce(redditResponse([]));

		await searchReddit('https://example.com');

		expect(mockFetch.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
	});

	it('throws PermissionRequiredError without fetching when old.reddit.com access is not granted', async () => {
		accessMock.mockResolvedValueOnce(false);

		await expect(searchReddit('https://example.com')).rejects.toBeInstanceOf(
			PermissionRequiredError,
		);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('throws SignInRequiredError on 403 (Reddit blocks logged-out JSON access)', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

		await expect(searchReddit('https://example.com')).rejects.toBeInstanceOf(SignInRequiredError);
	});

	it('throws on network error so the source is marked unavailable', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		await expect(searchReddit('https://example.com')).rejects.toThrow();
	});

	it('filters out unrelated domains when exactMatch is off', async () => {
		mockFetch.mockResolvedValueOnce(
			redditResponse([
				{
					...POST,
					url: 'https://news.com.au/story/some-article',
				},
			]),
		);

		const results = await searchReddit('https://fast.com/');
		expect(results).toEqual([]);
	});

	it('keeps results with matching domain when exactMatch is off', async () => {
		mockFetch.mockResolvedValueOnce(
			redditResponse([{ ...POST, url: 'https://fast.com/some/page' }]),
		);

		const results = await searchReddit('https://fast.com/');
		expect(results).toHaveLength(1);
	});

	it('keeps results with subdomain match when exactMatch is off', async () => {
		mockFetch.mockResolvedValueOnce(
			redditResponse([{ ...POST, url: 'https://en.wikipedia.org/wiki/Example' }]),
		);

		const results = await searchReddit('https://wikipedia.org/wiki/Example');
		expect(results).toHaveLength(1);
	});

	it('keeps results with reverse subdomain match when exactMatch is off', async () => {
		mockFetch.mockResolvedValueOnce(redditResponse([{ ...POST, url: 'https://example.com/page' }]));

		const results = await searchReddit('https://blog.example.com/page');
		expect(results).toHaveLength(1);
	});

	it('filters posts with null url when exactMatch is off', async () => {
		mockFetch.mockResolvedValueOnce(redditResponse([{ ...POST, url: null }]));

		const results = await searchReddit('https://example.com');
		expect(results).toEqual([]);
	});
});
