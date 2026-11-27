// Generative marks: real letter outlines from the brand's own name, transformed by rules
// (cut, knock out, interlock, repeat, halftone…) with a random seed per brand.
// No AI cost, no menus: two brands never get the same mark.
import opentype from 'opentype.js';
import fraunces from '@fontsource/fraunces/files/fraunces-latin-700-normal.woff?url';
import abril from '@fontsource/abril-fatface/files/abril-fatface-latin-400-normal.woff?url';
import unbounded from '@fontsource/unbounded/files/unbounded-latin-700-normal.woff?url';
import bricolage from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff?url';
import syne from '@fontsource/syne/files/syne-latin-700-normal.woff?url';
import shrikhand from '@fontsource/shrikhand/files/shrikhand-latin-400-normal.woff?url';
import grotesk from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url';
import dmserif from '@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff?url';
import bebas from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff?url';
import young from '@fontsource/young-serif/files/young-serif-latin-400-normal.woff?url';

export const GEN_FONTS = { fraunces, abril, unbounded, bricolage, syne, shrikhand, grotesk, dmserif, bebas, young };
export const GEN_FONT_LABELS = { fraunces: 'Soft serif', abril: 'Fat serif', unbounded: 'Wide', bricolage: 'Quirky', syne: 'Art-school', shrikhand: 'Retro', grotesk: 'Geometric', dmserif: 'Classic', bebas: 'Condensed', young: 'Warm' };
export const GEN_KINDS = { knock: 'Cut-out', stencil: 'Stencil', interlock: 'Interlock', cut: 'Sliced', radial: 'Rosette', inline: 'Inline', dots: 'Halftone', extrude: '3D shadow' };
const fonts = {};
let loading = null;
export const genReady = () => Object.keys(fonts).length > 0;
export function loadGenFonts() {
  if (loading) return loading;
  loading = Promise.all(Object.entries(GEN_FONTS).map(async ([k, url]) => {
    try { fonts[k] = opentype.parse(await (await fetch(url)).arrayBuffer()); } catch (e) { console.warn('genmark font', k, e); }
  }));
  return loading;
}

export function rng(seed) { let v = (seed >>> 0) || 9; return () => ((v = (v * 1664525 + 1013904223) >>> 0) / 4294967296); }
export const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// a letter as an SVG path in a 100×100 box (cap height ≈ 70, centred)
const gcache = new Map();
function glyph(fontKey, ch) {
  const key = fontKey + ch; if (gcache.has(key)) return gcache.get(key);
  const f = fonts[fontKey] || Object.values(fonts)[0]; if (!f) return null;
  const capH = (f.tables.os2?.sCapHeight || f.unitsPerEm * 0.7) / f.unitsPerEm;
  const size = 70 / capH, p = f.getPath(ch, 0, 0, size), bb = p.getBoundingBox();
  const dx = 50 - (bb.x1 + bb.x2) / 2, dy = 50 - (bb.y1 + bb.y2) / 2;
  for (const c of p.commands) { for (const k of ['x', 'y', 'x1', 'y1', 'x2', 'y2']) if (c[k] != null) c[k] += k.startsWith('x') ? dx : dy; }
  const out = { d: p.toPathData(2), w: bb.x2 - bb.x1, h: bb.y2 - bb.y1 };
  gcache.set(key, out); return out;
}
const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const band = (cx, cy, len, w, ang) => { const c = Math.cos(ang), s = Math.sin(ang), hx = len / 2, hy = w / 2; const P = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]); return `M${P.map((p) => p.map((v) => v.toFixed(2)).join(' ')).join('L')}z`; };
const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];

export function initials(name) {
  const w = String(name || 'B').replace(/^the\s+/i, '').replace(/[^A-Za-z\s&]/g, '').split(/\s+/).filter((x) => x && x !== '&');
  if (!w.length) return 'B';
  return w.length > 1 ? (w[0][0] + w[1][0]).toUpperCase() : w[0][0].toUpperCase() + (w[0][1] || '').toUpperCase();
}

