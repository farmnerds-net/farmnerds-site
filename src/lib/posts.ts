import { getCollection } from 'astro:content';

export const CATS = {
  tech: { label: 'Tech', cls: 'c-tech' },
  homelab: { label: 'Homelab', cls: 'c-lab' },
  homestead: { label: 'Homestead', cls: 'c-stead' },
  farmlabs: { label: 'FarmLabs', cls: 'c-fl' },
} as const;
export type Cat = keyof typeof CATS;

const TZ = 'America/Chicago';
export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' });
export const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' });
export const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
export const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

export function seed(id: string) {
  let h = 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 99991;
  return h + 1;
}
export function readTime(body = '') {
  return Math.max(1, Math.round(body.split(/\s+/).length / 220));
}

export async function allPosts() {
  const keep = (e: any) => import.meta.env.DEV || !e.data.draft;
  const articles = (await getCollection('articles', keep)).map((e) => ({ ...e, type: 'article' as const, url: `/articles/${e.id}/` }));
  const reviews = (await getCollection('reviews', keep)).map((e) => ({ ...e, type: 'review' as const, url: `/reviews/${e.id}/` }));
  return [...articles, ...reviews].sort((a, b) => +b.data.date - +a.data.date);
}
export type Post = Awaited<ReturnType<typeof allPosts>>[number];
