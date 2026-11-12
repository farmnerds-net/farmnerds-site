// Checks every source in sources.mjs and updates src/data/downloads.json when something new is out.
// GitHub runs this every 15 minutes (.github/workflows/downloads.yml). Run it yourself with:
//   node scripts/downloads/check.mjs
// Add --dry to only print what it finds without saving.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { SOURCES, GROUPS, compareVersions } from './sources.mjs';

const FILE = new URL('../../src/data/downloads.json', import.meta.url);
const dry = process.argv.includes('--dry');
const UA = 'FarmNerdsDownloadChecker/1.0 (+https://farmnerds.net/downloads/)';

let old = { items: [] };
try { old = JSON.parse(await readFile(FILE, 'utf8')); } catch {}
const before = new Map((old.items || []).map((i) => [i.id, i]));
const now = new Date().toISOString();

/** Make sure a direct download link really answers before we put it on the site. Only asks for the headers, never the file. */
async function works(url) {
  if (!/^https:\/\//.test(url || '')) return false;
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, { method, redirect: 'follow', headers: { 'User-Agent': UA, ...(method === 'GET' ? { Range: 'bytes=0-0' } : {}) }, signal: AbortSignal.timeout(15000) });
      res.body?.cancel?.();
      if (res.ok || res.status === 206) return true;
      if (res.status !== 405 && res.status !== 403) return false;
    } catch { /* try the next way */ }
  }
  return false;
}

const results = await Promise.allSettled(SOURCES.map(async (s) => {
  const r = await s.check();
  if (r.file && !(await works(r.file))) { r.hint = `direct link didn't answer: ${r.file}`; delete r.file; }
  return r;
}));
const changes = [], problems = [], hints = [];

const items = SOURCES.map((s, i) => {
  const prev = before.get(s.id) || {};
  const r = results[i];
  const item = {
    id: s.id, name: s.name, vendor: s.vendor, group: s.group, note: s.note || '', page: s.page,
    version: prev.version || '', date: prev.date || '', url: prev.url || '', found: prev.found || '',
    file: prev.file || '', fileLabel: prev.fileLabel || '',
  };
  if (r.status === 'rejected') {
    problems.push(`${s.name}: ${r.reason?.message || r.reason}`);
    return item;
  }
  const { version, date, url, file, fileLabel, hint } = r.value;
  if (hint) hints.push(`${s.name}: ${hint}`);
  const newer = version && (!item.version || compareVersions(version, item.version) > 0);
  // Only move forward. A stale or half-loaded vendor page never rolls a version back.
  if (newer) {
    changes.push(`${s.name} ${version}`);
    // No release date from the vendor: use the time we spotted it, unless this is the very first check.
    Object.assign(item, { version, date: date || (item.version ? now : ''), url: url || '', found: now, file: file || '', fileLabel: file ? fileLabel || '' : '' });
  } else if (version && compareVersions(version, item.version) === 0 && file && file !== item.file) {
    // Same version, but we now have (or have a better) direct link to it.
    Object.assign(item, { file, fileLabel: fileLabel || '' });
  }
  return item;
});

console.log('\nWhat each vendor says right now:');
console.table(SOURCES.map((s, i) => {
  const r = results[i];
  return { id: s.id, version: r.status === 'fulfilled' ? r.value.version : 'FAILED', direct: r.status === 'fulfilled' && r.value.file ? r.value.file.replace(/^https:\/\//, '').slice(0, 70) : '' };
}));
if (problems.length) console.log('\nCould not check (old version kept):\n  ' + problems.join('\n  '));
if (hints.length) console.log('\nNotes:\n  ' + hints.join('\n  '));

const next = { groups: GROUPS, items };
const changed = JSON.stringify(next) !== JSON.stringify({ groups: old.groups, items: old.items });
console.log(changes.length ? `\nNew: ${changes.join(', ')}` : '\nNo new versions.');
console.log('\nResult:\n' + JSON.stringify(next));

if (changed && !dry) {
  await writeFile(FILE, JSON.stringify(next, null, 2) + '\n');
  // Tell the workflow what to put in the commit message.
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `summary=${(changes.join(', ') || 'Update download links').slice(0, 200)}\n`);
}
