# Managing the chapter directory

The Google Sheet is the admin panel for the chapter website. Members fill out the form, you review them here, and the website updates when the directory is published. You don't need GitHub or any code.

The website doesn't read the Sheet live. A row can look finished in the Sheet and still not be on the website until it's marked `active` and a publish has run.

If something breaks or you're not sure what to do, contact [NAME] at [EMAIL]. They set up the Sheet and run the website.

## What you'll do most often

| To do this | Do this |
|---|---|
| Approve a new member | On `Roster`, change their `status` to `active`. Then use **Directory > Publish now**. |
| Take someone off the site | Change their `status` to `hidden`. Then **Publish now**. |
| Fix a typo in someone's listing | Edit the cell on `Roster`. Then **Publish now**. |
| Add a chapter page or event | Add a row on `Pages` or `Events`. A page also needs `published` set to `true`. Then **Publish now**. |

If a row is already `active`, skipping **Publish now** is fine. The same update runs on its own about once an hour. That hourly run does not approve anyone. A `pending` row stays off the site until you change it to `active`.

## Don't touch these

- Don't edit, rename, sort, or add columns to `Form Responses 1`. That tab belongs to the form.
- Don't rename the tabs. They have to stay `Roster`, `Pages`, `Events`, and `Settings`. The form tab's name has to start with `Form Responses` (Google names it `Form Responses 1`).
- Don't rename the header row on any tab. Publishing finds each column by its header name.
- On `Roster`, leave `id`, `photo_file_id`, `photo_published_id`, and `last_updated` alone except in the two cases under "Two members with the same name" and "Photos." The form fills `id`, `photo_file_id`, and `last_updated`. Publishing fills `photo_published_id` after a photo goes up. If you add someone by hand, their `id` cell stays blank. That's normal, and the website still gives them one.

## New members

When someone submits the form, their answers land on the `Form Responses 1` tab, and a copy is added to `Roster` with status `pending`. Pending members aren't on the website.

Once their listing looks right, change `status` to `active` and publish. Only `active` rows show up on the site.

Use the dropdown in the `status` column. The choices are `active`, `pending`, and `hidden`. Capital letters are fine (`Active` still counts). An extra space does not, and that row is skipped.

If someone submits the form again with the same email address, their existing `Roster` row gets updated. Their status, committees, offices, and id stay the way you left them. Submitting again won't put them on the site by itself, and it won't take them off.

## Adding members who didn't use the form

You can type or paste existing members straight onto `Roster`. Don't add them to `Form Responses 1`.

Give each person their own row. Fill in `first_name`, `last_name`, and `grad_year`, and set `status` to `active` if they should show up now. Add their major, offices, committees, or a fun fact if you have them. Leave the four columns from "Don't touch these" blank.

Put their email address in `email` if you have it. It won't show on the website. It's there so that if they fill out the form later, the form updates this row instead of creating a second one for them. Leave `show_email` blank unless that member has asked to have their email shown.

## Two members with the same name

The website tells members apart using the `id` column. It's built from the first name, last name, and class year, like `jane-doe-1998`.

If two members have the same first name, last name, and class year, their ids would match, and the site would mix them up. In that one case, fill in `id` yourself for both of them so they're different. Use lowercase letters, hyphens instead of spaces, and add a number to the second person, like `jane-doe-1998` and `jane-doe-1998-2`.

Once a member's photo is on the website, don't change their id. If one of the two already has a photo up, leave their id as it is and change the other person's.

## Taking someone off the site

Change their `status` to `hidden` and publish. Their listing and photo come off the live website on that publish.

Hiding someone doesn't erase older saved copies of the site. If a member wants their photo or listing deleted completely, including from past versions, send that request to [NAME].

## When the same person shows up twice

Keep one row per person. If someone appears twice, keep the row that has their email address and their most recent answers, and delete the other rows completely. Don't leave the extras sitting there as `hidden`. Two rows for the same person will fight over the same photo.

This usually happens when the email address was blank or different on the older row, so the new form submission couldn't tell who it belonged to.

## What you can edit on Roster

