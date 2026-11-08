import type { I18nKey } from './i18n';
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

	// Auto-search
	searchOnTabUpdate: boolean;
	searchOnTabActivate: boolean;

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

	// Export
	obsidianVault: string;
}

const DEFAULTS: Settings = {
	enableHn: true,
	enableReddit: true,
	enableLobsters: true,
	useOldReddit: false,

	redditExactMatch: true,
	ignoreQueryString: true,

	searchOnTabUpdate: true,
	searchOnTabActivate: false,

	openLinksInNewTab: true,

	badgeDisplay: 'discussions',

	cacheDurationMinutes: 360,

	selectedProvider: 'anthropic',
	llmProvider: 'anthropic',
	apiKey: '',
	model: 'claude-sonnet-5',
	maxCommentsForSummary: 75,
	summaryLanguage: 'en',
	openaiBaseUrl: 'https://api.openai.com/v1',

	blacklist: '',
	blacklistMode: 'blacklist',

	obsidianVault: '',
};

export interface IntegerLimits {
	min: number;
	max: number;
}

/** Bounds for the numeric settings; the options inputs use the same values for min/max. */
export const NUMERIC_LIMITS = {
	maxCommentsForSummary: { min: 10, max: 100 },
	cacheDurationMinutes: { min: 1, max: 1440 },
} as const satisfies Record<string, IntegerLimits>;

/**
 * Whether a numeric setting is safe to persist. Takes `unknown` because a
 * number input bound with bind:value yields undefined/null when blank.
 */
export function isIntegerInRange(value: unknown, limits: IntegerLimits): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= limits.min &&
		value <= limits.max
	);
}

export interface ProviderConfig {
	label: string;
	/** Set when the label has descriptive words to translate; resolved with t() at render time. */
	labelKey?: I18nKey;
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
			{ id: 'claude-sonnet-5', label: 'Claude Sonnet 5', cost: '$$' },
			{ id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', cost: '$' },
			{ id: 'claude-opus-5', label: 'Claude Opus 5', cost: '$$$' },
		],
	},
	openai: {
		label: 'OpenAI',
		apiFormat: 'openai',
		baseUrl: 'https://api.openai.com/v1',
		keyPlaceholder: 'sk-...',
		models: [
			{ id: 'gpt-5-nano', label: 'GPT-5 Nano', cost: '$' }, // retires: 2026-12-11
			{ id: 'gpt-5-mini', label: 'GPT-5 Mini', cost: '$' }, // retires: 2026-12-11
			{ id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano', cost: '$' }, // retires: 2027-04-01
			{ id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', cost: '$' }, // retires: 2027-01-14
			{ id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini', cost: '$$' },
			{ id: 'gpt-5.4', label: 'GPT-5.4', cost: '$$$' },
		],
	},
	google: {
		label: 'Google (Gemini)',
		apiFormat: 'google',
		keyPlaceholder: 'AIza...',
		models: [
			// gemini-2.5-flash / -flash-lite are scheduled for shutdown (Oct 2026);
			// these are the GA replacements Google names in its own docs.
			{ id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite', cost: '$' },
			{ id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (preview)', cost: '$' },
			{ id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', cost: '$$' },
			{ id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (preview)', cost: '$$' },
		],
	},
	deepseek: {
		label: 'DeepSeek',
		apiFormat: 'openai',
		baseUrl: 'https://api.deepseek.com',
		keyPlaceholder: 'sk-...',
		models: [
			{ id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', cost: '$' },
			{ id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', cost: '$$' },
		],
	},
	groq: {
		label: 'Groq',
		apiFormat: 'openai',
		baseUrl: 'https://api.groq.com/openai/v1',
		keyPlaceholder: 'gsk_...',
		models: [
			{ id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', cost: '$' },
			{ id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', cost: '$' },
		],
	},
	xai: {
		label: 'xAI (Grok)',
		apiFormat: 'openai',
		baseUrl: 'https://api.x.ai/v1',
		keyPlaceholder: 'xai-...',
		models: [
			{ id: 'grok-4.20-0309-non-reasoning', label: 'Grok 4.20 (non-reasoning)', cost: '$' },
			{ id: 'grok-4.3', label: 'Grok 4.3', cost: '$' },
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
			{ id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash', cost: '$' },
		],
	},
	ollama: {
		label: 'Ollama (local)',
		labelKey: 'providerOllamaLocal',
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
		labelKey: 'providerCustomOpenai',
		apiFormat: 'openai',
		keyPlaceholder: 'your-api-key',
		models: [],
	},
};

/**
 * Model IDs a provider has shut down, mapped to the preset that replaces them.
 * The model field is free text, so removing a preset does not move users off a
 * dead ID; getValue rewrites these on read. Keyed by provider so a custom
 * endpoint that happens to serve a model with the same name is left alone.
 */
export const RETIRED_MODELS: Record<string, Record<string, string>> = {
	openai: {
		// Shut down 2026-10-23 (OpenAI deprecations page).
		'o4-mini': 'gpt-5.4-mini',
		'gpt-4.1-nano': 'gpt-5.4-nano',
	},
	groq: {
		// Shut down for free and developer tiers by 2026-08-16 (Groq deprecations page).
		'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
		'llama-3.1-8b-instant': 'openai/gpt-oss-20b',
		'meta-llama/llama-4-maverick-17b-128e-instruct': 'openai/gpt-oss-120b',
		'qwen/qwen3-32b': 'openai/gpt-oss-120b',
	},
	xai: {
		// No longer on the xAI models page; its variants were retired 2026-05-15.
		'grok-4-fast': 'grok-4.20-0309-non-reasoning',
	},
};

function replaceRetiredModel(value: Settings): Settings {
	const replacement = RETIRED_MODELS[value.selectedProvider]?.[value.model];
	return replacement ? { ...value, model: replacement } : value;
}

const STORAGE_KEY = 'discussed:settings';
// The API key is a secret: it lives in storage.local so it never syncs
// through the browser vendor's servers. Everything else stays in sync.
const API_KEY_STORAGE_KEY = 'discussed:apiKey';

export const settings = {
	async getValue(): Promise<Settings> {
		const [syncResult, localResult] = await Promise.all([
			browser.storage.sync.get(STORAGE_KEY),
			browser.storage.local.get(API_KEY_STORAGE_KEY),
		]);
		const stored = syncResult[STORAGE_KEY] as Partial<Settings> | undefined;
		let apiKey = (localResult[API_KEY_STORAGE_KEY] as string | undefined) ?? '';

		// Older versions synced the key inside the settings object. Strip it from
		// sync whenever it appears; move it to local storage only if local has none,
		// since a local key is newer than a synced one.
		if (stored && 'apiKey' in stored) {
			if (!apiKey) apiKey = stored.apiKey ?? '';
			await this.setValue({ ...DEFAULTS, ...stored, apiKey });
		}

		const value: Settings = { ...DEFAULTS, ...stored, apiKey };
		const migrated = replaceRetiredModel(value);
		if (migrated !== value) await this.setValue(migrated);
		return migrated;
	},

	async setValue(value: Settings): Promise<void> {
		const { apiKey, ...synced } = value;
		await Promise.all([
			browser.storage.sync.set({ [STORAGE_KEY]: synced }),
			browser.storage.local.set({ [API_KEY_STORAGE_KEY]: apiKey }),
		]);
	},
};
