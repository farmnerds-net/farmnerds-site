// Checks every source in sources.mjs and updates src/data/downloads.json when something new is out.
// GitHub runs this every 15 minutes (.github/workflows/downloads.yml). Run it yourself with:
//   node scripts/downloads/check.mjs
// Add --dry to only print what it finds without saving.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { SOURCES, GROUPS, compareVersions } from './sources.mjs';

const FILE = new URL('../../src/data/downloads.json', import.meta.url);
const dry = process.argv.includes('--dry');

let old = { items: [] };
try { old = JSON.parse(await readFile(FILE, 'utf8')); } catch {}
const before = new Map((old.items || []).map((i) => [i.id, i]));
const now = new Date().toISOString();

const results = await Promise.allSettled(SOURCES.map((s) => s.check()));
const changes = [], problems = [];

const items = SOURCES.map((s, i) => {
  const prev = before.get(s.id) || {};
  const r = results[i];
  const item = {
    id: s.id, name: s.name, vendor: s.vendor, group: s.group, note: s.note || '', page: s.page,
    version: prev.version || '', date: prev.date || '', url: prev.url || '', found: prev.found || '',
  };
  if (r.status === 'rejected') {
    problems.push(`${s.name}: ${r.reason?.message || r.reason}`);
    return item;
  }
  const { version, date, url } = r.value;
  // Only move forward. A stale or half-loaded vendor page never rolls a version back.
  if (version && (!item.version || compareVersions(version, item.version) > 0)) {
    changes.push(`${s.name} ${version}`);
    Object.assign(item, { version, date: date || now, url: url || '', found: now });
  }
  return item;
});

console.log('\nWhat each vendor says right now:');
console.table(SOURCES.map((s, i) => ({ id: s.id, result: results[i].status === 'fulfilled' ? results[i].value.version : 'FAILED' })));
if (problems.length) console.log('\nCould not check (old version kept):\n  ' + problems.join('\n  '));

const next = { groups: GROUPS, items };
const changed = JSON.stringify(next) !== JSON.stringify({ groups: old.groups, items: old.items });
console.log(changes.length ? `\nNew: ${changes.join(', ')}` : '\nNo new versions.');
console.log('\nResult:\n' + JSON.stringify(next));

if (changed && !dry) {
  await writeFile(FILE, JSON.stringify(next, null, 2) + '\n');
  // Tell the workflow what to put in the commit message.
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `summary=${(changes.join(', ') || 'Update download list').slice(0, 200)}\n`);
}
