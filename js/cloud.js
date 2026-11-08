// Collegamento a Supabase: accesso, titoli, file.
// Se config.js è vuoto o la libreria non c'è, tutto resta in locale.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { newId } from './util.js';

let sb = null;          // client Supabase
let user = null;        // utente collegato
let channel = null;     // canale realtime

export const cloudReady = () => !!sb;
export const currentUser = () => user;

export function initCloud() {
  if (!SUPABASE_URL || !SUPABASE_KEY || !window.supabase) return false;
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'kiroku2.auth' },
  });
  return true;
}

export async function getSession() {
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  user = data.session?.user || null;
  return user;
}

export function onAuth(cb) {
  if (!sb) return;
  sb.auth.onAuthStateChange((_ev, session) => { user = session?.user || null; cb(user); });
}

// messaggi d'errore di Supabase tradotti in italiano
function authMsg(e) {
  const m = String(e?.message || e || '');
  if (/invalid login credentials/i.test(m)) return 'Email o password sbagliate.';
  if (/already registered|already exists/i.test(m)) return 'Esiste già un account con questa email: accedi.';
  if (/password should be at least/i.test(m)) return 'La password deve avere almeno 6 caratteri.';
  if (/email not confirmed/i.test(m)) return 'Devi prima confermare l\'email: controlla la posta.';
  if (/signups not allowed|signup is disabled/i.test(m)) return 'Le iscrizioni sono chiuse: accedi con l\'account che hai già.';
  if (/rate limit/i.test(m)) return 'Troppi tentativi: aspetta qualche minuto.';
  if (/fetch|network/i.test(m)) return 'Nessuna connessione: riprova quando sei online.';
  return m || 'Qualcosa non va. Riprova.';
}

export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(authMsg(error));
  user = data.user; return user;
}
export async function signUp(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) throw new Error(authMsg(error));
  if (!data.session) return { needConfirm: true };
  user = data.user; return { user };
}
export async function signOut() {
  if (channel) { sb.removeChannel(channel); channel = null; }
  await sb.auth.signOut();
  user = null;
}

/* ---------- titoli ---------- */

// tutti i titoli dal server
export async function pullAll() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('items').select('id,data,updated_at').order('id').range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

export async function upsertItem(id, data, updatedAt) {
  const { error } = await sb.from('items').upsert({ id, user_id: user.id, data, updated_at: new Date(updatedAt).toISOString() });
  if (error) throw error;
}
export async function deleteItem(id) {
  const { error } = await sb.from('items').delete().eq('id', id);
  if (error) throw error;
}

// aggiornamenti in tempo reale (es. modifichi dal telefono, il PC si aggiorna)
export function subscribe(onChange) {
  if (channel) sb.removeChannel(channel);
  channel = sb.channel('items-' + user.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` }, (p) => onChange(p))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'items' }, (p) => onChange(p))
    .subscribe();
}

/* ---------- file ----------
   covers  = bucket pubblico (copertine caricate: niente di privato, e così si vedono anche offline)
   files   = bucket privato (fan art, EPUB e altri file: si aprono con link temporanei) */

function ext(name, type) {
  const m = /\.([a-z0-9]{1,6})$/i.exec(name || '');
  if (m) return m[1].toLowerCase();
  return ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'application/epub+zip': 'epub', 'application/pdf': 'pdf' })[type] || 'bin';
}

export async function uploadCover(blob) {
  const path = `${user.id}/${newId()}.${ext('', blob.type)}`;
  const { error } = await sb.storage.from('covers').upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return path;
}
export const coverPublicUrl = (path) => `${SUPABASE_URL}/storage/v1/object/public/covers/${path}`;

export async function uploadFile(itemId, blob, name, onProgress) {
  const safe = (name || 'file').normalize('NFD').replace(/[^\w.\-]+/g, '_').slice(-80);
  const path = `${user.id}/${itemId}/${newId().slice(0, 8)}-${safe}`;
  onProgress && onProgress(0);
  const { error } = await sb.storage.from('files').upload(path, blob, { contentType: blob.type || 'application/octet-stream', upsert: false });
  if (error) throw error;
  onProgress && onProgress(1);
  return path;
}

// link temporanei per vedere/scaricare i file privati (con cache)
const signed = new Map();
export async function signedUrls(paths, download) {
  const now = Date.now();
  const need = paths.filter((p) => { const s = signed.get(p + (download ? '|d' : '')); return !s || s.exp < now + 60000; });
  if (need.length) {
    const { data, error } = await sb.storage.from('files').createSignedUrls(need, 6 * 3600, download ? { download: true } : undefined);
    if (error) throw error;
    for (const r of data) if (r.signedUrl) signed.set(r.path + (download ? '|d' : ''), { url: r.signedUrl, exp: now + 6 * 3600 * 1000 });
  }
  return Object.fromEntries(paths.map((p) => [p, signed.get(p + (download ? '|d' : ''))?.url || null]));
}

export async function removeFiles(bucket, paths) {
  if (!paths.length) return;
  await sb.storage.from(bucket).remove(paths);
}

export async function storageUsage() {
  // somma delle dimensioni dei tuoi file (approssimata, per l'indicatore nelle impostazioni)
  let total = 0;
  for (const bucket of ['covers', 'files']) {
    const walk = async (prefix) => {
      const { data } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
      for (const f of data || []) {
        if (f.id === null) await walk(prefix + '/' + f.name);
        else total += f.metadata?.size || 0;
      }
    };
    await walk(user.id);
  }
  return total;
}
