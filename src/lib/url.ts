export interface NormalizeUrlOptions {
	keepQueryString?: boolean;
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

export function normalizeUrl(raw: string, options: NormalizeUrlOptions = {}): string {
	const url = new URL(raw);

	// Upgrade http to https
	url.protocol = 'https:';

	// Remove www prefix
	url.hostname = url.hostname.replace(/^www\./, '');

	// YouTube special handling: normalize all video URL variants to canonical form
	const videoId = extractYouTubeVideoId(url);
	if (videoId) {
		return `https://youtube.com/watch?v=${videoId}`;
	}

	// Strip fragment
	url.hash = '';

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
