import { browser } from 'wxt/browser';

/**
 * Since 2026-10-20 www.reddit.com blocks /search.json even for signed-in users; old.reddit.com
 * still answers with the session. It is an optional permission so existing installs are not
 * disabled by a permission escalation on update.
 */
export const REDDIT_SEARCH_ORIGIN = 'https://old.reddit.com/*';

export function hasRedditSearchAccess(): Promise<boolean> {
	return browser.permissions.contains({ origins: [REDDIT_SEARCH_ORIGIN] });
}

/** Must be called from a user gesture (e.g. a click in the popup). */
export function requestRedditSearchAccess(): Promise<boolean> {
	return browser.permissions.request({ origins: [REDDIT_SEARCH_ORIGIN] });
}
