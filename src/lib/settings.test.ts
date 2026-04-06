import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { settings } from './settings';

describe('settings', () => {
	beforeEach(() => {
		fakeBrowser.reset();
	});

	it('returns defaults when no settings saved', async () => {
		const value = await settings.getValue();
		expect(value.enableHn).toBe(true);
		expect(value.enableReddit).toBe(true);
		expect(value.enableLobsters).toBe(true);
		expect(value.apiKey).toBe('');
		expect(value.cacheDurationMinutes).toBe(360);
	});

	it('persists and retrieves custom settings', async () => {
		const value = await settings.getValue();
		await settings.setValue({ ...value, apiKey: 'sk-test', enableLobsters: false });

		const updated = await settings.getValue();
		expect(updated.apiKey).toBe('sk-test');
		expect(updated.enableLobsters).toBe(false);
		expect(updated.enableHn).toBe(true); // unchanged
	});
});
