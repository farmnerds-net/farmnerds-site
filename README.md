# farmnerds.net

The FarmNerds website: tech, homelab and homestead articles and reviews.

Built with [Astro](https://astro.build). Posts are plain text files in this repo, and the site rebuilds every time one changes.

## Writing and publishing

Open **farmnerds.net/admin/** and sign in with the editor password. From there you can:

- write an **Article** or a **Review** in a normal editor with a toolbar
- add photos (they are shrunk automatically before upload)
- press **Publish**, and the live site updates a minute or two later
- **Save as draft** to keep a post off the site while you work on it

### Reviews and "Our score"

In a review you score each part out of 10 under **Scoring** (Performance, Value, whatever fits). **Our score** is the average of those parts and is worked out for you. Give a part a weight of 2 to make it count double.

In the write-up, every *Heading 2* starts a new page of the review. If a scored part has the same name as one of those pages, its score shows on that page. Specs, Benchmarks and Verdict pages are added automatically from the boxes you fill in.

### Before launch

The posts whose web addresses start with `sample-` are placeholders with made-up content. Delete them in the editor once real posts exist. The numbers in the FarmLab box on the homepage are also placeholders. Change or hide them under **FarmLab box**.

### Downloads

The **Downloads** page lists the newest GPU drivers, homelab software and bench tools, with a link on the maker's own servers (we never host files). Where the checker can find the file itself and confirm the link works, the button says **Direct →** and starts the download. Otherwise it says **Get →** and opens the maker's download page. A free GitHub job checks every maker about every 15 minutes and saves any new version, and the site rebuilds by itself. You can watch it, or run it right away, under the repo's **Actions** tab, "Check downloads".

In the editor, **Downloads** lets you pick what shows in the homepage sidebar box and in what order. If a version is ever stuck or wrong (AMD's site sometimes blocks the checker), use **Fix version** there. To track something new, add an entry to `scripts/downloads/sources.mjs`.

GitHub pauses scheduled jobs in a repo that has had no activity for 60 days. The checker's own saves count as activity, but if it ever stops, open the Actions tab and turn it back on.

## Where things live

| What | Where |
| --- | --- |
| Articles | `src/content/articles/` |
| Reviews | `src/content/reviews/` |
| Uploaded photos | `public/uploads/` |
| FarmLab stats box | `src/data/farmlab.json` |
| Downloads list (updated automatically) | `src/data/downloads.json` |
| Downloads sidebar box picks | `src/data/downloads-box.json` |
| What the Downloads page tracks, and how each is checked | `scripts/downloads/sources.mjs` |
| Pages (home) | `src/pages/` |
| About and Support wording (edit in the editor under **Pages**) | `src/content/pages/` |
| Look and feel | `src/styles/global.css` |
| Editor screens | `public/admin/` |
| Editor server code (login, saving, uploads) | `functions/api/` and `server/` |

## Running it on your own computer

```bash
npm install
npm run dev      # preview at http://localhost:4321
npm run build    # production build into dist/
```

## Hosting on Cloudflare Pages

The site runs as a Cloudflare Pages project connected to this repo. Build command: `npm run build`. Output folder: `dist`.

### Editor setup (one time)

The editor needs two secrets. In the Cloudflare dashboard open the Pages project, go to **Settings**, then **Variables and Secrets**, and add both as type **Secret** for Production:

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | The password you want to sign in to the editor with. Make it long. |
| `GITHUB_TOKEN` | A GitHub fine-grained token for this repo only, with **Contents: Read and write**. |

Then redeploy (Deployments, latest, Retry deployment) so they take effect.

Saving a post makes a commit in this repo, and Cloudflare rebuilds the site from it. Photo uploads are committed without a rebuild and go live with the next post you save.
