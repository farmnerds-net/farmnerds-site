import { readFile, writeFile } from '../../server/github.js';
import { json } from '../../server/session.js';

const LIST = 'src/data/downloads.json';   // written every 15 minutes by the checker (scripts/downloads)
const BOX = 'src/data/downloads-box.json'; // which downloads the homepage sidebar shows

export async function onRequestGet({ env }) {
  const [list, box] = await Promise.all([readFile(env, LIST), readFile(env, BOX)]);
  return json({ list: list ? JSON.parse(list.text) : { items: [] }, listSha: list?.sha, box: box ? JSON.parse(box.text) : {}, boxSha: box?.sha });
}

// Saves the sidebar picks, and any versions fixed by hand.
export async function onRequestPut({ request, env }) {
  const { box, boxSha, fixes } = await request.json();
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

  // A hand fix only touches the version, date and link. The next automatic check moves it on when something newer comes out.
  const url = (s) => (/^https:\/\/[^\s"<>]+$/.test(s || '') ? s : '');
  let fixed = 0;
  for (const item of data.items) {
    const f = fixes?.[item.id];
    if (!f || !String(f.version || '').trim()) continue;
    const version = String(f.version).trim().slice(0, 40);
    const date = f.date && !isNaN(new Date(f.date)) ? new Date(f.date + 'T12:00:00Z').toISOString() : item.date;
    if (version === item.version && date === item.date && url(f.url) === item.url) continue;
    Object.assign(item, { version, date, url: url(f.url), found: new Date().toISOString() });
    fixed++;
  }
  if (fixed) {
    // Read again right before saving, in case the checker saved in the meantime.
    out.listSha = (await writeFile(env, LIST, { text: JSON.stringify(data, null, 2) + '\n', sha: list.sha, message: `Fix ${fixed} download version${fixed > 1 ? 's' : ''} by hand` })).sha;
  }
  return json({ ok: true, fixed, ...out });
}
