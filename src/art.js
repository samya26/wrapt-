// Everything 2D: colour maths, fonts, patterns, borders, logos, label layouts, templates.
// The label is painted on a canvas from a "brand" object (the design plan), then wrapped onto 3D.

// ---------- colour ----------
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export function toRgb(h) { const n = parseInt(String(h).replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const luminance = (h) => { const [r, g, b] = toRgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
export const contrast = (a, b) => { const A = luminance(a), B = luminance(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); };
export const isDark = (h) => luminance(h) < 0.2;
export function mix(a, b, t) { const A = toRgb(a), B = toRgb(b); return hex(...A.map((v, i) => v + (B[i] - v) * t)); }
export const autoInk = (bg) => (contrast(bg, '#1c1a17') >= contrast(bg, '#fbf7ef') ? '#1c1a17' : '#fbf7ef');
// Nudge a colour lighter/darker until it reads on a background.
export function readable(col, bg, min = 3) {
  let c = col;
  const towards = isDark(bg) ? '#ffffff' : '#000000';
  for (let i = 0; i < 12 && contrast(c, bg) < min; i++) c = mix(c, towards, 0.15);
  return c;
}

// k-means (k=5) on a 64×64 copy of the image → main colours, most common first.
export function extractPalette(img) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64).data, px = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 160) px.push([d[i], d[i + 1], d[i + 2]]);
  if (px.length < 20) return ['#2b2520', '#d9a35b'];
  let cs = Array.from({ length: 5 }, (_, i) => px[Math.floor((i / 5) * px.length)]);
  for (let it = 0; it < 10; it++) {
    const sums = cs.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let bi = 0, bd = 1e9;
      cs.forEach((c2, i) => { const dd = (p[0] - c2[0]) ** 2 + (p[1] - c2[1]) ** 2 + (p[2] - c2[2]) ** 2; if (dd < bd) { bd = dd; bi = i; } });
      const s = sums[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    }
    cs = sums.map((s, i) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3], s[3]] : [...cs[i], 0]));
  }
  cs.sort((a, b) => b[3] - a[3]);
  const cols = cs.filter((c2) => c2[3] > 0).map((c2) => hex(c2[0], c2[1], c2[2]));
  const main = cols[0];
  const accent = cols.slice(1).sort((a, b) => contrast(b, main) - contrast(a, main))[0] || autoInk(main);
  return [main, accent, ...cols.slice(1)];
}
// Average colour of the visible pixels of an image (used by the design audit).
export function averageColor(img) {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, 48, 48);
  const d = g.getImageData(0, 0, 48, 48).data; let r = 0, gg = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 160) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
  return n ? hex(r / n, gg / n, b / n) : '#888888';
}

// ---------- fonts ----------
export const FONTS = {
  'Instrument Serif': { w: 400, label: 'Elegant serif' },
  'DM Serif Display': { w: 400, label: 'Bold serif' },
  'Bebas Neue': { w: 400, label: 'Condensed' },
  'Space Grotesk': { w: null, label: 'Modern' },
  Inter: { w: null, label: 'Clean sans' },
  Caveat: { w: 600, label: 'Handwritten' },
  'Tiro Devanagari Hindi': { w: 400, label: 'Hindi serif' },
  Mukta: { w: null, label: 'Hindi sans' },
};
export const fontWeight = (f, w) => FONTS[f]?.w ?? (w >= 700 ? 700 : w >= 600 ? 600 : w >= 500 ? 500 : 400);
export const fontCss = (f, w, size, italic = false) => `${italic && f === 'Instrument Serif' ? 'italic ' : ''}${fontWeight(f, w)} ${size}px "${f}", "Mukta", "Tiro Devanagari Hindi", sans-serif`;
export async function loadFonts(...families) {
  await Promise.all(families.filter(Boolean).flatMap((f) => [400, 600, 700].map((w) => document.fonts.load(fontCss(f, w, 40)).catch(() => {}))));
}

// ---------- images ----------
export function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

