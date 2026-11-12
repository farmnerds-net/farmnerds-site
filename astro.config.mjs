import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://farmnerds.net',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') })],
});
