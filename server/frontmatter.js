// Posts are Markdown files with a settings block on top ("frontmatter").
// The editor writes each setting as `name: <JSON>`, which is also valid YAML, so Astro reads it as usual.

export function parsePost(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text, handEdited: true };
  const data = {};
  let handEdited = false;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) { handEdited = true; continue; } // nested YAML written by hand; the editor can't read it
    const raw = kv[2].trim();
    try { data[kv[1]] = JSON.parse(raw); }
    catch { if (raw === '') handEdited = true; data[kv[1]] = raw.replace(/^(['"])(.*)\1$/, '$2'); }
  }
  return { data, body: m[2].replace(/^\n+/, ''), handEdited };
}

export function buildPost(data, body) {
  const lines = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    lines.push(`${k}: ${JSON.stringify(v)}`);
  }
  return `---\n${lines.join('\n')}\n---\n\n${(body || '').trim()}\n`;
}
