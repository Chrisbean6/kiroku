// Effetti: toast, cuoricini, coriandoli, tooltip dei grafici.
import { $, $$, esc, reduced } from './util.js';

export function toast(msg, { action, onAction, ms = 3000 } = {}) {
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span></span>${action ? `<button>${esc(action)}</button>` : ''}`;
  $('span', t).textContent = msg;
  box.append(t);
  while (box.children.length > 3) box.firstChild.remove();
  let gone = false;
  const kill = () => { if (gone) return; gone = true; t.classList.add('out'); setTimeout(() => t.remove(), 260); };
  if (action) $('button', t).addEventListener('click', () => { onAction && onAction(); kill(); });
  setTimeout(kill, ms);
}

export function hearts(btn) {
  if (reduced()) return;
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
    const d = 34 + Math.random() * 22;
    const s = document.createElement('span');
    s.className = 'burst';
    s.style.left = cx + 'px'; s.style.top = cy + 'px';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    const size = 8 + Math.random() * 8;
    s.style.width = s.style.height = size + 'px';
    s.style.color = ['#D6336C', 'var(--hl)', 'var(--accent)'][i % 3];
    s.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 20.6s-8.2-5-8.2-11a4.8 4.8 0 0 1 8.2-3.3 4.8 4.8 0 0 1 8.2 3.3c0 6-8.2 11-8.2 11z"/></svg>';
    document.body.append(s);
    setTimeout(() => s.remove(), 750);
  }
}

// coriandoli su canvas, nei colori del tema
export const confetti = (() => {
  let parts = [], raf = 0, cv, ctx;
  function colors() {
    const cs = getComputedStyle(document.documentElement);
    return ['--accent', '--accent-2', '--hl', '--t-anime', '--t-vn', '--t-book'].map((v) => cs.getPropertyValue(v).trim() || '#C8141F');
  }
  function star(c, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2; const rr = i % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  function loop() {
    const dpr = devicePixelRatio || 1;
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
    for (const p of parts) {
      p.vy += p.g; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 30);
      ctx.translate(p.x * dpr, p.y * dpr); ctx.rotate(p.r); ctx.scale(dpr, dpr * Math.abs(Math.cos(p.r * 0.7)) + 0.2);
      ctx.fillStyle = p.c;
      if (p.s === 0) ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      else if (p.s === 1) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2.4, 0, Math.PI * 2); ctx.fill(); }
      else star(ctx, p.w / 1.6);
      ctx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(loop);
    else { raf = 0; ctx.clearRect(0, 0, cv.width, cv.height); }
  }
  return function ({ from, n = 120 } = {}) {
    if (reduced()) return;
    cv = cv || $('#fx'); ctx = ctx || cv.getContext('2d');
    const dpr = devicePixelRatio || 1;
    if (cv.width !== innerWidth * dpr || cv.height !== innerHeight * dpr) { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
    let x = innerWidth / 2, y = innerHeight * 0.35;
    if (from && from.getBoundingClientRect) { const r = from.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    const cols = colors();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const sp = 6 + Math.random() * 10;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.32 + Math.random() * 0.12, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35, w: 7 + Math.random() * 6, h: 4 + Math.random() * 4, c: cols[i % cols.length], s: i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0, life: 110 + Math.random() * 50 });
    }
    if (!raf) raf = requestAnimationFrame(loop);
  };
})();

// tooltip condiviso per i grafici
export const tip = (() => {
  let el = null, hideT = null;
  function show(target) {
    const text = target.dataset.tip; if (!text) return;
    if (!el) { el = document.createElement('div'); el.className = 'tip'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = text;
    const r = target.getBoundingClientRect();
    el.style.left = Math.max(80, Math.min(innerWidth - 80, r.left + r.width / 2)) + 'px';
    el.style.top = r.top + 'px';
    el.hidden = false;
    $$('.hl').forEach((n) => n.classList.remove('hl'));
    target.classList.add('hl');
  }
  function hide() { if (el) el.hidden = true; $$('.hl').forEach((n) => n.classList.remove('hl')); }
  document.addEventListener('pointerover', (e) => { const t = e.target.closest?.('[data-tip]'); if (t && e.pointerType === 'mouse') show(t); });
  document.addEventListener('pointerout', (e) => { const t = e.target.closest?.('[data-tip]'); if (t && e.pointerType === 'mouse' && !t.contains(e.relatedTarget)) hide(); });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest?.('[data-tip]');
    if (t && e.pointerType !== 'mouse') { show(t); clearTimeout(hideT); hideT = setTimeout(hide, 2200); } else if (!t) hide();
  });
  addEventListener('scroll', hide, { passive: true });
  return { hide };
})();
