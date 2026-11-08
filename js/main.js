// Avvio dell'app, navigazione tra le viste ed eventi principali.
import { $, $$, esc, reduced, LS } from './util.js';
import { TYPES } from './types.js';
import { S, prefs, savePrefs, bus, byId, inType } from './state.js';
import { Store, localCount, migrateLocalToCloud } from './store.js';
import * as cloud from './cloud.js';
import { renderSummary, renderTabs, renderChips, renderShelf, renderTier, renderStats } from './views.js';
import { renderRecs, bindRecs } from './recs.js';
import { openDetail, refreshDetail } from './detail.js';
import { openForm } from './form.js';
import { openBulk, openPicker, openSettings, renderGate, applyTheme } from './extra.js';
import { toast, confetti, tip } from './effects.js';
import { kuroPose, kuro } from './mascot.js';
import { genHTML } from './cards.js';

const VIEWS = ['scaffale', 'tier', 'stats', 'consigli'];

/* ---------- disegno ---------- */

function renderBanner() {
  const el = $('#banner');
  let html = '';
  if (S.note) html = `<div class="banner"><p>${esc(S.note)}</p></div>`;
  else if (Store.mode === 'cloud' && localCount() && !LS.get('kiroku2.migrated', false)) {
    html = `<div class="banner"><p>Su questo dispositivo ci sono ${localCount()} titoli salvati senza account. Li sposto nel tuo account?</p><button class="btn small accent" data-act="migrate">Sposta</button></div>`;
  } else if (Store.mode === 'local' && cloud.cloudReady() && !prefs.bannerOff && S.loaded) {
    html = `<div class="banner"><p>Stai usando Kiroku senza account: i titoli restano solo qui.</p><button class="btn small accent" data-act="login">Accedi</button>` +
      `<button class="icon-btn" style="width:34px;height:34px;box-shadow:none" data-act="banner-off" aria-label="Chiudi avviso"><svg class="ic" style="width:16px;height:16px"><use href="#i-close"/></svg></button></div>`;
  }
  el.innerHTML = html;
}

function syncState() {
  const el = $('#syncState'); if (!el) return;
  let t;
  if (Store.mode === 'local') t = 'solo su questo dispositivo';
  else if (Store.status === 'saving') t = 'salvo…';
  else if (Store.status === 'offline' || !navigator.onLine) t = Store.pending() ? 'offline, salvo appena torni online' : 'offline';
  else if (Store.status === 'error') t = 'non sincronizzato, riprovo';
  else t = 'sincronizzato';
  el.innerHTML = `${Store.mode === 'cloud' ? '<svg class="ic"><use href="#i-cloud"/></svg>' : ''}${esc(t)}`;
}

function renderHeader() { renderSummary(); renderBanner(); renderTabs(); syncState(); }

function render() {
  renderHeader();
  if (S.view === 'scaffale') { renderChips(); renderShelf(); }
  else if (S.view === 'tier') renderTier();
  else if (S.view === 'stats') renderStats();
  else if (S.view === 'consigli') renderRecs();
  $('#kuroPeek')?.toggleAttribute('hidden', S.view !== 'scaffale' || !S.loaded);
}
let queued = false;
function renderSoon() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; render(); }); }

function setType(t) { S.type = t; prefs.type = t; savePrefs(); }

Object.assign(bus, {
  render, renderSoon, refreshDetail, syncState, renderHeader, setType, toast,
  showGate: () => renderGate(afterLogin),
  searchFor: (q) => { S.q = q; $('#q').value = q; S.status = 'all'; location.hash = '#scaffale'; route(); },
});

/* ---------- navigazione ---------- */

function route() {
  const v = location.hash.slice(1);
  const prev = S.view;
  S.view = VIEWS.includes(v) ? v : 'scaffale';
  $$('[data-view]').forEach((s) => {
    s.hidden = s.dataset.view !== S.view;
    if (!s.hidden && prev && prev !== S.view && !reduced()) { s.classList.remove('enter'); void s.offsetWidth; s.classList.add('enter'); }
  });
  $$('.nav a').forEach((a, i) => {
    if (a.dataset.v === S.view) { a.setAttribute('aria-current', 'page'); $('.nav').style.setProperty('--nav-i', i); }
    else a.removeAttribute('aria-current');
  });
  if (prev && prev !== S.view) scrollTo({ top: 0, behavior: 'instant' });
  tip.hide();
  render();
}

function closeDial() {
  const d = $('.dial'); if (!d) return;
  d.remove(); $('.dial-scrim')?.remove();
  $('#fab').setAttribute('aria-expanded', 'false');
}
function toggleDial() {
  if ($('.dial')) return closeDial();
  const scrim = document.createElement('div'); scrim.className = 'dial-scrim';
  scrim.addEventListener('click', closeDial);
  const d = document.createElement('div'); d.className = 'dial';
  d.innerHTML = `<button data-act="add"><svg class="ic"><use href="#i-plus"/></svg>Un titolo</button><button data-act="bulk"><svg class="ic"><use href="#i-layers"/></svg>Più titoli insieme</button>`;
  document.body.append(scrim, d);
  $('#fab').setAttribute('aria-expanded', 'true');
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; closeDial(); if (b.dataset.act === 'add') openForm(); else openBulk(); });
  $('button', d).focus();
}
document.addEventListener('kiroku:sheet', closeDial);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDial(); });

