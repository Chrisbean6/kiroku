"""Scrive app/js/art.js: Kuro nelle sue pose (tools/emblem.py, tools/kuro_poses.py)."""
import json, sys
sys.path.insert(0, '/home/claude/k2/tools')
import emblem, kuro_poses
peek = emblem.svg(emblem.kuro2(), vb='0 0 120 100').replace('<svg xmlns="http://www.w3.org/2000/svg"', '<svg class="kuro kuro-peek-art" aria-hidden="true"').replace(' style="color:#C8141F"', '')
art = {'KURO': peek}
for name, const in [('libri', 'KURO_BOOKS'), ('seduto', 'KURO_SIT'), ('dorme', 'KURO_SLEEP')]:
    art[const] = kuro_poses.svg(name, css=False).replace('xmlns="http://www.w3.org/2000/svg" ', '')
out = '// Generato da tools/export_art.py: Kuro (tools/emblem.py, tools/kuro_poses.py)\n'
out += ''.join(f'export const {k} = {json.dumps(v)};\n' for k, v in art.items())
open('/home/claude/k2/app/js/art.js', 'w').write(out)
print({k: len(v) for k, v in art.items()})
