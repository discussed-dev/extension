import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { fetchHnComments, fetchLobstersComments, fetchRedditComments } from './comments';

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

const ALGOLIA = 'https://hn.algolia.com/';
const FIREBASE = 'https://hacker-news.firebaseio.com/';

type HnNode = { id: number; author?: string; text?: string; children?: HnNode[] };

/** Route HN requests by host; `kids` undefined means the HN API request fails at the network level. */
function mockHn(tree: HnNode, kids?: number[] | 'http-error') {
	mockFetch.mockImplementation(async (url: string) => {
		if (url.startsWith(ALGOLIA)) return { ok: true, json: async () => tree };
		if (url.startsWith(FIREBASE)) {
			if (kids === undefined) throw new TypeError('Failed to fetch');
			if (kids === 'http-error') return { ok: false, status: 503 };
			return { ok: true, json: async () => ({ id: tree.id, kids }) };
		}
		throw new Error(`unexpected url ${url}`);
	});
}

const node = (id: number, children: HnNode[] = []): HnNode => ({
	id,
	author: `u${id}`,
	text: `comment ${id}`,
	children,
});

/** Algolia returns top-level comments oldest first: 2 (no replies), 3 (one reply), 4 (two replies). */
const chronological: HnNode = {
	id: 1,
	children: [node(2), node(3, [node(30)]), node(4, [node(40, [node(41)])])],
};

function firebaseCalls(): number {
	return mockFetch.mock.calls.filter(([url]) => String(url).startsWith(FIREBASE)).length;
}

describe('fetchHnComments', () => {
	beforeEach(() => {
		mockFetch.mockReset();
		fakeBrowser.reset();
	});

	it('orders top-level threads by the HN ranking, not by time', async () => {
		mockHn(chronological, [3, 2, 4]);
		const comments = await fetchHnComments('1');
		expect(comments.map((c) => c.id)).toEqual(['3', '30', '2', '4', '40', '41']);
	});

	it('scores each comment by the number of replies beneath it', async () => {
		mockHn(chronological, [2, 3, 4]);
		const scores = Object.fromEntries((await fetchHnComments('1')).map((c) => [c.id, c.score]));
		expect(scores).toEqual({ '2': 0, '3': 1, '30': 0, '4': 2, '40': 1, '41': 0 });
	});

	it('puts threads missing from the HN ranking after the ranked ones', async () => {
		mockHn(chronological, [4]);
		const ids = (await fetchHnComments('1')).filter((c) => c.depth === 1).map((c) => c.id);
		expect(ids).toEqual(['4', '3', '2']);
	});

	it('falls back to reply count when the HN API is unreachable, then skips it', async () => {
		mockHn(chronological);
		const ids = (await fetchHnComments('1')).filter((c) => c.depth === 1).map((c) => c.id);
		expect(ids).toEqual(['4', '3', '2']);
		expect(firebaseCalls()).toBe(1);

		await fetchHnComments('1');
		expect(firebaseCalls()).toBe(1);
	});

	it('falls back on an HTTP error without skipping the HN API next time', async () => {
		mockHn(chronological, 'http-error');
		const ids = (await fetchHnComments('1')).filter((c) => c.depth === 1).map((c) => c.id);
		expect(ids).toEqual(['4', '3', '2']);

		await fetchHnComments('1');
		expect(firebaseCalls()).toBe(2);
	});

	it('does not query the HN API with a non-numeric story id', async () => {
		mockHn(chronological, [2, 3, 4]);
		await fetchHnComments('1/../x');
		expect(firebaseCalls()).toBe(0);
	});

	it('flattens HN comment tree', async () => {
		mockHn(
			{
				id: 1,
				children: [
					{
						id: 2,
						author: 'alice',
						text: 'Great post!',
						children: [{ id: 3, author: 'bob', text: 'I agree', children: [] }],
					},
				],
			},
			[2],
		);

		const comments = await fetchHnComments('1');
		expect(comments).toHaveLength(2);
		expect(comments[0]).toMatchObject({ author: 'alice', depth: 1, platform: 'hn' });
		expect(comments[1]).toMatchObject({ author: 'bob', depth: 2 });
	});

	it('carries a ref and an item permalink', async () => {
		mockHn(
			{ id: 1, children: [{ id: 44239571, author: 'alice', text: 'Great post!' }] },
			[44239571],
		);

		const [comment] = await fetchHnComments('1');
		expect(comment.ref).toBe('hn:44239571');
		expect(comment.permalink).toBe('https://news.ycombinator.com/item?id=44239571');
	});

	it('returns empty on failure', async () => {
		mockFetch.mockImplementation(async (url: string) =>
			url.startsWith(ALGOLIA)
				? { ok: false, status: 500 }
				: { ok: true, json: async () => ({ kids: [] }) },
		);
		expect(await fetchHnComments('1')).toEqual([]);
	});
});

