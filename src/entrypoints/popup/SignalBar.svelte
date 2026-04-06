<script lang="ts">
import { t } from '@/lib/i18n';
import type { Discussion, Platform } from '@/lib/types';
import PlatformMark from './PlatformMark.svelte';

interface Props {
	discussions: Discussion[];
}

let { discussions }: Props = $props();

function jumpToPlatform(platform: Platform): void {
	document.getElementById(`platform-${platform}`)?.scrollIntoView({
		block: 'start',
		behavior: 'smooth',
	});
}

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

const timeSpan = $derived.by(() => {
	const dates = discussions.map((discussion) => new Date(discussion.createdAt).getFullYear());
	const min = Math.min(...dates);
	const max = Math.max(...dates);
	return min === max ? String(min) : `${min}\u2013${max}`;
});

const PLATFORM_LABELS: Record<Platform, string> = {
	hn: 'HN',
	reddit: 'Reddit',
	lobsters: 'Lobsters',
};

const activePlatforms = $derived(
	Object.entries(platformCounts).filter(([, count]) => count > 0) as Array<[Platform, number]>,
);

const coverageLabel = $derived.by(() => {
	if (activePlatforms.length === 0) return 'no active sources';
	if (activePlatforms.length === 1) return `${PLATFORM_LABELS[activePlatforms[0][0]]} only`;
	return `${activePlatforms.length} communities`;
});

const timeSpanLabel = $derived.by(() => {
	if (discussions.length === 0) return '';
	const dates = discussions.map((discussion) => new Date(discussion.createdAt).getFullYear());
	const latest = Math.max(...dates);
	return timeSpan === String(latest) ? `active in ${latest}` : `${timeSpan}`;
});
</script>

<section class="border-b border-stone-200/80 bg-stone-50/80 px-4 py-2">
  <div class="flex items-center justify-between gap-3">
    <p class="min-w-0 text-[0.82rem] font-medium text-stone-900">
      {discussions.length} {t('threads')}, {totalComments.toLocaleString()} {t('comments')}, {totalPoints.toLocaleString()} {t('points')}
    </p>

    <div class="shrink-0 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[0.7rem] font-medium text-stone-700">
      {timeSpanLabel}
    </div>
  </div>

  <div class="mt-1.5 flex flex-wrap gap-1.5">
    {#each activePlatforms as [platform, count]}
      <button
        type="button"
        onclick={() => jumpToPlatform(platform)}
        class="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[0.7rem] font-medium text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-950"
      >
        <PlatformMark {platform} sizeClass="size-3.5" />
        {PLATFORM_LABELS[platform]} {count}
      </button>
    {/each}
    <span class="inline-flex items-center rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[0.7rem] text-stone-500">
      {coverageLabel}
    </span>
  </div>
</section>
