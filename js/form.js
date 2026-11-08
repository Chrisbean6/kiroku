// Form per aggiungere o modificare un titolo, con ricerca online di dati e copertine.
import { $, $$, esc, norm, collator, todayISO, reduced, newId, safeUrl, linkLabel } from './util.js';
import { TYPES, TYPE_KEYS, STATUSES, ST_ONE, COMMON_GENRES, PLATFORMS, normItem } from './types.js';
import { S, bus, byId, inType } from './state.js';
import { Store, coverURL } from './store.js';
import * as cloud from './cloud.js';
import { searchOnline, searchCovers, wikiItalian } from './sources.js';
import { openSheet, mountRate, processImage } from './sheets.js';
import { genHTML } from './cards.js';
import { toast, confetti } from './effects.js';
import { refreshDetail } from './detail.js';

const v = (x) => (x == null ? '' : esc(x));

function unitControl(f) {
  const T = TYPES[f.type];
  if (!T.units) return '';
  const keys = Object.keys(T.units);
  if (keys.length > 1) return `<select name="unit" aria-label="Unità">${keys.map((k) => `<option value="${k}" ${f.unit === k ? 'selected' : ''}>${T.units[k]}</option>`).join('')}</select>`;
  return `<span class="unit">${T.units[keys[0]]}</span>`;
}

// parti del form che cambiano col tipo
function typeFields(f) {
  const T = TYPES[f.type];
  let h = '';
  if (T.formats) h += `<div class="fld"><span class="fld-label">Forma</span><div class="seg seg-format" role="radiogroup">${Object.entries(T.formats).map(([k, l]) => `<button type="button" data-fmt="${k}" role="radio" aria-checked="${f.format === k}">${esc(l)}</button>`).join('')}</div></div>`;
  if (T.series) h += `<div class="row3 series-row" ${f.format === 'series' ? '' : 'hidden'}><label class="fld"><span>Nome della saga</span><input name="series" value="${v(f.series)}" autocomplete="off"></label><label class="fld"><span>Numero</span><input name="seriesNo" type="number" inputmode="numeric" min="0" value="${v(f.seriesNo)}"></label></div>`;
  if (T.fandom) h += `<div class="row3"><label class="fld"><span>Fandom</span><input name="fandom" value="${v(f.fandom)}" list="dl-fandoms" autocomplete="off" placeholder="es. Haikyuu!!"></label><label class="fld"><span>Parole</span><input name="words" type="number" inputmode="numeric" min="0" value="${v(f.words)}"></label></div>`;
  if (T.platform) h += `<label class="fld"><span>Piattaforma</span><input name="platform" value="${v(f.platform)}" list="dl-platforms" autocomplete="off"></label>`;
  if (T.units) h += `<div class="fld"><span class="fld-label">Progresso</span><div class="prog-in"><input name="progress" type="number" inputmode="decimal" min="0" step="any" value="${v(f.progress)}" aria-label="Fatti"><span class="of">di</span><input name="total" type="number" inputmode="numeric" min="0" value="${v(f.total)}" placeholder="?" aria-label="Totale"><span style="flex:1;display:flex">${unitControl(f)}</span></div></div>`;
  if (T.hours) h += `<label class="fld"><span>Ore ${f.type === 'game' ? 'di gioco' : 'impiegate'}</span><input name="hours" type="number" inputmode="decimal" min="0" step="any" value="${v(f.hours)}"></label>`;
  return h;
}

