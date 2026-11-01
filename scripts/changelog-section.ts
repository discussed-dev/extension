// Prints the CHANGELOG.md section for a version: bun scripts/changelog-section.ts 0.5.4
import { readFileSync } from 'node:fs';
import { changelogSection } from './changelog';

const version = process.argv[2];
if (!version) {
	console.error('usage: bun scripts/changelog-section.ts <version>');
	process.exit(2);
}
console.log(changelogSection(readFileSync('CHANGELOG.md', 'utf8'), version));
