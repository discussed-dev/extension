<script lang="ts">
import { t } from '@/lib/i18n';

interface Props {
	url: string;
	title?: string;
	showSubmit?: boolean;
}

let { url, title = '', showSubmit = false }: Props = $props();

const searchLinks = $derived([
	{
		label: 'X/Twitter',
		href: `https://x.com/search?q=url%3A${encodeURIComponent(url)}&f=live`,
	},
	{
		label: 'Google Forums',
		href: `https://www.google.com/search?q=${encodeURIComponent(url)}&udm=18`,
	},
]);

const submitLinks = $derived([
	{
		label: 'Hacker News',
		href: `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(url)}&t=${encodeURIComponent(title)}`,
	},
	{
		label: 'Reddit',
		href: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
	},
	{
		label: 'Lobsters',
		href: `https://lobste.rs/stories/new?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
	},
]);
</script>

{#if showSubmit}
<div class="mt-2 flex flex-wrap items-center gap-1.5">
  <span class="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-stone-500">{t('submitTo')}</span>
  {#each submitLinks as link}
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-8 items-center rounded-full border border-stone-200 bg-white px-2.5 text-[0.72rem] font-medium text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-950"
    >
      {link.label}
    </a>
  {/each}
</div>
{/if}
<div class="mt-2 flex flex-wrap items-center gap-1.5">
  <span class="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-stone-500">{t('searchElsewhere')}</span>
  {#each searchLinks as link}
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-8 items-center rounded-full border border-stone-200 bg-white px-2.5 text-[0.72rem] font-medium text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-950"
    >
      {link.label}
    </a>
  {/each}
</div>
