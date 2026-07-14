import { describe, expect, it } from 'vitest';
import { shouldNavigateCurrentTab } from './link';

const plainLeftClick = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false };

describe('shouldNavigateCurrentTab', () => {
	it('redirects a plain left click to the active tab when new-tab is off', () => {
		expect(shouldNavigateCurrentTab(false, plainLeftClick)).toBe(true);
	});

	it('never intercepts when the new-tab preference is on', () => {
		expect(shouldNavigateCurrentTab(true, plainLeftClick)).toBe(false);
	});

	it('lets modified clicks fall through to the browser (new tab)', () => {
		expect(shouldNavigateCurrentTab(false, { ...plainLeftClick, ctrlKey: true })).toBe(false);
		expect(shouldNavigateCurrentTab(false, { ...plainLeftClick, metaKey: true })).toBe(false);
		expect(shouldNavigateCurrentTab(false, { ...plainLeftClick, shiftKey: true })).toBe(false);
	});

	it('ignores non-primary mouse buttons', () => {
		expect(shouldNavigateCurrentTab(false, { ...plainLeftClick, button: 1 })).toBe(false);
	});
});
