import { updateBloomFilter } from '@/lib/bloom';
import { discoverDiscussions } from '@/lib/discovery';
import type { Discussion } from '@/lib/types';

async function updateBadge(tabId: number, discussions: Discussion[]): Promise<void> {
	const count = discussions.length;
	await browser.action.setBadgeText({
		tabId,
		text: count > 0 ? String(count) : '',
	});
	if (count > 0) {
		await browser.action.setBadgeBackgroundColor({ tabId, color: '#6366f1' });
	}
}

async function onTabUpdated(tabId: number, url: string): Promise<void> {
	try {
		const discussions = await discoverDiscussions(url);
		await updateBadge(tabId, discussions);
	} catch (error) {
		console.error('[discussed] discovery failed:', error);
		await browser.action.setBadgeText({ tabId, text: '' });
	}
}

export default defineBackground(() => {
	// Update Bloom filter on startup (non-blocking)
	updateBloomFilter();

	// Run discovery when a tab finishes loading
	browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		if (changeInfo.status === 'complete' && tab.url) {
			onTabUpdated(tabId, tab.url);
		}
	});

	// Run discovery when switching to an existing tab
	browser.tabs.onActivated.addListener(async ({ tabId }) => {
		const tab = await browser.tabs.get(tabId);
		if (tab.url) {
			onTabUpdated(tabId, tab.url);
		}
	});
});
