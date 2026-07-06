import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface LocaleMessage {
	message: string;
	placeholders?: Record<string, { content: string }>;
}

const LOCALES_DIR = join(__dirname, '../../public/_locales');

function loadLocale(locale: string): Record<string, LocaleMessage> {
	const raw = readFileSync(join(LOCALES_DIR, locale, 'messages.json'), 'utf-8');
	return JSON.parse(raw) as Record<string, LocaleMessage>;
}

const locales = readdirSync(LOCALES_DIR);
const en = loadLocale('en');

describe('locale files', () => {
	it('ships all 7 supported locales', () => {
		expect(locales.sort()).toEqual(['de', 'en', 'es', 'fr', 'ja', 'ko', 'zh_CN']);
	});

	it.each(locales)('%s has exactly the same keys as en', (locale) => {
		const messages = loadLocale(locale);
		const missing = Object.keys(en).filter((k) => !(k in messages));
		const extra = Object.keys(messages).filter((k) => !(k in en));
		expect(missing, `keys missing from ${locale}`).toEqual([]);
		expect(extra, `keys in ${locale} but not en`).toEqual([]);
	});

	it.each(locales)('%s messages use the same $PLACEHOLDER$s as en', (locale) => {
		const messages = loadLocale(locale);
		for (const [key, enEntry] of Object.entries(en)) {
			const entry = messages[key];
			if (!entry) continue; // covered by the key-set test
			const enPlaceholders = (enEntry.message.match(/\$[A-Z_]+\$/g) ?? []).sort();
			const placeholders = (entry.message.match(/\$[A-Z_]+\$/g) ?? []).sort();
			expect(placeholders, `placeholders for "${key}" in ${locale}`).toEqual(enPlaceholders);
		}
	});

	it.each(locales)('%s has non-empty messages', (locale) => {
		const messages = loadLocale(locale);
		for (const [key, entry] of Object.entries(messages)) {
			expect(entry.message.length, `empty message for "${key}" in ${locale}`).toBeGreaterThan(0);
		}
	});
});