// draw a generated mark into a logo Scene, centred at cx,cy, `size` wide
export function drawGen(sc, gen, cx, cy, size, c1, c2) {
  const R = rng(gen.seed), k = size / 100, base = [k, 0, 0, k, cx - 50 * k, cy - 50 * k];
  const L = (gen.letters || 'B').replace(/[^A-Z]/gi, '') || 'B', a = glyph(gen.font, L[0]), b = glyph(gen.font, L[1] || L[0]);
  if (!a) { sc.path(circ(50, 50, 40), { tf: base, fill: c1 }); return; }
  const T = (m) => mul(base, m), S = (s, x = 50, y = 50) => [s, 0, 0, s, x - 50 * s, y - 50 * s];
  const kind = gen.kind;
  if (kind === 'knock') {
    const shapes = ['circle', 'square', 'arch', 'hex'], sh = gen.shape || shapes[Math.floor(R() * 4)];
    const d = sh === 'circle' ? circ(50, 50, 48) : sh === 'square' ? 'M14 2h72a12 12 0 0 1 12 12v72a12 12 0 0 1-12 12H14A12 12 0 0 1 2 86V14A12 12 0 0 1 14 2z' : sh === 'arch' ? 'M8 98V48a42 42 0 0 1 84 0v50z' : 'M50 1l43 25v48L50 99 7 74V26z';
    sc.path(d, { tf: base, fill: c1 });
    sc.erase(a.d, { tf: T(S(0.66, 50, sh === 'arch' ? 56 : 50)), fill: '#000' });
  } else if (kind === 'stencil') {
    sc.path(a.d, { tf: base, fill: c1 });
    const ang = [0, Math.PI / 2, -0.35, 0.35][Math.floor(R() * 4)], n = 1 + Math.floor(R() * 2);
    for (let i = 0; i < n; i++) sc.erase(band(50, 30 + R() * 40, 160, 3.2 + R() * 2.5, ang), { tf: base, fill: '#000' });
  } else if (kind === 'interlock') {
    const off = 11 + R() * 6, s = 0.72;
    sc.path(a.d, { tf: T(S(s, 50 - off, 50)), fill: c1 });
    sc.erase(b.d, { tf: T(S(s, 50 + off, 50 + (R() - 0.5) * 8)), stroke: '#000', lw: 9 / s, fill: '#000' });
    sc.path(b.d, { tf: T(S(s, 50 + off, 50 + (R() - 0.5) * 8)), fill: c2 });
  } else if (kind === 'cut') { // a clean slice or a bite taken out — always inside the letter
    sc.path(a.d, { tf: base, fill: c1 });
    if (R() < 0.5) { const sx = R() < 0.5 ? -1 : 1, sy = R() < 0.5 ? -1 : 1; sc.erase(circ(50 + sx * a.w * 0.42, 50 + sy * a.h * 0.42, Math.min(a.w, a.h) * (0.22 + R() * 0.1)), { tf: base, fill: '#000' }); }
    else sc.erase(band(50, 50 + (R() - 0.5) * a.h * 0.3, Math.max(a.w, a.h) * 1.1, 4.5 + R() * 2.5, -0.5 - R() * 0.4), { tf: base, fill: '#000' });
  } else if (kind === 'radial') {
    const n = 4 + Math.floor(R() * 3), s = 0.27 + R() * 0.04, rad = 30;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2, c = Math.cos(th), si = Math.sin(th);
      const m = mul([1, 0, 0, 1, 50, 50], mul([c, si, -si, c, 0, 0], mul([1, 0, 0, 1, 0, -rad], [s, 0, 0, s, -50 * s, -50 * s])));
      sc.path(a.d, { tf: T(m), fill: i % 2 && c2 !== c1 && R() < 0.5 ? c2 : c1 });
    }
    sc.path(circ(50, 50, 6 + R() * 4), { tf: base, fill: c2 });
  } else if (kind === 'inline') {
    sc.path(a.d, { tf: base, fill: c1, stroke: c1, lw: 9 });
    sc.erase(a.d, { tf: base, stroke: '#000', lw: 4.2 });
  } else if (kind === 'dots') {
    const S2 = 120, cv = document.createElement('canvas'); cv.width = cv.height = S2; const g = cv.getContext('2d', { willReadFrequently: true });
    g.scale(S2 / 100, S2 / 100); g.fill(new Path2D(a.d)); const px = g.getImageData(0, 0, S2, S2).data;
    const st = 5.2 + R() * 1.6; let d = '';
    for (let y = st / 2; y < 100; y += st) for (let x = st / 2 + ((y / st) % 2 ? st / 2 : 0); x < 100; x += st) {
      let cov = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = Math.round(((x + i * st / 3) * S2) / 100), Y = Math.round(((y + j * st / 3) * S2) / 100); if (X >= 0 && Y >= 0 && X < S2 && Y < S2 && px[(Y * S2 + X) * 4 + 3] > 128) cov++; }
      if (cov) d += circ(x, y, (st * 0.5) * Math.sqrt(cov / 9));
    }
    sc.path(d || circ(50, 50, 30), { tf: base, fill: c1 });
  } else { // extrude
    const ang = R() * Math.PI * 2, steps = 7;
    for (let i = steps; i > 0; i--) sc.path(a.d, { tf: T([1, 0, 0, 1, Math.cos(ang) * i * 1.3, Math.sin(ang) * i * 1.3]), fill: c2 });
    sc.path(a.d, { tf: base, fill: c1 });
  }
}

// a set of generated marks for one brand (different kinds and fonts)
export function genMarks(name, seed, n = 4, prefs = {}) {
  const R = rng(seed), kinds = Object.keys(GEN_KINDS), fk = Object.keys(GEN_FONTS);
  const bold = prefs.bold > 0.2, playful = prefs.serious < -0.2, classic = prefs.modern < -0.2;
  const pref = fk.filter((f) => (classic ? ['fraunces', 'abril', 'dmserif', 'young'].includes(f) : playful ? ['shrikhand', 'bricolage', 'young', 'syne'].includes(f) : bold ? ['unbounded', 'bebas', 'abril', 'syne'].includes(f) : true));
  const ks = [...kinds].sort(() => R() - 0.5), out = [];
  const L = initials(name);
  for (let i = 0; i < n; i++) {
    const kind = ks[i % ks.length];
    out.push({ kind, font: (pref.length ? pref : fk)[Math.floor(R() * (pref.length || fk.length))], letters: kind === 'interlock' ? (L.length > 1 ? L : L + L) : L[0], seed: Math.floor(R() * 1e9) });
  }
  return out;
}
