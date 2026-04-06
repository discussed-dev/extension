import type { LlmProvider } from './llm';

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
	llmProvider: LlmProvider;
	apiKey: string;
	model: string;
	maxCommentsForSummary: number;
	summaryLanguage: string;
	openaiBaseUrl: string;

	// Blacklist
	blacklist: string;
	blacklistMode: 'blacklist' | 'whitelist';
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
	openaiBaseUrl: 'https://api.openai.com/v1',

	blacklist: '',
	blacklistMode: 'blacklist',
};

export const MODEL_PRESETS: Record<LlmProvider, Array<{ id: string; label: string }>> = {
	anthropic: [
		{ id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
		{ id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
		{ id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
	],
	openai: [
		{ id: 'gpt-4.1', label: 'GPT-4.1' },
		{ id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
		{ id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
		{ id: 'o4-mini', label: 'o4-mini' },
	],
	google: [
		{ id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
		{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
	],
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
