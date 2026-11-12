import { readFile, writeFile } from '../../server/github.js';
import { json } from '../../server/session.js';

const PATH = 'src/data/farmlab.json';

// The FarmLab stats box on the homepage.
export async function onRequestGet({ env }) {
  const file = await readFile(env, PATH);
  return json({ data: file ? JSON.parse(file.text) : {}, sha: file?.sha });
}

export async function onRequestPut({ request, env }) {
  const { data, sha } = await request.json();
  const clean = {
    show: !!data.show,
    nodes: String(data.nodes ?? ''), guests: String(data.guests ?? ''), power: String(data.power ?? ''), uptime: String(data.uptime ?? ''),
    storageUsed: Number(data.storageUsed) || 0, storageTotal: Number(data.storageTotal) || 1,
  };
  const saved = await writeFile(env, PATH, { text: JSON.stringify(clean, null, 2) + '\n', sha, message: 'Update FarmLab stats' });
  return json({ ok: true, sha: saved.sha });
}
