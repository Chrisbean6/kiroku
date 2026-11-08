// Aggiunta in blocco, "Cosa inizio?", impostazioni (temi, account, backup, import) e schermata d'accesso.
import { $, $$, esc, norm, sleep, todayISO, fmtSize, LS } from './util.js';
import { TYPES, TYPE_KEYS, ST_ONE, normItem, toDoc } from './types.js';
import { S, bus, prefs, savePrefs, inType } from './state.js';
import { Store, localCount, migrateLocalToCloud } from './store.js';
import * as cloud from './cloud.js';
import { searchOnline } from './sources.js';
import { openSheet } from './sheets.js';
import { cardHTML } from './cards.js';
import { toast, confetti } from './effects.js';
import { sumi, kuro, sumiRaw } from './mascot.js';
import { reduced } from './util.js';

const closeBtn = '<button class="icon-btn" data-x aria-label="Chiudi"><svg class="ic"><use href="#i-close"/></svg></button>';

/* ---------- più titoli insieme ---------- */

export function openBulk() {
  const t0 = S.type !== 'all' ? S.type : 'manga';
  const st = { type: t0, status: 'done' };
  const api = openSheet({
    cls: 't-' + t0, label: 'Aggiungi più titoli',
    html: `<div class="sheet-head"><h2>Più titoli insieme</h2>${closeBtn}</div>
    <p class="hint" style="margin:0 0 14px">Scrivi un titolo per riga. Voti, note e il resto li aggiungi dopo con calma.</p>
    <div class="seg seg-type" role="radiogroup" aria-label="Categoria">${TYPE_KEYS.map((k) => `<button type="button" class="t-${k}" data-v="${k}" role="radio" aria-checked="${k === t0}">${esc(TYPES[k].short || TYPES[k].label)}</button>`).join('')}</div>
    <div class="fld"><span class="fld-label">Stato di tutti</span><div class="seg seg-status" role="radiogroup"></div></div>
    <label class="fld"><span>Titoli</span><textarea name="lines" rows="8" placeholder="Vagabond&#10;Frieren&#10;Il nome della rosa"></textarea></label>
    <label class="toggle bulk-online"><input type="checkbox" name="online" checked>Cerca online copertine e dettagli</label>
    <div class="form-err" role="alert"></div><div class="progress-line" role="status"></div>
    <div class="sheet-actions"><button class="btn primary" data-act="go">Aggiungi</button></div>`,
  });
  const el = api.el;
  const ta = $('textarea', el);
  const lines = () => [...new Set(ta.value.split('\n').map((s) => s.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, '').trim()).filter(Boolean))].slice(0, 300);
  const paint = () => {
    $$('.seg-type button', el).forEach((b) => b.setAttribute('aria-checked', b.dataset.v === st.type));
    el.className = el.className.replace(/\bt-\w+/, 't-' + st.type);
    $('.seg-status', el).innerHTML = ['done', 'ongoing', 'planned', 'paused', 'dropped'].map((s) => `<button type="button" data-s="${s}" role="radio" aria-checked="${st.status === s}">${esc(TYPES[st.type].st[s] || ST_ONE[s])}</button>`).join('');
    $('.bulk-online', el).hidden = st.type === 'fanfic';
    const n = lines().length;
    $('[data-act="go"]', el).textContent = n ? `Aggiungi ${n} ${n === 1 ? 'titolo' : 'titoli'}` : 'Aggiungi';
  };
  paint();
  ta.addEventListener('input', paint);
  $('.seg-type', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { st.type = b.dataset.v; paint(); } });
  $('.seg-status', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { st.status = b.dataset.s; paint(); } });
  let busy = false, stop = false;
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-x]')) { stop = true; return api.close(); }
    const b = e.target.closest('[data-act="go"]'); if (!b || busy) return;
    const err = $('.form-err', el), prog = $('.progress-line', el);
    err.textContent = '';
    const all = lines();
    if (!all.length) { err.textContent = 'Scrivi almeno un titolo.'; ta.focus(); return; }
    const exists = new Set(S.items.filter((i) => i.type === st.type).map((i) => norm(i.title)));
    const titles = all.filter((t) => !exists.has(norm(t)));
    const skipped = all.length - titles.length;
    if (!titles.length) { err.textContent = 'Sono già tutti nel tuo scaffale.'; return; }
    busy = true; b.disabled = true;
    const base = Date.now();
    const items = titles.map((t, i) => normItem({ type: st.type, status: st.status, title: t, createdAt: base - i }));
    if (st.type !== 'fanfic' && $('[name="online"]', el).checked) {
      let found = 0;
      for (let i = 0; i < items.length && !stop; i++) {
        prog.textContent = `Cerco online ${i + 1} di ${items.length}: ${items[i].title}`;
        try {
          const res = await searchOnline(st.type, items[i].title);
          const c = res[0];
          if (c) {
            found++;
            items[i] = normItem({ ...items[i], ...Object.fromEntries(Object.entries(c).filter(([k, v]) => v != null && v !== '' && !['title', 'source', 'note', 'nsfwCover'].includes(k))), title: c.title || items[i].title, coverUrl: c.nsfwCover ? null : c.coverUrl });
          }
        } catch { prog.textContent = 'Sono offline: aggiungo i titoli senza dettagli.'; await sleep(900); break; }
        await sleep(350);
      }
      if (stop) return;
      prog.textContent = `Trovati online: ${found} su ${items.length}.`;
    }
    Store.saveMany(items);
    api.close();
    bus.setType(st.type);
    S.status = 'all';
    location.hash = '#scaffale';
    bus.render();
    toast(`${items.length} ${items.length === 1 ? 'titolo aggiunto' : 'titoli aggiunti'}${skipped ? `, ${skipped} già presenti` : ''}`);
    confetti({ n: 60 });
  });
  setTimeout(() => ta.focus({ preventScroll: true }), 350);
}

