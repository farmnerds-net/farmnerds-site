import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const base = {
  title: z.string(),
  description: z.string().default(''),
  date: z.coerce.date(),
  category: z.enum(['tech', 'homelab', 'homestead', 'farmlabs']).default('tech'),
  author: z.string().default('JD'),
  image: z.string().nullish(),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  sample: z.boolean().default(false),
};
const pair = z.object({ label: z.string(), value: z.coerce.string() });

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object(base),
});

const reviews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reviews' }),
  schema: z.object({
    ...base,
    kind: z.string().default('Equipment'),
    score: z.coerce.number().min(0).max(10).nullish(),
    approved: z.boolean().default(false),
    verdict: z.string().default(''),
    tested: z.string().nullish(),
    disclosure: z.string().nullish(),
    facts: z.array(pair).nullish(),
    specs: z.array(pair).nullish(),
    pros: z.array(z.string()).nullish(),
    cons: z.array(z.string()).nullish(),
    breakdown: z.array(z.object({ label: z.string(), score: z.coerce.number().min(0).max(10), weight: z.coerce.number().nullish() /* 0 or less counts as 1, see src/lib/score.js */ })).nullish(),
    charts: z.array(z.object({
      title: z.string(),
      note: z.string().nullish(),
      rows: z.array(z.object({ label: z.string(), value: z.coerce.number(), highlight: z.boolean().nullish() })),
    })).nullish(),
  }),
});

// Standing pages (About, Support). Edited from /admin under Pages.
const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    label: z.string().default(''),
    title: z.string(),
    description: z.string().default(''),
    buttons: z.array(z.object({ label: z.string(), url: z.string().url() })).nullish(),
  }),
});

export const collections = { articles, reviews, pages };
