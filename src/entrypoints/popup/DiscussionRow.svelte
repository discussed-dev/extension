<script lang="ts">
import type { Discussion } from '@/lib/types';
import PlatformMark from './PlatformMark.svelte';

interface Props {
	discussion: Discussion;
	useOldReddit?: boolean;
	openInNewTab?: boolean;
}

let { discussion, useOldReddit = false, openInNewTab = true }: Props = $props();

function timeAgo(iso: string): string {
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) return 'now';
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
	if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d`;
	if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo`;
	return `${Math.floor(seconds / 31536000)}y`;
}

const href = $derived(
	useOldReddit && discussion.platform === 'reddit'
		? discussion.url.replace('www.reddit.com', 'old.reddit.com')
		: discussion.url,
);
</script>

<a
  {href}
  target={openInNewTab ? '_blank' : '_self'}
  rel="noopener noreferrer"
  class="group flex min-w-0 items-start gap-1.5 rounded-[0.95rem] border border-stone-200 bg-white px-2.5 py-1.5 transition-colors hover:border-stone-300 hover:bg-stone-50"
>
  <div class="mt-0.5 shrink-0">
    <PlatformMark platform={discussion.platform} sizeClass="size-4" />
  </div>

  <div class="min-w-0 flex-1">
    <div class="flex items-start gap-1.5">
      <div class="min-w-0 flex-1">
        <span class="line-clamp-2 min-w-0 text-[0.9rem] font-medium leading-[1.12rem] text-stone-900 group-hover:text-stone-950">
          {discussion.title}
        </span>
      </div>
      <div class="ml-1 shrink-0 text-right">
        <span class="inline-flex text-[0.64rem] font-medium leading-none text-stone-500">
          {timeAgo(discussion.createdAt)}
        </span>
      </div>
    </div>

    <span class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.68rem] text-stone-500">
      <span class="font-semibold tabular-nums text-stone-800">{discussion.commentCount.toLocaleString()} comments</span>
      <span class="tabular-nums text-stone-600">{discussion.points.toLocaleString()} points</span>
      {#if discussion.subreddit}
        <span class="truncate text-stone-600">r/{discussion.subreddit}</span>
      {/if}
    </span>
  </div>
</a>
