"""Insegna: testa di lupo schizzata a china (profilo, muso a sinistra).
Ogni contorno è ripassato più volte con piccole deviazioni, i tratti sforano
leggermente come in uno schizzo; pelo e ombre sono tratteggi liberi."""
import math, random, sys

def cr(pts):
    """Catmull-Rom aperta -> path SVG con curve di Bézier."""
    p = [pts[0]] + pts + [pts[-1]]
    d = f'M{p[1][0]:.1f},{p[1][1]:.1f}'
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}'
    return d

def resample(pts, n):
    """Punti equidistanti lungo la spezzata (serve per trattini e sbavature)."""
    seg = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    L = sum(seg); out = []
    for k in range(n):
        t = L * k / (n - 1); i = 0
        while i < len(seg) - 1 and t > seg[i]: t -= seg[i]; i += 1
        f = t / seg[i] if seg[i] else 0
        out.append((pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f))
    return out

class Sketch:
    def __init__(self, seed=7, scale=1.0):
        self.r = random.Random(seed); self.o = []; self.s = scale
    def line(self, pts, passes=4, jit=1.6, w=(0.5, 1.5), over=6, op=(0.55, 1)):
        """Contorno ripassato: ogni passata parte/finisce in punti un po' diversi."""
        dense = resample(pts, max(6, len(pts) * 3))
        for k in range(passes):
            a = self.r.randint(0, 1); b = len(dense) - self.r.randint(0, 1)
            seg = dense[a:b]
            if len(seg) < 2: continue
            # sforamento: prolungo l'inizio e la fine lungo la tangente
            (x0, y0), (x1, y1) = seg[0], seg[1]; L = math.dist(seg[0], seg[1]) or 1
            e = self.r.uniform(0, over)
            seg = [(x0 - (x1 - x0) / L * e, y0 - (y1 - y0) / L * e)] + seg
            (x0, y0), (x1, y1) = seg[-1], seg[-2]; L = math.dist(seg[-1], seg[-2]) or 1
            e = self.r.uniform(0, over)
            seg = seg + [(x0 + (x0 - x1) / L * e, y0 + (y0 - y1) / L * e)]
            j = jit * (0.5 if k == 0 else 1)
            seg = [(x + self.r.gauss(0, j), y + self.r.gauss(0, j)) for x, y in seg]
            self.o.append(f'<path d="{cr(seg)}" stroke-width="{self.r.uniform(*w):.2f}" opacity="{self.r.uniform(*op):.2f}"/>')
    def fur(self, guide, n, ang, length=(6, 16), spread=0.45, w=(0.4, 1.2), bend=3):
        """Ciuffi: trattini che partono dalla guida in direzione 'ang' (gradi)."""
        pts = resample(guide, 60)
        for _ in range(n):
            x, y = pts[self.r.randrange(len(pts))]
            a = math.radians(ang) + self.r.uniform(-spread, spread)
            L = self.r.uniform(*length)
            x2, y2 = x + math.cos(a) * L, y + math.sin(a) * L
            mx, my = (x + x2) / 2 + self.r.uniform(-bend, bend), (y + y2) / 2 + self.r.uniform(-bend, bend)
            self.o.append(f'<path d="M{x:.1f},{y:.1f} Q{mx:.1f},{my:.1f} {x2:.1f},{y2:.1f}" stroke-width="{self.r.uniform(*w):.2f}" opacity="{self.r.uniform(.45, 1):.2f}"/>')
    def hatch(self, poly, ang, gap=3.2, w=(0.35, 0.9), wob=2.5, op=(.35, .8)):
        """Tratteggio libero dentro un poligono (linee che non toccano sempre il bordo)."""
        a = math.radians(ang); dx, dy = math.cos(a), math.sin(a); nx, ny = -dy, dx
        xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
        cx, cy = sum(xs) / len(xs), sum(ys) / len(ys); R = max(max(xs) - min(xs), max(ys) - min(ys))
        k = -R
        while k < R:
            # intersezione della retta con il poligono
            px, py = cx + nx * k, cy + ny * k; ts = []
            for i in range(len(poly)):
                (ax, ay), (bx, by) = poly[i], poly[(i + 1) % len(poly)]
                ex, ey = bx - ax, by - ay; den = dx * ey - dy * ex
                if abs(den) < 1e-9: continue
                t = ((ax - px) * ey - (ay - py) * ex) / den
                u = ((ax - px) * dy - (ay - py) * dx) / den
                if 0 <= u <= 1: ts.append(t)
            ts.sort()
            for i in range(0, len(ts) - 1, 2):
                t0 = ts[i] + self.r.uniform(0, 3); t1 = ts[i + 1] - self.r.uniform(0, 5)
                if t1 - t0 < 3: continue
                x0, y0 = px + dx * t0, py + dy * t0; x1, y1 = px + dx * t1, py + dy * t1
                mx, my = (x0 + x1) / 2 + self.r.uniform(-wob, wob), (y0 + y1) / 2 + self.r.uniform(-wob, wob)
                self.o.append(f'<path d="M{x0:.1f},{y0:.1f} Q{mx:.1f},{my:.1f} {x1:.1f},{y1:.1f}" stroke-width="{self.r.uniform(*w):.2f}" opacity="{self.r.uniform(*op):.2f}"/>')
            k += gap * self.r.uniform(.7, 1.35)
    def dot(self, x, y, r, op=1):
        self.o.append(f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r * .8}" fill="currentColor" stroke="none" opacity="{op}"/>')
    def blob(self, pts, op=1):
        self.o.append(f'<path d="{cr(pts + pts[:2])} Z" fill="currentColor" stroke="none" opacity="{op}"/>')

