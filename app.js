/* Code Seed website: renders the auto-updating YouTube + Instagram sections. */
(function () {
  'use strict';
  const C = window.CODESEED || {};
  const demo = C.demo === true || location.hash === '#demo';
  const YT = `https://www.youtube.com/@${C.handle || ''}`;
  const SUB = `${YT}?sub_confirmation=1`;
  const IG = `https://www.instagram.com/${C.instagram || ''}`;
  const $ = s => document.querySelector(s);
  const PLAY = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';

  // ---------- helpers
  function el(tag, attrs = {}, kids = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v);
    }
    (Array.isArray(kids) ? kids : [kids]).forEach(c => c && e.append(c));
    return e;
  }
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  function ago(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!isFinite(s)) return '';
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [u, n] of units) if (Math.abs(s) >= n) return rtf.format(-Math.round(s / n), u);
    return 'just now';
  }
  const nf = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
  const views = n => (n ? `${nf.format(n)} view${n === 1 ? '' : 's'}` : '');
  const meta = v => [views(v.views), v.status === 'live' ? 'Streaming now' : v.status === 'upcoming' ? 'Upcoming' : ago(v.published)].filter(Boolean).join(' · ');
  const watchUrl = (v, short) => demo ? YT : short ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;

  function thumbImg(v, kind) {
    // best available YouTube thumbnail, with graceful fallbacks
    const id = v.id, local = !/^https?:/.test(v.thumb || '');
    const tries = local ? [v.thumb] : kind === 'short'
      ? [`https://i.ytimg.com/vi/${id}/oardefault.jpg`, `https://i.ytimg.com/vi/${id}/hq720.jpg`, v.thumb]
      : [`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${id}/hq720.jpg`, v.thumb];
    const img = el('img', { src: tries[0], alt: '', loading: 'lazy', decoding: 'async' });
    let i = 0;
    img.addEventListener('error', () => { if (++i < tries.length) img.src = tries[i]; });
    // YouTube serves a 120×90 grey placeholder instead of a 404 for missing maxres images
    img.addEventListener('load', () => { if (img.naturalWidth === 120 && ++i < tries.length) img.src = tries[i]; });
    return img;
  }
  function thumb(v, kind, href) {
    const t = el('a', { class: 'thumb', href, 'data-id': v.id, 'data-kind': kind, 'aria-label': `Play: ${v.title}` }, [thumbImg(v, kind)]);
    if (v.status === 'live') t.append(el('span', { class: 'badge live', text: 'Live' }));
    else if (v.status === 'upcoming') t.append(el('span', { class: 'badge up', text: 'Upcoming' }));
    else if (kind === 'short') t.append(el('span', { class: 'badge', text: 'Short' }));
    t.append(el('span', { class: 'play', html: PLAY }));
    return t;
  }
  function vcard(v, kind = 'video') {
    const href = watchUrl(v, kind === 'short');
    const c = el('div', { class: kind === 'short' ? 'scard' : 'vcard' }, [
      thumb(v, kind, href),
      el('div', {}, [el('h3', {}, [el('a', { href, 'data-id': v.id, 'data-kind': kind, text: v.title })]), el('div', { class: 'meta', text: meta(v) })]),
    ]);
    return c;
  }
  function empty(icon, title, text) {
    return el('div', { class: 'empty' }, [
      el('div', { class: 'ico', html: icon }),
      el('div', {}, [el('h3', { text: title }), el('p', { text })]),
      el('a', { class: 'btn btn-ink', href: SUB, html: '<svg class="yt-ico" width="18" height="18" viewBox="0 0 24 24"><rect x="1.5" y="4.5" width="21" height="15" rx="4.5"/><path d="M10 8.8v6.4l5.6-3.2z"/></svg>Subscribe' }),
    ]);
  }
  const ICON_VIDEO = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/></svg>';

  // ---------- data sources
  async function fromApi() {
    const key = C.youtubeApiKey, base = (C.channelId || '').slice(2);
    if (!key || !base) return null;
    const api = (p, q) => fetch(`https://www.googleapis.com/youtube/v3/${p}?${q}&key=${key}`).then(r => r.ok ? r.json() : { items: [] });
    const lists = await Promise.all(['UULF', 'UUSH'].map(pre => api('playlistItems', `part=contentDetails&maxResults=12&playlistId=${pre}${base}`)));
    const ids = [...new Set(lists.flatMap(l => (l.items || []).map(i => i.contentDetails.videoId)))];
    if (!ids.length) return { videos: [], shorts: [] };
    const det = {};
    for (let i = 0; i < ids.length; i += 50) {
      (await api('videos', `part=snippet,statistics,liveStreamingDetails&id=${ids.slice(i, i + 50).join(',')}`)).items.forEach(v => det[v.id] = v);
    }
    const map = l => (l.items || []).map(i => det[i.contentDetails.videoId]).filter(Boolean).map(v => {
      const d = v.liveStreamingDetails || {};
      return { id: v.id, title: v.snippet.title, published: d.actualStartTime || v.snippet.publishedAt, views: +(v.statistics || {}).viewCount || 0,
        thumb: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
        status: v.snippet.liveBroadcastContent === 'live' ? 'live' : v.snippet.liveBroadcastContent === 'upcoming' ? 'upcoming' : '' };
    });
    const [videos, shorts] = lists.map(map);
    return { videos, shorts };
  }
  async function instagramClient() {
    if (!C.beholdFeedUrl) return [];
    try {
      const j = await (await fetch(C.beholdFeedUrl)).json();
      return (Array.isArray(j) ? j : j.posts || []).slice(0, 9).map(p => ({ id: p.id, url: p.permalink,
        img: (p.sizes && p.sizes.medium && p.sizes.medium.mediaUrl) || p.thumbnailUrl || p.mediaUrl, caption: p.prunedCaption || p.caption || '' }));
    } catch (e) { return []; }
  }

  // ---------- renderers (each one only runs if its container is on the current page)
  function feature(v, label) {
    const href = watchUrl(v);
    return el('div', { class: 'feature' }, [
      thumb(v, 'video', href),
      el('div', {}, [
        el('div', { class: 'eyebrow', text: label }),
        el('h3', { style: 'margin-top:14px', text: v.title }),
        el('div', { class: 'meta', text: meta(v) }),
        el('div', { class: 'acts' }, [
          el('a', { class: 'btn btn-ink', href, 'data-id': v.id, 'data-kind': 'video', html: PLAY + (v.status === 'live' ? 'Watch live' : 'Watch now') }),
          el('a', { class: 'btn btn-line', href: YT, text: 'Open YouTube' }),
        ]),
      ]),
    ]);
  }
  function renderVideos(F) {
    const box = $('#videos-body'); if (!box) return;
    const v = F.videos || [], limit = +box.dataset.limit || 24;
    if (!v.length) { box.append(empty(ICON_VIDEO, 'The first video is on its way.', 'Subscribe and you’ll be the first to watch it.')); return; }
    const [first, ...rest] = v;
    box.append(feature(first, 'Latest video'));
    if (rest.length) box.append(el('div', { class: 'vgrid' }, rest.slice(0, limit - 1).map(x => vcard(x))));
    const cta = $('#hero-latest');
    if (cta) { cta.href = watchUrl(first); cta.dataset.id = first.id; cta.dataset.kind = 'video'; cta.lastChild.textContent = 'Watch the latest video'; }
  }
  function renderShorts(F) {
    const box = $('#shorts-body'); if (!box) return;
    const s = F.shorts || [], limit = +box.dataset.limit || 30, sec = box.closest('section');
    if (!s.length) {
      if (sec.dataset.hideEmpty !== undefined) sec.classList.add('hidden');
      else box.append(empty(ICON_VIDEO, 'Shorts are coming soon.', 'One concept, under a minute. Subscribe to catch the first one.'));
      return;
    }
    sec.classList.remove('hidden');
    box.append(el('div', { class: box.dataset.layout === 'grid' ? 'sgrid' : 'srow' }, s.slice(0, limit).map(x => vcard(x, 'short'))));
  }
  function renderSeries() {
    const box = $('#series-body'); if (!box) return;
    const list = C.series || [];
    if (!list.length) { box.append(empty(ICON_VIDEO, 'The first series is on its way.', 'Subscribe to follow along from episode one.')); return; }
    box.append(el('div', { class: 'series' }, list.map(s => {
      const pl = s.playlistId ? `https://www.youtube.com/playlist?list=${s.playlistId}` : YT;
      return el('article', { class: 'scard2' }, [
        s.thumbnail ? el('img', { src: s.thumbnail, alt: '', loading: 'lazy', width: 1280, height: 720 }) : null,
        el('div', { class: 'b' }, [
          el('div', { class: 'eyebrow', text: `${(s.episodes || []).length} episodes` }),
          el('h3', { text: s.title }), el('div', { class: 'tg', text: s.tagline || '' }),
          (s.episodes || []).length ? el('ol', { class: 'eps' }, s.episodes.map((e, i) => el('li', {}, [
            el('span', { class: 'n', text: String(i + 1).padStart(2, '0') }), el('span', { text: e.title }),
            e.slides ? el('a', { class: 's', href: e.slides, html: 'Slides <span aria-hidden="true">↓</span>' }) : null,
          ]))) : null,
          el('div', { class: 'acts' }, [el('a', { class: 'btn btn-ink btn-sm', href: pl, html: PLAY + 'Watch the series' })]),
        ]),
      ]);
    })));
  }
  function renderInstagram(F) {
    const box = $('#ig-body'); if (!box) return;
    const posts = F.instagram || [];
    if (posts.length) {
      box.append(el('div', { class: 'igrid' }, posts.slice(0, 6).map(p =>
        el('a', { href: demo ? IG : p.url, 'aria-label': p.caption ? `Instagram post: ${p.caption.slice(0, 80)}` : 'Instagram post' },
          [el('img', { src: p.img, alt: '', loading: 'lazy' })]))));
    }
    box.append(el('div', { class: 'ig-follow', style: posts.length ? 'margin-top:28px' : '' }, [
      el('div', { class: 'av', html: document.querySelector('.brand .mark').outerHTML.replace(/width="\d+"/, 'width="34"').replace(/height="\d+"/, 'height="34"') }),
      el('div', { style: 'flex:1;min-width:200px' }, [el('div', { class: 'h', text: '@' + (C.instagram || '') }),
        el('p', { text: 'Concept explainers, behind the scenes, and what’s coming next.' })]),
      el('a', { class: 'btn btn-white', href: IG, text: 'Follow on Instagram' }),
    ]));
  }

  // ---------- mobile menu
  (function menu() {
    const btn = $('#menu-btn'), nav = $('.nav');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });
  })();

  // ---------- player (opens videos on the page instead of leaving the site)
  const dlg = $('#player');
  function openPlayer(id, kind) {
    dlg.classList.toggle('short', kind === 'short');
    dlg.querySelector('.frame').replaceChildren(el('iframe', {
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      title: 'YouTube video player', allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share', allowfullscreen: '' }));
    dlg.showModal();
  }
  function closePlayer() { dlg.close(); }
  dlg.addEventListener('close', () => dlg.querySelector('.frame').replaceChildren());
  dlg.addEventListener('click', e => { if (e.target === dlg) closePlayer(); });
  dlg.querySelector('.x').addEventListener('click', closePlayer);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-id]');
    if (!a || demo || e.metaKey || e.ctrlKey || e.shiftKey || !dlg.showModal) return;
    e.preventDefault(); openPlayer(a.dataset.id, a.dataset.kind);
  });

  // ---------- static links
  document.querySelectorAll('[data-link="youtube"]').forEach(a => a.href = YT);
  document.querySelectorAll('[data-link="subscribe"]').forEach(a => a.href = SUB);
  document.querySelectorAll('[data-link="instagram"]').forEach(a => a.href = IG);
  document.querySelectorAll('[data-text="handle"]').forEach(n => n.textContent = '@' + (C.handle || ''));
  $('#year').textContent = new Date().getFullYear();

  // ---------- hero demo
  (function journey() {
    if (!$('#journey')) return;
    const root = $('#journey'), btn = $('#j-save'), packet = $('#j-packet'), status = $('#j-status');
    const items = [...root.querySelectorAll('.j-log li')];
    const pos = { b: '16.6%', s: '50%', d: '83.4%' };
    const steps = [['b', 's'], ['s', 's'], ['s', 'd'], ['d', 's'], ['s', 'b'], ['b', 'b']];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
    const hot = k => root.querySelectorAll('.j-node').forEach(n => n.classList.toggle('hot', n.dataset.node === k));
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Saving…'; status.textContent = 'Request in flight';
      root.classList.add('running'); items.forEach(i => i.classList.remove('on'));
      packet.style.transition = 'none'; packet.style.left = pos.b; packet.classList.remove('back'); void packet.offsetWidth;
      packet.style.transition = ''; packet.style.opacity = 1;
      for (let i = 0; i < steps.length; i++) {
        const [a, b] = steps[i]; items[i].classList.add('on'); hot(a);
        packet.classList.toggle('back', (a === 'd' && b === 's') || (a === 's' && b === 'b'));
        if (a !== b) { packet.style.left = pos[b]; await wait(650); hot(b); }
        await wait(380);
      }
      packet.style.opacity = 0; hot(null); root.classList.remove('running');
      btn.textContent = 'Saved ✓'; status.textContent = 'Round trip complete';
      await wait(1800); btn.textContent = 'Save again'; btn.disabled = false;
    });
  })();

  // ---------- go
  (async function init() {
    let F = demo ? window.CODESEED_DEMO : window.CODESEED_FEED;
    const hasYT = F && ((F.videos || []).length || (F.shorts || []).length);
    if (!demo && !hasYT && C.youtubeApiKey) {
      try { F = Object.assign({}, F || {}, await fromApi()); } catch (e) { /* stay with what we have */ }
    }
    F = F || {};
    if (!demo && !(F.instagram || []).length) F.instagram = await instagramClient();
    renderVideos(F); renderShorts(F); renderSeries(); renderInstagram(F);
    if (F.updated && !demo && $('#updated')) $('#updated').textContent = `Videos updated ${ago(F.updated)}`;
  })();
})();
