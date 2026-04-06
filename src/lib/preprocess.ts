import type { Comment } from './comments';
import type { Platform } from './types';

const MAX_COMMENT_LENGTH = 300;
const PLATFORMS: Platform[] = ['hn', 'reddit', 'lobsters'];

export interface PreprocessOptions {
	maxComments: number;
}

/**
 * Sample comments with platform balance and score diversity.
 *
 * Instead of global top-N by score (which biases toward one platform),
 * allocate budget per platform proportional to comment count, then
 * within each platform take a mix of high-score and mid-score comments
 * to preserve disagreements.
 */
export function preprocessComments(
	comments: Comment[],
	options: PreprocessOptions = { maxComments: 40 },
): Comment[] {
	// Filter out very short or empty comments
	const viable = comments.filter((c) => c.text.length > 10);
	if (viable.length === 0) return [];

	// Group by platform
	const byPlatform = new Map<string, Comment[]>();
	for (const c of viable) {
		const group = byPlatform.get(c.platform) ?? [];
		group.push(c);
		byPlatform.set(c.platform, group);
	}

	// Allocate budget proportionally, minimum 3 per platform if available
	const totalBudget = Math.min(options.maxComments, viable.length);
	const activePlatforms = PLATFORMS.filter((p) => (byPlatform.get(p)?.length ?? 0) > 0);
	const minPerPlatform = Math.min(3, Math.floor(totalBudget / activePlatforms.length));

	const allocations = new Map<string, number>();
	let remaining = totalBudget;

	// First pass: guarantee minimum
	for (const p of activePlatforms) {
		const count = byPlatform.get(p)?.length ?? 0;
		const alloc = Math.min(minPerPlatform, count);
		allocations.set(p, alloc);
		remaining -= alloc;
	}

	// Second pass: distribute remainder proportionally
	if (remaining > 0) {
		const totalViable = activePlatforms.reduce((s, p) => s + (byPlatform.get(p)?.length ?? 0), 0);
		for (const p of activePlatforms) {
			const count = byPlatform.get(p)?.length ?? 0;
			const extra = Math.min(
				Math.floor((count / totalViable) * remaining),
				count - (allocations.get(p) ?? 0),
			);
			allocations.set(p, (allocations.get(p) ?? 0) + extra);
		}
	}

	// Sample from each platform: 70% top-score, 30% mid-score
	const sampled: Comment[] = [];
	for (const p of activePlatforms) {
		const group = byPlatform.get(p) ?? [];
		const budget = allocations.get(p) ?? 0;
		if (budget === 0) continue;

		const sorted = [...group].sort((a, b) => b.score - a.score);
		const topCount = Math.ceil(budget * 0.7);
		const midStart = topCount;
		const midEnd = Math.min(sorted.length, topCount + Math.floor(budget * 0.3));

		sampled.push(...sorted.slice(0, topCount));
		if (midStart < sorted.length) {
			sampled.push(...sorted.slice(midStart, midEnd));
		}
	}

	// Truncate long comments
	return sampled.map((c) => ({
		...c,
		text: c.text.length > MAX_COMMENT_LENGTH ? `${c.text.slice(0, MAX_COMMENT_LENGTH)}...` : c.text,
	}));
}

export function formatCommentsForPrompt(comments: Comment[]): string {
	// Group by platform for structured input
	const byPlatform = new Map<string, Comment[]>();
	for (const c of comments) {
		const group = byPlatform.get(c.platform) ?? [];
		group.push(c);
		byPlatform.set(c.platform, group);
	}

	const PLATFORM_LABELS: Record<string, string> = {
		hn: 'Hacker News',
		reddit: 'Reddit',
		lobsters: 'Lobsters',
	};

	const sections: string[] = [];
	for (const [platform, group] of byPlatform) {
		const label = PLATFORM_LABELS[platform] ?? platform;
		const lines = group.map((c) => `[${c.score} pts] ${c.author}: ${c.text}`).join('\n\n');
		sections.push(`--- ${label} (${group.length} comments) ---\n\n${lines}`);
	}

	return sections.join('\n\n');
}
