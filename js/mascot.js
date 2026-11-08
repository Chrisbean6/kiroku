// Kuro, il gatto nero (in più pose), e il fantasmino con la candela.
import { KURO, KURO_BOOKS, KURO_SIT, KURO_SLEEP } from './art.js';

// Kuro che si affaccia (barra in basso, impostazioni)
export const kuro = () => KURO;
// Kuro in posa: 'books' (sulla pila di libri, in testata), 'sit' (seduto), 'sleep' (acciambellato)
const POSES = { books: KURO_BOOKS, sit: KURO_SIT, sleep: KURO_SLEEP };
export const kuroPose = (pose = 'sit') => POSES[pose] || KURO_SIT;
export const kuroBox = (pose = 'sit', cls = '') => `<div class="mascot kuro-m kuro-${pose} ${cls}">${kuroPose(pose)}</div>`;

// fantasmino con la candela
export const ghost = (cls = '') => `
<svg class="ghost ${cls}" viewBox="0 0 160 170" aria-hidden="true">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE7A3" stop-opacity=".95"/><stop offset=".35" stop-color="#F7C65A" stop-opacity=".45"/><stop offset="1" stop-color="#F7C65A" stop-opacity="0"/></radialGradient>
    <linearGradient id="sheet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#CFE3EA"/><stop offset=".6" stop-color="#A9C4D0"/><stop offset="1" stop-color="#EAD9A6"/></linearGradient>
    <filter id="soft"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter>
  </defs>
  <circle class="g-glow" cx="124" cy="62" r="38" fill="url(#glow)"/>
  <g class="g-body" filter="url(#soft)">
    <path d="M44 150 C30 130 26 96 34 66 C42 34 90 26 104 60 C110 76 112 92 118 104 C126 108 128 112 122 116 C114 116 110 112 112 132 C114 146 104 158 92 150 C86 160 74 160 68 150 C60 160 50 158 44 150 Z" fill="url(#sheet)" opacity=".92"/>
    <path d="M52 140 C50 118 50 96 56 80" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M78 146 C76 126 78 104 84 92" stroke="#fff" stroke-width="2" fill="none" opacity=".4"/>
  </g>
  <ellipse cx="62" cy="68" rx="6" ry="9" fill="#120C0E"/><ellipse cx="84" cy="66" rx="6" ry="9" fill="#120C0E"/>
  <g class="g-candle">
    <rect x="119" y="64" width="9" height="22" rx="2" fill="#EFE6D4"/>
    <path d="M114 88 h19 l-3 5 h-13 z" fill="#3A2A22"/>
    <path class="g-flame" d="M123.5 50 C127 56 128.5 59 123.5 64 C118.5 59 120 56 123.5 50 Z" fill="#FFD25C"/>
  </g>
</svg>`;
