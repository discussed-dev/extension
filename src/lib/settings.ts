export interface Settings {
	// Sources
	enableHn: boolean;
	enableReddit: boolean;
	enableLobsters: boolean;
	useOldReddit: boolean;

	// Search behavior
	redditExactMatch: boolean;
	ignoreQueryString: boolean;
	youtubeSpecialHandling: boolean;

	// Auto-search
	searchOnTabUpdate: boolean;
	searchOnTabActivate: boolean;
	retryOnZeroResults: boolean;
	retryOnError: boolean;

	// Popup behavior
	openLinksInNewTab: boolean;

	// Badge
	badgeDisplay: 'discussions' | 'comments';

	// Cache
	cacheDurationMinutes: number;

	// AI
	llmProvider: 'anthropic';
	apiKey: string;
	model: string;
	maxCommentsForSummary: number;
	summaryLanguage: string;
}

const DEFAULTS: Settings = {
	enableHn: true,
	enableReddit: true,
	enableLobsters: true,
	useOldReddit: false,

	redditExactMatch: false,
	ignoreQueryString: true,
	youtubeSpecialHandling: true,

	searchOnTabUpdate: true,
	searchOnTabActivate: false,
	retryOnZeroResults: true,
	retryOnError: true,

	openLinksInNewTab: true,

	badgeDisplay: 'discussions',

	cacheDurationMinutes: 360,

	llmProvider: 'anthropic',
	apiKey: '',
	model: 'claude-sonnet-4-20250514',
	maxCommentsForSummary: 40,
	summaryLanguage: 'en',
};

const STORAGE_KEY = 'discussed:settings';

export const settings = {
	async getValue(): Promise<Settings> {
		const result = await browser.storage.sync.get(STORAGE_KEY);
		const stored = result[STORAGE_KEY] as Partial<Settings> | undefined;
		return { ...DEFAULTS, ...stored };
	},

	async setValue(value: Settings): Promise<void> {
		await browser.storage.sync.set({ [STORAGE_KEY]: value });
	},
};
