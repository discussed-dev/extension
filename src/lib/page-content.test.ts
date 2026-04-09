import { describe, expect, it } from 'vitest';
import type { PageContent } from './page-content';
import { buildArticleContext } from './page-content';

describe('buildArticleContext', () => {
  it('returns undefined for empty article text', () => {
    const content: PageContent = {};
    expect(buildArticleContext(content, 2000)).toBeUndefined();
  });

  it('returns truncated article text within token budget', () => {
    const content: PageContent = { articleText: 'a'.repeat(12000) }; // 3000 tokens
    const result = buildArticleContext(content, 2000);
    expect(result).toBeDefined();
    expect(result!.length).toBeLessThanOrEqual(8000); // 2000 tokens * 4 chars
  });

  it('returns article text as-is when within budget', () => {
    const text = 'This is a short article about testing.';
    const content: PageContent = { articleText: text };
    expect(buildArticleContext(content, 2000)).toBe(text);
  });
});
