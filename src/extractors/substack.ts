import type { ExtractedComment } from '@/lib/page-content';
import type { CommentExtractor } from './types';

const MAX_COMMENTS = 50;

export const substackExtractor: CommentExtractor = {
  hostnames: [], // Uses pattern matching — see registry
  extract(): ExtractedComment[] {
    const comments: ExtractedComment[] = [];
    const commentEls = document.querySelectorAll('.comment-body');

    for (const el of commentEls) {
      if (comments.length >= MAX_COMMENTS) break;
      const text = el.textContent?.trim();
      if (!text || text.length < 10) continue;

      const parent = el.closest('.comment');
      const authorEl = parent?.querySelector('.comment-meta .profile-hover-card-target');
      const heartEl = parent?.querySelector('.like-button-count');

      comments.push({
        text,
        author: authorEl?.textContent?.trim(),
        score: heartEl ? Number.parseInt(heartEl.textContent ?? '0', 10) : undefined,
      });
    }

    return comments;
  },
};
