export const FOLDERS = { article: 'src/content/articles', review: 'src/content/reviews' };
export const validSlug = (s) => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,80}$/.test(s);
export const postPath = (type, slug) => (FOLDERS[type] && validSlug(slug) ? `${FOLDERS[type]}/${slug}.md` : null);
// Standing pages the editor may change. Only these two; nothing else under src/content/pages is reachable.
export const PAGES = { about: 'About', support: 'Support' };
export const pagePath = (id) => (Object.hasOwn(PAGES, id) ? `src/content/pages/${id}.md` : null);
// Trust stamps JD can put on a download (shapes live in src/lib/stamps.ts and public/admin/admin.js).
export const STAMP_IDS = ['approved', 'tested', 'pick', 'caution'];
