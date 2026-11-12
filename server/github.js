// Talks to GitHub, where the site's files live. Saving a post is a commit; Cloudflare then rebuilds the site.
const cfg = (env) => ({
  api: env.GITHUB_API || 'https://api.github.com',
  repo: env.GITHUB_REPO || 'farmnerds-net/farmnerds-site',
  branch: env.GITHUB_BRANCH || 'main',
});

async function gh(env, path, init = {}) {
  const { api } = cfg(env);
  const res = await fetch(api + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'farmnerds-editor',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  return res;
}

export class GitHubError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
async function fail(res, what) {
  let detail = '';
  try { detail = (await res.json()).message || ''; } catch {}
  const hint = res.status === 401 || res.status === 403 ? ' The GitHub token may be missing, expired, or not allowed to write to the repo.' : '';
  throw new GitHubError(res.status, `${what} failed (GitHub said ${res.status}${detail ? `: ${detail}` : ''}).${hint}`);
}

const toB64 = (text) => { const b = new TextEncoder().encode(text); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');

/** Every file in the given folders with its text, in one request. */
export async function readFolders(env, folders) {
  const { repo, branch } = cfg(env);
  const [owner, name] = repo.split('/');
  const parts = folders.map((f, i) => `f${i}: object(expression: ${JSON.stringify(`${branch}:${f}`)}) { ... on Tree { entries { name type object { ... on Blob { text } } } } }`);
  const res = await gh(env, '/graphql', { method: 'POST', body: JSON.stringify({ query: `query { repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${parts.join(' ')} } }` }) });
  if (!res.ok) await fail(res, 'Loading posts');
  const out = await res.json();
  if (out.errors?.length) throw new GitHubError(502, `Loading posts failed: ${out.errors[0].message}`);
  return folders.map((_, i) => (out.data.repository[`f${i}`]?.entries || []).filter((e) => e.type === 'blob').map((e) => ({ name: e.name, text: e.object?.text ?? '' })));
}

export async function readFile(env, path) {
  const { repo, branch } = cfg(env);
  const res = await gh(env, `/repos/${repo}/contents/${encPath(path)}?ref=${encodeURIComponent(branch)}`);
  if (res.status === 404) return null;
  if (!res.ok) await fail(res, 'Opening the file');
  const j = await res.json();
  return { text: fromB64(j.content), sha: j.sha };
}

/** Raw bytes of a file, for showing a just-uploaded photo before the site rebuilds. */
export async function readRaw(env, path) {
  const { repo, branch } = cfg(env);
  return gh(env, `/repos/${repo}/contents/${encPath(path)}?ref=${encodeURIComponent(branch)}`, { headers: { Accept: 'application/vnd.github.raw+json' } });
}

export async function writeFile(env, path, { text, base64, sha, message }) {
  const { repo, branch } = cfg(env);
  const res = await gh(env, `/repos/${repo}/contents/${encPath(path)}`, {
    method: 'PUT',
    body: JSON.stringify({ message, branch, content: base64 ?? toB64(text), ...(sha ? { sha } : {}) }),
  });
  if (res.status === 409 || res.status === 422) throw new GitHubError(409, 'This was changed somewhere else since you opened it. Reload the page and try again.');
  if (!res.ok) await fail(res, 'Saving');
  return { sha: (await res.json()).content.sha };
}

export async function deleteFile(env, path, { sha, message }) {
  const { repo, branch } = cfg(env);
  const res = await gh(env, `/repos/${repo}/contents/${encPath(path)}`, { method: 'DELETE', body: JSON.stringify({ message, branch, sha }) });
  if (!res.ok) await fail(res, 'Deleting');
}
