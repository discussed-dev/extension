# Privacy Policy — Discussed Browser Extension

**Last updated:** April 6, 2026

## What Discussed Does

Discussed is a browser extension that finds community discussions (on Hacker News, Reddit, and Lobsters) about the web page you are currently viewing and, on your request, generates AI-powered summaries of those discussions.

## Data Collection

**Discussed does not collect, store, or transmit any personal data to our servers.** There is no backend server, no analytics, no telemetry, and no user accounts.

## What Data Is Processed

When you browse the web with Discussed installed, the following data is processed **locally in your browser** or sent **directly to third-party APIs from your browser**:

### Page URLs
- The URL of the page you are viewing is sent to public APIs (HN Algolia, Reddit, Lobsters) to search for related discussions.
- URLs are normalized (query strings and fragments stripped) before searching.
- URLs are checked against a locally-stored Bloom filter before making API calls, to minimize unnecessary network requests.

### Discussion Data
- Discussion metadata (titles, scores, comment counts) retrieved from HN, Reddit, and Lobsters is cached in your browser's local storage.
- Cached data expires automatically based on your configured cache duration.

### AI Summarization
- When you click "Summarize", discussion comments are sent **directly from your browser** to the AI provider you configured (e.g., Anthropic, OpenAI, Google, etc.).
- **Your API key** is stored in your browser's synced storage and is sent directly to the AI provider. It is never sent to us.
- Summaries are cached locally in your browser for 7 days.

### Bloom Filter
- The extension periodically downloads a Bloom filter file (~4.5 MB) from GitHub Releases. This is a static binary file and does not contain personal data.

## Third-Party Services

Discussed communicates directly with these third-party services from your browser:

| Service | Purpose | Their Privacy Policy |
|---------|---------|---------------------|
| HN Algolia API | Search Hacker News discussions | [algolia.com/policies/privacy](https://www.algolia.com/policies/privacy/) |
| Reddit | Search Reddit discussions | [reddit.com/policies/privacy-policy](https://www.reddit.com/policies/privacy-policy) |
| Lobsters | Search Lobsters discussions | [lobste.rs/about](https://lobste.rs/about) |
| GitHub API | Download Bloom filter updates | [docs.github.com/site-policy/privacy-policies](https://docs.github.com/en/site-policy/privacy-policies) |
| Your chosen AI provider | Generate summaries (user-triggered only) | See your provider's privacy policy |

## Permissions

| Permission | Why |
|-----------|-----|
| `tabs` | Read the current tab's URL to search for discussions |
| `activeTab` | Access the active tab for Firefox compatibility |
| `storage` | Cache discussion results, summaries, settings, and Bloom filter locally |
| Host permissions | Make API calls directly to discussion platforms and AI providers |

## Data Retention

- Discussion cache: configurable (default 6 hours)
- Summary cache: 7 days
- Bloom filter: updated weekly, stored locally
- Settings and API key: stored until you remove them or uninstall the extension

## Your Control

- You can disable any discussion source in settings.
- AI summarization only runs when you explicitly click "Summarize".
- You can clear cached data by removing the extension or clearing extension storage.
- Domain blacklist/whitelist lets you control which sites trigger automatic searches.

## Children's Privacy

Discussed is not directed at children under 13 and does not knowingly collect information from children.

## Changes

If this privacy policy changes, the updated version will be published at [discussed.dev/privacy](https://discussed.dev/privacy) and in the extension repository.

## Contact

For questions about this privacy policy, open an issue at [github.com/discussed-dev/extension](https://github.com/discussed-dev/extension/issues).
