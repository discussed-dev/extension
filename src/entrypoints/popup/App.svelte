<script lang="ts">
import { syncToolbarBadgeForDiscussions } from '@/lib/badge';
import { cacheGet } from '@/lib/cache';
import { discoverDiscussions } from '@/lib/discovery';
import { t } from '@/lib/i18n';
import { type PageContent, injectAndExtract } from '@/lib/page-content';
import { type ResolvedDiscussion, isPlatformUrl, resolveLinkedUrl } from '@/lib/resolve-discussion';
import { type Settings, settings } from '@/lib/settings';
import { type SummaryResult, summarizeDiscussions } from '@/lib/summarize';
import { setToolbarBadge } from '@/lib/toolbar-action';
import type { Discussion, Platform } from '@/lib/types';
import { isBlacklisted, normalizeUrl } from '@/lib/url';
import DiscussionRow from './DiscussionRow.svelte';
import ExternalLinks from './ExternalLinks.svelte';
import PopupBrand from './PopupBrand.svelte';
import RedditSignInNotice from './RedditSignInNotice.svelte';
import Summary from './Summary.svelte';

type View = 'overview' | 'summary';

const PLATFORM_ORDER: Platform[] = ['hn', 'reddit', 'lobsters'];
const PLATFORM_LABELS: Record<Platform, string> = {
	hn: 'Hacker News',
	reddit: 'Reddit',
	lobsters: 'Lobsters',
};

let discussions = $state<Discussion[]>([]);
let loading = $state(true);
let refreshing = $state(false);
let loadError = $state(false);
let blocked = $state(false);
let currentUrl = $state('');
let currentTitle = $state('');
let currentTabId = $state<number | null>(null);
let view = $state<View>('overview');
let summaryResult = $state<SummaryResult | null>(null);
let summarizing = $state(false);
let summaryError = $state('');
let hasApiKey = $state(false);
let userSettings = $state<Settings | null>(null);
let lastPageContent = $state<PageContent | undefined>(undefined);
let resolved = $state<ResolvedDiscussion | null>(null);
let unavailable = $state<Platform[]>([]);
let signInRequired = $state<Platform[]>([]);

async function load() {
	loading = true;
	loadError = false;
	try {
		const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
		if (!tab?.url) return;
		currentUrl = tab.url;
		currentTitle = tab.title ?? '';
		currentTabId = typeof tab.id === 'number' ? tab.id : null;

		userSettings = await settings.getValue();
		hasApiKey = !!userSettings.apiKey;

		if (isBlacklisted(tab.url, userSettings.blacklist, userSettings.blacklistMode)) {
			blocked = true;
			discussions = [];
			unavailable = [];
			signInRequired = [];
			if (currentTabId != null) {
				await setToolbarBadge(browser, { tabId: currentTabId, text: '' });
			}
			return;
		}

		blocked = false;
		const resolveResult = await resolveLinkedUrl(tab.url);
		resolved = resolveResult;
		if (!resolveResult && isPlatformUrl(tab.url)) {
			discussions = [];
			unavailable = [];
			signInRequired = [];
			return;
		}
		const targetUrl = resolveResult?.linkedUrl ?? tab.url;
		const {
			discussions: allDiscussions,
			unavailable: sourcesDown,
			signInRequired: sourcesNeedingSignIn,
		} = await discoverDiscussions(targetUrl);
		unavailable = sourcesDown;
		signInRequired = sourcesNeedingSignIn;

		discussions = resolveResult
			? allDiscussions.filter(
					(d) =>
						!(d.externalId === resolveResult.discussionId && d.platform === resolveResult.platform),
				)
			: allDiscussions;

		if (currentTabId != null) {
			await syncToolbarBadgeForDiscussions(
				browser,
				currentTabId,
				discussions,
				userSettings.badgeDisplay,
			);
		}

		const cached = await cacheGet<SummaryResult>(`summary:${targetUrl}`);
		if (cached) summaryResult = cached;
	} catch (e) {
		console.error('[discussed] popup load error:', e);
		loadError = true;
	} finally {
		loading = false;
	}
}

