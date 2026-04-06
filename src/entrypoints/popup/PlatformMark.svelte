<script lang="ts">
import redditFavicon from '@/assets/reddit-favicon-64.png';
import type { Platform } from '@/lib/types';

interface Props {
	platform: Platform;
	sizeClass?: string;
}

let { platform, sizeClass = 'size-4' }: Props = $props();
</script>

{#if platform === 'hn'}
  <span class="inline-flex items-center justify-center rounded-[0.35rem] bg-[#ff6600] text-[0.6rem] font-bold leading-none text-white {sizeClass}">
    Y
  </span>
{:else if platform === 'reddit'}
  <span class="inline-flex items-center justify-center overflow-hidden rounded-full bg-[#ff4500] {sizeClass}">
    <img src={redditFavicon} alt="" class="block h-full w-full rounded-full object-cover" loading="eager" decoding="async" />
  </span>
{:else}
  <span class="inline-flex items-center justify-center rounded-[0.45rem] bg-[#d94b43]/12 text-[0.6rem] font-bold leading-none text-[#d94b43] {sizeClass}">
    L
  </span>
{/if}