describe('fetchRedditComments', () => {
	beforeEach(() => mockFetch.mockReset());

	it('flattens Reddit comment tree', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve([
					{ data: { children: [{ kind: 't3', data: {} }] } },
					{
						data: {
							children: [
								{
									kind: 't1',
									data: {
										id: 'c1',
										author: 'alice',
										body: 'Nice article',
										score: 42,
										depth: 0,
									},
								},
							],
						},
					},
				]),
		});

		const comments = await fetchRedditComments('/r/prog/comments/abc/test/');
		expect(comments).toHaveLength(1);
		expect(comments[0]).toMatchObject({ author: 'alice', score: 42, platform: 'reddit' });
	});

	it('filters deleted users and AutoModerator', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve([
					{ data: { children: [] } },
					{
						data: {
							children: [
								{
									kind: 't1',
									data: { id: '1', author: '[deleted]', body: 'x', score: 0, depth: 0 },
								},
								{
									kind: 't1',
									data: { id: '2', author: 'AutoModerator', body: 'x', score: 0, depth: 0 },
								},
								{
									kind: 't1',
									data: { id: '3', author: 'real', body: 'content', score: 5, depth: 0 },
								},
							],
						},
					},
				]),
		});

		const comments = await fetchRedditComments('/r/test/comments/abc/test/');
		expect(comments).toHaveLength(1);
		expect(comments[0].author).toBe('real');
	});

	it('returns empty on failure', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
		expect(await fetchRedditComments('/r/test/comments/abc/test/')).toEqual([]);
	});

	function mockRedditComment(data: Record<string, unknown>): void {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve([
					{ data: { children: [] } },
					{ data: { children: [{ kind: 't1', data }] } },
				]),
		});
	}

	const baseComment = { id: 'm3n8q', author: 'alice', body: 'Nice article', score: 42, depth: 0 };

	it('builds a ref and concatenates the thread permalink when the API omits one', async () => {
		mockRedditComment(baseComment);
		const [comment] = await fetchRedditComments('/r/prog/comments/abc/test/');
		expect(comment.ref).toBe('rd:m3n8q');
		expect(comment.permalink).toBe('https://www.reddit.com/r/prog/comments/abc/test/m3n8q/');
	});

	it('prefers the permalink the API returns', async () => {
		mockRedditComment({ ...baseComment, permalink: '/r/prog/comments/abc/test/m3n8q/' });
		const [comment] = await fetchRedditComments('/r/prog/comments/abc/test/');
		expect(comment.permalink).toBe('https://www.reddit.com/r/prog/comments/abc/test/m3n8q/');
	});

	it('normalizes a thread permalink with no trailing slash', async () => {
		mockRedditComment(baseComment);
		const [comment] = await fetchRedditComments('/r/prog/comments/abc/test');
		expect(comment.permalink).toBe('https://www.reddit.com/r/prog/comments/abc/test/m3n8q/');
	});

	it('yields no permalink rather than a malformed one when thread context is missing', async () => {
		// extractPermalink returns '' when the discussion URL fails to parse.
		mockRedditComment(baseComment);
		const [comment] = await fetchRedditComments('');
		expect(comment.ref).toBe('rd:m3n8q');
		expect(comment.permalink).toBeUndefined();
	});

	it('drops comments with no id, which cannot be cited', async () => {
		mockRedditComment({ author: 'alice', body: 'Nice article', score: 42, depth: 0 });
		expect(await fetchRedditComments('/r/prog/comments/abc/test/')).toEqual([]);
	});
});

describe('fetchLobstersComments', () => {
	beforeEach(() => mockFetch.mockReset());

	it('returns comments from Lobsters story', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					comments: [
						{
							short_id: 'abc',
							comment_plain: 'Great article about testing',
							score: 5,
							depth: 0,
							commenting_user: 'alice',
							is_deleted: false,
							is_moderated: false,
						},
					],
				}),
		});

		const comments = await fetchLobstersComments('xyz123');
		expect(comments).toHaveLength(1);
		expect(comments[0]).toMatchObject({
			author: 'alice',
			platform: 'lobsters',
			score: 5,
		});
	});

	it('filters deleted and moderated comments', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					comments: [
						{
							short_id: 'a',
							comment_plain: 'deleted',
							score: 0,
							depth: 0,
							commenting_user: 'x',
							is_deleted: true,
							is_moderated: false,
						},
						{
							short_id: 'b',
							comment_plain: 'Real comment here',
							score: 3,
							depth: 0,
							commenting_user: 'y',
							is_deleted: false,
							is_moderated: false,
						},
					],
				}),
		});

		const comments = await fetchLobstersComments('xyz123');
		expect(comments).toHaveLength(1);
		expect(comments[0].author).toBe('y');
	});

	it('returns empty on failure', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
		expect(await fetchLobstersComments('xyz123')).toEqual([]);
	});

	function mockLobstersComment(overrides: Record<string, unknown> = {}): void {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					comments: [
						{
							short_id: '1nooby',
							short_id_url: 'https://lobste.rs/c/1nooby',
							comment_plain: 'The reason Linux contains all the drivers is...',
							score: 15,
							depth: 0,
							commenting_user: 'mxey',
							is_deleted: false,
							is_moderated: false,
							...overrides,
						},
					],
				}),
		});
	}

	it('takes the permalink from short_id_url rather than constructing one', async () => {
		mockLobstersComment();
		const [comment] = await fetchLobstersComments('xyz123');
		expect(comment.ref).toBe('lo:1nooby');
		expect(comment.permalink).toBe('https://lobste.rs/c/1nooby');
	});

	it('yields no permalink when short_id_url is absent', async () => {
		mockLobstersComment({ short_id_url: undefined });
		const [comment] = await fetchLobstersComments('xyz123');
		expect(comment.permalink).toBeUndefined();
	});
});
