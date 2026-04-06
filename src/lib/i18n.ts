/**
 * Get a localized message from _locales.
 * Falls back to the key itself if not found.
 */
export function t(key: string, ...substitutions: string[]): string {
	try {
		const message = browser.i18n.getMessage(key, substitutions);
		return message || key;
	} catch {
		return key;
	}
}
