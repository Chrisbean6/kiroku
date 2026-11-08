// Scheda di un titolo: voto, stato, progresso, tag, link, galleria e file.
import { $, $$, esc, nf1, fmtDate, fmtSize, todayISO, reduced, newId } from './util.js';
import { TYPES, STATUSES, ST_ONE, typeIcon } from './types.js';
import { S, bus, byId } from './state.js';
import { Store, coverURL } from './store.js';
import * as cloud from './cloud.js';
import { genHTML, coverInner, coverCls, progPct, starsHTML } from './cards.js';
import { openSheet, mountRate, confirmSheet, processImage } from './sheets.js';
import { toast, hearts, confetti } from './effects.js';
import { openForm } from './form.js';

function bodyHTML(it) {
  const T = TYPES[it.type] || TYPES.manga;
  const facts = [];
  if (T.formats && it.format) facts.push(['Forma', T.formats[it.format]]);
  if (it.series) facts.push(['Saga', it.series + (it.seriesNo ? ` n. ${it.seriesNo}` : '')]);
  if (it.fandom) facts.push(['Fandom', it.fandom]);
  if (it.platform) facts.push(['Piattaforma', it.platform]);
  if (it.start) facts.push(['Iniziato', fmtDate(it.start)]);
  if (it.end) facts.push([it.status === 'dropped' ? 'Mollato' : 'Finito', fmtDate(it.end)]);
  if (T.hours && it.hours) facts.push(['Ore', nf1.format(it.hours)]);
  if (it.words) facts.push(['Parole', nf1.format(it.words)]);
  if (it.rewatch) facts.push([it.type === 'anime' || it.type === 'film' || it.type === 'tv' ? 'Rivisto' : it.type === 'album' ? 'Riascoltato' : it.type === 'game' || it.type === 'vn' ? 'Rigiocato' : 'Riletto', `${it.rewatch} ${it.rewatch === 1 ? 'volta' : 'volte'}`]);
  if (it.year) facts.push(['Uscito nel', it.year]);
  const status = STATUSES.map((s) => `<button data-st="${s}" role="radio" aria-checked="${it.status === s}">${esc(T.st[s] || ST_ONE[s])}</button>`).join('');
  const pct = progPct(it);
  const unit = T.units ? T.units[it.unit] || Object.values(T.units)[0] : '';
  const cloudOn = Store.mode === 'cloud';
  const showFiles = T.files || it.type === 'book' || it.files.length;
  return `
    <div class="d-score"><div class="rate-slot" style="flex:1"></div></div>
    <div class="d-sec"><h3>Stato</h3><div class="seg" role="radiogroup" aria-label="Stato">${status}</div></div>
    ${T.units ? `<div class="d-sec"><h3>Progresso</h3>
      <div class="d-progress">
        <span class="num"><span class="pv">${it.progress != null ? nf1.format(it.progress) : 0}</span>${it.total ? `<small> / ${it.total}</small>` : ''} <small>${esc(unit)}</small></span>
        <span class="${pct != null ? 'bar' : ''}">${pct != null ? `<i style="width:${pct}%"></i>` : ''}</span>
        <span class="step-btns"><button data-act="dec" aria-label="Togli uno"><svg class="ic"><use href="#i-minus"/></svg></button><button class="plus" data-act="inc" aria-label="Aggiungi uno">+1</button></span>
      </div><div class="suggest-slot"></div></div>` : `<div class="d-sec"><div class="suggest-slot"></div></div>`}
    ${facts.length ? `<div class="d-sec"><div class="facts">${facts.map(([k, v]) => `<div class="fact"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div></div>` : ''}
    ${it.genres.length || it.tags.length ? `<div class="d-sec"><h3>Generi e tag</h3><div class="gen-list">${it.genres.map((g) => `<button data-tag="${esc(g)}">${esc(g)}</button>`).join('')}${it.tags.map((g) => `<button class="tag" data-tag="${esc(g)}">${esc(g)}</button>`).join('')}</div></div>` : ''}
    ${it.notes ? `<div class="d-sec"><h3>La tua opinione</h3><p class="d-quote">${esc(it.notes)}</p></div>` : ''}
    ${it.synopsis ? `<div class="d-sec"><h3>Trama</h3><p>${esc(it.synopsis)}</p></div>` : ''}
    ${it.links.length ? `<div class="d-sec"><h3>Link</h3><div class="links">${it.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><svg class="ic"><use href="#i-link"/></svg><span>${esc(l.label)}<small>${esc(l.url.replace(/^https?:\/\//, ''))}</small></span></a>`).join('')}</div></div>` : ''}
    <div class="d-sec"><h3>Galleria e fan art ${cloudOn && it.gallery.length ? `<span>${it.gallery.length}</span>` : ''}</h3>
      ${cloudOn ? `<div class="gallery">${it.gallery.map((g, i) => `<button data-gal="${i}" aria-label="Apri immagine ${i + 1}"><img alt="" data-path="${esc(g.thumb || g.path)}" loading="lazy"></button>`).join('')}
        <label class="add" role="button" tabindex="0"><span><svg class="ic"><use href="#i-image"/></svg>Aggiungi</span><input type="file" accept="image/*" multiple class="sr-only" name="gal"></label></div><div class="uploading" data-up="gal"></div>`
        : `<p class="hint" style="margin:0">Accedi con il tuo account (Impostazioni) per salvare foto e fan art.</p>`}
    </div>
    ${showFiles ? `<div class="d-sec"><h3>File${it.type === 'fanfic' ? ' (EPUB, PDF…)' : ''}</h3>
      ${cloudOn ? `<div class="files">${it.files.map((f, i) => `<div class="file"><svg class="ic"><use href="#i-file"/></svg><span><b>${esc(f.name || 'file')}</b><small>${esc(fmtSize(f.size))}</small></span>
        <button class="btn tiny ghost" data-file="${i}">Scarica</button><button class="icon-btn" style="width:34px;height:34px;box-shadow:none" data-rmfile="${i}" aria-label="Elimina ${esc(f.name || 'file')}"><svg class="ic" style="width:16px;height:16px"><use href="#i-trash"/></svg></button></div>`).join('')}
        <label class="btn small ghost" style="align-self:flex-start"><svg class="ic"><use href="#i-upload"/></svg>Carica un file<input type="file" class="sr-only" name="file" accept=".epub,.pdf,.txt,.mobi,.azw3,.docx,.html,.zip,application/epub+zip,application/pdf"></label></div><div class="uploading" data-up="file"></div>`
        : `<p class="hint" style="margin:0">Accedi con il tuo account per tenere qui i tuoi EPUB.</p>`}</div>` : ''}
    ${!it.notes ? `<div class="d-sec"><button class="btn small ghost" data-act="edit"><svg class="ic"><use href="#i-edit"/></svg>Scrivi cosa ne pensi</button></div>` : ''}`;
}