def tuft(s, x, y, ang, L=(14, 30), n=5, spread=.35, w=(.35, 1.1), curl=.5):
    """Ciuffo: più trattini curvi che partono quasi dallo stesso punto e si aprono a ventaglio."""
    for _ in range(n):
        a = math.radians(ang) + s.r.uniform(-spread, spread)
        l = s.r.uniform(*L); x0, y0 = x + s.r.uniform(-3, 3), y + s.r.uniform(-3, 3)
        x2, y2 = x0 + math.cos(a) * l, y0 + math.sin(a) * l
        c = curl * s.r.uniform(-1, 1) * l * .35
        mx, my = (x0 + x2) / 2 - math.sin(a) * c, (y0 + y2) / 2 + math.cos(a) * c
        s.o.append(f'<path d="M{x0:.1f},{y0:.1f} Q{mx:.1f},{my:.1f} {x2:.1f},{y2:.1f}" stroke-width="{s.r.uniform(*w):.2f}" opacity="{s.r.uniform(.45, 1):.2f}"/>')

def tufts(s, guide, count, ang, **kw):
    for x, y in resample(guide, count):
        tuft(s, x, y, ang + s.r.uniform(-12, 12), **kw)

def wolf(seed=11, mouth='calm'):
    s = Sketch(seed)
    L = dict(passes=3, jit=1.1, w=(.5, 1.4))
    bridge = [(62, 147), (84, 141), (106, 132), (120, 120)]
    brow = [(120, 120), (132, 104), (148, 95), (160, 92)]
    ear = [(156, 96), (160, 76), (166, 58), (172, 52), (180, 64), (192, 84), (200, 96)]
    ear_in = [(166, 88), (168, 70), (172, 60)]
    ear2 = [(188, 76), (197, 58), (203, 54), (208, 72), (213, 94)]
    skull = [(200, 94), (214, 104), (228, 120)]
    ruff = [(228, 120), (240, 140), (248, 166), (244, 190), (256, 214), (250, 240), (262, 268), (258, 304)]
    lip = [(64, 160), (80, 166), (100, 169), (118, 167)]
    jaw = [(66, 165), (78, 178), (98, 184), (120, 183), (136, 178)]
    chin = [(104, 182), (114, 198), (126, 216), (134, 242), (132, 272), (126, 306)]
    cheek = [(146, 128), (164, 142), (178, 162), (180, 184), (172, 206)]
    muzzle = [(76, 154), (100, 150), (118, 138)]
    eye = [(128, 116), (136, 111), (146, 112)]
    eye_lo = [(130, 118), (140, 118), (147, 113)]
    browline = [(124, 109), (136, 103), (147, 104)]
    if mouth == 'snarl':
        lip = [(58, 158), (70, 157), (84, 161), (98, 158), (110, 164), (118, 166)]
        jaw = [(64, 170), (76, 186), (98, 192), (120, 186), (134, 176)]
        chin = [(108, 192), (116, 206), (126, 222), (134, 246), (132, 272), (126, 306)]
    # ombre
    s.hatch([(110, 184), (134, 178), (170, 206), (176, 250), (160, 300), (130, 304), (134, 250), (122, 212)], ang=-64, gap=2.8, op=(.3, .75))
    s.hatch([(214, 106), (230, 122), (244, 168), (240, 200), (252, 250), (222, 260), (206, 200), (200, 140)], ang=-72, gap=3.4, op=(.2, .55))
    s.hatch([(164, 90), (168, 66), (174, 58), (186, 76), (192, 90)], ang=12, gap=2.2, w=(.3, .7))
    s.hatch([(76, 169), (98, 173), (120, 172), (128, 180), (98, 183), (80, 178)], ang=-12, gap=2.2, op=(.3, .65))
    s.hatch([(100, 136), (120, 122), (132, 136), (116, 150), (98, 150)], ang=-35, gap=3.6, op=(.15, .4))
    for path, kw in [(bridge, {}), (brow, {}), (ear, dict(passes=4)), (ear2, dict(passes=2, op=(.35, .7))), (skull, {}),
                     (lip, {}), (jaw, {}), (ear_in, dict(passes=2, w=(.35, .8))), (muzzle, dict(passes=2, w=(.3, .7), op=(.3, .6))),
                     (browline, dict(passes=2, w=(.4, .9), op=(.5, .8)))]:
        s.line(path, **{**L, **kw})
    s.line(ruff, passes=2, jit=2.6, w=(.4, 1), op=(.4, .8))
    s.line(chin, passes=2, jit=2.6, w=(.4, 1), op=(.4, .8))
    s.line(cheek, passes=2, jit=2, w=(.4, .9), op=(.3, .6))
    s.line(eye, passes=3, w=(.9, 1.7), over=2, jit=.5)
    s.line(eye_lo, passes=2, w=(.5, 1), over=1.5, jit=.5)
    s.dot(139, 114.6, 2.7)
    s.blob([(56, 148), (62, 145), (68, 149), (67, 157), (59, 159), (54, 155)], op=.95)
    if mouth == 'snarl':
        for x in (68, 80, 92, 104):
            s.line([(x, 160), (x + 1.5, 170)], passes=2, w=(.5, 1), over=1, jit=.4)
        s.line([(70, 172), (73, 182)], passes=2, w=(.8, 1.4), jit=.4)
        s.hatch([(66, 166), (116, 168), (126, 180), (98, 190), (74, 184)], ang=20, gap=1.8, op=(.5, .9))
        for x in (78, 92, 104):
            s.line([(x, 140), (x + 6, 131)], passes=2, w=(.3, .7), over=1)
    # pelo a ciuffi: criniera, collare sotto la guancia, gola
    tufts(s, ruff, 16, 95, L=(16, 34), n=4)
    tufts(s, cheek, 9, 105, L=(14, 30), n=4)
    tufts(s, [(176, 210), (200, 236), (222, 262), (236, 300)], 8, 100, L=(18, 36), n=4, w=(.3, .9))
    tufts(s, chin, 10, 112, L=(12, 26), n=3)
    tufts(s, skull, 4, 20, L=(6, 14), n=3)
    s.fur(jaw[1:], 8, 100, length=(3, 8), w=(.3, .8))
    s.fur(brow, 6, -95, length=(3, 7), w=(.3, .7))
    return s

