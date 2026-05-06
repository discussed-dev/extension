import { describe, expect, it } from 'vitest';
import { needsMaxCompletionTokens } from './llm';

describe('needsMaxCompletionTokens', () => {
	it.each([
		'gpt-5',
		'gpt-5-mini',
		'gpt-5-nano',
		'gpt-5.4',
		'gpt-5.4-mini',
		'gpt-5.4-nano',
		'o1',
		'o1-mini',
		'o3',
		'o3-mini',
		'o4-mini',
		'openai/gpt-5.4-mini',
		'openai/o4-mini',
	])('uses max_completion_tokens for %s', (model) => {
		expect(needsMaxCompletionTokens(model)).toBe(true);
	});

	it.each([
		'gpt-4.1-mini',
		'gpt-4.1-nano',
		'gpt-4o',
		'gpt-4o-mini',
		'gpt-4',
		'gpt-3.5-turbo',
		'deepseek-chat',
		'deepseek-reasoner',
		'llama-3.3-70b-versatile',
		'qwen/qwen3-32b',
		'anthropic/claude-sonnet-4.6',
		'grok-4-1-fast-non-reasoning',
		'mistral',
	])('keeps max_tokens for %s', (model) => {
		expect(needsMaxCompletionTokens(model)).toBe(false);
	});
});
