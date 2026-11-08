"""Kuro in più pose, stesso stile del Kuro che si affaccia: sagoma nera piena,
contorno chiaro ripassato, occhi a mandorla verde-giallo, naso rosa."""
import math, random, sys
sys.path.insert(0, '/home/claude/k2/tools')
from emblem import Sketch, cr, resample

HEAD = [(30, 74), (24, 58), (26, 44), (30, 32), (28, 12), (44, 24), (60, 21), (76, 24), (92, 12), (90, 32), (94, 44), (96, 58), (90, 74), (74, 84), (46, 84)]

def fill(s, pts, cls='k-fill'):
    s.o.append(f'<path class="{cls}" d="{cr(pts + pts[:2])} Z"/>')

def tube(center, w0, w1):
    """sagoma di una coda: linea centrale allargata, più sottile in punta"""
    pts = resample(center, 9); L, R = [], []
    for i, (x, y) in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]; n = math.hypot(dx, dy) or 1
        w = (w0 + (w1 - w0) * i / (len(pts) - 1)) / 2
        L.append((x - dy / n * w, y + dx / n * w)); R.append((x + dy / n * w, y - dx / n * w))
    return L + R[::-1]

def head(s, tx=0, ty=0, sleep=False, look=(0, 0)):
    """la testa di Kuro (uguale a quella che si affaccia), spostata di tx, ty"""
    T = lambda pts: [(x + tx, y + ty) for x, y in pts]
    h = T(HEAD)
    s.o.append('<g class="k-head">')
    fill(s, h)
    s.o.append('<g class="k-line">')
    s.line(h + h[:1], passes=3, jit=.7, w=(.6, 1.3), over=3)
    s.line(T([(32, 30), (36, 22), (42, 27)]), passes=2, w=(.4, .8), over=1)
    s.line(T([(78, 27), (86, 22), (88, 30)]), passes=2, w=(.4, .8), over=1)
    s.fur(T([(28, 50), (30, 66)]), 5, 190, length=(4, 9), w=(.4, .9))
    s.fur(T([(92, 50), (90, 66)]), 5, -10, length=(4, 9), w=(.4, .9))
    for y, a in [(60, 6), (64, 0), (68, -6)]:
        s.line(T([(40, y - 2), (14, y - a)]), passes=1, w=(.4, .8), over=2)
        s.line(T([(80, y - 2), (106, y - a)]), passes=1, w=(.4, .8), over=2)
    s.o.append('</g>')
    g = f'<g transform="translate({tx} {ty})">'
    if sleep:
        g += '<path d="M38,51 Q46,57 54,50 M66,50 Q74,57 82,51" class="k-closed"/>'
    else:
        lx, ly = look
        g += ('<g class="k-eyes"><path class="k-eye" d="M37,51 Q45,41 55,48 Q47,58 37,51 Z"/><path class="k-eye" d="M83,51 Q75,41 65,48 Q73,58 83,51 Z"/>'
              f'<ellipse cx="{46.5 + lx}" cy="{49.5 + ly}" rx="1.7" ry="5.6" class="k-pupil"/><ellipse cx="{73.5 + lx}" cy="{49.5 + ly}" rx="1.7" ry="5.6" class="k-pupil"/></g>')
    g += '<path d="M57,61 L63,61 L60,64.5 Z" class="k-nose"/></g>'
    s.o.append(g)
    s.o.append('</g>')

def outline(s, pts, closed=True, **kw):
    s.o.append('<g class="k-line">')
    s.line(pts + (pts[:1] if closed else []), **{**dict(passes=3, jit=.8, w=(.6, 1.3), over=3), **kw})
    s.o.append('</g>')

def lines(s, *paths, **kw):
    s.o.append('<g class="k-line">')
    for p in paths: s.line(p, **{**dict(passes=2, jit=.6, w=(.5, 1.1), over=2), **kw})
    s.o.append('</g>')

