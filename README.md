# Alumni Chapter Directory

Phase I: Static site with no build steps. framework, or login and only one file to configure.

## Run it locally

```
python3 -m http.server 8000
```

Open `localhost:8000`. Double-clicking `index.html` will fail with an explanatory
error, because browsers block `fetch` on `file://`.

## Files

```
config.js              the only file you edit
index.html             the app
data/directory.json    34 sample members
data/directory-200.json  200 members, for checking scale
seed.js                regenerate either sample file
publish.gs             Apps Script: Sheet -> directory.json
photos/                published portraits, committed by the publisher
robots.txt             keeps the site out of search results
SETUP.md               sheet schema and wiring
```

## Plugging in data

`config.js`, top of the file. Set `source` to one of four values.

**`"json"`** (default) reads `data/directory.json`. The Apps Script publisher
writes that file from the Sheet. No key. Private columns are stripped
server-side, so they never reach a browser.

**`"apps-script"`** hits a deployed Web App URL that returns the same JSON.
Live reads, no key in the browser, and the script controls what's exposed.
This is the best option if you want the site to reflect sheet edits immediately.

**`"sheets-csv"`** reads a published-to-web tab. No API key at all. Set
`publishedId` and the `gid` for each tab.

**`"sheets-api"`** uses Sheets API v4. Set `apiKey` and `spreadsheetId`.

### Read this before using the last two

An API key in client-side JavaScript is visible to anyone who opens View Source.
Same for a published CSV link. Either one exposes **every column on that
spreadsheet**, not just the ones this app renders. The `show_email` and
`show_phone` opt-in logic controls what gets *displayed*; it cannot stop someone
from reading the raw sheet.

So if you use `sheets-csv` or `sheets-api`, point them at a spreadsheet or tab
containing public columns only. Keep email, phone, and address on a separate
private sheet shared through Google Groups.

With `json` or `apps-script`, this problem doesn't exist.

## Before you make the repo public

The code here is safe to publish. The *data* is a different question, and it is
worth settling before the first real publish rather than after.

Once `publish.gs` runs against a live sheet, this repo holds real alumni names,
class years, portraits, and any email or phone a member opted in to showing. In
a public repo that means:

- **`robots.txt` and `noindex` do not apply to the repo.** They ask search
  engines to skip the *Pages site*. `github.com/you/alumni-directory` is a
  separate, indexed, fully browsable copy of the same JSON.
- **Git history is permanent.** Removing a member from the sheet takes them off
  the site on the next publish, and `publish.gs` now deletes their portrait
  from the branch too, but every previous commit still contains both. Honouring
  a real "delete me" request means rewriting history or deleting the repo.

Three ways to handle it, in the order most chapters should consider them:

1. **Private repo.** GitHub Pages from a private repo needs a paid plan
   (Team or Pro). Cheapest real fix if the budget exists.
2. **Split the repos.** Code stays public, data goes to a private repo that
   Pages serves, or the site reads from the `apps-script` source instead so no
   member data is ever committed anywhere.
3. **Public repo, eyes open.** Defensible for a directory that is names, class
   years, and majors only — genuinely public information for most alumni. It is
   not defensible once photos and contact details are in it.

Nothing in the code decides this for you. Pick deliberately.

## Branding

`config.js` → `brand`. Title, subtitle, founded year, logo path, and two hex
colors. The garnet and navy defaults are reasonable but they aren't official
values; the university's brand guide is the source of truth, not the
color-code aggregator sites. Drop the real ones in and everything updates,
including print.

Anything set in the Sheet's Settings tab wins over `config.js`, so the admin can
change the header text without touching code.

## Regenerate sample data

```
node seed.js 34  > data/directory.json
node seed.js 200 > data/directory-200.json
```

Zero dependencies, no `package.json`. Seeded at 1896, so two runs produce
identical files and diffs stay meaningful.

## Test at scale

```
cp data/directory-200.json data/directory.json
```

Reload and watch the year spine fill in.

## About the directory

You can browse by class year. The years are grouped by decade down the side of
the page, and on a phone they run across the top. There's also a search box for
names, majors, and organizations.

The Print button makes a real directory: a cover, a table of contents, the
chapter pages, the calendar, and then everybody's photo three across. Print it
or save it as a PDF.

Phone numbers and email addresses only show up for members who said yes to
sharing them on the sign-up form. Everything else on a member's page comes from
what they filled out themselves.

## License

MIT, in `LICENSE.md`. Copyright Kara Mansel.

The license covers the code and documentation only. Member directory data and
photographs are not licensed for reuse.
