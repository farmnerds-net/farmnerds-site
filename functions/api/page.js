import { readFile, writeFile } from '../../server/github.js';
import { parsePost, buildPost } from '../../server/frontmatter.js';
import { PAGES, pagePath } from '../../server/paths.js';
import { json } from '../../server/session.js';

// The About and Support pages. Same file format as posts: settings on top, wording below.
export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get('id');
  const path = pagePath(id);
  if (!path) return json({ pages: Object.entries(PAGES).map(([id, name]) => ({ id, name })) });
  const file = await readFile(env, path);
  if (!file) return json({ error: 'That page is missing from the site files.' }, 404);
  return json({ ...parsePost(file.text), sha: file.sha, name: PAGES[id] });
}

const okLink = (u) => { try { return ['https:', 'http:', 'mailto:'].includes(new URL(u).protocol); } catch { return false; } };

export async function onRequestPut({ request, env }) {
  const { id, data, body, sha } = await request.json();
  const path = pagePath(id);
  if (!path || !sha) return json({ error: 'Unknown page.' }, 400);
  const title = String(data?.title ?? '').trim();
  if (!title) return json({ error: 'Give the page a heading first.' }, 400);
  const buttons = (Array.isArray(data.buttons) ? data.buttons : [])
    .map((b) => ({ label: String(b?.label ?? '').trim(), url: String(b?.url ?? '').trim() }))
    .filter((b) => b.label || b.url);
  const bad = buttons.find((b) => !b.label || !okLink(b.url));
  if (bad) return json({ error: `The button "${bad.label || bad.url}" needs both a label and a full link starting with https://` }, 400);
  const clean = { label: String(data.label ?? '').trim() || PAGES[id], title, description: String(data.description ?? '').trim(), buttons };
  const saved = await writeFile(env, path, { text: buildPost(clean, body), sha, message: `Update ${PAGES[id]} page` });
  return json({ ok: true, sha: saved.sha });
}