// ---------- icons (24×24 line drawings) for generated logos ----------
export const ICONS = {
  none: '',
  leaf: 'M5 19C5 10 11 5 19 5c0 9-6 14-14 14zM5 19l9-9',
  cup: 'M5 10h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 11h1.5a2 2 0 0 1 0 4H16M8.5 3.5c-1 1 1 2 0 3.5M12 3.5c-1 1 1 2 0 3.5',
  chili: 'M18 6c-1 7-6 12-13 13 3-3 6-6 8-11M18 6l2-2M17 5c-1-1-3-1-4 1',
  drop: 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  flower: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM12 9c-2-4 2-6 2-6s3 3-2 6M15 12c4-2 6 2 6 2s-3 3-6-2M12 15c2 4-2 6-2 6s-3-3 2-6M9 12c-4 2-6-2-6-2s3-3 6 2',
  wheat: 'M12 21V5M12 8c-3 0-4-3-4-3s3 0 4 3c1-3 4-3 4-3s-1 3-4 3M12 12c-3 0-4-3-4-3s3 0 4 3c1-3 4-3 4-3s-1 3-4 3M12 16c-3 0-4-3-4-3s3 0 4 3c1-3 4-3 4-3s-1 3-4 3',
  cake: 'M4 20h16v-7H4zM4 15c2 1 3 1 4 0s3-1 4 0 3 1 4 0 3-1 4 0M12 13V9M12 6.5c-.8-.8 0-2 0-2s.8 1.2 0 2',
  bean: 'M8 4c5-2 11 3 11 9s-6 9-11 7S3 13 4 9s2-4 4-5zM9 5c3 4 3 10 1 14',
  fruit: 'M12 7c-4 0-7 3-7 7s3 7 7 7 7-3 7-7-3-7-7-7zM12 7c0-2 1-4 3-4M12 7c-2-2-4-2-5-1',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.6A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
};
function drawIcon(g, name, cx, cy, size, color, lw = 1.6) {
  const p = ICONS[name]; if (!p) return;
  g.save(); g.translate(cx - size / 2, cy - size / 2); g.scale(size / 24, size / 24);
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = g.lineJoin = 'round';
  g.stroke(new Path2D(p)); g.restore();
}

// ---------- text helpers ----------
function text(g, str, x, y, size, color, { font = 'Inter', weight = 600, align = 'center', spacing = 0, italic = false, maxW = Infinity } = {}) {
  if (!str) return;
  g.save();
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
  let s = size;
  const set = () => { g.font = fontCss(font, weight, s, italic); if ('letterSpacing' in g) g.letterSpacing = `${spacing * (s / size)}px`; };
  set();
  while (g.measureText(str).width > maxW && s > size * 0.45) { s *= 0.93; set(); } // shrink to fit
  g.fillText(str, x, y);
  g.restore();
}
function arcText(g, str, cx, cy, r, color, font, size, { bottom = false, spacing = 1.08 } = {}) {
  g.save(); g.fillStyle = color; g.font = fontCss(font, 700, size); g.textAlign = 'center'; g.textBaseline = 'middle';
  const chars = [...str]; const widths = chars.map((ch) => g.measureText(ch).width * spacing);
  const total = widths.reduce((a, b) => a + b, 0); let a = (bottom ? Math.PI / 2 : -Math.PI / 2) + (bottom ? 1 : -1) * (-total / r / 2);
  chars.forEach((ch, i) => {
    const step = widths[i] / r; const mid = a + (bottom ? -1 : 1) * step / 2;
    g.save(); g.translate(cx + Math.cos(mid) * r, cy + Math.sin(mid) * r); g.rotate(mid + (bottom ? -Math.PI / 2 : Math.PI / 2));
    g.fillText(ch, 0, 0); g.restore();
    a += (bottom ? -1 : 1) * step;
  });
  g.restore();
}

