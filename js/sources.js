// Ricerca online di dati e copertine.
//   AniList   -> anime e manga (copertine, generi, tag, studi, consigli della community)
//   VNDB      -> visual novel
//   Open Library + Wikipedia -> libri
//   iTunes + MusicBrainz     -> album
//   Wikipedia -> film, videogiochi (e riserva per tutto il resto)
// Ogni ricerca restituisce una lista di "candidati" con la stessa forma.
import { linkLabel } from './util.js';

const GENRE_IT = {
  Action: 'Azione', Adventure: 'Avventura', Comedy: 'Commedia', Drama: 'Drammatico', Ecchi: 'Ecchi', Fantasy: 'Fantasy',
  Horror: 'Horror', 'Mahou Shoujo': 'Mahou shōjo', Mecha: 'Mecha', Music: 'Musicale', Mystery: 'Mistero',
  Psychological: 'Psicologico', Romance: 'Romantico', 'Sci-Fi': 'Fantascienza', 'Slice of Life': 'Slice of life',
  Sports: 'Sportivo', Supernatural: 'Soprannaturale', Thriller: 'Thriller',
};
const TAG_IT = {
  'Male Protagonist': 'Protagonista maschile', 'Female Protagonist': 'Protagonista femminile', 'Coming of Age': 'Crescita',
  Tragedy: 'Tragedia', Historical: 'Storico', Philosophy: 'Filosofico', Travel: 'Viaggio', Survival: 'Sopravvivenza',
  'Time Manipulation': 'Viaggi nel tempo', 'Time Skip': 'Salto temporale', School: 'Scuola', Magic: 'Magia', Demons: 'Demoni',
  Gore: 'Splatter', Revenge: 'Vendetta', 'Found Family': 'Famiglia scelta', 'Anti-Hero': 'Antieroe', Military: 'Militare',
  Isekai: 'Isekai', Dystopian: 'Distopico', 'Post-Apocalyptic': 'Post-apocalittico', Cyberpunk: 'Cyberpunk', Detective: 'Investigativo',
  Witch: 'Streghe', Vampire: 'Vampiri', Werewolf: 'Lupi mannari', Mythology: 'Mitologia', Cats: 'Gatti', 'Anthropomorphism': 'Antropomorfi',
  Iyashikei: 'Iyashikei', 'Slow Life': 'Vita tranquilla', Seinen: 'Seinen', Shounen: 'Shōnen', Shoujo: 'Shōjo', Josei: 'Josei',
  'Psychological Horror': 'Horror psicologico', 'Body Horror': 'Body horror', Samurai: 'Samurai', 'Martial Arts': 'Arti marziali',
  Swordplay: 'Spade', Romance: 'Romantico', 'Boys\' Love': 'Boys\' love', 'Girls\' Love': 'Girls\' love', Yuri: 'Yuri', Music: 'Musica',
  Band: 'Band', Idol: 'Idol', Food: 'Cucina', Sports: 'Sport', Mystery: 'Mistero', 'Loop': 'Loop temporale', Rural: 'Campagna',
  'Urban Fantasy': 'Urban fantasy', Fairy: 'Fate', Ghost: 'Fantasmi', Animals: 'Animali', Primarily: '',
};
const tagIt = (t) => TAG_IT[t] ?? t;

const clean = (s) => String(s || '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/\[url=[^\]]*\]([^[]*)\[\/url\]/gi, '$1').replace(/\[\/?[a-z]+[^\]]*\]/gi, '')
  .replace(/\(Source:[^)]*\)/gi, '').replace(/\n{3,}/g, '\n\n').trim();
