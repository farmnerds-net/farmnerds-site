# farmnerds.net

The FarmNerds website: tech, homelab and homestead articles and reviews.

Built with [Astro](https://astro.build). Posts are plain text files in this repo, and the site rebuilds every time one changes.

## Writing and publishing

Open **farmnerds.net/admin/** and sign in with GitHub. From there you can:

- write an **Article** or a **Review** in a normal editor with a toolbar
- upload photos
- press **Publish**, and the live site updates a minute or two later

Reviews have extra boxes for the score, pros and cons, a specs table and benchmark charts. In the review write-up, every *Heading 2* starts a new page of the review. Specs, Benchmarks and Verdict pages are added automatically from the boxes.

Tick **Draft** to keep a post off the site while you work on it.

### Before launch

The posts whose file names start with `sample-` are placeholders with made-up content. Delete them in the editor once real posts exist. The numbers in the FarmLab box on the homepage are also placeholders. Change or hide them under **Site settings**.

## Where things live

| What | Where |
| --- | --- |
| Articles | `src/content/articles/` |
| Reviews | `src/content/reviews/` |
| Uploaded photos | `public/uploads/` |
| FarmLab stats box | `src/data/farmlab.json` |
| Pages (home, About, Support) | `src/pages/` |
| Look and feel | `src/styles/global.css` |
| Editor settings | `public/admin/config.yml` |

## Running it on your own computer

```bash
npm install
npm run dev      # preview at http://localhost:4321
npm run build    # production build into dist/
```

## Hosting on Cloudflare Pages

1. In the Cloudflare dashboard, create a Pages project connected to this repo.
2. Build command: `npm run build`. Output folder: `dist`.
3. Add `farmnerds.net` as a custom domain on the project.

The editor signs in through GitHub. Until a sign-in helper is set up, use "Sign in with token" on the editor's login screen with a GitHub personal access token that can write to this repo.