async function refresh() {
	if (!currentUrl || currentTabId == null) return;
	refreshing = true;
	loadError = false;
	try {
		const currentSettings = userSettings ?? (await settings.getValue());
		userSettings = currentSettings;

		if (isBlacklisted(currentUrl, currentSettings.blacklist, currentSettings.blacklistMode)) {
			blocked = true;
			discussions = [];
			unavailable = [];
			signInRequired = [];
			await setToolbarBadge(browser, { tabId: currentTabId, text: '' });
			return;
		}

		blocked = false;
		const resolveResult = await resolveLinkedUrl(currentUrl);
		resolved = resolveResult;
		if (!resolveResult && isPlatformUrl(currentUrl)) {
			discussions = [];
			unavailable = [];
			signInRequired = [];
			return;
		}
		const targetUrl = resolveResult?.linkedUrl ?? currentUrl;
		const {
			discussions: allDiscussions,
			unavailable: sourcesDown,
			signInRequired: sourcesNeedingSignIn,
		} = await discoverDiscussions(targetUrl, { force: true });
		unavailable = sourcesDown;
		signInRequired = sourcesNeedingSignIn;

		discussions = resolveResult
			? allDiscussions.filter(
					(d) =>
						!(d.externalId === resolveResult.discussionId && d.platform === resolveResult.platform),
				)
			: allDiscussions;

		await syncToolbarBadgeForDiscussions(
			browser,
			currentTabId,
			discussions,
			currentSettings.badgeDisplay,
		);
	} catch (e) {
		console.error('[discussed] popup refresh error:', e);
	} finally {
		refreshing = false;
	}
}

async function toggleBlock() {
	if (!currentUrl || !userSettings) return;
	const host = new URL(currentUrl).hostname.replace(/^www\./, '');
	const domains = userSettings.blacklist
		.split('\n')
		.map((d) => d.trim())
		.filter(Boolean);

	const isCurrentlyListed = domains.some((d) => d.toLowerCase() === host.toLowerCase());

	if (userSettings.blacklistMode === 'whitelist') {
		if (!isCurrentlyListed) {
			domains.push(host);
		}
	} else {
		if (isCurrentlyListed) {
			const idx = domains.findIndex((d) => d.toLowerCase() === host.toLowerCase());
			domains.splice(idx, 1);
		}
	}

	userSettings.blacklist = domains.join('\n');
	await settings.setValue(userSettings);
	blocked = false;
	await refresh();
}

async function blockSite() {
	if (!currentUrl || !userSettings) return;
	const host = new URL(currentUrl).hostname.replace(/^www\./, '');
	const domains = userSettings.blacklist
		.split('\n')
		.map((d) => d.trim())
		.filter(Boolean);

	const isCurrentlyListed = domains.some((d) => d.toLowerCase() === host.toLowerCase());

	if (userSettings.blacklistMode === 'blacklist') {
		if (!isCurrentlyListed) {
			domains.push(host);
		}
	} else {
		if (isCurrentlyListed) {
			const idx = domains.findIndex((d) => d.toLowerCase() === host.toLowerCase());
			domains.splice(idx, 1);
		}
	}

	userSettings.blacklist = domains.join('\n');
	await settings.setValue(userSettings);
	blocked = true;
	discussions = [];
	if (currentTabId != null) {
		await setToolbarBadge(browser, { tabId: currentTabId, text: '' });
	}
}

async function doSummarize(force = false) {
	const summarizeUrl = resolved?.linkedUrl ?? currentUrl;
	if (!summarizeUrl || discussions.length === 0) return;
	summarizing = true;
	summaryError = '';
	try {
		let pageContent = undefined;
		if (currentTabId != null) {
			pageContent = await injectAndExtract(currentTabId);
		}
		lastPageContent = pageContent;
		summaryResult = await summarizeDiscussions(summarizeUrl, discussions, { force, pageContent });
		view = 'summary';
	} catch (e) {
		summaryError = e instanceof Error ? e.message : t('summarizationFailed');
	} finally {
		summarizing = false;
	}
}

const unavailableLabel = $derived(unavailable.map((p) => PLATFORM_LABELS[p]).join(', '));

