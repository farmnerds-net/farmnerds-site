// Login sessions for the editor. A session is a signed cookie; no database needed.
const enc = new TextEncoder();
const COOKIE = 'fn_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}

// Compare two strings without leaking where they differ.
export async function safeEqual(a, b) {
  const [x, y] = await Promise.all([hmac('cmp', a), hmac('cmp', b)]);
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length && i < y.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function makeCookie(env) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const sig = await hmac(env.ADMIN_PASSWORD, `session.${exp}`);
  return `${COOKIE}=${exp}.${sig}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

export async function isSignedIn(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const m = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+)\\.([\\w-]+)`));
  if (!m || +m[1] < Date.now() / 1000) return false;
  return safeEqual(m[2], await hmac(env.ADMIN_PASSWORD, `session.${m[1]}`));
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
