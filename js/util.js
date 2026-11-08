// Piccole utilità usate ovunque.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Escape dell'HTML: tutto il testo scritto dall'utente passa da qui
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// testo "normalizzato" per confronti e ricerche (minuscolo, senza accenti)
export const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

export const collator = new Intl.Collator('it', { sensitivity: 'base', numeric: true });
export const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
export const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return '';
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}
// voto: 8 -> "8", 8.5 -> "8,5"
export const fmtScore = (s) => (Number.isInteger(s) ? String(s) : nf1.format(s));
export function fmtSize(b) {
  if (!b && b !== 0) return '';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return nf0.format(b / 1024) + ' KB';
  return nf1.format(b / 1024 / 1024) + ' MB';
}

// hash FNV-1a: dà a ogni copertina generata un aspetto stabile
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// localStorage che non esplode mai
export const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// etichetta leggibile per un link, in base al sito
export function linkLabel(url) {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Link'; }
  const known = {
    'vndb.org': 'VNDB', 'store.steampowered.com': 'Steam', 'steamcommunity.com': 'Steam', 'archiveofourown.org': 'AO3',
    'anilist.co': 'AniList', 'myanimelist.net': 'MyAnimeList', 'openlibrary.org': 'Open Library', 'wikipedia.org': 'Wikipedia',
    'en.wikipedia.org': 'Wikipedia', 'it.wikipedia.org': 'Wikipedia', 'musicbrainz.org': 'MusicBrainz', 'open.spotify.com': 'Spotify',
    'music.apple.com': 'Apple Music', 'youtube.com': 'YouTube', 'youtu.be': 'YouTube', 'fanfiction.net': 'FanFiction.net',
    'wattpad.com': 'Wattpad', 'efpfanfic.net': 'EFP', 'imdb.com': 'IMDb', 'themoviedb.org': 'TMDB', 'letterboxd.com': 'Letterboxd',
    'goodreads.com': 'Goodreads', 'itch.io': 'itch.io', 'gog.com': 'GOG', 'mangadex.org': 'MangaDex', 'bandcamp.com': 'Bandcamp',
    'jast.usa': 'JAST', 'mangaupdates.com': 'MangaUpdates', 'crunchyroll.com': 'Crunchyroll', 'netflix.com': 'Netflix',
  };
  if (known[host]) return known[host];
  const k = Object.keys(known).find((d) => host.endsWith('.' + d));
  return k ? known[k] : host;
}

export function safeUrl(u) {
  try { const x = new URL(String(u).trim()); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; }
}