/* ---------- Cosa inizio? ---------- */

export function openPicker() {
  const scope = S.type === 'all' ? 'titoli' : TYPES[S.type].plural;
  let withPaused = false;
  const pool = () => S.items.filter(inType).filter((i) => i.status === 'planned' || (withPaused && i.status === 'paused'));
  const api = openSheet({
    label: 'Cosa inizio?',
    html: `<div class="sheet-head"><h2>Cosa inizio?</h2>${closeBtn}</div>
      <div class="picker"><div class="opts"><label class="toggle" style="margin:0"><input type="checkbox" name="paused">Anche quelli in pausa</label></div><div class="picker-body"></div></div>`,
  });
  const el = api.el;
  const body = $('.picker-body', el);
  let timer = null, current = null;
  function spin() {
    clearTimeout(timer);
    const p = pool();
    if (!p.length) {
      body.innerHTML = `<div class="mascot" style="width:120px;margin-top:16px">${kuro()}</div><p style="color:var(--ink-2);max-width:32ch;margin:10px auto 6px">Kuro ha cercato dappertutto: non hai ${esc(scope)} da iniziare. Segnane qualcuno come "da iniziare" e torna qui.</p>`;
      return;
    }
    body.innerHTML = `<div class="picker-stage"><div class="slot"></div></div><div class="picker-acts" style="display:flex;gap:10px;justify-content:center;min-height:48px;flex-wrap:wrap"></div>`;
    const slot = $('.slot', body);
    const show = (it, last) => { slot.innerHTML = cardHTML(it); const c = $('.card', slot); if (last) c.classList.add('landed'); else if (!reduced()) c.classList.add('flip'); };
    const land = () => {
      show(current, true);
      $('.picker-stage', body).insertAdjacentHTML('afterbegin', `<span class="picked-stamp">Questo!</span>`);
      confetti({ from: $('.picker-stage', body), n: 45 });
      $('.picker-acts', body).innerHTML = `<button class="btn primary t-${current.type}" data-act="start"><svg class="ic"><use href="#i-play"/></svg>Inizio questo</button><button class="btn ghost" data-act="again">Gira ancora</button>`;
    };
    if (reduced() || p.length === 1) { current = p[Math.floor(Math.random() * p.length)]; return land(); }
    let delay = 55, prev = null, steps = 0;
    const final = p[Math.floor(Math.random() * p.length)];
    const tick = () => {
      if (!document.contains(el)) return;
      steps++;
      if (delay > 330 && steps > 8) { current = final; return land(); }
      let it; do { it = p[Math.floor(Math.random() * p.length)]; } while (p.length > 1 && it === prev);
      prev = it; show(it, false);
      delay *= 1.14;
      timer = setTimeout(tick, delay);
    };
    tick();
  }
  el.addEventListener('change', (e) => { if (e.target.name === 'paused') { withPaused = e.target.checked; spin(); } });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-x]')) { clearTimeout(timer); return api.close(); }
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'again') return spin();
    if (b.dataset.act === 'start' && current) {
      Store.save({ ...current, status: 'ongoing', start: current.start || todayISO() });
      clearTimeout(timer); api.close(); bus.render();
      toast(TYPES[current.type].cheer);
    }
  });
  spin();
}

