const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are a discussion summarizer. Given community comments about a web page from Hacker News and/or Reddit, produce a concise summary.

Structure your response as:
1. A one-line verdict (overall reception/sentiment)
2. 2-4 short paragraphs covering key themes, insights, and notable perspectives
3. If comments come from multiple platforms, note where perspectives diverged

Use inline tags like [HN] or [Reddit] to attribute specific claims. Be concise and direct.`;

export interface SummarizeOptions {
	apiKey: string;
	model: string;
	pageUrl: string;
	pageTitle?: string;
}

export interface SummarizeResult {
	summary: string;
	model: string;
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
			system: SYSTEM_PROMPT,
			messages: [{ role: 'user', content: userMessage }],
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Anthropic API error (${response.status}): ${error}`);
	}

	const data: { content: Array<{ type: string; text: string }> } = await response.json();
	const text = data.content.find((c) => c.type === 'text')?.text;

	if (!text) throw new Error('No text in Anthropic response');

	return { summary: text, model: options.model };
}
