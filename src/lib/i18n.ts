import type enMessages from '../../public/_locales/en/messages.json';

/** Every message key defined in the source (en) catalog. */
export type MessageKey = keyof typeof enMessages;

/**
 * Get a localized message from _locales.
 * Falls back to the key itself if not found. `key` is typed to the catalog so
 * a missing/misspelled key is a compile error rather than a silent fallback.
 */
export function t(key: MessageKey, ...substitutions: string[]): string {
	try {
		const message = browser.i18n.getMessage(key, substitutions);
		return message || key;
	} catch {
		return key;
	}
}
