import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionRequiredError, SignInRequiredError } from './errors';
import { searchReddit } from './reddit';
import { hasRedditSearchAccess } from './reddit-access';
import { redditRateGuard } from './reddit-rate';

import { searchRedditArchive } from './arctic-shift';

vi.mock('./reddit-access', () => ({ hasRedditSearchAccess: vi.fn() }));
vi.mock('./arctic-shift', () => ({ searchRedditArchive: vi.fn() }));
const accessMock = vi.mocked(hasRedditSearchAccess);
const archiveMock = vi.mocked(searchRedditArchive);

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

function failure(status: number, headers: Record<string, string> = {}) {
	return { ok: false, status, headers: new Headers(headers) };
}

function redditResponse(posts: Record<string, unknown>[], headers: Record<string, string> = {}) {
	return {
		ok: true,
		status: 200,
		headers: new Headers(headers),
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

const ARCHIVED = {
	platform: 'reddit' as const,
	title: 'Archived post',
	url: 'https://www.reddit.com/r/programming/comments/old999',
	points: 7,
	commentCount: 3,
	createdAt: '2020-01-01T00:00:00.000Z',
	externalId: 't3_old999',
	subreddit: 'programming',
};

describe('searchReddit', () => {
	beforeEach(() => {
		mockFetch.mockReset();
		accessMock.mockReset();
		accessMock.mockResolvedValue(true);
		archiveMock.mockReset();
		archiveMock.mockRejectedValue(new Error('archive down'));
		redditRateGuard.reset();
	});

	it('returns discussions from Reddit', async () => {
		mockFetch.mockResolvedValue(redditResponse([POST]));

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

	it('looks up each host and trailing-slash spelling on the exact-URL index, since search.json is blocked', async () => {
		mockFetch.mockResolvedValue(redditResponse([]));

		await searchReddit('https://example.com/page');

		const queried = mockFetch.mock.calls.map(([u]) => new URL(u as string));
		expect(queried.every((u) => u.origin === 'https://old.reddit.com')).toBe(true);
		expect(queried.every((u) => u.pathname === '/api/info.api')).toBe(true);
		expect(queried.map((u) => u.searchParams.get('url')).sort()).toEqual([
			'https://example.com/page',
			'https://example.com/page/',
			'https://www.example.com/page',
			'https://www.example.com/page/',
		]);
	});

	it('does not ask for a duplicate spelling of a root URL', async () => {
		mockFetch.mockResolvedValue(redditResponse([]));

		await searchReddit('https://example.com/');

		const spellings = mockFetch.mock.calls.map(([u]) =>
			new URL(u as string).searchParams.get('url'),
		);
		expect(spellings.sort()).toEqual(['https://example.com/', 'https://www.example.com/']);
	});

	it('keeps the query string after the trailing slash', async () => {
		mockFetch.mockResolvedValue(redditResponse([]));

		await searchReddit('https://example.com/watch?v=1');

		const spellings = mockFetch.mock.calls.map(([u]) =>
			new URL(u as string).searchParams.get('url'),
		);
		expect(spellings).toContain('https://example.com/watch/?v=1');
	});

	it('reports a post found under several spellings once', async () => {
		mockFetch.mockResolvedValue(redditResponse([POST]));

		const results = await searchReddit('https://example.com/page', { exactMatch: false });
		expect(results).toHaveLength(1);
	});

	it('returns empty array on no results', async () => {
		mockFetch.mockResolvedValue(redditResponse([]));

		const results = await searchReddit('https://nothing.example.com');
		expect(results).toEqual([]);
	});

	it('throws on fetch failure so the source is marked unavailable', async () => {
		mockFetch.mockResolvedValue(failure(429));

		const error = await searchReddit('https://example.com').catch((e: unknown) => e);
		expect(error).toBeInstanceOf(Error);
		expect(error).not.toBeInstanceOf(SignInRequiredError);
	});

	it('uses the archive when Reddit refuses the lookup', async () => {
		mockFetch.mockResolvedValue(failure(403));
		archiveMock.mockResolvedValueOnce([ARCHIVED]);

		await expect(searchReddit('https://example.com', { exactMatch: true })).resolves.toEqual([
			ARCHIVED,
		]);
		expect(archiveMock).toHaveBeenCalledWith(
			'https://example.com',
			{ exactMatch: true },
			expect.any(AbortSignal),
		);
	});

	it('uses the archive when Reddit cannot be reached', async () => {
		mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
		archiveMock.mockResolvedValueOnce([]);

		await expect(searchReddit('https://example.com')).resolves.toEqual([]);
	});

	it('queries Reddit and the archive together and merges what both found', async () => {
		mockFetch.mockResolvedValue(redditResponse([POST]));
		archiveMock.mockResolvedValueOnce([ARCHIVED]);

		const results = await searchReddit('https://example.com');

		expect(results.map((d) => d.externalId)).toEqual(['t3_abc123', 't3_old999']);
	});

	it("prefers Reddit's live counts over the archive snapshot for the same post", async () => {
		mockFetch.mockResolvedValue(redditResponse([POST]));
		archiveMock.mockResolvedValueOnce([
			{ ...ARCHIVED, externalId: 't3_abc123', points: 3, commentCount: 0 },
		]);

		const results = await searchReddit('https://example.com');

		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({ points: 500, commentCount: 42 });
	});

	it('returns live results when only the archive fails', async () => {
		mockFetch.mockResolvedValue(redditResponse([POST]));

		const results = await searchReddit('https://example.com');
		expect(results.map((d) => d.externalId)).toEqual(['t3_abc123']);
	});

	it('keeps what other spellings found when one lookup is rate-limited', async () => {
		mockFetch.mockResolvedValueOnce(failure(429)).mockResolvedValue(redditResponse([POST]));

		const results = await searchReddit('https://example.com/page');
		expect(results.map((d) => d.externalId)).toEqual(['t3_abc123']);
	});

	it('returns live results without waiting out a hung archive', async () => {
		vi.useFakeTimers();
		try {
			mockFetch.mockResolvedValue(redditResponse([POST]));
			archiveMock.mockImplementationOnce(
				(_url, _options, signal) =>
					new Promise((_resolve, reject) => {
						signal?.addEventListener('abort', () => reject(signal.reason));
					}),
			);

			const pending = searchReddit('https://example.com');
			await vi.advanceTimersByTimeAsync(3000);

			await expect(pending).resolves.toHaveLength(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('gives up on a hung Reddit lookup and keeps the archive results', async () => {
		vi.useFakeTimers();
		try {
			mockFetch.mockImplementation(
				(_url: string, init: RequestInit) =>
					new Promise((_resolve, reject) => {
						init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
					}),
			);
			archiveMock.mockResolvedValueOnce([ARCHIVED]);

			const pending = searchReddit('https://example.com');
			await vi.advanceTimersByTimeAsync(3000);

			await expect(pending).resolves.toEqual([ARCHIVED]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('leaves Reddit alone and answers from the archive once its rate budget runs low', async () => {
		mockFetch.mockResolvedValue(
			redditResponse([POST], { 'x-ratelimit-remaining': '2.0', 'x-ratelimit-reset': '300' }),
		);
		await searchReddit('https://example.com/page');
		mockFetch.mockClear();
		archiveMock.mockResolvedValueOnce([ARCHIVED]);

		await expect(searchReddit('https://example.com/other')).resolves.toEqual([ARCHIVED]);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('leaves Reddit alone after a 429', async () => {
		mockFetch.mockResolvedValue(failure(429, { 'x-ratelimit-reset': '60' }));
		await searchReddit('https://example.com/page').catch(() => undefined);
		mockFetch.mockClear();
		archiveMock.mockResolvedValueOnce([]);

		await searchReddit('https://example.com/other');
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('keeps the sign-in error when the archive also fails', async () => {
		mockFetch.mockResolvedValue(failure(403));

		await expect(searchReddit('https://example.com')).rejects.toBeInstanceOf(SignInRequiredError);
	});

	it('sends the Reddit session cookie with each lookup', async () => {
		mockFetch.mockResolvedValue(redditResponse([]));

		await searchReddit('https://example.com');

		for (const [, init] of mockFetch.mock.calls) {
			expect(init).toMatchObject({ credentials: 'include' });
		}
	});

	it('throws PermissionRequiredError without fetching when old.reddit.com access is not granted', async () => {
		accessMock.mockResolvedValueOnce(false);

		await expect(searchReddit('https://example.com')).rejects.toBeInstanceOf(
			PermissionRequiredError,
		);
		expect(mockFetch).not.toHaveBeenCalled();
		expect(archiveMock).not.toHaveBeenCalled();
	});

	it('throws SignInRequiredError on 403 (Reddit blocks logged-out JSON access)', async () => {
		mockFetch.mockResolvedValue(failure(403));

		await expect(searchReddit('https://example.com')).rejects.toBeInstanceOf(SignInRequiredError);
	});

	it('throws on network error so the source is marked unavailable', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'));

		await expect(searchReddit('https://example.com')).rejects.toThrow();
	});

	it('filters out unrelated domains when exactMatch is off', async () => {
		mockFetch.mockResolvedValue(
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
		mockFetch.mockResolvedValue(redditResponse([{ ...POST, url: 'https://fast.com/some/page' }]));

		const results = await searchReddit('https://fast.com/');
		expect(results).toHaveLength(1);
	});

	it('keeps results with subdomain match when exactMatch is off', async () => {
		mockFetch.mockResolvedValue(
			redditResponse([{ ...POST, url: 'https://en.wikipedia.org/wiki/Example' }]),
		);

		const results = await searchReddit('https://wikipedia.org/wiki/Example');
		expect(results).toHaveLength(1);
	});

	it('keeps results with reverse subdomain match when exactMatch is off', async () => {
		mockFetch.mockResolvedValue(redditResponse([{ ...POST, url: 'https://example.com/page' }]));

		const results = await searchReddit('https://blog.example.com/page');
		expect(results).toHaveLength(1);
	});

	it('filters posts with null url when exactMatch is off', async () => {
		mockFetch.mockResolvedValue(redditResponse([{ ...POST, url: null }]));

		const results = await searchReddit('https://example.com');
		expect(results).toEqual([]);
	});
});
