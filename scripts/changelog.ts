/**
 * Reads CHANGELOG.md. Each release is a `## X.Y.Z (YYYY-MM-DD)` heading followed by a one-line
 * summary and optional `### New` / `### Improved` / `### Fixed` lists. The release workflow uses
 * the section as the GitHub Release body; the website renders the whole file.
 */

export interface ChangelogEntry {
	version: string;
	date: string;
	body: string;
}

const HEADING = /^## (\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)$/;

export function parseChangelog(markdown: string): ChangelogEntry[] {
	const entries: ChangelogEntry[] = [];
	let current: { version: string; date: string; lines: string[] } | null = null;

	const close = () => {
		if (!current) return;
		const body = current.lines.join('\n').trim();
		if (!body) throw new Error(`Changelog entry ${current.version} has no text`);
		entries.push({ version: current.version, date: current.date, body });
	};

	for (const line of markdown.split('\n')) {
		if (line.startsWith('## ')) {
			const match = HEADING.exec(line.trimEnd());
			if (!match) throw new Error(`Changelog heading must be "## X.Y.Z (YYYY-MM-DD)": ${line}`);
			close();
			current = { version: match[1], date: match[2], lines: [] };
		} else if (current) {
			current.lines.push(line);
		}
	}
	close();
	return entries;
}

export function changelogSection(markdown: string, version: string): string {
	const entry = parseChangelog(markdown).find((e) => e.version === version);
	if (!entry) throw new Error(`CHANGELOG.md has no entry for ${version}`);
	return entry.body;
}
