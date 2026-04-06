<script lang="ts">
import type { Discussion, Platform } from '@/lib/types';

interface Props {
	discussion: Discussion;
}

let { discussion }: Props = $props();

const PLATFORM_COLORS: Record<Platform, string> = {
	hn: 'bg-orange-100 text-orange-700',
	reddit: 'bg-blue-100 text-blue-700',
	lobsters: 'bg-red-100 text-red-700',
};

const PLATFORM_LABELS: Record<Platform, string> = {
	hn: 'HN',
	reddit: 'Reddit',
	lobsters: 'Lobsters',
};

function timeAgo(iso: string): string {
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
	if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d`;
	if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo`;
	return `${Math.floor(seconds / 31536000)}y`;
}

const label = $derived(
	discussion.subreddit ? `r/${discussion.subreddit}` : PLATFORM_LABELS[discussion.platform],
);
</script>

<a
  href={discussion.url}
  target="_blank"
  rel="noopener noreferrer"
  class="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors"
>
  <span class="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium {PLATFORM_COLORS[discussion.platform]}">
    {label}
  </span>

  <span class="truncate text-sm text-gray-800">{discussion.title}</span>

  <span class="ml-auto flex items-center gap-2 shrink-0 text-xs text-gray-400">
    <span>{discussion.points} pts</span>
    <span>{discussion.commentCount} 💬</span>
    <span>{timeAgo(discussion.createdAt)}</span>
  </span>
</a>
