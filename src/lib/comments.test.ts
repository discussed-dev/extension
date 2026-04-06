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
});
