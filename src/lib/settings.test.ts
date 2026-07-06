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

	it('keeps the API key out of synced storage', async () => {
		const value = await settings.getValue();
		await settings.setValue({ ...value, apiKey: 'sk-secret' });

		const syncRaw = await fakeBrowser.storage.sync.get('discussed:settings');
		const synced = syncRaw['discussed:settings'] as Record<string, unknown>;
		expect(synced).toBeTruthy();
		expect('apiKey' in synced).toBe(false);

		const localRaw = await fakeBrowser.storage.local.get('discussed:apiKey');
		expect(localRaw['discussed:apiKey']).toBe('sk-secret');
	});

	it('migrates a legacy synced API key to local storage', async () => {
		// Simulate settings saved by an older version that synced the key
		await fakeBrowser.storage.sync.set({
			'discussed:settings': { apiKey: 'sk-legacy', enableHn: false },
		});

		const value = await settings.getValue();
		expect(value.apiKey).toBe('sk-legacy');
		expect(value.enableHn).toBe(false);

		const localRaw = await fakeBrowser.storage.local.get('discussed:apiKey');
		expect(localRaw['discussed:apiKey']).toBe('sk-legacy');

		const syncRaw = await fakeBrowser.storage.sync.get('discussed:settings');
		const synced = syncRaw['discussed:settings'] as Record<string, unknown>;
		expect('apiKey' in synced).toBe(false);
	});
});
