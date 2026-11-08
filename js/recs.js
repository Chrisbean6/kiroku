// "Per te": consigli dalla community AniList, dalla tua lista "da iniziare" e tramite Claude.
import { $, esc, norm, nf1, LS } from './util.js';
import { TYPES, TYPE_KEYS, normItem } from './types.js';
import { S, bus, inType } from './state.js';
import { Store } from './store.js';
import { anilistRecs } from './sources.js';
import { genHTML, cardHTML } from './cards.js';
import { sumi } from './mascot.js';
import { toast } from './effects.js';
import { sortItems } from './views.js';

const known = (type, title) => S.items.some((x) => x.type === type && norm(x.title) === norm(title));

function recCard(r, i, key) {
  const T = TYPES[r.type] || TYPES.manga;
  const have = known(r.type, r.title);
  const cov = r.coverUrl ? `<img src="${esc(r.coverUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : genHTML({ ...r, id: 'rec' + i });
  return `<article class="rec t-${r.type}" style="--i:${i}"><span class="cover ${T.square ? 'sq' : ''}">${cov}</span><div>` +
    `<span class="type-pill"><span class="jp">${T.jp}</span>${esc(T.label)}</span>` +
    `<h3>${esc(r.title)}</h3><p class="by">${esc([r.author, r.year].filter(Boolean).join(', '))}</p>` +
    (r.why ? `<p class="why">${esc(r.why)}</p>` : '') +
    (have ? `<span class="added"><svg class="ic" style="width:18px;height:18px"><use href="#i-check"/></svg>Nello scaffale</span>`
      : `<button class="btn small primary" data-addrec="${key}:${i}"><svg class="ic"><use href="#i-plus"/></svg>${esc(T.st.planned)}</button>`) +
    `</div></article>`;
}

/* ---------- 1. community AniList ---------- */

async function loadCommunity() {
  const seeds = sortItems(S.items.filter((i) => (i.type === 'manga' || i.type === 'anime') && i.src?.k === 'anilist' && (i.score >= 8 || i.fav) && inType(i)), 'score').slice(0, 10)
    .map((i) => ({ id: i.src.id, score: i.score || 8, title: i.title }));
  const key = S.type;
  if (!seeds.length) { S.recs.al = { key, list: [], empty: true }; return; }
  S.recs.al = { key, busy: true }; renderRecs();
  try {
    const mine = new Set(S.items.filter((i) => i.src?.k === 'anilist').map((i) => i.src.id));
    const list = (await anilistRecs(seeds)).filter((r) => !mine.has(r.src.id) && !known(r.type, r.title)).slice(0, 10)
      .map((r) => ({ ...r, why: `Piace a chi ha amato ${r.because.slice(0, 2).join(' e ')}.` }));
    S.recs.al = { key, list, at: Date.now() };
  } catch {
    S.recs.al = { key, error: 'Non riesco a raggiungere AniList: sei online?' };
  }
  renderRecs();
}

/* ---------- 2. dalla tua lista ---------- */

function fromYourList() {
  const rated = S.items.filter((i) => i.score > 0);
  if (rated.length < 3) return [];
  const avg = rated.reduce((a, b) => a + b.score, 0) / rated.length;
  const aff = new Map();
  for (const i of rated) for (const t of [...i.tags, ...i.genres]) { const o = aff.get(t) || { s: 0, n: 0 }; o.s += i.score - avg; o.n++; aff.set(t, o); }
  const scoreOf = (it) => [...it.tags, ...it.genres].reduce((a, t) => { const o = aff.get(t); return a + (o ? o.s / o.n * Math.min(o.n, 4) : 0); }, 0) + (it.fav ? 1 : 0);
  return S.items.filter((i) => i.status === 'planned' && inType(i)).map((i) => ({ it: i, s: scoreOf(i) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8);
}

/* ---------- 3. Claude ---------- */

const TYPE_WORDS = { manga: 'manga', anime: 'anime', vn: 'visual novel', book: 'libro', film: 'film', fanfic: 'fanfiction', game: 'videogioco', album: 'album' };
function parseType(w) {
  const x = norm(w);
  if (/visual|vn/.test(x)) return 'vn';
  if (/fanfic/.test(x)) return 'fanfic';
  if (/videogio|gioco|game/.test(x)) return 'game';
  if (/album|disco|musica/.test(x)) return 'album';
  if (/libro|romanzo|book|novel/.test(x)) return 'book';
  if (/film|movie/.test(x)) return 'film';
  if (/anime/.test(x)) return 'anime';
  if (/manga|manhwa/.test(x)) return 'manga';
  return null;
}

export function claudePrompt(mood) {
  const line = (i) => `- ${i.title} (${TYPE_WORDS[i.type]}${i.score ? `, ${String(i.score).replace('.', ',')}/10` : ''}${i.fav ? ', preferito' : ''}${i.tags.length ? `, ${i.tags.slice(0, 3).join('/')}` : ''})`;
  const liked = sortItems(S.items.filter((i) => i.score >= 7.5 || i.fav), 'score');
  const disliked = S.items.filter((i) => i.score > 0 && i.score <= 5).slice(0, 8);
  const want = S.type === 'all' ? 'titoli di qualsiasi tipo (manga, anime, visual novel, libri, film, fanfiction, videogiochi, album)' : TYPES[S.type].plural;
  const build = (nLiked, nKnown) => `Ciao Claude! Uso un'app per tenere traccia di quello che leggo, guardo, gioco e ascolto. Mi consigli 8 ${want} nuovi che probabilmente mi piaceranno?\n\n` +
    (liked.length ? `Cose che ho amato:\n${liked.slice(0, nLiked).map(line).join('\n')}\n\n` : '') +
    (disliked.length ? `Cose che non mi sono piaciute:\n${disliked.map(line).join('\n')}\n\n` : '') +
    (mood ? `In questo momento ho voglia di: ${mood}\n\n` : '') +
    (nKnown ? `Li conosco già, non consigliarmeli: ${S.items.slice(0, nKnown).map((i) => i.title).join('; ')}\n\n` : '') +
    `Rispondi con un titolo per riga, esattamente in questo formato (così li incollo nell'app):\nTitolo | tipo | autore o studio | anno | perché fa per me (una frase)\nDove "tipo" è uno tra: manga, anime, visual novel, libro, film, fanfiction, videogioco, album.`;
  let nLiked = 30, nKnown = Math.min(S.items.length, 150);
  let p = build(nLiked, nKnown);
  while (encodeURIComponent(p).length > 7000 && (nKnown > 0 || nLiked > 8)) { if (nKnown > 0) nKnown = Math.max(0, nKnown - 25); else nLiked -= 4; p = build(nLiked, nKnown); }
  return p;
}