def seduto():
    """seduto, coda che sale a uncino sul fianco"""
    s = Sketch(12)
    tail = tube([(150, 206), (174, 202), (186, 182), (184, 156), (174, 142), (166, 146)], 14, 8)
    s.o.append('<g class="k-tail" style="transform-origin:156px 206px">'); fill(s, tail); outline(s, tail, passes=2, jit=.4); s.o.append('</g>')
    body = [(56, 84), (50, 108), (48, 140), (50, 176), (48, 206), (58, 214), (100, 214), (150, 214), (164, 202), (166, 178), (156, 154), (136, 130), (118, 106), (102, 88)]
    fill(s, body); outline(s, body)
    lines(s, [(62, 150), (60, 208)], [(82, 150), (84, 210)], [(146, 210), (152, 184), (140, 160), (120, 150)])
    lines(s, [(52, 212), (56, 206), (62, 212)], [(76, 212), (82, 206), (88, 212)], w=(.4, .8))   # dita
    head(s, 14, 6)
    return s, '0 0 210 222'

def libri():
    """sdraiato su una pila di libri, la coda che pende giù"""
    s = Sketch(8)
    books = [(30, 128, 196, 150, 'b1'), (40, 150, 206, 172, 'b2'), (26, 172, 200, 196, 'b3')]
    for x0, y0, x1, y1, c in books:
        s.o.append(f'<rect class="book {c}" x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" rx="2.5"/>')
        lines(s, [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)], passes=2, jit=.5, w=(.6, 1.1), over=2)
        lines(s, [(x0 + 12, y0 + 3), (x0 + 12, y1 - 3)], [(x1 - 4, y0 + 5), (x1 - 4, y1 - 5)], passes=1, w=(.4, .8))
    tail = tube([(186, 120), (198, 132), (202, 160), (196, 188), (204, 210), (214, 214)], 12, 8)
    s.o.append('<g class="k-tail" style="transform-origin:190px 124px">'); fill(s, tail); outline(s, tail, passes=2, jit=.4); s.o.append('</g>')
    body = [(64, 84), (90, 70), (130, 66), (168, 72), (192, 90), (196, 112), (184, 128), (120, 130), (70, 130), (50, 124)]
    fill(s, body); outline(s, body)
    paws = [[(44, 118), (40, 128), (56, 132), (68, 128), (64, 118)], [(70, 120), (68, 130), (84, 133), (94, 129), (90, 120)]]
    for p in paws: fill(s, p); outline(s, p, passes=2, w=(.5, 1))
    lines(s, [(150, 126), (156, 104), (142, 86)])
    head(s, 0, 32)
    return s, '0 26 222 194'

def dorme():
    """acciambellato che dorme"""
    s = Sketch(4)
    s.o.append('<g class="k-breath">')
    body = [(30, 120), (36, 92), (64, 72), (110, 66), (156, 74), (184, 98), (188, 126), (172, 146), (120, 152), (64, 150), (38, 140)]
    fill(s, body); outline(s, body)
    tail = tube([(176, 132), (150, 150), (104, 154), (64, 150), (46, 140)], 14, 9)
    fill(s, tail); outline(s, tail, passes=2, jit=.4)
    lines(s, [(120, 80), (150, 92), (166, 116)])
    s.o.append('</g>')
    head(s, 10, 52, sleep=True)
    return s, '0 56 210 106'

POSES = {'seduto': seduto, 'libri': libri, 'dorme': dorme}
CSS = """<style>.k-fill{fill:#0B0708;stroke:none}.k-line{color:#A89A9E}.k-eye{fill:#D9E46C;stroke:none}.k-pupil{fill:#0B0708;stroke:none}
.k-nose{fill:#C9787F;stroke:none}.k-closed{fill:none;stroke:#A89A9E;stroke-width:1.6}.book{stroke:none}.b1{fill:#7A2238}.b2{fill:#D4677F}.b3{fill:#3A2430}</style>"""

def svg(name, css=True):
    s, vb = POSES[name]()
    return (f'<svg xmlns="http://www.w3.org/2000/svg" class="kuro kuro-{name}" viewBox="{vb}" fill="none" stroke="currentColor" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true">{CSS if css else ""}{"".join(s.o)}</svg>')

if __name__ == '__main__':
    import subprocess
    for n in POSES:
        open(f'/tmp/k-{n}.svg', 'w').write(svg(n).replace('currentColor', '#A89A9E'))
        subprocess.run(['rsvg-convert', '-w', '480', '-b', '#1A0D12', f'/tmp/k-{n}.svg', '-o', f'/tmp/k-{n}.png'], check=True)
