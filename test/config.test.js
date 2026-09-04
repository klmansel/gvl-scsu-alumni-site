const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

// config.js is a browser script (const CONFIG = {...} at top level, no export).
// Wrap it in a Function so `const` stays local, then return the value.
const src = readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
const CONFIG = new Function(src + '\n;return CONFIG;')();

test('source is one of the four supported values', () => {
  assert.ok(
    ['json', 'sheets-csv', 'sheets-api', 'apps-script'].includes(CONFIG.source),
    `unknown source: ${CONFIG.source}`,
  );
});

test('brand has title, primary, secondary; colors are valid hex', () => {
  for (const key of ['title', 'primary', 'secondary']) {
    assert.ok(key in CONFIG.brand, `brand.${key} missing`);
  }
  const hex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
  assert.match(CONFIG.brand.primary, hex);
  assert.match(CONFIG.brand.secondary, hex);
});

test('columns has every key the sheet-source adapters read', () => {
  const required = [
    'id',
    'status',
    'firstName',
    'lastName',
    'preferredName',
    'gradYear',
    'major',
    'birthMonth',
    'birthDay',
    'funFact',
    'committees',
    'offices',
    'organizations',
    'photo',
    'email',
    'phone',
    'city',
    'state',
    'showEmail',
    'showPhone',
    'showCity',
  ];
  for (const k of required) assert.ok(k in CONFIG.columns, `columns.${k} missing`);
});

test('options.visibleStatuses is a non-empty array', () => {
  assert.ok(Array.isArray(CONFIG.options.visibleStatuses));
  assert.ok(CONFIG.options.visibleStatuses.length > 0);
});

// The active source must be fully wired. Placeholders in an unused source
// don't matter (and shouldn't fail CI), but a PASTE_ in the source you're
// actually shipping means the site will throw on load.
test('active source has no PASTE_ placeholders', () => {
  const src = CONFIG.source;
  if (src === 'json') {
    assert.doesNotMatch(CONFIG.json.url, /PASTE_/);
  } else if (src === 'apps-script') {
    assert.doesNotMatch(CONFIG.appsScript.url, /PASTE_/);
  } else if (src === 'sheets-csv') {
    assert.doesNotMatch(CONFIG.sheetsCsv.publishedId, /PASTE_/);
  } else if (src === 'sheets-api') {
    assert.doesNotMatch(CONFIG.sheetsApi.apiKey, /PASTE_/);
    assert.doesNotMatch(CONFIG.sheetsApi.spreadsheetId, /PASTE_/);
  }
});
