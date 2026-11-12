import { isSignedIn, json } from '../../server/session.js';
import { GitHubError } from '../../server/github.js';

// Everything under /api needs a signed-in editor, except signing in itself.
export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const open = url.pathname === '/api/login' || url.pathname === '/api/me';
  if (!env.ADMIN_PASSWORD || !env.GITHUB_TOKEN) {
    if (url.pathname === '/api/me') return json({ signedIn: false, setup: true });
    return json({ error: 'The editor is not set up yet. ADMIN_PASSWORD and GITHUB_TOKEN need to be added in Cloudflare.' }, 503);
  }
  // Changes must come from our own pages, as JSON or an upload sent by our script.
  if (request.method !== 'GET' && request.headers.get('X-FarmNerds') !== '1') return json({ error: 'Bad request.' }, 400);
  if (!open && !(await isSignedIn(request, env))) return json({ error: 'Please sign in again.' }, 401);
  try {
    return await next();
  } catch (err) {
    if (err instanceof GitHubError) return json({ error: err.message }, err.status === 409 ? 409 : 502);
    return json({ error: 'Something went wrong on the server. Try again.' }, 500);
  }
}
