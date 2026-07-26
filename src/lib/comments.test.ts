import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHnComments, fetchLobstersComments, fetchRedditComments } from './comments';

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

describe('fetchHnComments', () => {
	beforeEach(() => mockFetch.mockReset());

	it('flattens HN comment tree', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					id: 1,
					children: [
						{
							id: 2,
							author: 'alice',
							text: 'Great post!',
							points: 10,
							children: [
								{
									id: 3,
									author: 'bob',
									text: 'I agree',
									points: 5,
									children: [],
								},
							],
						},
					],
				}),
		});

		const comments = await fetchHnComments('1');
		expect(comments).toHaveLength(2);
		expect(comments[0]).toMatchObject({ author: 'alice', depth: 1, platform: 'hn' });
		expect(comments[1]).toMatchObject({ author: 'bob', depth: 2 });
	});

	it('carries a ref and an item permalink', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					id: 1,
					children: [{ id: 44239571, author: 'alice', text: 'Great post!', points: 10 }],
				}),
		});

		const [comment] = await fetchHnComments('1');
		expect(comment.ref).toBe('hn:44239571');
		expect(comment.permalink).toBe('https://news.ycombinator.com/item?id=44239571');
	});

	it('returns empty on failure', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
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
