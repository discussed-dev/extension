import { cacheGet, cacheSet } from './cache';
import {
	type Comment,
	fetchHnComments,
	fetchLobstersComments,
	fetchRedditComments,
} from './comments';
import type { SummarizeOptions, TokenUsage } from './llm';
import { summarize } from './llm';
import { type PageContent, buildArticleContext } from './page-content';
import { formatCommentsForPrompt, preprocessComments } from './preprocess';
import { settings } from './settings';
import type { Discussion, Platform } from './types';

const SUMMARY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ARTICLE_TOKEN_BUDGET = 2000;
const MAX_THREADS_FOR_COMMENTS = 5;
const MAX_HN_COMMENTS_PER_THREAD = 200;

export interface SummaryResult {
	summary: string;
	model: string;
	createdAt: string;
	usage?: TokenUsage;
}

export interface CoverageMeta {
	totalThreads: number;
	fetchedThreads: number;
	totalComments: number;
	sampledComments: number;
	platforms: Array<{ platform: Platform; threads: number; comments: number; sampled: number }>;
}

function extractPermalink(redditUrl: string): string {
	try {
		return new URL(redditUrl).pathname;
	} catch {
		return '';
	}
}

function selectTopThreads(discussions: Discussion[]): Discussion[] {
	return [...discussions]
		.sort((a, b) => b.commentCount - a.commentCount)
		.slice(0, MAX_THREADS_FOR_COMMENTS);
}

async function fetchCommentsForThread(d: Discussion): Promise<Comment[]> {
	if (d.platform === 'hn') {
		const comments = await fetchHnComments(d.externalId);
		return comments.slice(0, MAX_HN_COMMENTS_PER_THREAD);
	}
	if (d.platform === 'reddit') return fetchRedditComments(extractPermalink(d.url));
	if (d.platform === 'lobsters') return fetchLobstersComments(d.externalId);
	return [];
}

async function fetchAllComments(
	discussions: Discussion[],
): Promise<{ comments: Comment[]; fetchedThreads: Discussion[] }> {
	const selected = selectTopThreads(discussions);

	const results = await Promise.allSettled(selected.map((d) => fetchCommentsForThread(d)));

	const comments = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

	return { comments, fetchedThreads: selected };
}

function buildCoverageMeta(
	allDiscussions: Discussion[],
	fetchedThreads: Discussion[],
	allComments: Comment[],
	sampledComments: Comment[],
): CoverageMeta {
	const PLATFORMS: Platform[] = ['hn', 'reddit', 'lobsters'];

	const platforms = PLATFORMS.map((p) => {
		const threads = fetchedThreads.filter((d) => d.platform === p).length;
		const comments = allComments.filter((c) => c.platform === p).length;
		const sampled = sampledComments.filter((c) => c.platform === p).length;
		return { platform: p, threads, comments, sampled };
	}).filter((p) => p.threads > 0);

	return {
		totalThreads: allDiscussions.length,
		fetchedThreads: fetchedThreads.length,
		totalComments: allComments.length,
		sampledComments: sampledComments.length,
		platforms,
	};
}

function formatCoverageHeader(meta: CoverageMeta): string {
	const platformLines = meta.platforms
		.map(
			(p) =>
				`- ${p.platform.toUpperCase()}: ${p.threads} thread${p.threads === 1 ? '' : 's'}, ${p.comments} comments (${p.sampled} sampled)`,
		)
		.join('\n');

	return `Coverage:
- ${meta.totalThreads} threads found (top ${meta.fetchedThreads} by activity fetched)
- ${meta.totalComments} total comments (${meta.sampledComments} sampled below)
${platformLines}`;
}

export async function summarizeDiscussions(
	pageUrl: string,
	discussions: Discussion[],
	options: { force?: boolean; pageContent?: PageContent } = {},
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

	const { comments: allComments, fetchedThreads } = await fetchAllComments(discussions);

	if (allComments.length === 0) {
		throw new Error('No comments found to summarize.');
	}

	const processed = preprocessComments(allComments, {
		maxComments: userSettings.maxCommentsForSummary,
	});

	const coverage = buildCoverageMeta(discussions, fetchedThreads, allComments, processed);
	const coverageHeader = formatCoverageHeader(coverage);
	const commentsText = formatCommentsForPrompt(processed);

	const articleContext = options.pageContent
		? buildArticleContext(options.pageContent, ARTICLE_TOKEN_BUDGET)
		: undefined;

	const summarizeOptions: SummarizeOptions = {
		provider: userSettings.llmProvider,
		apiKey: userSettings.apiKey,
		model: userSettings.model,
		pageUrl,
		language: userSettings.summaryLanguage,
		openaiBaseUrl: userSettings.openaiBaseUrl,
		discussions: fetchedThreads.map((d) => ({
			platform: d.platform,
			title: d.title,
			url: d.url,
			subreddit: d.subreddit,
		})),
		coverageHeader,
		articleContext,
	};

	const result = await summarize(commentsText, summarizeOptions);

	const summaryResult: SummaryResult = {
		summary: result.summary,
		model: result.model,
		createdAt: new Date().toISOString(),
		usage: result.usage,
	};

	await cacheSet(cacheKey, summaryResult, SUMMARY_CACHE_TTL_MS);

	return summaryResult;
}
