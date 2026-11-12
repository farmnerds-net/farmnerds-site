// The boxes in the right column of the homepage, top to bottom. Saved to src/data/sidebar.json.
// Every box has: id, type, show, title, color. The rest depends on the type (see TYPES).
// The editor sends whatever was typed; this tidies it so the site build never sees anything odd.

export const PATH = 'src/data/sidebar.json';
export const TYPES = ['stats', 'posts', 'status', 'links', 'spotlight', 'text', 'downloads'];
export const COLORS = ['', 'tech', 'lab', 'stead', 'fl'];
export const SOURCES = ['reviews', 'all', 'featured', 'tech', 'homelab', 'homestead', 'farmlabs'];
export const STATES = ['up', 'warn', 'down'];
const MAX_BOXES = 20;

const str = (v, n = 120) => String(v ?? '').trim().slice(0, n);
const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : d);
const pick = (v, list, d = list[0]) => (list.includes(v) ? v : d);
const rows = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
// Links may point at a page on this site ("/support/") or anywhere on the web (https://…).
export const link = (s) => { s = str(s, 500); return /^(https?:\/\/[^\s"<>]+|\/(?!\/)[^\s"<>]*)$/.test(s) ? s : ''; };
// Photos come from the editor's own uploads only.
const photo = (s) => { s = str(s, 300); return /^\/uploads\/[\w./-]+$/.test(s) && !s.includes('..') ? s : ''; };

function cleanOne(b, used) {
  const type = pick(b?.type, TYPES, null);
  if (!type) return null;
  let id = str(b.id, 40).toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!id || used.has(id)) { let n = 1; do id = `${type}-${n++}`; while (used.has(id)); }
  used.add(id);
  const box = { id, type, show: b.show !== false, title: str(b.title, 60), color: pick(b.color, COLORS, '') };
  switch (type) {
    case 'stats':
      box.tiles = rows(b.tiles, 8).map((t) => ({ label: str(t?.label, 30), value: str(t?.value, 20) })).filter((t) => t.label || t.value);
      box.meters = rows(b.meters, 4).map((m) => ({ label: str(m?.label, 30), used: num(m?.used), total: num(m?.total, 100) || 100, unit: str(m?.unit, 10) })).filter((m) => m.label);
      box.note = str(b.note, 80);
      break;
    case 'posts':
      box.source = pick(b.source, SOURCES);
      box.count = Math.min(10, Math.max(1, Math.round(num(b.count, 5))));
      box.style = pick(b.style, ['list', 'thumbs']);
      break;
    case 'status':
      box.items = rows(b.items, 16).map((s) => ({ label: str(s?.label, 40), state: pick(s?.state, STATES), note: str(s?.note, 40) })).filter((s) => s.label);
      box.note = str(b.note, 80);
      break;
    case 'links':
      box.items = rows(b.items, 12).map((l) => ({ label: str(l?.label, 60), url: link(l?.url), note: str(l?.note, 60) })).filter((l) => l.label && l.url);
      break;
    case 'spotlight':
      box.chip = str(b.chip, 30);
      box.heading = str(b.heading, 90);
      box.text = str(b.text, 240);
      box.url = link(b.url);
      box.image = photo(b.image);
      break;
    case 'text':
      box.lead = str(b.lead, 120);
      box.text = str(b.text, 500);
      box.logo = !!b.logo;
      box.button = { label: str(b.button?.label, 40), url: link(b.button?.url) };
      break;
    case 'downloads':
      break; // what's in it is picked on the Downloads screen
  }
  return box;
}

export function cleanBoxes(list) {
  const used = new Set();
  let downloads = false;
  const out = [];
  for (const b of rows(list, MAX_BOXES)) {
    const c = cleanOne(b, used);
    if (!c) continue;
    if (c.type === 'downloads') { if (downloads) continue; downloads = true; } // only one downloads box
    out.push(c);
  }
  return { boxes: out };
}
