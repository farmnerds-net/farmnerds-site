import { isSignedIn, json } from '../../server/session.js';
export const onRequestGet = async ({ request, env }) => json({ signedIn: await isSignedIn(request, env) });
