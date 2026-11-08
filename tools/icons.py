import json, asyncio
from playwright.async_api import async_playwright
d = json.load(open('mascot/sumi.json'))
head = d['head']
def page(size, pad):
    # testa di Sumi su rosso, nero a china, come i disegni di riferimento
    inner = size * (1 - 2 * pad)
    return f"""<html><body style="margin:0;width:{size}px;height:{size}px;background:#8E0A0A;overflow:hidden">
<svg width="0" height="0" style="position:absolute"><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="2.6"/></filter>
<pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="1.2" height="7" fill="rgba(0,0,0,.22)"/></pattern></svg>
<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" style="position:absolute;inset:0"><rect width="{size}" height="{size}" fill="url(#hatch)" opacity=".7"/></svg>
<svg viewBox="12 6 196 172" width="{inner}" height="{inner}" style="position:absolute;left:{size*pad}px;top:{size*pad + size*0.03}px;color:#120606">
<style>.ink{{fill:none;stroke:#120606;stroke-linecap:round;stroke-linejoin:round}} .ink-fill{{fill:#120606}}</style>
<g style="filter:url(#rough)" transform="translate(0,6)">{head}</g></svg></body></html>"""
async def m():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for name, size, pad in [('icon-512', 512, 0.06), ('icon-192', 192, 0.06), ('maskable-512', 512, 0.16), ('apple-touch-icon', 180, 0.08)]:
            pg = await b.new_page(viewport={'width': size, 'height': size})
            await pg.set_content(page(size, pad))
            await pg.screenshot(path=f'/home/claude/k2/app/icons/{name}.png')
            await pg.close()
        await b.close()
asyncio.run(m())
