import { readFile, writeFile } from '../../server/github.js';
import { json } from '../../server/session.js';
import { PATH, cleanBoxes } from '../../server/boxes.js';

// The boxes in the right column of the homepage: which ones, in what order, and what each shows.
export async function onRequestGet({ env }) {
  const file = await readFile(env, PATH);
  return json({ data: file ? JSON.parse(file.text) : { boxes: [] }, sha: file?.sha });
}

export async function onRequestPut({ request, env }) {
  const { data, sha } = await request.json();
  const clean = cleanBoxes(data?.boxes);
  const saved = await writeFile(env, PATH, { text: JSON.stringify(clean, null, 2) + '\n', sha, message: 'Update sidebar boxes' });
  return json({ ok: true, sha: saved.sha, data: clean });
}
