<script lang="ts">
import type { TokenUsage } from '@/lib/llm';

interface Props {
	summary: string;
	model: string;
	createdAt: string;
	usage?: TokenUsage;
	onBack: () => void;
	onRegenerate: () => void;
	regenerating: boolean;
}

let { summary, model, createdAt, usage, onBack, onRegenerate, regenerating }: Props = $props();

const tokenInfo = $derived(
	usage ? `${(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens` : '',
);

const blocks = $derived(
	summary
		.split(/\n\s*\n/)
		.map((block) => block.trim())
		.filter(Boolean),
);

const verdict = $derived(blocks[0] ?? summary.trim());
const supportingBlocks = $derived(blocks.slice(1));

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function renderMarkdown(text: string): string {
	return escapeHtml(text)
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-700 underline decoration-sky-300 underline-offset-4 hover:text-sky-900">$1</a>',
		);
}
</script>

<div class="w-[25rem] rounded-[1.75rem] border border-stone-200/80 bg-white/95 text-stone-900 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
  <div class="flex items-start justify-between gap-4 border-b border-stone-200/80 px-4 py-4">
    <div class="flex min-w-0 items-start gap-2">
      <button
        type="button"
        onclick={onBack}
        class="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-900"
        title="Back to overview"
        aria-label="Back to overview"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
          <path fill-rule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
        </svg>
      </button>
      <div class="min-w-0">
        <p class="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-stone-500">Summary</p>
        <h1 class="mt-2 text-lg font-semibold tracking-tight text-stone-950">Community read, condensed.</h1>
        <p class="mt-1 text-sm leading-5 text-stone-600">Start with the verdict, then skim the supporting themes.</p>
      </div>
    </div>

    <button
      type="button"
      onclick={onRegenerate}
      disabled={regenerating}
      class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {regenerating ? 'Generating...' : 'Regenerate'}
    </button>
  </div>

  <div class="max-h-[28rem] space-y-4 overflow-y-auto px-4 py-4">
    <section class="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-4">
      <p class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">Verdict</p>
      <div class="mt-3 text-[0.95rem] font-medium leading-7 text-stone-900">
        {@html renderMarkdown(verdict)}
      </div>
    </section>

    {#if supportingBlocks.length > 0}
      <section class="space-y-4">
        {#each supportingBlocks as block}
          <p class="text-sm leading-7 text-stone-700">
            {@html renderMarkdown(block)}
          </p>
        {/each}
      </section>
    {/if}
  </div>

  <div class="flex flex-wrap items-center gap-2 border-t border-stone-200/80 px-4 py-3 text-xs text-stone-500">
    <span class="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1">{model}</span>
    <span class="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1">
      {new Date(createdAt).toLocaleDateString()}
    </span>
    {#if tokenInfo}
      <span class="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1">{tokenInfo}</span>
    {/if}
  </div>
</div>
