// Le categorie, gli stati e la "forma" di un titolo.
import { newId, safeUrl, linkLabel } from './util.js';

// Per ogni categoria:
//  label/plural/one  nomi da mostrare
//  jp                etichetta giapponese (decorativa)
//  author            come si chiama chi l'ha fatto
//  units             unità del progresso (null = niente progresso, es. film)
//  hours             mostra le ore spese
//  formats           "forma" del titolo (volume unico, serie, saga...)
//  st                nomi degli stati specifici del tipo
export const TYPES = {
  manga: {
    label: 'Manga', plural: 'manga', one: 'manga', jp: '漫画', author: 'Autore',
    units: { vol: 'volumi', cap: 'capitoli' }, unit: 'vol',
    formats: { series: 'Serie', single: 'Volume unico' },
    st: { ongoing: 'In lettura', done: 'Letto', planned: 'Da leggere' }, cheer: 'Buona lettura!',
  },
  webtoon: {
    label: 'Webtoon', plural: 'webtoon', one: 'webtoon', jp: '', author: 'Autore',
    units: { cap: 'capitoli' }, unit: 'cap',
    formats: { series: 'Serie', single: 'Storia breve' },
    st: { ongoing: 'In lettura', done: 'Letto', planned: 'Da leggere' }, cheer: 'Buona lettura!',
  },
  anime: {
    label: 'Anime', plural: 'anime', one: 'anime', jp: 'アニメ', author: 'Studio',
    units: { ep: 'episodi' }, unit: 'ep',
    formats: { series: 'Serie', movie: 'Film', ova: 'OVA/Speciale' },
    st: { ongoing: 'In visione', done: 'Visto', planned: 'Da vedere' }, cheer: 'Buona visione!',
  },
  vn: {
    label: 'Visual novel', plural: 'visual novel', one: 'visual novel', jp: 'ノベル', author: 'Sviluppatore', short: 'VN',
    units: { route: 'route' }, unit: 'route', hours: true,
    st: { ongoing: 'In gioco', done: 'Finita', planned: 'Da giocare' }, cheer: 'Buon divertimento!',
  },
  book: {
    label: 'Libri', plural: 'libri', one: 'libro', jp: '本', author: 'Autore',
    units: { pag: 'pagine', cap: 'capitoli' }, unit: 'pag',
    formats: { single: 'Libro singolo', series: 'Parte di una saga' }, series: true,
    st: { ongoing: 'In lettura', done: 'Letto', planned: 'Da leggere' }, cheer: 'Buona lettura!',
  },
  film: {
    label: 'Film', plural: 'film', one: 'film', jp: '映画', author: 'Regia',
    units: null,
    st: { ongoing: 'Iniziato', done: 'Visto', planned: 'Da vedere' }, cheer: 'Buona visione!',
  },
  fanfic: {
    label: 'Fanfiction', plural: 'fanfiction', one: 'fanfiction', jp: '二次', author: 'Autore', short: 'Fanfic',
    units: { cap: 'capitoli' }, unit: 'cap', files: true,
    formats: { oneshot: 'One-shot', multi: 'A capitoli' }, fandom: true,
    st: { ongoing: 'In lettura', done: 'Letta', planned: 'Da leggere' }, cheer: 'Buona lettura!',
  },
  game: {
    label: 'Videogiochi', plural: 'videogiochi', one: 'videogioco', jp: 'ゲーム', author: 'Sviluppatore', short: 'Giochi',
    units: null, hours: true, platform: true,
    st: { ongoing: 'In gioco', done: 'Finito', planned: 'Da giocare' }, cheer: 'Buon divertimento!',
  },
  album: {
    label: 'Album', plural: 'album', one: 'album', jp: '音楽', author: 'Artista', square: true,
    units: null,
    st: { ongoing: 'In ascolto', done: 'Ascoltato', planned: 'Da ascoltare' }, cheer: 'Buon ascolto!',
  },
};
export const TYPE_KEYS = Object.keys(TYPES);
// icona disegnata di ogni categoria (simboli c-* in index.html)
export const typeIcon = (t, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#c-${TYPES[t] ? t : 'all'}"/></svg>`;

export const STATUSES = ['ongoing', 'done', 'planned', 'paused', 'dropped'];
export const ST_GENERIC = { ongoing: 'In corso', done: 'Completati', planned: 'Da iniziare', paused: 'In pausa', dropped: 'Droppati' };
export const ST_ONE = { paused: 'In pausa', dropped: 'Droppato' };
export const PLATFORMS = ['PC', 'PS5', 'PS4', 'Switch', 'Switch 2', 'Xbox', 'Steam Deck', 'Mobile', 'Retro'];

export const COMMON_GENRES = [
  'Azione', 'Avventura', 'Commedia', 'Drammatico', 'Fantasy', 'Fantascienza', 'Horror', 'Mistero', 'Psicologico',
  'Romantico', 'Scolastico', 'Slice of life', 'Sportivo', 'Soprannaturale', 'Thriller', 'Mecha', 'Isekai', 'Musicale',
  'Storico', 'Distopico', 'Tragedia', 'Giallo', 'Rock', 'Pop', 'Elettronica', 'Hip hop', 'Jazz', 'Metal', 'Indie',
  'RPG', 'Platform', 'Metroidvania', 'Soulslike', 'Strategia', 'Puzzle',
];

export function statusLabel(it) {
  const T = TYPES[it.type] || TYPES.manga;
  return T.st[it.status] || ST_ONE[it.status] || '';
}
export function typeName(t, short) {
  const T = TYPES[t]; if (!T) return '';
  return short && T.short ? T.short : T.label;
}

// Trasforma qualsiasi oggetto (form, import, risultato online) in un titolo valido.
export function normItem(raw = {}) {
  const num = (v, min = 0, max = 1e7) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
  };
  const str = (v, max = 300) => (v == null ? '' : String(v).trim().slice(0, max));
  const list = (v, max = 12, len = 40) => (Array.isArray(v) ? [...new Set(v.map((x) => str(x, len)).filter(Boolean))].slice(0, max) : []);
  const type = TYPES[raw.type] ? raw.type : 'manga';
  const T = TYPES[type];
  const status = STATUSES.includes(raw.status) ? raw.status : 'done';
  const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  let score = num(raw.score, 0, 10) || 0;
  score = Math.round(score * 2) / 2;
  const units = T.units ? Object.keys(T.units) : [];
  const formats = T.formats ? Object.keys(T.formats) : [];
  const links = Array.isArray(raw.links) ? raw.links.map((l) => {
    const url = safeUrl(typeof l === 'string' ? l : l && l.url);
    return url ? { url, label: str((l && l.label) || linkLabel(url), 40) } : null;
  }).filter(Boolean).slice(0, 12) : [];
  const files = (arr, max) => (Array.isArray(arr) ? arr.filter((f) => f && typeof f.path === 'string').slice(0, max).map((f) => ({
    path: str(f.path, 300), thumb: f.thumb ? str(f.thumb, 300) : undefined, name: str(f.name, 160) || undefined,
    size: num(f.size) || undefined, mime: f.mime ? str(f.mime, 80) : undefined, w: num(f.w) || undefined, h: num(f.h) || undefined,
  })) : []);
  const it = {
    id: str(raw.id, 80).replace(/[^A-Za-z0-9_\-.~:@+]/g, '') || newId(),
    type,
    title: str(raw.title, 200),
    altTitle: str(raw.altTitle, 200),
    author: str(raw.author, 160),
    year: (() => { const y = num(raw.year, 1000, 2100); return y ? Math.round(y) : null; })(),
    genres: list(raw.genres, 10),
    tags: list(raw.tags, 20),
    status,
    score,
    progress: num(raw.progress, 0, 1e6),
    total: num(raw.total, 0, 1e6),
    unit: units.includes(raw.unit) ? raw.unit : (T.unit || null),
    format: formats.includes(raw.format) ? raw.format : (formats[0] || null),
    series: str(raw.series, 160),
    seriesNo: num(raw.seriesNo, 0, 999),
    fandom: str(raw.fandom, 120),
    words: num(raw.words, 0, 1e8),
    platform: str(raw.platform, 60),
    hours: num(raw.hours, 0, 1e5),
    start: date(raw.start),
    end: date(raw.end),
    fav: !!raw.fav,
    rewatch: Math.round(num(raw.rewatch, 0, 999) || 0),
    notes: str(raw.notes, 6000),
    synopsis: str(raw.synopsis, 3000),
    links,
    // copertina: un link esterno (coverUrl), un file nel tuo spazio (coverPath) o un'immagine piccola salvata dentro (coverData)
    coverUrl: safeUrl(raw.coverUrl) || null,
    coverPath: typeof raw.coverPath === 'string' && raw.coverPath.length < 300 ? raw.coverPath : null,
    coverData: typeof raw.coverData === 'string' && raw.coverData.startsWith('data:image/') && raw.coverData.length < 200000 ? raw.coverData : null,
    gallery: files(raw.gallery, 60),
    files: files(raw.files, 30),
    src: raw.src && typeof raw.src === 'object' && raw.src.k ? { k: str(raw.src.k, 20), id: str(raw.src.id, 60) } : null,
    nsfwCover: !!raw.nsfwCover,
    createdAt: num(raw.createdAt, 0, 9e15) || Date.now(),
    updatedAt: num(raw.updatedAt, 0, 9e15) || Date.now(),
  };
  if (it.progress != null) it.progress = Math.round(it.progress * 10) / 10;
  if (it.total != null) it.total = Math.round(it.total);
  if (it.total === 0) it.total = null;
  if (!T.units) { it.progress = null; it.total = null; }
  // compatibilità con i backup della prima versione (copertine dentro il titolo)
  if (!it.coverUrl && !it.coverPath && !it.coverData && typeof raw.cover === 'string' && raw.cover.startsWith('http')) it.coverUrl = safeUrl(raw.cover);
  return it;
}

// Copia pulita da salvare (via id, campi vuoti e undefined)
export function toDoc(it) {
  const o = {};
  for (const [k, v] of Object.entries(it)) {
    if (k === 'id' || v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    if (v === false && k !== 'fav') continue;
    o[k] = v;
  }
  return JSON.parse(JSON.stringify(o));
}
