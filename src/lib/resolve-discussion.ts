import { cacheGet, cacheSet } from './cache';
import type { Platform } from './types';

export interface DiscussionPageInfo {
	platform: Platform;
	id: string;
}

export interface ResolvedDiscussion {
	linkedUrl: string;
	platform: Platform;
	discussionId: string;
}

const REDDIT_COMMENTS_RE =
	/^https?:\/\/([a-z]+\.)?reddit\.com\/(r\/[^/]+\/)?comments\/([a-z0-9]+)/i;
const LOBSTERS_STORY_RE = /^https?:\/\/lobste\.rs\/s\/([a-z0-9]+)/i;

const PLATFORM_HOSTS = new Set(['news.ycombinator.com', 'lobste.rs']);
const REDDIT_HOST_RE = /^([a-z]+\.)?reddit\.com$/i;

export function isPlatformUrl(url: string): boolean {
	try {
		const { hostname } = new URL(url);
		return PLATFORM_HOSTS.has(hostname) || REDDIT_HOST_RE.test(hostname);
	} catch {
		return false;
	}
}

export function detectDiscussionPage(url: string): DiscussionPageInfo | null {
	try {
		const parsed = new URL(url);

		if (parsed.hostname === 'news.ycombinator.com' && parsed.pathname === '/item') {
			const id = parsed.searchParams.get('id');
			if (id && /^\d+$/.test(id)) {
				return { platform: 'hn', id };
			}
		}

		const redditMatch = url.match(REDDIT_COMMENTS_RE);
		if (redditMatch) {
			return { platform: 'reddit', id: redditMatch[3] };
		}

		const lobstersMatch = url.match(LOBSTERS_STORY_RE);
		if (lobstersMatch) {
			return { platform: 'lobsters', id: lobstersMatch[1] };
		}
	} catch {
		return null;
	}

	return null;
}

interface HnItemResponse {
	url?: string | null;
}

interface RedditListingResponse {
	data: {
		children: Array<{
			data: {
				url?: string;
				is_self?: boolean;
			};
		}>;
	};
}

interface LobstersStoryResponse {
	url?: string;
	short_id: string;
}

async function resolveHn(id: string): Promise<string | null> {
	const response = await fetch(`https://hn.algolia.com/api/v1/items/${id}`);
	if (!response.ok) return null;
	const data: HnItemResponse = await response.json();
	return data.url || null;
}

async function resolveReddit(id: string): Promise<string | null> {
	const response = await fetch(`https://www.reddit.com/comments/${id}.json`, {
		headers: { 'User-Agent': 'web:discussed:v0.1.0 (https://discussed.dev)' },
	});
	if (!response.ok) return null;
	const data: RedditListingResponse[] = await response.json();
	const post = data[0]?.data?.children?.[0]?.data;
	if (!post || post.is_self) return null;
	return post.url || null;
}

async function resolveLobsters(id: string): Promise<string | null> {
	const response = await fetch(`https://lobste.rs/s/${id}.json`);
	if (!response.ok) return null;
	const data: LobstersStoryResponse = await response.json();
	return data.url || null;
}

const RESOLVE_CACHE_TTL_MS = 30 * 60 * 1000;

function resolveDiscussionId(platform: Platform, id: string): string {
	if (platform === 'reddit') return `t3_${id}`;
	return id;
}

export async function resolveLinkedUrl(url: string): Promise<ResolvedDiscussion | null> {
	const info = detectDiscussionPage(url);
	if (!info) return null;

	const cacheKey = `resolve:${info.platform}:${info.id}`;
	const cached = await cacheGet<ResolvedDiscussion>(cacheKey);
	if (cached) return cached;

	try {
		let linkedUrl: string | null = null;

		switch (info.platform) {
			case 'hn':
				linkedUrl = await resolveHn(info.id);
				break;
			case 'reddit':
				linkedUrl = await resolveReddit(info.id);
				break;
			case 'lobsters':
				linkedUrl = await resolveLobsters(info.id);
				break;
		}

		if (!linkedUrl) return null;

		const result: ResolvedDiscussion = {
			linkedUrl,
			platform: info.platform,
			discussionId: resolveDiscussionId(info.platform, info.id),
		};

		await cacheSet(cacheKey, result, RESOLVE_CACHE_TTL_MS);
		return result;
	} catch {
		return null;
	}
}
