import { describe, expect, it, vi } from 'vitest';
import { selectTopThreads, summarizeDiscussions } from './summarize';
import type { Discussion } from './types';

vi.mock('./cache', () => ({ cacheGet: vi.fn(async () => null), cacheSet: vi.fn(async () => {}) }));
vi.mock('./settings', () => ({
	settings: {
		getValue: vi.fn(async () => ({
			apiKey: 'k',
			llmProvider: 'anthropic',
			model: 'm',
			summaryLanguage: 'en',
			openaiBaseUrl: '',
			maxCommentsForSummary: 40,
		})),
	},
}));
vi.mock('./comments', () => ({
	fetchHnComments: vi.fn(async () => [
		{
			id: '1',
			ref: 'hn:1',
			author: 'a',
			text: 'a comment long enough to survive preprocessing',
			score: 1,
			depth: 0,
			platform: 'hn',
		},
	]),
	fetchRedditComments: vi.fn(async () => []),
	fetchLobstersComments: vi.fn(async () => []),
}));
vi.mock('./llm', () => ({
	summarize: vi.fn(async () => ({
		summary: 'done',
		model: 'm',
		usage: { inputTokens: 1, outputTokens: 1 },
	})),
}));

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

describe('summarizeDiscussions progress', () => {
	it('reports fetching before generating, once each', async () => {
		const phases: string[] = [];

		await summarizeDiscussions('https://example.com/a', [discussion(5, 'x')], {
			onPhase: (phase) => phases.push(phase),
		});

		expect(phases).toEqual(['fetching', 'generating']);
	});
});
