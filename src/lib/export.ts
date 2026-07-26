import { type Citation, citationIndices, segmentSummary, stripRefs } from './grounding';
import type { Platform } from './types';

export interface ExportInput {
	pageTitle: string;
	pageUrl: string;
	date: string;
	summary: string;
	/** Absent on summaries cached before v0.5 — every ref is then stripped. */
	citations?: Citation[];
	discussions: Array<{
		platform: Platform;
		title: string;
		url: string;
		commentCount: number;
		subreddit?: string;
	}>;
}

const PLATFORM_LABELS: Record<Platform, string> = {
	hn: 'HN',
	reddit: 'Reddit',
	lobsters: 'Lobsters',
};

function buildFrontmatter(input: ExportInput): string {
	const lines = ['---', 'source: discussed.dev', `url: ${input.pageUrl}`, `date: ${input.date}`];

	if (input.discussions.length > 0) {
		lines.push('discussed:');
		for (const d of input.discussions) {
			lines.push(`  - platform: ${d.platform}`);
			lines.push(`    url: ${d.url}`);
			lines.push(`    comments: ${d.commentCount}`);
		}
	}

	lines.push('tags:', '  - discussed', '  - web-clipping', '---');
	return lines.join('\n');
}

function formatDiscussionLink(d: ExportInput['discussions'][number]): string {
	const label =
		d.platform === 'reddit' && d.subreddit ? `r/${d.subreddit}` : PLATFORM_LABELS[d.platform];
	return `- [${label}: ${d.title}](${d.url}) — ${d.commentCount} comments`;
}

/** Full platform names for footnotes. Export headings stay English, like the rest of the template. */
const CITATION_LABELS: Record<Citation['platform'], string> = {
	hn: 'Hacker News',
	reddit: 'Reddit',
	lobsters: 'Lobsters',
	page: 'Page comment',
};

function formatFootnote(citation: Citation, index: number): string {
	const parts = [CITATION_LABELS[citation.platform]];

	if (citation.author) {
		const author = citation.platform === 'reddit' ? `u/${citation.author}` : citation.author;
		parts.push(citation.score != null ? `${author} (${citation.score} pts)` : author);
	} else if (citation.score != null) {
		parts.push(`${citation.score} pts`);
	}

	// A footnote definition has to stay on one line.
	const quote = citation.quote.replace(/\s+/g, ' ').trim();
	const tail = citation.permalink ? ` — ${citation.permalink}` : '';
	return `[^${index}]: ${parts.join(' — ')}: "${quote}"${tail}`;
}

/**
 * Render the summary with refs turned into footnote markers, reusing
 * segmentSummary's numbering so footnotes and popup chips never drift apart.
 */
function buildGroundedSummary(input: ExportInput): { body: string; footnotes: string[] } {
	const citations = input.citations ?? [];
	const indices = citationIndices(input.summary, citations);
	const segments = segmentSummary(input.summary, citations, indices);

	const body = segments.map((s) => (s.kind === 'text' ? s.text : `[^${s.index}]`)).join('');

	const footnotes: string[] = [];
	const seen = new Set<number>();
	for (const segment of segments) {
		if (segment.kind !== 'cite' || seen.has(segment.index)) continue;
		seen.add(segment.index);
		footnotes.push(formatFootnote(segment.citation, segment.index));
	}

	return { body, footnotes };
}

export function formatMarkdownExport(input: ExportInput): string {
	const { body, footnotes } = buildGroundedSummary(input);

	const parts = [
		buildFrontmatter(input),
		'',
		`# Discussed: ${input.pageTitle}`,
		'',
		'## Summary',
		'',
		body,
	];

	if (footnotes.length > 0) {
		parts.push('', '## Sources', '', ...footnotes);
	}

	if (input.discussions.length > 0) {
		parts.push('', '## Discussion Links', '');
		for (const d of input.discussions) {
			parts.push(formatDiscussionLink(d));
		}
	}

	return `${parts.join('\n')}\n`;
}

export function formatPlainTextExport(input: ExportInput): string {
	const lines = [
		`Discussed: ${input.pageTitle}`,
		`URL: ${input.pageUrl}`,
		`Date: ${input.date}`,
		'',
		'Summary',
		'',
		// Plain text is for pasting anywhere and carries no affordance for a
		// citation, so refs are stripped rather than converted.
		stripMarkdown(stripRefs(input.summary)),
	];

	if (input.discussions.length > 0) {
		lines.push('', 'Discussion Links', '');
		for (const d of input.discussions) {
			const label =
				d.platform === 'reddit' && d.subreddit ? `r/${d.subreddit}` : PLATFORM_LABELS[d.platform];
			lines.push(`${label}: ${d.title} (${d.url}) — ${d.commentCount} comments`);
		}
	}

	return `${lines.join('\n')}\n`;
}

function stripMarkdown(text: string): string {
	return text
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^---+$/gm, '')
		.trim();
}

export function buildObsidianUri(vaultName: string, title: string, content: string): string {
	const params = new URLSearchParams({
		vault: vaultName,
		name: title,
		content,
	});
	return `obsidian://new?${params.toString()}`;
}
