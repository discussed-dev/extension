# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Discussed** (discussed.dev) — a browser extension that auto-discovers community discussions (Hacker News, Reddit, Lobsters) about the current page and provides on-demand AI summarization of those discussions.

## Governing Docs

If `docs/prd-discussed.md` exists locally, it is the source of truth for product scope and requirements. Read it before any feature work.

## Tech Stack

| Component | Choice |
|-----------|--------|
| Extension framework | WXT (wxt.dev) — cross-browser, Vite-based |
| UI | Svelte 5 (Runes) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict) |
| Package manager | bun (pnpm fallback) |
| Lint/Format | Biome |
| Testing | Vitest + WxtVitest plugin |

## Build & Dev Commands

```bash
bun install                    # install deps
bun run dev                    # dev server with HMR (Chrome)
bun run dev:firefox            # dev server (Firefox)
bun run build                  # production build (Chrome)
bun run build:firefox          # production build (Firefox)
bun run zip                    # package for Chrome Web Store
bun run zip:firefox            # package for Firefox AMO (+ sources)
bun run test                   # run all tests (Vitest)
bun run test:watch             # tests in watch mode
bun run check                  # svelte-check type checking
bun run lint                   # biome lint + format check
bun run lint:fix               # biome auto-fix
```

## Architecture

- **Background script** (`src/entrypoints/background.ts`) — listens to tab events, triggers discovery, updates toolbar badge via `badge.ts`
- **Popup** (`src/entrypoints/popup/`) — Svelte 5 app with Overview (grouped discussion cards) and Summary (AI output with markdown rendering) views
- **Options** (`src/entrypoints/options/`) — full settings page, opens in new tab
- **Discovery** (`src/lib/discovery.ts`) — orchestrates URL normalization → cache check → parallel platform queries (HN, Reddit, Lobsters) with per-source timeout
- **API helpers** (`src/lib/hn.ts`, `reddit.ts`, `lobsters.ts`) — each returns `Discussion[]`, graceful error handling
- **Bloom filter** (`src/lib/bloom.ts`) — HN URL pre-screening (~4.5MB, FNV-1a hash, auto-updated from GitHub Releases weekly)
- **LLM** (`src/lib/llm.ts`) — multi-provider router: Anthropic, OpenAI-compatible, Google Gemini
- **Cache** (`src/lib/cache.ts`) — generic TTL cache over `browser.storage.local`
- **Settings** (`src/lib/settings.ts`) — typed settings with provider presets and cost tiers
- **Badge** (`src/lib/badge.ts`) — badge text/color logic, extracted for testability
- **i18n** (`src/lib/i18n.ts` + `public/_locales/`) — 7 locales (en, zh_CN, ja, es, ko, fr, de)
- **No backend server** — all API calls go directly from the user's browser
- **User-triggered AI only** — LLM calls never fire automatically
- **Zero DOM injection** — the extension never modifies the host page

## Key Design Decisions

- `Discussion.createdAt` is ISO string (not Date) for storage serialization safety
- Lobsters results filtered by normalized URL match (domain API returns all domain results)
- Internal URLs (`about:`, `chrome://`, etc.) skip discovery entirely
- Reddit uses exact match by default; fuzzy search delegated to Google Forums external link
- URL normalization strips `index.html/htm/php`, query strings, fragments, `www.`, trailing slashes, tracking params (`utm_*`, `fbclid`, `gclid`, etc.); normalizes mobile Wikipedia (`en.m.` → `en.`); unwraps `web.archive.org` URLs
- Empty-state popup offers "Submit to" links for HN, Reddit, Lobsters (pre-fills URL + title)
- 8 LLM providers with OpenAI-compatible base URL for custom/local models

## Coding Rules

- **i18n required for all UI text.** Every user-visible string in popup, options, or content script must use `t('key')` from `src/lib/i18n.ts` with entries in all 7 locale files under `public/_locales/`. No hardcoded English in UI components.

## LLM Model Lineup Freshness

The `PROVIDERS` map in `src/lib/settings.ts` ships hard-coded model IDs per provider. These rot fast (deprecations, new releases) and 400 errors when stale. Verification protocol:

1. **Before any minor/major release**, query Context7 for each provider's current model list:
   - Anthropic: `/websites/platform_claude_en_api`
   - OpenAI: `/websites/developers_openai_api_reference`
   - Google: `/websites/ai_google_dev_gemini-api`
   - DeepSeek: `/websites/api-docs_deepseek`
   - Groq: `/websites/console_groq`
   - xAI: `/websites/x_ai_developers`
2. Cross-check each preset against the docs for: (a) model still listed; (b) any explicit deprecation/shutdown date; (c) recommended replacement.
3. When a provider rolls out a new flagship that supersedes a preset (e.g., Claude Opus 4.7 replacing 4.6), update the preset.
4. Per-model deprecation comments: when a model has a known retirement date, add an inline `// retires: YYYY-MM-DD` comment so the next pass sees the deadline without re-querying.
5. Patch releases skip this check unless the bug being fixed is model-related.

**API parameter quirks** to watch when adding OpenAI presets: GPT-5 family and o-series (o1/o3/o4) require `max_completion_tokens` instead of `max_tokens`. The detection regex in `src/lib/llm.ts` (`needsMaxCompletionTokens`) covers `^(gpt-5|o\d)([.\-]|$)` — extend it if OpenAI introduces new reasoning-model prefixes.

## Release Workflow

When asked to release or bump version:

1. `bun run test` — all tests must pass
2. `bun run lint` — must be clean
3. For minor/major bumps: run the LLM Model Lineup Freshness check above
4. Bump `version` in `package.json` (patch/minor/major as specified)
5. `bun run build` — production build must succeed
6. Commit: `Bump version to X.Y.Z`
7. `git tag vX.Y.Z`
8. `git push && git push --tags`

The tag push triggers `.github/workflows/release.yml`, which auto-creates the GitHub Release and submits to stores (see below). No manual `gh release create` needed.

## Store Submission Pipeline

Tag push (`v*`) → `.github/workflows/release.yml` builds Chrome + Firefox zips, creates the GitHub Release, then runs `bunx wxt submit` to publish to both stores in one step:

- **Chrome Web Store** — secrets `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`
- **Firefox AMO** — secrets `AMO_JWT_ISSUER`, `AMO_JWT_SECRET`; listed channel; fixed extension ID `discussed@discussed.dev`

Both submissions auto-submit for review. `continue-on-error: true` ensures one store's failure won't block the other or the GitHub Release.

### Chrome refresh token expiry

The CWS OAuth client (Google Cloud project `discussed-extension`) lives in Testing mode. Sensitive scopes rotate refresh tokens every ~7 days. When the workflow's Chrome step fails with `invalid_grant`:

1. Locally: `bunx publish-extension init` — re-authorizes via browser, writes new values to gitignored `.env.submit`
2. Update only the one secret: `gh secret set CWS_REFRESH_TOKEN` (paste from `.env.submit`)
3. Re-run the failed workflow, or wait for next tag push

Submitting the OAuth app for verification removes this expiry but adds Google review overhead.

### Workflow change timing

Tag-triggered workflows run the workflow file at the tag's commit, not main HEAD. `release.yml` edits only take effect on tags pushed AFTER the change merges to main — fixing a broken workflow always means cutting a new tag.

## Bloom Filter Pipeline

- `scripts/generate-bloom.py` — queries BigQuery public HN dataset, normalizes URLs, generates bloom filter binary
- `.github/workflows/bloom-filter.yml` — runs weekly (Sunday 03:00 UTC), publishes as GitHub Release
- Extension auto-downloads latest bloom filter on startup
