# Kiroku

La libreria personale di Chri: manga, anime, visual novel, libri, film, fanfiction, videogiochi e album.

**App:** https://chrisbean6.github.io/kiroku/ (si installa sul telefono e sul PC come un'app)

## Com'è fatta

- `index.html`, `css/`, `js/`: l'app (JavaScript senza framework, moduli ES).
- `js/config.js`: indirizzo e chiave pubblica del progetto Supabase.
- `supabase/setup.sql`: tabelle, permessi e spazio file del database (già eseguito).
- `sw.js` + `manifest.webmanifest`: la rendono installabile e usabile offline.
- `.github/workflows/keepalive.yml`: ogni giorno "sveglia" Supabase, che sul piano gratuito si addormenta dopo 7 giorni senza uso.

## Da dove arrivano copertine e dati

AniList (anime, manga, webtoon e consigli), VNDB (visual novel), Open Library (libri e graphic novel), TVmaze (serie TV), iTunes e MusicBrainz (album), Wikipedia (film, videogiochi, graphic novel e tutto il resto).

## Mascotte

Kuro, il gatto nero: sta sulla pila di libri in testata, si affaccia sopra la barra in basso e dorme sugli scaffali vuoti. `tools/kuro_poses.py` e `tools/emblem.py` lo disegnano, `tools/export_art.py` lo mette in `js/art.js`, `tools/icons_kuro.py` fa le icone. C'è anche un fantasmino con la candela.
