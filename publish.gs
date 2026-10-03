/**
 * Alumni Directory Publisher
 *
 * Reads the private Google Sheet, builds a PUBLIC json payload, and commits it
 * to a GitHub repo that GitHub Pages serves.
 *
 * Design rule that matters: private fields are excluded structurally, not by a
 * config toggle. buildMember() has a fixed whitelist. If a column isn't in it,
 * it cannot reach the public site, no matter what anyone checks in the UI.
 *
 * Setup: Extensions > Apps Script, paste this in, then follow SETUP.md.
 */

const CFG = {
  REPO_OWNER: 'CHANGE_ME',
  REPO_NAME: 'alumni-directory',
  BRANCH: 'main',

  DATA_PATH: 'data/directory.json',
  PHOTO_DIR: 'photos',
  PHOTO_WIDTH: 600,

  // Photos are committed one file per API call. Apps Script dies at 6 minutes,
  // so we drain the queue in batches and re-schedule ourselves until it's empty.
  PHOTO_BATCH: 20,

  // A commit is permanent: git keeps every version of every blob forever, and
  // GitHub's contents API has hard limits well below a modern phone photo.
  // Refuse anything oversized rather than bloating the repo irreversibly.
  MAX_PHOTO_BYTES: 2 * 1024 * 1024,

  // Name of the self-rescheduling photo trigger. Kept distinct from
  // scheduledPublish so cleaning these up can never delete the hourly trigger.
  PHOTO_TRIGGER: 'photoCatchUp',

  TAB_ROSTER: 'Roster',
  TAB_PAGES: 'Pages',
  TAB_EVENTS: 'Events',
  TAB_SETTINGS: 'Settings',
};

// Only these reach the public site. Ever.
const PUBLIC_MEMBER_FIELDS = [
  'id', 'first_name', 'last_name', 'preferred_name', 'grad_year', 'major',
  'birth_month', 'birth_day', 'fun_fact', 'committees', 'offices',
  'organizations', 'photo',
];

/* ------------------------------------------------------------------ menu */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Directory')
    .addItem('Publish now', 'publishNow')
    .addItem('Publish (data only, skip photos)', 'publishDataOnly')
    .addSeparator()
    .addItem('Check setup', 'checkSetup')
    .addToUi();
}

function publishNow() {
  const result = publish(true);
  toast(result);
}

function publishDataOnly() {
  toast(publish(false));
}

/** Hourly trigger. Silent, but failures go to the execution log. */
function scheduledPublish() {
  const result = publish(true);
  if (String(result).indexOf('FAILED') === 0) console.error(result);
}

/**
 * One-shot continuation for a photo backlog. Deletes itself first so a long
 * backfill can't accumulate against Apps Script's 20-trigger cap.
 */
function photoCatchUp() {
  clearPhotoTriggers();
  const result = publish(true);
  if (String(result).indexOf('FAILED') === 0) console.error(result);
}

function clearPhotoTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === CFG.PHOTO_TRIGGER) ScriptApp.deleteTrigger(t);
  });
}

/** Form submissions land as status=pending; an officer flips to active to publish. */
function onFormSubmit() {
  syncFormResponses();
}

/* --------------------------------------------------------------- publish */

function publish(includePhotos) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return 'Another publish is already running.';

  try {
    const rows = readTab(CFG.TAB_ROSTER);
    const members = rows
      .filter(function (r) { return String(r.status).toLowerCase() === 'active'; })
      .map(buildMember)
      .sort(function (a, b) {
        return (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name);
      });

    const payload = {
      generated_at: new Date().toISOString(),
      settings: readSettings(),
      members: members,
      pages: readPages(),
      events: readEvents(),
    };

    putFile(
      CFG.DATA_PATH,
      Utilities.base64Encode(Utilities.newBlob(JSON.stringify(payload, null, 2)).getBytes()),
      'Publish directory (' + members.length + ' members)'
    );

    let photoNote = '';
    if (includePhotos) {
      const remaining = syncPhotos(rows);
      photoNote = remaining > 0
        ? ' ' + remaining + ' photos still queued, continuing in the background.'
        : '';
    }

    return 'Published ' + members.length + ' members.' + photoNote;
  } catch (err) {
    console.error(err.stack || err.message);
    return 'FAILED: ' + err.message;
  } finally {
    lock.releaseLock();
  }
}

