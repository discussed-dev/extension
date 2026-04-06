const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

function buildSystemPrompt(language: string): string {
	const langInstruction = language !== 'en' ? `\nRespond in ${language}.` : '';
	return `You summarize online discussions. Be direct and concise — no filler.${langInstruction}

Format:
- One sentence: overall sentiment/verdict
- 2-3 short paragraphs: key points, disagreements, notable insights
- Use [HN] or [Reddit] tags to attribute claims
- If multiple platforms: one sentence on where they diverged

Keep it under 200 words.`;
}

export interface SummarizeOptions {
	apiKey: string;
	model: string;
	pageUrl: string;
	pageTitle?: string;
	language?: string;
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

export async function summarize(
	commentsText: string,
	options: SummarizeOptions,
): Promise<SummarizeResult> {
	const userMessage = options.pageTitle
		? `Page: ${options.pageTitle}\nURL: ${options.pageUrl}\n\nComments:\n${commentsText}`
		: `URL: ${options.pageUrl}\n\nComments:\n${commentsText}`;

	const response = await fetch(ANTHROPIC_API, {
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
			messages: [{ role: 'user', content: userMessage }],
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
		usage: {
			inputTokens: data.usage.input_tokens,
			outputTokens: data.usage.output_tokens,
		},
	};
}
