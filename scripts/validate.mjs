// `npm run validate` — the safety net for agent-ingested data.
// Exits non-zero on any error so CI (and the ingestion ritual) can't ship
// a hallucinated venue or a malformed time.

import { loadData } from './lib/data.mjs';

const { weeks, days, errors, warnings } = loadData();

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\nValidation failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log(
  `✓ Data valid: ${weeks.length} week(s), ${days.length} day sheet(s)` +
    (warnings.length ? `, ${warnings.length} warning(s)` : '')
);