/* ---------- temi ---------- */

export const THEMES = [
  ['inchiostro', 'Inchiostro', '#140B0C', '#8E0A0A', '#C8141F', '#F3E7E4', '"Yuji Syuku"'],
  ['cipria', 'Bordeaux e cipria', '#F7EEF0', '#7B1E33', '#E6A7B4', '#33101A', '"Shippori Mincho B1"'],
  ['ardesia', 'Bordeaux e ardesia', '#E8EBF0', '#7A1F35', '#7F93AF', '#241318', '"Shippori Mincho B1"'],
  ['salvia', 'Bordeaux e salvia', '#EDF0E8', '#74182B', '#8DA47E', '#2A1418', '"Zen Old Mincho"'],
  ['notte', 'Bordeaux notte', '#1A0D12', '#7A2238', '#D4677F', '#F4E6EA', '"Shippori Mincho B1"'],
  ['riso', 'Risograph', '#EEECF4', '#3B5BDB', '#F0428F', '#1D1A33', '"Dela Gothic One"'],
  ['riso-dark', 'Risograph notte', '#17142A', '#5B7BF0', '#F0428F', '#EEECF4', '"Dela Gothic One"'],
];

export function applyTheme(name) {
  document.documentElement.dataset.theme = name;
  const t = THEMES.find((x) => x[0] === name);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && t) meta.content = name === 'inchiostro' ? '#8E0A0A' : t[2];
}

/* ---------- impostazioni ---------- */

let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });

const MAL_ST = { watching: 'ongoing', reading: 'ongoing', completed: 'done', 'on-hold': 'paused', dropped: 'dropped', 'plan to watch': 'planned', 'plan to read': 'planned', 1: 'ongoing', 2: 'done', 3: 'paused', 4: 'dropped', 6: 'planned' };
async function readMAL(file) {
  let text;
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  if (head[0] === 0x1f && head[1] === 0x8b) {
    if (!('DecompressionStream' in window)) throw new Error('Questo browser non apre i file .gz: estrai prima il file .xml.');
    text = await new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text();
  } else text = await file.text();
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror') || !doc.getElementsByTagName('myanimelist').length) throw new Error('Non sembra un export di MyAnimeList.');
  const g = (n, tag) => (n.getElementsByTagName(tag)[0]?.textContent || '').trim();
  const d = (s) => { if (!s || s.startsWith('0000')) return null; const [y, m, dd] = s.split('-'); if (m === '00') return null; return `${y}-${m}-${dd === '00' ? '01' : dd}`; };
  const n = (s) => { const k = Number(s); return Number.isFinite(k) && k > 0 ? k : null; };
  const out = []; const base = Date.now();
  for (const a of doc.getElementsByTagName('anime')) {
    const title = g(a, 'series_title'); if (!title) continue;
    out.push(normItem({ type: 'anime', title, total: n(g(a, 'series_episodes')), progress: n(g(a, 'my_watched_episodes')), score: n(g(a, 'my_score')) || 0, status: MAL_ST[g(a, 'my_status').toLowerCase()] || 'done', start: d(g(a, 'my_start_date')), end: d(g(a, 'my_finish_date')), rewatch: n(g(a, 'my_times_watched')) || 0, notes: g(a, 'my_comments'), links: [{ url: `https://myanimelist.net/anime/${g(a, 'series_animedb_id')}` }], createdAt: base - out.length }));
  }
  for (const m of doc.getElementsByTagName('manga')) {
    const title = g(m, 'manga_title'); if (!title) continue;
    const ch = n(g(m, 'manga_chapters')), rch = n(g(m, 'my_read_chapters')), vol = n(g(m, 'manga_volumes')), rvol = n(g(m, 'my_read_volumes'));
    const useVol = !ch && !rch && (vol || rvol);
    out.push(normItem({ type: 'manga', title, unit: useVol ? 'vol' : 'cap', total: useVol ? vol : ch, progress: useVol ? rvol : rch, score: n(g(m, 'my_score')) || 0, status: MAL_ST[g(m, 'my_status').toLowerCase()] || 'done', start: d(g(m, 'my_start_date')), end: d(g(m, 'my_finish_date')), rewatch: n(g(m, 'my_times_read')) || 0, notes: g(m, 'my_comments'), links: [{ url: `https://myanimelist.net/manga/${g(m, 'manga_mangadb_id')}` }], createdAt: base - out.length }));
  }
  return out;
}

