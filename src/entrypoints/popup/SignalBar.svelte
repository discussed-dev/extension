<script lang="ts">
import type { Discussion, Platform } from '@/lib/types';

interface Props {
	discussions: Discussion[];
}

let { discussions }: Props = $props();

const totalComments = $derived(discussions.reduce((sum, d) => sum + d.commentCount, 0));
const totalPoints = $derived(discussions.reduce((sum, d) => sum + d.points, 0));

const platformCounts = $derived(
	discussions.reduce<Record<Platform, number>>(
		(acc, d) => {
			acc[d.platform]++;
			return acc;
		},
		{ hn: 0, reddit: 0, lobsters: 0 },
	),
);

const timeSpan = $derived(() => {
	const dates = discussions.map((d) => new Date(d.createdAt).getFullYear());
	const min = Math.min(...dates);
	const max = Math.max(...dates);
	return min === max ? String(min) : `${min}\u2013${max}`;
});

const PLATFORM_LABELS: Record<Platform, string> = {
	hn: 'HN',
	reddit: 'Reddit',
	lobsters: 'Lobsters',
};
</script>

<div class="flex items-center gap-3 px-4 py-3 bg-gray-50 text-xs text-gray-600 border-b border-gray-100">
  <span class="font-semibold text-gray-900">{discussions.length} discussions</span>
  <span>{totalComments.toLocaleString()} comments</span>
  <span>{totalPoints.toLocaleString()} pts</span>
  <span class="ml-auto text-gray-400">
    {#each Object.entries(platformCounts) as [platform, count]}
      {#if count > 0}
        <span class="ml-1.5">{PLATFORM_LABELS[platform as Platform]} {count}</span>
      {/if}
    {/each}
  </span>
</div>
