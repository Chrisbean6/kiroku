// Le viste principali: scaffale, tier list, statistiche.
import { $, $$, esc, norm, nf0, nf1, collator, reduced } from './util.js';
import { TYPES, TYPE_KEYS, STATUSES, ST_GENERIC, typeName, typeIcon } from './types.js';
import { S, prefs, inType } from './state.js';
import { Store } from './store.js';
import { cardHTML, rowHTML } from './cards.js';
import { kuroBox, ghost } from './mascot.js';

/* ---------- filtri e ordinamento ---------- */

export function sortItems(list, how) {
  const t = (a, b) => collator.compare(a.title, b.title);
  const by = {
    recent: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    score: (a, b) => (b.score || -1) - (a.score || -1) || t(a, b),
    title: t,
    finished: (a, b) => (b.end || '').localeCompare(a.end || '') || (b.updatedAt || 0) - (a.updatedAt || 0),
    year: (a, b) => (b.year || 0) - (a.year || 0) || t(a, b),
  }[how] || (() => 0);
  return list.slice().sort(by);
}

export function filtered() {
  let l = S.items.filter(inType);
  if (S.status === 'fav') l = l.filter((i) => i.fav);
  else if (S.status !== 'all') l = l.filter((i) => i.status === S.status);
  if (S.q) {
    // "#tag" cerca solo nei tag e nei generi; le altre parole ovunque
    const words = S.q.split(/\s+/).filter(Boolean);
    for (const w of words) {
      if (w.startsWith('#') && w.length > 1) {
        const tq = norm(w.slice(1));
        l = l.filter((i) => [...(i.tags || []), ...(i.genres || []), i.fandom].some((x) => norm(x).includes(tq)));
      } else {
        const q = norm(w);
        l = l.filter((i) => norm([i.title, i.altTitle, i.author, (i.genres || []).join(' '), (i.tags || []).join(' '), i.notes, i.year, i.fandom, i.series, i.platform].join(' ')).includes(q));
      }
    }
  }
  return sortItems(l, prefs.sort);
}

/* ---------- testata ---------- */

