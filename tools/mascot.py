"""Generatore SVG di Sumi, il lupo a china.
Disegna ogni contorno più volte con piccole variazioni casuali (tratto graffiante),
aggiunge peli sparsi lungo i bordi e tratteggio nelle zone d'ombra."""
import random, math, json, sys

def cr2bez(pts, closed=False):
    # Catmull-Rom -> Bezier cubiche (curva morbida che passa per i punti)
    if len(pts) < 2: return ''
    p = pts[:]
    if closed: p = [pts[-1]] + pts + [pts[0], pts[1]]
    else: p = [pts[0]] + pts + [pts[-1]]
    d = f'M{p[1][0]:.1f},{p[1][1]:.1f}'
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i-1], p[i], p[i+1], p[i+2]
        c1 = (p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6)
        c2 = (p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6)
        d += f' C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}'
    return d

class Pen:
    def __init__(self, seed):
        self.r = random.Random(seed); self.out = []
    def j(self, pts, a):
        return [(x + self.r.uniform(-a, a), y + self.r.uniform(-a, a)) for x, y in pts]
    def stroke(self, pts, passes=3, jit=1.3, w=(1.0, 2.2), op=(0.65, 1.0), closed=False, cls='ink'):
        for i in range(passes):
            d = cr2bez(self.j(pts, jit * (1 if i else 0.4)), closed)
            self.out.append(f'<path class="{cls}" d="{d}" stroke-width="{self.r.uniform(*w):.2f}" opacity="{self.r.uniform(*op):.2f}"/>')
    def fill(self, pts, cls='ink-fill'):
        self.out.append(f'<path class="{cls}" d="{cr2bez(pts, True)} Z"/>')
    def fur(self, pts, n=10, out=(1, 0), length=(5, 12), cls='ink'):
        # peli: trattini che partono dal contorno verso l'esterno
        for _ in range(n):
            i = self.r.randrange(len(pts) - 1); t = self.r.random()
            x = pts[i][0] + (pts[i+1][0]-pts[i][0])*t; y = pts[i][1] + (pts[i+1][1]-pts[i][1])*t
            L = self.r.uniform(*length); a = math.atan2(out[1], out[0]) + self.r.uniform(-0.6, 0.6)
            x2, y2 = x + math.cos(a)*L, y + math.sin(a)*L
            xm, ym = (x+x2)/2 + self.r.uniform(-2, 2), (y+y2)/2 + self.r.uniform(-2, 2)
            self.out.append(f'<path class="{cls}" d="M{x:.1f},{y:.1f} Q{xm:.1f},{ym:.1f} {x2:.1f},{y2:.1f}" stroke-width="{self.r.uniform(0.7,1.6):.2f}" opacity="{self.r.uniform(.5,1):.2f}"/>')
    def hatch(self, poly, ang=-40, gap=4.2, w=0.9, cid=None):
        # tratteggio parallelo ritagliato dentro il poligono
        cid = cid or f'h{len(self.out)}'
        xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
        cx, cy = (min(xs)+max(xs))/2, (min(ys)+max(ys))/2
        R = max(max(xs)-min(xs), max(ys)-min(ys))
        lines = []
        k = -R
        while k < R:
            a = math.radians(ang)
            dx, dy = math.cos(a), math.sin(a); nx, ny = -dy, dx
            x1, y1 = cx + nx*k - dx*R, cy + ny*k - dy*R
            x2, y2 = cx + nx*k + dx*R, cy + ny*k + dy*R
            x1 += self.r.uniform(-3, 3); x2 += self.r.uniform(-3, 3)
            lines.append(f'<path class="ink" d="M{x1:.1f},{y1:.1f} L{x2:.1f},{y2:.1f}" stroke-width="{self.r.uniform(w*0.6, w*1.3):.2f}" opacity="{self.r.uniform(.45,.9):.2f}"/>')
            k += gap * self.r.uniform(0.75, 1.3)
        self.out.append(f'<clipPath id="{cid}"><path d="{cr2bez(poly, True)} Z"/></clipPath><g clip-path="url(#{cid})">{"".join(lines)}</g>')

