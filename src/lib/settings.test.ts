import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { NUMERIC_LIMITS, isIntegerInRange, settings } from './settings';

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

	it('strips a synced API key even when a local key already exists', async () => {
		// 0.4.0 shipped without the 0.3.8 split and wrote a re-entered key back into sync
		await fakeBrowser.storage.local.set({ 'discussed:apiKey': 'sk-local' });
		await fakeBrowser.storage.sync.set({
			'discussed:settings': { apiKey: 'sk-stale', enableHn: false },
		});

		const value = await settings.getValue();
		expect(value.apiKey).toBe('sk-local');
		expect(value.enableHn).toBe(false);

		const syncRaw = await fakeBrowser.storage.sync.get('discussed:settings');
		const synced = syncRaw['discussed:settings'] as Record<string, unknown>;
		expect('apiKey' in synced).toBe(false);

		const localRaw = await fakeBrowser.storage.local.get('discussed:apiKey');
		expect(localRaw['discussed:apiKey']).toBe('sk-local');
	});
});

describe('isIntegerInRange', () => {
	const limits = { min: 10, max: 100 };

	it('accepts integers inside the range, boundaries included', () => {
		expect(isIntegerInRange(10, limits)).toBe(true);
		expect(isIntegerInRange(75, limits)).toBe(true);
		expect(isIntegerInRange(100, limits)).toBe(true);
	});

	it('rejects values outside the range', () => {
		expect(isIntegerInRange(9, limits)).toBe(false);
		expect(isIntegerInRange(101, limits)).toBe(false);
		expect(isIntegerInRange(-50, limits)).toBe(false);
	});

	it('rejects non-integers', () => {
		expect(isIntegerInRange(12.5, limits)).toBe(false);
		expect(isIntegerInRange(Number.NaN, limits)).toBe(false);
		expect(isIntegerInRange(Number.POSITIVE_INFINITY, limits)).toBe(false);
	});

	it('rejects blank input, which a number field binds as undefined or null', () => {
		expect(isIntegerInRange(undefined, limits)).toBe(false);
		expect(isIntegerInRange(null, limits)).toBe(false);
		expect(isIntegerInRange('', limits)).toBe(false);
	});

	it('rejects numeric strings rather than coercing them', () => {
		expect(isIntegerInRange('50', limits)).toBe(false);
	});

	it('accepts the shipped defaults for every limited setting', async () => {
		fakeBrowser.reset();
		const defaults = await settings.getValue();
		expect(
			isIntegerInRange(defaults.maxCommentsForSummary, NUMERIC_LIMITS.maxCommentsForSummary),
		).toBe(true);
		expect(
			isIntegerInRange(defaults.cacheDurationMinutes, NUMERIC_LIMITS.cacheDurationMinutes),
		).toBe(true);
	});
});
