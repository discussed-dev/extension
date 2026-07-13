<script lang="ts">
import { t } from '@/lib/i18n';
import type { Discussion } from '@/lib/types';

interface Props {
	discussions: Discussion[];
}

let { discussions }: Props = $props();

const totalComments = $derived(discussions.reduce((sum, d) => sum + d.commentCount, 0));
</script>

<div class="flex items-center gap-1.5 border-b border-stone-200/80 bg-stone-50/60 px-4 py-1.5 text-[0.72rem] text-stone-500">
  <span class="font-semibold tabular-nums text-stone-800">{discussions.length}</span>
  <span>{t('discussions')}</span>
  <span class="text-stone-300">·</span>
  <span class="font-semibold tabular-nums text-stone-800">{totalComments.toLocaleString()}</span>
  <span>{t('comments')}</span>
</div>
