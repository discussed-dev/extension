import { describe, expect, it } from 'vitest';
import {
	type CitableComment,
	type Citation,
	type PageCommentEntry,
	buildRef,
	collectCitations,
	segmentSummary,
	stripRefs,
	usedCitations,
} from './grounding';
import { renderMarkdown } from './markdown';

/** The grammar from the v0.5 PRD. Tests assert display text never contains a match. */
const REF_GRAMMAR = /\[(hn|rd|lo|pg):([A-Za-z0-9_-]{1,24})\]/;

function makeCitation(overrides: Partial<Citation> = {}): Citation {
	return {
		ref: 'hn:1',
		platform: 'hn',
		author: 'alice',
		score: 42,
		quote: 'Nice article',
		permalink: 'https://news.ycombinator.com/item?id=1',
		...overrides,
	};
}

function textOf(segments: ReturnType<typeof segmentSummary>): string {
	return segments.map((s) => (s.kind === 'text' ? s.text : '')).join('');
}

describe('buildRef', () => {
	it('maps each platform to its short prefix', () => {
		expect(buildRef('hn', '44239571')).toBe('hn:44239571');
		expect(buildRef('reddit', 'm3n8q')).toBe('rd:m3n8q');
		expect(buildRef('lobsters', '1nooby')).toBe('lo:1nooby');
		expect(buildRef('page', '3')).toBe('pg:3');
	});

	it('produces refs that match the ref grammar', () => {
		expect(`[${buildRef('reddit', 'm3n8q')}]`).toMatch(REF_GRAMMAR);
	});
});

describe('collectCitations', () => {
	const comment: CitableComment = {
		ref: 'lo:1nooby',
		platform: 'lobsters',
		author: 'mxey',
		text: 'The reason Linux contains all the drivers is...',
		score: 15,
		permalink: 'https://lobste.rs/c/1nooby',
	};

	it('turns sampled comments into citations', () => {
		const [citation] = collectCitations([comment], []);
		expect(citation).toEqual({
			ref: 'lo:1nooby',
			platform: 'lobsters',
			author: 'mxey',
			score: 15,
			quote: 'The reason Linux contains all the drivers is...',
			permalink: 'https://lobste.rs/c/1nooby',
		});
	});

	it('indexes page comments by their original position and gives them no permalink', () => {
		const pageComments: PageCommentEntry[] = [
			{ index: 0, comment: { text: 'first', author: 'bob' } },
			{ index: 4, comment: { text: 'fifth' } },
		];
		const citations = collectCitations([], pageComments);
		expect(citations.map((c) => c.ref)).toEqual(['pg:0', 'pg:4']);
		expect(citations[0].permalink).toBeUndefined();
		expect(citations[1].author).toBeUndefined();
	});

	it('drops duplicate refs', () => {
		expect(collectCitations([comment, { ...comment }], [])).toHaveLength(1);
	});
});