def head(p, pose='read', dy=0, rot=0):
    """Testa di lupo, muso verso sinistra."""
    o = []
    def T(pts):  # sposta/ruota la testa per le pose
        cx, cy = 125, 100
        a = math.radians(rot)
        res = []
        for x, y in pts:
            x0, y0 = x - cx, y - cy
            res.append((cx + x0*math.cos(a) - y0*math.sin(a), cy + x0*math.sin(a) + y0*math.cos(a) + dy))
        return res
    ear_l = T([(78, 78), (72, 52), (70, 26), (88, 42), (106, 58)])
    ear_r = T([(126, 54), (144, 36), (158, 22), (164, 50), (170, 78)])
    skull = T([(106, 58), (116, 55), (126, 54)])
    cheek = T([(170, 78), (182, 96), (196, 106), (184, 114), (200, 130), (182, 134), (192, 150), (172, 150), (178, 166), (158, 160)])
    brow = T([(78, 78), (70, 88), (56, 96), (40, 100), (30, 103)])
    jaw = T([(34, 118), (50, 123), (70, 128), (88, 131)])
    chin = T([(52, 128), (60, 142), (80, 150), (96, 162), (112, 158), (126, 170), (140, 160), (158, 160)])
    mouth = T([(88, 131), (78, 134), (60, 131)])
    mane = T([(96, 162), (88, 176), (100, 172), (104, 188), (116, 176), (126, 190), (134, 174), (148, 184), (150, 168), (166, 176), (162, 160)])
    # ombra sul lato destro del muso e sotto le orecchie
    p.hatch(T([(132, 64), (166, 74), (186, 112), (176, 148), (140, 152), (150, 112)]), ang=-55, gap=3.6)
    p.hatch(T([(70, 30), (84, 42), (98, 58), (82, 70)]), ang=20, gap=3.0)
    p.hatch(T([(150, 26), (162, 18), (164, 46), (150, 54)]), ang=25, gap=3.0)
    for pts, kw in [(ear_l, {'passes': 4}), (ear_r, {'passes': 4}), (skull, {'passes': 2}), (cheek, {'passes': 4, 'jit': 1.8}), (brow, {'passes': 4}), (jaw, {}), (chin, {'jit': 2.2, 'passes': 4}), (mouth, {'passes': 2}), (mane, {'jit': 2.4, 'passes': 3})]:
        p.stroke(pts, **kw)
    p.fur(mane, n=22, out=(0, 1), length=(8, 20))
    # scarabocchi liberi, come nel disegno a china
    for _ in range(7):
        x0, y0 = p.r.uniform(120, 190), p.r.uniform(80, 150)
        pts = [(x0 + p.r.uniform(-14, 14), y0 + p.r.uniform(-10, 18)) for _ in range(4)]
        p.stroke(T(pts), passes=1, w=(0.5, 1.0), op=(0.35, 0.7), jit=2)
    # naso
    p.fill(T([(22, 101), (32, 97), (40, 101), (40, 110), (30, 114), (22, 110)]))
    # occhio a mandorla + pupilla + sopracciglio
    if pose == 'howl':
        p.stroke(T([(86, 86), (94, 84), (102, 86)]), passes=2, w=(1.6, 2.4))
    else:
        p.stroke(T([(84, 90), (92, 86), (104, 86), (95, 92), (84, 90)]), passes=2, w=(1.2, 2))
        p.fill(T([(92, 87), (96, 86.6), (96.4, 90.4), (92.4, 91)]))
    p.stroke(T([(78, 82), (92, 76), (110, 80)]), passes=3, w=(1.6, 3.0))
    # orecchie interne
    p.stroke(T([(74, 34), (82, 52), (90, 62)]), passes=1, w=(0.8, 1.2))
    p.stroke(T([(158, 24), (156, 46), (160, 64)]), passes=1, w=(0.8, 1.2))
    # peli
    p.fur(cheek, n=16, out=(1, 0.2), length=(6, 14))
    p.fur(chin, n=14, out=(0.1, 1), length=(6, 16))
    p.fur(skull + ear_r[:2], n=6, out=(0, -1), length=(4, 9))
    # puntini dei baffi
    for x, y in T([(46, 108), (52, 111), (50, 104), (57, 107)]):
        p.out.append(f'<circle class="ink-fill" cx="{x:.1f}" cy="{y:.1f}" r="1.1"/>')
    if pose == 'howl':
        # bocca aperta
        p.fill(T([(36, 117), (60, 122), (82, 131), (62, 140), (42, 132)]), cls='ink-fill')

