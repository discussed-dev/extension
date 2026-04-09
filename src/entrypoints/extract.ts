import { Readability } from '@mozilla/readability';
import type { PageContent } from '@/lib/page-content';

/** Maximum characters of article text to return (~2000 tokens). */
const MAX_ARTICLE_CHARS = 8000;

function extractArticle(): string | undefined {
  try {
    const clone = document.cloneNode(true) as Document;
    const reader = new Readability(clone);
    const article = reader.parse();
    if (!article?.textContent) return undefined;
    const text = article.textContent.trim();
    return text.length > 0 ? text.slice(0, MAX_ARTICLE_CHARS) : undefined;
  } catch {
    return undefined;
  }
}

export default defineUnlistedScript(() => {
  const articleText = extractArticle();

  const content: PageContent = {
    articleText,
    // Comments will be added in Task 8 (extractors)
  };

  // Return value is picked up by browser.scripting.executeScript
  return content;
});
