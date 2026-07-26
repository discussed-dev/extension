<script lang="ts">
import type { Citation } from '@/lib/grounding';
import { t } from '@/lib/i18n';

interface Props {
	citation: Citation;
	index: number;
}

let { citation, index }: Props = $props();

let open = $state(false);
let toggle = $state<HTMLButtonElement | null>(null);

// Brand names are not translated; only the page-comment label goes through t().
const PLATFORM_LABELS: Record<Citation['platform'], string> = {
	hn: 'Hacker News',
	reddit: 'Reddit',
	lobsters: 'Lobsters',
	page: '',
};

const sourceLabel = $derived(
	citation.platform === 'page' ? t('citationPageComment') : PLATFORM_LABELS[citation.platform],
);

function close() {
	open = false;
	toggle?.focus();
}

function handleWindowKeydown(event: KeyboardEvent) {
	if (open && event.key === 'Escape') close();
}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<span class="relative inline-block">
  <button
    type="button"
    bind:this={toggle}
    onclick={() => { open = !open; }}
    class="cursor-pointer align-super text-[0.65rem] font-semibold text-stone-500 underline decoration-dotted decoration-stone-400 underline-offset-2 transition-colors hover:text-stone-900"
    aria-label={t('citationSource', String(index))}
    aria-haspopup="dialog"
    aria-expanded={open}
  >
    {index}
  </button>

  {#if open}
    <!-- Backdrop to close on outside click; kept out of the tab order. -->
    <button
      type="button"
      tabindex="-1"
      class="fixed inset-0 z-10 cursor-default"
      aria-label={t('closeMenu')}
      onclick={close}
    ></button>
    <span
      role="dialog"
      aria-label={t('citationSource', String(index))}
      class="absolute left-0 top-full z-20 mt-1 block w-64 rounded-md border border-stone-200 bg-white px-3 py-2 text-left"
    >
      <span class="block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {sourceLabel}
      </span>
      <span class="mt-1 block text-xs text-stone-500">
        {#if citation.author}{citation.author}{/if}
        {#if citation.score != null}&nbsp;· {citation.score} {t('points')}{/if}
      </span>
      <span class="mt-1.5 block text-xs leading-5 text-stone-700">{citation.quote}</span>
      {#if citation.permalink}
        <a
          href={citation.permalink}
          target="_blank"
          rel="noopener noreferrer"
          class="mt-2 inline-block text-xs font-medium text-stone-600 underline underline-offset-4 hover:text-stone-900"
        >
          {t('openComment')}
        </a>
      {/if}
    </span>
  {/if}
</span>