// ---------- generated vector logo ----------
// spec = { shape, icon, monogram }, colours from the plan. Returns a transparent 800×800 canvas.
export const LOGO_SHAPES = ['badge', 'stamp', 'arch', 'monogram', 'wordmark', 'hexagon'];
export function makeLogo(b) {
  const S = 800, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const spec = b.logoSpec || {}; const shape = spec.shape || 'badge';
  const paperCol = paper(b);
  const bg = contrast(b.accent, paperCol) >= 1.8 ? b.accent : autoInk(paperCol);
  const fg = autoInk(bg) === '#1c1a17' ? mix(bg, '#000000', 0.82) : mix(bg, '#ffffff', 0.9);
  const disp = b.fonts?.display || 'DM Serif Display';
  const name = (b.name || 'Brand').trim();
  const mono = (spec.monogram || name.split(/\s+/).map((w) => [...w][0]).join('').slice(0, 2)).toUpperCase();
  const cx = S / 2, cy = S / 2;
  g.lineJoin = 'round';
  const nameFit = (maxW, size, y, col = fg, f = disp) => text(g, name, cx, y, size, col, { font: f, weight: 700, maxW });

  if (shape === 'badge' || shape === 'stamp') {
    g.fillStyle = bg; g.beginPath();
    if (shape === 'stamp') { const n = 48; for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 372 : 392; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } }
    else g.arc(cx, cy, 390, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = fg; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 340, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, 200, 0, Math.PI * 2); g.stroke();
    arcText(g, name.toUpperCase(), cx, cy, 270, fg, disp === 'Caveat' ? 'Inter' : disp, name.length > 16 ? 50 : 62);
    if (b.tagline) arcText(g, b.tagline.toUpperCase().slice(0, 28), cx, cy, 274, fg, 'Inter', 32, { bottom: true, spacing: 1.25 });
    if (spec.icon && spec.icon !== 'none') { drawIcon(g, spec.icon, cx, cy - 40, 170, fg, 1.5); text(g, mono, cx, cy + 100, 64, fg, { font: disp, weight: 700 }); }
    else text(g, mono, cx, cy + 8, 170, fg, { font: disp, weight: 700 });
    for (const sx of [-1, 1]) drawIcon(g, 'star', cx + sx * 300, cy, 28, fg, 2);
  } else if (shape === 'arch') {
    g.fillStyle = bg; g.beginPath(); g.moveTo(130, 760); g.lineTo(130, 330); g.arc(cx, 330, 270, Math.PI, 0); g.lineTo(670, 760); g.closePath(); g.fill();
    g.strokeStyle = fg; g.lineWidth = 5; g.beginPath(); g.moveTo(165, 725); g.lineTo(165, 335); g.arc(cx, 335, 235, Math.PI, 0); g.lineTo(635, 725); g.closePath(); g.stroke();
    drawIcon(g, spec.icon && spec.icon !== 'none' ? spec.icon : 'star', cx, 330, 180, fg, 1.4);
    nameFit(420, 96, 560);
    if (b.tagline) text(g, b.tagline.toUpperCase(), cx, 650, 30, fg, { font: 'Inter', weight: 600, spacing: 4, maxW: 400 });
  } else if (shape === 'monogram') {
    g.fillStyle = bg; g.beginPath(); g.roundRect(120, 120, 560, 560, 90); g.fill();
    g.strokeStyle = fg; g.lineWidth = 4; g.beginPath(); g.roundRect(150, 150, 500, 500, 70); g.stroke();
    text(g, mono, cx, 360, 260, fg, { font: disp, weight: 700 });
    nameFit(420, 52, 560, fg, 'Inter');
  } else if (shape === 'hexagon') {
    g.fillStyle = bg; g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; g.lineTo(cx + Math.cos(a) * 380, cy + Math.sin(a) * 380); } g.closePath(); g.fill();
    g.strokeStyle = fg; g.lineWidth = 5; g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; g.lineTo(cx + Math.cos(a) * 335, cy + Math.sin(a) * 335); } g.closePath(); g.stroke();
    if (spec.icon && spec.icon !== 'none') drawIcon(g, spec.icon, cx, cy - 80, 150, fg, 1.5);
    nameFit(440, 84, cy + 70);
    if (b.tagline) text(g, b.tagline.toUpperCase(), cx, cy + 160, 28, fg, { font: 'Inter', weight: 600, spacing: 4, maxW: 380 });
  } else {
    // wordmark: no container; ink colour chosen against the pack so it always reads
    const col = readable(b.accent, paperCol, 3);
    if (spec.icon && spec.icon !== 'none') drawIcon(g, spec.icon, cx, 230, 150, col, 1.5);
    nameFit(720, 170, 430, col);
    g.strokeStyle = col; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(260, 540); g.quadraticCurveTo(cx, 575, 540, 540); g.stroke();
    if (b.tagline) text(g, b.tagline.toUpperCase(), cx, 620, 34, col, { font: 'Inter', weight: 600, spacing: 5, maxW: 640 });
  }
  return c;
}

