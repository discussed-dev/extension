import { describe, expect, it } from 'vitest';
import { normalizeUrl } from './url';

describe('normalizeUrl', () => {
	describe('query string removal', () => {
		it('strips query string by default', () => {
			expect(normalizeUrl('https://example.com/page?foo=bar&baz=1')).toBe(
				'https://example.com/page',
			);
		});

		it('preserves query string when keepQueryString is true', () => {
			expect(normalizeUrl('https://example.com/page?foo=bar', { keepQueryString: true })).toBe(
				'https://example.com/page?foo=bar',
			);
		});
	});

	describe('fragment removal', () => {
		it('strips fragment', () => {
			expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
		});

		it('strips fragment even when keeping query string', () => {
			expect(normalizeUrl('https://example.com/page?q=1#section', { keepQueryString: true })).toBe(
				'https://example.com/page?q=1',
			);
		});
	});

	describe('trailing slash normalization', () => {
		it('removes trailing slash from path', () => {
			expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
		});

		it('preserves root path slash', () => {
			expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
		});
	});

	describe('www normalization', () => {
		it('removes www prefix', () => {
			expect(normalizeUrl('https://www.example.com/page')).toBe('https://example.com/page');
		});

		it('handles www-only domain', () => {
			expect(normalizeUrl('https://www.example.com/')).toBe('https://example.com/');
		});
	});

	describe('protocol normalization', () => {
		it('upgrades http to https', () => {
			expect(normalizeUrl('http://example.com/page')).toBe('https://example.com/page');
		});
	});

	describe('YouTube special handling', () => {
		it('normalizes youtube.com/watch?v=ID', () => {
			expect(normalizeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcB')).toBe(
				'https://youtube.com/watch?v=dQw4w9WgXcB',
			);
		});

		it('normalizes youtu.be/ID short URL', () => {
			expect(normalizeUrl('https://youtu.be/dQw4w9WgXcB')).toBe(
				'https://youtube.com/watch?v=dQw4w9WgXcB',
			);
		});

		it('normalizes youtube.com/embed/ID', () => {
			expect(normalizeUrl('https://www.youtube.com/embed/dQw4w9WgXcB')).toBe(
				'https://youtube.com/watch?v=dQw4w9WgXcB',
			);
		});

		it('strips extra query params from YouTube URLs', () => {
			expect(normalizeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcB&t=120&list=PLx')).toBe(
				'https://youtube.com/watch?v=dQw4w9WgXcB',
			);
		});

		it('returns non-video YouTube URLs as-is (normalized)', () => {
			expect(normalizeUrl('https://www.youtube.com/channel/UCxx')).toBe(
				'https://youtube.com/channel/UCxx',
			);
		});
	});

	describe('combined transformations', () => {
		it('applies all normalizations together', () => {
			expect(normalizeUrl('http://www.example.com/page/?utm_source=x#top')).toBe(
				'https://example.com/page',
			);
		});
	});

	describe('edge cases', () => {
		it('handles URL with no path', () => {
			expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
		});

		it('handles URL with port', () => {
			expect(normalizeUrl('https://example.com:8080/page')).toBe('https://example.com:8080/page');
		});

		it('lowercases hostname', () => {
			expect(normalizeUrl('https://EXAMPLE.COM/Page')).toBe('https://example.com/Page');
		});
	});
});
