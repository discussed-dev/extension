<script lang="ts">
import type { Citation } from '@/lib/grounding';
import { t } from '@/lib/i18n';

interface Props {
	citation: Citation;
	index: number;
}

let { citation, index }: Props = $props();

const POPOVER_WIDTH = 256; // w-64

let open = $state(false);
let alignRight = $state(false);
let toggle = $state<HTMLButtonElement | null>(null);

/**
 * The popup is only 28rem wide, so a popover left-aligned to a chip near the
 * right edge would run off and make the summary scroll sideways. Flip to
 * right-alignment in that case; a chip far enough right to need the flip is
 * always far enough right for the popover to fit going leftwards.
 */
function toggleOpen() {
	if (!open && toggle) {
		const { left } = toggle.getBoundingClientRect();
		alignRight = left + POPOVER_WIDTH > document.documentElement.clientWidth;
	}
	open = !open;
}

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

<!-- No whitespace between these tags: a newline here becomes a text node, which
     would put a space between the chip and the punctuation after it. --><span
  class="relative inline-block"
><button
    type="button"
    bind:this={toggle}
    onclick={toggleOpen}
    class="cursor-pointer align-super text-[0.65rem] font-semibold text-stone-500 underline decoration-dotted decoration-stone-400 underline-offset-2 transition-colors hover:text-stone-900"
    aria-label={t('citationSource', String(index))}
    aria-haspopup="dialog"
    aria-expanded={open}
  >{index}</button>{#if open}<!-- Backdrop to close on outside click; kept out of the tab order. --><button
      type="button"
      tabindex="-1"
      class="fixed inset-0 z-10 cursor-default"
      aria-label={t('closeMenu')}
      onclick={close}
    ></button><span
      role="dialog"
      aria-label={t('citationSource', String(index))}
      class="absolute top-full z-20 mt-1 block w-64 rounded-md border border-stone-200 bg-white px-3 py-2 text-left {alignRight
        ? 'right-0'
        : 'left-0'}"
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
    </span>{/if}</span>
