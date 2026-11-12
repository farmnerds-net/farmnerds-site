import { readFile, writeFile } from '../../server/github.js';
import { json } from '../../server/session.js';
import { STAMP_IDS } from '../../server/paths.js';

const LIST = 'src/data/downloads.json';   // written every 15 minutes by the checker (scripts/downloads)
const BOX = 'src/data/downloads-box.json'; // which downloads the homepage sidebar shows
const STAMPS = 'src/data/downloads-stamps.json'; // trust stamp per download, kept apart so the checker never wipes it

export async function onRequestGet({ env }) {
  const [list, box, stamps] = await Promise.all([readFile(env, LIST), readFile(env, BOX), readFile(env, STAMPS)]);
  return json({ list: list ? JSON.parse(list.text) : { items: [] }, listSha: list?.sha, box: box ? JSON.parse(box.text) : {}, boxSha: box?.sha,
    stamps: stamps ? JSON.parse(stamps.text) : {} });
}

// Saves the sidebar picks, and any versions fixed by hand.
export async function onRequestPut({ request, env }) {
  const { box, boxSha, fixes, stamps } = await request.json();
  const list = await readFile(env, LIST);
  const data = list ? JSON.parse(list.text) : { items: [] };
  const ids = new Set(data.items.map((i) => i.id));
  const out = {};

  const cleanBox = {
    show: !!box?.show,
    title: String(box?.title || 'Latest downloads').slice(0, 60),
    items: [...new Set((box?.items || []).filter((id) => ids.has(id)))],
  };
  out.boxSha = (await writeFile(env, BOX, { text: JSON.stringify(cleanBox, null, 2) + '\n', sha: boxSha, message: 'Update downloads box' })).sha;

  // Trust stamps: only known downloads and known stamps. Saved only when something changed.
  if (stamps && typeof stamps === 'object') {
    const clean = {};
    for (const item of data.items) if (STAMP_IDS.includes(stamps[item.id])) clean[item.id] = stamps[item.id];
    const cur = await readFile(env, STAMPS);
    const text = JSON.stringify(clean, null, 2) + '\n';
    if (!cur || cur.text !== text) out.stampsSha = (await writeFile(env, STAMPS, { text, sha: cur?.sha, message: 'Update download stamps' })).sha;
  }

  // A hand fix only touches the version, date and links. The next automatic check moves it on when something newer comes out.
  const url = (s) => (/^https:\/\/[^\s"<>]+$/.test(s || '') ? s : '');
  let fixed = 0;
  for (const item of data.items) {
    const f = fixes?.[item.id];
    if (!f || !String(f.version || '').trim()) continue;
    const version = String(f.version).trim().slice(0, 40);
    const date = f.date && !isNaN(new Date(f.date)) ? new Date(f.date + 'T12:00:00Z').toISOString() : item.date;
    const file = url(f.file);
    if (version === item.version && date === item.date && url(f.url) === item.url && file === (item.file || '')) continue;
    // A hand-entered direct link replaces the old one; leaving it empty sends visitors to the vendor's page.
    Object.assign(item, { version, date, url: url(f.url), file, fileLabel: file ? String(f.fileLabel || item.fileLabel || 'Download').slice(0, 40) : '', found: new Date().toISOString() });
    fixed++;
  }
  if (fixed) {
    // Read again right before saving, in case the checker saved in the meantime.
    out.listSha = (await writeFile(env, LIST, { text: JSON.stringify(data, null, 2) + '\n', sha: list.sha, message: `Fix ${fixed} download version${fixed > 1 ? 's' : ''} by hand` })).sha;
  }
  return json({ ok: true, fixed, ...out });
}
