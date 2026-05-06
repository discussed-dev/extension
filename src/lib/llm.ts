export type LlmProvider = 'anthropic' | 'openai' | 'google';

export interface DiscussionSource {
	platform: string;
	title: string;
	url: string;
	subreddit?: string;
}

export interface SummarizeOptions {
	provider: LlmProvider;
	apiKey: string;
	model: string;
	pageUrl: string;
	pageTitle?: string;
	language?: string;
	discussions?: DiscussionSource[];
	openaiBaseUrl?: string;
	coverageHeader?: string;
	articleContext?: string;
	pageComments?: string;
	pageCommentSource?: string;
}

export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
}

export interface SummarizeResult {
	summary: string;
	model: string;
	usage: TokenUsage;
}

function buildSystemPrompt(
	language: string,
	hasArticle: boolean,
	hasPageComments: boolean,
): string {
	const langInstruction = language !== 'en' ? `\nRespond in ${language}.` : '';
	const basePrompt = `You brief someone on what people said about a webpage. Write like a sharp colleague talking over coffee, not a report.${langInstruction}

Rules:
- Only use the supplied comments. Don't invent facts or consensus.
- This is a sample, not everything. Never say "the community thinks" — say what the comments actually say.
- Quote or paraphrase specific people when a point is interesting. Use their words, not abstractions.
- If opinions are split, say so plainly. If the sample is thin, say that.
- Don't balance pros and cons artificially. If the discussion leaned one way, reflect that.
- Link to threads with markdown: [HN](url) or [r/sub](url).
- Plain paragraphs only. No headings, no bullets, no "Overall," or "It's worth noting."

Structure: one sentence verdict (max 20 words), then 2 short paragraphs with quotes and specifics. Spread the substance across paragraphs, don't front-load. Under 150 words total.`;

	let extra = '';
	if (hasArticle || hasPageComments) {
		extra =
			'\n\nWhen article context or page comments are provided, also:\n- Note where page commenters differ from forum commenters\n- Surface unique insights not obvious from the article alone';
	}
	return basePrompt + extra;
}

function formatDiscussionSources(discussions: DiscussionSource[]): string {
	return discussions
		.map((d) => {
			const label =
				d.platform === 'reddit' && d.subreddit ? `r/${d.subreddit}` : d.platform.toUpperCase();
			return `- [${label}: ${d.title}](${d.url})`;
		})
		.join('\n');
}

function buildUserMessage(commentsText: string, options: SummarizeOptions): string {
	const parts: string[] = [];

	if (options.pageTitle) parts.push(`Page: ${options.pageTitle}`);
	parts.push(`URL: ${options.pageUrl}`);

	if (options.coverageHeader) parts.push(`\n${options.coverageHeader}`);

	if (options.articleContext) {
		parts.push(`\nARTICLE SUMMARY:\n${options.articleContext}`);
	}

	if (options.discussions?.length) {
		parts.push(
			`\nDiscussion threads (use these URLs when referencing discussions):\n${formatDiscussionSources(options.discussions)}`,
		);
	}

	parts.push(`\nDISCUSSION COMMENTS:\n${commentsText}`);

	if (options.pageComments) {
		const source = options.pageCommentSource ?? 'page';
		parts.push(`\nPAGE COMMENTS (from ${source}):\n${options.pageComments}`);
	}

	return parts.join('\n');
}

// --- Anthropic ---