export function exportJSON() {
  return JSON.stringify({ app: 'kiroku', version: 2, exportedAt: new Date().toISOString(), items: S.items.map((i) => ({ id: i.id, ...toDoc(i) })) }, null, 1);
}

export function openSettings() {
  const user = cloud.currentUser();
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const api = openSheet({
    label: 'Impostazioni',
    html: `
    <div class="sheet-head"><h2>Impostazioni</h2>${closeBtn}</div>
    <div class="set-group"><h3>Tema</h3><p>Prova le bozze: cambiano al volo.</p>
      <div class="themes" role="radiogroup" aria-label="Tema">${THEMES.map(([k, l, p, a, a2, ink, font]) => `<button class="theme-card" role="radio" aria-checked="${prefs.theme === k}" data-th="${k}" style="--tp:${p};--ti:${ink};--tf:${font}">
        <span class="sw"><i style="background:${a}"></i><i style="background:${a2}"></i><i style="background:${p}"></i></span>
        <span class="ttxt">記録</span><b>${esc(l)}</b></button>`).join('')}</div></div>
    <div class="set-group"><h3>Account e sincronizzazione</h3>
      ${user ? `<p>Collegato come <b>${esc(user.email)}</b>. I titoli si sincronizzano tra telefono e PC.<span class="usage"></span></p>
        <div class="set-btns"><button class="btn small ghost" data-act="sync"><svg class="ic"><use href="#i-cloud"/></svg>Sincronizza ora</button><button class="btn small ghost" data-act="logout">Esci</button></div>`
        : cloud.cloudReady() ? `<p>Stai usando Kiroku senza account: i titoli restano solo su questo dispositivo.</p><div class="set-btns"><button class="btn small accent" data-act="login">Accedi o crea l'account</button></div>`
        : `<p>Sincronizzazione non configurata: i titoli restano su questo dispositivo.</p>`}</div>
    ${standalone ? '' : `<div class="set-group"><h3>Installa l'app</h3>
      ${installEvt ? `<p>Kiroku diventa un'icona sulla schermata home e si apre a schermo intero.</p><div class="set-btns"><button class="btn small accent" data-act="install">Installa</button></div>`
        : iOS ? `<p>Su iPhone: apri questa pagina in Safari, tocca il tasto Condividi e poi "Aggiungi alla schermata Home".</p>`
        : `<p>Su Android: dal menu di Chrome (i tre puntini) scegli "Installa app" o "Aggiungi a schermata Home". Sul PC c'è l'icona di installazione nella barra degli indirizzi.</p>`}</div>`}
    <div class="set-group"><h3>Aggiungi più titoli insieme</h3><p>Incolla una lista, uno per riga.</p><div class="set-btns"><button class="btn small ghost" data-act="bulk">Apri</button></div></div>
    <div class="set-group"><h3>Backup</h3>
      <p>Un file con tutti i tuoi titoli, voti, tag e note. Le immagini e gli EPUB restano nel tuo spazio online.</p>
      <div class="set-btns">
        <button class="btn small ink" data-act="export"><svg class="ic"><use href="#i-download"/></svg>Scarica backup</button>
        <button class="btn small ghost" data-act="copy">Mostra e copia</button>
        <label class="btn small ghost"><svg class="ic"><use href="#i-upload"/></svg>Carica backup<input type="file" accept=".json,application/json" class="sr-only" name="json"></label>
      </div><div class="copy-slot"></div><div class="progress-line" data-slot="json" role="status"></div>
      <p class="hint" style="margin:10px 0 0">Funziona anche col backup della prima versione di Kiroku (quella dentro Claude).</p></div>
    <div class="set-group"><h3>Importa da MyAnimeList</h3>
      <p>Scarica l'export della tua lista anime o manga dalla pagina <a href="https://myanimelist.net/panel.php?go=export" target="_blank" rel="noopener">Export</a> di MyAnimeList e caricalo qui (.xml o .xml.gz).</p>
      <div class="set-btns"><label class="btn small ghost"><svg class="ic"><use href="#i-upload"/></svg>Scegli il file<input type="file" accept=".xml,.gz,application/xml,text/xml,application/gzip" class="sr-only" name="mal"></label></div>
      <div class="progress-line" data-slot="mal" role="status"></div></div>
    <div class="set-group" style="text-align:center;color:var(--ink-3);font-size:13px"><div class="mascot" style="width:90px">${sumiRaw('read')}</div>Kiroku 記録, versione 2. Sumi ti saluta.</div>`,
  });
  const el = api.el;
  if (user) cloud.storageUsage().then((b) => { const u = $('.usage', el); if (u && b) u.textContent = ` Spazio usato per immagini e file: ${fmtSize(b)} su 1 GB.`; }).catch(() => {});
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-x]')) return api.close();
    const t = e.target.closest('[data-th]');
    if (t) {
      prefs.theme = t.dataset.th; savePrefs(); applyTheme(prefs.theme);
      $$('[data-th]', el).forEach((b) => b.setAttribute('aria-checked', b === t));
      return;
    }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'bulk') { api.close(); return setTimeout(openBulk, 120); }
    if (act === 'install' && installEvt) { installEvt.prompt(); installEvt = null; return; }
    if (act === 'sync') { b.disabled = true; await Store.sync(); b.disabled = false; toast(Store.pending() ? 'Alcune modifiche aspettano la connessione' : 'Tutto sincronizzato'); return; }
    if (act === 'logout') { await cloud.signOut(); location.reload(); return; }
    if (act === 'login') { prefs.localOnly = false; savePrefs(); api.close(); return bus.showGate(); }
    if (act === 'export') {
      const blob = new Blob([exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `kiroku-backup-${todayISO()}.json`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return toast('Backup scaricato');
    }
    if (act === 'copy') {
      const slot = $('.copy-slot', el);
      slot.innerHTML = `<textarea readonly aria-label="Backup in formato JSON"></textarea><div class="set-btns" style="margin-top:8px"><button class="btn small ink" data-act="clip">Copia</button></div>`;
      $('textarea', slot).value = exportJSON();
    }
    if (act === 'clip') {
      const ta = $('.copy-slot textarea', el);
      try { await navigator.clipboard.writeText(ta.value); toast('Backup copiato'); } catch { ta.select(); toast('Selezionato: copialo a mano.'); }
    }
  });
  el.addEventListener('change', async (e) => {
    const inp = e.target;
    if (inp.name !== 'json' && inp.name !== 'mal') return;
    const file = inp.files[0]; inp.value = '';
    if (!file) return;
    const line = $(`[data-slot="${inp.name}"]`, el);
    line.textContent = 'Leggo il file…';
    try {
      let incoming;
      if (inp.name === 'mal') incoming = await readMAL(file);
      else {
        const data = JSON.parse(await file.text());
        const arr = Array.isArray(data) ? data : data.items;
        if (!Array.isArray(arr)) throw new Error('Non è un backup di Kiroku.');
        // la prima versione salvava le copertine con id di Claude: quelli non servono più
        incoming = arr.filter((x) => x && x.title).map((x) => normItem({ ...x, cover: undefined }));
      }
      const byKey = new Set(S.items.map((i) => i.type + '|' + norm(i.title)));
      const ids = new Map(S.items.map((i) => [i.id, i]));
      const toSave = []; let skipped = 0;
      for (const it of incoming) {
        const cur = ids.get(it.id);
        if (cur) { if ((it.updatedAt || 0) > (cur.updatedAt || 0)) toSave.push(it); else skipped++; continue; }
        if (byKey.has(it.type + '|' + norm(it.title))) { skipped++; continue; }
        toSave.push(it);
      }
      if (!toSave.length) { line.textContent = `Niente di nuovo da importare${skipped ? `: ${skipped} titoli erano già presenti` : ''}.`; return; }
      Store.saveMany(toSave);
      line.textContent = `Fatto: ${toSave.length} titoli importati${skipped ? `, ${skipped} già presenti` : ''}.`;
      bus.render();
      confetti({ n: 80 });
    } catch (ex) {
      line.textContent = ex && ex.message && !/JSON|Unexpected/.test(ex.message) ? ex.message : 'Non riesco a leggere questo file.';
    }
  });
}

