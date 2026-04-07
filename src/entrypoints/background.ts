import { syncToolbarBadgeForDiscussions } from '@/lib/badge';
import { updateBloomFilter } from '@/lib/bloom';
import { discoverDiscussions } from '@/lib/discovery';
import { settings } from '@/lib/settings';
import { setToolbarBadge } from '@/lib/toolbar-action';
import type { Discussion } from '@/lib/types';
import { shouldSkipUrl } from '@/lib/url';

async function updateBadge(tabId: number, discussions: Discussion[]): Promise<void> {
	const userSettings = await settings.getValue();
	await syncToolbarBadgeForDiscussions(browser, tabId, discussions, userSettings.badgeDisplay);
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
		if (shouldSkipUrl(url)) {
			await setToolbarBadge(browser, { tabId, text: '' });
			return;
		}

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
