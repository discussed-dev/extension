import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { detectDiscussionPage, resolveLinkedUrl } from './resolve-discussion';

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

describe('detectDiscussionPage', () => {
	it('detects HN item page', () => {
		const result = detectDiscussionPage('https://news.ycombinator.com/item?id=12345');
		expect(result).toEqual({ platform: 'hn', id: '12345' });
	});

	it('detects HN item page with extra query params', () => {
		const result = detectDiscussionPage('https://news.ycombinator.com/item?id=99999&p=2');
		expect(result).toEqual({ platform: 'hn', id: '99999' });
	});

	it('rejects HN non-item pages', () => {
		expect(detectDiscussionPage('https://news.ycombinator.com/newest')).toBeNull();
		expect(detectDiscussionPage('https://news.ycombinator.com/user?id=dang')).toBeNull();
	});

	it('detects Reddit post with subreddit', () => {
		const result = detectDiscussionPage(
			'https://www.reddit.com/r/programming/comments/abc123/some_title/',
		);
		expect(result).toEqual({ platform: 'reddit', id: 'abc123' });
	});

	it('detects Reddit post without subreddit', () => {
		const result = detectDiscussionPage('https://www.reddit.com/comments/xyz789/');
		expect(result).toEqual({ platform: 'reddit', id: 'xyz789' });
	});

	it('detects Reddit with old subdomain', () => {
		const result = detectDiscussionPage('https://old.reddit.com/r/rust/comments/def456/title_here');
		expect(result).toEqual({ platform: 'reddit', id: 'def456' });
	});

	it('detects Reddit with np subdomain', () => {
		const result = detectDiscussionPage('https://np.reddit.com/r/linux/comments/ghi789/post/');
		expect(result).toEqual({ platform: 'reddit', id: 'ghi789' });
	});

	it('detects bare reddit.com', () => {
		const result = detectDiscussionPage('https://reddit.com/r/tech/comments/jkl012/post/');
		expect(result).toEqual({ platform: 'reddit', id: 'jkl012' });
	});

	it('rejects Reddit non-comment pages', () => {
		expect(detectDiscussionPage('https://www.reddit.com/r/programming/')).toBeNull();
		expect(detectDiscussionPage('https://www.reddit.com/search?q=test')).toBeNull();
	});

	it('detects Lobsters story', () => {
		const result = detectDiscussionPage('https://lobste.rs/s/abc123');
		expect(result).toEqual({ platform: 'lobsters', id: 'abc123' });
	});

	it('detects Lobsters story with slug', () => {
		const result = detectDiscussionPage('https://lobste.rs/s/xyz789/some_story_title');
		expect(result).toEqual({ platform: 'lobsters', id: 'xyz789' });
	});

	it('rejects Lobsters non-story pages', () => {
		expect(detectDiscussionPage('https://lobste.rs/newest')).toBeNull();
		expect(detectDiscussionPage('https://lobste.rs/u/user123')).toBeNull();
	});

	it('returns null for non-discussion URLs', () => {
		expect(detectDiscussionPage('https://example.com/article')).toBeNull();
		expect(detectDiscussionPage('https://github.com/repo')).toBeNull();
	});

	it('returns null for invalid URLs', () => {
		expect(detectDiscussionPage('not-a-url')).toBeNull();
	});
});

