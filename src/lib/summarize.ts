import { cacheGet, cacheSet } from './cache';
import { type Comment, fetchHnComments, fetchRedditComments } from './comments';
import type { TokenUsage } from './llm';
import { summarize } from './llm';
import { formatCommentsForPrompt, preprocessComments } from './preprocess';
import { settings } from './settings';
import type { Discussion } from './types';

const SUMMARY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SummaryResult {
	summary: string;
	model: string;
	createdAt: string;
	usage?: TokenUsage;
}

function extractPermalink(redditUrl: string): string {
	try {
		const url = new URL(redditUrl);
		return url.pathname;
	} catch {
		return '';
	}
}

async function fetchAllComments(discussions: Discussion[]): Promise<Comment[]> {
	const fetches = discussions.map((d) => {
		if (d.platform === 'hn') return fetchHnComments(d.externalId);
		if (d.platform === 'reddit') return fetchRedditComments(extractPermalink(d.url));
		return Promise.resolve([]);
	});

	const results = await Promise.allSettled(fetches);
	return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

export async function summarizeDiscussions(
	pageUrl: string,
	discussions: Discussion[],
	options: { force?: boolean } = {},
): Promise<SummaryResult> {
	const cacheKey = `summary:${pageUrl}`;

	if (!options.force) {
		const cached = await cacheGet<SummaryResult>(cacheKey);
		if (cached) return cached;
	}

	const userSettings = await settings.getValue();

	if (!userSettings.apiKey) {
		throw new Error('No API key configured. Add one in extension settings.');
	}

	const allComments = await fetchAllComments(discussions);

	if (allComments.length === 0) {
		throw new Error('No comments found to summarize.');
	}

	const processed = preprocessComments(allComments, {
		maxComments: userSettings.maxCommentsForSummary,
	});
	const commentsText = formatCommentsForPrompt(processed);

	const result = await summarize(commentsText, {
		provider: userSettings.llmProvider,
		apiKey: userSettings.apiKey,
		model: userSettings.model,
		pageUrl,
		language: userSettings.summaryLanguage,
		openaiBaseUrl: userSettings.openaiBaseUrl,
		discussions: discussions.map((d) => ({
			platform: d.platform,
			title: d.title,
			url: d.url,
			subreddit: d.subreddit,
		})),
	});

	const summaryResult: SummaryResult = {
		summary: result.summary,
		model: result.model,
		createdAt: new Date().toISOString(),
		usage: result.usage,
	};

	await cacheSet(cacheKey, summaryResult, SUMMARY_CACHE_TTL_MS);

	return summaryResult;
}
