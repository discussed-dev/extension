import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['en', 'zh_CN', 'ja', 'es', 'ko', 'fr', 'de'] as const;

interface MessageEntry {
	message: string;
	placeholders?: Record<string, { content: string }>;
}

function loadLocale(locale: string): Record<string, MessageEntry> {
	const path = join(process.cwd(), 'public', '_locales', locale, 'messages.json');
	return JSON.parse(readFileSync(path, 'utf-8'));
}

const catalogs = Object.fromEntries(LOCALES.map((l) => [l, loadLocale(l)]));
const reference = catalogs.en;
const referenceKeys = Object.keys(reference).sort();

function placeholderNames(entry: MessageEntry): string[] {
	return Object.keys(entry.placeholders ?? {}).sort();
}

describe('locale catalogs', () => {
	for (const locale of LOCALES) {
		if (locale === 'en') continue;

		it(`${locale} has exactly the same keys as en`, () => {
			expect(Object.keys(catalogs[locale]).sort()).toEqual(referenceKeys);
		});

		it(`${locale} declares the same placeholders as en for every key`, () => {
			for (const key of referenceKeys) {
				expect(placeholderNames(catalogs[locale][key])).toEqual(placeholderNames(reference[key]));
			}
		});

		it(`${locale} has no empty messages`, () => {
			for (const key of referenceKeys) {
				expect(catalogs[locale][key].message.trim().length).toBeGreaterThan(0);
			}
		});
	}
});
