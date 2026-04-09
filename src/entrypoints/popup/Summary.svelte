<script lang="ts">
import { buildObsidianUri, formatMarkdownExport, formatPlainTextExport } from '@/lib/export';
import { t } from '@/lib/i18n';
import type { TokenUsage } from '@/lib/llm';
import type { Platform } from '@/lib/types';

interface DiscussionExport {
	platform: Platform;
	title: string;
	url: string;
	commentCount: number;
	subreddit?: string;
}

interface Props {
	summary: string;
	model: string;
	createdAt: string;
	usage?: TokenUsage;
	pageTitle: string;
	pageUrl: string;
	discussions: DiscussionExport[];
	obsidianVault: string;
	onBack: () => void;
	onRegenerate: () => void;
	regenerating: boolean;
}

let {
	summary,
	model,
	createdAt,
	usage,
	pageTitle,
	pageUrl,
	discussions,
	obsidianVault,
	onBack,
	onRegenerate,
	regenerating,
}: Props = $props();

let copied = $state(false);
let showExportMenu = $state(false);

const tokenInfo = $derived(
	usage ? `${(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens` : '',
);

const exportInput = $derived({
	pageTitle,
	pageUrl,
	date: new Date(createdAt).toISOString().slice(0, 10),
	summary,
	discussions,
});

function markCopied() {
	copied = true;
	showExportMenu = false;
	setTimeout(() => {
		copied = false;
	}, 2000);
}

async function copyAsMarkdown() {
	await navigator.clipboard.writeText(formatMarkdownExport(exportInput));
	markCopied();
}

async function copyAsPlainText() {
	await navigator.clipboard.writeText(formatPlainTextExport(exportInput));
	markCopied();
}

function openInObsidian() {
	if (!obsidianVault) return;
	const title = `Discussed: ${pageTitle}`;
	const content = formatMarkdownExport(exportInput);
	const uri = buildObsidianUri(obsidianVault, title, content);
	window.open(uri, '_blank');
	showExportMenu = false;
}

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

<div class="w-[28rem] overflow-hidden border border-stone-200/80 bg-white/95 text-stone-900 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
  <div class="flex items-center justify-between gap-4 border-b border-stone-200/80 px-4 py-3">
    <div class="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onclick={onBack}
        class="inline-flex size-8.5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-900"
        title="Back to overview"
        aria-label="Back to overview"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
          <path fill-rule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
        </svg>
      </button>
      <div class="min-w-0">
        <p class="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-stone-500">{t('summary')}</p>
      </div>
    </div>

    <div class="flex shrink-0 gap-2">
      <!-- Split export button -->
      <div class="relative flex">
        <button
          type="button"
          onclick={copyAsMarkdown}
          class="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-l-full border border-r-0 border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-950"
          title={t('copyMarkdown')}
        >
          {copied ? t('copied') : t('copy')}
        </button>
        <button
          type="button"
          onclick={() => { showExportMenu = !showExportMenu; }}
          class="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-r-full border border-stone-200 bg-white px-2 text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-900"
          title="More export options"
          aria-label="More export options"
          aria-expanded={showExportMenu}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
            <path fill-rule="evenodd" d="M3.22 5.97a.75.75 0 0 1 1.06 0L8 9.69l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.03a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
        </button>

        {#if showExportMenu}
          <!-- Backdrop to close menu on outside click -->
          <button
            type="button"
            class="fixed inset-0 z-10 cursor-default"
            aria-label="Close menu"
            onclick={() => { showExportMenu = false; }}
          ></button>
          <div class="absolute right-0 top-full z-20 mt-1 min-w-44 overflow-hidden rounded-[0.85rem] border border-stone-200 bg-white shadow-lg">
            <button
              type="button"
              onclick={copyAsMarkdown}
              class="flex w-full cursor-pointer items-center px-3.5 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-950"
            >
              {t('copyMarkdown')}
            </button>
            <button
              type="button"
              onclick={copyAsPlainText}
              class="flex w-full cursor-pointer items-center px-3.5 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-950"
            >
              {t('copyPlainText')}
            </button>
            {#if obsidianVault}
              <div class="border-t border-stone-100"></div>
              <button
                type="button"
                onclick={openInObsidian}
                class="flex w-full cursor-pointer items-center px-3.5 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-950"
              >
                {t('openInObsidian')}
              </button>
            {/if}
          </div>
        {/if}
      </div>

      <button
        type="button"
        onclick={onRegenerate}
        disabled={regenerating}
        class="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {regenerating ? t('generating') : t('regenerate')}
      </button>
    </div>
  </div>

  <div class="max-h-[28rem] space-y-3 overflow-y-auto px-4 py-3">
    <section class="rounded-[1.35rem] border border-stone-200 bg-stone-50 px-4 py-3">
      <p class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">{t('verdict')}</p>
      <div class="mt-2 text-[0.95rem] font-medium leading-6 text-stone-900">
        {@html renderMarkdown(verdict)}
      </div>
    </section>

    {#if supportingBlocks.length > 0}
      <section class="space-y-3">
        {#each supportingBlocks as block}
          <p class="text-sm leading-6 text-stone-700">
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