// ---------- patterns (procedural tiles) ----------
export const PATTERNS = {
  none: 'None', rangoli: 'Rangoli / kolam', warli: 'Warli', madhubani: 'Madhubani', kalamkari: 'Kalamkari paisley',
  blockprint: 'Block-print booti', botanical: 'Botanical', dots: 'Polka dots', stripes: 'Stripes', chevron: 'Chevron',
};
const tileCache = new Map();
function tile(type, color, image) {
  const key = type + color + (image ? image.src || 'img' : '');
  if (tileCache.has(key)) return tileCache.get(key);
  const T = 160, c = document.createElement('canvas'); c.width = c.height = T;
  const g = c.getContext('2d');
  g.strokeStyle = g.fillStyle = color; g.lineWidth = 2.4; g.lineCap = g.lineJoin = 'round';
  const circle = (x, y, r, fill = false) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); fill ? g.fill() : g.stroke(); };
  if (type === 'image' && image) { g.drawImage(image, 0, 0, T, T); }
  if (type === 'dots') { circle(40, 40, 9, true); circle(120, 120, 9, true); }
  if (type === 'stripes') { g.lineWidth = 12; for (let i = -T; i < T * 2; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + T, T); g.stroke(); } }
  if (type === 'chevron') { g.lineWidth = 6; for (const y of [30, 110]) { g.beginPath(); for (let x = 0; x <= T; x += 40) g.lineTo(x, y + (x / 40) % 2 * 24); g.stroke(); } }
  if (type === 'rangoli') {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) circle(20 + i * 40, 20 + j * 40, 3.5, true);
    for (const [x, y] of [[40, 40], [120, 120], [120, 40], [40, 120]]) { g.beginPath(); g.moveTo(x, y - 30); g.quadraticCurveTo(x + 30, y - 30, x + 30, y); g.quadraticCurveTo(x + 30, y + 30, x, y + 30); g.quadraticCurveTo(x - 30, y + 30, x - 30, y); g.quadraticCurveTo(x - 30, y - 30, x, y - 30); g.stroke(); }
  }
  if (type === 'warli') {
    const fig = (x, y, s = 1) => {
      circle(x, y - 26 * s, 6 * s, true);
      g.beginPath(); g.moveTo(x - 10 * s, y - 18 * s); g.lineTo(x + 10 * s, y - 18 * s); g.lineTo(x, y - 4 * s); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x, y - 4 * s); g.lineTo(x - 10 * s, y + 10 * s); g.lineTo(x + 10 * s, y + 10 * s); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x - 10 * s, y - 17 * s); g.lineTo(x - 20 * s, y - 6 * s); g.moveTo(x + 10 * s, y - 17 * s); g.lineTo(x + 20 * s, y - 6 * s);
      g.moveTo(x - 4 * s, y + 10 * s); g.lineTo(x - 9 * s, y + 22 * s); g.moveTo(x + 4 * s, y + 10 * s); g.lineTo(x + 9 * s, y + 22 * s); g.stroke();
    };
    fig(40, 60); fig(80, 60); fig(120, 60);
    g.beginPath(); g.moveTo(0, 90); g.lineTo(T, 90); g.stroke();
    for (let x = 10; x < T; x += 20) { g.beginPath(); g.moveTo(x, 120); g.lineTo(x + 10, 135); g.lineTo(x + 20, 120); g.stroke(); }
  }
  if (type === 'madhubani') {
    const fish = (x, y, dir) => {
      g.save(); g.translate(x, y); g.scale(dir, 1);
      for (const k of [1, 0.75]) { g.beginPath(); g.ellipse(0, 0, 34 * k, 15 * k, 0, 0, Math.PI * 2); g.stroke(); }
      g.beginPath(); g.moveTo(32, 0); g.lineTo(50, -14); g.lineTo(50, 14); g.closePath(); g.stroke();
      circle(-20, -3, 3, true);
      for (let i = -10; i < 22; i += 7) { g.beginPath(); g.moveTo(i, -8); g.lineTo(i + 4, 0); g.lineTo(i, 8); g.stroke(); }
      g.restore();
    };
    fish(50, 45, 1); fish(110, 120, -1);
  }
  if (type === 'kalamkari') {
    const paisley = (x, y, s, r) => {
      g.save(); g.translate(x, y); g.rotate(r); g.scale(s, s);
      const p = 'M0 30C-22 30-30 10-24-6-18-22 2-30 14-22 26-14 22 4 10 4 2 4-2-4 4-10';
      g.stroke(new Path2D(p)); g.save(); g.scale(0.62, 0.62); g.translate(-4, 10); g.stroke(new Path2D(p)); g.restore();
      for (let a = 0; a < 6; a++) circle(Math.cos(a) * 36 - 4, Math.sin(a) * 36 + 4, 2, true);
      g.restore();
    };
    paisley(45, 45, 1, 0.3); paisley(118, 118, 1, -2.6);
  }
  if (type === 'blockprint') {
    const booti = (x, y) => { for (let a = 0; a < 6; a++) { g.save(); g.translate(x, y); g.rotate((a * Math.PI) / 3); g.beginPath(); g.ellipse(0, -11, 5, 10, 0, 0, Math.PI * 2); g.fill(); g.restore(); } g.save(); g.fillStyle = 'rgba(0,0,0,0)'; g.restore(); };
    booti(40, 40); booti(120, 120);
    circle(120, 40, 4, true); circle(40, 120, 4, true);
  }
  if (type === 'botanical') {
    const sprig = (x, y, r) => {
      g.save(); g.translate(x, y); g.rotate(r);
      g.beginPath(); g.moveTo(0, 30); g.quadraticCurveTo(4, 0, 0, -30); g.stroke();
      for (const [ly, side] of [[-18, 1], [-4, -1], [10, 1]]) { g.save(); g.translate(1, ly); g.rotate(side * 0.8); g.beginPath(); g.ellipse(side * 9, 0, 9, 4.5, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      g.restore();
    };
    sprig(42, 48, 0.4); sprig(118, 118, -0.5);
  }
  tileCache.set(key, c);
  return c;
}
function paintPattern(g, x, y, w, h, b, s) {
  const p = b.pattern; if (!p || p.type === 'none') return;
  const col = p.color || (isDark(paper(b)) ? mix(paper(b), '#ffffff', 0.5) : mix(paper(b), b.accent, 0.8));
  const t = tile(p.type, col, p.image);
  const pat = g.createPattern(t, 'repeat');
  const k = (s / 700) * (p.scale || 1);
  pat.setTransform(new DOMMatrix().translate(x, y).scale(k, k));
  g.save(); g.globalAlpha = p.opacity ?? 0.18; g.fillStyle = pat;
  if (b.style === 'heritage') { g.fillRect(x, y, w, h * 0.2); g.fillRect(x, y + h * 0.8, w, h * 0.2); }
  else g.fillRect(x, y, w, h);
  g.restore();
}

// ---------- borders ----------
export const BORDERS = { none: 'None', double: 'Double rule', scallop: 'Scallop', temple: 'Temple', dots: 'Dotted', image: 'Your border' };
// 9-slice: corners keep their shape, edges stretch — so one border image fits any panel.
function nineSlice(g, img, x, y, w, h, t) {
  const sw = img.width / 3, sh = img.height / 3;
  const cols = [[0, x, t], [sw, x + t, w - 2 * t], [sw * 2, x + w - t, t]];
  const rows = [[0, y, t], [sh, y + t, h - 2 * t], [sh * 2, y + h - t, t]];
  for (const [sy, dy, dh] of rows) for (const [sx, dx, dw] of cols) {
    if (sx === sw && sy === sh) continue; // centre stays empty
    g.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
}
function paintBorder(g, x, y, w, h, b, s) {
  const br = b.border || {}; const type = br.type || 'none'; if (type === 'none') return;
  const col = br.color || b.accent;
  const pad = s * 0.045, t = s * (br.size || 0.06);
  g.save(); g.strokeStyle = g.fillStyle = col; g.lineCap = 'round';
  const X = x + pad, Y = y + pad, W = w - pad * 2, H = h - pad * 2;
  if (type === 'double') {
    g.lineWidth = Math.max(2, s * 0.008); g.strokeRect(X, Y, W, H);
    g.lineWidth = Math.max(1, s * 0.003); g.strokeRect(X + pad * 0.6, Y + pad * 0.6, W - pad * 1.2, H - pad * 1.2);
  } else if (type === 'dots') {
    g.setLineDash([0, s * 0.03]); g.lineWidth = s * 0.012; g.strokeRect(X, Y, W, H);
  } else if (type === 'scallop') {
    const r = s * 0.02; g.lineWidth = Math.max(1.5, s * 0.005);
    const edge = (x0, y0, x1, y1) => { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / (r * 2))); const ang = Math.atan2(y1 - y0, x1 - x0); for (let i = 0; i < n; i++) { const cx = x0 + ((i + 0.5) / n) * (x1 - x0), cy = y0 + ((i + 0.5) / n) * (y1 - y0); g.beginPath(); g.arc(cx, cy, len / n / 2, ang + Math.PI, ang + Math.PI * 2); g.stroke(); } };
    edge(X, Y, X + W, Y); edge(X + W, Y, X + W, Y + H); edge(X + W, Y + H, X, Y + H); edge(X, Y + H, X, Y);
  } else if (type === 'temple') {
    const th = s * 0.05, n = Math.max(4, Math.round(w / th));
    for (const [yy, dir] of [[y + pad * 0.4, 1], [y + h - pad * 0.4, -1]]) {
      g.beginPath(); for (let i = 0; i < n; i++) { const x0 = x + (i / n) * w, x1 = x + ((i + 1) / n) * w; g.moveTo(x0, yy); g.lineTo((x0 + x1) / 2, yy + dir * th); g.lineTo(x1, yy); } g.fill();
      g.fillRect(x, dir > 0 ? y : yy, w, pad * 0.4);
    }
  } else if (type === 'image' && br.image) {
    nineSlice(g, br.image, x + pad * 0.5, y + pad * 0.5, w - pad, h - pad, t);
  }
  g.restore();
}

