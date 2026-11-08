// Dove vivono i titoli.
//  - modalità "local": solo in questo browser (nessun account)
//  - modalità "cloud": copia locale + sincronizzazione con Supabase.
// Le modifiche si applicano subito in locale e finiscono in una "coda d'uscita" (outbox)
// che viene spedita al server appena c'è connessione: così l'app funziona anche offline.
import { S, bus, byId } from './state.js';
import { LS, sleep } from './util.js';
import { normItem, toDoc } from './types.js';
import * as cloud from './cloud.js';

const LOCAL_KEY = 'kiroku2.local';

export const Store = {
  mode: 'local',
  uid: null,
  outbox: {},          // id -> { op: 'put' | 'del', at }
  flushing: false,
  status: 'idle',      // idle | saving | offline | error
  timers: new Map(),
  retryT: null,

  cacheKey() { return this.mode === 'cloud' ? `kiroku2.cache.${this.uid}` : LOCAL_KEY; },
  outKey() { return `kiroku2.outbox.${this.uid}`; },

  useLocal() {
    this.mode = 'local'; this.uid = null; this.outbox = {};
    S.items = (LS.get(LOCAL_KEY, []) || []).map(normItem);
    S.loaded = true;
    this.setStatus('idle');
  },

  async useCloud(uid) {
    this.mode = 'cloud'; this.uid = uid;
    S.items = (LS.get(this.cacheKey(), []) || []).map(normItem);
    this.outbox = LS.get(this.outKey(), {}) || {};
    S.loaded = S.items.length > 0;
    bus.render();
    cloud.subscribe((p) => this.onRemote(p));
    await this.sync();
    addEventListener('online', () => { this.setStatus('idle'); this.sync(); });
    addEventListener('offline', () => this.setStatus('offline'));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.sync(); });
  },

  persist() {
    const ok = LS.set(this.cacheKey(), S.items.map((i) => ({ ...toDoc(i), id: i.id })));
    if (this.mode === 'cloud') LS.set(this.outKey(), this.outbox);
    return ok;
  },

  setStatus(s) { this.status = s; bus.syncState(); },

  // ---------- modifiche ----------

  save(item) {
    const it = { ...item, updatedAt: Date.now() };
    const i = S.items.findIndex((x) => x.id === it.id);
    if (i >= 0) S.items[i] = it; else S.items.push(it);
    if (S.detail && S.detail.id === it.id) S.detail.shown = it.updatedAt;
    if (this.mode === 'cloud') this.outbox[it.id] = { op: 'put', at: it.updatedAt };
    if (!this.persist() && this.mode === 'local') bus.toast?.('Lo spazio del browser è pieno: accedi con un account per salvare tutto online.');
    this.flushSoon();
    return it;
  },

  // salva dopo una pausa (tocchi ripetuti su "+1")
  saveSoon(item, ms = 600) {
    const i = S.items.findIndex((x) => x.id === item.id);
    if (i >= 0) S.items[i] = { ...item }; else S.items.push({ ...item });
    clearTimeout(this.timers.get(item.id));
    this.timers.set(item.id, setTimeout(() => { this.timers.delete(item.id); const it = byId(item.id); if (it) this.save(it); }, ms));
  },
  flush(id) {
    if (!this.timers.has(id)) return;
    clearTimeout(this.timers.get(id)); this.timers.delete(id);
    const it = byId(id); if (it) this.save(it);
  },

  remove(id) {
    S.items = S.items.filter((x) => x.id !== id);
    clearTimeout(this.timers.get(id)); this.timers.delete(id);
    if (this.mode === 'cloud') this.outbox[id] = { op: 'del', at: Date.now() };
    this.persist();
    this.flushSoon();
  },

  saveMany(list) {
    const now = Date.now();
    list.forEach((it, k) => {
      const x = { ...it, updatedAt: now + k };
      const i = S.items.findIndex((y) => y.id === x.id);
      if (i >= 0) S.items[i] = x; else S.items.push(x);
      if (this.mode === 'cloud') this.outbox[x.id] = { op: 'put', at: x.updatedAt };
    });
    this.persist();
    this.flushSoon(50);
  },

  // ---------- sincronizzazione ----------

  flushSoon(ms = 400) {
    if (this.mode !== 'cloud') return;
    clearTimeout(this._fs);
    this._fs = setTimeout(() => this.flushOutbox(), ms);
  },

  async flushOutbox() {
    if (this.mode !== 'cloud' || this.flushing) return;
    const ids = Object.keys(this.outbox);
    if (!ids.length) { if (this.status === 'saving') this.setStatus('idle'); return; }
    if (!navigator.onLine) { this.setStatus('offline'); return; }
    this.flushing = true;
    this.setStatus('saving');
    try {
      for (const id of ids) {
        const job = this.outbox[id];
        if (!job) continue;
        if (job.op === 'put') {
          const it = byId(id);
          if (it) await cloud.upsertItem(id, toDoc(it), it.updatedAt);
        } else {
          await cloud.deleteItem(id);
        }
        // tolgo dalla coda solo se nel frattempo non è cambiato di nuovo
        if (this.outbox[id] && this.outbox[id].at === job.at) delete this.outbox[id];
        LS.set(this.outKey(), this.outbox);
      }
      this.setStatus('idle');
    } catch (e) {
      console.warn('sync', e);
      this.setStatus(navigator.onLine ? 'error' : 'offline');
      clearTimeout(this.retryT);
      this.retryT = setTimeout(() => this.flushOutbox(), 20000);
    } finally {
      this.flushing = false;
      if (Object.keys(this.outbox).length && this.status === 'idle') this.flushSoon(200);
    }
  },

  async sync() {
    if (this.mode !== 'cloud') return;
    await this.flushOutbox();
    if (!navigator.onLine) { S.loaded = true; bus.render(); return; }
    try {
      const rows = await cloud.pullAll();
      const server = new Map(rows.map((r) => [r.id, r]));
      const next = [];
      for (const r of rows) {
        if (this.outbox[r.id]) {
          const local = byId(r.id);
          if (this.outbox[r.id].op === 'put' && local) next.push(local);
          continue; // cancellato qui ma non ancora sul server
        }
        next.push(normItem({ ...r.data, id: r.id, updatedAt: Date.parse(r.updated_at) || r.data.updatedAt }));
      }
      // titoli creati qui e non ancora arrivati al server
      for (const it of S.items) if (!server.has(it.id) && this.outbox[it.id]?.op === 'put') next.push(it);
      S.items = next;
      S.loaded = true;
      S.note = '';
      this.persist();
      bus.render();
      bus.refreshDetail();
      if (Object.keys(this.outbox).length) this.flushSoon(100);
    } catch (e) {
      console.warn('pull', e);
      S.loaded = true;
      this.setStatus(navigator.onLine ? 'error' : 'offline');
      bus.render();
    }
  },

  // un altro dispositivo ha cambiato qualcosa
  onRemote(p) {
    if (p.eventType === 'DELETE') {
      const id = p.old && p.old.id;
      if (!id || this.outbox[id]) return;
      if (!byId(id)) return;
      S.items = S.items.filter((x) => x.id !== id);
    } else {
      const r = p.new; if (!r || !r.id) return;
      if (this.outbox[r.id] || this.timers.has(r.id)) return;
      const remote = normItem({ ...r.data, id: r.id, updatedAt: Date.parse(r.updated_at) || r.data?.updatedAt });
      const local = byId(r.id);
      if (local && (local.updatedAt || 0) >= remote.updatedAt) return;
      if (local) S.items[S.items.indexOf(local)] = remote; else S.items.push(remote);
    }
    this.persist();
    bus.renderSoon();
    bus.refreshDetail();
  },

  pending() { return Object.keys(this.outbox).length; },
};

// copertina da mostrare
export function coverURL(it) {
  if (it.coverPath) return cloud.coverPublicUrl(it.coverPath);
  return it.coverUrl || it.coverData || null;
}

// sposta i titoli salvati senza account nel tuo account
export async function migrateLocalToCloud() {
  const local = (LS.get(LOCAL_KEY, []) || []).map(normItem);
  if (!local.length) return 0;
  const have = new Set(S.items.map((i) => i.id));
  const list = local.filter((i) => !have.has(i.id));
  Store.saveMany(list);
  LS.set('kiroku2.migrated', true);
  await sleep(10);
  return list.length;
}
export const localCount = () => (LS.get(LOCAL_KEY, []) || []).length;
