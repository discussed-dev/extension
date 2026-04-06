import type { Comment } from './comments';

const MAX_COMMENT_LENGTH = 500;

export interface PreprocessOptions {
	maxComments: number;
}

export function preprocessComments(
	comments: Comment[],
	options: PreprocessOptions = { maxComments: 40 },
): Comment[] {
	return (
		comments
			// Remove very short or empty comments
			.filter((c) => c.text.length > 10)
			// Sort by score descending
			.sort((a, b) => b.score - a.score)
			// Take top N
			.slice(0, options.maxComments)
			// Truncate long comments
			.map((c) => ({
				...c,
				text:
					c.text.length > MAX_COMMENT_LENGTH ? `${c.text.slice(0, MAX_COMMENT_LENGTH)}...` : c.text,
			}))
	);
}

export function formatCommentsForPrompt(comments: Comment[]): string {
	return comments
		.map((c) => {
			const prefix = c.platform === 'reddit' ? `[Reddit, ${c.score} pts]` : `[HN, ${c.score} pts]`;
			return `${prefix} ${c.author}: ${c.text}`;
		})
		.join('\n\n');
}