// ---------- label layout ----------
function grain(g, w, h, amt = 6) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
export const paper = (b) => (b.style === 'minimal' ? mix(b.pack, '#ffffff', 0.9) : b.pack);
export const ink = (b) => (b.style === 'minimal' ? readable(b.pack, paper(b), 4.5) : b.ink || autoInk(paper(b)));
const accentOn = (b) => readable(b.accent, paper(b), 2.2);

function drawLogo(g, b, cx, cy, size) {
  const logo = b.logo; if (!logo) return;
  size *= b.logoScale ?? 1;
  if (b.logoPlate) {
    const plate = isDark(paper(b)) ? '#fbf6ee' : '#1c1a17';
    g.save(); g.fillStyle = plate; g.beginPath(); g.arc(cx, cy, size * 0.54, 0, Math.PI * 2); g.fill();
    g.strokeStyle = b.accent; g.lineWidth = size * 0.012; g.beginPath(); g.arc(cx, cy, size * 0.5, 0, Math.PI * 2); g.stroke(); g.restore();
    size *= 0.86;
  }
  const k = size / Math.max(logo.width, logo.height);
  g.drawImage(logo, cx - (logo.width * k) / 2, cy - (logo.height * k) / 2, logo.width * k, logo.height * k);
}

function paintPanel(g, x, y, w, h, role, b) {
  const s = Math.min(w, h), ts = b.textScale ?? 1;
  const disp = b.fonts?.display || 'Instrument Serif', body = b.fonts?.body || 'Inter';
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = paper(b); g.fillRect(x, y, w, h);
  paintPattern(g, x, y, w, h, b, s);
  const cx = x + w / 2, cy = y + h / 2, fg = ink(b), ac = accentOn(b);
  const ly = (b.logoY ?? 0) * h;
  const side = (str, size, col, opts) => { g.save(); g.translate(cx, cy); g.rotate(-Math.PI / 2); text(g, str, 0, 0, size, col, { maxW: h * 0.85, ...opts }); g.restore(); };

  if (b.style === 'bold') {
    g.fillStyle = b.accent;
    g.beginPath(); g.moveTo(x, y + h * 0.72); g.lineTo(x + w, y + h * 0.52); g.lineTo(x + w, y + h * 0.66); g.lineTo(x, y + h * 0.86); g.fill();
    if (role === 'front') {
      drawLogo(g, b, cx, y + h * 0.38 + ly, s * 0.8);
      text(g, b.tagline.toUpperCase(), cx, y + h * 0.93, s * 0.045 * ts, fg, { font: body, spacing: s * 0.006, maxW: w * 0.9 });
    } else if (role === 'back') {
      drawLogo(g, b, cx, y + h * 0.26, s * 0.36);
      text(g, b.tagline, cx, y + h * 0.48, s * 0.05 * ts, fg, { font: body, weight: 500, maxW: w * 0.85 });
      text(g, b.detail, cx, y + h * 0.94, s * 0.04 * ts, fg, { font: body, weight: 500, maxW: w * 0.85 });
    } else if (role === 'side') side(b.name.toUpperCase(), Math.min(w * 0.42, h * 0.11) * ts, fg, { font: disp, weight: 800, spacing: 4 });
    else drawLogo(g, b, cx, cy, s * 0.7);
  } else if (b.style === 'minimal') {
    g.fillStyle = b.accent; g.fillRect(x, y + h - h * 0.06, w, h * 0.06);
    if (role === 'front') {
      drawLogo(g, b, cx, y + h * 0.42 + ly, s * 0.42);
      text(g, b.name, cx, y + h * 0.72, s * 0.07 * ts, fg, { font: disp, weight: 400, maxW: w * 0.85 });
      text(g, b.detail.toUpperCase(), cx, y + h * 0.84, s * 0.032 * ts, mix(fg, paper(b), 0.35), { font: body, spacing: s * 0.006, maxW: w * 0.85 });
    } else if (role === 'back') {
      text(g, b.tagline, cx, y + h * 0.3, s * 0.06 * ts, fg, { font: disp, weight: 400, italic: true, maxW: w * 0.85 });
      text(g, b.detail, cx, y + h * 0.8, s * 0.035 * ts, mix(fg, paper(b), 0.35), { font: body, weight: 500, maxW: w * 0.85 });
    } else if (role === 'side') side(b.name, Math.min(w * 0.3, h * 0.08) * ts, fg, { font: disp, weight: 400 });
    else drawLogo(g, b, cx, cy, s * 0.5);
  } else if (b.style === 'heritage') {
    // pattern bands top & bottom, framed centre field with name in display type
    g.fillStyle = b.accent; g.fillRect(x, y + h * 0.2, w, s * 0.012); g.fillRect(x, y + h * 0.8 - s * 0.012, w, s * 0.012);
    if (role === 'front') {
      drawLogo(g, b, cx, y + h * 0.4 + ly, s * 0.38);
      text(g, b.name, cx, y + h * 0.6, s * 0.1 * ts, ac, { font: disp, weight: 700, maxW: w * 0.85 });
      text(g, b.tagline, cx, y + h * 0.7, s * 0.04 * ts, fg, { font: body, weight: 500, maxW: w * 0.85 });
    } else if (role === 'back') {
      text(g, b.tagline, cx, y + h * 0.42, s * 0.06 * ts, ac, { font: disp, weight: 700, maxW: w * 0.85 });
      text(g, b.detail, cx, y + h * 0.58, s * 0.04 * ts, fg, { font: body, weight: 500, maxW: w * 0.85 });
    } else if (role === 'side') side(b.name, Math.min(w * 0.35, h * 0.09) * ts, ac, { font: disp, weight: 700 });
    else drawLogo(g, b, cx, cy, s * 0.62);
  } else {
    // classic: centred logo, small caps
    if (role === 'front') {
      drawLogo(g, b, cx, y + h * 0.44 + ly, s * 0.6);
      text(g, b.tagline.toUpperCase(), cx, y + h * 0.8, s * 0.042 * ts, ac, { font: body, spacing: s * 0.008, maxW: w * 0.8 });
      text(g, b.detail, cx, y + h * 0.87, s * 0.034 * ts, fg, { font: body, weight: 500, maxW: w * 0.8 });
    } else if (role === 'back') {
      drawLogo(g, b, cx, y + h * 0.3, s * 0.32);
      text(g, b.tagline, cx, y + h * 0.52, s * 0.055 * ts, ac, { font: disp, weight: 400, italic: true, maxW: w * 0.8 });
      text(g, b.detail, cx, y + h * 0.64, s * 0.038 * ts, fg, { font: body, weight: 500, maxW: w * 0.8 });
    } else if (role === 'side') side(b.name.toUpperCase(), Math.min(w * 0.3, h * 0.08) * ts, ac, { font: disp, spacing: 6 });
    else drawLogo(g, b, cx, cy, s * 0.62);
  }
  if (role !== 'top') paintBorder(g, x, y, w, h, b, s);
  g.restore();
}

