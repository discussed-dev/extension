import { cacheGet, cacheSet } from './cache';
import { buildRef } from './grounding';

export interface Comment {
	id: string;
	/** Prompt-facing citation marker, e.g. "hn:44239571". See grounding.ts. */
	ref: string;
	/** Absolute URL to the comment; undefined when the platform gives us no way to build one. */
	permalink?: string;
	author: string;
	text: string;
	score: number;
	depth: number;
	platform: 'hn' | 'reddit' | 'lobsters';
}

// --- Hacker News ---

interface HnItem {
	id: number;
	author?: string;
	text?: string;
	children?: HnItem[];
}

/**
 * Algolia returns the comment tree oldest-first and with `points: null` on every
 * comment, so neither its order nor its scores say which comments HN readers
 * value. The official HN API lists a story's top-level comments (`kids`) in
 * HN's ranked order; that order is used for the top level, and reply count
 * stands in for a score at every level.
 */
const HN_API_TIMEOUT_MS = 3000;
/** After a network-level failure (e.g. the host is blocked), skip the HN API for this long. */
const HN_API_SKIP_MS = 10 * 60 * 1000;
const HN_API_SKIP_KEY = 'hn-api-unreachable';

async function fetchHnRanking(storyId: string): Promise<number[] | null> {
	if (!/^\d+$/.test(storyId)) return null;
	if (await cacheGet<boolean>(HN_API_SKIP_KEY)) return null;
	let response: Response;
	try {
		response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`, {
			signal: AbortSignal.timeout(HN_API_TIMEOUT_MS),
		});
	} catch {
		await cacheSet(HN_API_SKIP_KEY, true, HN_API_SKIP_MS);
		return null;
	}
	if (!response.ok) return null;
	try {
		const data: { kids?: unknown } = await response.json();
		return Array.isArray(data.kids)
			? data.kids.filter((k): k is number => typeof k === 'number')
			: null;
	} catch {
		return null;
	}
}

function countReplies(item: HnItem): number {
	return (item.children ?? []).reduce((sum, child) => sum + 1 + countReplies(child), 0);
}

/** Ranked threads first in HN's order; the rest (and everything, without a ranking) by reply count. */
function rankTopLevel(children: HnItem[], ranking: number[] | null): HnItem[] {
	const position = new Map((ranking ?? []).map((id, index) => [id, index]));
	return [...children].sort((a, b) => {
		const pa = position.get(a.id) ?? Number.POSITIVE_INFINITY;
		const pb = position.get(b.id) ?? Number.POSITIVE_INFINITY;
		if (pa !== pb) return pa - pb;
		return countReplies(b) - countReplies(a);
	});
}

function flattenHnComments(item: HnItem, depth = 0): Comment[] {
	const comments: Comment[] = [];
	if (item.author && item.text) {
		const id = String(item.id);
		comments.push({
			id,
			ref: buildRef('hn', id),
			permalink: `https://news.ycombinator.com/item?id=${id}`,
			author: item.author,
			text: stripHtml(item.text),
			score: countReplies(item),
			depth,
			platform: 'hn',
		});
	}
	for (const child of item.children ?? []) {
		comments.push(...flattenHnComments(child, depth + 1));
	}
	return comments;
}

async function fetchHnTree(storyId: string): Promise<HnItem | null> {
	try {
		const response = await fetch(`https://hn.algolia.com/api/v1/items/${storyId}`);
		if (!response.ok) return null;
		return (await response.json()) as HnItem;
	} catch {
		return null;
	}
}

export async function fetchHnComments(storyId: string): Promise<Comment[]> {
	const [tree, ranking] = await Promise.all([
		fetchHnTree(storyId),
		// Ranking only improves order; a storage error must not cost the comments.
		fetchHnRanking(storyId).catch(() => null),
	]);
	if (!tree) return [];
	return flattenHnComments({ ...tree, children: rankTopLevel(tree.children ?? [], ranking) });
}

// --- Reddit ---

interface RedditCommentData {
	id?: string;
	author?: string;
	body?: string;
	score?: number;
	depth?: number;
	permalink?: string;
	replies?: { kind: string; data: { children: Array<{ kind: string; data: RedditCommentData }> } };
}

/**
 * Reddit's `t1` data is expected to carry `permalink`, but that is not
 * guaranteed, so fall back to concatenating the thread permalink. A comment with
 * no thread context yields no permalink at all — never a link to
 * `https://www.reddit.com/<id>/`, which would point at nothing.
 */
function redditPermalink(threadPermalink: string, id: string, own?: string): string | undefined {
	if (own) return own.startsWith('http') ? own : `https://www.reddit.com${own}`;
	if (!threadPermalink) return undefined;
	const base = threadPermalink.endsWith('/') ? threadPermalink : `${threadPermalink}/`;
	return `https://www.reddit.com${base}${id}/`;
}

function flattenRedditComments(
	children: Array<{ kind: string; data: RedditCommentData }>,
	threadPermalink: string,
): Comment[] {
	const comments: Comment[] = [];
	for (const child of children) {
		if (child.kind !== 't1') continue;
		const d = child.data;
		// `id` is required: without it a comment can be neither cited nor linked.
		if (d.id && d.author && d.body && d.author !== '[deleted]' && d.author !== 'AutoModerator') {
			comments.push({
				id: d.id,
				ref: buildRef('reddit', d.id),
				permalink: redditPermalink(threadPermalink, d.id, d.permalink),
				author: d.author,
				text: d.body,
				score: d.score ?? 0,
				depth: d.depth ?? 0,
				platform: 'reddit',
			});
		}
		if (d.replies && typeof d.replies === 'object' && d.replies.data?.children) {
			comments.push(...flattenRedditComments(d.replies.data.children, threadPermalink));
		}
	}
	return comments;
}

export async function fetchRedditComments(permalink: string): Promise<Comment[]> {
	try {
		const url = `https://www.reddit.com${permalink}.json?limit=100`;
		const response = await fetch(url, {
			headers: { 'User-Agent': 'web:discussed:v0.1.0 (https://discussed.dev)' },
		});
		if (!response.ok) return [];
		const data: Array<{ data: { children: Array<{ kind: string; data: RedditCommentData }> } }> =
			await response.json();
		if (data.length < 2) return [];
		return flattenRedditComments(data[1].data.children, permalink);
	} catch {
		return [];
	}
}

// --- Lobsters ---

interface LobstersComment {
	short_id: string;
	/** Absolute comment URL returned by the story JSON — capture it, don't construct one. */
	short_id_url?: string;
	comment_plain: string;
	score: number;
	depth: number;
	commenting_user: string;
	is_deleted: boolean;
	is_moderated: boolean;
}

export async function fetchLobstersComments(storyId: string): Promise<Comment[]> {
	try {
		const response = await fetch(`https://lobste.rs/s/${storyId}.json`);
		if (!response.ok) return [];
		const data: { comments: LobstersComment[] } = await response.json();

		return (data.comments ?? [])
			.filter((c) => !c.is_deleted && !c.is_moderated && c.comment_plain)
			.map((c) => ({
				id: c.short_id,
				ref: buildRef('lobsters', c.short_id),
				permalink: c.short_id_url,
				author: c.commenting_user,
				text: c.comment_plain,
				score: c.score,
				depth: c.depth,
				platform: 'lobsters' as const,
			}));
	} catch {
		return [];
	}
}

// --- Helpers ---

function stripHtml(html: string): string {
	return html
		.replace(/<[^>]+>/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}
