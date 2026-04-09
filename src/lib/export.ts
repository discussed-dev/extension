import type { Platform } from './types';

export interface ExportInput {
	pageTitle: string;
	pageUrl: string;
	date: string;
	summary: string;
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

export function formatMarkdownExport(input: ExportInput): string {
	const parts = [
		buildFrontmatter(input),
		'',
		`# Discussed: ${input.pageTitle}`,
		'',
		'## Summary',
		'',
		input.summary,
	];

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
		stripMarkdown(input.summary),
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