function formHTML(f, isNew) {
  const T = TYPES[f.type];
  const url = coverURL(f);
  const all = (key) => [...new Set(S.items.flatMap((i) => i[key] || []))].sort(collator.compare);
  const fandoms = [...new Set(S.items.map((i) => i.fandom).filter(Boolean))];
  const authors = [...new Set(S.items.map((i) => i.author).filter(Boolean))].sort(collator.compare);
  return `
  <form class="form" novalidate>
    <div class="sheet-head"><h2>${isNew ? 'Nuovo titolo' : 'Modifica'}</h2>
      <button type="button" class="icon-btn" data-act="cancel" aria-label="Chiudi"><svg class="ic"><use href="#i-close"/></svg></button></div>
    <div class="seg seg-type" role="radiogroup" aria-label="Categoria">
      ${TYPE_KEYS.map((k) => `<button type="button" class="t-${k}" data-v="${k}" role="radio" aria-checked="${f.type === k}">${esc(TYPES[k].short || TYPES[k].label)}</button>`).join('')}
    </div>
    <div class="f-top">
      <div>
        <button type="button" class="f-cover ${T.square ? 'sq' : ''} ${url ? 'has' : ''}" data-act="cover" aria-label="Scegli la copertina">
          ${url ? `<img src="${esc(url)}" alt="" referrerpolicy="no-referrer">` : ''}
          <span class="ph" ${url ? 'hidden' : ''}><svg class="ic"><use href="#i-image"/></svg>Copertina</span>
        </button>
        <div class="f-cover-actions"><button type="button" class="link-btn" data-act="rmcover" ${url ? '' : 'hidden'}>Togli</button></div>
      </div>
      <div class="f-main">
        <label class="fld"><span>Titolo</span><input name="title" value="${v(f.title)}" autocomplete="off" required enterkeyhint="search"></label>
        <div class="online-row" ${f.type === 'fanfic' ? 'hidden' : ''}><button type="button" class="btn small btn-hl" data-act="online"><svg class="ic"><use href="#i-globe"/></svg>Cerca online</button><span class="online-status" role="status"></span></div>
        <label class="fld"><span>Titolo originale</span><input name="altTitle" value="${v(f.altTitle)}" autocomplete="off"></label>
      </div>
    </div>
    <div class="row2">
      <label class="fld"><span class="lbl-author">${esc(T.author)}</span><input name="author" value="${v(f.author)}" list="dl-authors" autocomplete="off"></label>
      <label class="fld"><span>Anno</span><input name="year" type="number" inputmode="numeric" min="1000" max="2100" value="${v(f.year)}"></label>
    </div>
    <datalist id="dl-authors">${authors.map((a) => `<option value="${esc(a)}">`).join('')}</datalist>
    <datalist id="dl-fandoms">${fandoms.map((a) => `<option value="${esc(a)}">`).join('')}</datalist>
    <datalist id="dl-platforms">${PLATFORMS.map((a) => `<option value="${esc(a)}">`).join('')}</datalist>
    <div class="type-fields">${typeFields(f)}</div>
    <div class="fld"><span class="fld-label">Stato</span><div class="seg seg-status" role="radiogroup" aria-label="Stato"></div></div>
    <div class="fld"><span class="fld-label">Voto</span><div class="rate-slot"></div></div>
    <div class="fld"><span class="fld-label">Generi</span>
      <div class="chips-input" data-list="genres"><span class="gch"></span><input name="genre" list="dl-genres" placeholder="Scrivi e premi invio" autocomplete="off" enterkeyhint="done"></div>
      <datalist id="dl-genres">${[...new Set([...COMMON_GENRES, ...all('genres')])].sort(collator.compare).map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
    </div>
    <div class="fld"><span class="fld-label">Tag <small style="font-weight:500;color:var(--ink-3)">(i tuoi: temi, atmosfere, cose che ti colpiscono)</small></span>
      <div class="chips-input" data-list="tags"><span class="gch"></span><input name="tag" list="dl-tags" placeholder="es. found family, finale triste" autocomplete="off" enterkeyhint="done"></div>
      <datalist id="dl-tags">${all('tags').map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
      <div class="sugg" data-sugg="tags"></div>
    </div>
    <div class="row2">
      <label class="fld"><span>Iniziato il</span><input name="start" type="date" value="${v(f.start)}"></label>
      <label class="fld"><span>Finito il</span><input name="end" type="date" value="${v(f.end)}"></label>
    </div>
    <label class="fld"><span>La tua opinione</span><textarea name="notes" rows="3" placeholder="Cosa ti è rimasto, cosa no, momenti preferiti…">${v(f.notes)}</textarea></label>
    <div class="fld links-in"><span class="fld-label">Link <small style="font-weight:500;color:var(--ink-3)">(VNDB, Steam, AO3, Spotify…)</small></span><div class="lrows"></div>
      <button type="button" class="btn tiny ghost" data-act="addlink"><svg class="ic"><use href="#i-plus"/></svg>Aggiungi un link</button></div>
    <details class="more" ${f.synopsis || f.rewatch ? 'open' : ''}><summary>Trama e altro</summary>
      <label class="fld"><span>Trama</span><textarea name="synopsis" rows="3">${v(f.synopsis)}</textarea></label>
      <label class="fld"><span>Volte che l'hai ripreso da capo</span><input name="rewatch" type="number" inputmode="numeric" min="0" value="${f.rewatch || ''}" placeholder="0"></label>
    </details>
    <label class="toggle"><input type="checkbox" name="fav" ${f.fav ? 'checked' : ''}>Tra i preferiti</label>
    <div class="form-err" role="alert"></div>
    <div class="sheet-actions">
      ${isNew ? '' : '<button type="button" class="btn ghost" data-act="cancel">Annulla</button>'}
      <button type="submit" class="btn primary">${isNew ? 'Aggiungi allo scaffale' : 'Salva modifiche'}</button>
    </div>
  </form>`;
}