| Column | What to do |
|---|---|
| `status` | `pending` until you approve them, `active` to show them, `hidden` to take them off |
| `committees` | Separate each one with a comma. Officers fill this in. A new form submission won't erase it. |
| `offices` | Same as committees. |
| Name, class year, major, fun fact, organizations | Fix a typo if a member asks. Only the first 10 organizations show on the website. |
| `show_email`, `show_phone`, `show_city` | `Yes` means that member chose to show that item. Only change it if they ask you to. |

A member's email or phone shows on the website only if `show_email` or `show_phone` says `Yes`. City and state show together, and only if `show_city` says `Yes`. There is no `show_state` column, and there's no way to turn on everyone's contact info at once, on purpose.

The directory only keeps a birthday month and day. Birth years aren't collected, so don't add them.

## Photos

Members upload a photo on the form. It shows up on the site once their status is `active`.

To replace someone's photo, you have two options:

1. Have the member fill out the form again with the same email address and upload the new photo.
2. Upload the new photo to Google Drive yourself, copy its link, and paste it into that member's `photo_file_id` cell, replacing what's there.

The next publish picks up the new photo. If you're reusing the same Drive file and the photo on the site still looks wrong, clear that member's `photo_published_id` cell and publish again.

## Publishing

Open the Sheet and use the **Directory** menu at the top:

- **Publish now** updates the member list, chapter pages, events, and photos.
- **Publish (data only, skip photos)** updates the text and leaves the photos as they are. Use this when a photo is causing problems and you still want everything else to go out.
- **Check setup** is for when publishing fails. It usually tells you what's wrong. It doesn't change the website. The check can miss some setup problems, so if it says everything is fine and **Publish now** still starts with `FAILED`, send that `FAILED` message to [NAME] anyway.

After you publish, a short message pops up at the bottom of the Sheet:

- `Published 4 members` means four `active` rows went up.
- `Published 0 members` means nobody is marked `active`.
- A message starting with `FAILED` means the website didn't change. Copy the message and send it to [NAME].

The first time you use the menu, Google will ask for permission to run it. Click allow, using the Google account that manages this Sheet.

## Chapter pages

The `Pages` tab controls the Chapter section of the website. Each row is one page.

| Column | What to enter |
|---|---|
| `title` | The page name |
| `body` | The page text. Line breaks carry over to the site. |
| `order` | A number. Lower numbers show up first. |
| `published` | `true` to show the page, `false` to hide it. `yes`, `y`, and `1` also count as showing it. |
| `slug` | A short name with no spaces, such as `meetings`. Leave it blank on a new page and one is made from the title when the page is published. Chapter pages are not separate web addresses, so changing a slug does not break a link. |

## Events

The `Events` tab is the calendar. Every event needs a date and a title. Location and notes are optional.

Type a real date, like `10/15/2026`, not "next Thursday." The site sorts events by date.

## Site settings

The `Settings` tab has two columns, `key` and `value`. This is where you change the chapter name, colors, logo, and links without touching any code.

Whatever you put in `value` replaces the built-in default. An empty value does not clear the item. The website treats a blank cell the same as a missing row and keeps the built-in default. Deleting the row does the same thing. A name, color, or link that already has a built-in default cannot be turned off from this tab. Replace it with a different value.

Colors are entered as a color code: a `#` followed by six letters and numbers. Search "color picker" on Google to get the code for any color.

| Key | What it changes |
|---|---|
| `site_title` | The full chapter name |
| `site_short_title` | The short name in the browser tab |
| `site_subtitle` | The line under the chapter name |
| `founded_year` | The year shown after "Est." |
| `color_primary` | The main color. The default is garnet, `#7A1220`. |
| `color_secondary` | The second color. The default is navy, `#14213D`. |
| `logo_url` | The file name of a logo that's already on the site, such as `scsgacac_logo.jpg`. A web address pasted here will not show. You can't add a new file to the site from the Sheet. To use a new logo, send the file to [NAME]. |
| `membership_form_url` | Where the Join button goes |
| `facebook_url` | The Facebook link |
| `instagram_url` | The Instagram link |
| `national_association_url` | The national association link |