describe('segmentSummary', () => {
	// Matrix 1
	it('resolves a valid ref to a cite segment carrying its citation', () => {
		const citation = makeCitation();
		const segments = segmentSummary('Commenters agree [hn:1].', [citation]);
		const cite = segments.find((s) => s.kind === 'cite');
		expect(cite).toEqual({ kind: 'cite', citation, index: 1 });
		// The space before a marker is consumed so the chip sits against the word,
		// matching the footnote form the PRD's export example uses (`flawed[^1],`).
		expect(textOf(segments)).toBe('Commenters agree.');
	});

	// Matrix 2
	it('removes a phantom ref and leaves no raw token behind', () => {
		const segments = segmentSummary('Commenters agree [hn:999] on this.', [makeCitation()]);
		expect(segments.every((s) => s.kind === 'text')).toBe(true);
		for (const seg of segments) {
			if (seg.kind === 'text') expect(seg.text).not.toMatch(REF_GRAMMAR);
		}
		expect(textOf(segments)).toBe('Commenters agree on this.');
	});

	// Matrix 3
	it('reuses the display index when a ref repeats', () => {
		const a = makeCitation({ ref: 'hn:1' });
		const b = makeCitation({ ref: 'rd:x', platform: 'reddit' });
		const segments = segmentSummary('One [hn:1] two [rd:x] three [hn:1].', [a, b]);
		const indices = segments.filter((s) => s.kind === 'cite').map((s) => s.index);
		expect(indices).toEqual([1, 2, 1]);
	});

	it('numbers citations by first appearance, not by input order', () => {
		const a = makeCitation({ ref: 'hn:1' });
		const b = makeCitation({ ref: 'rd:x', platform: 'reddit' });
		const segments = segmentSummary('First [rd:x] then [hn:1].', [a, b]);
		const cites = segments.filter((s) => s.kind === 'cite');
		expect(cites.map((s) => [s.citation.ref, s.index])).toEqual([
			['rd:x', 1],
			['hn:1', 2],
		]);
	});

	// Matrix 4
	it('leaves an adjacent markdown link intact', () => {
		const segments = segmentSummary('See [HN](https://example.com) [hn:1].', [makeCitation()]);
		expect(textOf(segments)).toContain('[HN](https://example.com)');
		expect(segments.filter((s) => s.kind === 'cite')).toHaveLength(1);
	});

	// Matrix 5
	it('degrades without a raw token when a ref is nested in link text', () => {
		const segments = segmentSummary('[see [hn:1] here](https://example.com)', [makeCitation()]);
		for (const seg of segments) {
			if (seg.kind === 'text') expect(seg.text).not.toMatch(REF_GRAMMAR);
		}
		expect(segments.filter((s) => s.kind === 'cite')).toHaveLength(1);
	});

	// Matrix 7
	it('collapses whitespace and punctuation around a stripped ref', () => {
		expect(textOf(segmentSummary('word [hn:999].', []))).toBe('word.');
		expect(textOf(segmentSummary('foo [hn:999] bar', []))).toBe('foo bar');
		expect(textOf(segmentSummary('[hn:999] leading', []))).toBe('leading');
	});

	// Matrix 8
	it('strips every ref when the citation list is empty', () => {
		const segments = segmentSummary('A [hn:1] B [rd:x] C [pg:0].', []);
		expect(segments.filter((s) => s.kind === 'cite')).toHaveLength(0);
		expect(textOf(segments)).toBe('A B C.');
	});

	it('strips every ref when citations are undefined (pre-v0.5 cache entry)', () => {
		const segments = segmentSummary('A [hn:1] B.', undefined);
		expect(textOf(segments)).toBe('A B.');
	});

	// Matrix 9
	it('leaves malformed near-misses as literal text', () => {
		const input = 'Empty [hn:] and unknown [unknown:1] and spaced [hn: 1] stay.';
		expect(textOf(segmentSummary(input, [makeCitation()]))).toBe(input);
	});

	it('emits no empty text segments', () => {
		const segments = segmentSummary('[hn:1][hn:1]', [makeCitation()]);
		expect(segments.every((s) => s.kind === 'cite' || s.text.length > 0)).toBe(true);
	});

	it('returns plain text unchanged when there are no refs', () => {
		expect(segmentSummary('Just prose.', [makeCitation()])).toEqual([
			{ kind: 'text', text: 'Just prose.' },
		]);
	});
});

describe('usedCitations', () => {
	const a = makeCitation({ ref: 'hn:1' });
	const b = makeCitation({ ref: 'rd:x', platform: 'reddit' });
	const c = makeCitation({ ref: 'lo:y', platform: 'lobsters' });

	it('keeps only the citations the summary references, in display order', () => {
		expect(usedCitations('First [lo:y] then [hn:1].', [a, b, c])).toEqual([c, a]);
	});

	it('deduplicates a repeated reference', () => {
		expect(usedCitations('[hn:1] and again [hn:1]', [a, b])).toEqual([a]);
	});

	it('returns nothing when the model emitted no markers', () => {
		expect(usedCitations('Plain prose with no markers.', [a, b, c])).toEqual([]);
	});

	it('drops phantom references rather than inventing citations', () => {
		expect(usedCitations('Claim [hn:999].', [a])).toEqual([]);
	});
});

describe('stripRefs', () => {
	it('removes every well-formed ref and cleans up around it', () => {
		expect(stripRefs('Most agree [hn:1], one dissents [rd:x].')).toBe('Most agree, one dissents.');
	});

	it('never leaves a ref-shaped substring behind', () => {
		expect(stripRefs('a [hn:1] b [rd:x] c [lo:y] d [pg:0] e')).not.toMatch(REF_GRAMMAR);
	});

	it('leaves malformed near-misses alone', () => {
		expect(stripRefs('keep [hn:] and [unknown:1]')).toBe('keep [hn:] and [unknown:1]');
	});
});

// Matrix 6 — emphasis spanning a ref must not leave literal asterisks once the
// summary is split into segments and each text segment rendered separately.
describe('renderMarkdown across segments', () => {
	it('drops unpaired asterisks left by a segment boundary', () => {
		const segments = segmentSummary('**foo [hn:1] bar**', [makeCitation()]);
		const html = segments.map((s) => (s.kind === 'text' ? renderMarkdown(s.text) : '')).join('');
		expect(html).not.toContain('*');
		expect(html).toContain('foo');
		expect(html).toContain('bar');
	});

	it('still renders paired emphasis and links inside one segment', () => {
		expect(renderMarkdown('**bold** and [HN](https://example.com)')).toBe(
			'<strong>bold</strong> and <a href="https://example.com" target="_blank" rel="noopener noreferrer" class="text-sky-700 underline decoration-sky-300 underline-offset-4 hover:text-sky-900">HN</a>',
		);
	});

	it('escapes html before rendering', () => {
		expect(renderMarkdown('<script>alert(1)</script>')).toBe(
			'&lt;script&gt;alert(1)&lt;/script&gt;',
		);
	});
});
