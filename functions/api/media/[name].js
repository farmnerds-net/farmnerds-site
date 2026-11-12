import { readRaw } from '../../../server/github.js';

// Shows an uploaded photo straight from the repo, so it appears in the editor before the site has rebuilt.
export async function onRequestGet({ params, env }) {
  const name = String(params.name);
  if (!/^[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp|gif)$/i.test(name)) return new Response('Not found', { status: 404 });
  const res = await readRaw(env, `public/uploads/${name}`);
  if (!res.ok) return new Response('Not found', { status: 404 });
  const ext = name.split('.').pop().toLowerCase();
  const type = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext];
  return new Response(res.body, { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
}