export function openForm(orig, preset = {}) {
  const isNew = !orig;
  const f = isNew
    ? normItem({ type: S.type !== 'all' ? S.type : 'manga', status: 'done', ...preset, id: newId() })
    : { ...orig, genres: [...orig.genres], tags: [...orig.tags], links: orig.links.map((l) => ({ ...l })) };
  if (!f.links.length) f.links = [];
  // copertina: keep (com'è), url (link esterno), file (immagine scelta), none (tolta)
  let cover = { kind: 'keep' };
  let busy = false;

  const api = openSheet({ html: formHTML(f, isNew), cls: 't-' + f.type, label: isNew ? 'Nuovo titolo' : 'Modifica', onClose: () => { if (cover.processed) URL.revokeObjectURL(cover.processed.preview); } });
  const el = api.el;
  const form = $('form', el);
  const E = form.elements;

  // ---- tipo ----
  function setType(t) {
    if (f.type === t) return;
    readTypeFields();
    f.type = t;
    const T = TYPES[t];
    el.className = el.className.replace(/\bt-\w+/, 't-' + t);
    $$('.seg-type button', el).forEach((b) => b.setAttribute('aria-checked', b.dataset.v === t));
    $('.lbl-author', el).textContent = T.author;
    if (T.units && !Object.keys(T.units).includes(f.unit)) f.unit = T.unit;
    if (T.formats && !Object.keys(T.formats).includes(f.format)) f.format = Object.keys(T.formats)[0];
    $('.type-fields', el).innerHTML = typeFields(f);
    $('.online-row', el).hidden = t === 'fanfic';
    $('.f-cover', el).classList.toggle('sq', !!T.square);
    paintStatus();
  }
  function readTypeFields() {
    for (const k of ['series', 'seriesNo', 'fandom', 'words', 'platform', 'progress', 'total', 'hours']) if (E[k]) f[k] = E[k].value;
    if (E.unit) f.unit = E.unit.value;
  }
  $('.seg-type', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setType(b.dataset.v); });
  $('.type-fields', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-fmt]'); if (!b) return;
    f.format = b.dataset.fmt;
    $$('[data-fmt]', el).forEach((x) => x.setAttribute('aria-checked', x === b));
    const sr = $('.series-row', el); if (sr) sr.hidden = f.format !== 'series';
    if (f.format === 'single' && f.type === 'manga' && E.total && !E.total.value) { E.total.value = 1; if (E.unit) E.unit.value = 'vol'; }
  });

  // ---- stato ----
  function paintStatus() {
    const T = TYPES[f.type];
    $('.seg-status', el).innerHTML = STATUSES.map((s) => `<button type="button" data-s="${s}" role="radio" aria-checked="${f.status === s}">${esc(T.st[s] || ST_ONE[s])}</button>`).join('');
  }
  paintStatus();
  $('.seg-status', el).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    f.status = b.dataset.s;
    $$('.seg-status button', el).forEach((x) => x.setAttribute('aria-checked', x === b));
    if (f.status === 'done' && !E.end.value) E.end.value = todayISO();
    if (f.status === 'ongoing' && !E.start.value) E.start.value = todayISO();
    if (f.status === 'done' && E.total && E.total.value && E.progress && (!E.progress.value || Number(E.progress.value) < Number(E.total.value))) E.progress.value = E.total.value;
  });

  // ---- voto ----
  const rate = mountRate($('.rate-slot', el), f.score, (val) => { f.score = val; });

  // ---- generi e tag a chip ----
  function chipList(key, inputName) {
    const box = $(`[data-list="${key}"]`, el);
    const gch = $('.gch', box);
    const inp = E[inputName];
    const paint = () => {
      gch.innerHTML = f[key].map((g, i) => `<span class="gchip ${key === 'tags' ? 'tag' : ''}">${esc(g)}<button type="button" data-rm="${i}" aria-label="Togli ${esc(g)}"><svg class="ic"><use href="#i-close"/></svg></button></span>`).join('');
      gch.style.display = f[key].length ? 'contents' : 'none';
      if (key === 'tags') paintSugg();
    };
    const add = (raw) => {
      for (let g of String(raw).split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean)) {
        if (key === 'genres') g = g.charAt(0).toUpperCase() + g.slice(1);
        if (!f[key].some((x) => norm(x) === norm(g)) && f[key].length < (key === 'tags' ? 20 : 10)) f[key].push(g.slice(0, 40));
      }
      paint();
    };
    gch.addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { f[key].splice(Number(b.dataset.rm), 1); paint(); } });
    box.addEventListener('click', (e) => { if (e.target === box) inp.focus(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (inp.value.trim()) { add(inp.value); inp.value = ''; } }
      else if (e.key === 'Backspace' && !inp.value && f[key].length) { f[key].pop(); paint(); }
    });
    inp.addEventListener('input', () => {
      const val = inp.value;
      if (val.endsWith(',')) { add(val); inp.value = ''; return; }
      const dl = $(`#${inp.getAttribute('list')}`, el);
      if (dl && [...dl.options].some((o) => o.value === val)) { add(val); inp.value = ''; }
    });
    inp.addEventListener('blur', () => { if (inp.value.trim()) { add(inp.value); inp.value = ''; } });
    paint();
    return { add, paint, flush: () => { if (inp.value.trim()) { add(inp.value); inp.value = ''; } } };
  }
  // suggerimenti di tag: quelli che usi di più e non sono ancora qui
  function paintSugg() {
    const box = $('[data-sugg="tags"]', el); if (!box) return;
    const cnt = new Map();
    for (const i of S.items) for (const t of i.tags) cnt.set(t, (cnt.get(t) || 0) + 1);
    const list = [...cnt.entries()].filter(([t]) => !f.tags.some((x) => norm(x) === norm(t))).sort((a, b) => b[1] - a[1]).slice(0, 8);
    box.innerHTML = list.map(([t]) => `<button type="button" data-addtag="${esc(t)}">#${esc(t)}</button>`).join('');
  }
  const genres = chipList('genres', 'genre');
  const tags = chipList('tags', 'tag');
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-addtag]'); if (b) tags.add(b.dataset.addtag); });

  // ---- link ----
  const lrows = $('.lrows', el);
  function paintLinks() {
    lrows.innerHTML = f.links.map((l, i) => `<div class="lrow"><input type="url" inputmode="url" data-li="${i}" value="${v(l.url)}" placeholder="https://…" aria-label="Link ${i + 1}"><button type="button" data-rmlink="${i}" aria-label="Togli link"><svg class="ic"><use href="#i-close"/></svg></button></div>`).join('');
  }
  paintLinks();
  lrows.addEventListener('input', (e) => { const i = e.target.dataset.li; if (i != null) f.links[Number(i)].url = e.target.value; });
  lrows.addEventListener('click', (e) => { const b = e.target.closest('[data-rmlink]'); if (b) { f.links.splice(Number(b.dataset.rmlink), 1); paintLinks(); } });

  // ---- copertina ----
  const coverBox = $('.f-cover', el);
  function showCover(src) {
    coverBox.classList.toggle('has', !!src);
    $('img', coverBox)?.remove();
    if (src) coverBox.insertAdjacentHTML('afterbegin', `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer">`);
    $('.ph', coverBox).hidden = !!src;
    $('[data-act="rmcover"]', el).hidden = !src;
    if (src && !reduced()) $('img', coverBox).animate([{ transform: 'scale(.85) rotate(-3deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }
  async function useFile(file) {
    const err = $('.form-err', el);
    err.textContent = '';
    try {
      const p = await processImage(file);
      if (cover.processed) URL.revokeObjectURL(cover.processed.preview);
      cover = { kind: 'file', processed: p };
      showCover(p.preview);
    } catch (e) { err.textContent = e.message || 'Immagine non valida.'; }
  }
  function useUrl(url) {
    if (cover.processed) URL.revokeObjectURL(cover.processed.preview);
    cover = { kind: 'url', url };
    showCover(url);
  }
  coverBox.addEventListener('dragover', (e) => { e.preventDefault(); coverBox.classList.add('dragover'); });
  coverBox.addEventListener('dragleave', () => coverBox.classList.remove('dragover'));
  coverBox.addEventListener('drop', (e) => { e.preventDefault(); coverBox.classList.remove('dragover'); if (e.dataTransfer.files[0]) useFile(e.dataTransfer.files[0]); });
  el.addEventListener('paste', (e) => {
    const file = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (file) { e.preventDefault(); useFile(file); }
  });

  // ---- ricerca online ----
  function applyCandidate(c) {
    const st = $('.online-status', el);
    const filled = [];
    const setIf = (name, val, label, force) => {
      if (val == null || val === '' || !E[name]) return;
      if (force || !E[name].value) { E[name].value = val; filled.push(label); }
    };
    if (c.title && norm(c.title) !== norm(E.title.value)) { E.title.value = c.title; filled.push('titolo'); }
    setIf('altTitle', c.altTitle, 'titolo originale');
    setIf('author', c.author, TYPES[f.type].author.toLowerCase());
    setIf('year', c.year, 'anno');
    if (c.format && TYPES[f.type].formats?.[c.format]) {
      f.format = c.format;
      $$('[data-fmt]', el).forEach((x) => x.setAttribute('aria-checked', x.dataset.fmt === c.format));
      const sr = $('.series-row', el); if (sr) sr.hidden = f.format !== 'series';
    }
    if (c.unit && E.unit) E.unit.value = c.unit;
    setIf('total', c.total, 'totale');
    setIf('hours', c.hours, 'ore');
    setIf('series', c.series, 'saga');
    setIf('synopsis', c.synopsis, 'trama');
    if (c.genres?.length) { genres.add(c.genres.join(',')); filled.push('generi'); }
    if (c.tags?.length) { tags.add(c.tags.join(',')); filled.push('tag'); }
    for (const l of c.links || []) if (l.url && !f.links.some((x) => x.url === l.url)) f.links.push({ url: l.url, label: l.label });
    paintLinks();
    if (c.src) f.src = c.src;
    if (c.coverUrl && !c.nsfwCover && (cover.kind !== 'file')) { useUrl(c.coverUrl); filled.push('copertina'); }
    if (E.synopsis.value) $('details.more', el).open = true;
    st.classList.remove('err');
    st.textContent = filled.length ? `Ho preso da ${c.source}: ${[...new Set(filled)].join(', ')}. Controlla che sia giusto.` : 'Era già tutto compilato.';
    if (c.nsfwCover) st.textContent += ' La copertina è esplicita: non l\'ho messa.';
    // trama in italiano da Wikipedia, se c'è
    if (c.source === 'Wikipedia' && c.src?.id) wikiItalian(c.src.id).then((r) => {
      if (!r || !document.contains(el)) return;
      if (r.synopsis && (!E.synopsis.value || E.synopsis.value === c.synopsis)) E.synopsis.value = r.synopsis;
      if (!f.links.some((x) => x.url === r.url)) { f.links.push({ url: r.url, label: 'Wikipedia (it)' }); paintLinks(); }
    });
  }

  async function runOnline() {
    const st = $('.online-status', el);
    const q = E.title.value.trim();
    st.classList.remove('err');
    if (!q) { st.textContent = 'Scrivi prima il titolo.'; E.title.focus(); return; }
    st.textContent = 'Cerco…';
    let res;
    try { res = await searchOnline(f.type, q); }
    catch { st.textContent = 'Non riesco a cercare: sei online?'; st.classList.add('err'); return; }
    if (!document.contains(el)) return;
    if (!res.length) { st.textContent = 'Non ho trovato niente con questo titolo. Prova a scriverlo diversamente o in inglese.'; return; }
    st.textContent = '';
    const pick = openSheet({
      label: 'Risultati', cls: 't-' + f.type,
      html: `<div class="sheet-head"><h2>Quale intendi?</h2><button class="icon-btn" data-x aria-label="Chiudi"><svg class="ic"><use href="#i-close"/></svg></button></div>
        <div class="results">${res.map((c, i) => `<button class="result" data-r="${i}" style="--i:${i}"><span class="cover ${TYPES[f.type].square ? 'sq' : ''}">${c.coverUrl && !c.nsfwCover ? `<img src="${esc(c.coverUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : genHTML({ ...c, type: f.type, id: 'r' + i })}</span>
          <span><b>${esc(c.title)}</b><small>${esc([c.author, c.year, c.note].filter(Boolean).join(', '))}</small><span class="src">${esc(c.source)}</span></span></button>`).join('')}</div>
        <p class="hint" style="margin:12px 0 0">Non c'è? Chiudi e compila a mano: va benissimo lo stesso.</p>`,
    });
    pick.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) return pick.close();
      const b = e.target.closest('[data-r]'); if (!b) return;
      applyCandidate(res[Number(b.dataset.r)]);
      pick.close();
    });
  }

  async function openCoverPicker() {
    const q = E.title.value.trim();
    const T = TYPES[f.type];
    const pick = openSheet({
      label: 'Copertina', cls: 't-' + f.type,
      html: `<div class="sheet-head"><h2>Copertina</h2><button class="icon-btn" data-x aria-label="Chiudi"><svg class="ic"><use href="#i-close"/></svg></button></div>
        <div class="set-btns" style="margin-bottom:14px">
          <label class="btn small accent"><svg class="ic"><use href="#i-upload"/></svg>Dal telefono o dal PC<input type="file" accept="image/*" class="sr-only" name="cfile"></label>
        </div>
        <label class="fld"><span>Oppure incolla il link di un'immagine</span><input name="curl" type="url" inputmode="url" placeholder="https://…"></label>
        <button class="btn small ghost" data-useurl>Usa questo link</button>
        <h3 class="section-title" style="font-size:16px">Trovate online${q ? ` per "${esc(q)}"` : ''}</h3>
        <div class="cover-box"><p class="hint" style="margin:6px 0">${q ? 'Cerco…' : 'Scrivi il titolo nel form per vedere le copertine trovate online.'}</p></div>`,
    });
    const pe = pick.el;
    pe.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) return pick.close();
      if (e.target.closest('[data-useurl]')) {
        const u = safeUrl($('[name="curl"]', pe).value);
        if (!u) { $('[name="curl"]', pe).focus(); return; }
        useUrl(u); pick.close(); return;
      }
      const b = e.target.closest('[data-cu]');
      if (b) { useUrl(b.dataset.cu); pick.close(); }
    });
    $('[name="cfile"]', pe).addEventListener('change', (e) => { const fl = e.target.files[0]; if (fl) { useFile(fl); pick.close(); } });
    if (!q) return;
    const list = await searchCovers(f.type, q);
    if (!document.contains(pe)) return;
    $('.cover-box', pe).innerHTML = list.length
      ? `<div class="cover-grid">${list.map((c) => `<button data-cu="${esc(c.coverUrl)}" title="${esc(c.title)}"><span class="cover ${T.square ? 'sq' : ''}"><img src="${esc(c.coverUrl)}" alt="${esc(c.title)}" loading="lazy" referrerpolicy="no-referrer"></span></button>`).join('')}</div>`
      : '<p class="hint" style="margin:6px 0">Nessuna copertina trovata. Puoi caricarla tu.</p>';
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'cancel') return api.close();
    if (act === 'cover') return openCoverPicker();
    if (act === 'rmcover') { if (cover.processed) URL.revokeObjectURL(cover.processed.preview); cover = { kind: 'none' }; showCover(null); return; }
    if (act === 'online') return runOnline();
    if (act === 'addlink') { f.links.push({ url: '', label: '' }); paintLinks(); $(`[data-li="${f.links.length - 1}"]`, el)?.focus(); }
  });
  E.title.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (f.type !== 'fanfic') runOnline(); } });

  // ---- salvataggio ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const err = $('.form-err', el);
    err.textContent = '';
    genres.flush(); tags.flush();
    readTypeFields();
    const title = E.title.value.trim();
    if (!title) { err.textContent = 'Serve almeno il titolo.'; E.title.focus(); return; }
    const links = f.links.map((l) => ({ url: safeUrl(l.url), label: l.label })).filter((l) => l.url).map((l) => ({ url: l.url, label: l.label || linkLabel(l.url) }));
    const it = normItem({
      ...f, title, links,
      altTitle: E.altTitle.value, author: E.author.value, year: E.year.value,
      start: E.start.value, end: E.end.value, notes: E.notes.value, synopsis: E.synopsis.value, rewatch: E.rewatch.value,
      fav: E.fav.checked, score: rate.get(), createdAt: orig?.createdAt || Date.now(),
    });
    if (it.total && it.progress != null && it.progress > it.total) it.progress = it.total;
    if (it.start && it.end && it.end < it.start) { err.textContent = 'La data di fine è prima di quella di inizio.'; E.end.focus(); return; }
    const oldPath = orig?.coverPath || null;
    const submit = $('[type="submit"]', el);
    busy = true; submit.disabled = true;
    try {
      if (cover.kind === 'file') {
        submit.textContent = 'Carico la copertina…';
        if (Store.mode === 'cloud') { it.coverPath = await cloud.uploadCover(cover.processed.blob); it.coverUrl = null; it.coverData = null; }
        else { it.coverData = await cover.processed.small(); it.coverUrl = null; it.coverPath = null; }
      } else if (cover.kind === 'url') { it.coverUrl = cover.url; it.coverPath = null; it.coverData = null; }
      else if (cover.kind === 'none') { it.coverUrl = null; it.coverPath = null; it.coverData = null; }
    } catch (ex) {
      console.warn(ex);
      err.textContent = 'Non sono riuscito a caricare la copertina. Sei online?';
      busy = false; submit.disabled = false; submit.textContent = isNew ? 'Aggiungi allo scaffale' : 'Salva modifiche';
      return;
    }
    Store.flush(it.id);
    Store.save(it);
    if (oldPath && oldPath !== it.coverPath && Store.mode === 'cloud') cloud.removeFiles('covers', [oldPath]).catch(() => {});
    api.close();
    S.flashId = isNew ? it.id : null;
    if (isNew) {
      if (S.view !== 'scaffale') location.hash = '#scaffale';
      if (!inType(it)) bus.setType(it.type);
      if (S.status !== 'all' && S.status !== it.status) S.status = 'all';
    }
    bus.render();
    refreshDetail(true);
    toast(isNew ? 'Aggiunto allo scaffale' : 'Modifiche salvate');
    if (it.score === 10 && orig?.score !== 10) confetti({ n: 160 });
    else if (it.status === 'done' && orig && orig.status !== 'done') confetti({ n: 70 });
  });

  setTimeout(() => { if (isNew && !preset.title) E.title.focus({ preventScroll: true }); }, 350);
  return api;
}