def svg(s, color='#C8141F', vb='0 0 320 320', extra=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" fill="none" stroke="currentColor" stroke-linecap="round" '
            f'stroke-linejoin="round" style="color:{color}">{extra}{"".join(s.o)}</svg>')

if __name__ == '__main__':
    mouth = sys.argv[1] if len(sys.argv) > 1 else 'calm'
    out = sys.argv[2] if len(sys.argv) > 2 else '/tmp/wolf.svg'
    open(out, 'w').write(svg(wolf(mouth=mouth)))

# ---------------------------------------------------------------------------
# Altre direzioni per l'insegna

WOLF_SIL = [(56, 148), (62, 145), (84, 141), (106, 132), (120, 120), (132, 104), (148, 95), (156, 96), (162, 74), (172, 52),
            (182, 64), (188, 76), (197, 58), (203, 54), (208, 72), (213, 94), (228, 120), (240, 140), (248, 166), (244, 190),
            (256, 214), (250, 240), (262, 268), (258, 304), (126, 306), (132, 272), (134, 242), (126, 216), (114, 198),
            (104, 184), (98, 184), (78, 178), (66, 165), (60, 160), (54, 155)]

def seal():
    """Sigillo rosso (hanko) con il lupo in negativo: forma piena, bordi irregolari."""
    r = random.Random(4)
    # cornice quadrata un po' storta
    sq = [(18 + r.uniform(-2, 2), 18 + r.uniform(-2, 2)), (302 + r.uniform(-2, 2), 16 + r.uniform(-2, 2)),
          (304 + r.uniform(-2, 2), 304 + r.uniform(-2, 2)), (16 + r.uniform(-2, 2), 302 + r.uniform(-2, 2))]
    d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in sq) + ' Z'
    sil = [(x * .92 + 6, y * .92 + 2) for x, y in WOLF_SIL]
    sil_d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in sil) + ' Z'
    eye = '<path d="M122,108 Q130,102 138,104 Q131,110 122,108 Z" fill="currentColor"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">'
            f'<defs><filter id="sealrough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="8"/>'
            f'<feDisplacementMap in="SourceGraphic" scale="9"/></filter>'
            f'<mask id="sealm"><rect width="320" height="320" fill="#fff"/><path d="{sil_d}" fill="#000"/>{eye.replace("currentColor", "#fff")}'
            f'<path d="{d}" fill="none" stroke="#000" stroke-width="10" transform="translate(160 160) scale(.86) translate(-160 -160)"/></mask></defs>'
            f'<g filter="url(#sealrough)"><path d="{d}" fill="currentColor" mask="url(#sealm)"/></g></svg>')