/** Whitelist enforcement lives here. */
function buildMember(row) {
  const m = {};
  PUBLIC_MEMBER_FIELDS.forEach(function (f) { m[f] = row[f] || ''; });

  m.id = m.id || slugify(row.first_name + '-' + row.last_name + '-' + row.grad_year);
  m.grad_year = String(row.grad_year || '').replace(/\D/g, '').slice(0, 4);
  m.committees = splitList(row.committees);
  m.offices = splitList(row.offices);
  m.organizations = splitList(row.organizations).slice(0, 10);
  m.photo = row.photo_file_id ? CFG.PHOTO_DIR + '/' + m.id + '.jpg' : '';

  // Opt-in only. Blank in the sheet means no.
  if (isYes(row.show_email) && row.email) m.email = row.email;
  if (isYes(row.show_phone) && row.phone) m.phone = row.phone;
  if (isYes(row.show_city) && row.city) {
    m.location = [row.city, row.state].filter(Boolean).join(', ');
  }

  return m;
}

function readSettings() {
  const rows = readTab(CFG.TAB_SETTINGS);
  const out = {};
  rows.forEach(function (r) { if (r.key) out[r.key] = r.value; });
  return out;
}

function readPages() {
  return readTab(CFG.TAB_PAGES)
    .filter(function (p) { return isYes(p.published) && p.title; })
    .sort(function (a, b) { return Number(a.order || 999) - Number(b.order || 999); })
    .map(function (p) {
      return {
        slug: p.slug || slugify(p.title),
        title: p.title,
        body: p.body || '',
        order: Number(p.order || 999),
      };
    });
}

function readEvents() {
  return readTab(CFG.TAB_EVENTS)
    .filter(function (e) { return e.date && e.title; })
    .map(function (e) {
      return {
        date: formatDate(e.date),
        title: e.title,
        location: e.location || '',
        notes: e.notes || '',
      };
    })
    .sort(function (a, b) { return a.date.localeCompare(b.date); });
}

/* ---------------------------------------------------------------- photos */

/**
 * Only pushes photos whose Drive file changed since last publish. Returns the
 * count still queued. Self-schedules if it didn't finish.
 */
function syncPhotos(rows) {
  const sheet = tab(CFG.TAB_ROSTER);
  const headers = headerMap(sheet);

  if (headers.photo_published_id === undefined) {
    throw new Error('Roster is missing a photo_published_id column. See SETUP.md.');
  }

  const pending = [];
  const stale = [];

  rows.forEach(function (r, i) {
    const rowIndex = i + 2; // +1 header, +1 to 1-based
    const id = r.id || slugify(r.first_name + '-' + r.last_name + '-' + r.grad_year);
    const published = String(r.photo_published_id || '');
    const active = String(r.status).toLowerCase() === 'active';
    const fileId = extractDriveId(r.photo_file_id);

    // Hidden or photo-cleared members: retire the published portrait so it
    // can't be fetched directly at photos/<id>.jpg.
    if (published && (!active || !fileId)) {
      stale.push({ rowIndex: rowIndex, id: id });
      return;
    }
    if (!active || !fileId || fileId === published) return;
    pending.push({ rowIndex: rowIndex, fileId: fileId, id: id });
  });

  stale.forEach(function (p) {
    try {
      deleteFile(CFG.PHOTO_DIR + '/' + p.id + '.jpg', 'Retire photo: ' + p.id);
      sheet.getRange(p.rowIndex, headers.photo_published_id + 1).setValue('');
    } catch (err) {
      console.error('Photo retire failed for ' + p.id + ': ' + err.message);
    }
  });

  const batch = pending.slice(0, CFG.PHOTO_BATCH);
  batch.forEach(function (p) {
    try {
      const b64 = fetchThumbnail(p.fileId);
      putFile(CFG.PHOTO_DIR + '/' + p.id + '.jpg', b64, 'Photo: ' + p.id);
      sheet.getRange(p.rowIndex, headers.photo_published_id + 1).setValue(p.fileId);
    } catch (err) {
      console.error('Photo failed for ' + p.id + ': ' + err.message);
    }
  });

  const remaining = pending.length - batch.length;
  if (remaining > 0) {
    clearPhotoTriggers();
    ScriptApp.newTrigger(CFG.PHOTO_TRIGGER).timeBased().after(60 * 1000).create();
  }
  return remaining;
}

