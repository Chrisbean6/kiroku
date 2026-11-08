// Stato condiviso dell'app e preferenze del dispositivo.
import { LS } from './util.js';
import { TYPES } from './types.js';

export const PREF_KEY = 'kiroku2.prefs';
export const prefs = Object.assign(
  { theme: 'notte', sort: 'recent', view: 'grid', type: 'all', bannerOff: false, localOnly: false, howls: 0 },
  LS.get(PREF_KEY, {}),
);
export const savePrefs = () => LS.set(PREF_KEY, prefs);

export const S = {
  items: [],
  loaded: false,
  view: 'scaffale',
  type: prefs.type === 'all' || TYPES[prefs.type] ? prefs.type : 'all',
  status: 'all',
  q: '',
  firstDrop: true,
  flashId: null,
  detail: null,     // { id, api, shown }
  recs: {},         // risultati dei consigli per sezione
  note: '',         // avviso in testata
};

// "bus": funzioni registrate da main.js e richiamate dagli altri moduli (evita import circolari)
export const bus = {
  render: () => {},
  renderSoon: () => {},
  refreshDetail: () => {},
  syncState: () => {},
};

export const byId = (id) => S.items.find((x) => x.id === id);
export const inType = (it) => S.type === 'all' || it.type === S.type;
