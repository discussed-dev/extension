import type { ExtractedComment } from '@/lib/page-content';
import type { CommentExtractor } from './types';

const MAX_COMMENTS = 50;

export const wsjExtractor: CommentExtractor = {
  hostnames: ['www.wsj.com', 'wsj.com'],
  extract(): ExtractedComment[] {
    const comments: ExtractedComment[] = [];
    const commentEls = document.querySelectorAll('[class*="comment-content"], [data-testid="comment-body"]');

    for (const el of commentEls) {
      if (comments.length >= MAX_COMMENTS) break;
      const text = el.textContent?.trim();
      if (!text || text.length < 10) continue;

      const parent = el.closest('[class*="comment"]');
      const authorEl = parent?.querySelector('[class*="author-name"], [class*="display-name"]');
      const likesEl = parent?.querySelector('[class*="like-count"], [class*="votes"]');

      comments.push({
        text,
        author: authorEl?.textContent?.trim(),
        score: likesEl ? Number.parseInt(likesEl.textContent ?? '0', 10) : undefined,
      });
    }

    return comments;
  },
};