// Wrap-around label (can, tub, jar): front in the middle, back split across the seam.
export function paintWrap(b, aspect, W = 2048) {
  const H = Math.round(W / aspect);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (b.artwork) { g.drawImage(b.artwork, 0, 0, W, H); return c; }
  const panelW = W / 2;
  paintPanel(g, panelW / 2, 0, panelW, H, 'front', b);
  const tmp = document.createElement('canvas'); tmp.width = panelW; tmp.height = H;
  paintPanel(tmp.getContext('2d'), 0, 0, panelW, H, 'back', b);
  g.drawImage(tmp, panelW / 2, 0, panelW / 2, H, 0, 0, panelW / 2, H);
  g.drawImage(tmp, 0, 0, panelW / 2, H, W - panelW / 2, 0, panelW / 2, H);
  grain(g, W, H);
  return c;
}
// Round lid. Logo size is capped so it can never spill past the rim.
export function paintDisc(b, S = 1024) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = paper(b); g.fillRect(0, 0, S, S);
  paintPattern(g, 0, 0, S, S, { ...b, style: 'classic', pattern: b.pattern && { ...b.pattern, opacity: (b.pattern.opacity ?? 0.18) * 0.7 } }, S);
  g.strokeStyle = b.accent; g.lineWidth = S * 0.012;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.44, 0, Math.PI * 2); g.stroke();
  drawLogo(g, { ...b, logoScale: Math.min(b.logoScale ?? 1, 1) }, S / 2, S / 2, S * 0.58);
  return c;
}
export function paintFace(b, role, aspect, W = 1200) {
  const H = Math.round(W / aspect);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (b.artwork && role === 'front') { g.drawImage(b.artwork, 0, 0, W, H); return c; }
  paintPanel(g, 0, 0, W, H, role, b);
  grain(g, W, H);
  return c;
}
export function boxLayout(Wd, Hd, Dd, scale = 400) {
  const r = (x, y, w, h) => ({ x: x * scale, y: y * scale, w: w * scale, h: h * scale });
  return {
    width: Math.round((2 * Dd + 2 * Wd) * scale), height: Math.round((2 * Dd + Hd) * scale),
    left: r(0, Dd, Dd, Hd), front: r(Dd, Dd, Wd, Hd), right: r(Dd + Wd, Dd, Dd, Hd), back: r(2 * Dd + Wd, Dd, Wd, Hd),
    top: r(Dd, 0, Wd, Dd), bottom: r(Dd, Dd + Hd, Wd, Dd),
  };
}
export function paintBox(b, dims) {
  const L = boxLayout(dims.w, dims.h, dims.d);
  const c = document.createElement('canvas'); c.width = L.width; c.height = L.height;
  const g = c.getContext('2d');
  if (b.artwork) { g.drawImage(b.artwork, 0, 0, c.width, c.height); return { canvas: c, layout: L }; }
  g.fillStyle = '#c9a77c'; g.fillRect(0, 0, c.width, c.height);
  for (const [k, role] of [['front', 'front'], ['back', 'back'], ['left', 'side'], ['right', 'side'], ['top', 'top'], ['bottom', 'top']]) {
    const R = L[k]; paintPanel(g, R.x, R.y, R.w, R.h, role, b);
  }
  grain(g, c.width, c.height);
  return { canvas: c, layout: L };
}

