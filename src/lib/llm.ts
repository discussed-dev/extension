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

function buildSystemPrompt(language: string): string {
	const langInstruction = language !== 'en' ? `\nRespond in ${language}.` : '';
	return `You summarize online discussions. Be direct and concise — no filler.${langInstruction}

Format:
- One sentence: overall sentiment/verdict
- 2-3 short paragraphs: key points, disagreements, notable insights
- Reference specific discussions using markdown links like [HN thread](url) or [r/subreddit](url)
- If multiple platforms: one sentence on where they diverged

Keep it under 200 words. Use markdown formatting.`;
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
	const sourcesSection = options.discussions?.length
		? `\n\nDiscussion threads (use these URLs when referencing discussions):\n${formatDiscussionSources(options.discussions)}`
		: '';

	return `${options.pageTitle ? `Page: ${options.pageTitle}\n` : ''}URL: ${options.pageUrl}${sourcesSection}\n\nComments:\n${commentsText}`;
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
			system: buildSystemPrompt(options.language ?? 'en'),
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

async function summarizeOpenai(
	commentsText: string,
	options: SummarizeOptions,
): Promise<SummarizeResult> {
	const baseUrl = options.openaiBaseUrl || 'https://api.openai.com/v1';

	const response = await fetch(`${baseUrl}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${options.apiKey}`,
		},
		body: JSON.stringify({
			model: options.model,
			max_tokens: 1024,
			messages: [
				{ role: 'system', content: buildSystemPrompt(options.language ?? 'en') },
				{ role: 'user', content: buildUserMessage(commentsText, options) },
			],
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenAI API error (${response.status}): ${error}`);
	}

	const data: {
		choices: Array<{ message: { content: string } }>;
		usage: { prompt_tokens: number; completion_tokens: number };
	} = await response.json();

	const text = data.choices[0]?.message?.content;
	if (!text) throw new Error('No text in OpenAI response');

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
			system_instruction: { parts: [{ text: buildSystemPrompt(options.language ?? 'en') }] },
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
	}
}
