#!/usr/bin/env node
/**
 * Generates sample directory.json files matching the publisher's output schema.
 *
 *   node seed.js 34  > data/directory.json
 *   node seed.js 200 > data/directory-200.json
 *
 * Zero dependencies, no package.json. Only makes fake people, never touches
 * real data.
 */

const fs = require('fs');
const path = require('path');

/**
 * Any image in photos/ is cycled across the sample roster; empty means every
 * member falls back to initials. publish.gs writes photos/<member-id>.jpg in
 * real use — this only touches sample data.
 */
function availablePhotos() {
  try {
    return (
      fs
        .readdirSync(path.join(__dirname, 'photos'))
        .filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f))
        .sort()
        // Encoded so a filename with spaces still produces a usable src.
        .map((f) => 'photos/' + encodeURIComponent(f))
    );
  } catch {
    return [];
  }
}

const PHOTOS = availablePhotos();

/* Math.random can't be seeded, and reproducible sample data is worth more than
   novelty here. mulberry32 is a small deterministic PRNG. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(1896);
const int = (n) => Math.floor(rand() * n);
const pick = (arr) => arr[int(arr.length)];

/** n distinct entries from arr, via a partial Fisher-Yates. */
function sample(arr, n) {
  if (n <= 0) return [];
  const copy = arr.slice();
  for (let i = 0; i < n; i++) {
    const j = i + int(copy.length - i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const FIRST = [
  'Anedra',
  'Marcus',
  'Yolanda',
  'Terrence',
  'Deborah',
  'Jerome',
  'Camille',
  'Andre',
  'Rochelle',
  'Darnell',
  'Patrice',
  'Reginald',
  'Vanessa',
  'Curtis',
  'Latasha',
  'Otis',
  'Sharonda',
  'Bernard',
  'Adrienne',
  'Maurice',
  'Gwendolyn',
  'Tyrone',
  'Felicia',
  'Clarence',
  'Monique',
  'Alonzo',
  'Kendra',
  'Rufus',
  'Jocelyn',
  'Wendell',
  'Tamika',
  'Horace',
  'Danielle',
  'Percy',
  'Simone',
  'Ellis',
  'Nakia',
  'Booker',
  'Charmaine',
  'Roosevelt',
];

const LAST = [
  'Brisbon',
  'Mayfield',
  'Grant',
  'Whitaker',
  'Singleton',
  'Pinckney',
  'Gadsden',
  'Ravenel',
  'Simmons',
  'Drayton',
  'Middleton',
  'Legare',
  'Manigault',
  'Bostick',
  'Frazier',
  'Prioleau',
  'McCloud',
  'Kirkpatrick',
  'Capleton',
  'Merriman',
  'Sheppard',
  'Mulligan',
  'Ivery',
  'Butler',
  'Lane',
  'Pratt',
  'Harrison',
  'Robinson',
  'Madison',
  'Giles',
];

const MAJORS = [
  'Accounting',
  'Biology',
  'Business Administration',
  'Civil Engineering',
  'Computer Science',
  'Criminal Justice',
  'Early Childhood Education',
  'Economics',
  'Electrical Engineering',
  'English',
  'Family & Consumer Sciences',
  'Health Sciences',
  'History',
  'Marketing',
  'Mathematics',
  'Music Education',
  'Nursing',
  'Nutritional Sciences',
  'Political Science',
  'Psychology',
  'Social Work',
  'Sociology',
  'Speech Pathology',
];

const COMMITTEES = [
  'Scholarship',
  'Fundraising',
  'Membership',
  'Homecoming',
  'Community Service',
  'Communications',
  'Finance',
  'Bylaws',
  'Hospitality',
  'Youth Mentoring',
];

const OFFICES = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Parliamentarian',
  'Chaplain',
  'Historian',
  'Sergeant-at-Arms',
];

const ORGS = [
  'Alpha Kappa Alpha',
  'Alpha Phi Alpha',
  'Delta Sigma Theta',
  'Kappa Alpha Psi',
  'Omega Psi Phi',
  'Phi Beta Sigma',
  'Sigma Gamma Rho',
  'Zeta Phi Beta',
  'Marching 101',
  'Concert Choir',
  'NAACP Youth Council',
  'ROTC',
  'Student Government Association',
  'National Society of Black Engineers',
];

const FACTS = [
  'Marched with the 101 for four straight years and still has the uniform.',
  'Has not missed a Homecoming since 1994.',
  'Met their spouse in the line at Hodge Hall registration.',
  'Coached three state championship teams after graduation.',
  'Can still recite the entire alma mater, second verse included.',
  'Opened the first Black-owned pharmacy in their county.',
  'Drove eleven hours to see the Bulldogs play and would do it again.',
  'Taught in the same district for 31 years before retiring.',
  "Started the chapter's first scholarship fund with $40 and a bake sale.",
  'Named their dog after a former dean. The dean knows.',
  'Ran track and still holds a relay record nobody talks about.',
  'Reads two books a week and will tell you about both.',
  'Retired Air Force. Twenty-four years, six countries.',
  'Sings lead in the church choir every third Sunday.',
  'Has fed the entire chapter out of one kitchen more than once.',
  'Sat in on the 1968 protests and does not tell that story lightly.',
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CITIES = [
  ['Orangeburg', 'SC'],
  ['Columbia', 'SC'],
  ['Charleston', 'SC'],
  ['Atlanta', 'GA'],
  ['Charlotte', 'NC'],
  ['Washington', 'DC'],
  ['Baltimore', 'MD'],
  ['Houston', 'TX'],
  ['Brooklyn', 'NY'],
  ['Philadelphia', 'PA'],
  ['Jacksonville', 'FL'],
  ['Greenville', 'SC'],
];

/** Weighted to skew toward the middle decades, the way a real chapter does. */
function gradYear() {
  const pool = [];
  for (let y = 1968; y < 1985; y++) pool.push(y, y);
  for (let y = 1985; y < 2005; y++) pool.push(y, y, y);
  for (let y = 2005; y < 2024; y++) pool.push(y);
  return pick(pool);
}

function member(i) {
  const first = pick(FIRST),
    last = pick(LAST);
  const year = gradYear();
  const [city, state] = pick(CITIES);

  const m = {
    id: slugify(`${first}-${last}-${year}-${i}`),
    first_name: first,
    last_name: last,
    preferred_name: '',
    grad_year: String(year),
    major: pick(MAJORS),
    birth_month: pick(MONTHS),
    birth_day: String(int(28) + 1),
    fun_fact: pick(FACTS),
    committees: sample(COMMITTEES, int(4)),
    offices: rand() < 0.18 ? sample(OFFICES, 1) : [],
    organizations: sample(ORGS, int(4)),
    photo: PHOTOS.length ? PHOTOS[i % PHOTOS.length] : '',
  };

  // Opt-in contact fields are omitted (not "") to match publish.gs output.
  if (rand() < 0.35) m.email = `${first[0].toLowerCase()}${last.toLowerCase()}@example.com`;
  if (rand() < 0.2) m.phone = `(803) 555-${String(int(9000) + 1000).padStart(4, '0')}`;
  if (rand() < 0.6) m.location = `${city}, ${state}`;

  return m;
}

const PAGES = [
  {
    slug: 'chapter-bylaws',
    title: 'Chapter Bylaws',
    order: 1,
    body:
      'Adopted March 1974. Last amended October 2023.\n\n' +
      'ARTICLE I. NAME\nThis body shall be known as the Chapter of the National Alumni ' +
      'Association, chartered under the constitution of the parent association.\n\n' +
      'ARTICLE II. PURPOSE\nTo perpetuate the bond between the University and its graduates, ' +
      'to raise and award scholarship funds to deserving students, and to support the ' +
      "University's mission through service and advocacy.\n\n" +
      'ARTICLE III. MEMBERSHIP\nMembership shall be open to all graduates and former students ' +
      'in good standing, and to friends of the University approved by a two-thirds vote.',
  },
  {
    slug: 'officers',
    title: 'Officers',
    order: 2,
    body:
      'Officers serve two-year terms beginning July 1 of even-numbered years. Nominations open ' +
      'each spring and are presented to the membership at the April meeting.',
  },
  {
    slug: 'membership-levels',
    title: 'Membership Levels',
    order: 3,
    body:
      'Annual — $50. Full voting rights, newsletter, directory listing.\n\n' +
      'Life — $750, payable in five annual installments. All annual benefits, permanent ' +
      'directory listing, and recognition at the fall banquet.\n\n' +
      'Young Alumni — $25. For graduates within five years of commencement.\n\n' +
      'Golden — Complimentary for graduates of fifty years or more.',
  },
  {
    slug: 'committees',
    title: 'Committees',
    order: 4,
    body:
      'Every member is asked to serve on at least one committee. Committees meet between ' +
      'general meetings and report at each monthly gathering.',
  },
  {
    slug: 'scholarship',
    title: 'Scholarship',
    order: 5,
    body:
      'The chapter awards two scholarships each spring to graduating seniors from the county ' +
      'who have been admitted to the University. Applications open January 15 and close March 1.',
  },
  {
    slug: 'fundraising-teams',
    title: 'Fundraising Teams',
    order: 6,
    body: 'Fish fry, spring gala, and the Homecoming raffle. Team captains are named each September.',
  },
  {
    slug: 'meetings',
    title: 'Meetings',
    order: 7,
    body:
      'General membership meets the second Saturday of each month at 10:00 a.m. Executive board ' +
      'meets the preceding Tuesday at 7:00 p.m. No general meeting in July or December.',
  },
  {
    slug: 'chapter-photos',
    title: 'Chapter Photos',
    order: 8,
    body: 'Photographs from recent chapter events.',
  },
  {
    slug: 'special-recognition',
    title: 'Special Recognition',
    order: 9,
    body:
      'Members who have given twenty-five years or more of continuous service, and those we ' +
      'have lost since the last directory was printed.',
  },
];

const EVENTS = [
  {
    date: '2026-09-12',
    title: 'Pack the Pantry Collection',
    location: 'Chapter House',
    notes: 'Bring non-perishables',
  },
  {
    date: '2026-10-10',
    title: 'Homecoming Tailgate',
    location: 'Stadium Lot C',
    notes: 'Setup at 8:00 a.m.',
  },
  {
    date: '2026-11-14',
    title: 'Fall Banquet',
    location: 'Convention Center',
    notes: 'Semi-formal, $45 per plate',
  },
  { date: '2027-01-17', title: 'Scholarship Applications Open', location: '', notes: '' },
  {
    date: '2027-02-11',
    title: 'Bulldog Alumni Getaway',
    location: '',
    notes: 'Through February 15',
  },
  {
    date: '2027-04-11',
    title: 'Spring Meeting and Elections',
    location: 'Chapter House',
    notes: '',
  },
];

const count = Number(process.argv[2] || 34);
if (!Number.isInteger(count) || count < 1) {
  console.error('usage: node seed.js [count]');
  process.exit(1);
}

const members = Array.from({ length: count }, (_, i) => member(i)).sort(
  (a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name),
);

console.error(
  PHOTOS.length
    ? `photos/: found ${PHOTOS.length} image(s), cycling them across ${count} members.`
    : 'photos/: empty, members will show initials. Drop images in and re-run.',
);

process.stdout.write(
  JSON.stringify(
    {
      generated_at: '2026-08-31T21:00:00Z',
      settings: {
        site_title:
          'Greenville Chapter\nSouth Carolina State University National Alumni Association',
        site_subtitle: '',
        founded_year: '1918',
        logo_url: 'scsunaa-gvl-logo-d.png',
        membership_form_url:
          'https://docs.google.com/forms/d/e/1FAIpQLSc3hhMeRCVDRa-g8WLkq-Ix-gj5fgRGoTkwDdfDlzBpFCYBIQ/viewform',
        color_primary: '#7A1220',
        color_secondary: '#14213D',
      },
      members,
      pages: PAGES,
      events: EVENTS,
    },
    null,
    2,
  ) + '\n',
);
