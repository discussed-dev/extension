import { describe, expect, it } from 'vitest';
import { RedditRateGuard } from './reddit-rate';

function response(status: number, headers: Record<string, string> = {}) {
	return { status, headers: new Headers(headers) };
}

function guardAt(start = 1_000_000) {
	let now = start;
	const guard = new RedditRateGuard(4, () => now);
	return {
		guard,
		advance: (ms: number) => {
			now += ms;
		},
	};
}

describe('RedditRateGuard', () => {
	it('starts open', () => {
		expect(guardAt().guard.isPaused()).toBe(false);
	});

	it('stays open while the remaining budget covers another lookup', () => {
		const { guard } = guardAt();
		guard.observe(response(200, { 'x-ratelimit-remaining': '4.0', 'x-ratelimit-reset': '300' }));
		expect(guard.isPaused()).toBe(false);
	});

	it('pauses until the window resets once the budget cannot cover another lookup', () => {
		const { guard, advance } = guardAt();
		guard.observe(response(200, { 'x-ratelimit-remaining': '3.0', 'x-ratelimit-reset': '300' }));

		expect(guard.isPaused()).toBe(true);
		advance(299_999);
		expect(guard.isPaused()).toBe(true);
		advance(1);
		expect(guard.isPaused()).toBe(false);
	});

	it('pauses on a 429 for the reported reset', () => {
		const { guard, advance } = guardAt();
		guard.observe(response(429, { 'x-ratelimit-reset': '120' }));

		advance(119_000);
		expect(guard.isPaused()).toBe(true);
		advance(1_000);
		expect(guard.isPaused()).toBe(false);
	});

	it('pauses on a 429 for a minute when Reddit names no reset', () => {
		const { guard, advance } = guardAt();
		guard.observe(response(429));

		advance(59_000);
		expect(guard.isPaused()).toBe(true);
		advance(1_000);
		expect(guard.isPaused()).toBe(false);
	});

	it('ignores responses without rate headers', () => {
		const { guard } = guardAt();
		guard.observe(response(200));
		guard.observe(response(403));
		expect(guard.isPaused()).toBe(false);
	});

	it('caps an implausible reset at the length of a rate window', () => {
		const { guard, advance } = guardAt();
		guard.observe(response(200, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '999999' }));

		advance(600_000);
		expect(guard.isPaused()).toBe(false);
	});

	it('keeps the later deadline when parallel responses disagree', () => {
		const { guard, advance } = guardAt();
		guard.observe(response(200, { 'x-ratelimit-remaining': '1', 'x-ratelimit-reset': '300' }));
		guard.observe(response(200, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '200' }));

		advance(250_000);
		expect(guard.isPaused()).toBe(true);
	});

	it('reset() reopens it', () => {
		const { guard } = guardAt();
		guard.observe(response(429));
		guard.reset();
		expect(guard.isPaused()).toBe(false);
	});
});
