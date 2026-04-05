# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Discussed** (discussed.dev) — a browser extension that auto-discovers community discussions (Hacker News, Reddit, Lobsters) about the current page and provides on-demand AI summarization of those discussions.

## Governing Docs

If `docs/prd-discussed.md` exists locally, it is the source of truth for product scope and requirements. Read it before any feature work.

## Tech Stack (decided)

| Component | Choice |
|-----------|--------|
| Extension framework | WXT (wxt.dev) — cross-browser, Vite-based |
| UI | Svelte 5 (Runes) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict) |
| Package manager | bun (pnpm fallback) |
| Lint/Format | Biome |

## Key References

These open-source projects inform the design (clean-room, not forked):

- [lbrooney/find-on](https://github.com/lbrooney/find-on) — search logic, caching, URL normalization, settings patterns
- [jstrieb/hackernews-button](https://github.com/jstrieb/hackernews-button) — Bloom filter pipeline (BigQuery → GitHub Actions → extension)

## Build & Dev Commands

```bash
bun install                    # install deps
bun run dev                    # dev server with HMR (Chrome)
bun run dev:firefox            # dev server (Firefox)
bun run build                  # production build (Chrome)
bun run build:firefox          # production build (Firefox)
bun run zip                    # package for store submission
bun run check                  # svelte-check type checking
bun run lint                   # biome lint + format check
bun run lint:fix               # biome auto-fix
```

## Architecture Notes

- **Background script** handles discovery (Bloom filter check → API calls) and caching
- **Popup** (Svelte) has two views: Overview (discussion list) and Summary (AI output)
- **No backend server** — all API calls (HN Algolia, Reddit JSON, Lobsters, LLM) go directly from the extension
- **User-triggered AI only** — LLM calls never fire automatically; user clicks "Summarize"
- **Zero DOM injection** — the extension never modifies the host page
- **Bloom filter** for HN: ~5MB, generated weekly via GitHub Actions + BigQuery, distributed as GitHub Release

## MVP Scope (v0.1)

Auto-discovery (HN Bloom+Algolia, Reddit search.json, Lobsters JSON), toolbar badge, popup overview, on-demand AI summarization (Anthropic only), local caching, Firefox + Chrome + Edge via WXT, settings page, external search links.

Cross-thread synthesis, multi-provider LLM, and badge coloring are v0.2.
