/** Platform source identifier */
export type Platform = 'hn' | 'reddit' | 'lobsters';

/** A single discussion thread found on a platform */
export interface Discussion {
	/** Platform this discussion came from */
	platform: Platform;
	/** Discussion title */
	title: string;
	/** Direct URL to the discussion */
	url: string;
	/** Number of upvotes / points */
	points: number;
	/** Number of comments */
	commentCount: number;
	/** When the discussion was created */
	createdAt: Date;
	/** Platform-specific identifier */
	externalId: string;
	/** Subreddit name (Reddit only) */
	subreddit?: string;
}
