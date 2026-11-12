import { makeCookie, clearCookie, safeEqual, json } from '../../server/session.js';

export async function onRequestPost({ request, env }) {
  const { password = '' } = await request.json().catch(() => ({}));
  if (!(await safeEqual(String(password), env.ADMIN_PASSWORD))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return json({ error: 'Wrong password.' }, 401);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': await makeCookie(env) });
}

export const onRequestDelete = () => json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
