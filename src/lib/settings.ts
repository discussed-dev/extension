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
	selectedProvider: string;
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

	selectedProvider: 'anthropic',
	llmProvider: 'anthropic',
	apiKey: '',
	model: 'claude-sonnet-4-20250514',
	maxCommentsForSummary: 40,
	summaryLanguage: 'en',
	openaiBaseUrl: 'https://api.openai.com/v1',

	blacklist: '',
	blacklistMode: 'blacklist',
};

export interface ProviderConfig {
	label: string;
	apiFormat: LlmProvider;
	baseUrl?: string;
	keyPlaceholder: string;
	models: Array<{ id: string; label: string }>;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
	anthropic: {
		label: 'Anthropic (Claude)',
		apiFormat: 'anthropic',
		keyPlaceholder: 'sk-ant-...',
		models: [
			{ id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
			{ id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
			{ id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
		],
	},
	openai: {
		label: 'OpenAI',
		apiFormat: 'openai',
		baseUrl: 'https://api.openai.com/v1',
		keyPlaceholder: 'sk-...',
		models: [
			{ id: 'gpt-4.1', label: 'GPT-4.1' },
			{ id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
			{ id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
			{ id: 'o4-mini', label: 'o4-mini' },
		],
	},
	google: {
		label: 'Google (Gemini)',
		apiFormat: 'google',
		keyPlaceholder: 'AIza...',
		models: [
			{ id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
			{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
		],
	},
	deepseek: {
		label: 'DeepSeek',
		apiFormat: 'openai',
		baseUrl: 'https://api.deepseek.com/v1',
		keyPlaceholder: 'sk-...',
		models: [
			{ id: 'deepseek-chat', label: 'DeepSeek V3' },
			{ id: 'deepseek-reasoner', label: 'DeepSeek R1' },
		],
	},
	groq: {
		label: 'Groq',
		apiFormat: 'openai',
		baseUrl: 'https://api.groq.com/openai/v1',
		keyPlaceholder: 'gsk_...',
		models: [
			{ id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
			{ id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
			{ id: 'gemma2-9b-it', label: 'Gemma 2 9B' },
		],
	},
	xai: {
		label: 'xAI (Grok)',
		apiFormat: 'openai',
		baseUrl: 'https://api.x.ai/v1',
		keyPlaceholder: 'xai-...',
		models: [{ id: 'grok-3-mini', label: 'Grok 3 Mini' }],
	},
	openrouter: {
		label: 'OpenRouter',
		apiFormat: 'openai',
		baseUrl: 'https://openrouter.ai/api/v1',
		keyPlaceholder: 'sk-or-...',
		models: [
			{ id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
			{ id: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini' },
			{ id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
			{ id: 'deepseek/deepseek-chat-v3', label: 'DeepSeek V3' },
		],
	},
	ollama: {
		label: 'Ollama (local)',
		apiFormat: 'openai',
		baseUrl: 'http://localhost:11434/v1',
		keyPlaceholder: 'ollama',
		models: [
			{ id: 'llama3.1', label: 'Llama 3.1' },
			{ id: 'mistral', label: 'Mistral' },
			{ id: 'gemma2', label: 'Gemma 2' },
		],
	},
	custom: {
		label: 'Custom (OpenAI-compatible)',
		apiFormat: 'openai',
		keyPlaceholder: 'your-api-key',
		models: [],
	},
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