/* ---------- le chicche: Kuro ---------- */

function mountMascots() {
  // Kuro sulla pila di libri, in testata
  const em = $('#emblem');
  em.innerHTML = kuroPose('books');
  const top = ['Kuro custodisce la tua libreria.', 'Kuro ha scelto il libro più comodo.', 'Prrr…', 'Kuro non si sposta: ci dorme sopra.', 'Mrrrp?', 'Kuro approva i tuoi voti alti.'];
  let taps = [];
  em.addEventListener('click', () => {
    const now = Date.now();
    taps = taps.filter((t) => now - t < 2500); taps.push(now);
    if (!reduced()) $('.k-head', em)?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    if (taps.length >= 5) {
      taps = [];
      prefs.howls = (prefs.howls || 0) + 1; savePrefs();
      toast(prefs.howls === 1 ? 'Kuro fa le fusa: l\'hai conquistato.' : `Kuro fa le fusa (volta numero ${prefs.howls})`);
      confetti({ from: em, n: 40 });
    } else if (taps.length === 1) toast(top[Math.floor(Math.random() * top.length)], { ms: 2000 });
  });

  const k = document.createElement('button');
  k.id = 'kuroPeek'; k.className = 'kuro-peek'; k.setAttribute('aria-label', 'Kuro, il gatto');
  k.innerHTML = kuro();
  document.body.append(k);
  const lines = ['Miao.', 'Prrr…', 'Kuro si è seduto sul tuo manga preferito.', 'Kuro approva i tuoi voti alti.', 'Kuro vuole i croccantini, non consigli.', 'Mrrrp?'];
  k.addEventListener('click', () => {
    if (!reduced()) k.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }], { duration: 560, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    toast(lines[Math.floor(Math.random() * lines.length)], { ms: 1800 });
  });
  // le pupille seguono il dito / il mouse
  addEventListener('pointermove', (e) => {
    for (const box of [k, em]) {
      const r = box.getBoundingClientRect(); if (!r.width) continue;
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 300));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 3)) / 300));
      $$('.k-pupil', box).forEach((p) => { p.style.transform = `translate(${dx * 2.5}px, ${dy * 2}px)`; });
    }
  }, { passive: true });
}

/* ---------- eventi ---------- */

function bind() {
  $('#typetabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-t]'); if (!b || S.type === b.dataset.t) return;
    setType(b.dataset.t);
    if (S.status !== 'all' && S.status !== 'fav' && !S.items.some((i) => inType(i) && i.status === S.status)) S.status = 'all';
    render();
  });
  $('#chips').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; S.status = b.dataset.s; renderChips(); renderShelf(); });
  let qT = null;
  $('#q').addEventListener('input', (e) => { clearTimeout(qT); qT = setTimeout(() => { S.q = e.target.value.trim(); renderShelf(); }, 120); });
  $('#sort').addEventListener('change', (e) => { prefs.sort = e.target.value; savePrefs(); renderShelf(); });
  $('#btnView').addEventListener('click', () => { prefs.view = prefs.view === 'grid' ? 'list' : 'grid'; savePrefs(); renderShelf(); });
  $('#btnPick').addEventListener('click', openPicker);
  $('#btnSettings').addEventListener('click', openSettings);
  $('#fab').addEventListener('click', toggleDial);
  $('#main').addEventListener('click', (e) => {
    const card = e.target.closest('[data-id]');
    if (card) return openDetail(card.dataset.id, card);
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'add') return openForm();
    if (a === 'bulk') return openBulk();
    if (a === 'settings') return openSettings();
    if (a === 'reset') { S.status = 'all'; S.q = ''; $('#q').value = ''; return render(); }
  });
  bindRecs();
  $('#banner').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'banner-off') { prefs.bannerOff = true; savePrefs(); renderBanner(); }
    if (b.dataset.act === 'login') { prefs.localOnly = false; savePrefs(); bus.showGate(); }
    if (b.dataset.act === 'migrate') { const n = await migrateLocalToCloud(); render(); toast(`${n} titoli spostati nel tuo account`); }
  });
  // copertine: dissolvenza quando arrivano
  document.addEventListener('load', (e) => { if (e.target instanceof HTMLImageElement) e.target.classList.add('ok'); }, true);
  // copertina che non si carica: al suo posto quella generata
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.gen) return;
    const it = byId(img.dataset.gen);
    if (it) img.outerHTML = genHTML(it);
  }, true);
  addEventListener('hashchange', route);
  addEventListener('online', syncState);
  addEventListener('offline', syncState);
}

/* ---------- avvio ---------- */

async function afterLogin(user) {
  if (user) await Store.useCloud(user.id);
  else Store.useLocal();
  render();
}

async function boot() {
  applyTheme(prefs.theme);
  bind();
  mountMascots();
  route();
  setTimeout(() => $('#app').classList.remove('boot'), 1800);
  if (cloud.initCloud()) {
    let user = null;
    try { user = await cloud.getSession(); } catch { user = null; }
    if (user) await afterLogin(user);
    else if (prefs.localOnly) await afterLogin(null);
    else { Store.useLocal(); render(); bus.showGate(); }
  } else {
    await afterLogin(null);
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.__kiroku = { S, Store, render };
boot();