def body(p, pose):
    # spalle e felpa
    p.stroke([(96, 160), (70, 176), (52, 200), (42, 232), (38, 262)], passes=3, jit=1.6)
    p.stroke([(160, 152), (190, 168), (208, 196), (216, 230), (220, 262)], passes=3, jit=1.6)
    p.hatch([(176, 160), (206, 190), (218, 262), (186, 262), (176, 210)], ang=-60, gap=4.4)
    for _ in range(5):
        cx, cy, r = p.r.uniform(80, 180), p.r.uniform(190, 245), p.r.uniform(6, 14)
        loop = [(cx + math.cos(t) * r * p.r.uniform(.8, 1.2), cy + math.sin(t) * r * 0.7) for t in [i * 1.3 for i in range(7)]]
        p.stroke(loop, passes=1, w=(0.5, 0.9), op=(0.3, 0.6), jit=1.5)
    # sciarpa (il colore d'accento del tema)
    scarf = [(92, 150), (128, 160), (166, 146), (172, 160), (130, 176), (88, 166)]
    p.fill(scarf, cls='scarf')
    p.fill([(150, 166), (166, 160), (176, 196), (160, 200)], cls='scarf')
    p.stroke(scarf, passes=2, closed=True, w=(1, 1.8))
    p.stroke([(150, 166), (166, 160), (176, 196), (160, 200), (150, 166)], passes=2, w=(1, 1.8))
    if pose in ('read', 'howl'):
        # libro aperto tenuto con le zampe
        lp = [(62, 212), (92, 204), (120, 210), (120, 258), (90, 252), (58, 258)]
        rp = [(120, 210), (148, 202), (180, 210), (184, 258), (150, 252), (120, 258)]
        p.fill(lp + [(62, 212)], cls='page'); p.fill(rp + [(120, 210)], cls='page')
        p.stroke(lp, passes=2, w=(1, 1.8)); p.stroke(rp, passes=2, w=(1, 1.8))
        p.stroke([(120, 210), (120, 258)], passes=2, w=(1.2, 2))
        for k in range(5):
            y = 220 + k * 7
            p.stroke([(70, y + 1), (94, y - 2), (112, y + 1)], passes=1, w=(0.6, 0.9), jit=0.6)
            p.stroke([(128, y + 1), (150, y - 2), (172, y + 1)], passes=1, w=(0.6, 0.9), jit=0.6)
        for side, x0 in (('l', 58), ('r', 176)):
            s = -1 if side == 'l' else 1
            paw = [(x0 - 6*s, 226), (x0 + 2*s, 214), (x0 + 12*s, 218), (x0 + 14*s, 230), (x0 + 6*s, 240), (x0 - 4*s, 238)]
            p.fill(paw, cls='paw')
            p.stroke(paw, passes=2, closed=True, w=(1.1, 1.9))
            for f in range(3):
                p.stroke([(x0 + (12 - f*4)*s, 216 + f*7), (x0 + (4 - f*3)*s, 220 + f*7)], passes=1, w=(0.8, 1.3))
    elif pose == 'think':
        # zampa sotto il mento
        paw = [(70, 150), (86, 140), (102, 146), (100, 160), (84, 166), (70, 162)]
        p.fill(paw, cls='paw'); p.stroke(paw, passes=2, closed=True)
        p.stroke([(76, 164), (64, 200), (56, 240)], passes=2, jit=1.4)
        p.stroke([(98, 160), (92, 200), (96, 240)], passes=2, jit=1.4)
        for f in range(3):
            p.stroke([(88 + f*5, 142), (86 + f*5, 152)], passes=1, w=(0.8, 1.2))

def svg(pose='read', seed=7, size=240):
    p = Pen(seed)
    if pose == 'howl':
        head(p, pose, dy=4, rot=24)
    elif pose == 'think':
        head(p, pose, rot=-5)
    else:
        head(p, pose)
    body(p, pose)
    extra = ''
    if pose == 'think':
        extra = '<g class="dots"><circle cx="200" cy="40" r="4"/><circle cx="214" cy="26" r="5"/><circle cx="230" cy="10" r="6"/></g>'
    if pose == 'howl':
        extra = '<g class="moon"><circle cx="205" cy="34" r="22"/></g>'
    body_ = ''.join(p.out)
    return f'<svg class="sumi sumi-{pose}" viewBox="0 0 240 264" aria-hidden="true">{extra}<g class="lines">{body_}</g></svg>'

def icon(seed=3):
    """Solo la testa, per l'icona dell'app."""
    p = Pen(seed)
    head(p, 'read')
    return ''.join(p.out)

if __name__ == '__main__':
    out = {k: svg(k, seed=s) for k, s in [('read', 11), ('think', 5), ('howl', 9)]}
    out['head'] = icon(4)
    json.dump(out, open('mascot/sumi.json', 'w'))
    print({k: len(v) for k, v in out.items()})