function detailHTML(it) {
  const T = TYPES[it.type] || TYPES.manga;
  const url = coverURL(it);
  return `
    <div class="d-back">${url ? `<img src="${esc(url)}" alt="" data-gen="${esc(it.id)}" referrerpolicy="no-referrer">` : genHTML(it)}</div>
    <div class="d-bar">
      <button class="icon-btn" data-act="close" aria-label="Chiudi"><svg class="ic"><use href="#i-close"/></svg></button>
      <div class="group">
        <button class="icon-btn ${it.fav ? 'on' : ''}" data-act="fav" aria-pressed="${it.fav}" aria-label="Preferito"><svg class="ic"><use href="#i-heart${it.fav ? '-f' : ''}"/></svg></button>
        <button class="icon-btn" data-act="edit" aria-label="Modifica"><svg class="ic"><use href="#i-edit"/></svg></button>
        <button class="icon-btn" data-act="delete" aria-label="Elimina"><svg class="ic"><use href="#i-trash"/></svg></button>
      </div>
    </div>
    <div class="d-hero">
      <div class="${coverCls(it)} d-cover">${coverInner(it)}</div>
      <div class="d-head">
        <span class="type-pill">${typeIcon(it.type, 'ic ti')}${esc(T.label)}</span>
        <h2 class="d-title">${esc(it.title)}</h2>
        ${it.altTitle ? `<p class="d-alt">${esc(it.altTitle)}</p>` : ''}
        ${it.author ? `<p class="d-by">${esc(it.author)}</p>` : ''}
      </div>
    </div>
    <div class="d-body">${bodyHTML(it)}</div>`;
}

