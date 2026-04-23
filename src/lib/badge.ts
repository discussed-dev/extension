import type { Settings } from './settings';
import { type ToolbarActionSource, setToolbarBadge } from './toolbar-action';
import type { Discussion } from './types';

const PLATFORM_COLORS: Record<string, string> = {
	mixed: '#6366f1',
	hn: '#f97316',
	reddit: '#D93900',
	lobsters: '#BE123C',
};

export function dominantPlatform(discussions: Discussion[]): string {
	const platforms = new Set(discussions.map((discussion) => discussion.platform));
	if (platforms.size > 1) return 'mixed';
	return discussions[0]?.platform ?? 'mixed';
}

export function badgeTextForDiscussions(
	discussions: Discussion[],
	badgeDisplay: Settings['badgeDisplay'],
): string {
	if (discussions.length === 0) return '';

	if (badgeDisplay === 'comments') {
		const total = discussions.reduce((sum, discussion) => sum + discussion.commentCount, 0);
		return total > 999 ? `${Math.floor(total / 1000)}k` : String(total);
	}

	return String(discussions.length);
}

export function badgeColorForDiscussions(discussions: Discussion[]): string | undefined {
	if (discussions.length === 0) return undefined;
	return PLATFORM_COLORS[dominantPlatform(discussions)];
}

export async function syncToolbarBadgeForDiscussions(
	api: ToolbarActionSource,
	tabId: number,
	discussions: Discussion[],
	badgeDisplay: Settings['badgeDisplay'],
): Promise<void> {
	await setToolbarBadge(api, {
		tabId,
		text: badgeTextForDiscussions(discussions, badgeDisplay),
	});

	const color = badgeColorForDiscussions(discussions);
	if (color) {
		await setToolbarBadge(api, { tabId, color });
	}
}
