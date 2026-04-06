<script lang="ts">
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
		label: 'Google Discussions',
		href: `https://www.google.com/search?q=${encodeURIComponent(url)}&udm=18`,
	},
]);
</script>

<div class="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100">
  <span class="text-[10px] text-gray-400 uppercase tracking-wide">Search elsewhere</span>
  {#each links as link}
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      class="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
    >
      {link.label}
    </a>
  {/each}
</div>
