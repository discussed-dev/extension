<script lang="ts">
interface Props {
	summary: string;
	model: string;
	createdAt: string;
	onBack: () => void;
	onRegenerate: () => void;
	regenerating: boolean;
}

let { summary, model, createdAt, onBack, onRegenerate, regenerating }: Props = $props();
</script>

<div class="w-96 bg-white text-gray-900">
  <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
    <button
      onclick={onBack}
      class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      title="Back to overview"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
        <path fill-rule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
      </svg>
    </button>
    <span class="text-sm font-medium">Summary</span>
  </div>

  <div class="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
    {summary}
  </div>

  <div class="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
    <span>{model} &middot; {new Date(createdAt).toLocaleDateString()}</span>
    <button
      onclick={onRegenerate}
      disabled={regenerating}
      class="px-3 py-1 rounded-md text-indigo-500 hover:bg-indigo-50 transition-colors disabled:opacity-50"
    >
      {regenerating ? 'Generating...' : 'Regenerate'}
    </button>
  </div>
</div>
