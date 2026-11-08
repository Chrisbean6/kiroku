"""Icone dell'app con Kuro che si affaccia dal bordo in basso."""
import sys, subprocess, re
sys.path.insert(0, '/home/claude/k2/tools')
import emblem
def kuro_icon(bg, line, size=512, scale=1.22):
    k = emblem.svg(emblem.kuro2(), vb='0 0 120 100')
    k = re.sub(r'^<svg [^>]*>', '', k)[:-6]
    css = (f'<style>.k-fill{{fill:#0B0708;stroke:none}}.k-line{{color:{line}}}.k-eye{{fill:#D9E46C;stroke:none}}'
           f'.k-pupil{{fill:#0B0708;stroke:none}}.k-nose{{fill:#C9787F;stroke:none}}</style>')
    w = size * scale; s = w / 120; h = 100 * s
    x = (size - w) / 2; y = size - h + size * .06
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">{css}'
            f'<rect width="{size}" height="{size}" fill="{bg}"/>'
            f'<g transform="translate({x:.1f} {y:.1f}) scale({s:.3f})" fill="none" stroke="{line}" stroke-linecap="round" stroke-linejoin="round">{k.replace("currentColor", line)}</g></svg>')
VARIANTS = {'A': ('#8E0A0A', '#E9C9C1'), 'B': ('#1A0D12', '#A89A9E'), 'C': ('#D4677F', '#2A1018')}
if __name__ == '__main__':
    for k, (bg, ln) in VARIANTS.items():
        open(f'/tmp/ki{k}.svg', 'w').write(kuro_icon(bg, ln))
        subprocess.run(['rsvg-convert', '-w', '512', f'/tmp/ki{k}.svg', '-o', f'/tmp/ki{k}.png'], check=True)
