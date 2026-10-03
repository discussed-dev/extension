<script lang="ts">
type Props = {
	host: string;
};

let { host }: Props = $props();
</script>

<!-- Mark only: the SVG wordmark depended on Segoe UI being installed and dominated
     the header, and the user already knows which extension they clicked. -->
<div class="flex min-w-0 items-center gap-2">
	<svg viewBox="88 108 244 250" class="size-7 shrink-0 text-stone-800" role="img" aria-label="Discussed">
		<ellipse cx="154" cy="234" rx="62" ry="42" fill="#DDBE87" />
		<ellipse cx="258" cy="152" rx="58" ry="36" fill="#F56B14" transform="rotate(-24 258 152)" />
		<ellipse cx="266" cy="310" rx="60" ry="38" fill="#F05A24" transform="rotate(24 266 310)" />
		<path d="M220 190v84h14c23 0 39-4 52-12 14-9 21-19 21-32s-7-23-21-32c-13-8-29-12-52-12h-14Z" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="miter" />
		<path d="M268 202l6 13 13 6-13 6-6 13-6-13-13-6 13-6 6-13Z" fill="#DDBE87" />
	</svg>

	<span class="truncate text-sm font-medium text-stone-700">{host}</span>
</div>
