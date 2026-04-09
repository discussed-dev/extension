const INTERNAL_URL_RE =
	/^(about:|chrome:|chrome-extension:|edge:|moz-extension:|file:|data:|blob:)/i;

/** Host+path patterns for pages where query string IS the content — stripping it causes false matches. */
const SKIP_PATTERNS: Array<{ host: RegExp; pathPrefix?: string }> = [
	// Search engines
	{ host: /^google\.[a-z.]+$/, pathPrefix: '/search' },
	{ host: /^bing\.com$/, pathPrefix: '/search' },
	{ host: /^duckduckgo\.com$/ },
	{ host: /^search\.brave\.com$/ },
	{ host: /^baidu\.com$/, pathPrefix: '/s' },
	{ host: /^yandex\.[a-z.]+$/, pathPrefix: '/search' },
	{ host: /^ecosia\.org$/, pathPrefix: '/search' },
	{ host: /^search\.yahoo\.com$/ },
	{ host: /^kagi\.com$/, pathPrefix: '/search' },
	{ host: /^perplexity\.ai$/, pathPrefix: '/search' },
	{ host: /^startpage\.com$/, pathPrefix: '/search' },
	// Query-dependent services
	{ host: /^maps\.google\.[a-z.]+$/ },
	{ host: /^google\.[a-z.]+$/, pathPrefix: '/maps' },
	{ host: /^translate\.google\.[a-z.]+$/ },
	{ host: /^scholar\.google\.[a-z.]+$/ },
	{ host: /^github\.com$/, pathPrefix: '/search' },
	{ host: /^amazon\.[a-z.]+$/, pathPrefix: '/s' },
];

const PRIVATE_IP_RE =
	/^(127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|\[::1\])$/;

/** RFC 2606 reserved TLDs + local network TLDs */
const LOCAL_TLD_RE = /\.(local|localhost|test|example|invalid)$/;

/**
 * Returns true if the URL should be skipped for discussion discovery.
 * Covers browser-internal URLs, search/query-dependent pages, and local/private addresses.
 */
export function shouldSkipUrl(raw: string): boolean {
	if (INTERNAL_URL_RE.test(raw)) return true;

	try {
		const url = new URL(raw);
		const host = url.hostname.replace(/^www\./, '');

		// Localhost, private IPs, and local TLDs
		if (host === 'localhost' || PRIVATE_IP_RE.test(url.hostname) || LOCAL_TLD_RE.test(host))
			return true;

		// Search engines and query-dependent services
		if (
			SKIP_PATTERNS.some(
				(p) => p.host.test(host) && (!p.pathPrefix || url.pathname.startsWith(p.pathPrefix)),
			)
		)
			return true;
	} catch {
		return false;
	}

	return false;
}

export interface NormalizeUrlOptions {
	keepQueryString?: boolean;
}

/** Known tracking parameters that never identify content. Stripped regardless of keepQueryString. */
const TRACKING_PARAMS = new Set([
	'fbclid',
	'gclid',
	'gclsrc',
	'msclkid',
	'dclid',
	'twclid',
	'igshid',
	'mc_cid',
	'mc_eid',
	'_ga',
	'_gl',
]);

const TRACKING_PREFIX = 'utm_';

function stripTrackingParams(url: URL): void {
	const toDelete: string[] = [];
	for (const key of url.searchParams.keys()) {
		if (TRACKING_PARAMS.has(key) || key.startsWith(TRACKING_PREFIX)) {
			toDelete.push(key);
		}
	}
	for (const key of toDelete) {
		url.searchParams.delete(key);
	}
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

function extractYouTubeVideoId(url: URL): string | null {
	const host = url.hostname.replace(/^www\./, '');

	if (host === 'youtu.be') {
		const id = url.pathname.slice(1);
		return id || null;
	}

	if (YOUTUBE_HOSTS.has(url.hostname)) {
		if (url.pathname === '/watch') {
			return url.searchParams.get('v');
		}
		const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/);
		if (embedMatch) {
			return embedMatch[1];
		}
	}

	return null;
}

/**
 * Returns true if the URL's domain is filtered out by the user's domain filter settings.
 * In blacklist mode, matched domains are blocked. In whitelist mode, only matched domains are allowed.
 */
export function isBlacklisted(
	url: string,
	blacklist: string,
	mode: 'blacklist' | 'whitelist',
): boolean {
	if (!blacklist.trim()) return false;
	const domains = blacklist
		.split('\n')
		.map((d) => d.trim().toLowerCase())
		.filter(Boolean);
	if (domains.length === 0) return false;

	try {
		const hostname = new URL(url).hostname.toLowerCase();
		const matched = domains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
		return mode === 'blacklist' ? matched : !matched;
	} catch {
		return false;
	}
}

export function normalizeUrl(raw: string, options: NormalizeUrlOptions = {}): string {
	const url = new URL(raw);

	// Unwrap web.archive.org URLs to the original URL
	if (url.hostname === 'web.archive.org' && url.pathname.startsWith('/web/')) {
		const match = url.pathname.match(/^\/web\/[^/]+\/(.+)/);
		if (match) {
			try {
				return normalizeUrl(match[1], options);
			} catch {
				// If the inner URL is malformed, fall through to normal normalization
			}
		}
	}

	// Upgrade http to https
	url.protocol = 'https:';

	// Remove www prefix
	url.hostname = url.hostname.replace(/^www\./, '');

	// YouTube special handling: normalize all video URL variants to canonical form
	const videoId = extractYouTubeVideoId(url);
	if (videoId) {
		return `https://youtube.com/watch?v=${videoId}`;
	}

	// Normalize mobile Wikipedia: en.m.wikipedia.org → en.wikipedia.org
	url.hostname = url.hostname.replace(/\.m\.wikipedia\.org$/, '.wikipedia.org');

	// Strip fragment
	url.hash = '';

	// Always strip tracking parameters (utm_*, fbclid, gclid, etc.)
	stripTrackingParams(url);

	// Strip query string unless opted in
	if (!options.keepQueryString) {
		url.search = '';
	}

	// Strip index files
	url.pathname = url.pathname.replace(/\/(index\.(html?|php|asp|aspx|jsp))$/i, '/');

	// Remove trailing slash (but preserve root "/")
	if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
		url.pathname = url.pathname.slice(0, -1);
	}

	return url.toString();
}
