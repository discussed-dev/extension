import { normalizeUrl } from './url';

export interface RedditSearchOptions {
	exactMatch?: boolean;
}

function stripWww(hostname: string): string {
	return hostname.replace(/^www\./, '');
}

function hostnamesMatch(a: string, b: string): boolean {
	const ha = stripWww(a);
	const hb = stripWww(b);
	return ha === hb || ha.endsWith(`.${hb}`) || hb.endsWith(`.${ha}`);
}

/** Whether a submitted post URL counts as a discussion of the target page. */
export function postMatchesTarget(
	postUrl: string | null | undefined,
	targetUrl: string,
	options: RedditSearchOptions,
): boolean {
	if (postUrl == null) return false;
	try {
		if (options.exactMatch) return normalizeUrl(postUrl) === normalizeUrl(targetUrl);
		return hostnamesMatch(new URL(postUrl).hostname, new URL(targetUrl).hostname);
	} catch {
		return false;
	}
}