export function parseClaude(text) {
  const out = [];
  for (let raw of String(text).split('\n')) {
    raw = raw.trim().replace(/^[-*•\d.)\s]+/, '').replace(/^\|/, '').replace(/\|$/, '').replace(/\*\*/g, '');
    if (!raw.includes('|')) continue;
    const p = raw.split('|').map((s) => s.trim());
    if (p.length < 2 || /^-+$/.test(p[0]) || /^titolo$/i.test(p[0])) continue;
    const type = parseType(p[1]);
    if (!type || !p[0]) continue;
    out.push({ title: p[0].slice(0, 200), type, author: (p[2] || '').slice(0, 160), year: Number((p[3] || '').match(/\d{4}/)?.[0]) || null, why: (p.slice(4).join(' | ') || '').slice(0, 400) });
  }
  return out.slice(0, 20);
}

/* ---------- vista ---------- */

export function renderRecs() {
  const box = $('#recsBox');
  const what = S.type === 'all' ? 'titoli' : TYPES[S.type].plural;
  const al = S.recs.al;
  const alOk = al && al.key === S.type;
  let alHTML;
  if (!['all', 'manga', 'anime'].includes(S.type)) alHTML = '';
  else if (!alOk) alHTML = `<button class="btn small accent" data-recs="al"><svg class="ic"><use href="#i-sparkle"/></svg>Cerca consigli</button>`;
  else if (al.busy) alHTML = `<div class="thinking">${sumi('think')}<p>Sumi sta chiedendo in giro…</p></div>`;
  else if (al.error) alHTML = `<p class="hint" style="margin:8px 0">${esc(al.error)}</p><button class="btn small ghost" data-recs="al">Riprova</button>`;
  else if (al.empty) alHTML = `<p class="hint" style="margin:8px 0">Mi servono manga o anime che hai votato almeno 8, cercati online con "Cerca online" (così so quali sono su AniList).</p>`;
  else alHTML = al.list.length ? `<div class="recs">${al.list.map((r, i) => recCard(r, i, 'al')).join('')}</div><button class="btn small ghost" data-recs="al">Aggiorna</button>` : `<p class="hint">Niente di nuovo da proporre: hai già visto tutto!</p>`;

  const yours = fromYourList();
  const cl = S.recs.claude;
  box.innerHTML =
    (alHTML ? `<h3 class="section-title">Dalla community</h3><p class="section-sub">Anime e manga amati da chi ha amato i tuoi preferiti (dati di AniList).</p>${alHTML}` : '') +
    `<h3 class="section-title">Dalla tua lista "da iniziare"</h3><p class="section-sub">Quelli che hai già in lista, ordinati per quanto somigliano ai tuoi gusti.</p>` +
    (yours.length ? `<div class="cover-row" style="margin-top:10px">${yours.map((x) => cardHTML(x.it)).join('')}</div>` : `<p class="hint" style="margin:8px 0 0">Vota qualche titolo e segnane altri come "da iniziare": qui comparirà l'ordine giusto per affrontarli.</p>`) +
    `<div class="claude-box"><h3>Chiedi a Claude</h3><p>Apro Claude con un messaggio già scritto con i tuoi gusti. Poi incolla qui la risposta e aggiungi i consigli con un tocco.</p>` +
    `<label class="fld"><span>Che voglia hai? (facoltativo)</span><input id="mood" placeholder="es. qualcosa di corto e malinconico" autocomplete="off" value="${esc(LS.get('kiroku2.mood', ''))}"></label>` +
    `<div class="btns"><a class="btn small accent" id="askClaude" href="#" target="_blank" rel="noopener"><svg class="ic"><use href="#i-sparkle"/></svg>Apri Claude con ${esc(what)}</a><button class="btn small ghost" data-recs="copy"><svg class="ic"><use href="#i-copy"/></svg>Copia il messaggio</button></div>` +
    `<label class="fld" style="margin-top:12px"><span>Incolla qui la risposta di Claude</span><textarea id="claudeReply" placeholder="Titolo | tipo | autore | anno | perché"></textarea></label>` +
    `<button class="btn small ink" data-recs="parse">Mostra i consigli</button>` +
    (cl ? (cl.list.length ? `<div class="recs">${cl.list.map((r, i) => recCard(r, i, 'claude')).join('')}</div>` : `<p class="hint" style="margin:10px 0 0">Non trovo righe nel formato giusto. Controlla che ogni consiglio sia "Titolo | tipo | autore | anno | perché".</p>`) : '') +
    `</div><div style="height:150px"></div>`;
  updateClaudeLink();
}

