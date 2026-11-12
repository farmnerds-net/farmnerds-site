import { readFolders } from '../../server/github.js';
import { parsePost } from '../../server/frontmatter.js';
import { FOLDERS } from '../../server/paths.js';
import { json } from '../../server/session.js';
import { ourScore } from "../../src/lib/score.js";

// The list of all articles and reviews, newest first.
export async function onRequestGet({ env }) {
  const types = Object.keys(FOLDERS);
  const folders = await readFolders(env, types.map((t) => FOLDERS[t]));
  const posts = [];
  folders.forEach((files, i) => {
    for (const f of files) {
      if (!f.name.endsWith('.md')) continue;
      const { data } = parsePost(f.text);
      posts.push({ type: types[i], slug: f.name.slice(0, -3), title: data.title || f.name, date: data.date || '', category: data.category || 'tech', draft: !!data.draft, featured: !!data.featured, sample: !!data.sample, score: ourScore(data) });
    }
  });
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return json({ posts });
}
