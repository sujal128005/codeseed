# Code Seed website

A fast, multi-page static site that **updates itself**.
Pages: **Home · Videos · Shorts · Series · About · Sujal**, all linked from the navbar. Your latest YouTube videos, Shorts and Instagram posts appear automatically.
Sections stay hidden until they have content, so a brand-new channel never looks empty.

Preview the layout with sample content: open `index.html` and add `#demo` to the address
(or set `demo: true` in `config.js` to preview every page).

---

## 1 · Add your channel ID (2 minutes)
1. YouTube Studio → **Customization → Basic info** → copy the **Channel URL**.
   The ID is the part starting with **UC** (24 characters).
2. Open `config.js` and paste it into `channelId`.
3. Your handle and Instagram username are already set to `codeseed_dev9`.

## 2 · Put it online with GitHub Pages (free, ~10 minutes)
1. Create a free account at github.com → **New repository** → name it e.g. `codeseed` → **Public** → Create.
2. **Add file → Upload files** → drag in everything from this folder → **Commit changes**.
   - The `.github` folder is hidden on some computers. If it didn't upload, use
     **Add file → Create new file**, type the name `.github/workflows/update-feed.yml`,
     paste the contents of that file from this folder, and commit.
3. **Settings → Actions → General → Workflow permissions** → choose **Read and write permissions** → Save.
4. **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main** / **(root)** → Save.
   After a minute your site is live at `https://YOUR-USERNAME.github.io/codeseed/`.
5. **Actions** tab → enable workflows if asked → **Update YouTube & Instagram feed** → **Run workflow**.

From then on, the site checks your channel **every 3 hours** (and right after you edit `config.js`).

## 3 · Optional extras
**Instagram posts:** create a free feed at **behold.so** → connect your Instagram → choose
**JSON feed** → copy the feed URL into `beholdFeedUrl` in `config.js`.

**Series:** edit the `series` list in `config.js`. Add the playlist ID (starts with `PL`) once it exists.

**Custom domain:** Settings → Pages → Custom domain, then add the DNS record your domain provider asks for.

## Hosting somewhere else (Netlify, Vercel…)
The auto-update job is a GitHub feature. On other hosts, put a YouTube Data API key in
`youtubeApiKey` in `config.js` (restrict it to your domain in Google Cloud), and the browser loads
videos directly.

## Good to know
- GitHub pauses scheduled jobs in repositories with no activity for 60 days and emails you first.
  Click **Enable workflow** in the Actions tab to resume.
- Videos open in a player on the page. Ctrl/⌘-click opens them on YouTube instead.
- YouTube Community posts have no public feed, so the "posts" section uses Instagram.

## Files
| File | What it is |
|---|---|
| `index.html` | Home: hero, latest videos, Shorts, About teaser, Instagram |
| `videos.html`, `shorts.html` | full lists, filled automatically |
| `series.html` | your series from `config.js` |
| `about.html` | about Code Seed: the method and what you’ll find |
| `sujal.html` | about you: photo, intro and links |
| `styles.css`, `app.js` | design and behaviour shared by all pages |
| `config.js` | **your settings**, the only file to edit |
| `data/feed.js` | filled automatically with your latest content |
| `data/demo.js` | sample content for `#demo` previews |
| `scripts/update-feed.mjs` | the updater (runs on GitHub) |
| `.github/workflows/update-feed.yml` | schedules the updater every 3 hours |
| `assets/`, `slides/` | images (including your photo) and lecture slides |
