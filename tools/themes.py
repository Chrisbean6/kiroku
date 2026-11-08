"""Genera css/themes.css: un blocco di variabili per ogni tema.
I colori dei tipi sono stati validati (separazione per daltonismo) con lo script dataviz."""
import json

LIGHT_TYPES = {"manga":"#c65085","anime":"#4376d8","vn":"#00985f","book":"#c67100","film":"#8e5ac2","fanfic":"#0095a1","game":"#c74c41","album":"#a69300"}
DARK_TYPES  = {"manga":"#c55e8a","anime":"#507ed3","vn":"#169f65","book":"#ca791d","film":"#9a61b8","fanfic":"#00a59e","game":"#bc5051","album":"#a39000"}

def lum(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
def contrast(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)
def on(bg, dark, light):
    return dark if contrast(bg, dark) >= contrast(bg, light) else light

THEMES = {
  # nome: (etichetta, scuro?, token)
  'riso': dict(label='Risograph', dark=False, t=dict(
      paper='#EEECF4', paper2='#F8F7FC', paper3='#E1DEEC', ink='#1D1A33', ink2='#4A4566', ink3='#66618A', line='#D2CEE0',
      accent='#1D1A33', onaccent='#EEECF4', accent2='#F0428F', hl='#FFE34D', onhl='#1D1A33', logoA='#3B5BDB', logoB='#F0428F',
      display='"Dela Gothic One"', blend='multiply', scarf='#F0428F')),
  'riso-dark': dict(label='Risograph notte', dark=True, t=dict(
      paper='#17142A', paper2='#221E3B', paper3='#2D2850', ink='#EEECF4', ink2='#B9B4D3', ink3='#9590B5', line='#3A3460',
      accent='#EEECF4', onaccent='#17142A', accent2='#F0428F', hl='#FFE34D', onhl='#1D1A33', logoA='#5B7BF0', logoB='#F0428F',
      display='"Dela Gothic One"', blend='screen', scarf='#F0428F')),
  'inchiostro': dict(label='Inchiostro', dark=True, t=dict(
      paper='#140B0C', paper2='#211314', paper3='#2E1A1B', ink='#F3E7E4', ink2='#CDB5B0', ink3='#A38A85', line='#3F2627',
      accent='#C8141F', onaccent='#FFF4F2', accent2='#8E0A0A', hl='#E9D8C8', onhl='#140B0C', logoA='#120606', logoB='transparent',
      display='"Yuji Syuku"', blend='screen', scarf='#120606')),
  'cipria': dict(label='Bordeaux e cipria', dark=False, t=dict(
      paper='#F7EEF0', paper2='#FFF9FA', paper3='#EEDCE0', ink='#33101A', ink2='#62404A', ink3='#7E5C66', line='#E3CBD1',
      accent='#7B1E33', onaccent='#FFF4F6', accent2='#E6A7B4', hl='#E6A7B4', onhl='#33101A', logoA='#7B1E33', logoB='transparent',
      display='"Shippori Mincho B1"', blend='multiply', scarf='#7B1E33')),
  'salvia': dict(label='Bordeaux e salvia', dark=False, t=dict(
      paper='#EDF0E8', paper2='#F9FBF6', paper3='#DCE3D4', ink='#2A1418', ink2='#54464A', ink3='#6E6366', line='#CAD4C0',
      accent='#74182B', onaccent='#F9F3F0', accent2='#8DA47E', hl='#B9CCA7', onhl='#2A1418', logoA='#74182B', logoB='transparent',
      display='"Zen Old Mincho"', blend='multiply', scarf='#74182B')),
  'ardesia': dict(label='Bordeaux e ardesia', dark=False, t=dict(
      paper='#E8EBF0', paper2='#F6F7FA', paper3='#D7DCE5', ink='#241318', ink2='#4F4650', ink3='#665C67', line='#C6CCD8',
      accent='#7A1F35', onaccent='#FBF3F4', accent2='#7F93AF', hl='#C3CFE2', onhl='#241318', logoA='#7A1F35', logoB='transparent',
      display='"Shippori Mincho B1"', blend='multiply', scarf='#7A1F35')),
  'notte': dict(label='Bordeaux notte', dark=True, t=dict(
      paper='#1A0D12', paper2='#26141B', paper3='#331C25', ink='#F4E6EA', ink2='#D0B3BC', ink3='#A98A94', line='#45262F',
      accent='#D4677F', onaccent='#1A0D12', accent2='#7A2238', hl='#F0B8C4', onhl='#1A0D12', logoA='#D4677F', logoB='transparent',
      display='"Shippori Mincho B1"', blend='screen', scarf='#D4677F')),
}

def block(name, th):
    t = th['t']; types = DARK_TYPES if th['dark'] else LIGHT_TYPES
    v = [
      f"--paper:{t['paper']}", f"--paper-2:{t['paper2']}", f"--paper-3:{t['paper3']}",
      f"--ink:{t['ink']}", f"--ink-2:{t['ink2']}", f"--ink-3:{t['ink3']}", f"--line:{t['line']}", f"--chart:{t['ink2']}",
      f"--accent:{t['accent']}", f"--on-accent:{t['onaccent']}", f"--accent-2:{t['accent2']}",
      f"--hl:{t['hl']}", f"--on-hl:{t['onhl']}", f"--logo-a:{t['logoA']}", f"--logo-b:{t['logoB']}",
      f"--f-display:{t['display']}, \"Hiragino Mincho ProN\", serif" if 'Mincho' in t['display'] or 'Yuji' in t['display'] else f"--f-display:{t['display']}, \"Hiragino Sans\", \"Arial Black\", sans-serif",
      f"--blend:{t['blend']}", f"--scarf:{t['scarf']}",
      f"color-scheme:{'dark' if th['dark'] else 'light'}",
    ]
    if th['dark']:
        v += ["--shadow:0 1px 0 rgba(0,0,0,.25), 0 12px 30px -14px rgba(0,0,0,.75)", "--shadow-lg:0 30px 70px -20px rgba(0,0,0,.85)"]
    else:
        v += [f"--shadow:0 1px 0 rgba(30,10,20,.06), 0 10px 28px -14px rgba(30,10,20,.32)", "--shadow-lg:0 30px 70px -30px rgba(30,10,20,.5)"]
    darkText, lightText = (t['paper'] if th['dark'] else t['ink']), '#FFFFFF'
    for k, c in types.items():
        o = on(c, '#141014', '#FFFFFF')
        v.append(f"--t-{k}:{c}"); v.append(f"--on-t-{k}:{o}")
    return f":root[data-theme=\"{name}\"]{{{';'.join(v)}}}"

css = "/* Generato da tools/themes.py: non modificare a mano */\n" + "\n".join(block(n, th) for n, th in THEMES.items())
open('/home/claude/k2/app/css/themes.css', 'w').write(css + "\n")
meta = {n: {'label': th['label'], 'dark': th['dark'], 'paper': th['t']['paper'], 'accent': th['t']['accent'], 'accent2': th['t']['accent2'], 'ink': th['t']['ink'], 'paper2': th['t']['paper2']} for n, th in THEMES.items()}
open('/home/claude/k2/tools/themes.json', 'w').write(json.dumps(meta))
for n, th in THEMES.items():
    t = th['t']
    print(n, 'ink/paper', round(contrast(t['ink'], t['paper']), 1), 'ink3/paper', round(contrast(t['ink3'], t['paper']), 1), 'accent/paper', round(contrast(t['accent'], t['paper']), 1), 'onaccent', round(contrast(t['onaccent'], t['accent']), 1))