def books_cat():
    """Ex libris: gatto nero acciambellato su una pila di libri, a tratto."""
    s = Sketch(21)
    L = dict(passes=3, jit=.8, w=(.5, 1.2), over=4)
    # libri
    for (x0, y0, x1, y1, tilt) in [(34, 150, 168, 170, 0), (44, 130, 160, 150, -1.5), (38, 112, 150, 130, 1)]:
        s.line([(x0, y0 + tilt), (x1, y0 - tilt)], **L); s.line([(x1, y0 - tilt), (x1 + 2, y1 - tilt)], **L)
        s.line([(x0, y1 + tilt), (x1 + 2, y1 - tilt)], **L); s.line([(x0, y0 + tilt), (x0, y1 + tilt)], **L)
        for k in (0.33, 0.66):  # pagine
            y = y0 + (y1 - y0) * k
            s.line([(x1 - 2, y), (x1 + 1, y)], passes=1, w=(.3, .6), over=1)
        s.line([(x0 + 10, y0 + 3), (x0 + 10, y1 - 3)], passes=2, w=(.3, .8), over=1)   # fascia del dorso
    # gatto: corpo a pagnotta, testa a sinistra, coda che avvolge
    body = [(70, 112), (64, 98), (76, 84), (100, 78), (126, 80), (144, 92), (146, 106), (138, 112)]
    s.blob(body + [(104, 113)])
    head = [(56, 108), (50, 96), (54, 84), (60, 78), (58, 64), (68, 74), (76, 72), (84, 62), (86, 76), (90, 88), (86, 102), (74, 110)]
    s.blob(head)
    s.line(head + head[:1], passes=2, jit=.8, w=(.6, 1.2), over=2)
    s.line(body, passes=2, jit=1, w=(.6, 1.2), over=2)
    tail = [(140, 108), (128, 116), (100, 118), (74, 116), (62, 110)]
    s.line(tail, passes=4, jit=.8, w=(2.6, 4.2), over=1)
    s.fur(body[1:6], 18, -80, length=(2, 6), w=(.4, .9))
    # occhi chiusi (dorme)
    s.o.append('<path d="M62,92 q4,3 8,0 M74,92 q4,3 8,0" stroke="var(--eye, #F3E7E4)" stroke-width="1.4"/>')
    return s

