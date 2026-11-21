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
// Share of the logo's square that is solid (a badge-style logo carries its own background).
export function logoCoverage(img) {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d'); const k = 48 / Math.max(img.width, img.height);
  g.drawImage(img, (48 - img.width * k) / 2, (48 - img.height * k) / 2, img.width * k, img.height * k);
  const d = g.getImageData(0, 0, 48, 48).data; let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++;
  return n / (48 * 48);
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
  Fraunces: { w: null, label: 'Soft serif' },
  'Cormorant Garamond': { w: null, label: 'Luxury serif' },
  Marcellus: { w: 400, label: 'Classic caps' },
  'Abril Fatface': { w: 400, label: 'Fat serif' },
  'Rozha One': { w: 400, label: 'Indian display' },
  'Young Serif': { w: 400, label: 'Warm serif' },
  Shrikhand: { w: 400, label: 'Retro bold' },
  'Baloo 2': { w: null, label: 'Rounded' },
  Unbounded: { w: null, label: 'Wide modern' },
  'Bricolage Grotesque': { w: null, label: 'Quirky sans' },
  Syne: { w: null, label: 'Art-school' },
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
export const BORDERS = { none: 'None', double: 'Double rule', arch: 'Arch window', ticket: 'Ticket', stamp: 'Postage stamp', crop: 'Crop marks', nameband: 'Name band', checker: 'Checker', wavy: 'Wavy line', stitched: 'Hand-stitched', torn: 'Torn paper', jali: 'Jali lattice', deco: 'Art deco', botanical: 'Botanical', bauhaus: 'Bauhaus', cutcorner: 'Cut corner', sticker: 'Sticker', image: 'Your border' };
export const BORDER_ALIAS = { scallop: 'wavy', temple: 'jali', dots: 'stitched' }; // old saves still load
export const CORNER_OK = ['double', 'stitched', 'cutcorner'];
export const borderType = (t) => BORDER_ALIAS[t] || (BORDERS[t] ? t : 'none');
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
function rng(seed) { let v = seed >>> 0 || 7; return () => ((v = (v * 1664525 + 1013904223) >>> 0) / 4294967296); }
function borderColor(b) {
  const br = b.border || {}, pap = paper(b);
  if (br.color === 'ink') return ink(b);
  if (br.color === 'gold') return isDark(pap) ? '#dcb872' : '#a9843c';
  return readable(b.accent, pap, 2.2);
}
// every corner in its own local frame: +x and +y point into the panel
function eachCorner(g, X, Y, W, H, draw) {
  for (const [cx, cy, sx, sy] of [[X, Y, 1, 1], [X + W, Y, -1, 1], [X, Y + H, 1, -1], [X + W, Y + H, -1, -1]]) {
    g.save(); g.translate(cx, cy); g.scale(sx, sy); draw(); g.restore();
  }
}
function paintBorder(g, x, y, w, h, b, s) {
  const br = b.border || {}; const type = br.type === 'image' ? 'image' : borderType(br.type); if (type === 'none') return;
  const col = borderColor(b), pap = paper(b);
  const k = (br.size ?? 0.06) / 0.06; // thickness multiplier
  const ins = s * (br.inset ?? 0.045);
  const X = x + ins, Y = y + ins, W = w - ins * 2, H = h - ins * 2;
  const lw = (f) => Math.max(1, s * f * k);
  const R = rng(Math.round(w * 7 + h * 13));
  g.save(); g.strokeStyle = g.fillStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
  if (br.corners && CORNER_OK.includes(type)) {
    const c = Math.min(W, H) * 0.24, p = ins;
    g.beginPath(); g.rect(X - p, Y - p, c + p, c + p); g.rect(X + W - c, Y - p, c + p, c + p); g.rect(X - p, Y + H - c, c + p, c + p); g.rect(X + W - c, Y + H - c, c + p, c + p); g.clip();
  }
  if (type === 'double') {
    g.lineWidth = lw(0.008); g.strokeRect(X, Y, W, H);
    const d = s * 0.02 * Math.sqrt(k); g.lineWidth = lw(0.0028); g.strokeRect(X + d, Y + d, W - 2 * d, H - 2 * d);
  } else if (type === 'arch') {
    const cx = x + w / 2, r = Math.min(W / 2, H * 0.42);
    const arch = (o) => { g.beginPath(); g.moveTo(cx - r + o, Y + H - o); g.lineTo(cx - r + o, Y + r); g.arc(cx, Y + r, r - o, Math.PI, 0); g.lineTo(cx + r - o, Y + H - o); g.closePath(); g.stroke(); };
    g.lineWidth = lw(0.007); arch(0); g.lineWidth = lw(0.0025); arch(s * 0.018 * Math.sqrt(k));
  } else if (type === 'ticket') {
    const rc = s * 0.05 * Math.sqrt(k), rn = s * 0.035 * Math.sqrt(k), P = Math.PI;
    g.lineWidth = lw(0.005); g.beginPath();
    g.moveTo(X + rc, Y); g.lineTo(X + W - rc, Y); g.arc(X + W, Y, rc, P, P / 2, true);
    g.lineTo(X + W, Y + H / 2 - rn); g.arc(X + W, Y + H / 2, rn, -P / 2, P / 2, true);
    g.lineTo(X + W, Y + H - rc); g.arc(X + W, Y + H, rc, -P / 2, P, true);
    g.lineTo(X + rc, Y + H); g.arc(X, Y + H, rc, 0, -P / 2, true);
    g.lineTo(X, Y + H / 2 + rn); g.arc(X, Y + H / 2, rn, P / 2, -P / 2, true);
    g.lineTo(X, Y + rc); g.arc(X, Y, rc, P / 2, 0, true); g.closePath(); g.stroke();
    const d = s * 0.022; g.lineWidth = lw(0.003); g.setLineDash([s * 0.012, s * 0.012]);
    g.beginPath(); g.moveTo(X + rc + d, Y + d); g.lineTo(X + W - rc - d, Y + d); g.moveTo(X + rc + d, Y + H - d); g.lineTo(X + W - rc - d, Y + H - d); g.stroke();
  } else if (type === 'stamp') {
    const t = s * 0.03 * k, rp = s * 0.011;
    g.beginPath(); g.rect(X, Y, W, H); g.rect(X + t, Y + t, W - 2 * t, H - 2 * t); g.fill('evenodd');
    g.fillStyle = pap;
    const edge = (x0, y0, x1, y1) => { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(3, Math.round(len / (rp * 2.8))); for (let i = 0; i <= n; i++) { g.beginPath(); g.arc(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, rp, 0, Math.PI * 2); g.fill(); } };
    edge(X, Y, X + W, Y); edge(X + W, Y, X + W, Y + H); edge(X, Y + H, X + W, Y + H); edge(X, Y, X, Y + H);
    g.strokeStyle = col; g.lineWidth = lw(0.0025); const d = t + s * 0.014; g.strokeRect(X + d, Y + d, W - 2 * d, H - 2 * d);
  } else if (type === 'crop') {
    const gp = s * 0.014, L = s * 0.08 * Math.sqrt(k); g.lineWidth = lw(0.0055);
    eachCorner(g, X, Y, W, H, () => { g.beginPath(); g.moveTo(gp, 0); g.lineTo(gp + L, 0); g.moveTo(0, gp); g.lineTo(0, gp + L); g.stroke(); });
    const r = s * 0.012; g.lineWidth = lw(0.0025); g.beginPath(); g.arc(x + w / 2, Y, r, 0, Math.PI * 2); g.moveTo(x + w / 2 - r * 1.8, Y); g.lineTo(x + w / 2 + r * 1.8, Y); g.moveTo(x + w / 2, Y - r * 1.8); g.lineTo(x + w / 2, Y + r * 1.8); g.stroke();
  } else if (type === 'nameband') {
    const bh = s * 0.06 * Math.sqrt(k), word = `${(b.name || 'Brand').toUpperCase()}   •   `;
    for (const [yy, off] of [[y + ins * 0.5, 0], [y + h - ins * 0.5 - bh, 0.5]]) {
      g.fillStyle = col; g.fillRect(x, yy, w, bh);
      g.fillStyle = autoInk(col) === '#1c1a17' ? mix(col, '#000', 0.75) : pap; g.font = fontCss(b.fonts?.body || 'Inter', 700, bh * 0.5); g.textBaseline = 'middle';
      if ('letterSpacing' in g) g.letterSpacing = `${bh * 0.1}px`;
      const ww = g.measureText(word).width; for (let xx = x - ww * off; xx < x + w; xx += ww) g.fillText(word, xx, yy + bh / 2);
    }
  } else if (type === 'checker') {
    const bh = s * 0.05 * Math.sqrt(k), q = bh / 2;
    for (const yy of [y + ins * 0.5, y + h - ins * 0.5 - bh]) for (let r = 0; r < 2; r++) for (let i = 0; x + i * q < x + w; i++) if ((i + r) % 2 === 0) g.fillRect(x + i * q, yy + r * q, q + 0.5, q + 0.5);
  } else if (type === 'wavy') {
    const a = s * 0.009 * Math.sqrt(k), wl = s * 0.07; g.lineWidth = lw(0.005); g.beginPath();
    const edge = (x0, y0, x1, y1, first) => { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / wl)), nx = -(y1 - y0) / len, ny = (x1 - x0) / len, steps = n * 16;
      for (let i = 0; i <= steps; i++) { const t = i / steps, o = a * Math.sin(Math.PI * 2 * n * t); const px = x0 + (x1 - x0) * t + nx * o, py = y0 + (y1 - y0) * t + ny * o; first && i === 0 ? g.moveTo(px, py) : g.lineTo(px, py); } };
    edge(X, Y, X + W, Y, true); edge(X + W, Y, X + W, Y + H); edge(X + W, Y + H, X, Y + H); edge(X, Y + H, X, Y); g.closePath(); g.stroke();
  } else if (type === 'stitched') {
    g.lineWidth = lw(0.0055);
    const edge = (x0, y0, x1, y1) => { const len = Math.hypot(x1 - x0, y1 - y0); let d = 0; g.beginPath();
      while (d < len) { const dl = s * 0.017 * (0.8 + R() * 0.4), gap = s * 0.011 * (0.8 + R() * 0.4); const a0 = d / len, a1 = Math.min(len, d + dl) / len; g.moveTo(x0 + (x1 - x0) * a0, y0 + (y1 - y0) * a0 + (R() - 0.5) * s * 0.002); g.lineTo(x0 + (x1 - x0) * a1, y0 + (y1 - y0) * a1 + (R() - 0.5) * s * 0.002); d += dl + gap; }
      g.stroke(); };
    edge(X, Y, X + W, Y); edge(X + W, Y, X + W, Y + H); edge(X + W, Y + H, X, Y + H); edge(X, Y + H, X, Y);
  } else if (type === 'torn') {
    const th = s * 0.05 * Math.sqrt(k), st = s * 0.012;
    for (const top of [true, false]) {
      g.beginPath(); const e = top ? y : y + h; g.moveTo(x, e);
      for (let xx = x; xx <= x + w + st; xx += st) { const d = th * (0.65 + R() * 0.55); g.lineTo(xx, top ? e + d : e - d); }
      g.lineTo(x + w, e); g.closePath(); g.fill();
    }
  } else if (type === 'jali') {
    const bh = s * 0.06 * Math.sqrt(k), r = bh * 0.34;
    for (const yy of [y + ins * 0.5, y + h - ins * 0.5 - bh]) {
      g.lineWidth = lw(0.004); g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.moveTo(x, yy + bh); g.lineTo(x + w, yy + bh); g.stroke();
      g.lineWidth = lw(0.0025); const my = yy + bh / 2, step = r * 1.45, n = Math.ceil(w / step) + 1, x0 = x + w / 2 - (Math.floor(n / 2)) * step;
      g.beginPath(); for (let i = 0; i < n; i++) { g.moveTo(x0 + i * step + r, my); g.arc(x0 + i * step, my, r, 0, Math.PI * 2); } g.stroke();
      g.beginPath(); for (let i = 0; i < n; i++) { const cx = x0 + (i + 0.5) * step, d = r * 0.22; g.moveTo(cx, my - d); g.lineTo(cx + d, my); g.lineTo(cx, my + d); g.lineTo(cx - d, my); g.closePath(); } g.fill();
    }
  } else if (type === 'deco') {
    g.lineWidth = lw(0.0025); const d0 = s * 0.03; g.strokeRect(X + d0, Y + d0, W - 2 * d0, H - 2 * d0);
    eachCorner(g, X, Y, W, H, () => {
      g.lineWidth = lw(0.005);
      for (let j = 0; j < 3; j++) { const d = j * s * 0.013, L = s * 0.13 - j * s * 0.03; g.beginPath(); g.moveTo(d, L); g.lineTo(d, d); g.lineTo(L, d); g.stroke(); }
      g.lineWidth = lw(0.0025); for (let j = 1; j <= 3; j++) { g.beginPath(); g.arc(0, 0, s * (0.045 + j * 0.016), Math.PI * 0.12, Math.PI * 0.38); g.stroke(); }
      const q = s * 0.052, dd = s * 0.011; g.beginPath(); g.moveTo(q, q - dd); g.lineTo(q + dd, q); g.lineTo(q, q + dd); g.lineTo(q - dd, q); g.closePath(); g.fill();
    });
  } else if (type === 'botanical') {
    const L = s * 0.2 * Math.sqrt(k); g.lineWidth = lw(0.0055);
    eachCorner(g, X, Y, W, H, () => {
      const p0 = [s * 0.004, L], c = [s * 0.012, s * 0.012], p1 = [L, s * 0.004];
      g.beginPath(); g.moveTo(...p0); g.quadraticCurveTo(...c, ...p1); g.stroke();
      const at = (t) => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]];
      const tan = (t) => Math.atan2(2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]), 2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]));
      [0.18, 0.36, 0.64, 0.82].forEach((t, i) => {
        const [px, py] = at(t), ang = tan(t) + (i % 2 ? 0.75 : -0.75) * (t < 0.5 ? -1 : 1), len = s * 0.045;
        g.save(); g.translate(px, py); g.rotate(ang + (t < 0.5 ? Math.PI : 0));
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len / 2, len * 0.38, len, 0); g.quadraticCurveTo(len / 2, -len * 0.38, 0, 0); g.stroke();
        g.lineWidth = lw(0.002); g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.8, 0); g.stroke(); g.restore();
      });
      g.beginPath(); g.arc(s * 0.05, s * 0.05, s * 0.007, 0, Math.PI * 2); g.fill();
    });
  } else if (type === 'bauhaus') {
    const bh = s * 0.085 * Math.sqrt(k), yy = y + h - ins * 0.5 - bh, cols = [col, ink(b), mix(col, pap, 0.45)];
    g.lineWidth = lw(0.004); g.beginPath(); g.moveTo(x, y + ins * 0.5 + bh * 0.3); g.lineTo(x + w, y + ins * 0.5 + bh * 0.3); g.stroke();
    for (let i = 0, xx = x; xx < x + w; i++, xx += bh) {
      g.fillStyle = cols[i % 3]; g.beginPath();
      const m = i % 4;
      if (m === 0) { g.moveTo(xx, yy + bh); g.arc(xx, yy + bh, bh, -Math.PI / 2, 0); g.closePath(); }
      else if (m === 1) { g.arc(xx + bh / 2, yy + bh, bh / 2, Math.PI, 0); g.closePath(); }
      else if (m === 2) { g.rect(xx + bh * 0.12, yy + bh * 0.12, bh * 0.76, bh * 0.88); }
      else { g.arc(xx + bh / 2, yy + bh / 2, bh * 0.4, 0, Math.PI * 2); }
      g.fill();
    }
  } else if (type === 'cutcorner') {
    const cham = (o, c) => { g.beginPath(); g.moveTo(X + o + c, Y + o); g.lineTo(X + W - o - c, Y + o); g.lineTo(X + W - o, Y + o + c); g.lineTo(X + W - o, Y + H - o - c); g.lineTo(X + W - o - c, Y + H - o); g.lineTo(X + o + c, Y + H - o); g.lineTo(X + o, Y + H - o - c); g.lineTo(X + o, Y + o + c); g.closePath(); g.stroke(); };
    const c = s * 0.06, d = s * 0.016 * Math.sqrt(k);
    g.lineWidth = lw(0.007); cham(0, c); g.lineWidth = lw(0.0025); cham(d, c - d * 0.4);
  } else if (type === 'sticker') {
    const lwv = lw(0.022); g.lineWidth = lwv; g.beginPath(); g.roundRect(X + lwv / 2, Y + lwv / 2, W - lwv, H - lwv, s * 0.09); g.stroke();
  } else if (type === 'image' && br.image) {
    nineSlice(g, br.image, x + ins * 0.5, y + ins * 0.5, w - ins, h - ins, s * (br.size || 0.06));
  }
  g.restore();
}
// small live preview of a border in the current colours (sidebar tiles)
export function borderTile(b, type, W = 64, H = 84) {
  const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const g = c.getContext('2d');
  g.fillStyle = paper(b); g.fillRect(0, 0, W * 2, H * 2);
  paintBorder(g, 0, 0, W * 2, H * 2, { ...b, border: { ...b.border, type, image: b.border?.image } }, W * 2);
  return c;
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
      if (b.logoHasName) drawLogo(g, b, cx, y + h * 0.5 + ly, s * 0.62);
      else { drawLogo(g, b, cx, y + h * 0.42 + ly, s * 0.42); text(g, b.name, cx, y + h * 0.72, s * 0.07 * ts, fg, { font: disp, weight: 400, maxW: w * 0.85 }); }
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
      if (b.logoHasName) drawLogo(g, b, cx, y + h * 0.46 + ly, s * 0.58);
      else { drawLogo(g, b, cx, y + h * 0.4 + ly, s * 0.38); text(g, b.name, cx, y + h * 0.6, s * 0.1 * ts, ac, { font: disp, weight: 700, maxW: w * 0.85 }); }
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