export function templateFor(product, dims) {
  let c, g; const guides = [];
  if (product === 'box') {
    const L = boxLayout(dims.w, dims.h, dims.d, 600);
    c = document.createElement('canvas'); c.width = L.width; c.height = L.height; g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    for (const k of ['left', 'front', 'right', 'back', 'top', 'bottom']) guides.push([k.toUpperCase(), L[k]]);
  } else {
    const aspect = product === 'jar' ? (2 * Math.PI * dims.r) / (dims.h * 0.5) : product === 'pouch' ? dims.w / dims.h : (2 * Math.PI * dims.r) / dims.h;
    c = document.createElement('canvas'); c.width = 3000; c.height = Math.round(3000 / aspect); g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    if (product === 'pouch') guides.push(['FRONT', { x: 0, y: 0, w: c.width, h: c.height }]);
    else guides.push(['BACK (seam)', { x: 0, y: 0, w: c.width / 4, h: c.height }], ['FRONT', { x: c.width / 4, y: 0, w: c.width / 2, h: c.height }], ['BACK (seam)', { x: c.width * 0.75, y: 0, w: c.width / 4, h: c.height }]);
  }
  g.lineWidth = 4; g.setLineDash([24, 14]);
  for (const [label, R] of guides) {
    g.strokeStyle = '#ff4f8b'; g.strokeRect(R.x + 2, R.y + 2, R.w - 4, R.h - 4);
    g.fillStyle = 'rgba(255,79,139,.6)'; g.font = `600 ${Math.max(28, Math.min(R.w, R.h) * 0.08)}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, R.x + R.w / 2, R.y + R.h / 2);
  }
  g.setLineDash([]); g.fillStyle = '#999'; g.font = '500 28px Inter'; g.textAlign = 'left';
  g.fillText(`Wrapt template · ${product} · ${c.width}×${c.height}px · keep text 5% inside the dashed lines`, 24, c.height - 24);
  return c;
}
