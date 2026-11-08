import { formatHex, clampChroma, differenceEuclidean, wcagContrast, converter } from 'culori';
import { execSync } from 'child_process';
const V = '/tmp/claude-0/bundled-skills/2.1.319/ae05661adb4f8420e4ae0623df04d6cb/dataviz/scripts/validate_palette.js';
const ok = converter('oklch'); const dE = differenceEuclidean('oklab'); const d2 = (a, b) => dE(a, b) * 100;
const K = ['manga','webtoon','anime','vn','book','film','fanfic','game','album'];
const D = ["#d16995","#8a7a00","#5192e4","#288f49","#b672c5","#b16200","#00a5a6","#7967c5","#d96a64"];
const L = ["#c25b87","#7e6f00","#4384d5","#17843f","#a865b7","#a25900","#009696","#6f5db9","#c95d57"];
const run = (pal, mode, surf) => { let r = ''; try { r = execSync(`node ${V} "${pal.join(',')}" --mode ${mode} --surface "${surf}" 2>&1`).toString(); } catch (e) { r = e.stdout.toString(); } return r; };
const bad = (r) => (r.match(/\[FAIL\]/g) || []).length * 10 + (r.match(/\[WARN\]/g) || []).length;
const cs = [];
for (let h = 0; h < 360; h += 3) for (const c of [0.12, 0.14, 0.16]) for (const dl of [-0.06, -0.03, 0, 0.03, 0.06]) {
  const dk = formatHex(clampChroma({ mode: 'oklch', l: 0.6 + dl, c, h }, 'oklch'));
  const lt = formatHex(clampChroma({ mode: 'oklch', l: 0.53 + dl * .7, c, h }, 'oklch'));
  if (wcagContrast(dk, '#1A0D12') < 3.1 || wcagContrast(dk, '#000') < 3.1 || wcagContrast(lt, '#F7EEF0') < 3.1 || wcagContrast(lt, '#EEECF4') < 3.0) continue;
  if (ok(dk).c < 0.106 || ok(lt).c < 0.106) continue;
  const d = Math.min(...D.map((x) => d2(dk, x)), ...L.map((x) => d2(lt, x)));
  cs.push({ h, c, dl, dk, lt, d });
}
cs.sort((a, b) => b.d - a.d);
const top = cs.slice(0, 120);
let best = null;
for (const a of top) for (const b of top) {
  if (a === b) continue;
  const d = Math.min(a.d, b.d, d2(a.dk, b.dk), d2(a.lt, b.lt));
  if (!best || d > best.d) best = { a, b, d };
}
console.log('A', best.a, '\nB', best.b, '\nmin', best.d.toFixed(1));
const orders = [
  ['manga','webtoon','X','anime','vn','book','film','Y','fanfic','game','album'],
  ['manga','webtoon','X','anime','vn','book','Y','film','fanfic','game','album'],
  ['manga','webtoon','Y','anime','vn','book','film','X','fanfic','game','album'],
  ['manga','webtoon','Y','anime','vn','book','X','film','fanfic','game','album'],
  ['manga','X','webtoon','anime','vn','book','film','Y','fanfic','game','album'],
  ['manga','Y','webtoon','anime','vn','book','film','X','fanfic','game','album'],
];
for (const o of orders) {
  const md = Object.fromEntries(K.map((k, i) => [k, D[i]])); md.X = best.a.dk; md.Y = best.b.dk;
  const ml = Object.fromEntries(K.map((k, i) => [k, L[i]])); ml.X = best.a.lt; ml.Y = best.b.lt;
  const s = bad(run(o.map((k) => md[k]), 'dark', '#1A0D12')) + bad(run(o.map((k) => md[k]), 'dark', '#000000')) + bad(run(o.map((k) => ml[k]), 'light', '#F7EEF0'));
  console.log(s, o.join(','));
}
