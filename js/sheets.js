// Fogli (finestre che salgono dal basso), widget del voto, elaborazione immagini.
import { $, esc, reduced, fmtScore } from './util.js';
import { starsHTML } from './cards.js';
import { tip } from './effects.js';

export const sheets = [];

export function openSheet({ html, cls = '', label = '', onClose }) {
  tip.hide();
  document.dispatchEvent(new CustomEvent('kiroku:sheet'));
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  const el = document.createElement('div');
  el.className = 'sheet ' + cls + (sheets.length ? ' over' : '');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', label);
  el.tabIndex = -1;
  el.innerHTML = html;
  if (sheets.length) { scrim.style.zIndex = 62; }
  document.body.append(scrim, el);
  document.documentElement.classList.add('locked');
  const prevFocus = document.activeElement;
  let closed = false;
  const api = {
    el,
    close() {
      if (closed) return; closed = true;
      const i = sheets.indexOf(api); if (i >= 0) sheets.splice(i, 1);
      const done = () => { el.remove(); scrim.remove(); if (!sheets.length) document.documentElement.classList.remove('locked'); };
      if (reduced()) done(); else { el.classList.add('out'); scrim.classList.add('out'); setTimeout(done, 230); }
      onClose && onClose();
      if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
    },
  };
  scrim.addEventListener('click', () => api.close());
  sheets.push(api);
  swipeToClose(api);
  requestAnimationFrame(() => el.focus({ preventScroll: true }));
  return api;
}

function swipeToClose(api) {
  const el = api.el;
  let y0 = null, dy = 0, on = false;
  el.addEventListener('touchstart', (e) => {
    if (matchMedia('(min-width: 700px)').matches || el.scrollTop > 2) return;
    if (e.target.closest('input, textarea, select, .rate, .chips-input, .chips, .cover-row, .seg-type, .gallery')) return;
    y0 = e.touches[0].clientY; dy = 0; on = true;
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (!on) return;
    dy = e.touches[0].clientY - y0;
    if (dy > 0 && el.scrollTop <= 0) { el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)`; }
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (!on) return; on = false;
    el.style.transition = 'transform .25s';
    if (dy > 110) api.close(); else el.style.transform = '';
    setTimeout(() => { el.style.transition = ''; }, 260);
  });
}

addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheets.length && !document.querySelector('.lightbox')) { e.preventDefault(); sheets[sheets.length - 1].close(); }
});

// piccola finestra di conferma (al posto di confirm(), che sui telefoni è brutto)
export function confirmSheet({ title, text, ok = 'Conferma', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const api = openSheet({
      label: title,
      html: `<div class="sheet-head"><h2>${esc(title)}</h2></div><p style="margin:0 0 6px;color:var(--ink-2)">${esc(text)}</p>
        <div class="sheet-actions"><button class="btn ghost" data-a="no">Annulla</button><button class="btn ${danger ? 'danger' : 'accent'}" data-a="yes">${esc(ok)}</button></div>`,
      onClose: () => { if (!answered) resolve(false); },
    });
    api.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      answered = true; resolve(b.dataset.a === 'yes'); api.close();
    });
  });
}

/* ---------- voto con le stelle ---------- */

export function mountRate(root, initial, onCommit, { clear = true } = {}) {
  let val = initial || 0;
  root.innerHTML = `<div class="rate" role="slider" tabindex="0" aria-label="Voto da 0 a 10" aria-valuemin="0" aria-valuemax="10">` +
    `${starsHTML(val, true)}<span class="rate-num"></span>` +
    `<span style="display:flex;gap:10px"><button type="button" class="link-btn half"></button>${clear ? '<button type="button" class="link-btn clr">Togli voto</button>' : ''}</span></div>`;
  const rate = $('.rate', root), stars = $('.stars', root), num = $('.rate-num', root), half = $('.half', root), clr = $('.clr', root);
  function paint(anim) {
    stars.style.setProperty('--pct', val * 10 + '%');
    num.textContent = val ? fmtScore(val) : 'senza voto';
    num.className = 'rate-num' + (val === 10 ? ' ten' : '') + (val ? '' : ' none');
    half.textContent = val % 1 ? 'Togli ½' : 'Aggiungi ½';
    half.hidden = !val || val === 10;
    if (clr) clr.hidden = !val;
    rate.setAttribute('aria-valuenow', val);
    rate.setAttribute('aria-valuetext', val ? `${fmtScore(val)} su 10` : 'senza voto');
    if (anim && !reduced()) { num.classList.remove('thunk'); void num.offsetWidth; num.classList.add('thunk'); }
  }
  const fromX = (x) => { const r = stars.getBoundingClientRect(); return Math.max(1, Math.min(10, Math.ceil(((x - r.left) / r.width) * 10))); };
  let drag = false;
  stars.addEventListener('pointerdown', (e) => { drag = true; try { stars.setPointerCapture(e.pointerId); } catch {} val = fromX(e.clientX); paint(false); e.preventDefault(); });
  stars.addEventListener('pointermove', (e) => { if (!drag) return; const v = fromX(e.clientX); if (v !== val) { val = v; paint(false); } });
  const end = () => { if (!drag) return; drag = false; paint(true); onCommit(val); };
  stars.addEventListener('pointerup', end);
  stars.addEventListener('pointercancel', end);
  half.addEventListener('click', () => { val = val % 1 ? Math.floor(val) : Math.min(10, val + 0.5); paint(true); onCommit(val); });
  clr && clr.addEventListener('click', () => { val = 0; paint(false); onCommit(val); });
  rate.addEventListener('keydown', (e) => {
    if (e.target !== rate) return;
    let v = val;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = Math.min(10, val + 0.5);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = Math.max(0, val - 0.5);
    else if (e.key === 'Home') v = 0; else if (e.key === 'End') v = 10; else return;
    e.preventDefault(); val = v; paint(true); onCommit(val);
  });
  paint(false);
  return { get: () => val, set: (v) => { val = v; paint(false); } };
}

/* ---------- immagini ---------- */

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('decode'));
    img.src = src;
  });
}

// ridimensiona un'immagine (file o blob) e la converte in WebP/JPEG
export async function processImage(file, { maxW = 600, maxH = 900, quality = 0.86 } = {}) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw new Error('Questo file non è un\'immagine.');
  const u = URL.createObjectURL(file);
  let img;
  try { img = await loadImage(u); } catch { URL.revokeObjectURL(u); throw new Error('Non riesco a leggere questa immagine. Prova con un JPG o un PNG.'); }
  URL.revokeObjectURL(u);
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const k = Math.min(1, maxW / W, maxH / H);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const toBlob = (type, q) => new Promise((r) => c.toBlob(r, type, q));
  let blob = await toBlob('image/webp', quality);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', quality);
  return {
    blob, w: c.width, h: c.height, preview: URL.createObjectURL(blob),
    small: async () => {
      const k2 = Math.min(1, 300 / c.width);
      const s = document.createElement('canvas');
      s.width = Math.round(c.width * k2); s.height = Math.round(c.height * k2);
      s.getContext('2d').drawImage(c, 0, 0, s.width, s.height);
      return s.toDataURL('image/jpeg', 0.78);
    },
  };
}