const firstSentences = (s, n = 3) => {
  const t = clean(s); if (!t) return '';
  const parts = t.split(/(?<=[.!?])\s+/).slice(0, n).join(' ');
  return parts.slice(0, 700);
};
async function getJSON(url, opts = {}, ms = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/* ---------- AniList ---------- */

const AL_FIELDS = `id type format countryOfOrigin title { romaji english native } startDate { year } episodes chapters volumes genres
  tags { name rank isMediaSpoiler } coverImage { extraLarge large } description(asHtml: false) siteUrl isAdult
  studios(isMain: true) { nodes { name } } staff(perPage: 4, sort: [RELEVANCE]) { edges { role node { name { full } } } }`;

function alToCand(m, type) {
  const author = type === 'anime'
    ? (m.studios?.nodes || []).map((n) => n.name).slice(0, 2).join(', ')
    : (m.staff?.edges || []).filter((e) => /story|art|original creator/i.test(e.role)).map((e) => e.node.name.full).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2).join(', ');
  const title = m.title.english || m.title.romaji;
  const format = type === 'anime'
    ? (m.format === 'MOVIE' ? 'movie' : ['OVA', 'ONA', 'SPECIAL', 'TV_SHORT'].includes(m.format) && m.episodes <= 3 ? 'ova' : 'series')
    : (m.format === 'ONE_SHOT' || m.volumes === 1 ? 'single' : 'series');
  return {
    title,
    altTitle: [m.title.romaji !== title ? m.title.romaji : null, m.title.native].filter(Boolean).join(' / '),
    author, year: m.startDate?.year || null,
    genres: (m.genres || []).map((g) => GENRE_IT[g] || g).filter((g) => g !== 'Hentai').slice(0, 5),
    tags: (m.tags || []).filter((t) => !t.isMediaSpoiler && t.rank >= 70).slice(0, 6).map((t) => tagIt(t.name)).filter(Boolean),
    // nei manga contano i volumi; nei webtoon i capitoli
    total: type === 'anime' ? m.episodes : type === 'manga' ? (m.volumes || m.chapters || null) : (m.chapters || null),
    unit: type === 'manga' ? (m.volumes || !m.chapters ? 'vol' : 'cap') : undefined,
    format,
    synopsis: firstSentences(m.description, 4),
    coverUrl: m.coverImage?.extraLarge || m.coverImage?.large || null,
    links: [{ url: m.siteUrl, label: 'AniList' }],
    src: { k: 'anilist', id: String(m.id) },
    source: 'AniList',
    note: m.format ? m.format.replace('_', ' ').toLowerCase() : '',
  };
}

async function anilist(type, q) {
  const query = `query($q:String,$t:MediaType){Page(perPage:8){media(search:$q,type:$t,sort:SEARCH_MATCH,isAdult:false){${AL_FIELDS}}}}`;
  const j = await getJSON('https://graphql.anilist.co', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { q, t: type === 'anime' ? 'ANIME' : 'MANGA' } }),
  });
  let media = j.data?.Page?.media || [];
  // per i webtoon metto prima i fumetti coreani/cinesi (manhwa, manhua), per i manga quelli giapponesi
  const asian = (m) => ['KR', 'CN', 'TW'].includes(m.countryOfOrigin);
  if (type === 'webtoon') media = [...media.filter(asian), ...media.filter((m) => !asian(m))];
  if (type === 'manga') media = [...media.filter((m) => !asian(m)), ...media.filter(asian)];
  return media.map((m) => alToCand(m, type));
}

// consigli della community AniList partendo dai tuoi titoli preferiti
export async function anilistRecs(seeds) {
  if (!seeds.length) return [];
  const parts = seeds.map((s, i) => `a${i}: Media(id: ${Number(s.id)}) { id recommendations(perPage: 8, sort: RATING_DESC) { nodes { rating mediaRecommendation { ${AL_FIELDS} } } } }`).join('\n');
  const j = await getJSON('https://graphql.anilist.co', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: `query{${parts}}` }),
  }, 15000);
  const out = new Map();
  seeds.forEach((s, i) => {
    for (const n of j.data?.[`a${i}`]?.recommendations?.nodes || []) {
      const m = n.mediaRecommendation; if (!m || m.isAdult) continue;
      const type = m.type === 'ANIME' ? 'anime' : ['KR', 'CN', 'TW'].includes(m.countryOfOrigin) ? 'webtoon' : 'manga';
      const key = String(m.id);
      const w = Math.max(0.5, (s.score || 7) - 6) * Math.log1p(Math.max(0, n.rating || 0));
      const prev = out.get(key);
      if (prev) { prev.w += w; if (!prev.because.includes(s.title)) prev.because.push(s.title); }
      else out.set(key, { ...alToCand(m, type), type, w, because: [s.title] });
    }
  });
  return [...out.values()].sort((a, b) => b.w - a.w);
}

