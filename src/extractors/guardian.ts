import type { ExtractedComment } from '@/lib/page-content';
import type { CommentExtractor } from './types';

const MAX_COMMENTS = 50;

export const guardianExtractor: CommentExtractor = {
	hostnames: ['www.theguardian.com', 'theguardian.com'],
	extract(): ExtractedComment[] {
		const comments: ExtractedComment[] = [];
		const commentEls = document.querySelectorAll('[data-component="comment"]');

		for (const el of commentEls) {
			if (comments.length >= MAX_COMMENTS) break;
			const bodyEl = el.querySelector('.d-comment__body');
			const authorEl = el.querySelector('.d-comment__author');
			const timestampEl = el.querySelector('.d-comment__timestamp');
			const recommendsEl = el.querySelector('.d-comment__recommend-count');

			const text = bodyEl?.textContent?.trim();
			if (!text) continue;

			comments.push({
				text,
				author: authorEl?.textContent?.trim(),
				timestamp: timestampEl?.getAttribute('datetime') ?? undefined,
				score: recommendsEl ? Number.parseInt(recommendsEl.textContent ?? '0', 10) : undefined,
			});
		}

		return comments;
	},
};
