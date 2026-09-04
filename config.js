/* ============================================================================
   CONFIG — this is the only file you need to edit.
   index.html reads everything from here. Nothing else has settings in it.
   ========================================================================== */

const CONFIG = {

  /* --------------------------------------------------------------------
     1. WHERE THE DATA COMES FROM
     Set `source` to one of: "json" | "sheets-csv" | "sheets-api" | "apps-script"
     ------------------------------------------------------------------ */

  source: "json",

  /* ---- Option A: "json" (default, recommended) -----------------------
     A static file this repo serves. Apps Script writes it from the Sheet.
     Nothing private ever reaches the browser because the publisher strips
     it server-side. No key needed.                                       */
  json: {
    url: "data/directory.json",
  },

  /* ---- Option B: "sheets-csv" ----------------------------------------
     File > Share > Publish to web > pick the tab > CSV. No API key at all.

     ⚠️  Publishing a tab makes EVERY column on it readable by anyone with
     the link. Publish a tab that contains public columns only. Do not
     publish a tab that has email, phone, or address on it.                */
  sheetsCsv: {
    // From the publish dialog URL: .../d/e/THIS_PART/pub?...
    publishedId: "PASTE_PUBLISHED_ID_HERE",
    rosterGid: "0",          // tab gid, from the URL after #gid=
    pagesGid: "",            // optional
    eventsGid: "",           // optional
  },

  /* ---- Option C: "sheets-api" ----------------------------------------
     Google Sheets API v4 with an API key.

     ⚠️  The key ships to the browser in plain text. Anyone can read it and
     query the whole spreadsheet, including tabs and columns this app never
     displays. Point it at a spreadsheet that holds public data only, and
     restrict the key by HTTP referrer in the Cloud console.

     Setup: Cloud console > APIs & Services > enable "Google Sheets API",
     create an API key, restrict it to Sheets API + your domain. Then set
     the spreadsheet to "Anyone with the link can view".                   */
  sheetsApi: {
    apiKey: "PASTE_API_KEY_HERE",
    spreadsheetId: "PASTE_SPREADSHEET_ID_HERE",
    rosterRange: "Roster!A:Z",
    pagesRange: "Pages!A:E",
    eventsRange: "Events!A:D",
  },

  /* ---- Option D: "apps-script" ---------------------------------------
     Deploy a Web App from the same Apps Script project ("Anyone" access)
     that returns the directory JSON. No key in the browser, and the script
     decides what to expose. Best option if you want live reads without
     publishing a spreadsheet.                                             */
  appsScript: {
    url: "PASTE_WEB_APP_URL_HERE",
  },

  /* --------------------------------------------------------------------
     2. BRANDING
     ------------------------------------------------------------------ */
  brand: {
    title: "South Carolina State University National Alumni Association Greenville Chapter",
    // Shown in the browser tab and when the link is shared. The full name
    // above is too long for either. Falls back to title if left blank.
    shortTitle: "SCSUNAA Greenville",
    subtitle: "",
    foundedYear: "1918",

    // Garnet and blue. Replace with the chapter's official values if you
    // have them; the university's published brand guide is the source of
    // truth, not the color-code aggregator sites.
    primary: "#7A1220",     // garnet
    secondary: "#14213D",   // navy

    // Path or full URL to a logo. Leave "" to show initials instead.
    // The chapter seal. It's round on a white field, so the crest renders as a
    // white disc rather than the garnet square used for the initials fallback.
    logoUrl: "scsgacac_logo.jpg",
    // Shown if the logo fails to load, and on member photo placeholders.
    initials: "SCSU",

    // Stand-in for members with no photo yet, and the fallback when a photo
    // fails to load. Put it at the repo root, not in photos/ — that directory
    // is gitignored and is managed by the publisher. Leave "" to show the
    // member's initials instead.
    placeholderPhoto: "",
  },

  /* --------------------------------------------------------------------
     2b. LINKS
     Each of these is optional. Leave one "" and its button or icon is
     hidden rather than rendered dead. The matching Settings tab keys
     (membership_form_url, facebook_url, instagram_url) override these.
     ------------------------------------------------------------------ */
  links: {
    // The Google Form members fill in to join or update their listing.
    membershipForm:
      "https://docs.google.com/forms/d/e/1FAIpQLSc3hhMeRCVDRa-g8WLkq-Ix-gj5fgRGoTkwDdfDlzBpFCYBIQ/viewform",

    // The parent organization. Shown in the site footer and on the print
    // cover. Leave "" to hide the footer entirely.
    nationalAssociation: "https://www.scsunaa.org/",

    // Social accounts, shown as icons in the header.
    facebook: "https://www.facebook.com/scstategreenvillealumni",
    instagram: "https://www.instagram.com/greenvillescsunaa/",
  },

  /* --------------------------------------------------------------------
     3. BEHAVIOR
     ------------------------------------------------------------------ */
  options: {
    // Set false to hide birthdays everywhere, including print.
    showBirthdays: true,
    // Members with status other than these are never rendered.
    visibleStatuses: ["active"],
    // Members per page in the printed roster grid (3 across reads well).
    printColumns: 3,
    // Refresh interval in minutes for live sources. 0 disables.
    // Ignored for source:"json" — that file only changes when the publisher
    // commits, and the fetch already revalidates cheaply on page load.
    refreshMinutes: 0,
  },

  /* --------------------------------------------------------------------
     4. COLUMN NAMES
     Only touch this if your sheet headers differ from SETUP.md. Keys are
     normalized (lowercased, spaces to underscores) before matching.
     ------------------------------------------------------------------ */
  columns: {
    id: "id",
    status: "status",
    firstName: "first_name",
    lastName: "last_name",
    preferredName: "preferred_name",
    gradYear: "grad_year",
    major: "major",
    birthMonth: "birth_month",
    birthDay: "birth_day",
    funFact: "fun_fact",
    committees: "committees",
    offices: "offices",
    organizations: "organizations",
    // Sheet sources only. If this column holds a Drive share URL, it is
    // rewritten to Drive's 600px thumbnail endpoint, which requires the file
    // to be shared "anyone with the link". Falls back to `photo_file_id`.
    // The json and apps-script sources ignore this and use the committed image.
    photo: "photo",
    email: "email",
    phone: "phone",
    city: "city",
    state: "state",
    showEmail: "show_email",
    showPhone: "show_phone",
    showCity: "show_city",
  },
};
