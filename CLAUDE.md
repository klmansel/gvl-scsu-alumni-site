# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Public website for a university alumni chapter: chapter info, social links, events calendar, membership form link, and a member directory. Administered by chapter officers through a connected Google Sheet + Apps Script, so non-technical members can make edits without touching code or the repo. Design decisions consistently favor "an officer can do this from the Sheet" over "a developer can do this in code" — keep that bias when suggesting changes.

## Never commit or push — ever

Claude does not run `git commit`, `git push`, `git merge`, or any other command that writes to git history or a remote, under any circumstances. Not for "just this one small change," not after asking for confirmation, not when the user says "go ahead" mid-task. The user runs every commit and every push by hand.

This covers: creating branches on the remote, opening PRs, force-pushing, tag creation/push, and any `gh` subcommand that mutates the repo or its issues/PRs. Local, non-git file edits are fine.

If you think a commit is warranted, describe what should go in it and stop.

## Never commit PII

No member PII lands in this repo, ever. That includes emails, phone numbers, street addresses, birth years, or any other personal data — even for testing, even in a branch, even "temporarily." Git history is permanent; a private field committed once is committed forever.

- `data/directory.json` on `main` is the publisher's output. Sample fixtures (`seed.js`) are the only acceptable source of directory data for local work.
- If you need to reproduce a bug against real data, pull it locally into a gitignored file and work from there. Do not stage it.
- If you find PII in a diff, in a working tree, or in an untracked file, stop and flag it before doing anything else.

## Commands

Serve locally (opening `index.html` directly fails — browsers block `fetch` on `file://`):

```
python3 -m http.server 8000
```

Regenerate sample data (zero deps, seeded PRNG so runs are reproducible):

```
node seed.js 34  > data/directory.json
node seed.js 200 > data/directory-200.json
```

Test at scale — swap in the 200-member fixture:

```
cp data/directory-200.json data/directory.json
```

One-time: `npm install` (installs Prettier — only dependency).

```
npm test       # Node's built-in runner over test/*.js
npm run lint   # Prettier --check across the linted scope
npm run format # Prettier --write
```

CI runs `npm run lint` then `npm test` on every push and PR via
`.github/workflows/test.yml`.

Prettier's scope is limited by `.prettierignore` — `index.html` (curated,
compact CSS), `publish.gs` (Apps Script), and markdown are all excluded
deliberately. Do not remove those entries without asking.

There is no build and no bundler.

## Architecture

Static site with a Google Sheets backend. Data flows one direction:

```
Google Form → Sheet (private) → Apps Script (publish.gs) → GitHub repo (data/directory.json + photos/) → Pages
```

The browser never authenticates or writes. `publish.gs` runs in Apps Script (Sheet-bound), strips private columns server-side using a fixed whitelist (`PUBLIC_MEMBER_FIELDS`), downsizes portraits to Drive's 600px thumbnail, and commits the result via the GitHub Contents API.

### The four files that matter

- **`config.js`** — the only file most edits touch. Declares `CONFIG.source` (one of `"json"`, `"apps-script"`, `"sheets-csv"`, `"sheets-api"`), branding, links, options, and sheet column names.
- **`index.html`** — single-file app: HTML, CSS, and inline JS. ~1160 lines. Renders roster, member detail, pages, events, and print view. Reads `CONFIG` and dispatches through `SOURCES[C.source]()` (`index.html:450`) which returns a `{settings, members, pages, events}` payload. `assemble()` and `mapMember()` reshape sheet rows into the same schema the publisher emits, so downstream rendering is source-agnostic.
- **`publish.gs`** — Apps Script publisher. Owns the Sheet ↔ GitHub bridge, the private-field whitelist, and the self-rescheduling `photoCatchUp` trigger that drains the photo queue in `PHOTO_BATCH` chunks (Apps Script times out at 6 minutes). `MAX_PHOTO_BYTES = 2MB`; oversized photos are logged and skipped because git blobs are permanent.
- **`seed.js`** — sample-data generator matching the publisher's output schema. Cycles any images in `photos/` across the fake roster.

### Two invariants worth preserving

1. **Private fields are excluded structurally, not by a toggle.** `buildMember()` in `publish.gs` has a fixed whitelist. `show_email` / `show_phone` / `show_city` can only add `email`, `phone`, and `location` back per-member. There is no admin setting that bulk-exposes everything. This same rule applies in `mapMember()` in `index.html` for live sheet sources (`sheets-csv`, `sheets-api`) — but note that if the *browser* can read the sheet, it can read every column on it, so those two sources must only point at public-columns-only tabs.
2. **Settings tab overrides `config.js`.** Anything set in the Sheet's `Settings` tab wins over `config.js` branding/link values. A stale value there looks like a `config.js` edit being ignored. Leave a key out to fall back; blank value means blank.

### CSP

`index.html` ships a Content-Security-Policy meta tag pinning image sources to self + Drive and connect sources to self + documented Google endpoints. Adding a new external source (fonts, API host, image CDN) means updating the meta tag or requests will fail silently.

### Data schema

Full sheet/column contract lives in `SETUP.md` (Roster, Pages, Events, Settings tabs). `CONFIG.columns` in `config.js` maps sheet headers to internal keys; only touch it if your headers diverge from `SETUP.md`.

## Comment style

Comments should read like they were written for a future reader, not a code reviewer. Keep them lean and drop anything that sounds like conversation with a previous author:

- No changelog narration — "the old code did X", "previously this…", "used to rebuild every keystroke", "before the menu was added". If it matters now, describe the current behavior; if it doesn't, delete it.
- No specific-person references — "she reviews and flips to active" becomes "an officer flips to active". The comment should still make sense when a different admin owns the Sheet.
- No sentence fragments left behind from earlier edits, no informal asides ("hairstyle and chins"), no "which is what this restores" pointers.
- Keep the WHY when it's non-obvious: git-blob permanence, the private-field whitelist, CSS specificity gotchas, the capture-phase listener for `error`. Those are load-bearing.
- Default to one tight line; a paragraph is only justified for a real invariant.

## Publishing this repo

Read the "Before you make the repo public" section of `README.md` before pushing member data. `robots.txt` and `noindex` cover the Pages site, not the GitHub repo — and git history is permanent, so a "delete me" request against a public repo means rewriting history.
