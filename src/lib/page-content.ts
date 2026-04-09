import { truncateToTokenBudget } from './token-budget';

/** Comments extracted from the current page's native comment section. */
export interface ExtractedComment {
  author?: string;
  text: string;
  score?: number;
  timestamp?: string;
}

/** Data returned by the content script injection. */
export interface PageContent {
  articleText?: string;
  comments?: ExtractedComment[];
  commentSource?: string;
}

/**
 * Build article context string from page content, truncated to token budget.
 * Returns undefined if no article text available.
 */
export function buildArticleContext(
  content: PageContent,
  tokenBudget: number,
): string | undefined {
  if (!content.articleText) return undefined;
  return truncateToTokenBudget(content.articleText, tokenBudget);
}

/**
 * Inject a content script into the active tab and extract page content.
 * Returns PageContent or undefined if extraction fails/times out.
 *
 * This function runs in the popup context and uses browser.scripting.executeScript.
 */
export async function injectAndExtract(tabId: number): Promise<PageContent | undefined> {
  try {
    const results = await Promise.race([
      browser.scripting.executeScript({
        target: { tabId },
        files: ['/content-scripts/extract.js'],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Content script timeout')), 5000),
      ),
    ]);

    const result = results?.[0]?.result as PageContent | undefined;
    return result ?? undefined;
  } catch (e) {
    console.warn('[discussed] page extraction failed:', e);
    return undefined;
  }
}
