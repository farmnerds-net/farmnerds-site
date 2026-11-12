import { readFile, writeFile, deleteFile } from '../../server/github.js';
import { parsePost, buildPost } from '../../server/frontmatter.js';
import { postPath } from '../../server/paths.js';
import { json } from '../../server/session.js';

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  const path = postPath(q.get('type'), q.get('slug'));
  if (!path) return json({ error: 'Unknown post.' }, 400);
  const file = await readFile(env, path);
  if (!file) return json({ error: 'That post no longer exists.' }, 404);
  return json({ ...parsePost(file.text), sha: file.sha });
}

export async function onRequestPut({ request, env }) {
  const { type, slug, data, body, sha, isNew } = await request.json();
  const path = postPath(type, slug);
  if (!path) return json({ error: 'The web address for this post can only use lowercase letters, numbers and dashes.' }, 400);
  if (!data?.title?.trim()) return json({ error: 'Give the post a title first.' }, 400);
  if (isNew && (await readFile(env, path))) return json({ error: 'A post with that web address already exists. Change the title or address.' }, 409);
  const verb = isNew ? 'Add' : 'Update';
  const saved = await writeFile(env, path, { text: buildPost(data, body), sha: isNew ? undefined : sha, message: `${verb} ${type}: ${data.title.trim()}` });
  return json({ ok: true, sha: saved.sha });
}

export async function onRequestDelete({ request, env }) {
  const { type, slug, sha } = await request.json();
  const path = postPath(type, slug);
  if (!path || !sha) return json({ error: 'Unknown post.' }, 400);
  await deleteFile(env, path, { sha, message: `Delete ${type}: ${slug}` });
  return json({ ok: true });
}
