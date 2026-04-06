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
	model: 'claude-sonnet-4-6',
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
	models: Array<{ id: string; label: string; cost?: '$' | '$$' | '$$$' }>;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
	anthropic: {
		label: 'Anthropic (Claude)',
		apiFormat: 'anthropic',
		keyPlaceholder: 'sk-ant-...',
		models: [
			{ id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', cost: '$$' },
			{ id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', cost: '$' },
			{ id: 'claude-opus-4-6', label: 'Claude Opus 4.6', cost: '$$$' },
		],
	},
	openai: {
		label: 'OpenAI',
		apiFormat: 'openai',
		baseUrl: 'https://api.openai.com/v1',
		keyPlaceholder: 'sk-...',
		models: [
			{ id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini', cost: '$' },
			{ id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano', cost: '$' },
			{ id: 'gpt-5.4', label: 'GPT-5.4', cost: '$$$' },
			{ id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', cost: '$' },
			{ id: 'o4-mini', label: 'o4-mini', cost: '$$' },
		],
	},
	google: {
		label: 'Google (Gemini)',
		apiFormat: 'google',
		keyPlaceholder: 'AIza...',
		models: [
			{ id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', cost: '$' },
			{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', cost: '$$' },
			{ id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', cost: '$' },
			{ id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (preview)', cost: '$' },
		],
	},
	deepseek: {
		label: 'DeepSeek',
		apiFormat: 'openai',
		baseUrl: 'https://api.deepseek.com',
		keyPlaceholder: 'sk-...',
		models: [
			{ id: 'deepseek-chat', label: 'DeepSeek V3.2', cost: '$' },
			{ id: 'deepseek-reasoner', label: 'DeepSeek R1 (reasoning)', cost: '$' },
		],
	},
	groq: {
		label: 'Groq',
		apiFormat: 'openai',
		baseUrl: 'https://api.groq.com/openai/v1',
		keyPlaceholder: 'gsk_...',
		models: [
			{ id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', cost: '$' },
			{ id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', cost: '$' },
			{ id: 'qwen/qwen3-32b', label: 'Qwen 3 32B', cost: '$' },
		],
	},
	xai: {
		label: 'xAI (Grok)',
		apiFormat: 'openai',
		baseUrl: 'https://api.x.ai/v1',
		keyPlaceholder: 'xai-...',
		models: [
			{ id: 'grok-4-1-fast-non-reasoning', label: 'Grok 4.1 Fast', cost: '$' },
			{ id: 'grok-4.20-0309-non-reasoning', label: 'Grok 4.20', cost: '$$' },
		],
	},
	openrouter: {
		label: 'OpenRouter',
		apiFormat: 'openai',
		baseUrl: 'https://openrouter.ai/api/v1',
		keyPlaceholder: 'sk-or-...',
		models: [
			{ id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6', cost: '$$' },
			{ id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 Mini', cost: '$' },
			{ id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', cost: '$' },
			{ id: 'deepseek/deepseek-chat', label: 'DeepSeek V3.2', cost: '$' },
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
