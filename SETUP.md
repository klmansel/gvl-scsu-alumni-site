# Alumni Directory: Backend Setup

The Sheet is the admin panel. There is no login screen to build, no password to
rotate, and no write endpoint on the public site. Google handles who can edit;
the published site is static files that nobody can write to.

```
Google Form  →  Sheet (private)  →  Apps Script  →  GitHub repo  →  Pages
   members         source of truth      publisher      directory.json     public
```

---

## 1. The Sheet

One spreadsheet, five tabs. Share it with the officers who need edit access and
nobody else.

### Tab: `Roster`

Header row exactly as below. Order doesn't matter (the script reads by header
name), but the names do.

| Column | Who fills it | Notes |
|---|---|---|
| `id` | auto | Stable slug. Never change it after photos publish. |
| `status` | admin | `active`, `pending`, or `hidden`. Only `active` publishes. |
| `first_name` | form | |
| `last_name` | form | |
| `preferred_name` | form | Optional |
| `grad_year` | form | 4 digits, non-digits stripped |
| `major` | form | Dropdown on the form |
| `birth_month` | form | Month only |
| `birth_day` | form | Day only. No birth year, ever. |
| `fun_fact` | form | |
| `committees` | admin | Comma separated |
| `offices` | admin | Comma separated |
| `organizations` | form | Comma separated, first 10 published |
| `photo_file_id` | form | Drive URL from the upload question |
| `photo_published_id` | auto | Change detection. Leave it alone. |
| `email` | form | **Private** |
| `phone` | form | **Private** |
| `city` | form | **Private** |
| `state` | form | **Private** |
| `show_email` | form | `Yes` publishes it |
| `show_phone` | form | `Yes` publishes it |
| `show_city` | form | `Yes` publishes city + state |
| `last_updated` | auto | |

Add a Data Validation dropdown on `status` so nobody types `Active ` with a
trailing space and wonders why they vanished.

### Tab: `Pages`

| `slug` | `title` | `body` | `order` | `published` |

Seed it with: Chapter Bylaws (1), Officers (2), Membership Levels (3),
Committees (4), Scholarship (5), Fundraising Teams (6), Meetings (7),
Chapter Photos (8), Special Recognition (9). Reorder by editing `order`.

### Tab: `Events`

| `date` | `title` | `location` | `notes` |

Real dates in the date column, not text. Sorted by date on publish.

### Tab: `Settings`

Two columns, `key` and `value`:

```
site_title           South Carolina State University National Alumni Association Greenville Chapter
site_subtitle
founded_year        1918
color_primary       #7A1220
color_secondary     #14213D
logo_url            scsunaa-gvl-logo-d.png
membership_form_url https://docs.google.com/forms/d/e/1FAIpQLSc3hhMeRCVDRa-g8WLkq-Ix-gj5fgRGoTkwDdfDlzBpFCYBIQ/viewform
facebook_url        https://www.facebook.com/scstategreenvillealumni
instagram_url       https://www.instagram.com/greenvillescsunaa/
```

**Anything you put here beats `config.js`.** That is the point — the admin can
retitle the site without touching code — but it also means a stale value in
this tab silently overrides an edit you just made to `config.js` and looks like
a bug. If you change branding in `config.js` and the site ignores you, this tab
(or `settings` in `data/directory.json`) is why. Leave a key out entirely to
fall back to `config.js`; a blank value means blank.

### Tab: `Form Responses 1`

Auto-created. Don't edit it, don't rename it, don't sort it.

---

## 2. The Form

Turn on: collect email addresses, limit to one response, allow edit after
submit. That last one means members fix their own typos instead of emailing an
officer.

Two gotchas worth knowing up front. File upload questions require a Google
sign-in, so plan an "email us your photo" fallback for the handful of members
without one. And uploads eat the form owner's Drive quota, so put the form on an
account with room.

Add three opt-in checkboxes at the end:

- Show my email address in the directory
- Show my phone number in the directory
- Show my city and state in the directory

Default is off. A member has to say yes. That's cleaner than any policy
document, and it ends the privacy argument before it starts.

Then map your question titles in `mapFormResponse()` in `publish.gs`. It's one
function, and it's the only place the form and the sheet have to agree.

---

## 3. GitHub

Read the "Before you make the repo public" section of the README first. Short
version: the code is fine to publish, but once this runs against a live sheet
the repo itself holds real member data, and `robots.txt` does not cover the
repo — only the Pages site.

Create the repo with:

```
/index.html
/data/directory.json
/photos/
```

Settings → Pages → deploy from `main`.

`robots.txt` and `<meta name="robots" content="noindex">` are already in the
repo. They won't stop a determined scraper, but they keep the directory out of
search results, which is where most casual harvesting starts.

`index.html` also ships a Content-Security-Policy meta tag. It pins images to
this origin plus Drive, and network calls to this origin plus the documented
Google endpoints. If you add a source the policy doesn't list, requests fail
silently in the console — update the tag rather than deleting it.

### Token

Fine-grained personal access token, scoped to this one repo, **Contents:
Read and write**. Nothing else.

In Apps Script: Project Settings → Script Properties → add
`GITHUB_TOKEN` with the value.

Never put it in the code. It lives server-side in Apps Script and never touches
a browser.

---

## 4. Triggers

Apps Script → Triggers, add three:

| Function | Event |
|---|---|
| `onFormSubmit` | From spreadsheet → On form submit |
| `scheduledPublish` | Time-driven → Hourly |
| `onOpen` | From spreadsheet → On open |

Do not add a trigger for `photoCatchUp`. The script creates and deletes that
one itself while it drains a photo backlog. Apps Script caps a project at 20
triggers, so it cleans up after each pass.

The `Directory → Publish now` menu item is the one she'll actually use. Give her
a button where she already works.

---

## 5. Verify

Run `Directory → Check setup`. It confirms the tabs exist, the required columns
are present, the token is set, and the repo answers.

---

## Two design decisions, stated plainly

**Form submissions land as `pending`, not `active`.** Nothing goes live until an
officer flips the status. That's your spam filter, and it's also editorial
control, because the first draft of somebody's fun fact is usually not the one
they want printed.

**Private fields are excluded structurally.** `buildMember()` has a fixed
whitelist. A column that isn't in `PUBLIC_MEMBER_FIELDS` cannot reach the public
JSON regardless of what anyone toggles. The opt-in flags can only add
`email`, `phone`, and `location` back, one member at a time, by their own
choice. There's no admin setting that dumps everything.

## Photos

The publisher pulls Drive's thumbnail endpoint at 600px instead of the original
upload. A modern phone photo is 3 to 5MB; 115 of those is half a gigabyte
shipped to members on cell data. The thumbnail is roughly 60KB.

Only changed photos re-publish. First run with 115 members will hit the batch
limit and reschedule itself, so it takes a few passes. That's expected. After
that it's near-instant.

If Drive won't return a thumbnail, the publisher falls back to the original
file, and refuses anything over 2MB rather than committing it. A commit is
permanent: an oversized blob stays in the repo's history and every clone pays
for it forever. Oversized photos are logged and skipped; re-upload a smaller
image.

Setting a member to `hidden`, or clearing their `photo_file_id`, now deletes
their portrait from the published site on the next run. It stays in git
history. If someone asks for a photo to be erased outright, that means
rewriting history or deleting the repo — there is no gentler option.
