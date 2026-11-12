import rss from '@astrojs/rss';
import { allPosts } from '../lib/posts';

export async function GET(context) {
  const posts = await allPosts();
  return rss({
    title: 'FarmNerds',
    description: 'Tech, homelab and homestead reviews and build notes.',
    site: context.site,
    items: posts.map((p) => ({ title: p.data.title, description: p.data.description, pubDate: p.data.date, link: p.url })),
  });
}
