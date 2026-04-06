import { updateBloomFilter } from '@/lib/bloom';
import { discoverDiscussions } from '@/lib/discovery';
import { settings } from '@/lib/settings';
import { setToolbarBadge } from '@/lib/toolbar-action';
import type { Discussion, Platform } from '@/lib/types';

const PLATFORM_COLORS: Record<string, string> = {
	mixed: '#6366f1',
	hn: '#f97316',
	reddit: '#3b82f6',
	lobsters: '#ef4444',
};

function dominantPlatform(discussions: Discussion[]): string {
	const platforms = new Set(discussions.map((d) => d.platform));
	if (platforms.size > 1) return 'mixed';
	return discussions[0]?.platform ?? 'mixed';
}

async function updateBadge(tabId: number, discussions: Discussion[]): Promise<void> {
	const userSettings = await settings.getValue();
	let text = '';

	if (discussions.length > 0) {
		if (userSettings.badgeDisplay === 'comments') {
			const total = discussions.reduce((sum, d) => sum + d.commentCount, 0);
			text = total > 999 ? `${Math.floor(total / 1000)}k` : String(total);
		} else {
			text = String(discussions.length);
		}
	}

	await setToolbarBadge(browser, { tabId, text });
	if (discussions.length > 0) {
		const color = PLATFORM_COLORS[dominantPlatform(discussions)];
		await setToolbarBadge(browser, { tabId, color });
	}
}

function isBlacklisted(url: string, blacklist: string, mode: 'blacklist' | 'whitelist'): boolean {
	if (!blacklist.trim()) return false;
	const domains = blacklist
		.split('\n')
		.map((d) => d.trim().toLowerCase())
		.filter(Boolean);
	if (domains.length === 0) return false;

	try {
		const hostname = new URL(url).hostname.toLowerCase();
		const matched = domains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
		return mode === 'blacklist' ? matched : !matched;
	} catch {
		return false;
	}
}

async function onTabUpdated(tabId: number, url: string): Promise<void> {
	try {
		const userSettings = await settings.getValue();

		if (isBlacklisted(url, userSettings.blacklist, userSettings.blacklistMode)) {
			await setToolbarBadge(browser, { tabId, text: '' });
			return;
		}

		const discussions = await discoverDiscussions(url);
		await updateBadge(tabId, discussions);
	} catch (error) {
		console.error('[discussed] discovery failed:', error);
		await setToolbarBadge(browser, { tabId, text: '' });
	}
}

export default defineBackground(() => {
	updateBloomFilter();

	browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
		if (changeInfo.status !== 'complete' || !tab.url) return;
		const userSettings = await settings.getValue();
		if (!userSettings.searchOnTabUpdate) return;
		onTabUpdated(tabId, tab.url);
	});

	browser.tabs.onActivated.addListener(async ({ tabId }) => {
		const userSettings = await settings.getValue();
		if (!userSettings.searchOnTabActivate) return;
		const tab = await browser.tabs.get(tabId);
		if (tab.url) onTabUpdated(tabId, tab.url);
	});
});
