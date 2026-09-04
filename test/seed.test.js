const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const seedPath = path.join(__dirname, '..', 'seed.js');

function runSeed(n) {
  const out = execFileSync('node', [seedPath, String(n)], { encoding: 'utf8' });
  return JSON.parse(out);
}

test('output has the top-level keys the site expects', () => {
  const data = runSeed(5);
  for (const k of ['generated_at', 'settings', 'members', 'pages', 'events']) {
    assert.ok(k in data, `missing top-level key: ${k}`);
  }
  assert.ok(Array.isArray(data.members));
  assert.ok(Array.isArray(data.pages));
  assert.ok(Array.isArray(data.events));
});

test('member count matches the argument', () => {
  assert.equal(runSeed(5).members.length, 5);
  assert.equal(runSeed(34).members.length, 34);
});

// Enforces the PUBLIC_MEMBER_FIELDS whitelist + the three opt-in fields
// (email, phone, location). Anything else is a schema drift bug.
test('every member field is on the whitelist', () => {
  const allowed = new Set([
    'id',
    'first_name',
    'last_name',
    'preferred_name',
    'grad_year',
    'major',
    'birth_month',
    'birth_day',
    'fun_fact',
    'committees',
    'offices',
    'organizations',
    'photo',
    'email',
    'phone',
    'location',
  ]);
  for (const m of runSeed(20).members) {
    for (const k of Object.keys(m)) {
      assert.ok(allowed.has(k), `member ${m.id} has non-whitelisted field: ${k}`);
    }
  }
});

// SETUP.md invariant: birth month/day only, never birth year.
test('birth_year never appears on any member', () => {
  for (const m of runSeed(20).members) {
    assert.ok(!('birth_year' in m), `member ${m.id} has birth_year`);
  }
});

test('seed is deterministic (mulberry32 at 1896)', () => {
  assert.deepEqual(runSeed(20), runSeed(20));
});

test('grad_year is exactly four digits', () => {
  for (const m of runSeed(20).members) {
    assert.match(m.grad_year, /^\d{4}$/, `bad grad_year on ${m.id}: ${m.grad_year}`);
  }
});

test('id is a valid slug', () => {
  for (const m of runSeed(20).members) {
    assert.match(m.id, /^[a-z0-9-]+$/, `bad id: ${m.id}`);
  }
});

test('opt-in fields are omitted when unset (not empty string)', () => {
  // publish.gs emits them omitted; seed.js must match so tests of "field
  // presence == opt-in" don't get bypassed by a stray "".
  for (const m of runSeed(50).members) {
    if ('email' in m) assert.notEqual(m.email, '');
    if ('phone' in m) assert.notEqual(m.phone, '');
    if ('location' in m) assert.notEqual(m.location, '');
  }
});
