import { describe, expect, it, vi } from 'vitest';
import {
	badgeColorForDiscussions,
	badgeTextForDiscussions,
	dominantPlatform,
	syncToolbarBadgeForDiscussions,
} from './badge';
import type { Discussion } from './types';

const baseDiscussion: Discussion = {
	platform: 'hn',
	title: 'Example',
	url: 'https://example.com/thread',
	points: 42,
	commentCount: 12,
	createdAt: '2026-04-06T12:00:00.000Z',
	externalId: 'abc123',
};

describe('badge helpers', () => {
	it('returns a count badge by default', () => {
		expect(
			badgeTextForDiscussions(
				[baseDiscussion, { ...baseDiscussion, externalId: 'def456', platform: 'reddit' }],
				'discussions',
			),
		).toBe('2');
	});

	it('returns a compact comment total when requested', () => {
		expect(
			badgeTextForDiscussions(
				[
					{ ...baseDiscussion, commentCount: 620 },
					{ ...baseDiscussion, externalId: 'def456', commentCount: 510 },
				],
				'comments',
			),
		).toBe('1k');
	});

	it('detects mixed platform state for color selection', () => {
		expect(
			dominantPlatform([
				baseDiscussion,
				{ ...baseDiscussion, externalId: 'def456', platform: 'reddit' },
			]),
		).toBe('mixed');
		expect(badgeColorForDiscussions([baseDiscussion])).toBe('#f97316');
	});

	it('syncs badge text and color through the toolbar API', async () => {
		const action = {
			setBadgeText: vi.fn().mockResolvedValue(undefined),
			setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
		};

		await syncToolbarBadgeForDiscussions(
			{ action },
			7,
			[baseDiscussion, { ...baseDiscussion, externalId: 'def456', platform: 'reddit' }],
			'discussions',
		);

		expect(action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: '2' });
		expect(action.setBadgeBackgroundColor).toHaveBeenCalledWith({
			tabId: 7,
			color: '#6366f1',
		});
	});
});
