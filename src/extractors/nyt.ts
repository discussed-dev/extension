import type { ExtractedComment } from '@/lib/page-content';
import type { CommentExtractor } from './types';

const MAX_COMMENTS = 50;

export const nytExtractor: CommentExtractor = {
	hostnames: ['www.nytimes.com', 'nytimes.com'],
	extract(): ExtractedComment[] {
		const comments: ExtractedComment[] = [];
		const commentEls = document.querySelectorAll(
			'.css-1eo1tzt, [class*="commentBody"], .comment-body',
		);

		for (const el of commentEls) {
			if (comments.length >= MAX_COMMENTS) break;
			const text = el.textContent?.trim();
			if (!text || text.length < 10) continue;

			const parent = el.closest('[class*="comment"]');
			const authorEl = parent?.querySelector('[class*="commenterName"], [class*="displayName"]');
			const recommendsEl = parent?.querySelector('[class*="recommend"], [class*="votes"]');

			comments.push({
				text,
				author: authorEl?.textContent?.trim(),
				score: recommendsEl ? Number.parseInt(recommendsEl.textContent ?? '0', 10) : undefined,
			});
		}

		return comments;
	},
};
