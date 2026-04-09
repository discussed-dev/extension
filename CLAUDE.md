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

## Release Workflow

When asked to release or bump version:

1. `bun run test` — all tests must pass
2. `bun run lint` — must be clean
3. Bump `version` in `package.json` (patch/minor/major as specified)
4. `bun run build` — production build must succeed
5. Commit: `Bump version to X.Y.Z`
6. `git tag vX.Y.Z`
7. `git push && git push --tags`
8. `gh release create vX.Y.Z --title "Discussed vX.Y.Z" --generate-notes`

## Bloom Filter Pipeline

- `scripts/generate-bloom.py` — queries BigQuery public HN dataset, normalizes URLs, generates bloom filter binary
- `.github/workflows/bloom-filter.yml` — runs weekly (Sunday 03:00 UTC), publishes as GitHub Release
- Extension auto-downloads latest bloom filter on startup
