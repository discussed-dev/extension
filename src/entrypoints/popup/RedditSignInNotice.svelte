<script lang="ts">
import { t } from '@/lib/i18n';
import { requestRedditSearchAccess } from '@/lib/reddit-access';

interface Props {
	url: string;
	/** True when old.reddit.com host access has not been granted yet; false means the user must sign in. */
	needsPermission: boolean;
	onGranted: () => void;
}

let { url, needsPermission, onGranted }: Props = $props();

const searchHref = $derived(`https://www.reddit.com/search/?q=url%3A${encodeURIComponent(url)}`);

async function grant() {
	try {
		if (await requestRedditSearchAccess()) onGranted();
	} catch (e) {
		console.error('[discussed] Reddit permission request failed:', e);
	}
}
</script>

<div class="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-200/70 bg-amber-50 px-4 py-2 text-xs text-amber-800" role="status">
  {#if needsPermission}
    <span>{t('redditAccessRequired')}</span>
    <button
      type="button"
      onclick={grant}
      class="font-medium underline decoration-amber-300 hover:decoration-amber-600"
    >
      {t('redditGrantAccess')}
    </button>
  {:else}
    <span>{t('redditSignInRequired')}</span>
    <a
      href="https://www.reddit.com/login/"
      target="_blank"
      rel="noopener noreferrer"
      class="font-medium underline decoration-amber-300 hover:decoration-amber-600"
    >
      {t('redditSignIn')}
    </a>
  {/if}
  <span aria-hidden="true">&middot;</span>
  <a
    href={searchHref}
    target="_blank"
    rel="noopener noreferrer"
    class="font-medium underline decoration-amber-300 hover:decoration-amber-600"
  >
    {t('redditSearch')}
  </a>
</div>