def kuro2():
    """Kuro rifatto: gatto nero che si affaccia dal bordo della barra, contorno chiaro a schizzo,
    occhi interi ben visibili."""
    s = Sketch(5)
    head = [(30, 74), (24, 58), (26, 44), (30, 32), (28, 12), (44, 24), (60, 21), (76, 24), (92, 12), (90, 32), (94, 44), (96, 58), (90, 74), (74, 84), (46, 84)]
    s.o.append(f'<path class="k-fill" d="{cr(head + head[:2])} Z"/>')
    paws = [[(30, 84), (32, 92), (44, 94), (50, 86)], [(70, 86), (76, 94), (88, 92), (90, 84)]]
    for p in paws: s.o.append(f'<path class="k-fill" d="{cr(p + p[:2])} Z"/>')
    s.o.append('<g class="k-line">')
    s.line(head, passes=3, jit=.7, w=(.6, 1.3), over=3)
    for p in paws: s.line(p, passes=2, jit=.5, w=(.6, 1.1), over=2)
    s.line([(32, 30), (36, 22), (42, 27)], passes=2, w=(.4, .8), over=1)     # interno orecchie
    s.line([(78, 27), (86, 22), (88, 30)], passes=2, w=(.4, .8), over=1)
    s.fur([(28, 50), (30, 66)], 5, 190, length=(4, 9), w=(.4, .9))           # guance pelose
    s.fur([(92, 50), (90, 66)], 5, -10, length=(4, 9), w=(.4, .9))
    for y, a in [(60, 6), (64, 0), (68, -6)]:                                # baffi
        s.line([(40, y - 2), (14, y - a)], passes=1, w=(.4, .8), over=2)
        s.line([(80, y - 2), (106, y - a)], passes=1, w=(.4, .8), over=2)
    s.o.append('</g>')
    eyes = ('<g class="k-eyes"><path class="k-eye" d="M37,51 Q45,41 55,48 Q47,58 37,51 Z"/><path class="k-eye" d="M83,51 Q75,41 65,48 Q73,58 83,51 Z"/>'
            '<ellipse cx="46.5" cy="49.5" rx="1.7" ry="5.6" class="k-pupil"/><ellipse cx="73.5" cy="49.5" rx="1.7" ry="5.6" class="k-pupil"/></g>'
            '<path d="M57,61 L63,61 L60,64.5 Z" class="k-nose"/>')
    s.o.append(eyes)
    return s

# ---------------------------------------------------------------------------
# Lupo v2: testa di tre quarti (muso verso sinistra), ringhio, collo e criniera
# massicci. Meno tratti, più decisi: contorni ripassati 2 volte, pelo a ciuffi
# solo dove serve, bocca piena.

