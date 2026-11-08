import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { anthropicThinking, needsMaxCompletionTokens, summarize } from './llm';

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

/** The JSON body of the most recent fetch call. */
function lastBody(): Record<string, unknown> {
	const init = mockFetch.mock.calls.at(-1)?.[1] as RequestInit;
	return JSON.parse(String(init.body));
}

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
		'gpt-6-luna',
		'gpt-6.1-sol',
		'openai/gpt-oss-120b',
		'openai/gpt-oss-20b',
		'gpt-oss-120b',
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

describe('anthropicThinking', () => {
	it.each(['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-5-5'])(
		'turns thinking off for %s',
		(model) => {
			expect(anthropicThinking(model)).toEqual({ type: 'disabled' });
		},
	);

	it('uses the lowest accepted setting for Sonnet 5.5', () => {
		expect(anthropicThinking('claude-sonnet-5-5')).toEqual({ type: 'between_tools' });
	});

	it.each([
		// Thinking cannot be turned off on these.
		'claude-opus-5-5',
		'claude-fable-5-1',
		// Thinking is already off by default on these.
		'claude-haiku-4-5',
		'claude-sonnet-4-6',
		'claude-opus-4-8',
		// Unknown IDs get no thinking field rather than a guess that could 400.
		'claude-something-new',
	])('sends no thinking field for %s', (model) => {
		expect(anthropicThinking(model)).toBeUndefined();
	});
});

describe('summarize request parameters', () => {
	beforeEach(() => mockFetch.mockReset());

	const base = { apiKey: 'k', pageUrl: 'https://example.com' };

	it('gives Anthropic room beyond thinking and sends the per-model thinking setting', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				content: [{ type: 'text', text: 'summary' }],
				usage: { input_tokens: 1, output_tokens: 1 },
			}),
		});
		await summarize('comments', { ...base, provider: 'anthropic', model: 'claude-sonnet-5' });
		const body = lastBody();
		expect(body.max_tokens).toBe(4096);
		expect(body.thinking).toEqual({ type: 'disabled' });
	});

	it('omits the thinking field when the model takes none', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				content: [{ type: 'text', text: 'summary' }],
				usage: { input_tokens: 1, output_tokens: 1 },
			}),
		});
		await summarize('comments', { ...base, provider: 'anthropic', model: 'claude-opus-5-5' });
		expect('thinking' in lastBody()).toBe(false);
	});

	it.each(['gpt-5.4-mini', 'gpt-5-nano', 'openai/gpt-oss-120b'])(
		'asks %s for low reasoning effort',
		async (model) => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: 'summary' } }],
					usage: { prompt_tokens: 1, completion_tokens: 1 },
				}),
			});
			await summarize('comments', { ...base, provider: 'openai', model });
			const body = lastBody();
			expect(body.reasoning_effort).toBe('low');
			expect(body.max_completion_tokens).toBe(4096);
		},
	);
});
