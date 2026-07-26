import { describe, expect, it } from 'vitest';
import { formatMarkdownExport, formatPlainTextExport } from './export';
import { type Citation, citationIndices } from './grounding';

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

const citations: Citation[] = [
	{
		ref: 'lo:1nooby',
		platform: 'lobsters',
		author: 'mxey',
		score: 15,
		quote: 'The benchmark ignores\ncache effects entirely',
		permalink: 'https://lobste.rs/c/1nooby',
	},
	{
		ref: 'hn:44239571',
		platform: 'hn',
		author: 'alice',
		score: 0,
		quote: 'See the appendix',
		permalink: 'https://news.ycombinator.com/item?id=44239571',
	},
	{ ref: 'pg:2', platform: 'page', quote: 'Reader take with no link' },
];

const groundedInput = {
	...baseInput,
	summary:
		'Most agree the benchmark is flawed [lo:1nooby], one points at the appendix [hn:44239571].',
	citations,
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

	it('strips citation refs rather than carrying them into pasted text', () => {
		const result = formatPlainTextExport(groundedInput);
		expect(result).not.toContain('[hn:');
		expect(result).not.toContain('[lo:');
		expect(result).not.toContain('[^1]');
		expect(result).toContain('Most agree the benchmark is flawed, one points at the appendix.');
	});

	it('strips refs even when the entry predates v0.5 and has no citations', () => {
		const result = formatPlainTextExport({ ...groundedInput, citations: undefined });
		expect(result).not.toContain('[hn:');
		expect(result).not.toContain('[lo:');
	});
});

describe('grounded markdown export', () => {
	it('converts refs to footnote markers and appends a Sources section', () => {
		const result = formatMarkdownExport(groundedInput);
		expect(result).toContain('flawed[^1], one points at the appendix[^2].');
		expect(result).toContain('## Sources');
		expect(result).toContain(
			'[^1]: Lobsters — mxey (15 pts): "The benchmark ignores cache effects entirely" — https://lobste.rs/c/1nooby',
		);
		expect(result).toContain(
			'[^2]: Hacker News — alice (0 pts): "See the appendix" — https://news.ycombinator.com/item?id=44239571',
		);
	});

	it('numbers footnotes the same way the popup numbers chips', () => {
		const indices = citationIndices(groundedInput.summary, citations);
		const lines = formatMarkdownExport(groundedInput).split('\n');

		expect([...indices.values()]).toEqual([1, 2]);
		for (const citation of citations) {
			const index = indices.get(citation.ref);
			if (index === undefined) continue;
			const footnote = lines.find((l) => l.startsWith(`[^${index}]:`));
			expect(footnote).toContain(citation.quote.replace(/\s+/g, ' '));
		}
	});

	it('never leaves a raw ref token in the exported markdown', () => {
		const result = formatMarkdownExport(groundedInput);
		expect(result).not.toMatch(/\[(hn|rd|lo|pg):[A-Za-z0-9_-]{1,24}\]/);
	});

	it('drops phantom refs instead of emitting an unresolvable footnote', () => {
		const result = formatMarkdownExport({
			...groundedInput,
			summary: 'A claim [hn:999] with no source.',
		});
		expect(result).toContain('A claim with no source.');
		expect(result).not.toContain('## Sources');
	});

	it('emits a footnote with no link when a page comment has no permalink', () => {
		const result = formatMarkdownExport({ ...groundedInput, summary: 'A reader said [pg:2].' });
		expect(result).toContain('[^1]: Page comment: "Reader take with no link"');
		expect(result).not.toContain('undefined');
	});

	it('adds no Sources section when there are no citations', () => {
		expect(formatMarkdownExport(baseInput)).not.toContain('## Sources');
	});

	it('strips refs when the entry predates v0.5 and has no citations', () => {
		const result = formatMarkdownExport({ ...groundedInput, citations: undefined });
		expect(result).not.toMatch(/\[(hn|rd|lo|pg):[A-Za-z0-9_-]{1,24}\]/);
		expect(result).not.toContain('## Sources');
	});
});