def wolf2(seed=3):
    s = Sketch(seed)
    M = dict(passes=2, jit=.6, w=(1.5, 2.6), over=4, op=(.85, 1))
    T = dict(passes=2, jit=.45, w=(.8, 1.5), over=2, op=(.65, .95))
    F = dict(passes=1, jit=.3, w=(.9, 1.5), over=1, op=(.7, 1))
    def tooth(x, y, h, w=4.0, up=False, lean=0):
        sg = -1 if up else 1
        s.o.append(f'<path d="M{x - w:.1f},{y:.1f} Q{x - w * .3 + lean * .5:.1f},{y + sg * h * .65:.1f} {x + lean:.1f},{y + sg * h:.1f} Q{x + w * .5 + lean * .5:.1f},{y + sg * h * .5:.1f} {x + w:.1f},{y:.1f} Z" class="tooth" stroke-width="1.1"/>')
    # --- bocca: interno pieno, poi denti, poi labbra sopra
    inner = [(70, 182), (92, 180), (112, 184), (130, 192), (146, 206), (124, 214), (100, 220), (76, 218)]
    s.o.append(f'<path d="M{" L".join(f"{x:.1f},{y:.1f}" for x, y in inner)} Z" fill="currentColor" stroke="none"/>')
    s.o.append('<path d="M84,214 Q104,206 128,206 Q112,216 90,218 Z" class="tongue" stroke="none"/>')
    for x in (73, 77): tooth(x, 182, 6, 1.8)                     # incisivi
    tooth(70, 182, 13, 3.0, lean=-1)                             # canino lontano
    tooth(86, 181, 22, 4.4, lean=-1.5)                           # canino vicino
    for x, h in ((98, 6), (106, 7), (114, 6), (122, 5)): tooth(x, 183 + (x - 98) * .3, h, 2.6)   # premolari
    tooth(84, 219, 15, 3.6, up=True, lean=1)                     # canino inferiore
    for x in (74, 78): tooth(x, 219, 5, 1.8, up=True)
    for x in (96, 106): tooth(x, 218 - (x - 96) * .2, 5, 2.4, up=True)
    # gengiva/labbro superiore sollevato e labbro inferiore
    s.line([(64, 178), (72, 181), (92, 179), (112, 183), (130, 191), (146, 206)], **M)
    s.line([(72, 219), (100, 221), (124, 215), (146, 206)], **T)
    # mandibola
    s.line([(66, 214), (70, 226), (86, 234), (112, 232), (136, 220), (150, 208)], **M)
    tufts(s, [(78, 234), (98, 238), (122, 230)], 5, 105, L=(6, 13), n=2, w=(.8, 1.4))
    # tartufo
    s.blob([(50, 163), (57, 157), (68, 157), (74, 163), (71, 171), (60, 174), (52, 171)])
    s.line([(58, 177), (62, 181)], **F)
    # dorso del muso (profilo lontano) e piano laterale
    s.line([(66, 155), (88, 146), (106, 138), (118, 130)], **M)
    s.line([(118, 130), (110, 118), (104, 106)], **M)              # lato lontano della testa
    s.line([(154, 136), (136, 154), (118, 170), (104, 176)], **T)  # spigolo del muso, lato vicino
    # rughe del ringhio sul muso
    for k, (x, y) in enumerate([(84, 152), (95, 148), (106, 144), (117, 140)]):
        s.line([(x - 2, y - 4), (x + 3, y + 4), (x + 4, y + 13 - k)], **F)
    s.line([(120, 160), (128, 168)], **F); s.line([(128, 152), (137, 162)], **F)
    # occhi: mandorla inclinata, iride chiara, pupilla
    s.o.append('<path d="M156,130 Q166,116 184,116 Q172,131 156,130 Z" class="iris" stroke="none"/>')
    s.o.append('<path d="M140,124 Q132,112 122,110 Q128,123 140,124 Z" class="iris" stroke="none"/>')
    s.dot(171, 123, 2.8); s.dot(131, 117, 2.2)
    s.line([(154, 131), (166, 116), (186, 115)], **M)
    s.line([(156, 131), (172, 131), (186, 115)], **T)
    s.line([(142, 125), (132, 111), (120, 108)], **M)
    s.line([(141, 125), (128, 124), (120, 108)], **T)
    # sopracciglia aggrottate e piega centrale
    s.line([(150, 120), (162, 106), (184, 103), (196, 108)], **M)
    s.line([(146, 116), (136, 102), (118, 98)], **M)
    s.line([(146, 98), (148, 110), (150, 118)], **F); s.line([(142, 92), (144, 100)], **F)
    # orecchie, un po' all'indietro
    s.line([(106, 100), (100, 74), (98, 46), (122, 64), (140, 84)], **M)
    s.line([(176, 88), (192, 58), (214, 34), (222, 64), (226, 96)], **M)
    s.hatch([(106, 96), (101, 58), (124, 70), (136, 84)], ang=72, gap=3.2, w=(.7, 1.2), op=(.55, .9))
    s.hatch([(186, 88), (211, 44), (219, 70), (222, 94)], ang=72, gap=3.0, w=(.7, 1.2), op=(.55, .9))
    s.line([(140, 84), (158, 80), (176, 88)], **M)
    # contorno vicino: guancia e collare di pelo
    s.line([(226, 96), (236, 120), (240, 146)], **M)
    ruff = [(240, 146), (252, 164), (246, 182), (262, 198), (254, 218), (270, 236), (264, 256)]
    s.line(ruff, passes=2, jit=1.2, w=(1.3, 2.3), over=3)
    for x, y in ruff[1::2]: tuft(s, x, y, 25, L=(10, 18), n=3, spread=.3, w=(1, 1.8), curl=.5)
    cheek = [(158, 140), (180, 150), (202, 168), (214, 192), (212, 214)]
    s.line(cheek, passes=1, jit=.8, w=(1, 1.6), over=2)
    tufts(s, cheek[1:], 5, 100, L=(10, 18), n=2, spread=.25, w=(.9, 1.5))
    # collo massiccio e petto
    s.line([(130, 228), (136, 256), (130, 290), (122, 326)], passes=2, jit=1, w=(1.3, 2.3), over=3)
    s.line([(264, 256), (282, 278), (302, 296), (330, 312)], passes=2, jit=1, w=(1.3, 2.3), over=3)
    tufts(s, [(146, 264), (180, 292), (220, 300), (258, 290)], 6, 92, L=(14, 26), n=3, spread=.25, w=(.9, 1.6))
    tufts(s, [(132, 252), (128, 300)], 3, 155, L=(8, 16), n=2, w=(.9, 1.5))
    tufts(s, [(170, 240), (200, 262), (236, 268)], 4, 100, L=(16, 28), n=2, spread=.2, w=(.8, 1.4))
    tufts(s, [(244, 200), (262, 250), (286, 290)], 4, 60, L=(12, 22), n=2, spread=.25, w=(.8, 1.4))
    # ombre (poche)
    s.hatch([(156, 214), (200, 196), (232, 214), (238, 250), (206, 270), (160, 256)], ang=-58, gap=4.6, w=(.7, 1.2), op=(.45, .8))
    s.hatch([(136, 236), (156, 222), (170, 262), (150, 300), (134, 296)], ang=-55, gap=4.6, w=(.7, 1.2), op=(.4, .7))
    s.hatch([(238, 156), (252, 190), (258, 240), (240, 244), (232, 196)], ang=-65, gap=5, w=(.7, 1.1), op=(.35, .65))
    s.hatch([(110, 170), (140, 152), (152, 160), (140, 190), (118, 182)], ang=-35, gap=4.2, w=(.6, 1), op=(.3, .55))
    tufts(s, [(150, 84), (166, 84)], 2, -95, L=(5, 9), n=2, w=(.8, 1.2))
    return s

def wolf2_svg(line='#1A0607', tooth='#F1E4DC', eye='#F1E4DC', tongue='#6E1218', bg=None, vb='30 20 300 300'):
    s = wolf2()
    css = f'<style>.tooth{{fill:{tooth};stroke:{line}}}.iris{{fill:{eye}}}.tongue{{fill:{tongue}}}.nostril{{stroke:{tongue}}}</style>'
    rect = f'<rect x="-50" y="-50" width="500" height="500" fill="{bg}"/>' if bg else ''
    return svg(s, vb=vb, extra=css + rect).replace('currentColor', line)
