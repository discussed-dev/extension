<script lang="ts">
import BrandMark from '@/components/BrandMark.svelte';

type Props = {
	host: string;
};

let { host }: Props = $props();
</script>

<div class="flex min-w-0 items-center gap-2">
	<BrandMark />
	<span class="truncate text-sm font-medium text-stone-700">{host}</span>
</div>
