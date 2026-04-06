<script lang="ts">
import { discoverDiscussions } from '@/lib/discovery';
import type { Discussion } from '@/lib/types';
import DiscussionRow from './DiscussionRow.svelte';
import ExternalLinks from './ExternalLinks.svelte';
import SignalBar from './SignalBar.svelte';

let discussions = $state<Discussion[]>([]);
let loading = $state(true);
let currentUrl = $state('');

async function load() {
	loading = true;
	try {
		const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
		if (!tab?.url) return;
		currentUrl = tab.url;
		discussions = await discoverDiscussions(tab.url);
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

const sorted = $derived(
	[...discussions].sort((a, b) => b.points * b.commentCount - a.points * a.commentCount),
);

load();
</script>

<main class="w-96 min-h-48 bg-white text-gray-900">
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

    <div class="divide-y divide-gray-100">
      {#each sorted as discussion (discussion.externalId)}
        <DiscussionRow {discussion} />
      {/each}
    </div>

    <div class="p-3 border-t border-gray-100">
      <button
        disabled
        class="w-full py-2 px-4 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed"
        title="Configure an API key in settings to enable"
      >
        Summarize All
      </button>
    </div>

    <ExternalLinks url={currentUrl} />
  {/if}

  <div class="absolute top-2 right-2">
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