// Match what discovery searched: the same normalization, so the Reddit search link finds the same threads.
const redditSearchUrl = $derived.by(() => {
	const target = resolved?.linkedUrl ?? currentUrl;
	if (!target) return '';
	try {
		return normalizeUrl(target, { keepQueryString: !(userSettings?.ignoreQueryString ?? true) });
	} catch {
		return target;
	}
});

const sorted = $derived([...discussions].sort((a, b) => b.commentCount - a.commentCount));

const groupedDiscussions = $derived.by(() =>
	PLATFORM_ORDER.map((platform) => ({
		platform,
		label: PLATFORM_LABELS[platform],
		items: sorted.filter((discussion) => discussion.platform === platform),
	})).filter((group) => group.items.length > 0),
);

const currentHost = $derived.by(() => {
	if (!currentUrl) return t('thisPage');
	try {
		return new URL(currentUrl).hostname.replace(/^www\./, '');
	} catch {
		return currentUrl;
	}
});

const resolvedHost = $derived.by(() => {
	if (!resolved) return '';
	try {
		const url = new URL(resolved.linkedUrl);
		const host = url.hostname.replace(/^www\./, '');
		const path = url.pathname === '/' ? '' : url.pathname;
		const truncated = path.length > 30 ? `${path.slice(0, 30)}...` : path;
		return `${host}${truncated}`;
	} catch {
		return resolved.linkedUrl;
	}
});

// Nothing to add when the button already says "View summary".
const ctaDescription = $derived.by(() => {
	if (summaryResult) {
		return '';
	}
	if (!hasApiKey) {
		return t('configureApiKey');
	}
	return discussions.length === 1
		? t('discussionReadyOne')
		: t('discussionsReadyMany', String(discussions.length));
});

load();
</script>

