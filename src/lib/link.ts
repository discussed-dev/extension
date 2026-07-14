export interface ActivationModifiers {
	button: number;
	ctrlKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
}

/**
 * Decide whether a discussion-row click should be redirected to the user's
 * active browser tab. In an extension popup a plain `target="_self"` link
 * navigates the popup's own document instead of the page behind it, so the
 * "open in current tab" preference must be handled explicitly. Modified and
 * non-primary clicks fall through to the anchor's default (new tab).
 */
export function shouldNavigateCurrentTab(openInNewTab: boolean, e: ActivationModifiers): boolean {
	if (openInNewTab) return false;
	if (e.button !== 0) return false;
	if (e.ctrlKey || e.metaKey || e.shiftKey) return false;
	return true;
}
