/**
 * Reddit gives a signed-in session about 100 requests per ten-minute window and reports what is
 * left on every response. Live lookups pause once the budget can no longer cover another page,
 * so Discussed neither runs into 429s nor spends the allowance the user needs on Reddit itself.
 * The archive still answers while Reddit is paused.
 */

/** Wait after a 429 that names no reset time. */
const DEFAULT_PAUSE_S = 60;
/** Longest believable wait: one rate window. Guards against a malformed reset header. */
const MAX_PAUSE_S = 600;

type RateResponse = Pick<Response, 'status' | 'headers'>;

function headerNumber(headers: Headers, name: string): number | undefined {
	const value = Number.parseFloat(headers.get(name) ?? '');
	return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export class RedditRateGuard {
	private pausedUntil = 0;

	/** @param reserve requests one lookup may send; pause when fewer remain */
	constructor(
		private readonly reserve: number,
		private readonly now: () => number = Date.now,
	) {}

	isPaused(): boolean {
		return this.now() < this.pausedUntil;
	}

	observe(response: RateResponse): void {
		const remaining = headerNumber(response.headers, 'x-ratelimit-remaining');
		const exhausted =
			response.status === 429 || (remaining !== undefined && remaining < this.reserve);
		if (!exhausted) return;

		const resetS = headerNumber(response.headers, 'x-ratelimit-reset') ?? DEFAULT_PAUSE_S;
		const until = this.now() + Math.min(resetS, MAX_PAUSE_S) * 1000;
		this.pausedUntil = Math.max(this.pausedUntil, until);
	}

	reset(): void {
		this.pausedUntil = 0;
	}
}

/** A lookup sends at most four spellings (host with and without www, with and without a trailing slash). */
export const redditRateGuard = new RedditRateGuard(4);
