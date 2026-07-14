<script lang="ts">
import { t } from '@/lib/i18n';
import { type LlmProvider, needsMaxCompletionTokens } from '@/lib/llm';
import { PROVIDERS, type Settings, settings } from '@/lib/settings';

type StatusTone = 'neutral' | 'success' | 'error';

const version = browser.runtime.getManifest().version;

const LANGUAGE_OPTIONS = [
	{ value: 'en', label: 'English' },
	{ value: 'Chinese', label: 'Chinese (中文)' },
	{ value: 'Spanish', label: 'Spanish (Español)' },
	{ value: 'Japanese', label: 'Japanese (日本語)' },
	{ value: 'Korean', label: 'Korean (한국어)' },
	{ value: 'French', label: 'French (Français)' },
	{ value: 'German', label: 'German (Deutsch)' },
];

let current = $state<Settings | null>(null);
let showAdvanced = $state(false);
let saveMessage = $state('');
let testResult = $state('');
let testTone = $state<StatusTone>('neutral');
let saveTimeout: ReturnType<typeof setTimeout> | undefined;

const providerConfig = $derived(current ? PROVIDERS[current.selectedProvider] : null);
const providerEntries = Object.entries(PROVIDERS);
const modelOptions = $derived(providerConfig?.models ?? []);
const testResultClass = $derived.by(() => {
	if (testTone === 'error') return 'text-red-700';
	if (testTone === 'success') return 'text-emerald-700';
	return 'text-stone-500';
});

async function load() {
	current = await settings.getValue();
}

function setSaveStatus(message: string) {
	saveMessage = message;
	if (saveTimeout) clearTimeout(saveTimeout);
	saveTimeout = setTimeout(() => {
		saveMessage = '';
	}, 2500);
}

function setTestStatus(message: string, tone: StatusTone = 'neutral') {
	testResult = message;
	testTone = tone;
}

async function save() {
	if (!current) return;
	await settings.setValue(current);
	setSaveStatus(t('settingsSavedDetail'));
}

async function saveAfterTest() {
	if (!current) return;
	await settings.setValue(current);
	setSaveStatus(t('apiSettingsSaved'));
}

function onProviderChange() {
	if (!current) return;
	const config = PROVIDERS[current.selectedProvider];
	current.llmProvider = config.apiFormat;
	if (config.baseUrl) {
		current.openaiBaseUrl = config.baseUrl;
	}
	if (config.models.length > 0) {
		current.model = config.models[0].id;
	}
	setTestStatus('');
}

function describeApiFailure(provider: LlmProvider, status: number): string {
	if (status === 401 || status === 403) {
		return t('apiKeyRejected', provider);
	}
	if (status === 404) {
		return provider === 'openai' ? t('endpointNotFoundOpenai') : t('endpointNotFound', provider);
	}
	if (status === 429) {
		return t('rateLimited', provider);
	}
	if (status >= 500) {
		return t('providerTrouble', provider);
	}
	return t('apiReturnedStatus', provider, String(status));
}

async function testApiKey() {
	if (!current?.apiKey) {
		setTestStatus(t('addKeyFirst'), 'error');
		return;
	}

	setTestStatus(t('checkingApiKey'));

	try {
		if (current.llmProvider === 'anthropic') {
			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': current.apiKey,
					'anthropic-version': '2023-06-01',
					'anthropic-dangerous-direct-browser-access': 'true',
				},
				body: JSON.stringify({
					model: current.model,
					max_tokens: 10,
					messages: [{ role: 'user', content: 'Hi' }],
				}),
			});

			setTestStatus(
				response.ok ? t('apiKeyWorks') : describeApiFailure(current.llmProvider, response.status),
				response.ok ? 'success' : 'error',
			);
			if (response.ok) await saveAfterTest();
		} else if (current.llmProvider === 'openai') {
			const baseUrl = current.openaiBaseUrl || 'https://api.openai.com/v1';
			const tokenLimit = needsMaxCompletionTokens(current.model)
				? { max_completion_tokens: 10 }
				: { max_tokens: 10 };
			const response = await fetch(`${baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${current.apiKey}`,
				},
				body: JSON.stringify({
					model: current.model,
					...tokenLimit,
					messages: [{ role: 'user', content: 'Hi' }],
				}),
			});

			setTestStatus(
				response.ok ? t('apiKeyWorks') : describeApiFailure(current.llmProvider, response.status),
				response.ok ? 'success' : 'error',
			);
			if (response.ok) await saveAfterTest();
		} else if (current.llmProvider === 'google') {
			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/${current.model}:generateContent?key=${current.apiKey}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						contents: [{ parts: [{ text: 'Hi' }] }],
						generationConfig: { maxOutputTokens: 10 },
					}),
				},
			);

			setTestStatus(
				response.ok ? t('apiKeyWorks') : describeApiFailure(current.llmProvider, response.status),
				response.ok ? 'success' : 'error',
			);
			if (response.ok) await saveAfterTest();
		}
	} catch (e) {
		setTestStatus(
			t('couldNotReachProvider', e instanceof Error ? e.message : 'unknown error'),
			'error',
		);
	}
}

