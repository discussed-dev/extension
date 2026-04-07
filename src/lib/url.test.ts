import { describe, expect, it } from 'vitest';
import { isBlacklisted, normalizeUrl, shouldSkipUrl } from './url';

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

	describe('index file stripping', () => {
		it('strips index.html', () => {
			expect(normalizeUrl('https://example.com/page/index.html')).toBe('https://example.com/page');
		});

		it('strips index.htm', () => {
			expect(normalizeUrl('https://example.com/page/index.htm')).toBe('https://example.com/page');
		});

		it('strips index.php', () => {
			expect(normalizeUrl('https://example.com/page/index.php')).toBe('https://example.com/page');
		});

		it('does not strip non-index files', () => {
			expect(normalizeUrl('https://example.com/page/about.html')).toBe(
				'https://example.com/page/about.html',
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

describe('isBlacklisted', () => {
	describe('blacklist mode', () => {
		it('blocks exact domain match', () => {
			expect(isBlacklisted('https://douban.com/page', 'douban.com', 'blacklist')).toBe(true);
		});

		it('blocks subdomain match', () => {
			expect(isBlacklisted('https://book.douban.com/page', 'douban.com', 'blacklist')).toBe(true);
		});

		it('does not block unrelated domain', () => {
			expect(isBlacklisted('https://example.com/page', 'douban.com', 'blacklist')).toBe(false);
		});

		it('is case-insensitive', () => {
			expect(isBlacklisted('https://Douban.COM/page', 'douban.com', 'blacklist')).toBe(true);
		});

		it('handles multiple domains', () => {
			const list = 'douban.com\nfacebook.com\ntwitter.com';
			expect(isBlacklisted('https://facebook.com', list, 'blacklist')).toBe(true);
			expect(isBlacklisted('https://github.com', list, 'blacklist')).toBe(false);
		});

		it('returns false for empty blacklist', () => {
			expect(isBlacklisted('https://example.com', '', 'blacklist')).toBe(false);
		});

		it('ignores blank lines', () => {
			expect(isBlacklisted('https://example.com', '\n\n\n', 'blacklist')).toBe(false);
		});
	});

	describe('whitelist mode', () => {
		it('allows exact domain match', () => {
			expect(isBlacklisted('https://github.com/repo', 'github.com', 'whitelist')).toBe(false);
		});

		it('blocks non-listed domain', () => {
			expect(isBlacklisted('https://example.com', 'github.com', 'whitelist')).toBe(true);
		});

		it('returns false (allows all) when whitelist is empty', () => {
			expect(isBlacklisted('https://example.com', '', 'whitelist')).toBe(false);
		});
	});

	it('returns false for invalid URL', () => {
		expect(isBlacklisted('not-a-url', 'example.com', 'blacklist')).toBe(false);
	});
});

describe('shouldSkipUrl', () => {
	describe('internal URLs', () => {
		const internalUrls = [
			'about:blank',
			'chrome://settings',
			'chrome-extension://abc/popup.html',
			'edge://newtab',
			'moz-extension://abc/popup.html',
			'file:///home/user/doc.html',
			'data:text/html,<h1>hi</h1>',
			'blob:https://example.com/abc',
		];

		for (const url of internalUrls) {
			it(`skips ${url.split(':')[0]}:`, () => {
				expect(shouldSkipUrl(url)).toBe(true);
			});
		}
	});

	describe('search engines', () => {
		const searchEngineUrls = [
			'https://www.google.com/search?q=test',
			'https://google.co.uk/search?q=test',
			'https://www.bing.com/search?q=test',
			'https://duckduckgo.com/?q=test',
			'https://search.brave.com/search?q=test',
			'https://www.baidu.com/s?wd=test',
			'https://yandex.com/search/?text=test',
			'https://www.ecosia.org/search?q=test',
			'https://search.yahoo.com/search?p=test',
			'https://kagi.com/search?q=test',
			'https://www.perplexity.ai/search?q=test',
			'https://www.startpage.com/search?q=test',
		];

		for (const url of searchEngineUrls) {
			it(`skips ${new URL(url).hostname}`, () => {
				expect(shouldSkipUrl(url)).toBe(true);
			});
		}

		it('does not skip non-search pages on google.com', () => {
			expect(shouldSkipUrl('https://developers.google.com/some-doc')).toBe(false);
		});
	});

	describe('query-dependent services (Google Maps, Translate, etc.)', () => {
		const queryDependentUrls = [
			'https://maps.google.com/maps?q=coffee+shops',
			'https://www.google.com/maps/search/coffee+shops',
			'https://translate.google.com/?sl=en&tl=zh&text=hello',
			'https://scholar.google.com/scholar?q=machine+learning',
			'https://github.com/search?q=react',
			'https://www.amazon.com/s?k=keyboard',
			'https://amazon.co.uk/s?k=keyboard',
		];

		for (const url of queryDependentUrls) {
			it(`skips ${new URL(url).hostname}${new URL(url).pathname}`, () => {
				expect(shouldSkipUrl(url)).toBe(true);
			});
		}

		it('does not skip normal GitHub pages', () => {
			expect(shouldSkipUrl('https://github.com/user/repo')).toBe(false);
		});

		it('does not skip normal Amazon product pages', () => {
			expect(shouldSkipUrl('https://www.amazon.com/dp/B08N5WRWNW')).toBe(false);
		});

		it('does not skip Google Docs (shareable content)', () => {
			expect(shouldSkipUrl('https://docs.google.com/document/d/1abc/edit')).toBe(false);
		});
	});

	describe('localhost and private networks', () => {
		const localUrls = [
			'http://localhost:3000',
			'http://localhost',
			'http://127.0.0.1:8080/api',
			'http://192.168.1.1',
			'http://192.168.0.100:3000/dashboard',
			'http://10.0.0.1/admin',
			'http://172.16.0.1',
			'http://172.31.255.255',
			'http://[::1]:3000',
			'http://myapp.local',
			'http://myapp.localhost:5173',
			'http://myapp.test',
			'http://example.invalid',
		];

		for (const url of localUrls) {
			it(`skips ${new URL(url).hostname}`, () => {
				expect(shouldSkipUrl(url)).toBe(true);
			});
		}

		it('does not skip public IPs', () => {
			expect(shouldSkipUrl('https://8.8.8.8')).toBe(false);
		});
	});

	describe('normal URLs', () => {
		const normalUrls = [
			'https://example.com/article',
			'https://news.ycombinator.com/item?id=123',
			'https://github.com/user/repo',
			'https://developer.mozilla.org/en-US/docs/Web',
		];

		for (const url of normalUrls) {
			it(`does not skip ${new URL(url).hostname}`, () => {
				expect(shouldSkipUrl(url)).toBe(false);
			});
		}
	});
});
