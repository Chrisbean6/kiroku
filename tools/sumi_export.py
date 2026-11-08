import json
d = json.load(open('/home/claude/k2/tools/mascot/sumi.json'))
js = "// Generato da tools/mascot.py: Sumi, il lupo a china (pose: read, think, howl, head)\nexport const SUMI = " + json.dumps(d, ensure_ascii=False) + ";\n"
open('/home/claude/k2/app/js/sumi-art.js', 'w').write(js)
print(len(js))
