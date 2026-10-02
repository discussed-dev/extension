<script lang="ts">
import { t } from '@/lib/i18n';

interface Props {
	url: string;
}

let { url }: Props = $props();

const searchHref = $derived(`https://www.reddit.com/search/?q=url%3A${encodeURIComponent(url)}`);
</script>

<div class="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-200/70 bg-amber-50 px-4 py-2 text-xs text-amber-800" role="status">
  <span>{t('redditSignInRequired')}</span>
  <a
    href="https://www.reddit.com/login/"
    target="_blank"
    rel="noopener noreferrer"
    class="font-medium underline decoration-amber-300 hover:decoration-amber-600"
  >
    {t('redditSignIn')}
  </a>
  <a
    href={searchHref}
    target="_blank"
    rel="noopener noreferrer"
    class="font-medium underline decoration-amber-300 hover:decoration-amber-600"
  >
    {t('redditSearch')}
  </a>
</div>
