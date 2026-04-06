<script lang="ts">
import { type Settings, settings } from '@/lib/settings';

let current = $state<Settings | null>(null);
let saved = $state(false);
let testResult = $state('');

async function load() {
	current = await settings.getValue();
}

async function save() {
	if (!current) return;
	await settings.setValue(current);
	saved = true;
	setTimeout(() => {
		saved = false;
	}, 2000);
}

async function testApiKey() {
	if (!current?.apiKey) {
		testResult = 'No API key entered';
		return;
	}
	testResult = 'Testing...';
	try {
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
		testResult = response.ok ? 'API key is valid' : `Error: ${response.status}`;
	} catch (e) {
		testResult = `Failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
	}
}

load();
</script>

{#if current}
<div class="max-w-xl mx-auto p-6 font-sans text-gray-900">
  <h1 class="text-xl font-semibold mb-6">Discussed Settings</h1>

  <!-- Sources -->
  <section class="mb-6">
    <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Sources</h2>
    <label class="flex items-center gap-2 mb-2">
      <input type="checkbox" bind:checked={current.enableHn} class="rounded" />
      <span class="text-sm">Hacker News</span>
    </label>
    <label class="flex items-center gap-2 mb-2">
      <input type="checkbox" bind:checked={current.enableReddit} class="rounded" />
      <span class="text-sm">Reddit</span>
    </label>
    <label class="flex items-center gap-2 mb-2">
      <input type="checkbox" bind:checked={current.enableLobsters} class="rounded" />
      <span class="text-sm">Lobsters</span>
    </label>
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={current.useOldReddit} class="rounded" />
      <span class="text-sm">Use old.reddit.com for links</span>
    </label>
  </section>

  <!-- Search Behavior -->
  <section class="mb-6">
    <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Search Behavior</h2>
    <label class="flex items-center gap-2 mb-2">
      <input type="checkbox" bind:checked={current.redditExactMatch} class="rounded" />
      <span class="text-sm">Reddit exact match</span>
    </label>
    <label class="flex items-center gap-2 mb-2">
      <input type="checkbox" bind:checked={current.ignoreQueryString} class="rounded" />
      <span class="text-sm">Ignore query string</span>
    </label>
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={current.youtubeSpecialHandling} class="rounded" />
      <span class="text-sm">YouTube special handling</span>
    </label>
  </section>

  <!-- Auto-search -->
  <section class="mb-6">
    <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Auto-search</h2>
    <label class="flex items-center gap-2 mb-2">
      <input type="checkbox" bind:checked={current.searchOnTabUpdate} class="rounded" />
      <span class="text-sm">Search when tab URL updates</span>
    </label>
    <label class="flex items-center gap-2 mb-2">
      <input type="checkbox" bind:checked={current.searchOnTabActivate} class="rounded" />
      <span class="text-sm">Search when switching tabs</span>
    </label>
    <label class="flex items-center gap-2 mb-2">
      <input type="checkbox" bind:checked={current.retryOnZeroResults} class="rounded" />
      <span class="text-sm">Retry if no results</span>
    </label>
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={current.retryOnError} class="rounded" />
      <span class="text-sm">Retry on error</span>
    </label>
  </section>

  <!-- Cache -->
  <section class="mb-6">
    <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Cache</h2>
    <label class="flex items-center gap-2">
      <span class="text-sm">Cache duration (minutes)</span>
      <input
        type="number"
        bind:value={current.cacheDurationMinutes}
        min="1"
        max="1440"
        class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
      />
    </label>
  </section>

  <!-- AI -->
  <section class="mb-6">
    <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">AI Summarization</h2>
    <label class="block mb-3">
      <span class="block text-sm mb-1">Provider</span>
      <select bind:value={current.llmProvider} class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
        <option value="anthropic">Anthropic (Claude)</option>
      </select>
    </label>
    <label class="block mb-3">
      <span class="block text-sm mb-1">Model</span>
      <input
        type="text"
        bind:value={current.model}
        class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
      />
    </label>
    <div class="mb-3">
      <label class="block">
        <span class="block text-sm mb-1">API Key</span>
        <div class="flex gap-2">
          <input
            type="password"
            bind:value={current.apiKey}
            placeholder="sk-ant-..."
            class="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        <button
          onclick={testApiKey}
          class="px-3 py-1.5 bg-gray-100 text-sm rounded hover:bg-gray-200 transition-colors"
        >
            Test
          </button>
        </div>
      </label>
      {#if testResult}
        <p class="text-xs mt-1 {testResult.startsWith('Error') || testResult.startsWith('Failed') ? 'text-red-500' : 'text-green-600'}">
          {testResult}
        </p>
      {/if}
    </div>
    <label class="flex items-center gap-2">
      <span class="text-sm">Max comments for summary</span>
      <input
        type="number"
        bind:value={current.maxCommentsForSummary}
        min="10"
        max="100"
        class="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
      />
    </label>
  </section>

  <!-- Save -->
  <div class="flex items-center gap-3">
    <button
      onclick={save}
      class="px-6 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
    >
      Save
    </button>
    {#if saved}
      <span class="text-sm text-green-600">Saved!</span>
    {/if}
  </div>
</div>
{/if}