export function renderSummary() {
  const all = S.items;
  const rated = all.filter((i) => i.score > 0);
  const avg = rated.length ? rated.reduce((a, b) => a + b.score, 0) / rated.length : null;
  const done = all.filter((i) => i.status === 'done').length;
  const el = $('#summary');
  if (!all.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<span><b>${all.length}</b>${all.length === 1 ? 'titolo' : 'titoli'}</span>` +
    `<span><b>${done}</b>${done === 1 ? 'completato' : 'completati'}</span>` +
    (avg != null ? `<span><b>${nf1.format(avg)}</b>voto medio</span>` : '');
}

let tabInd = null;   // posizione precedente dell'indicatore, per farlo scivolare
export function renderTabs() {
  const box = $('#typetabs');
  const counts = { all: S.items.length };
  for (const k of TYPE_KEYS) counts[k] = S.items.filter((i) => i.type === k).length;
  // le categorie vuote vanno in fondo, così le tue restano a portata di pollice
  const keys = ['all', ...TYPE_KEYS.filter((k) => counts[k]), ...TYPE_KEYS.filter((k) => !counts[k])];
  box.innerHTML = `<span class="tab-ind" aria-hidden="true"></span>` + keys.map((k) => {
    const T = TYPES[k];
    return `<button data-t="${k}" class="${k === 'all' ? '' : 't-' + k}" aria-pressed="${S.type === k}">` +
      typeIcon(k, 'ic ti') + `${k === 'all' ? 'Tutti' : esc(T.short || T.label)}` +
      `${counts[k] ? `<small>${counts[k]}</small>` : ''}</button>`;
  }).join('');
  const on = box.querySelector('[aria-pressed="true"]');
  const ind = box.querySelector('.tab-ind');
  if (on) {
    const pos = { x: on.offsetLeft, w: on.offsetWidth, c: S.type === 'all' ? 'var(--accent)' : `var(--t-${S.type})` };
    const put = (p) => { ind.style.transform = `translateX(${p.x}px)`; ind.style.width = p.w + 'px'; ind.style.background = p.c; };
    if (tabInd && !reduced() && (tabInd.x !== pos.x || tabInd.w !== pos.w)) {
      ind.style.transition = 'none'; put(tabInd); void ind.offsetWidth; ind.style.transition = ''; put(pos);
    } else put(pos);
    tabInd = pos;
    if (on.offsetLeft + on.offsetWidth > box.scrollLeft + box.clientWidth) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
  }
}

export function renderChips() {
  const its = S.items.filter(inType);
  const n = (f) => its.filter(f).length;
  const opts = [['all', 'Tutti', its.length]];
  for (const s of STATUSES) {
    const label = S.type !== 'all' ? (TYPES[S.type].st[s] || ST_GENERIC[s]) : ST_GENERIC[s];
    opts.push([s, label, n((i) => i.status === s)]);
  }
  opts.push(['fav', 'Preferiti', n((i) => i.fav)]);
  $('#chips').innerHTML = opts
    .filter(([k, , c]) => k === 'all' || c > 0 || S.status === k)
    .map(([k, l, c]) => `<button class="chip" data-s="${k}" aria-pressed="${S.status === k}">` +
      (k === 'fav' ? '<svg class="ic"><use href="#i-heart-f"/></svg>' : '') + `${esc(l)}<small>${c}</small></button>`).join('');
}

/* ---------- scaffale ---------- */

export function renderShelf() {
  const box = $('#shelf');
  $('#btnView').innerHTML = `<svg class="ic"><use href="#i-${prefs.view === 'grid' ? 'list' : 'grid'}"/></svg>`;
  $('#btnView').setAttribute('aria-label', prefs.view === 'grid' ? 'Mostra come elenco' : 'Mostra come griglia');
  $('#sort').value = prefs.sort;
  if (!S.loaded) {
    box.innerHTML = `<div class="grid skel" aria-hidden="true">${'<div class="card"><div class="cover"></div><div class="card-title"></div></div>'.repeat(9)}</div>`;
    return;
  }
  if (!S.items.length) {
    box.innerHTML = `<div class="empty">${kuroBox('sleep')}<h2>Lo scaffale è vuoto</h2>` +
      `<p>Kuro ci si è addormentato sopra. Aggiungi la prima cosa che ti è rimasta in testa: manga, film, album, quello che vuoi.</p>` +
      `<div class="btns"><button class="btn accent" data-act="add">Aggiungi il primo titolo</button>` +
      `<button class="btn ghost" data-act="bulk">Aggiungine tanti insieme</button>` +
      `<button class="link-btn" data-act="settings">Importa da MyAnimeList o da un backup</button></div></div>`;
    return;
  }
  const list = filtered();
  if (!list.length) {
    const what = S.q ? `per "${esc(S.q)}"` : 'con questi filtri';
    box.innerHTML = `<div class="empty"><div class="mascot float">${ghost()}</div><h2>Qui c'è solo un fantasma</h2><p>Nessun titolo ${what}.</p>` +
      `<div class="btns"><button class="btn ghost" data-act="reset">Azzera i filtri</button></div></div>`;
    return;
  }
  const drop = S.firstDrop && !reduced();
  if (prefs.view === 'list') box.innerHTML = `<div class="list">${list.map(rowHTML).join('')}</div>`;
  else box.innerHTML = `<div class="grid">${list.map((it, i) => cardHTML(it, i, { drop, tags: S.status === 'all' })).join('')}</div>`;
  $$('.cover > img', box).forEach((im) => { if (im.complete && im.naturalWidth) im.classList.add('ok'); });
  S.firstDrop = false;
  if (S.flashId) {
    const el = box.querySelector(`[data-id="${CSS.escape(S.flashId)}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
    setTimeout(() => { S.flashId = null; }, 1500);
  }
}

/* ---------- tier list ---------- */

const TIERS = [
  { k: 'S', min: 9, range: '9-10', tc: 'var(--hl)', tt: 'var(--on-hl)' },
  { k: 'A', min: 8, range: '8-8,5', tc: 'var(--accent)', tt: 'var(--on-accent)' },
  { k: 'B', min: 7, range: '7-7,5', tc: 'var(--accent-2)', tt: 'var(--ink)' },
  { k: 'C', min: 6, range: '6-6,5', tc: 'var(--paper-3)', tt: 'var(--ink)' },
  { k: 'D', min: 4, range: '4-5,5', tc: 'color-mix(in srgb, var(--ink) 25%, var(--paper-3))', tt: 'var(--ink)' },
  { k: 'F', min: 0.5, range: '1-3,5', tc: 'color-mix(in srgb, var(--ink) 45%, var(--paper-3))', tt: 'var(--paper)' },
];

export function renderTier() {
  const box = $('#tiers');
  const its = S.items.filter(inType);
  const rated = sortItems(its.filter((i) => i.score > 0), 'score');
  if (!rated.length) {
    box.innerHTML = `<div class="empty">${kuroBox('sit')}<h2>Ancora nessun voto</h2><p>Dai un voto ai tuoi titoli e la tier list si compone da sola.</p></div>`;
    return;
  }
  const unrated = its.length - rated.length;
  let rest = rated;
  const rows = TIERS.map((t, idx) => {
    const here = rest.filter((i) => i.score >= t.min);
    rest = rest.filter((i) => i.score < t.min);
    return `<div class="tier" style="--i:${idx}"><div class="tier-lbl" style="--tc:${t.tc};--tt:${t.tt}"><span>${t.k}</span><small>${t.range}</small></div>` +
      `<div class="tier-items">${here.length ? here.map((it) => cardHTML(it, 0, { cap: false })).join('') : '<span class="tier-empty">Vuoto</span>'}</div></div>`;
  }).join('');
  box.innerHTML = `<div class="tiers${reduced() ? '' : ' tier-in'}">${rows}` +
    (unrated ? `<p class="hint" style="margin:6px 2px 0">${unrated} ${unrated === 1 ? 'titolo senza voto non compare' : 'titoli senza voto non compaiono'} qui.</p>` : '') + `</div>`;
}

/* ---------- statistiche ---------- */

function watched(it) {
  // quanto hai fatto davvero: progresso (o il totale se è completato), più le riletture
  let base = it.progress != null ? it.progress : (it.status === 'done' ? it.total || 0 : 0);
  if (it.status === 'done' && it.total && it.rewatch) base += it.rewatch * it.total;
  return base || 0;
}

function hbarsHTML(rows, max) {
  return `<div class="hbars">${rows.map(([name, count, tipText, label], i) =>
    `<div class="hbar" data-tip="${esc(tipText || `${name}: ${count}`)}" style="--i:${i}"><span class="n">${esc(name)}</span>` +
    `<span class="t"><i style="width:${Math.max(2, (count / max) * 100)}%"></i></span><span class="c">${label ?? count}</span></div>`).join('')}</div>`;
}

function vbarsHTML(labels, values, tips) {
  const max = Math.max(1, ...values);
  const peak = values.indexOf(Math.max(...values));
  return `<div class="vbars" style="--n:${values.length}">${values.map((c, i) =>
    `<div class="vbar" data-tip="${esc(tips[i])}" style="--i:${i}"><i class="${c ? '' : 'zero'}" style="height:${(c / max) * 100}%"></i>` +
    (i === peak && c ? `<span class="peak" style="bottom:calc(${(c / max) * 100}% + 3px)">${c}</span>` : '') + `</div>`).join('')}</div>` +
    `<div class="vlabels" style="--n:${values.length}">${labels.map((l) => `<span>${esc(l)}</span>`).join('')}</div>`;
}

// "affinità": per ogni tag/genere, quanto lo voti rispetto alla tua media
function affinity(its, key, min = 2) {
  const rated = its.filter((i) => i.score > 0);
  if (rated.length < 3) return [];
  const avg = rated.reduce((a, b) => a + b.score, 0) / rated.length;
  const m = new Map();
  for (const i of rated) for (const t of (key === 'tags' ? i.tags : i.genres) || []) {
    const o = m.get(t) || { n: 0, sum: 0 };
    o.n++; o.sum += i.score; m.set(t, o);
  }
  return [...m.entries()].filter(([, o]) => o.n >= min)
    .map(([t, o]) => ({ t, n: o.n, avg: o.sum / o.n, d: o.sum / o.n - avg }))
    .sort((a, b) => b.d - a.d || b.n - a.n);
}

export function renderStats() {
  const box = $('#stats');
  const its = S.items.filter(inType);
  $('#statsSub').textContent = S.type === 'all' ? 'Quanto hai letto, visto, giocato e ascoltato.' : `Solo ${TYPES[S.type].plural}.`;
  box.className = S.type === 'all' ? '' : 't-' + S.type;
  const bc = S.type === 'all' ? 'var(--chart)' : 'var(--c)';
  if (!its.length) {
    box.innerHTML = `<div class="empty">${kuroBox('sit')}<h2>Niente da contare</h2><p>Aggiungi qualche titolo e qui compaiono i tuoi numeri.</p></div>`;
    return;
  }
  const rated = its.filter((i) => i.score > 0);
  const avg = rated.length ? rated.reduce((a, b) => a + b.score, 0) / rated.length : null;
  const done = its.filter((i) => i.status === 'done').length;
  const favs = its.filter((i) => i.fav).length;

  let tiles = '';
  if (S.type === 'all') {
    const counts = TYPE_KEYS.map((k) => [k, S.items.filter((i) => i.type === k).length]).filter(([, c]) => c);
    tiles += `<div class="tile big"><div class="v">${its.length}</div><div class="k">titoli in tutto</div>` +
      `<div class="type-split" role="img" aria-label="${counts.map(([k, c]) => `${TYPES[k].label} ${c}`).join(', ')}">` +
      counts.map(([k, c]) => `<i class="t-${k}" style="flex:${c}" data-tip="${TYPES[k].label}: ${c}"></i>`).join('') + `</div>` +
      `<div class="type-legend">${counts.map(([k, c]) => `<span class="t-${k}"><span class="type-dot"></span>${typeName(k, true)} <b>${c}</b></span>`).join('')}</div></div>`;
  } else {
    tiles += `<div class="tile"><div class="v">${its.length}</div><div class="k">${TYPES[S.type].plural}</div></div>`;
  }
  tiles += `<div class="tile"><div class="v">${avg != null ? nf1.format(avg) : '–'}</div><div class="k">voto medio</div><div class="s">${rated.length} votati</div></div>`;
  tiles += `<div class="tile"><div class="v">${done}</div><div class="k">completati</div><div class="s">${its.length ? nf0.format((done / its.length) * 100) : 0}% del totale</div></div>`;
  if (S.type !== 'all') tiles += `<div class="tile"><div class="v">${favs}</div><div class="k">preferiti</div></div>`;

  // tempo speso, per tipo
  const of = (t) => its.filter((i) => i.type === t);
  const time = [];
  if (of('anime').length) { const ep = of('anime').reduce((a, i) => a + watched(i), 0); const h = (ep * 24) / 60; time.push(`<div class="tile"><div class="v">${nf0.format(ep)}</div><div class="k">episodi visti</div><div class="s">circa ${h >= 48 ? nf1.format(h / 24) + ' giorni' : nf0.format(h) + ' ore'} di anime</div></div>`); }
  if (of('manga').length) { const vol = of('manga').filter((i) => i.unit === 'vol').reduce((a, i) => a + watched(i), 0); const ch = of('manga').filter((i) => i.unit === 'cap').reduce((a, i) => a + watched(i), 0); time.push(`<div class="tile"><div class="v">${nf0.format(vol)}</div><div class="k">volumi di manga</div>${ch ? `<div class="s">e ${nf0.format(ch)} capitoli</div>` : ''}</div>`); }
  if (of('webtoon').length) { const ch = of('webtoon').reduce((a, i) => a + watched(i), 0); time.push(`<div class="tile"><div class="v">${nf0.format(ch)}</div><div class="k">capitoli di webtoon</div></div>`); }
  if (of('book').length) { const pg = of('book').filter((i) => i.unit === 'pag').reduce((a, i) => a + watched(i), 0); time.push(`<div class="tile"><div class="v">${nf0.format(pg)}</div><div class="k">pagine lette</div><div class="s">${of('book').filter((i) => i.status === 'done').length} libri finiti</div></div>`); }
  if (of('fanfic').length) { const w = of('fanfic').reduce((a, i) => a + (i.status === 'done' ? i.words || 0 : 0), 0); time.push(`<div class="tile"><div class="v">${of('fanfic').filter((i) => i.status === 'done').length}</div><div class="k">fanfiction lette</div>${w ? `<div class="s">${nf0.format(w)} parole</div>` : ''}</div>`); }
  if (of('vn').length) { const h = of('vn').reduce((a, i) => a + (i.hours || 0), 0); time.push(`<div class="tile"><div class="v">${nf0.format(h)}</div><div class="k">ore di visual novel</div></div>`); }
  if (of('game').length) { const h = of('game').reduce((a, i) => a + (i.hours || 0), 0); time.push(`<div class="tile"><div class="v">${nf0.format(h)}</div><div class="k">ore di gioco</div><div class="s">${of('game').filter((i) => i.status === 'done').length} giochi finiti</div></div>`); }
  if (of('film').length) { const seen = of('film').filter((i) => i.status === 'done'); const times = seen.reduce((a, i) => a + 1 + (i.rewatch || 0), 0); time.push(`<div class="tile"><div class="v">${seen.length}</div><div class="k">film visti</div>${times > seen.length ? `<div class="s">${times} visioni contando i rewatch</div>` : ''}</div>`); }
  if (of('album').length) time.push(`<div class="tile"><div class="v">${of('album').filter((i) => i.status === 'done').length}</div><div class="k">album ascoltati</div></div>`);
  if (S.type === 'all') time.push(`<div class="tile"><div class="v">${favs}</div><div class="k">preferiti</div></div>`);

  // distribuzione voti
  const bins = Array(10).fill(0);
  for (const i of rated) bins[Math.min(9, Math.max(0, Math.floor(i.score) - 1))]++;
  const hist = rated.length ? `<div class="panel" style="--bc:${bc}"><h3>Come voti</h3><p class="sub">Quanti titoli per ogni voto (i mezzi punti contano col voto intero sotto).</p>` +
    vbarsHTML(bins.map((_, i) => String(i + 1)), bins, bins.map((c, i) => `Voto ${i + 1}: ${c} ${c === 1 ? 'titolo' : 'titoli'}`)) + `</div>` : '';

  // tag e generi che ami (sopra la tua media)
  const tagAff = affinity(its, 'tags');
  const genAff = affinity(its, 'genres');
  const love = (list, title, sub) => list.length ? `<div class="panel"><h3>${title}</h3><p class="sub">${sub}</p><div class="love">${list.slice(0, 7).map((x) =>
    `<div class="love-row" data-tip="${esc(`${x.t}: ${x.n} titoli, media ${nf1.format(x.avg)}`)}"><span class="n">${esc(x.t)}<small>${x.n} titoli</small></span><span>${nf1.format(x.avg)}</span><span class="d ${x.d > 0 ? 'up' : ''}">${x.d > 0 ? '+' : ''}${nf1.format(x.d)}</span></div>`).join('')}</div></div>` : '';
  const tagPanel = love(tagAff.filter((x) => x.d > -0.01), 'I tag che ami di più', 'Voto medio dei titoli con quel tag, e quanto sta sopra la tua media.');
  const genPanel = love(genAff, 'Generi: dove voti più alto', 'Voto medio per genere confrontato con la tua media.');

  // tag più frequenti
  const tmap = new Map();
  for (const i of its) for (const t of [...(i.tags || []), ...(i.genres || [])]) tmap.set(t, (tmap.get(t) || 0) + 1);
  const tRows = [...tmap.entries()].sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0])).slice(0, 10).map(([t, c]) => [t, c, `${t}: ${c} titoli`]);
  const tPanel = tRows.length ? `<div class="panel" style="--bc:${bc}"><h3>Generi e tag più presenti</h3><p class="sub">Di cosa è fatto il tuo scaffale.</p>${hbarsHTML(tRows, tRows[0][1])}</div>` : '';

  // tendenze: tag dei titoli finiti negli ultimi anni
  const years = [...new Set(its.filter((i) => i.status === 'done' && i.end).map((i) => i.end.slice(0, 4)))].sort().slice(-3);
  const trend = years.length >= 2 ? `<div class="panel"><h3>Come cambiano i tuoi gusti</h3><p class="sub">I tag più frequenti fra i titoli finiti, anno per anno.</p><div class="love">${years.reverse().map((y) => {
    const m = new Map();
    for (const i of its) if (i.status === 'done' && i.end?.startsWith(y)) for (const t of [...(i.tags || []), ...(i.genres || [])]) m.set(t, (m.get(t) || 0) + 1);
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
    return `<div class="love-row"><span class="n">${y}</span><span style="grid-column: span 2; text-align:right; color: var(--ink-2)">${esc(top.join(', ') || '—')}</span></div>`;
  }).join('')}</div></div>` : '';

  // stati
  const stRows = STATUSES.map((s) => [S.type === 'all' ? ST_GENERIC[s] : (TYPES[S.type].st[s] || ST_GENERIC[s]), its.filter((i) => i.status === s).length]).filter(([, c]) => c);
  const stPanel = `<div class="panel" style="--bc:${bc}"><h3>A che punto sei</h3><p class="sub">Titoli per stato.</p>${hbarsHTML(stRows, Math.max(...stRows.map((r) => r[1])))}</div>`;

  // autori / studi / artisti che tornano
  const amap = new Map();
  for (const i of its) { const k = (i.author || '').trim(); if (!k) continue; const o = amap.get(k) || { n: 0, sum: 0, r: 0 }; o.n++; if (i.score) { o.sum += i.score; o.r++; } amap.set(k, o); }
  const aRows = [...amap.entries()].filter(([, o]) => o.n > 1).sort((a, b) => b[1].n - a[1].n).slice(0, 6).map(([a, o]) => [a, o.n, `${a}: ${o.n} titoli${o.r ? `, media ${nf1.format(o.sum / o.r)}` : ''}`]);
  const aPanel = aRows.length ? `<div class="panel" style="--bc:${bc}"><h3>Chi torna più spesso</h3><p class="sub">Autori, studi e artisti presenti almeno due volte.</p>${hbarsHTML(aRows, aRows[0][1])}</div>` : '';

  // completati per anno
  const ymap = new Map();
  for (const i of its) if (i.status === 'done' && i.end) { const y = i.end.slice(0, 4); ymap.set(y, (ymap.get(y) || 0) + 1); }
  const ys = [...ymap.keys()].sort().slice(-10);
  const yPanel = ys.length > 1 ? `<div class="panel" style="--bc:${bc}"><h3>Completati per anno</h3><p class="sub">In base alla data di fine.</p>` +
    vbarsHTML(ys.map((y) => '’' + y.slice(2)), ys.map((y) => ymap.get(y)), ys.map((y) => `${y}: ${ymap.get(y)} completati`)) + `</div>` : '';

  const top = sortItems(rated, 'score').slice(0, 10);
  const topPanel = top.length ? `<div class="panel"><h3>I tuoi voti più alti</h3><div class="cover-row">${top.map((it) => cardHTML(it)).join('')}</div></div>` : '';

  box.innerHTML = `<div class="stats"><div class="tiles">${tiles}</div>${time.length ? `<div class="tiles">${time.join('')}</div>` : ''}` +
    `${topPanel}<div class="panels">${tagPanel}${genPanel}${hist}${tPanel}${trend}${stPanel}${aPanel}${yPanel}</div></div>`;
}