/**
 * Resized JPEG with the phone's EXIF rotation already applied. The
 * drive.google.com/thumbnail endpoint drops that flag, so portraits
 * publish sideways.
 */
function fetchThumbnail(fileId) {
  const oriented = fetchOrientedThumb(fileId);
  if (oriented) return oriented;

  const url = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w' + CFG.PHOTO_WIDTH;
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    followRedirects: true,
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() === 200) {
    return encodeCapped(res.getBlob(), fileId);
  }
  // Fallback: original file, unresized. Usually 3-5MB from a phone.
  return encodeCapped(DriveApp.getFileById(fileId).getBlob(), fileId);
}

/**
 * Phone cameras store the pixels sideways and set an EXIF orientation flag
 * that viewers are supposed to apply. thumbnailLink is a JPEG with that
 * rotation already baked in. drive.google.com/thumbnail drops the flag, so
 * the committed file displays sideways.
 */
function fetchOrientedThumb(fileId) {
  const meta = UrlFetchApp.fetch(
    'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?fields=thumbnailLink',
    {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    }
  );
  if (meta.getResponseCode() !== 200) return null;

  const link = JSON.parse(meta.getContentText()).thumbnailLink;
  if (!link) return null;

  // Drive hands back a 220px link. Asking for a wider size keeps the rotation.
  const sized = String(link).replace(/=s\d+/, '=w' + CFG.PHOTO_WIDTH);
  const img = UrlFetchApp.fetch(sized, { followRedirects: true, muteHttpExceptions: true });
  if (img.getResponseCode() !== 200) return null;
  return encodeCapped(img.getBlob(), fileId);
}

/**
 * Refuse oversized blobs. Git history is permanent, so a committed 5MB
 * original bloats every clone forever — fail the one photo loudly instead.
 */
function encodeCapped(blob, fileId) {
  const bytes = blob.getBytes();
  if (bytes.length > CFG.MAX_PHOTO_BYTES) {
    throw new Error(
      'Photo ' + fileId + ' is ' + Math.round(bytes.length / 1024) + 'KB, over the ' +
      Math.round(CFG.MAX_PHOTO_BYTES / 1024) + 'KB cap. Drive would not return a ' +
      'thumbnail for it. Re-upload a smaller image, or check the file is an image at all.');
  }
  return Utilities.base64Encode(bytes);
}

function extractDriveId(value) {
  if (!value) return '';
  const s = String(value);
  const m = s.match(/[-\w]{25,}/);
  return m ? m[0] : '';
}

/* ---------------------------------------------------------------- github */

// Read once per execution rather than twice per file committed.
let TOKEN_CACHE = null;

function token() {
  if (TOKEN_CACHE) return TOKEN_CACHE;
  const t = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!t) throw new Error('GITHUB_TOKEN not set in Script Properties. See SETUP.md.');
  TOKEN_CACHE = t;
  return t;
}

function apiUrl(path) {
  return 'https://api.github.com/repos/' + CFG.REPO_OWNER + '/' + CFG.REPO_NAME +
    '/contents/' + path.split('/').map(encodeURIComponent).join('/');
}

