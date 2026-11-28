// Fetches the latest YouTube videos and Shorts (and optionally Instagram posts)
// and writes them to data/feed.js. Runs in GitHub Actions; needs Node 20+, no dependencies.
//
// YouTube sometimes blocks or errors on requests from GitHub's servers, so this script:
//   1. retries each request a few times,
//   2. falls back from the playlist feeds (UULF = long videos, UUSH = Shorts) to the channel feed,
//   3. NEVER replaces a list that loaded before with an empty one when YouTube did not answer.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const window = {};
new Function('window', fs.readFileSync(path.join(root, 'config.js'), 'utf8'))(window);
const C = window.TATHVI || {};
const MAX = 12;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1].trim()) : ''; };
const attr = (xml, t, a) => { const m = xml.match(new RegExp(`<${t}[^>]*\\s${a}="([^"]*)"`)); return m ? decode(m[1]) : ''; };

export function parseAtom(xml) {
  return xml.split('<entry>').slice(1).map(e => {
    const id = tag(e, 'yt:videoId');
    return {
      id,
      title: tag(e, 'title'),
      published: tag(e, 'published'),
      views: Number(attr(e, 'media:statistics', 'views')) || 0,
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }).filter(v => v.id).slice(0, MAX);
}

// Returns { status, text } after up to 4 tries; status 0 = network error.
async function get(url, tries = 4) {
  let last = { status: 0, text: '' };
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'manual' });
      last = { status: r.status, text: r.status === 200 ? await r.text() : '' };
      if (r.status === 200 || (r.status >= 300 && r.status < 400)) return last;
    } catch (e) { last = { status: 0, text: '', err: e.message }; }
    await sleep(1500 * (i + 1));
  }
  return last;
}

// A playlist feed: list on success, [] when YouTube says the playlist does not exist, null when unsure.
async function playlistFeed(prefix, id) {
  const r = await get(`https://www.youtube.com/feeds/videos.xml?playlist_id=${prefix}${id.slice(2)}`);
  console.log(`  ${prefix} feed: HTTP ${r.status}`);
  if (r.status === 200 && r.text.includes('<feed')) return parseAtom(r.text);
  return null;
}

// Channel feed (long videos and Shorts mixed), split by asking youtube.com/shorts/ID (200 = Short).
async function channelFeed(id) {
  const r = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
  console.log(`  channel feed: HTTP ${r.status}`);
  if (r.status !== 200 || !r.text.includes('<feed')) return null;
  const all = parseAtom(r.text), videos = [], shorts = [];
  for (const v of all) {
    const s = await get(`https://www.youtube.com/shorts/${v.id}`, 2);
    (s.status === 200 ? shorts : videos).push(v);
  }
  return { videos, shorts };
}

// Most reliable source: the YouTube Data API (repo secret YT_API_KEY). Never blocked for GitHub.
async function apiPlaylist(prefix, id, key) {
  try {
    const u = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${MAX}&playlistId=${prefix}${id.slice(2)}&key=${key}`;
    const r = await fetch(u);
    console.log(`  ${prefix} API: HTTP ${r.status}`);
    if (r.status === 404) return [];            // playlist not created yet (e.g. no Shorts)
    if (!r.ok) return null;
    const j = await r.json();
    return (j.items || []).map(it => {
      const s = it.snippet, vid = s.resourceId?.videoId;
      return { id: vid, title: s.title, published: s.publishedAt, views: 0, thumb: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` };
    }).filter(v => v.id && v.title !== 'Private video' && v.title !== 'Deleted video');
  } catch (e) { console.log(`  ${prefix} API: ${e.message}`); return null; }
}

async function instagram(url) {
  if (!url) return [];
  try {
    const r = await fetch(url); if (!r.ok) return null;
    const j = await r.json();
    const posts = Array.isArray(j) ? j : (j.posts || []);
    return posts.slice(0, 9).map(p => ({
      id: p.id, url: p.permalink,
      img: p.sizes?.medium?.mediaUrl || p.sizes?.small?.mediaUrl || p.thumbnailUrl || p.mediaUrl,
      caption: (p.prunedCaption || p.caption || '').slice(0, 140),
    })).filter(p => p.img && p.url);
  } catch (e) { console.log('  instagram:', e.message); return null; }
}

function readPrev(file) {
  try { const w = {}; new Function('window', fs.readFileSync(file, 'utf8'))(w); return w.TATHVI_FEED || {}; }
  catch { return {}; }
}

async function main() {
  const id = C.channelId || '';
  const file = path.join(root, 'data', 'feed.js');
  const prev = readPrev(file);
  let videos = null, shorts = null;
  if (/^UC[\w-]{22}$/.test(id)) {
    console.log('YouTube channel', id);
    const key = process.env.YT_API_KEY;
    if (key) { videos = await apiPlaylist('UULF', id, key); shorts = await apiPlaylist('UUSH', id, key); }
    if (videos === null) videos = await playlistFeed('UULF', id);
    if (shorts === null) shorts = await playlistFeed('UUSH', id);
    if (videos === null || shorts === null) {
      const ch = await channelFeed(id);
      if (ch) {
        if (videos === null) videos = ch.videos;
        // UUSH answers 404 when a channel has no Shorts yet, so the channel feed decides.
        if (shorts === null) shorts = ch.shorts;
      }
    }
  } else {
    console.log('channelId in config.js is not set yet; skipping YouTube.');
    videos = []; shorts = [];
  }
  const ig = await instagram(C.beholdFeedUrl);
  const keep = (name, now) => {
    if (now !== null) return now;
    console.log(`  ${name}: YouTube did not answer, keeping the previous list`);
    return prev[name] || [];
  };
  const data = { updated: new Date().toISOString(), videos: keep('videos', videos), shorts: keep('shorts', shorts), instagram: keep('instagram', ig) };
  console.log(`videos ${data.videos.length}, shorts ${data.shorts.length}, instagram ${data.instagram.length}`);
  // leave the file unchanged (no commit) when nothing but the timestamp changed
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const strip = s => s.replace(/"updated": "[^"]*",?/, '');
  const next = `/* Filled automatically by .github/workflows/update-feed.yml. Do not edit by hand. */\nwindow.TATHVI_FEED = ${JSON.stringify(data, null, 1)};\n`;
  if (strip(before) !== strip(next)) { fs.writeFileSync(file, next); console.log('data/feed.js updated'); }
  else console.log('no changes');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
