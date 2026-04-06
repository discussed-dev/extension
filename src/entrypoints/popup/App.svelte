<script lang="ts">
import { cacheGet } from '@/lib/cache';
import { discoverDiscussions } from '@/lib/discovery';
import { type Settings, settings } from '@/lib/settings';
import { type SummaryResult, summarizeDiscussions } from '@/lib/summarize';
import type { Discussion, Platform } from '@/lib/types';
import DiscussionRow from './DiscussionRow.svelte';
import ExternalLinks from './ExternalLinks.svelte';
import SignalBar from './SignalBar.svelte';
import Summary from './Summary.svelte';

type View = 'overview' | 'summary';

const PLATFORM_ORDER: Platform[] = ['hn', 'reddit', 'lobsters'];
const PLATFORM_LABELS: Record<Platform, string> = {
	hn: 'Hacker News',
	reddit: 'Reddit',
	lobsters: 'Lobsters',
};

let discussions = $state<Discussion[]>([]);
let loading = $state(true);
let currentUrl = $state('');
let view = $state<View>('overview');
let summaryResult = $state<SummaryResult | null>(null);
let summarizing = $state(false);
let summaryError = $state('');
let hasApiKey = $state(false);
let userSettings = $state<Settings | null>(null);

async function load() {
	loading = true;
	try {
		const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
		if (!tab?.url) return;
		currentUrl = tab.url;
		discussions = await discoverDiscussions(tab.url);

		userSettings = await settings.getValue();
		hasApiKey = !!userSettings.apiKey;

		const cached = await cacheGet<SummaryResult>(`summary:${tab.url}`);
		if (cached) summaryResult = cached;
	} catch (e) {
		console.error('[discussed] popup load error:', e);
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
	[...discussions].sort((a, b) => b.commentCount - a.commentCount),
);

const groupedDiscussions = $derived.by(() =>
	PLATFORM_ORDER.map((platform) => ({
		platform,
		label: PLATFORM_LABELS[platform],
		items: sorted.filter((discussion) => discussion.platform === platform),
	})).filter((group) => group.items.length > 0),
);

const currentHost = $derived.by(() => {
	if (!currentUrl) return 'current page';
	try {
		return new URL(currentUrl).hostname.replace(/^www\./, '');
	} catch {
		return currentUrl;
	}
});

const ctaDescription = $derived.by(() => {
	if (summaryResult) {
		return 'Cached summary ready.';
	}
	if (!hasApiKey) {
		return 'API key required.';
	}
	return `${discussions.length} discussion${discussions.length === 1 ? '' : 's'}, one short read.`;
});

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
  <main class="w-[25rem] min-h-48 rounded-[1.75rem] border border-stone-200/80 bg-white/95 text-stone-900 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
    <header class="flex items-center justify-between gap-3 border-b border-stone-200/80 px-4 py-2">
      <div class="min-w-0">
        <p class="truncate text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-stone-600">
          Discussed <span class="mx-1 text-stone-400">/</span> {currentHost}
        </p>
      </div>

      <div class="flex shrink-0 gap-1.5">
        <button
          type="button"
          onclick={refresh}
          class="inline-flex size-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Refresh discussion scan"
          title="Refresh discussion scan"
          disabled={loading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
            <path fill-rule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.681.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-.908l.84.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44.908l-.84-.84v1.546a.75.75 0 0 1-1.5 0V9.432a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.681.75.75 0 0 1 1.025-.274Z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          type="button"
          onclick={() => browser.runtime.openOptionsPage()}
          class="inline-flex size-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-950"
          aria-label="Open settings"
          title="Open settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
            <path fill-rule="evenodd" d="M6.455 1.45A.5.5 0 0 1 6.952 1h2.096a.5.5 0 0 1 .497.45l.186 1.858a4.996 4.996 0 0 1 1.466.848l1.703-.769a.5.5 0 0 1 .639.206l1.048 1.814a.5.5 0 0 1-.142.656l-1.517 1.09a5.026 5.026 0 0 1 0 1.694l1.517 1.09a.5.5 0 0 1 .142.656l-1.048 1.814a.5.5 0 0 1-.639.206l-1.703-.769c-.433.36-.928.652-1.466.848l-.186 1.858a.5.5 0 0 1-.497.45H6.952a.5.5 0 0 1-.497-.45l-.186-1.858a4.993 4.993 0 0 1-1.466-.848l-1.703.769a.5.5 0 0 1-.639-.206L1.413 11.77a.5.5 0 0 1 .142-.656l1.517-1.09a5.026 5.026 0 0 1 0-1.694l-1.517-1.09a.5.5 0 0 1-.142-.656L2.46 4.77a.5.5 0 0 1 .639-.206l1.703.769c.433-.36.928-.652 1.466-.848l.186-1.858ZM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </header>

    {#if loading}
      <div class="flex min-h-56 flex-col items-center justify-center gap-3 px-6 text-center" role="status" aria-live="polite">
        <div class="size-9 animate-pulse rounded-full bg-stone-200"></div>
        <div>
          <p class="text-sm font-medium text-stone-800">Scanning discussion sources...</p>
          <p class="mt-1 text-sm text-stone-500">Checking Hacker News, Reddit, and Lobsters for this page.</p>
        </div>
      </div>
    {:else if discussions.length === 0}
      <section class="px-4 py-6">
        <div class="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 px-4 py-5">
          <p class="text-base font-semibold tracking-tight text-stone-950">No discussion signal yet</p>
          <p class="mt-2 text-sm leading-6 text-stone-600">
            Discussed did not find matching threads for {currentHost}. Try a fresh scan, or search beyond the built-in sources.
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onclick={refresh}
              class="inline-flex min-h-11 items-center justify-center rounded-full bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800"
            >
              Scan again
            </button>
            <button
              type="button"
              onclick={() => browser.runtime.openOptionsPage()}
              class="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:text-stone-950"
            >
              Review sources
            </button>
          </div>
        </div>
        <ExternalLinks url={currentUrl} />
      </section>
    {:else}
      <SignalBar {discussions} />

      <div class="max-h-[24rem] space-y-2.5 overflow-y-auto px-4 py-2.5">
        {#each groupedDiscussions as group (group.platform)}
          <section>
            <div class="mb-0.5 flex items-center gap-3">
              <h2 class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                {group.label}
              </h2>
            </div>

            <div class="space-y-1">
              {#each group.items as discussion (discussion.externalId)}
                <DiscussionRow
                  {discussion}
                  useOldReddit={userSettings?.useOldReddit}
                  openInNewTab={userSettings?.openLinksInNewTab}
                />
              {/each}
            </div>
          </section>
        {/each}
      </div>

      <div class="border-t border-stone-200 bg-stone-50/80 px-4 py-2.5">

        {#if summaryError}
          <p class="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="status" aria-live="polite">
            {summaryError}
          </p>
        {/if}

        {#if summaryResult}
          <button
            type="button"
            onclick={() => { view = 'summary'; }}
            class="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800"
          >
            View Summary
          </button>
        {:else}
          <button
            type="button"
            onclick={hasApiKey ? () => doSummarize() : () => browser.runtime.openOptionsPage()}
            disabled={summarizing}
            class="inline-flex min-h-10 w-full items-center justify-center rounded-full px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60
              {hasApiKey ? 'bg-stone-900 text-white hover:bg-stone-800' : 'bg-stone-200 text-stone-500'}"
          >
            {summarizing ? 'Summarizing...' : hasApiKey ? 'Summarize All' : 'Open AI Settings'}
          </button>
        {/if}

        <p class="mt-1.5 text-xs text-stone-500">{ctaDescription}</p>

        <ExternalLinks url={currentUrl} />
      </div>
    {/if}
  </main>
{/if}
