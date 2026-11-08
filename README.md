# Kiroku 記録

La libreria personale di Chri: manga, anime, visual novel, libri, film, fanfiction, videogiochi e album.

**App:** https://chrisbean6.github.io/kiroku/ (si installa sul telefono e sul PC come un'app)

## Com'è fatta

- `index.html`, `css/`, `js/`: l'app (JavaScript senza framework, moduli ES).
- `js/config.js`: indirizzo e chiave pubblica del progetto Supabase.
- `supabase/setup.sql`: tabelle, permessi e spazio file del database (già eseguito).
- `sw.js` + `manifest.webmanifest`: la rendono installabile e usabile offline.
- `.github/workflows/keepalive.yml`: ogni giorno "sveglia" Supabase, che sul piano gratuito si addormenta dopo 7 giorni senza uso.

## Da dove arrivano copertine e dati

AniList (anime, manga e consigli), VNDB (visual novel), Open Library (libri), iTunes e MusicBrainz (album), Wikipedia (film, videogiochi e tutto il resto).

## Mascotte

Sumi, il lupo a china (`tools/mascot.py` nel progetto di lavoro lo disegna con tratti casuali), Kuro il gatto nero e un fantasmino con la candela.
