export const FOLDERS = { article: 'src/content/articles', review: 'src/content/reviews' };
export const validSlug = (s) => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,80}$/.test(s);
export const postPath = (type, slug) => (FOLDERS[type] && validSlug(slug) ? `${FOLDERS[type]}/${slug}.md` : null);
