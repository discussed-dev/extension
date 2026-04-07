import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Discussion } from './types';

// Mock platform modules before importing discovery
vi.mock('./hn', () => ({ searchHn: vi.fn() }));
vi.mock('./reddit', () => ({ searchReddit: vi.fn() }));
vi.mock('./lobsters', () => ({ searchLobsters: vi.fn() }));

import { discoverDiscussions } from './discovery';
import { searchHn } from './hn';
import { searchLobsters } from './lobsters';
import { searchReddit } from './reddit';

const hnMock = vi.mocked(searchHn);
const redditMock = vi.mocked(searchReddit);
const lobstersMock = vi.mocked(searchLobsters);

const HN_RESULT: Discussion = {
	platform: 'hn',
	title: 'Test on HN',
	url: 'https://news.ycombinator.com/item?id=123',
	points: 100,
	commentCount: 50,
	createdAt: '2024-01-01T00:00:00.000Z',
	externalId: '123',
};

const REDDIT_RESULT: Discussion = {
	platform: 'reddit',
	title: 'Test on Reddit',
	url: 'https://www.reddit.com/r/prog/comments/abc/test/',
	points: 200,
	commentCount: 30,
	createdAt: '2024-01-02T00:00:00.000Z',
	externalId: 't3_abc',
	subreddit: 'prog',
};

const LOBSTERS_RESULT: Discussion = {
	platform: 'lobsters',
	title: 'Test on Lobsters',
	url: 'https://lobste.rs/s/xyz/test',
	points: 10,
	commentCount: 5,
	createdAt: '2024-01-03T00:00:00.000Z',
	externalId: 'xyz',
};

describe('discoverDiscussions', () => {
	beforeEach(() => {
		fakeBrowser.reset();
		vi.useRealTimers();
		hnMock.mockReset();
		redditMock.mockReset();
		lobstersMock.mockReset();
	});

	it('queries all three platforms and merges results', async () => {
		hnMock.mockResolvedValueOnce([HN_RESULT]);
		redditMock.mockResolvedValueOnce([REDDIT_RESULT]);
		lobstersMock.mockResolvedValueOnce([LOBSTERS_RESULT]);

		const results = await discoverDiscussions('https://www.example.com/page?ref=x');

		expect(results).toHaveLength(3);
		expect(results.map((d) => d.platform)).toEqual(
			expect.arrayContaining(['hn', 'reddit', 'lobsters']),
		);
	});

	it('passes normalized URL to platform searches', async () => {
		hnMock.mockResolvedValueOnce([]);
		redditMock.mockResolvedValueOnce([]);
		lobstersMock.mockResolvedValueOnce([]);

		await discoverDiscussions('http://www.example.com/page/?utm=x#top');

		// Should be normalized: https, no www, no query, no fragment, no trailing slash
		expect(hnMock).toHaveBeenCalledWith('https://example.com/page');
		expect(redditMock).toHaveBeenCalledWith('https://example.com/page', { exactMatch: true });
		expect(lobstersMock).toHaveBeenCalledWith('https://example.com/page');
	});

	it('returns cached results on second call', async () => {
		hnMock.mockResolvedValueOnce([HN_RESULT]);
		redditMock.mockResolvedValueOnce([]);
		lobstersMock.mockResolvedValueOnce([]);

		const first = await discoverDiscussions('https://example.com');
		const second = await discoverDiscussions('https://example.com');

		expect(first).toEqual(second);
		// Each platform should only be called once
		expect(hnMock).toHaveBeenCalledTimes(1);
		expect(redditMock).toHaveBeenCalledTimes(1);
		expect(lobstersMock).toHaveBeenCalledTimes(1);
	});

	it('bypasses cache when force is true', async () => {
		hnMock.mockResolvedValue([HN_RESULT]);
		redditMock.mockResolvedValue([]);
		lobstersMock.mockResolvedValue([]);

		await discoverDiscussions('https://example.com');
		await discoverDiscussions('https://example.com', { force: true });

		expect(hnMock).toHaveBeenCalledTimes(2);
	});

	it('handles partial platform failures gracefully', async () => {
		hnMock.mockResolvedValueOnce([HN_RESULT]);
		redditMock.mockRejectedValueOnce(new Error('Reddit down'));
		lobstersMock.mockResolvedValueOnce([LOBSTERS_RESULT]);

		const results = await discoverDiscussions('https://example.com');

		expect(results).toHaveLength(2);
		expect(results.map((d) => d.platform)).toEqual(expect.arrayContaining(['hn', 'lobsters']));
	});

	it('skips root URLs whose query string was stripped', async () => {
		const results = await discoverDiscussions('https://www.douban.com/?p=13');
		expect(results).toEqual([]);
		expect(hnMock).not.toHaveBeenCalled();
	});

	it('does not skip root URLs without query string', async () => {
		hnMock.mockResolvedValueOnce([HN_RESULT]);
		redditMock.mockResolvedValueOnce([]);
		lobstersMock.mockResolvedValueOnce([]);

		const results = await discoverDiscussions('https://example.com/');
		expect(results).toHaveLength(1);
		expect(hnMock).toHaveBeenCalled();
	});

	it('does not skip when URL has meaningful path despite query string', async () => {
		hnMock.mockResolvedValueOnce([HN_RESULT]);
		redditMock.mockResolvedValueOnce([]);
		lobstersMock.mockResolvedValueOnce([]);

		const results = await discoverDiscussions('https://douban.com/subject/12345/?from=tag');
		expect(results).toHaveLength(1);
		expect(hnMock).toHaveBeenCalled();
	});

	it('bypasses root-URL skip when force is true', async () => {
		hnMock.mockResolvedValueOnce([HN_RESULT]);
		redditMock.mockResolvedValueOnce([]);
		lobstersMock.mockResolvedValueOnce([]);

		const results = await discoverDiscussions('https://www.douban.com/?p=13', { force: true });
		expect(results).toHaveLength(1);
		expect(hnMock).toHaveBeenCalled();
	});

	it('returns available results when one platform hangs', async () => {
		vi.useFakeTimers();
		hnMock.mockImplementationOnce(
			() =>
				new Promise<Discussion[]>(() => {
					// Never resolves; discovery should time out this source.
				}),
		);
		redditMock.mockResolvedValueOnce([REDDIT_RESULT]);
		lobstersMock.mockResolvedValueOnce([LOBSTERS_RESULT]);

		const pending = discoverDiscussions('https://example.com');
		await vi.advanceTimersByTimeAsync(5000);
		const results = await pending;

		expect(results).toHaveLength(2);
		expect(results.map((d) => d.platform)).toEqual(expect.arrayContaining(['reddit', 'lobsters']));
	});
});
