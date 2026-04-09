import { describe, expect, it } from 'vitest';
import { estimateTokens, truncateToTokenBudget } from './token-budget';

describe('estimateTokens', () => {
	it('estimates tokens as chars / 4', () => {
		expect(estimateTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75 → 3
	});

	it('returns 0 for empty string', () => {
		expect(estimateTokens('')).toBe(0);
	});
});

describe('truncateToTokenBudget', () => {
	it('returns text unchanged if within budget', () => {
		const text = 'short text';
		expect(truncateToTokenBudget(text, 100)).toBe(text);
	});

	it('truncates text to fit token budget', () => {
		const text = 'a'.repeat(800); // 200 tokens
		const result = truncateToTokenBudget(text, 50); // 50 tokens = 200 chars
		expect(result.length).toBeLessThanOrEqual(200);
	});

	it('returns empty string for 0 budget', () => {
		expect(truncateToTokenBudget('anything', 0)).toBe('');
	});
});