/* ---------- VNDB ---------- */

async function vndb(q) {
  const j = await getJSON('https://api.vndb.org/kana/vn', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: ['search', '=', q],
      fields: 'id, title, alttitle, released, image.url, image.sexual, image.violence, developers.name, length_minutes, tags.name, tags.rating, tags.spoiler, tags.category, description, extlinks.url, extlinks.label',
      sort: 'searchrank', results: 8,
    }),
  });
  return (j.results || []).map((v) => {
    const nsfw = v.image && (v.image.sexual >= 1 || v.image.violence >= 1.5);
    const links = [{ url: `https://vndb.org/${v.id}`, label: 'VNDB' }];
    for (const l of v.extlinks || []) if (/steam|jast|mangagamer|official|website/i.test(l.label + l.url) && links.length < 4) links.push({ url: l.url, label: linkLabel(l.url) });
    return {
      title: v.title, altTitle: v.alttitle || '',
      author: (v.developers || []).map((d) => d.name).slice(0, 2).join(', '),
      year: v.released ? Number(String(v.released).slice(0, 4)) || null : null,
      genres: [], tags: (v.tags || []).filter((t) => t.spoiler === 0 && t.rating >= 2 && t.category === 'cont').sort((a, b) => b.rating - a.rating).slice(0, 6).map((t) => tagIt(t.name)),
      hours: v.length_minutes ? Math.round(v.length_minutes / 60) : null,
      synopsis: firstSentences(v.description, 4),
      coverUrl: v.image?.url || null, nsfwCover: !!nsfw,
      links, src: { k: 'vndb', id: v.id }, source: 'VNDB',
    };
  });
}

/* ---------- Libri ---------- */

async function openlibrary(q) {
  const j = await getJSON(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median,series_name,language`);
  return (j.docs || []).map((d) => ({
    title: d.title, author: (d.author_name || []).slice(0, 2).join(', '), year: d.first_publish_year || null,
    total: d.number_of_pages_median || null, unit: 'pag',
    coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    series: Array.isArray(d.series_name) ? d.series_name[0] : '',
    links: [{ url: `https://openlibrary.org${d.key}`, label: 'Open Library' }],
    src: { k: 'ol', id: d.key }, source: 'Open Library',
  }));
}

/* ---------- Album ---------- */

async function itunesAlbums(q) {
  const j = await getJSON(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=8&country=it`);
  return (j.results || []).map((a) => ({
    title: a.collectionName.replace(/ - (Single|EP)$/i, ''), author: a.artistName,
    year: a.releaseDate ? Number(a.releaseDate.slice(0, 4)) : null,
    genres: a.primaryGenreName ? [a.primaryGenreName] : [],
    coverUrl: a.artworkUrl100 ? a.artworkUrl100.replace('100x100bb', '600x600bb') : null,
    links: a.collectionViewUrl ? [{ url: a.collectionViewUrl.split('?')[0], label: 'Apple Music' }] : [],
    src: { k: 'itunes', id: String(a.collectionId) }, source: 'iTunes',
    note: a.trackCount ? `${a.trackCount} brani` : '',
  }));
}
async function musicbrainz(q) {
  const j = await getJSON(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(q)}&fmt=json&limit=8`);
  return (j['release-groups'] || []).filter((g) => g['primary-type'] !== 'Single').map((g) => ({
    title: g.title, author: (g['artist-credit'] || []).map((c) => c.name).join(', '),
    year: g['first-release-date'] ? Number(g['first-release-date'].slice(0, 4)) || null : null,
    genres: (g.tags || []).sort((a, b) => b.count - a.count).slice(0, 3).map((t) => t.name.charAt(0).toUpperCase() + t.name.slice(1)),
    coverUrl: `https://coverartarchive.org/release-group/${g.id}/front-500`,
    links: [{ url: `https://musicbrainz.org/release-group/${g.id}`, label: 'MusicBrainz' }],
    src: { k: 'mb', id: g.id }, source: 'MusicBrainz', note: g['primary-type'] || '',
  }));
}

/* ---------- Wikipedia ---------- */

