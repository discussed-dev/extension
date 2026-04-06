<script lang="ts">
import { t } from '@/lib/i18n';

interface Props {
	url: string;
}

let { url }: Props = $props();

const links = $derived([
	{
		label: 'X/Twitter',
		href: `https://x.com/search?q=url%3A${encodeURIComponent(url)}&f=live`,
	},
	{
		label: 'Google Forums',
		href: `https://www.google.com/search?q=${encodeURIComponent(url)}&udm=18`,
	},
]);
</script>

<div class="mt-4 flex flex-wrap items-center gap-2">
  <span class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">{t('searchElsewhere')}</span>
  {#each links as link}
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-9 items-center rounded-full border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-950"
    >
      {link.label}
    </a>
  {/each}
</div>
