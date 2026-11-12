import { writeFile, readFile } from '../../server/github.js';
import { json } from '../../server/session.js';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX = 8 * 1024 * 1024;

// Saves a photo into public/uploads. The request body is the image itself.
// The commit is marked so Cloudflare does not rebuild the site for every photo; it goes live with the next post save.
export async function onRequestPost({ request, env }) {
  const ext = TYPES[request.headers.get('Content-Type')];
  if (!ext) return json({ error: 'Only JPG, PNG, WebP and GIF pictures can be uploaded.' }, 400);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length || bytes.length > MAX) return json({ error: 'That picture is too large. Keep it under 8 MB.' }, 400);

  const wanted = (new URL(request.url).searchParams.get('name') || 'photo').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'photo';
  const stamp = new Date().toISOString().slice(0, 10);
  let name = `${stamp}-${wanted}.${ext}`;
  if (await readFile(env, `public/uploads/${name}`).catch(() => null)) name = `${stamp}-${wanted}-${Date.now().toString(36)}.${ext}`;

  let b64 = '';
  for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  await writeFile(env, `public/uploads/${name}`, { base64: btoa(b64), message: `Upload photo: ${name} [CF-Pages-Skip]` });
  return json({ url: `/uploads/${name}` });
}