const WIKI_HINT = { webtoon: 'webtoon', film: 'film', game: 'video game', book: 'novel', album: 'album', manga: 'manga', anime: 'anime', vn: 'visual novel', fanfic: '' };
const WIKI_OK = { film: /film|movie/i, game: /game/i, book: /novel|book|novella|series of|memoir|poetry|essay/i, album: /album|EP\b/i };

async function wikipedia(type, q) {
  const hint = WIKI_HINT[type] || '';
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent((q + ' ' + hint).trim())}&gsrlimit=8&prop=pageimages|description|extracts&exintro=1&explaintext=1&exsentences=3&exlimit=8&piprop=thumbnail&pithumbsize=600&pilicense=any&format=json&origin=*`;
  const j = await getJSON(url);
  const pages = Object.values(j.query?.pages || {}).sort((a, b) => a.index - b.index);
  const ok = WIKI_OK[type];
  return pages.filter((p) => !ok || ok.test(p.description || '')).map((p) => {
    const d = p.description || '';
    const m = /^(\d{4})\b.*?\bby (.+)$/i.exec(d);
    return {
      title: p.title.replace(/ \((\d{4} )?(film|video game|novel|album|manga|anime|book)\)$/i, ''),
      year: m ? Number(m[1]) : (/\b(19|20)\d{2}\b/.exec(d)?.[0] ? Number(/\b(19|20)\d{2}\b/.exec(d)[0]) : null),
      author: m ? m[2].replace(/\s*\(.*\)$/, '') : '',
      synopsis: firstSentences(p.extract, 3),
      coverUrl: p.thumbnail?.source ? p.thumbnail.source.replace(/\?.*$/, '') : null,
      links: [{ url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`, label: 'Wikipedia' }],
      src: { k: 'wiki', id: p.title }, source: 'Wikipedia', note: d,
    };
  });
}

// trama in italiano (se esiste la pagina italiana)
export async function wikiItalian(enTitle) {
  try {
    const j = await getJSON(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(enTitle)}&prop=langlinks&lllang=it&format=json&origin=*`);
    const p = Object.values(j.query?.pages || {})[0];
    const it = p?.langlinks?.[0]?.['*'];
    if (!it) return null;
    const k = await getJSON(`https://it.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(it)}&prop=extracts&exintro=1&explaintext=1&exsentences=3&format=json&origin=*`);
    const q = Object.values(k.query?.pages || {})[0];
    return { title: it.replace(/ \((film|romanzo|videogioco|album)( \d{4})?\)$/i, ''), synopsis: firstSentences(q?.extract, 3), url: `https://it.wikipedia.org/wiki/${encodeURIComponent(it.replace(/ /g, '_'))}` };
  } catch { return null; }
}

/* ---------- ricerca per categoria ---------- */

const settle = async (fns) => {
  const res = await Promise.allSettled(fns.map((f) => f()));
  const out = [];
  let failed = 0;
  for (const r of res) { if (r.status === 'fulfilled') out.push(...r.value); else failed++; }
  if (!out.length && failed === res.length) throw new Error('offline');
  return out;
};

export async function searchOnline(type, q) {
  q = String(q || '').trim();
  if (!q) return [];
  switch (type) {
    case 'anime': case 'manga': case 'webtoon': return settle([() => anilist(type, q)]);
    case 'vn': return settle([() => vndb(q), () => wikipedia('vn', q).then((r) => r.slice(0, 2))]);
    case 'book': return settle([() => openlibrary(q), () => wikipedia('book', q).then((r) => r.slice(0, 3))]);
    case 'album': return settle([() => itunesAlbums(q), () => musicbrainz(q).then((r) => r.slice(0, 4))]);
    case 'film': case 'game': return settle([() => wikipedia(type, q)]);
    case 'fanfic': return [];
    default: return [];
  }
}

// solo copertine (per "Cambia copertina")
export async function searchCovers(type, q) {
  const all = await searchOnline(type, q).catch(() => []);
  let extra = [];
  if (['manga', 'webtoon', 'anime', 'vn', 'book'].includes(type)) extra = await wikipedia(type, q).catch(() => []);
  const seen = new Set();
  return [...all, ...extra].filter((c) => c.coverUrl && !c.nsfwCover && !seen.has(c.coverUrl) && seen.add(c.coverUrl)).slice(0, 18);
}
