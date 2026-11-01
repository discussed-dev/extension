import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { changelogSection, parseChangelog } from './changelog';

const SAMPLE = `# Changelog

Intro text.

## 1.2.0 (2026-11-02)

Second release.

### New

- A thing.

## 1.1.0 (2026-10-01)

First release.
`;

describe('parseChangelog', () => {
	it('returns entries newest first with version, date and body', () => {
		expect(parseChangelog(SAMPLE)).toEqual([
			{ version: '1.2.0', date: '2026-11-02', body: 'Second release.\n\n### New\n\n- A thing.' },
			{ version: '1.1.0', date: '2026-10-01', body: 'First release.' },
		]);
	});

	it('rejects a release heading that does not follow the version and date format', () => {
		expect(() => parseChangelog('## 1.2 - Nov 2\n\nText.')).toThrow(/1\.2 - Nov 2/);
	});

	it('rejects an entry with no text', () => {
		expect(() => parseChangelog('## 1.2.0 (2026-11-02)\n\n## 1.1.0 (2026-10-01)\n\nText.')).toThrow(
			/1\.2\.0/,
		);
	});
});

describe('changelogSection', () => {
	it('returns the body of the requested version', () => {
		expect(changelogSection(SAMPLE, '1.1.0')).toBe('First release.');
	});

	it('throws when the version has no entry', () => {
		expect(() => changelogSection(SAMPLE, '9.9.9')).toThrow(/9\.9\.9/);
	});
});

describe('CHANGELOG.md', () => {
	const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
	const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

	it('has an entry for the version in package.json', () => {
		expect(parseChangelog(changelog)[0].version).toBe(version);
	});

	it('lists versions newest first without duplicates', () => {
		const versions = parseChangelog(changelog).map((e) => e.version);
		const sorted = [...versions].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
		expect(versions).toEqual(sorted);
		expect(new Set(versions).size).toBe(versions.length);
	});
});
