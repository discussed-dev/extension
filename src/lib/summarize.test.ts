import { describe, expect, it } from 'vitest';
import { selectTopThreads } from './summarize';
import type { Discussion } from './types';

function discussion(commentCount: number, externalId: string): Discussion {
	return {
		platform: 'hn',
		title: `Thread ${externalId}`,
		url: `https://news.ycombinator.com/item?id=${externalId}`,
		points: commentCount,
		commentCount,
		createdAt: '2024-01-01T00:00:00.000Z',
		externalId,
	};
}

describe('selectTopThreads', () => {
	it('fetches the top 8 most-active threads', () => {
		const discussions = Array.from({ length: 12 }, (_, i) => discussion(i + 1, `t${i}`));

		const selected = selectTopThreads(discussions);

		expect(selected).toHaveLength(8);
		expect(selected.map((d) => d.commentCount)).toEqual([12, 11, 10, 9, 8, 7, 6, 5]);
	});

	it('returns all threads when fewer than the cap', () => {
		const discussions = [discussion(3, 'a'), discussion(9, 'b'), discussion(1, 'c')];

		const selected = selectTopThreads(discussions);

		expect(selected.map((d) => d.externalId)).toEqual(['b', 'a', 'c']);
	});
});
