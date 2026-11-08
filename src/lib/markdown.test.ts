import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown links', () => {
	it('links http and https URLs', () => {
		expect(renderMarkdown('[HN](https://news.ycombinator.com/item?id=1)')).toContain(
			'<a href="https://news.ycombinator.com/item?id=1"',
		);
		expect(renderMarkdown('[old](http://example.com)')).toContain('<a href="http://example.com"');
	});

	it.each([
		'[click](javascript:alert(1))',
		'[click](JavaScript:alert(1))',
		'[click](data:text/html,hi)',
		'[click](//evil.example)',
		'[click](/relative)',
	])('renders %s as plain text with no link', (input) => {
		const html = renderMarkdown(input);
		expect(html).not.toContain('<a');
		expect(html).toContain('click');
	});
});
