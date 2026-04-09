import { describe, expect, it } from 'vitest';
import { formatMarkdownExport, formatPlainTextExport } from './export';

const baseInput = {
	pageTitle: 'Test Article',
	pageUrl: 'https://example.com/article',
	date: '2026-04-09',
	summary: 'This is the **summary** with [a link](https://hn.example.com).',
	discussions: [
		{
			platform: 'hn' as const,
			title: 'Test on HN',
			url: 'https://news.ycombinator.com/item?id=1',
			commentCount: 42,
		},
		{
			platform: 'reddit' as const,
			title: 'Test on Reddit',
			url: 'https://reddit.com/r/prog/1',
			commentCount: 15,
			subreddit: 'programming',
		},
	],
};

describe('formatMarkdownExport', () => {
	it('includes YAML frontmatter', () => {
		const result = formatMarkdownExport(baseInput);
		expect(result).toMatch(/^---\n/);
		expect(result).toContain('source: discussed.dev');
		expect(result).toContain('url: https://example.com/article');
		expect(result).toContain('tags:');
	});

	it('includes discussion metadata in frontmatter', () => {
		const result = formatMarkdownExport(baseInput);
		expect(result).toContain('platform: hn');
		expect(result).toContain('comments: 42');
	});

	it('includes summary body', () => {
		const result = formatMarkdownExport(baseInput);
		expect(result).toContain('## Summary');
		expect(result).toContain('This is the **summary**');
	});

	it('includes discussion links section', () => {
		const result = formatMarkdownExport(baseInput);
		expect(result).toContain('## Discussion Links');
		expect(result).toContain('[HN: Test on HN]');
		expect(result).toContain('42 comments');
	});
});

describe('formatPlainTextExport', () => {
	it('strips markdown formatting', () => {
		const result = formatPlainTextExport(baseInput);
		expect(result).not.toContain('**');
		expect(result).not.toContain('---');
		expect(result).not.toContain('##');
		expect(result).toContain('Test Article');
		expect(result).toContain('This is the summary');
	});
});