load();
</script>

{#if current}
<div class="mx-auto min-h-screen max-w-3xl px-2 py-3 text-stone-900 sm:px-4">
  <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <header class="min-w-0">
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Discussed <span class="font-normal normal-case tracking-normal text-stone-400">v{version}</span></p>
      <h1 class="mt-1 text-xl font-semibold tracking-tight text-stone-950">{t('settings')}</h1>
    </header>

    <div class="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
      <p class="text-sm text-stone-500 sm:order-2 sm:min-w-0" role="status" aria-live="polite">
        {saveMessage}
      </p>
      <button
        type="button"
        onclick={save}
        class="inline-flex min-h-10 items-center justify-center rounded-md bg-stone-900 px-5 text-sm font-medium text-white transition-colors hover:bg-stone-800"
      >
        {t('save')}
      </button>
    </div>
  </div>

  <div class="space-y-3">
    <section class="rounded-md border border-stone-200 bg-white p-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{t('basics')}</p>
        <h2 class="mt-1 text-base font-semibold tracking-tight text-stone-950">{t('coreControls')}</h2>
      </div>

      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <section>
          <h3 class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-stone-500">{t('sources')}</h3>
          <div class="mt-2 overflow-hidden rounded-md border border-stone-200 bg-white">
            <label class="flex items-start gap-3 px-3 py-2">
              <input type="checkbox" bind:checked={current.enableHn} class="mt-1 rounded border-stone-300" />
              <span>
                <span class="block text-sm font-medium text-stone-900">Hacker News</span>
                <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('sourceHintHn')}</span>
              </span>
            </label>
            <div class="border-t border-stone-200/80"></div>
            <label class="flex items-start gap-3 px-3 py-2">
              <input type="checkbox" bind:checked={current.enableReddit} class="mt-1 rounded border-stone-300" />
              <span>
                <span class="block text-sm font-medium text-stone-900">Reddit</span>
                <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('sourceHintMatching')}</span>
              </span>
            </label>
            <div class="border-t border-stone-200/80"></div>
            <label class="flex items-start gap-3 px-3 py-2">
              <input type="checkbox" bind:checked={current.enableLobsters} class="mt-1 rounded border-stone-300" />
              <span>
                <span class="block text-sm font-medium text-stone-900">Lobsters</span>
                <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('sourceHintMatching')}</span>
              </span>
            </label>
          </div>
        </section>

        <section>
          <h3 class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-stone-500">{t('linkBehavior')}</h3>
          <div class="mt-2 overflow-hidden rounded-md border border-stone-200 bg-white">
            <label class="flex items-start gap-3 px-3 py-2">
              <input type="checkbox" bind:checked={current.openLinksInNewTab} class="mt-1 rounded border-stone-300" />
              <span>
                <span class="block text-sm font-medium text-stone-900">{t('openLinksNewTab')}</span>
                <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('openLinksNewTabHint')}</span>
              </span>
            </label>
            <div class="border-t border-stone-200/80"></div>
            <label class="flex items-start gap-3 px-3 py-2">
              <input type="checkbox" bind:checked={current.useOldReddit} class="mt-1 rounded border-stone-300" />
              <span>
                <span class="block text-sm font-medium text-stone-900">{t('preferOldReddit')}</span>
                <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('preferOldRedditHint')}</span>
              </span>
            </label>
          </div>
        </section>
      </div>
    </section>

    <section class="rounded-md border border-stone-200 bg-white p-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{t('aiSummarization')}</p>
        <h2 class="mt-1 text-base font-semibold tracking-tight text-stone-950">{t('aiSetup')}</h2>
      </div>

      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <section class="space-y-3">
          <label class="block">
            <span class="block text-sm font-medium text-stone-900">{t('provider')}</span>
            <select
              bind:value={current.selectedProvider}
              onchange={onProviderChange}
              class="mt-2 min-h-10 w-full rounded-md border border-stone-300 bg-white px-4 text-sm text-stone-900"
            >
              {#each providerEntries as [key, config]}
                <option value={key}>{config.label}</option>
              {/each}
            </select>
          </label>

          {#if current.selectedProvider === 'custom' || current.selectedProvider === 'ollama'}
            <label class="block">
              <span class="block text-sm font-medium text-stone-900">{t('apiBaseUrl')}</span>
              <input
                type="text"
                bind:value={current.openaiBaseUrl}
                placeholder="https://api.openai.com/v1"
                class="mt-2 min-h-10 w-full rounded-md border border-stone-300 bg-white px-4 text-sm text-stone-900"
              />
            </label>
          {/if}

          <div>
            <div class="block">
              <label for="api-key-input" class="block text-sm font-medium text-stone-900">{t('apiKey')}</label>
              <span id="api-key-hint" class="mt-0.5 block text-xs leading-5 text-stone-600">{t('apiKeyHint')}</span>
            </div>
            <div class="mt-2 flex flex-col gap-2.5 sm:flex-row">
              <input
                id="api-key-input"
                type="password"
                aria-describedby="api-key-hint"
                bind:value={current.apiKey}
                placeholder={providerConfig?.keyPlaceholder ?? 'your-api-key'}
                class="min-h-10 flex-1 rounded-md border border-stone-300 bg-white px-4 text-sm text-stone-900"
              />
              <button
                type="button"
                onclick={testApiKey}
                class="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:text-stone-950"
              >
                {t('testKey')}
              </button>
            </div>
            <p class="mt-2 min-h-5 text-sm {testResultClass}" role="status" aria-live="polite">{testResult}</p>
          </div>
        </section>

        <section class="space-y-3">
          <div class="block">
            <label for="model-input" class="block text-sm font-medium text-stone-900">{t('model')}</label>
            <div class="mt-2 flex flex-col gap-2.5 sm:flex-row">
              <input
                id="model-input"
                type="text"
                bind:value={current.model}
                class="min-h-10 min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-4 text-sm text-stone-900"
              />
              {#if modelOptions.length > 0}
                <select
                  aria-label={t('presets')}
                  onchange={(e) => { if (current) current.model = (e.target as HTMLSelectElement).value; }}
                  class="min-h-10 min-w-0 shrink rounded-md border border-stone-300 bg-white px-4 text-sm text-stone-700 sm:max-w-40"
                >
                  <option value="" disabled selected>{t('presets')}</option>
                  {#each modelOptions as preset}
                    <option value={preset.id}>{preset.label}{preset.cost ? ` (${preset.cost})` : ''}</option>
                  {/each}
                </select>
              {/if}
            </div>
            <p class="mt-1 text-xs text-stone-500">{t('modelHint')}</p>
          </div>

          <label class="block">
            <span class="block text-sm font-medium text-stone-900">{t('maxCommentsPerSummary')}</span>
            <input
              type="number"
              bind:value={current.maxCommentsForSummary}
              min="10"
              max="100"
              class="mt-2 min-h-10 w-full rounded-md border border-stone-300 bg-white px-4 text-sm text-stone-900"
            />
          </label>

          <label class="block">
            <span class="block text-sm font-medium text-stone-900">{t('summaryLanguage')}</span>
            <select bind:value={current.summaryLanguage} class="mt-2 min-h-10 w-full rounded-md border border-stone-300 bg-white px-4 text-sm text-stone-900">
              {#each LANGUAGE_OPTIONS as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>
        </section>
      </div>
    </section>

    <section class="rounded-md border border-stone-200 bg-white p-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{t('exportSection')}</p>
        <h2 class="mt-1 text-base font-semibold tracking-tight text-stone-950">{t('exportSection')}</h2>
      </div>
      <div class="mt-3">
        <label class="block">
          <span class="block text-sm font-medium text-stone-900">{t('obsidianVault')}</span>
          <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('obsidianVaultHint')}</span>
          <input
            type="text"
            bind:value={current.obsidianVault}
            placeholder="My Vault"
            class="mt-2 min-h-10 w-full rounded-md border border-stone-300 bg-white px-4 text-sm text-stone-900"
          />
        </label>
      </div>
    </section>

    <section class="rounded-md border border-stone-200 bg-white p-3">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{t('advanced')}</p>
          <h2 class="mt-1 text-base font-semibold tracking-tight text-stone-950">{t('advancedControls')}</h2>
        </div>

        <button
          type="button"
          onclick={() => { showAdvanced = !showAdvanced; }}
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:text-stone-950"
          aria-expanded={showAdvanced}
          aria-controls="advanced-settings"
        >
          <span>{showAdvanced ? t('hideAdvancedSettings') : t('showAdvancedSettings')}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            class="size-4 transition-transform {showAdvanced ? 'rotate-180' : ''}"
          >
            <path fill-rule="evenodd" d="M3.22 5.97a.75.75 0 0 1 1.06 0L8 9.69l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.03a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      {#if showAdvanced}
        <div id="advanced-settings" class="mt-3 grid gap-3 md:grid-cols-2">
          <section class="rounded-md border border-stone-200 bg-white p-3">
            <h3 class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-stone-500">{t('matching')}</h3>
            <div class="mt-2.5 space-y-2">
              <label class="flex items-start gap-3">
                <input type="checkbox" bind:checked={current.redditExactMatch} class="mt-1 rounded border-stone-300" />
                <span>
                  <span class="block text-sm font-medium text-stone-900">{t('redditExactMatchLabel')}</span>
                  <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('redditExactMatchHint')}</span>
                </span>
              </label>
              <label class="flex items-start gap-3">
                <input type="checkbox" bind:checked={current.ignoreQueryString} class="mt-1 rounded border-stone-300" />
                <span>
                  <span class="block text-sm font-medium text-stone-900">{t('ignoreQueryStrings')}</span>
                  <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('ignoreQueryStringsHint')}</span>
                </span>
              </label>
            </div>
          </section>

          <section class="rounded-md border border-stone-200 bg-white p-3">
            <h3 class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-stone-500">{t('backgroundScanning')}</h3>
            <div class="mt-2.5 space-y-2">
              <label class="flex items-start gap-3">
                <input type="checkbox" bind:checked={current.searchOnTabUpdate} class="mt-1 rounded border-stone-300" />
                <span>
                  <span class="block text-sm font-medium text-stone-900">{t('scanOnTabUpdate')}</span>
                  <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('scanOnTabUpdateHint')}</span>
                </span>
              </label>
              <label class="flex items-start gap-3">
                <input type="checkbox" bind:checked={current.searchOnTabActivate} class="mt-1 rounded border-stone-300" />
                <span>
                  <span class="block text-sm font-medium text-stone-900">{t('scanOnTabActivate')}</span>
                  <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('scanOnTabActivateHint')}</span>
                </span>
              </label>
            </div>
          </section>

          <section class="rounded-md border border-stone-200 bg-white p-3">
            <h3 class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-stone-500">{t('badgeAndCache')}</h3>
            <div class="mt-2.5 space-y-3">
              <label class="block">
                <span class="block text-sm font-medium text-stone-900">{t('badgeDisplay')}</span>
                <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('badgeDisplayHint')}</span>
                <select bind:value={current.badgeDisplay} class="mt-2 min-h-10 w-full rounded-md border border-stone-300 bg-white px-4 text-sm text-stone-900">
                  <option value="discussions">{t('badgeTotalDiscussions')}</option>
                  <option value="comments">{t('badgeTotalComments')}</option>
                </select>
              </label>

              <label class="block">
                <span class="block text-sm font-medium text-stone-900">{t('cacheDurationLabel')}</span>
                <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('cacheDurationHint')}</span>
                <input
                  type="number"
                  bind:value={current.cacheDurationMinutes}
                  min="1"
                  max="1440"
                  class="mt-2 min-h-10 w-full rounded-md border border-stone-300 bg-white px-4 text-sm text-stone-900"
                />
              </label>
            </div>
          </section>

          <section class="rounded-md border border-stone-200 bg-white p-3">
            <h3 class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-stone-500">{t('domainFilter')}</h3>
            <div class="mt-2.5 space-y-3">
              <label class="block">
                <span class="block text-sm font-medium text-stone-900">{t('filterMode')}</span>
                <span class="mt-0.5 block text-xs leading-5 text-stone-600">{t('filterModeHint')}</span>
                <select bind:value={current.blacklistMode} class="mt-2 min-h-10 w-full rounded-md border border-stone-300 bg-white px-4 text-sm text-stone-900">
                  <option value="blacklist">{t('filterModeBlacklist')}</option>
                  <option value="whitelist">{t('filterModeWhitelist')}</option>
                </select>
              </label>

              <label class="block">
                <span class="block text-sm font-medium text-stone-900">
                  {current.blacklistMode === 'whitelist' ? t('allowedDomains') : t('blockedDomains')}
                </span>
                <span class="mt-0.5 block text-xs leading-5 text-stone-600">
                  {current.blacklistMode === 'whitelist' ? t('domainsWhitelistHint') : t('domainsBlacklistHint')}
                </span>
                <textarea
                  bind:value={current.blacklist}
                  placeholder={current.blacklistMode === 'whitelist'
                    ? 'github.com\nnews.ycombinator.com\nlobste.rs'
                    : 'facebook.com\nreddit.com\ntwitter.com'}
                  rows="4"
                  class="mt-2 w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-900"
                ></textarea>
              </label>
            </div>
          </section>
        </div>
      {/if}
    </section>
  </div>

  <footer class="mt-5 flex flex-wrap items-center gap-3 border-t border-stone-200 pt-4 text-sm text-stone-500">
    <a href="https://discussed.dev" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-stone-900">discussed.dev</a>
    <span>&middot;</span>
    <a href="https://github.com/discussed-dev/extension/issues" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-stone-900">{t('reportIssue')}</a>
    <span>&middot;</span>
    <a href="https://github.com/discussed-dev/extension" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-stone-900">GitHub</a>
  </footer>
</div>
{/if}
