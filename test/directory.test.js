const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dataPath = path.join(__dirname, '..', 'data', 'directory.json');
const skip = !fs.existsSync(dataPath) && 'no data/directory.json committed';

// PII columns from the Sheet that must never reach the public JSON. If any
// of these turns up on a member, the publisher's whitelist has regressed.
const FORBIDDEN = [
  'birth_year',
  'ssn',
  'address',
  'street',
  'zip',
  'zipcode',
  'photo_file_id',
  'photo_published_id',
  'status',
  'last_updated',
  'show_email',
  'show_phone',
  'show_city',
];

test('directory.json parses and has the top-level keys the site reads', { skip }, () => {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  for (const k of ['settings', 'members', 'pages', 'events']) {
    assert.ok(k in data, `missing key: ${k}`);
  }
  assert.ok(Array.isArray(data.members));
});

test('no member carries a private or sheet-internal field', { skip }, () => {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  for (const m of data.members) {
    for (const bad of FORBIDDEN) {
      assert.ok(!(bad in m), `member ${m.id ?? '?'} has forbidden field: ${bad}`);
    }
  }
});

test('every member has a well-formed id and grad_year', { skip }, () => {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  for (const m of data.members) {
    assert.ok(m.id, 'member missing id');
    assert.match(String(m.id), /^[a-z0-9-]+$/, `bad id: ${m.id}`);
    if (m.grad_year) {
      assert.match(String(m.grad_year), /^\d{4}$/, `bad grad_year on ${m.id}`);
    }
  }
});