/* ---------- schermata d'accesso ---------- */

export function renderGate(onDone) {
  const gate = $('#gate');
  gate.hidden = false;
  let mode = LS.get('kiroku2.hadAccount', false) ? 'in' : 'up';
  const paint = (msg = '') => {
    gate.innerHTML = `<div class="gate">${sumi('read', 'bob')}<h1>Kiroku</h1>
      <p>${mode === 'in' ? 'Bentornato. Accedi per ritrovare il tuo scaffale su questo dispositivo.' : 'Crea il tuo account: così telefono e PC restano sincronizzati.'}</p>
      <form novalidate>
        <label class="fld"><span>Email</span><input name="email" type="email" autocomplete="email" inputmode="email" required></label>
        <label class="fld"><span>Password</span><input name="pw" type="password" autocomplete="${mode === 'in' ? 'current-password' : 'new-password'}" minlength="6" required></label>
        <div class="form-err" role="alert">${esc(msg)}</div>
        <button class="btn accent" type="submit">${mode === 'in' ? 'Accedi' : 'Crea l\'account'}</button>
      </form>
      <div class="alt"><button class="link-btn" data-g="switch">${mode === 'in' ? 'Non hai un account? Crealo' : 'Hai già un account? Accedi'}</button>
      <button class="link-btn" data-g="local">Usa senza account, solo su questo dispositivo</button></div></div>`;
    $('form', gate).addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = e.target.email.value.trim(), pw = e.target.pw.value;
      const err = $('.form-err', gate);
      if (!email || !pw) { err.textContent = 'Scrivi email e password.'; return; }
      const btn = $('button[type="submit"]', gate); btn.disabled = true;
      try {
        if (mode === 'in') await cloud.signIn(email, pw);
        else {
          const r = await cloud.signUp(email, pw);
          if (r.needConfirm) { mode = 'in'; paint('Ti ho mandato un\'email: conferma l\'indirizzo, poi accedi qui.'); return; }
        }
        LS.set('kiroku2.hadAccount', true);
        gate.hidden = true; gate.innerHTML = '';
        onDone(cloud.currentUser());
      } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
    });
  };
  gate.onclick = (e) => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    if (b.dataset.g === 'switch') { mode = mode === 'in' ? 'up' : 'in'; paint(); }
    if (b.dataset.g === 'local') { prefs.localOnly = true; savePrefs(); gate.hidden = true; gate.innerHTML = ''; onDone(null); }
  };
  paint();
}

export { localCount, migrateLocalToCloud };
