# Tathvi website

A fast, multi-page static site that **updates itself**.

**Pages:** Home · Videos (long videos + Shorts) · Corrections · About · Sujal, all linked from the navbar.
- Your latest YouTube videos, Shorts and Instagram posts appear automatically.
- Sections stay hidden or show a friendly message until they have content, so a new channel never looks empty.

To preview the layout with sample content, open `index.html` and add `#demo` to the address.

---

## Everyday use

| You want to… | Edit |
|---|---|
| Nothing. New videos and Shorts appear on their own every 3 hours | (no edits needed) |
| Fix a fact from a video (with timestamp) | `corrections.js` |
| Change handle / Instagram / Facebook / channel | `config.js` |

### Adding a correction
1. Open `corrections.js` and copy the example block.
2. Fill in:
   - **videoId**: the 11 characters after `watch?v=`
   - **title**
   - **date**
   - one line per mistake, with the **time** (e.g. `04:32`), what the video **said**, the **correct** fact and a **source** link
3. Save and upload. The Corrections page lists it, and that video's card shows a "Correction" link.
   - Each timestamp opens the video at that exact moment.

## Hosting on GitHub Pages (free)
1. **Settings → Actions → General → Workflow permissions** → **Read and write permissions** → Save.
2. **Settings → Pages** → Source: **Deploy from a branch** → **main** / **(root)** → Save.
3. **Actions** tab → **Update YouTube & Instagram feed** → **Run workflow** (once). After that it runs every 3 hours, and right after you edit `config.js`.

## Optional extras
- **Instagram posts:** create a free JSON feed at **behold.so** and paste its URL into `beholdFeedUrl` in `config.js`.
- **Custom domain:** Settings → Pages → Custom domain.
- **Other hosts (Netlify, Vercel…):** put a YouTube Data API key (restricted to your domain) in `youtubeApiKey`.

## Good to know
- GitHub pauses scheduled jobs in repositories with no activity for 60 days, and emails you first. Click **Enable workflow** in the Actions tab to resume.
- Only **public** videos appear. Unlisted or private videos never show on the site.
- Videos open in a player on the page. Ctrl/⌘-click opens them on YouTube instead.

## Files
| File | What it is |
|---|---|
| `index.html`, `videos.html`, `corrections.html`, `about.html`, `sujal.html` | the pages |
| `styles.css`, `app.js` | design and behaviour shared by all pages |
| `config.js` | **your settings** |
| `corrections.js` | **your fact corrections** |
| `data/feed.js` | filled automatically with your latest content (don't edit) |
| `data/demo.js` | sample content for `#demo` previews |
| `scripts/update-feed.mjs`, `.github/workflows/update-feed.yml` | the auto-updater (runs on GitHub) |
| `assets/` | logo, icons, share image and your photo |

## If new videos stop showing up

YouTube sometimes refuses requests from GitHub's servers. The updater retries, tries a second YouTube feed,
and never wipes the list when YouTube does not answer. For a 100% reliable feed, add a free YouTube API key:

1. console.cloud.google.com → new project → enable "YouTube Data API v3" → Credentials → Create API key.
2. GitHub repo → Settings → Secrets and variables → Actions → New repository secret.
   Name: `YT_API_KEY`, value: the key.
3. Actions tab → "Update YouTube & Instagram feed" → Run workflow.
