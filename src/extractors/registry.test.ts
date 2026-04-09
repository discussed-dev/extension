import { describe, expect, it } from 'vitest';
import { guardianExtractor } from './guardian';
import { nytExtractor } from './nyt';
import { substackExtractor } from './substack';
import { wsjExtractor } from './wsj';

describe('extractor shape', () => {
	it('guardian has correct hostnames', () => {
		expect(guardianExtractor.hostnames).toContain('www.theguardian.com');
		expect(typeof guardianExtractor.extract).toBe('function');
	});

	it('nyt has correct hostnames', () => {
		expect(nytExtractor.hostnames).toContain('www.nytimes.com');
		expect(typeof nytExtractor.extract).toBe('function');
	});

	it('wsj has correct hostnames', () => {
		expect(wsjExtractor.hostnames).toContain('www.wsj.com');
		expect(typeof wsjExtractor.extract).toBe('function');
	});

	it('substack uses pattern matching (empty hostnames)', () => {
		expect(substackExtractor.hostnames).toEqual([]);
		expect(typeof substackExtractor.extract).toBe('function');
	});
});
