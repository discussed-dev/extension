# Changelog

This file lists what changed for users in each release of Discussed. Each entry is also the GitHub Release notes for that version and appears at [discussed.dev/changelog](https://discussed.dev/changelog).

## 0.5.4 (2026-11-01)

Reddit results work again.

### Improved

- Hacker News lookups match only stories and check more results.
- Share-tracking IDs that some news sites add to links are removed before searching.
- Number fields in settings are checked before saving, with the problem shown next to the field.
- Corrected translations in all six non-English languages. The settings page is now fully translated, and languages are listed by their own names.
- In Firefox, the add-on now declares the data it sends: page addresses go to the discussion sites, and page text goes to your AI provider when you ask for a summary.

### Fixed

- Reddit stopped answering the search Discussed used on October 20. Discussed now searches through old.reddit.com, and checks the Arctic Shift archive of Reddit posts when Reddit refuses a search. The popup asks once for permission to reach these two sites.
- Unblock removes the rule that actually blocks the page, including a rule for a parent domain.
- A failed Regenerate shows an error in the summary view.
- A failed refresh says so and keeps the earlier results.
- Links in summaries are readable in dark mode.
- After an export, keyboard focus returns to the export button, and screen readers announce copies.

## 0.5.3 (2026-10-03)

### Improved

- The popup no longer has an outer border, and inner corners are rounded again.

## 0.5.2 (2026-10-03)

### Improved

- The popup and settings page use square corners.

## 0.5.1 (2026-10-02)

The popup and settings page are redesigned.

### Improved

- Discussions are listed as compact rows and use more of the popup's height.
- The summary view names the page it summarizes.
- Loading shows a skeleton of the list, and summaries show what step they are on.
- The settings header and Save button stay in view while you scroll.
- Dark mode covers notices and status colors.
- Blocking a domain moved to the popup header.

### Fixed

- When Reddit blocks searches from signed-out visitors, the popup asks you to sign in and links to a Reddit search for the page.

## 0.5.0 (2026-07-26)

Summaries cite the comments they draw on.

### New

- Each claim in a summary links to the comments behind it. Hover or focus a citation to read the quote.
- Exported summaries keep their citations as Markdown footnotes.

### Improved

- Updated the Anthropic and Google model presets.

## 0.4.2 (2026-07-13)

The popup and settings page follow your system's dark mode.

### Improved

- A flatter, quieter look throughout the popup.

### Fixed

- The model preset menu no longer overflows its row.

## 0.4.1 (2026-07-13)

Restores the 0.3.8 changes that 0.4.0 left out.

### Fixed

- 0.4.0 was built without the changes from 0.3.8. This release brings them back: the API key is kept on this device again, most popup and settings text is translated again, and a lookup that failed on every source can be retried.
- In Firefox, the popup opens at its full size instead of growing after it appears.
- Pages declare their language, so screen readers pronounce text correctly.

## 0.4.0 (2026-07-13)

New Hacker News stories show up right away, and the popup says when a source is down.

### New

- The popup shows when Hacker News, Reddit or Lobsters cannot be reached, and offers a refresh.
- The settings page shows the extension version.

### Improved

- Hacker News discussions are found as soon as they are posted. Discussed no longer downloads a weekly index of Hacker News links from GitHub, so it no longer needs access to api.github.com or unlimited storage.
- On new installs, summaries read up to eight threads and 75 comments. Existing installs keep their settings.
- The export menu and settings controls work with a keyboard and screen readers.
- Updated the Anthropic model presets.

### Fixed

- "Open in current tab" opens the discussion in the page's tab instead of replacing the popup.

## 0.3.8 (2026-07-06)

Your API key stays on this device.

### Improved

- The API key is no longer synced through your browser account. If you use Discussed on several devices, enter the key once on each.
- Most popup and settings text is translated.
- Discussed asks for unlimited storage, so the Hacker News index it downloads fits next to cached results.

### Fixed

- A lookup that failed on every source is no longer cached, so trying again works.

## 0.3.7 (2026-05-06)

### Fixed

- Summaries from OpenAI reasoning models such as gpt-5-mini no longer come back empty.

## 0.3.6 (2026-05-06)

### Fixed

- Testing an API key in settings works with OpenAI reasoning models.

## 0.3.5 (2026-05-06)

### Fixed

- OpenAI reasoning models no longer fail with an error. Updated the provider model presets.
- The extension name and description are translated in the stores.

## 0.3.4 (2026-04-26)

### Improved

- Reddit results are limited to the page's own site even when exact match is off.

## 0.3.3 (2026-04-23)

### Improved

- Toolbar badge colors match Reddit and Lobsters.

## 0.3.2 (2026-04-21)

### Improved

- Discussed no longer searches on Hacker News, Reddit or Lobsters pages that are not discussions, such as front pages and subreddit listings.

## 0.3.1 (2026-04-20)

### New

- On a Hacker News, Reddit or Lobsters thread, Discussed finds other discussions of the linked article.

## 0.3.0 (2026-04-09)

Summaries read the article and the page's own comments.

### New

- Summaries take the article text into account.
- Comments on NYT, WSJ, Guardian and Substack pages are included in summaries.
- Export a summary as Markdown, as plain text, or to Obsidian.
- The summary shows which sources it used.
- Discussed asks for the scripting permission, which it uses to read the article and its comments when you ask for a summary.

### Improved

- Updated the OpenAI and Google model presets.

## 0.2.0 (2026-04-08)

### New

- When no discussions are found, links let you submit the page to Hacker News, Reddit or Lobsters.

### Improved

- Tracking parameters are stripped, mobile Wikipedia links are matched to the desktop page, and web.archive.org links are matched to the original page.

## 0.1.2 (2026-04-07)

### Fixed

- Blocked domains are also blocked in the popup.
- The Reddit exact-match setting takes effect.

## 0.1.1 (2026-04-06)

### Improved

- Discussed skips search engines, local and internal pages, and site home pages.
- Hacker News results must match the page's exact address.

## 0.1.0 (2026-04-06)

The first release finds discussions of the page you are on from Hacker News, Reddit and Lobsters, shows their count on the toolbar badge, and summarizes them when you ask, using your own API key from one of eight providers or any OpenAI-compatible endpoint. It is partly translated into seven languages.