async function summarizeAnthropic(
	commentsText: string,
	options: SummarizeOptions,
): Promise<SummarizeResult> {
	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': options.apiKey,
			'anthropic-version': '2023-06-01',
			'anthropic-dangerous-direct-browser-access': 'true',
		},
		body: JSON.stringify({
			model: options.model,
			max_tokens: 1024,
			system: buildSystemPrompt(
				options.language ?? 'en',
				!!options.articleContext,
				!!options.pageComments,
			),
			messages: [{ role: 'user', content: buildUserMessage(commentsText, options) }],
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Anthropic API error (${response.status}): ${error}`);
	}

	const data: {
		content: Array<{ type: string; text: string }>;
		usage: { input_tokens: number; output_tokens: number };
	} = await response.json();

	const text = data.content.find((c) => c.type === 'text')?.text;
	if (!text) throw new Error('No text in Anthropic response');

	return {
		summary: text,
		model: options.model,
		usage: { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens },
	};
}

// --- OpenAI-compatible (OpenAI, Groq, Together, local, etc.) ---

// GPT-5 family and o-series (o1/o3/o4) reject `max_tokens` and require
// `max_completion_tokens` instead. Older models (gpt-4.1, gpt-4o, etc.) and
// most non-OpenAI providers (Groq, DeepSeek, Ollama) still expect `max_tokens`.
// OpenRouter prefixes vendor (e.g. `openai/gpt-5.4-mini`), so strip that first.
export function needsMaxCompletionTokens(model: string): boolean {
	const name = model.split('/').pop() ?? model;
	return /^(gpt-5|o\d)([.\-]|$)/.test(name);
}

async function summarizeOpenai(
	commentsText: string,
	options: SummarizeOptions,
): Promise<SummarizeResult> {
	const baseUrl = options.openaiBaseUrl || 'https://api.openai.com/v1';

	// Reasoning models: max_completion_tokens INCLUDES internal reasoning
	// tokens. With effort=medium (default), 1024 was burned before any output
	// could be emitted, returning empty content. Use 'minimal' effort
	// (summarization doesn't need deep reasoning) plus a roomier ceiling.
	const reasoning = needsMaxCompletionTokens(options.model);
	const extraParams = reasoning
		? { max_completion_tokens: 4096, reasoning_effort: 'minimal' as const }
		: { max_tokens: 1024 };

	const response = await fetch(`${baseUrl}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${options.apiKey}`,
		},
		body: JSON.stringify({
			model: options.model,
			...extraParams,
			messages: [
				{
					role: 'system',
					content: buildSystemPrompt(
						options.language ?? 'en',
						!!options.articleContext,
						!!options.pageComments,
					),
				},
				{ role: 'user', content: buildUserMessage(commentsText, options) },
			],
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenAI API error (${response.status}): ${error}`);
	}

	const data: {
		choices: Array<{ message: { content: string; refusal?: string }; finish_reason?: string }>;
		usage: {
			prompt_tokens: number;
			completion_tokens: number;
			completion_tokens_details?: { reasoning_tokens?: number };
		};
	} = await response.json();

	const choice = data.choices[0];
	const text = choice?.message?.content;
	if (!text) {
		const finish = choice?.finish_reason ?? 'unknown';
		const refusal = choice?.message?.refusal;
		const reasoningTokens = data.usage?.completion_tokens_details?.reasoning_tokens;
		const detail = refusal
			? `refused: ${refusal}`
			: finish === 'length' && reasoningTokens
				? `reasoning consumed all ${reasoningTokens} completion tokens before any output — try a non-reasoning model or raise the limit`
				: `finish_reason=${finish}`;
		throw new Error(`No text in OpenAI response (${detail})`);
	}

	return {
		summary: text,
		model: options.model,
		usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens },
	};
}

// --- Google Gemini ---

async function summarizeGoogle(
	commentsText: string,
	options: SummarizeOptions,
): Promise<SummarizeResult> {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${options.apiKey}`;

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			system_instruction: {
				parts: [
					{
						text: buildSystemPrompt(
							options.language ?? 'en',
							!!options.articleContext,
							!!options.pageComments,
						),
					},
				],
			},
			contents: [{ parts: [{ text: buildUserMessage(commentsText, options) }] }],
			generationConfig: { maxOutputTokens: 1024 },
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Gemini API error (${response.status}): ${error}`);
	}

	const data: {
		candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
		usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
	} = await response.json();

	const text = data.candidates[0]?.content?.parts[0]?.text;
	if (!text) throw new Error('No text in Gemini response');

	return {
		summary: text,
		model: options.model,
		usage: {
			inputTokens: data.usageMetadata.promptTokenCount,
			outputTokens: data.usageMetadata.candidatesTokenCount,
		},
	};
}

// --- Router ---

export async function summarize(
	commentsText: string,
	options: SummarizeOptions,
): Promise<SummarizeResult> {
	switch (options.provider) {
		case 'anthropic':
			return summarizeAnthropic(commentsText, options);
		case 'openai':
			return summarizeOpenai(commentsText, options);
		case 'google':
			return summarizeGoogle(commentsText, options);
		default:
			throw new Error(`Unsupported LLM provider: ${options.provider}`);
	}
}