function getSha(path) {
  const res = UrlFetchApp.fetch(apiUrl(path) + '?ref=' + CFG.BRANCH, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json' },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() === 404) return null;
  if (res.getResponseCode() >= 300) {
    throw new Error('GitHub GET ' + path + ': ' + res.getResponseCode() + ' ' + res.getContentText());
  }
  return JSON.parse(res.getContentText()).sha;
}

function putFile(path, base64Content, message) {
  const body = {
    message: message,
    content: base64Content,
    branch: CFG.BRANCH,
  };
  const sha = getSha(path);
  if (sha) body.sha = sha;

  const res = UrlFetchApp.fetch(apiUrl(path), {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json' },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code >= 300) {
    throw new Error('GitHub PUT ' + path + ': ' + code + ' ' + res.getContentText());
  }
}

/**
 * Removes a file from the branch tip. The blob stays in git history; erasing
 * a photo entirely requires rewriting history or deleting the repo.
 */
function deleteFile(path, message) {
  const sha = getSha(path);
  if (!sha) return false;

  const res = UrlFetchApp.fetch(apiUrl(path), {
    method: 'delete',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({ message: message, sha: sha, branch: CFG.BRANCH }),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code >= 300) {
    throw new Error('GitHub DELETE ' + path + ': ' + code + ' ' + res.getContentText());
  }
  return true;
}

/* ------------------------------------------------------------ form intake */

// Columns the officers own. A member re-submitting the form must never reset
// these, so the merge simply leaves whatever is already in the row.
const ADMIN_COLUMNS = ['status', 'id', 'committees', 'offices', 'photo_published_id'];

/**
 * Copies new form responses into Roster as status=pending, matching on email
 * so a re-submission updates the existing row instead of duplicating it.
 * Reads and writes the roster once per run, and only touches rows whose
 * values actually changed so last_updated stays meaningful.
 */
function syncFormResponses() {
  const formTab = SpreadsheetApp.getActive().getSheets().filter(function (s) {
    return /^Form Responses/.test(s.getName());
  })[0];
  if (!formTab) return;

  const roster = tab(CFG.TAB_ROSTER);
  const rHeaders = headerMap(roster);
  if (rHeaders.email === undefined) {
    throw new Error('Roster is missing an email column. See SETUP.md.');
  }

  const width = roster.getLastColumn();
  const lastRow = roster.getLastRow();
  const values = lastRow > 1 ? roster.getRange(2, 1, lastRow - 1, width).getValues() : [];
  const existingCount = values.length;

  const byEmail = Object.create(null);
  values.forEach(function (row, i) {
    const e = String(row[rHeaders.email] || '').toLowerCase().trim();
    if (e) byEmail[e] = i;
  });

  let dirty = false;

  readTab(formTab.getName()).forEach(function (resp) {
    const mapped = mapFormResponse(resp);
    if (!mapped.email) return;

    const key = String(mapped.email).toLowerCase().trim();
    const idx = byEmail[key];

    if (idx !== undefined) {
      const row = values[idx];
      let changed = false;
      Object.keys(mapped).forEach(function (k) {
        const c = rHeaders[k];
        if (c === undefined) return;
        if (ADMIN_COLUMNS.indexOf(k) !== -1) return;
        if (k === 'last_updated') return;  // would mark every row changed, every run
        if (String(row[c]) === String(mapped[k])) return;
        row[c] = mapped[k];
        changed = true;
      });
      if (changed) {
        if (rHeaders.last_updated !== undefined) row[rHeaders.last_updated] = mapped.last_updated;
        dirty = true;
      }
      return;
    }

    const row = new Array(width).fill('');
    Object.keys(mapped).forEach(function (k) {
      if (rHeaders[k] !== undefined) row[rHeaders[k]] = mapped[k];
    });
    // New submissions land as pending. Nothing goes live until an officer says so.
    if (rHeaders.status !== undefined) row[rHeaders.status] = 'pending';
    if (rHeaders.id !== undefined) {
      row[rHeaders.id] = slugify(mapped.first_name + '-' + mapped.last_name + '-' + mapped.grad_year);
    }
    byEmail[key] = values.length;
    values.push(row);
  });

  if (dirty && existingCount) {
    roster.getRange(2, 1, existingCount, width).setValues(values.slice(0, existingCount));
  }
  if (values.length > existingCount) {
    roster.getRange(lastRow + 1, 1, values.length - existingCount, width)
      .setValues(values.slice(existingCount));
  }
}

/**
 * Right-hand keys must match Google Form question titles after normalization
 * (lowercased, non-alphanumerics collapsed to underscores).
 */
function mapFormResponse(r) {
  return {
    email: r.email_address || r.email || '',
    first_name: r.first_name || '',
    last_name: r.last_name || '',
    preferred_name: r.preferred_name || '',
    grad_year: String(r.graduation_year || '').replace(/\D/g, '').slice(0, 4),
    major: r.major || '',
    birth_month: r.birth_month || '',
    birth_day: r.birth_day || '',
    fun_fact: r.fun_fact || '',
    organizations: r.organization_affiliations || '',
    phone: r.phone || '',
    city: r.city || '',
    state: r.state || '',
    show_email: r.show_my_email_in_the_directory || '',
    show_phone: r.show_my_phone_in_the_directory || '',
    show_city: r.show_my_city_in_the_directory || '',
    photo_file_id: r.photo || '',
    last_updated: new Date(),
  };
}

/* --------------------------------------------------------------- helpers */

function tab(name) {
  const s = SpreadsheetApp.getActive().getSheetByName(name);
  if (!s) throw new Error('Missing tab: ' + name);
  return s;
}

function headerMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach(function (h, i) { map[normalizeKey(h)] = i; });
  return map;
}

/** Returns rows as objects keyed by normalized header. Column order irrelevant. */
function readTab(name) {
  const sheet = tab(name);
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = values[0].map(normalizeKey);
  return values.slice(1)
    .filter(function (row) { return row.some(function (c) { return c !== ''; }); })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { if (h) obj[h] = row[i]; });
      return obj;
    });
}

