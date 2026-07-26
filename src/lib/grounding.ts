import type { Platform } from './types';

/**
 * Grounded Synthesis (v0.5): attach every claim in an AI summary to the comment
 * it came from.
 *
 * Pure module — no I/O, no browser APIs, no dependency on the fetch layer. It
 * takes structural inputs rather than the concrete `Comment` type so it stays
 * unit-testable on its own.
 *
 * The invariant this module enforces: **display text must never contain a raw,
 * unrendered ref token** — not under phantom refs, malformed refs, model
 * non-compliance, or a pre-v0.5 cache entry with no citations at all.
 */

/** A sampled comment, reduced to the fields a citation needs. `Comment` satisfies this. */
export interface CitableComment {
	ref: string;
	platform: Platform;
	author: string;
	text: string;
	score: number;
	permalink?: string;
}

/**
 * A native page comment paired with its position in the extracted array.
 * The index is the `[pg:N]` ref and must survive budget truncation unchanged.
 */
export interface PageCommentEntry {
	index: number;
	comment: { author?: string; text: string; score?: number };
}

export interface Citation {
	ref: string;
	platform: Platform | 'page';
	author?: string;
	score?: number;
	/** The already-truncated text the model saw, not a fuller version it never read. */
	quote: string;
	permalink?: string;
}

export type SummarySegment =
	| { kind: 'text'; text: string }
	| { kind: 'cite'; citation: Citation; index: number };

const REF_PREFIX: Record<Platform | 'page', string> = {
	hn: 'hn',
	reddit: 'rd',
	lobsters: 'lo',
	page: 'pg',
};

/**
 * Matches a ref token plus any horizontal whitespace in front of it, so removing
 * or replacing a token leaves no orphaned space before punctuation. Newlines are
 * deliberately excluded — a marker must never swallow a line break.
 */
function refPattern(): RegExp {
	return /[ \t]*\[(hn|rd|lo|pg):([A-Za-z0-9_-]{1,24})\]/g;
}

export function buildRef(platform: Platform | 'page', id: string): string {
	return `${REF_PREFIX[platform]}:${id}`;
}

export function collectCitations(
	sampled: CitableComment[],
	pageComments: PageCommentEntry[] = [],
): Citation[] {
	const citations: Citation[] = [];
	const seen = new Set<string>();

	for (const c of sampled) {
		if (!c.ref || seen.has(c.ref)) continue;
		seen.add(c.ref);
		citations.push({
			ref: c.ref,
			platform: c.platform,
			author: c.author,
			score: c.score,
			quote: c.text,
			permalink: c.permalink,
		});
	}

	for (const { index, comment } of pageComments) {
		const ref = buildRef('page', String(index));
		if (seen.has(ref)) continue;
		seen.add(ref);
		// Page comments have no permalink — the chip shows the quote only.
		citations.push({
			ref,
			platform: 'page',
			author: comment.author,
			score: comment.score,
			quote: comment.text,
		});
	}

	return citations;
}

/** Remove refs the predicate rejects, then tidy the whitespace they left behind. */
function removeRefsWhere(text: string, keep: (ref: string) => boolean): string {
	const stripped = text.replace(refPattern(), (match, prefix: string, id: string) =>
		keep(`${prefix}:${id}`) ? match : '',
	);
	return stripped.replace(/[ \t]{2,}/g, ' ').trim();
}

/** Remove every well-formed ref token. Used for plain-text export. */
export function stripRefs(text: string): string {
	return removeRefsWhere(text, () => false);
}

/**
 * Split summary text into alternating text and citation segments.
 *
 * A ref with no matching citation is a hallucination and is removed, so callers
 * can render text segments as markdown without ever emitting a raw token. Display
 * indices run 1..n in order of first appearance; a repeated ref reuses its index.
 *
 * `citations` is optional because pre-v0.5 cache entries carry none — that case
 * strips every ref, which is the same degradation path as a non-compliant model.
 */
export function segmentSummary(text: string, citations: Citation[] = []): SummarySegment[] {
	const byRef = new Map(citations.map((c) => [c.ref, c]));
	const cleaned = removeRefsWhere(text, (ref) => byRef.has(ref));

	const segments: SummarySegment[] = [];
	const indices = new Map<string, number>();
	let cursor = 0;
	let buffer = '';

	function flush(): void {
		if (buffer) {
			segments.push({ kind: 'text', text: buffer });
			buffer = '';
		}
	}

	for (const match of cleaned.matchAll(refPattern())) {
		const [full, prefix, id] = match;
		const start = match.index ?? 0;
		const citation = byRef.get(`${prefix}:${id}`);
		if (!citation) continue; // unreachable: removeRefsWhere already dropped these

		buffer += cleaned.slice(cursor, start);
		cursor = start + full.length;
		flush();

		let index = indices.get(citation.ref);
		if (index === undefined) {
			index = indices.size + 1;
			indices.set(citation.ref, index);
		}
		segments.push({ kind: 'cite', citation, index });
	}

	buffer += cleaned.slice(cursor);
	flush();
	return segments;
}
