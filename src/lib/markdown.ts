/**
 * Minimal inline-markdown renderer for LLM summary text.
 *
 * Extracted from Summary.svelte so the segment-boundary behaviour required by
 * Grounded Synthesis (v0.5) is unit-testable: once a summary is split into
 * text/citation segments, emphasis can no longer span a segment boundary.
 */

export function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export function renderMarkdown(text: string): string {
	return (
		escapeHtml(text)
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(
				/\[([^\]]+)\]\(([^)]+)\)/g,
				'<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-700 underline decoration-sky-300 underline-offset-4 hover:text-sky-900">$1</a>',
			)
			// `**foo [hn:1] bar**` splits into two text segments, so the pair above can
			// no longer match. Drop what is left rather than showing literal asterisks.
			.replaceAll('**', '')
	);
}
