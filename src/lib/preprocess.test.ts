import { describe, expect, it } from 'vitest';
import type { Comment } from './comments';
import { formatCommentsForPrompt, preprocessComments } from './preprocess';

function makeComment(overrides: Partial<Comment> = {}): Comment {
	return {
		id: '1',
		author: 'user',
		text: 'This is a test comment with enough text',
		score: 10,
		depth: 0,
		platform: 'hn',
		...overrides,
	};
}

describe('preprocessComments', () => {
	it('limits to maxComments', () => {
		const comments = Array.from({ length: 50 }, (_, i) => makeComment({ id: String(i), score: i }));
		const result = preprocessComments(comments, { maxComments: 10 });
		expect(result.length).toBeLessThanOrEqual(10);
	});

	it('filters out very short comments', () => {
		const comments = [
			makeComment({ text: 'short' }),
			makeComment({ text: 'This is long enough to pass' }),
		];
		const result = preprocessComments(comments);
		expect(result).toHaveLength(1);
	});

	it('truncates long comments', () => {
		const longText = 'a'.repeat(600);
		const comments = [makeComment({ text: longText })];
		const result = preprocessComments(comments);
		expect(result[0].text.length).toBeLessThan(310);
		expect(result[0].text).toMatch(/\.\.\.$/);
	});

	it('balances across platforms', () => {
		const hnComments = Array.from({ length: 30 }, (_, i) =>
			makeComment({ id: `hn-${i}`, platform: 'hn', score: 100 + i }),
		);
		const redditComments = Array.from({ length: 10 }, (_, i) =>
			makeComment({ id: `reddit-${i}`, platform: 'reddit', score: 50 + i }),
		);
		const result = preprocessComments([...hnComments, ...redditComments], { maxComments: 20 });

		const hnCount = result.filter((c) => c.platform === 'hn').length;
		const redditCount = result.filter((c) => c.platform === 'reddit').length;

		// Reddit should get at least minimum allocation, not be drowned out
		expect(redditCount).toBeGreaterThanOrEqual(3);
		expect(hnCount).toBeGreaterThan(redditCount); // but HN has more comments so gets more
	});

	it('includes mid-score comments for diversity', () => {
		const comments = Array.from({ length: 20 }, (_, i) =>
			makeComment({ id: String(i), score: 100 - i * 5 }),
		);
		const result = preprocessComments(comments, { maxComments: 10 });

		// Should not only have the top 10 by score
		const scores = result.map((c) => c.score);
		const minScore = Math.min(...scores);
		// Mid-score comments should bring in lower scores than pure top-10
		expect(minScore).toBeLessThan(60);
	});
});

describe('formatCommentsForPrompt', () => {
	it('groups comments by platform with labels', () => {
		const comments = [
			makeComment({ author: 'alice', text: 'Great!', score: 42, platform: 'hn' }),
			makeComment({ author: 'bob', text: 'Interesting', score: 10, platform: 'reddit' }),
		];
		const text = formatCommentsForPrompt(comments);
		expect(text).toContain('--- Hacker News');
		expect(text).toContain('--- Reddit');
		expect(text).toContain('[42 pts] alice: Great!');
		expect(text).toContain('[10 pts] bob: Interesting');
	});

	it('includes Lobsters section', () => {
		const comments = [makeComment({ platform: 'lobsters', author: 'charlie', score: 5 })];
		const text = formatCommentsForPrompt(comments);
		expect(text).toContain('--- Lobsters');
	});
});
