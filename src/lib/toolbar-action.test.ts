import { describe, expect, it, vi } from 'vitest';
import { getToolbarActionApi, setToolbarBadge } from './toolbar-action';

describe('toolbar action selection', () => {
	it('prefers action when available', () => {
		const action = {
			setBadgeText: vi.fn(),
			setBadgeBackgroundColor: vi.fn(),
		};
		const browserAction = {
			setBadgeText: vi.fn(),
			setBadgeBackgroundColor: vi.fn(),
		};

		const result = getToolbarActionApi({ action, browserAction });

		expect(result).toBe(action);
	});

	it('falls back to browserAction when action is unavailable', () => {
		const browserAction = {
			setBadgeText: vi.fn(),
			setBadgeBackgroundColor: vi.fn(),
		};

		const result = getToolbarActionApi({ action: undefined, browserAction });

		expect(result).toBe(browserAction);
	});

	it('sets badge text and color on the resolved toolbar action', async () => {
		const browserAction = {
			setBadgeText: vi.fn().mockResolvedValue(undefined),
			setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
		};

		await setToolbarBadge(
			{ action: undefined, browserAction },
			{ tabId: 7, text: '4', color: '#f97316' },
		);

		expect(browserAction.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: '4' });
		expect(browserAction.setBadgeBackgroundColor).toHaveBeenCalledWith({
			tabId: 7,
			color: '#f97316',
		});
	});
});
