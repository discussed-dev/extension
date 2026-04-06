<script lang="ts">
import { cacheGet } from '@/lib/cache';
import { discoverDiscussions } from '@/lib/discovery';
import { settings } from '@/lib/settings';
import { type SummaryResult, summarizeDiscussions } from '@/lib/summarize';
import type { Discussion } from '@/lib/types';
import DiscussionRow from './DiscussionRow.svelte';
import ExternalLinks from './ExternalLinks.svelte';
import SignalBar from './SignalBar.svelte';
import Summary from './Summary.svelte';

type View = 'overview' | 'summary';

let discussions = $state<Discussion[]>([]);
let loading = $state(true);
let currentUrl = $state('');
let view = $state<View>('overview');
let summaryResult = $state<SummaryResult | null>(null);
let summarizing = $state(false);
let summaryError = $state('');
let hasApiKey = $state(false);

async function load() {
	loading = true;
	try {
		const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
		if (!tab?.url) return;
		currentUrl = tab.url;
		discussions = await discoverDiscussions(tab.url);

		const userSettings = await settings.getValue();
		hasApiKey = !!userSettings.apiKey;

		// Check for cached summary
		const cached = await cacheGet<SummaryResult>(`summary:${tab.url}`);
		if (cached) summaryResult = cached;
	} finally {
		loading = false;
	}
}

async function refresh() {
	if (!currentUrl) return;
	loading = true;
	try {
		discussions = await discoverDiscussions(currentUrl, { force: true });
	} finally {
		loading = false;
	}
}

async function doSummarize(force = false) {
	if (!currentUrl || discussions.length === 0) return;
	summarizing = true;
	summaryError = '';
	try {
		summaryResult = await summarizeDiscussions(currentUrl, discussions, { force });
		view = 'summary';
	} catch (e) {
		summaryError = e instanceof Error ? e.message : 'Summarization failed';
	} finally {
		summarizing = false;
	}
}

const sorted = $derived(
	[...discussions].sort((a, b) => b.points * b.commentCount - a.points * a.commentCount),
);

load();
</script>

{#if view === 'summary' && summaryResult}
  <Summary
    summary={summaryResult.summary}
    model={summaryResult.model}
    createdAt={summaryResult.createdAt}
    usage={summaryResult.usage}
    onBack={() => { view = 'overview'; }}
    onRegenerate={() => doSummarize(true)}
    regenerating={summarizing}
  />
{:else}
  <main class="w-96 min-h-48 bg-white text-gray-900 relative">
    {#if loading}
      <div class="flex items-center justify-center h-48">
        <div class="text-sm text-gray-400">Searching...</div>
      </div>
    {:else if discussions.length === 0}
      <div class="p-4">
        <p class="text-sm text-gray-500">No discussions found for this page.</p>
        <ExternalLinks url={currentUrl} />
      </div>
    {:else}
      <SignalBar {discussions} />

      <div class="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {#each sorted as discussion (discussion.externalId)}
          <DiscussionRow {discussion} />
        {/each}
      </div>

      <div class="p-3 border-t border-gray-100">
        {#if summaryError}
          <p class="text-xs text-red-500 mb-2">{summaryError}</p>
        {/if}

        {#if summaryResult}
          <button
            onclick={() => { view = 'summary'; }}
            class="w-full py-2 px-4 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            View Summary
          </button>
        {:else}
          <button
            onclick={() => doSummarize()}
            disabled={!hasApiKey || summarizing}
            class="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors
              {hasApiKey ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}"
            title={hasApiKey ? '' : 'Configure an API key in settings to enable'}
          >
            {summarizing ? 'Summarizing...' : 'Summarize All'}
          </button>
        {/if}
      </div>

      <ExternalLinks url={currentUrl} />
    {/if}

    <div class="absolute top-2 right-2 flex gap-0.5">
      <button
        onclick={() => browser.runtime.openOptionsPage()}
        class="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
          <path fill-rule="evenodd" d="M6.455 1.45A.5.5 0 0 1 6.952 1h2.096a.5.5 0 0 1 .497.45l.186 1.858a4.996 4.996 0 0 1 1.466.848l1.703-.769a.5.5 0 0 1 .639.206l1.048 1.814a.5.5 0 0 1-.142.656l-1.517 1.09a5.026 5.026 0 0 1 0 1.694l1.517 1.09a.5.5 0 0 1 .142.656l-1.048 1.814a.5.5 0 0 1-.639.206l-1.703-.769c-.433.36-.928.652-1.466.848l-.186 1.858a.5.5 0 0 1-.497.45H6.952a.5.5 0 0 1-.497-.45l-.186-1.858a4.993 4.993 0 0 1-1.466-.848l-1.703.769a.5.5 0 0 1-.639-.206L1.413 11.77a.5.5 0 0 1 .142-.656l1.517-1.09a5.026 5.026 0 0 1 0-1.694l-1.517-1.09a.5.5 0 0 1-.142-.656L2.46 4.77a.5.5 0 0 1 .639-.206l1.703.769c.433-.36.928-.652 1.466-.848l.186-1.858ZM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" clip-rule="evenodd" />
        </svg>
      </button>
      <button
        onclick={refresh}
        class="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        title="Refresh"
        disabled={loading}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
          <path fill-rule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.681.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-.908l.84.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44.908l-.84-.84v1.546a.75.75 0 0 1-1.5 0V9.432a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.681.75.75 0 0 1 1.025-.274Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </main>
{/if}