function normalizeKey(h) {
  return String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function splitList(v) {
  if (!v) return [];
  return String(v).split(/[,;]/).map(function (s) { return s.trim(); }).filter(Boolean);
}

function isYes(v) {
  return /^(yes|true|y|x|1|checked)$/i.test(String(v).trim());
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(d) {
  if (d instanceof Date) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(d);
}

function toast(msg) {
  SpreadsheetApp.getActive().toast(msg, 'Directory', 10);
}

/* ----------------------------------------------------------- diagnostics */

function checkSetup() {
  const issues = [];

  if (CFG.REPO_OWNER === 'CHANGE_ME') issues.push('CFG.REPO_OWNER is still CHANGE_ME.');
  if (!PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN')) {
    issues.push('GITHUB_TOKEN missing from Script Properties.');
  }

  [CFG.TAB_ROSTER, CFG.TAB_PAGES, CFG.TAB_EVENTS, CFG.TAB_SETTINGS].forEach(function (t) {
    if (!SpreadsheetApp.getActive().getSheetByName(t)) issues.push('Missing tab: ' + t);
  });

  try {
    const h = headerMap(tab(CFG.TAB_ROSTER));
    ['id', 'status', 'first_name', 'last_name', 'grad_year', 'photo_file_id', 'photo_published_id']
      .forEach(function (c) {
        if (h[c] === undefined) issues.push('Roster missing column: ' + c);
      });
  } catch (e) { /* already reported above */ }

  if (!issues.length) {
    try {
      getSha(CFG.DATA_PATH);
      SpreadsheetApp.getUi().alert(
        'Setup check\n\nAll good. Sheet tabs, columns, token, and the GitHub repo are all reachable.');
      return;
    } catch (err) {
      issues.push('GitHub unreachable: ' + err.message);
    }
  }

  SpreadsheetApp.getUi().alert(
    'Setup check\n\n' + issues.length + ' problem(s):\n\n- ' + issues.join('\n- '));
}