{#if view === 'summary' && summaryResult}
  <Summary
    summary={summaryResult.summary}
    model={summaryResult.model}
    createdAt={summaryResult.createdAt}
    usage={summaryResult.usage}
    citations={summaryResult.citations}
    pageTitle={currentTitle}
    pageUrl={currentUrl}
    discussions={discussions.map((d) => ({
      platform: d.platform,
      title: d.title,
      url: d.url,
      commentCount: d.commentCount,
      subreddit: d.subreddit,
    }))}
    obsidianVault={userSettings?.obsidianVault ?? ''}
    onBack={() => { view = 'overview'; }}
    onRegenerate={() => doSummarize(true)}
    regenerating={summarizing}
    hasArticleContext={!!lastPageContent?.articleText}
    hasPageComments={!!lastPageContent?.comments?.length}
    platforms={[...new Set(discussions.map(d => d.platform))]}
  />
{:else}
  <main class="flex max-h-[42rem] w-[28rem] min-h-48 flex-col overflow-hidden border border-stone-200/80 bg-white text-stone-900">
    <header class="flex items-center justify-between gap-3 border-b border-stone-200/80 px-4 py-2.5">
      <PopupBrand host={currentHost} />

      <div class="flex shrink-0 gap-1.5">
        {#if !loading && !blocked && currentUrl}
          <!-- Per-site control, so it lives with the other per-popup controls rather
               than as a stray link under the footer, where it wrapped for most hosts. -->
          <button
            type="button"
            onclick={blockSite}
            class="inline-flex size-8.5 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-950"
            aria-label={t('blockDomain', currentHost)}
            title={t('blockDomain', currentHost)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
              <path fill-rule="evenodd" d="M5.965 4.904l9.131 9.131a6.5 6.5 0 0 0-9.131-9.131Zm8.07 10.192L4.904 5.965a6.5 6.5 0 0 0 9.131 9.131ZM4.343 4.343a8 8 0 1 1 11.314 11.314A8 8 0 0 1 4.343 4.343Z" clip-rule="evenodd" />
            </svg>
          </button>
        {/if}
        <button
          type="button"
          onclick={refresh}
          class="inline-flex size-8.5 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('refreshScan')}
          title={t('refreshScan')}
          disabled={loading || refreshing}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5 {refreshing ? 'animate-spin' : ''}">
            <path fill-rule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.681.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-.908l.84.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44.908l-.84-.84v1.546a.75.75 0 0 1-1.5 0V9.432a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.681.75.75 0 0 1 1.025-.274Z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          type="button"
          onclick={() => browser.runtime.openOptionsPage()}
          class="inline-flex size-8.5 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-950"
          aria-label={t('settings')}
          title={t('settings')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
            <path fill-rule="evenodd" d="M6.455 1.45A.5.5 0 0 1 6.952 1h2.096a.5.5 0 0 1 .497.45l.186 1.858a4.996 4.996 0 0 1 1.466.848l1.703-.769a.5.5 0 0 1 .639.206l1.048 1.814a.5.5 0 0 1-.142.656l-1.517 1.09a5.026 5.026 0 0 1 0 1.694l1.517 1.09a.5.5 0 0 1 .142.656l-1.048 1.814a.5.5 0 0 1-.639.206l-1.703-.769c-.433.36-.928.652-1.466.848l-.186 1.858a.5.5 0 0 1-.497.45H6.952a.5.5 0 0 1-.497-.45l-.186-1.858a4.993 4.993 0 0 1-1.466-.848l-1.703.769a.5.5 0 0 1-.639-.206L1.413 11.77a.5.5 0 0 1 .142-.656l1.517-1.09a5.026 5.026 0 0 1 0-1.694l-1.517-1.09a.5.5 0 0 1-.142-.656L2.46 4.77a.5.5 0 0 1 .639-.206l1.703.769c.433-.36.928-.652 1.466-.848l.186-1.858ZM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </header>

    {#if loading}
      <!-- Skeleton shaped like the list it precedes: a group label and two rows. -->
      <div class="px-4 py-3" role="status" aria-live="polite">
        <div class="animate-pulse space-y-3" aria-hidden="true">
          <div class="h-2.5 w-24 rounded-sm bg-stone-200"></div>
          {#each [0, 1] as _ (_)}
            <div class="flex items-start gap-2 py-1">
              <div class="flex w-9 shrink-0 flex-col items-center gap-1.5">
                <div class="size-4 rounded-sm bg-stone-200"></div>
                <div class="h-2 w-5 rounded-sm bg-stone-200"></div>
              </div>
              <div class="min-w-0 flex-1 space-y-2">
                <div class="h-3.5 w-11/12 rounded-sm bg-stone-200"></div>
                <div class="h-2.5 w-2/5 rounded-sm bg-stone-200"></div>
              </div>
            </div>
          {/each}
        </div>
        <p class="mt-4 text-xs text-stone-500">{t('searching')} {t('searchingHint')}</p>
      </div>
    {:else if loadError}
      <section class="px-4 py-6">
        <div class="rounded-md border border-dashed border-stone-300 bg-stone-50 px-4 py-5" role="status" aria-live="polite">
          <p class="text-sm leading-6 text-stone-700">{t('loadFailed')}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onclick={load}
              class="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800"
            >
              {t('scanAgain')}
            </button>
          </div>
        </div>
      </section>
    {:else if blocked}
      <section class="px-4 py-6">
        <div class="rounded-md border border-dashed border-stone-300 bg-stone-50 px-4 py-5">
          <p class="text-base font-semibold tracking-tight text-stone-950">{t('domainFiltered')}</p>
          <p class="mt-2 text-sm leading-6 text-stone-600">
            {userSettings?.blacklistMode === 'whitelist'
              ? t('domainFilteredWhitelistHint', currentHost)
              : t('domainFilteredBlacklistHint', currentHost)}
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onclick={toggleBlock}
              class="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800"
            >
              {t('unblockDomain', currentHost)}
            </button>
          </div>
        </div>
      </section>
    {:else if discussions.length === 0}
      {#if signInRequired.includes('reddit')}
        <RedditSignInNotice url={redditSearchUrl} />
      {/if}
      <section class="px-4 py-6">
        <div class="rounded-md border border-dashed border-stone-300 bg-stone-50 px-4 py-5">
          {#if unavailable.length > 0}
            <p class="text-base font-semibold tracking-tight text-stone-950">{t('sourceUnavailable', unavailableLabel)}</p>
            <p class="mt-2 text-sm leading-6 text-stone-600">
              {t('sourceUnavailableHint')}
            </p>
          {:else}
            <p class="text-base font-semibold tracking-tight text-stone-950">{t('noDiscussions')}</p>
            <p class="mt-2 text-sm leading-6 text-stone-600">
              {t('noDiscussionsHint', currentHost)}
            </p>
          {/if}
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onclick={refresh}
              class="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800"
            >
              {t('scanAgain')}
            </button>
          </div>
        </div>
        <ExternalLinks url={currentUrl} title={currentTitle} showSubmit />
      </section>
    {:else}
      {#if resolved}
        <div class="border-b border-stone-200/80 bg-stone-50/60 px-4 py-2">
          <p class="text-2xs font-medium text-stone-500">
            {t('linkedFrom', PLATFORM_LABELS[resolved.platform])}
          </p>
          <a
            href={resolved.linkedUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-stone-700 underline decoration-stone-300 hover:text-stone-900 hover:decoration-stone-500"
          >
            {resolvedHost}
          </a>
        </div>
      {/if}
      {#if unavailable.length > 0}
        <div class="flex items-center gap-2 border-b border-amber-200/70 bg-amber-50 px-4 py-2 text-xs text-amber-800" role="status">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5 shrink-0">
            <path fill-rule="evenodd" d="M8 1.5a1.13 1.13 0 0 1 .98.567l5.7 9.86A1.13 1.13 0 0 1 13.7 13.6H2.3a1.13 1.13 0 0 1-.98-1.7l5.7-9.86A1.13 1.13 0 0 1 8 1.5Zm0 3.5a.6.6 0 0 0-.6.62l.16 3.1a.44.44 0 0 0 .88 0l.16-3.1A.6.6 0 0 0 8 5Zm0 5.1a.66.66 0 1 0 0 1.32.66.66 0 0 0 0-1.32Z" clip-rule="evenodd" />
          </svg>
          <span>{t('sourceUnavailable', unavailableLabel)}</span>
        </div>
      {/if}
      {#if signInRequired.includes('reddit')}
        <RedditSignInNotice url={redditSearchUrl} />
      {/if}
      <div class="max-h-[19rem] min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {#each groupedDiscussions as group (group.platform)}
          <section id={`platform-${group.platform}`} class="scroll-mt-3">
            <div class="mb-0.5 flex items-center gap-3">
              <h2 class="text-2xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {group.label}
              </h2>
            </div>

            <!-- isolate: the row hover wash sits at -z-10 and must not fall behind the popup. -->
            <div class="isolate divide-y divide-stone-200/70">
              {#each group.items as discussion (discussion.externalId)}
                <DiscussionRow
                  {discussion}
                  useOldReddit={userSettings?.useOldReddit}
                  openInNewTab={userSettings?.openLinksInNewTab}
                />
              {/each}
            </div>
          </section>
        {/each}
      </div>

      <div class="shrink-0 border-t border-stone-200 bg-stone-50/80 px-4 py-2">

        {#if summaryError}
          <p class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="status" aria-live="polite">
            {summaryError}
          </p>
        {/if}

        {#if summaryResult}
          <button
            type="button"
            onclick={() => { view = 'summary'; }}
            class="inline-flex min-h-9 w-full cursor-pointer items-center justify-center rounded-md bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800"
          >
            {t('viewSummary')}
          </button>
        {:else}
          <button
            type="button"
            onclick={hasApiKey ? () => doSummarize() : () => browser.runtime.openOptionsPage()}
            disabled={summarizing}
            class="inline-flex min-h-9 w-full cursor-pointer items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60
              {hasApiKey ? 'bg-stone-900 text-white hover:bg-stone-800' : 'border border-stone-300 bg-white text-stone-700 hover:border-stone-400'}"
          >
            {summarizing ? t('summarizing') : hasApiKey ? t('summarizeAll') : t('addApiKey')}
          </button>
        {/if}

        {#if ctaDescription}
          <p class="mt-1 text-xs leading-4 text-stone-500">{ctaDescription}</p>
        {/if}

        <ExternalLinks url={currentUrl} />
      </div>
    {/if}
  </main>
{/if}
