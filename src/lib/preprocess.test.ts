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
	it('sorts by score descending', () => {
		const comments = [makeComment({ id: 'a', score: 5 }), makeComment({ id: 'b', score: 20 })];
		const result = preprocessComments(comments);
		expect(result[0].score).toBe(20);
	});

	it('limits to maxComments', () => {
		const comments = Array.from({ length: 50 }, (_, i) => makeComment({ id: String(i), score: i }));
		const result = preprocessComments(comments, { maxComments: 10 });
		expect(result).toHaveLength(10);
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
		expect(result[0].text.length).toBeLessThan(510);
		expect(result[0].text).toMatch(/\.\.\.$/);
	});
});

describe('formatCommentsForPrompt', () => {
	it('formats comments with platform and score', () => {
		const comments = [
			makeComment({ author: 'alice', text: 'Great!', score: 42, platform: 'hn' }),
			makeComment({ author: 'bob', text: 'Interesting', score: 10, platform: 'reddit' }),
		];
		const text = formatCommentsForPrompt(comments);
		expect(text).toContain('[HN, 42 pts] alice: Great!');
		expect(text).toContain('[Reddit, 10 pts] bob: Interesting');
	});
});
