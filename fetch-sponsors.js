'use strict';

// Downloads the blog's sponsors from Open Collective into data/opencollective.json,
// which `npm run compile` reads to list sponsors on the home page. The file is
// gitignored, so run `npm run sponsors` to create or refresh it before compiling.

const fs = require('fs');
const path = require('path');

const url = 'https://opencollective.com/thecodebarbarian/members.json';
const dest = path.join(__dirname, 'data', 'opencollective.json');

run().catch(err => {
  console.error(err);
  process.exit(1);
});

async function run() {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const members = await res.json();

  // Active sponsors only. The members list also has the admin, the fiscal host,
  // contributors and one-time backers, and it keeps sponsors who stopped paying
  // with `isActive: false`.
  const sponsors = members.filter(member => {
    return member.role === 'BACKER' && member.tier === 'sponsor' && member.isActive;
  });

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(sponsors, null, 2) + '\n');

  console.log(`Wrote ${sponsors.length} active sponsors to ${path.relative(process.cwd(), dest)}`);
  for (const sponsor of sponsors) {
    console.log(`  ${sponsor.name} (${sponsor.website || sponsor.profile})`);
  }
}