function updateClaudeLink() {
  const a = $('#askClaude'); if (!a) return;
  const mood = ($('#mood')?.value || '').trim();
  a.href = 'https://claude.ai/new?q=' + encodeURIComponent(claudePrompt(mood));
}

export function bindRecs() {
  const box = $('#recsBox');
  box.addEventListener('input', (e) => { if (e.target.id === 'mood') { LS.set('kiroku2.mood', e.target.value); updateClaudeLink(); } });
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-recs], [data-addrec]'); if (!b) return;
    if (b.dataset.recs === 'al') return loadCommunity();
    if (b.dataset.recs === 'copy') {
      try { await navigator.clipboard.writeText(claudePrompt(($('#mood')?.value || '').trim())); toast('Messaggio copiato: incollalo in Claude'); }
      catch { toast('Non riesco a copiare: usa "Apri Claude".'); }
      return;
    }
    if (b.dataset.recs === 'parse') {
      S.recs.claude = { list: parseClaude($('#claudeReply').value) };
      const reply = $('#claudeReply').value;
      renderRecs();
      $('#claudeReply').value = reply;
      return;
    }
    if (b.dataset.addrec) {
      const [key, i] = b.dataset.addrec.split(':');
      const r = (key === 'al' ? S.recs.al?.list : S.recs.claude?.list)?.[Number(i)]; if (!r) return;
      const it = normItem({ ...r, status: 'planned', id: undefined, notes: r.why ? `Consigliato: ${r.why}` : '' });
      Store.save(it);
      toast(`Aggiunto a "${TYPES[r.type].st.planned}"`);
      b.outerHTML = `<span class="added"><svg class="ic" style="width:18px;height:18px"><use href="#i-check"/></svg>Nello scaffale</span>`;
      bus.renderHeader();
    }
  });
}
