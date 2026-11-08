// Copertine, card e righe dell'elenco.
import { esc, hash, fmtScore, nf1 } from './util.js';
import { TYPES, statusLabel } from './types.js';
import { S } from './state.js';
import { coverURL } from './store.js';

// copertina generata quando non c'è un'immagine: retino/tratteggio + forma + titolo
export function genHTML(it) {
  const h = hash((it.title || '?') + it.type);
  const others = ['--accent', '--accent-2', '--t-anime', '--t-vn', '--t-book', '--t-film'].filter((v) => v !== '--t-' + it.type);
  const c2 = `var(${others[h % others.length]})`;
  const T = TYPES[it.type] || TYPES.manga;
  const shape = (h >> 7) % 4;
  const longest = Math.max(0, ...String(it.title || '').split(/\s+/).map((w) => w.length));
  const size = longest > 12 ? ' xl' : longest > 8 ? ' l' : '';
  const vars = `--rot:${(h % 50) - 25}deg;--dir:${120 + ((h >> 4) % 140)}deg;--c2:${c2};--ang:${(h >> 3) % 180}deg;--sx:${((h >> 11) % 45) - 15}%;--sy:${((h >> 15) % 30) + 4}%`;
  return `<span class="gen" style="${vars}"><span class="tone"></span><span class="shape sh${shape}"></span>` +
    `<span class="gj" aria-hidden="true">${T.jp}</span><span class="gt${size}"><span>${esc(it.title || 'Senza titolo')}</span></span></span>`;
}

export function coverInner(it) {
  const url = coverURL(it);
  return url ? `<img src="${esc(url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-gen="${esc(it.id)}">` : genHTML(it);
}
export const coverCls = (it) => 'cover' + ((TYPES[it.type] || {}).square ? ' sq' : '');

export function stampHTML(it) {
  if (!it.score) return '';
  return `<span class="stamp${it.score === 10 ? ' ten' : ''}" aria-label="Voto ${fmtScore(it.score)}">${fmtScore(it.score)}</span>`;
}

export function progPct(it) {
  if (!it.total || it.progress == null) return null;
  return Math.max(0, Math.min(100, (it.progress / it.total) * 100));
}

export function cardHTML(it, i = 0, o = {}) {
  const fav = it.fav ? `<span class="fav-dot" aria-label="Preferito"><svg class="ic"><use href="#i-heart-f"/></svg></span>` : '';
  const pct = progPct(it);
  const prog = it.status === 'ongoing' && pct != null ? `<span class="cover-prog"><i style="width:${pct}%"></i></span>` : '';
  const tag = o.tags && it.status !== 'done' ? `<span class="status-tag">${esc(statusLabel(it))}</span>` : '';
  const T = TYPES[it.type] || TYPES.manga;
  const sub = it.author || (it.year ? String(it.year) : T.label);
  const cls = ['card', 't-' + it.type];
  if (o.drop) cls.push('drop');
  if (S.flashId === it.id) cls.push('flash');
  return `<button class="${cls.join(' ')}" data-id="${esc(it.id)}" style="--i:${Math.min(i, 24)}" aria-label="${esc(it.title)}">` +
    `<span class="${coverCls(it)}">${coverInner(it)}${stampHTML(it)}${tag}${fav}${prog}</span>` +
    (o.cap === false ? '' : `<span class="card-cap"><span class="card-title">${esc(it.title)}</span><span class="card-sub">${esc(sub)}</span></span>`) +
    `</button>`;
}

export function rowHTML(it) {
  const T = TYPES[it.type] || TYPES.manga;
  const unit = T.units ? T.units[it.unit] || '' : '';
  const p = T.units && it.progress != null ? `${nf1.format(it.progress)}${it.total ? '/' + it.total : ''} ${unit}` : (T.hours && it.hours ? `${nf1.format(it.hours)} ore` : '');
  return `<button class="row t-${it.type}" data-id="${esc(it.id)}">` +
    `<span class="${coverCls(it)}">${coverInner(it)}</span>` +
    `<span class="row-main"><span class="row-title">${esc(it.title)}</span>` +
    `<span class="row-sub">${esc([it.author, it.year].filter(Boolean).join(', ') || T.label)}</span>` +
    `<span class="row-meta"><span class="type-dot"></span>${esc(T.short || T.label)}<span>${esc(statusLabel(it))}</span>${p ? `<span>${esc(p)}</span>` : ''}${it.fav ? '<svg class="ic" style="width:14px;height:14px;color:#D6336C"><use href="#i-heart-f"/></svg>' : ''}</span></span>` +
    (it.score ? `<span class="stamp${it.score === 10 ? ' ten' : ''}">${fmtScore(it.score)}</span>` : `<span class="stamp none">–</span>`) +
    `</button>`;
}

export function starsHTML(score, big) {
  const st = '<svg class="ic"><use href="#i-star"/></svg>'.repeat(5);
  return `<span class="stars${big ? ' big' : ''}" style="--pct:${(score || 0) * 10}%"><span class="s-bg">${st}</span><span class="s-fg">${st}</span></span>`;
}