describe('resolveLinkedUrl', () => {
	beforeEach(() => {
		mockFetch.mockReset();
		fakeBrowser.reset();
	});

	describe('HN', () => {
		it('resolves external URL from HN item', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						url: 'https://example.com/article',
						title: 'Example Article',
						type: 'story',
					}),
			});

			const result = await resolveLinkedUrl('https://news.ycombinator.com/item?id=12345');
			expect(result).toEqual({
				linkedUrl: 'https://example.com/article',
				platform: 'hn',
				discussionId: '12345',
			});
		});

		it('returns null for HN self-post (null url)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						url: null,
						title: 'Ask HN: Something',
						type: 'story',
					}),
			});

			const result = await resolveLinkedUrl('https://news.ycombinator.com/item?id=12345');
			expect(result).toBeNull();
		});

		it('returns null for HN self-post (empty url)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						url: '',
						title: 'Show HN: Something',
						type: 'story',
					}),
			});

			const result = await resolveLinkedUrl('https://news.ycombinator.com/item?id=12345');
			expect(result).toBeNull();
		});
	});

	describe('Reddit', () => {
		it('resolves external URL from Reddit link post', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve([
						{
							data: {
								children: [
									{
										data: {
											url: 'https://example.com/blog-post',
											is_self: false,
											name: 't3_abc123',
										},
									},
								],
							},
						},
						{ data: { children: [] } },
					]),
			});

			const result = await resolveLinkedUrl(
				'https://www.reddit.com/r/programming/comments/abc123/title/',
			);
			expect(result).toEqual({
				linkedUrl: 'https://example.com/blog-post',
				platform: 'reddit',
				discussionId: 't3_abc123',
			});
		});

		it('returns null for Reddit self-post', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve([
						{
							data: {
								children: [
									{
										data: {
											url: 'https://www.reddit.com/r/programming/comments/abc123/title/',
											is_self: true,
											name: 't3_abc123',
										},
									},
								],
							},
						},
						{ data: { children: [] } },
					]),
			});

			const result = await resolveLinkedUrl(
				'https://www.reddit.com/r/programming/comments/abc123/title/',
			);
			expect(result).toBeNull();
		});
	});

	describe('Lobsters', () => {
		it('resolves external URL from Lobsters story', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						short_id: 'xyz789',
						url: 'https://example.com/lobsters-article',
						title: 'Cool Article',
					}),
			});

			const result = await resolveLinkedUrl('https://lobste.rs/s/xyz789/some_slug');
			expect(result).toEqual({
				linkedUrl: 'https://example.com/lobsters-article',
				platform: 'lobsters',
				discussionId: 'xyz789',
			});
		});

		it('returns null for Lobsters self-post (empty url)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						short_id: 'xyz789',
						url: '',
						title: 'Discussion: Something',
					}),
			});

			const result = await resolveLinkedUrl('https://lobste.rs/s/xyz789');
			expect(result).toBeNull();
		});
	});

	describe('error handling', () => {
		it('returns null on API failure', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

			const result = await resolveLinkedUrl('https://news.ycombinator.com/item?id=12345');
			expect(result).toBeNull();
		});

		it('returns null on network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await resolveLinkedUrl('https://news.ycombinator.com/item?id=12345');
			expect(result).toBeNull();
		});

		it('returns null for non-discussion URL', async () => {
			const result = await resolveLinkedUrl('https://example.com/page');
			expect(result).toBeNull();
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe('Reddit ID normalization (regression)', () => {
		it('discussionId uses t3_ prefix to match Reddit externalId', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve([
						{
							data: {
								children: [
									{
										data: {
											url: 'https://example.com/article',
											is_self: false,
											name: 't3_xyz999',
										},
									},
								],
							},
						},
						{ data: { children: [] } },
					]),
			});

			const result = await resolveLinkedUrl('https://old.reddit.com/r/rust/comments/xyz999/title/');
			expect(result?.discussionId).toBe('t3_xyz999');
		});
	});

	describe('caching', () => {
		it('returns cached result on repeated calls', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						url: 'https://example.com/cached-article',
						title: 'Cached',
						type: 'story',
					}),
			});

			const first = await resolveLinkedUrl('https://news.ycombinator.com/item?id=77777');
			expect(first).not.toBeNull();
			expect(mockFetch).toHaveBeenCalledTimes(1);

			mockFetch.mockReset();
			const second = await resolveLinkedUrl('https://news.ycombinator.com/item?id=77777');
			expect(second).toEqual(first);
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});
});