export function openDetail(id, fromEl) {
  const it = byId(id); if (!it) return;
  const api = openSheet({
    html: detailHTML(it), cls: 'detail t-' + it.type, label: it.title,
    onClose: () => { Store.flush(id); S.detail = null; },
  });
  S.detail = { id, api, shown: it.updatedAt };
  wire(api);
  // la copertina "vola" dalla card al dettaglio
  const from = fromEl && fromEl.querySelector('.cover');
  const to = api.el.querySelector('.d-cover');
  if (from && to && !reduced()) {
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    if (a.width && b.width) {
      to.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`, boxShadow: 'none' }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    }
  }
}

// ridisegna il dettaglio se il titolo è cambiato (es. da un altro dispositivo)
export function refreshDetail(force) {
  const d = S.detail; if (!d) return;
  const it = byId(d.id);
  if (!it) { d.api.close(); return; }
  if (!force && it.updatedAt === d.shown) return;
  if (!force && Store.timers.has(it.id)) return;
  d.shown = it.updatedAt;
  const el = d.api.el;
  const top = el.scrollTop;
  el.className = el.className.replace(/\bt-\w+/, 't-' + it.type);
  el.innerHTML = detailHTML(it);
  el.scrollTop = top;
  wire(d.api);
}

async function loadGallery(el, it) {
  const imgs = $$('.gallery img[data-path]', el);
  if (!imgs.length) return;
  try {
    const urls = await cloud.signedUrls(imgs.map((i) => i.dataset.path));
    imgs.forEach((i) => { if (urls[i.dataset.path]) i.src = urls[i.dataset.path]; });
  } catch { /* offline: restano vuote */ }
}

function wire(api) {
  const el = api.el;
  const get = () => byId(S.detail?.id);
  const it0 = get(); if (!it0) return;
  mountRate($('.rate-slot', el), it0.score, (v) => {
    const it = get(); if (!it) return;
    const was = it.score;
    Store.saveSoon({ ...it, score: v }, 400);
    if (v === 10 && was !== 10) confetti({ from: $('.rate-num', el) });
    bus.renderSoon();
  });
  if (Store.mode === 'cloud') loadGallery(el, it0);
  const bar = $('.d-bar', el);
  el.onscroll = () => bar.classList.toggle('scrolled', el.scrollTop > 120);

  el.onclick = async (e) => {
    const b = e.target.closest('[data-act], [data-st], [data-tag], [data-gal], [data-file], [data-rmfile]'); if (!b) return;
    const it = get(); if (!it) return;
    const act = b.dataset.act;
    if (act === 'close') return api.close();
    if (act === 'fav') {
      const nx = Store.save({ ...it, fav: !it.fav });
      b.classList.toggle('on', nx.fav);
      b.setAttribute('aria-pressed', nx.fav);
      b.innerHTML = `<svg class="ic"><use href="#i-heart${nx.fav ? '-f' : ''}"/></svg>`;
      if (!reduced()) { b.classList.remove('heart-pop'); void b.offsetWidth; b.classList.add('heart-pop'); }
      if (nx.fav) hearts(b);
      bus.renderSoon();
      return;
    }
    if (act === 'edit') return openForm(it);
    if (act === 'delete') { api.close(); return deleteItem(it); }
    if (act === 'inc' || act === 'dec') return stepProgress(act === 'inc' ? 1 : -1);
    if (act === 'complete') return setStatus('done');
    if (act === 'nope') { $('.suggest-slot', el).innerHTML = ''; return; }
    if (b.dataset.st) return setStatus(b.dataset.st);
    if (b.dataset.tag) { api.close(); bus.searchFor('#' + b.dataset.tag.replace(/\s+/g, '')); return; }
    if (b.dataset.gal) return openLightbox(it, Number(b.dataset.gal));
    if (b.dataset.file) {
      const f = it.files[Number(b.dataset.file)]; if (!f) return;
      try { const u = await cloud.signedUrls([f.path], true); if (u[f.path]) window.open(u[f.path], '_blank', 'noopener'); }
      catch { toast('Non riesco a scaricare il file: sei online?'); }
      return;
    }
    if (b.dataset.rmfile) {
      const f = it.files[Number(b.dataset.rmfile)]; if (!f) return;
      if (!(await confirmSheet({ title: 'Eliminare il file?', text: `"${f.name}" verrà cancellato per sempre.`, ok: 'Elimina', danger: true }))) return;
      const cur = get(); if (!cur) return;
      Store.save({ ...cur, files: cur.files.filter((x) => x.path !== f.path) });
      cloud.removeFiles('files', [f.path]).catch(() => {});
      refreshDetail(true);
      toast('File eliminato');
    }
  };

  el.onchange = async (e) => {
    const inp = e.target;
    if (inp.name !== 'gal' && inp.name !== 'file') return;
    const files = [...inp.files]; inp.value = '';
    if (!files.length) return;
    const line = $(`[data-up="${inp.name}"]`, el);
    const id = S.detail?.id;
    try {
      if (inp.name === 'gal') {
        const added = [];
        for (let k = 0; k < files.length; k++) {
          line.textContent = `Carico ${k + 1} di ${files.length}…`;
          const big = await processImage(files[k], { maxW: 1800, maxH: 1800, quality: 0.86 });
          const small = await processImage(big.blob, { maxW: 420, maxH: 420, quality: 0.8 });
          const [path, thumb] = await Promise.all([cloud.uploadFile(id, big.blob, 'art.webp'), cloud.uploadFile(id, small.blob, 'thumb.webp')]);
          added.push({ path, thumb, w: big.w, h: big.h });
          URL.revokeObjectURL(big.preview); URL.revokeObjectURL(small.preview);
        }
        const cur = byId(id); if (!cur) return;
        Store.save({ ...cur, gallery: [...cur.gallery, ...added] });
        toast(added.length === 1 ? 'Immagine aggiunta' : `${added.length} immagini aggiunte`);
      } else {
        const f = files[0];
        if (f.size > 45 * 1024 * 1024) { line.textContent = 'Il file è troppo grande (massimo 45 MB).'; return; }
        line.textContent = `Carico "${f.name}"…`;
        const path = await cloud.uploadFile(id, f, f.name);
        const cur = byId(id); if (!cur) return;
        Store.save({ ...cur, files: [...cur.files, { path, name: f.name, size: f.size, mime: f.type || undefined }] });
        toast('File caricato');
      }
      refreshDetail(true);
    } catch (ex) {
      console.warn(ex);
      line.textContent = /exceed|quota|size/i.test(ex?.message || '') ? 'Spazio pieno o file troppo grande.' : (ex?.message?.length < 120 ? ex.message : 'Caricamento non riuscito. Sei online?');
    }
  };

  function stepProgress(d) {
    const it = get(); if (!it) return;
    const nx = { ...it };
    nx.progress = Math.max(0, (nx.progress || 0) + d);
    if (nx.total && nx.progress > nx.total) nx.progress = nx.total;
    if (d > 0 && (nx.status === 'planned' || nx.status === 'paused')) {
      nx.status = 'ongoing';
      if (!nx.start) nx.start = todayISO();
      $$('[data-st]', el).forEach((x) => x.setAttribute('aria-checked', x.dataset.st === nx.status));
    }
    Store.saveSoon(nx);
    const pv = $('.pv', el);
    pv.textContent = nf1.format(nx.progress);
    if (!reduced()) { pv.classList.remove('bump'); void pv.offsetWidth; pv.classList.add('bump'); }
    const pct = progPct(nx);
    const bar = $('.bar', el);
    if (pct != null && bar) bar.innerHTML = `<i style="width:${pct}%"></i>`;
    const slot = $('.suggest-slot', el);
    if (nx.total && nx.progress >= nx.total && nx.status !== 'done') {
      slot.innerHTML = `<div class="suggest"><p>Sei arrivato alla fine! Lo segno come "${esc(TYPES[nx.type].st.done.toLowerCase())}"?</p>` +
        `<button class="btn small primary" data-act="complete">Sì</button><button class="btn small ghost" data-act="nope">Non ancora</button></div>`;
    } else if (d < 0) slot.innerHTML = '';
    bus.renderSoon();
  }

  function setStatus(s) {
    const it = get(); if (!it || it.status === s) { const sl = $('.suggest-slot', el); if (sl) sl.innerHTML = ''; return; }
    const nx = { ...it, status: s };
    if (s === 'ongoing' && !nx.start) nx.start = todayISO();
    if (s === 'done') {
      if (!nx.end) nx.end = todayISO();
      if (nx.total && (nx.progress == null || nx.progress < nx.total)) nx.progress = nx.total;
    }
    if (s === 'dropped' && !nx.end) nx.end = todayISO();
    Store.flush(nx.id);
    Store.save(nx);
    refreshDetail(true);
    if (s === 'done') {
      confetti({ from: $('[data-st="done"]', api.el), n: 70 });
      toast(`${TYPES[nx.type].st.done}! Ora dagli un voto.`);
    }
    bus.renderSoon();
  }
}

export function deleteItem(it) {
  const copy = { ...it };
  Store.remove(it.id);
  bus.render();
  let undone = false;
  toast(`"${it.title}" eliminato`, {
    action: 'Annulla', ms: 6000,
    onAction: () => { undone = true; Store.save(copy); bus.render(); },
  });
  // i file nel tuo spazio si cancellano davvero solo se non annulli
  setTimeout(() => {
    if (undone || byId(copy.id) || Store.mode !== 'cloud') return;
    if (copy.coverPath) cloud.removeFiles('covers', [copy.coverPath]).catch(() => {});
    const paths = [...copy.gallery.flatMap((g) => [g.path, g.thumb].filter(Boolean)), ...copy.files.map((f) => f.path)];
    if (paths.length) cloud.removeFiles('files', paths).catch(() => {});
  }, 9000);
}

/* ---------- visualizzatore immagini ---------- */

export async function openLightbox(it, start) {
  let i = start;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Galleria');
  box.innerHTML = `<div class="lb-bar"><button class="icon-btn" data-lb="close" aria-label="Chiudi"><svg class="ic"><use href="#i-close"/></svg></button>
    <span style="display:flex;gap:8px"><button class="icon-btn" data-lb="dl" aria-label="Scarica"><svg class="ic"><use href="#i-download"/></svg></button>
    <button class="icon-btn" data-lb="rm" aria-label="Elimina"><svg class="ic"><use href="#i-trash"/></svg></button></span></div>
    <div class="lb-img"><img alt=""></div><div class="lb-count"></div>`;
  document.body.append(box);
  const img = $('img', box), count = $('.lb-count', box);
  const cur = () => byId(it.id) || it;
  async function show() {
    const g = cur().gallery[i]; if (!g) { close(); return; }
    count.textContent = `${i + 1} di ${cur().gallery.length}`;
    img.removeAttribute('src');
    try { const u = await cloud.signedUrls([g.path]); img.src = u[g.path]; } catch { count.textContent = 'Non riesco a caricare l\'immagine.'; }
  }
  function close() { box.remove(); removeEventListener('keydown', key); }
  function move(d) { const n = cur().gallery.length; if (n < 2) return; i = (i + d + n) % n; show(); }
  function key(e) { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') move(1); if (e.key === 'ArrowLeft') move(-1); }
  addEventListener('keydown', key);
  let x0 = null;
  box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1); x0 = null; });
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-lb]');
    if (!b) { if (e.target === box || e.target.classList.contains('lb-img')) close(); return; }
    if (b.dataset.lb === 'close') return close();
    const g = cur().gallery[i]; if (!g) return;
    if (b.dataset.lb === 'dl') { try { const u = await cloud.signedUrls([g.path], true); window.open(u[g.path], '_blank', 'noopener'); } catch {} return; }
    if (b.dataset.lb === 'rm') {
      if (!(await confirmSheet({ title: 'Eliminare l\'immagine?', text: 'Verrà cancellata per sempre.', ok: 'Elimina', danger: true }))) return;
      const it2 = cur();
      Store.save({ ...it2, gallery: it2.gallery.filter((x) => x.path !== g.path) });
      cloud.removeFiles('files', [g.path, g.thumb].filter(Boolean)).catch(() => {});
      refreshDetail(true);
      if (!cur().gallery.length) close(); else { i = Math.min(i, cur().gallery.length - 1); show(); }
    }
  });
  show();
}
