// Fetches the latest YouTube videos and Shorts (and optionally Instagram posts)
// and writes them to data/feed.js. Runs in GitHub Actions; needs Node 20+, no dependencies.
//
// YouTube: uses the public RSS feeds of the channel's automatic playlists (no API key needed):
//   UULF… = long videos, UUSH… = Shorts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const window = {};
new Function('window', fs.readFileSync(path.join(root, 'config.js'), 'utf8'))(window);
const C = window.CODESEED || {};
const MAX = 12;

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

async function playlistFeed(prefix, channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${prefix}${channelId.slice(2)}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (CodeSeed feed bot)' } });
    if (!r.ok) { console.log(`  ${prefix}: HTTP ${r.status} (no items yet?)`); return []; }
    return parseAtom(await r.text());
  } catch (e) { console.log(`  ${prefix}: ${e.message}`); return []; }
}

async function instagram(url) {
  if (!url) return [];
  try {
    const r = await fetch(url); if (!r.ok) return [];
    const j = await r.json();
    const posts = Array.isArray(j) ? j : (j.posts || []);
    return posts.slice(0, 9).map(p => ({
      id: p.id, url: p.permalink,
      img: p.sizes?.medium?.mediaUrl || p.sizes?.small?.mediaUrl || p.thumbnailUrl || p.mediaUrl,
      caption: (p.prunedCaption || p.caption || '').slice(0, 140),
    })).filter(p => p.img && p.url);
  } catch (e) { console.log('  instagram:', e.message); return []; }
}

async function main() {
  const id = C.channelId || '';
  const data = { updated: new Date().toISOString(), videos: [], shorts: [], instagram: [] };
  if (/^UC[\w-]{22}$/.test(id)) {
    console.log('YouTube channel', id);
    [data.videos, data.shorts] = await Promise.all(['UULF', 'UUSH'].map(p => playlistFeed(p, id)));
  } else {
    console.log('channelId in config.js is not set yet; skipping YouTube.');
  }
  data.instagram = await instagram(C.beholdFeedUrl);
  console.log(`videos ${data.videos.length}, shorts ${data.shorts.length}, instagram ${data.instagram.length}`);
  // keep the file unchanged (no commit) when nothing but the timestamp changed
  const file = path.join(root, 'data', 'feed.js');
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const strip = s => s.replace(/"updated": "[^"]*",?/, '');
  const next = `/* Filled automatically by .github/workflows/update-feed.yml. Do not edit by hand. */\nwindow.CODESEED_FEED = ${JSON.stringify(data, null, 1)};\n`;
  if (strip(prev) !== strip(next)) { fs.writeFileSync(file, next); console.log('data/feed.js updated'); }
  else console.log('no changes');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
