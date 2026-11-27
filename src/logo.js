// Wrapt logo engine.
// A logo is a small JSON "spec" (layout, font, case, spacing, treatment, mark, colours).
// The AI or the built-in designer only writes specs; this file draws them as crisp vectors —
// to a canvas for the 3D packaging, and to SVG for download. The AI never draws pixels.
import { contrast, mix, autoInk, isDark, readable, fontCss, fontWeight, FONTS } from './art.js';
import { drawGen, genMarks, genReady, hash } from './genmark.js';

// ---------- glyphs: 24×24 line drawings, round caps, 2px grid ----------
export const GLYPHS = {
  // food & drink
  farfalle: 'M3 6c3 1 5 3 7 5v2c-2 2-4 4-7 5-1-4-1-8 0-12zM21 6c-3 1-5 3-7 5v2c2 2 4 4 7 5 1-4 1-8 0-12zM10 11h4v2h-4zM5.5 9.5l2 1.2M5.5 14.5l2-1.2M18.5 9.5l-2 1.2M18.5 14.5l-2-1.2',
  wheat: 'M12 21V5M12 8c-3 0-4-3-4-3s3 0 4 3c1-3 4-3 4-3s-1 3-4 3M12 12c-3 0-4-3-4-3s3 0 4 3c1-3 4-3 4-3s-1 3-4 3M12 16c-3 0-4-3-4-3s3 0 4 3c1-3 4-3 4-3s-1 3-4 3',
  bowl: 'M3 11h18a9 9 0 0 1-18 0zM8 21h8M9 8c-1-1 1-2 0-4M12 8c-1-1 1-2 0-4M15 8c-1-1 1-2 0-4',
  olive: 'M5 20C9 14 14 9 20 4M8.5 15.5c-2.2-.6-3.4-2.4-3.4-4.6 2.2.2 3.8 2 3.4 4.6zM12.5 11.5c-.9-2-.6-4.2.8-5.8 1.4 1.6 1.4 3.8-.8 5.8zM13.5 12c2.2-.5 4.3.4 5.3 2.3-2 .9-4.2.2-5.3-2.3zM9.5 16c2.2-.5 4.3.4 5.3 2.3-2 .9-4.2.2-5.3-2.3z',
  leaf: 'M5 19C5 10 11 5 19 5c0 9-6 14-14 14zM5 19l9-9',
  sprig: 'M12 21V6M12 9c-3 0-5-2-5-4 3 0 5 2 5 4zM12 9c3 0 5-2 5-4-3 0-5 2-5 4zM12 14c-3 0-5-2-5-4 3 0 5 2 5 4zM12 14c3 0 5-2 5-4-3 0-5 2-5 4z',
  sprout: 'M12 21v-9M12 12C12 7 8 5 4 5c0 4 3 7 8 7zM12 10c0-4 3-6 8-6 0 4-3 6-8 6z',
  cup: 'M5 10h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 11h1.5a2 2 0 0 1 0 4H16M8.5 3.5c-1 1 1 2 0 3.5M12 3.5c-1 1 1 2 0 3.5',
  chaiglass: 'M6.5 5h11l-1.6 15.5H8.1zM7.3 11h9.4M9.5 8h.01M12 8h.01M14.5 8h.01',
  steam: 'M8 20c-2-3 2-5 0-8s2-5 0-8M12 20c-2-3 2-5 0-8s2-5 0-8M16 20c-2-3 2-5 0-8s2-5 0-8',
  bean: 'M8 4c5-2 11 3 11 9s-6 9-11 7S3 13 4 9s2-4 4-5zM9 5c3 4 3 10 1 14',
  mango: 'M14 4.5c4 1 6 5 5 9.5-1 4.3-4.4 7-8.4 7-3.8 0-6.4-2.8-5.8-6.4.5-3 3.6-3.4 5.6-5.4S12 4 14 4.5zM14.5 4c1.4-1.6 4-1.8 5.2-.6-1.5 1.5-3.7 1.7-5.2.6z',
  chilli: 'M18 6c-1 7-6 12-13 13 3-3 6-6 8-11M18 6l2-2M17 5c-1-1-3-1-4 1',
  jar: 'M7 7h10v2c1.5 1 2 2 2 4v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6c0-2 .5-3 2-4zM6.5 3.5h11V7h-11zM5 13h14',
  whisk: 'M12 13v8M12 13c-3 0-4.5-4-4.5-6.5S9.5 2 12 2s4.5 2 4.5 4.5S15 13 12 13zM12 13c-1.2 0-2-4-2-6.5S11 2 12 2M12 13c1.2 0 2-4 2-6.5S13 2 12 2',
  cupcake: 'M6 12h12l-1.5 8h-9zM5.5 12a6.5 4.5 0 0 1 13 0M12 7.5V5M9.5 14l.6 6M14.5 14l-.6 6',
  cherry: 'M7 15a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM16 14a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM7 15c1-5 4-9 9-11M16 14c0-4-.5-7 0-10M16 4c1.5-.5 3 0 4 1.5-1.5 1-3 .5-4-1.5z',
  cone: 'M7 10h10l-5 11zM7 10a5 5 0 0 1 10 0M9.2 13.5l4.6 3.5M14.8 13.5l-4.6 3.5',
  citrus: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM12 6v12M6 12h12M7.8 7.8l8.4 8.4M16.2 7.8l-8.4 8.4',
  honeycomb: 'M12 3l7 4v10l-7 4-7-4V7zM12 8.5l3 1.75v3.5L12 15.5l-3-1.75v-3.5z',
  bee: 'M12 9a3.5 4.5 0 1 1 0 9 3.5 4.5 0 0 1 0-9zM8.6 12h6.8M8.8 15h6.4M12 9c-1-3-4-4-6-3 0 2 2 4 6 3zM12 9c1-3 4-4 6-3 0 2-2 4-6 3z',
  // light, care & lifestyle
  flame: 'M12 3c3 4 6 6.5 6 11a6 6 0 0 1-12 0c0-3 1.5-5 3-6.5 0 2.5 1 3.5 2 3.5 0-3-1-5 1-8zM12 20a2.5 2.5 0 0 1-2.5-2.5c0-2 2.5-4 2.5-4s2.5 2 2.5 4A2.5 2.5 0 0 1 12 20z',
  diya: 'M3 13h18c-1 4-5 6-9 6s-8-2-9-6zM12 11c-1.5 0-2.5-1-2.5-2.5C9.5 6 12 3 12 3s2.5 3 2.5 5.5c0 1.5-1 2.5-2.5 2.5z',
  drop: 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z',
  lotus: 'M12 20c-4 0-8-2-9-6 3 0 6 1 9 6zM12 20c4 0 8-2 9-6-3 0-6 1-9 6zM12 20c-2.5-2-3.5-5-3.5-8S10 6 12 4c2 2 3.5 5 3.5 8s-1 6-3.5 8z',
  moon: 'M19 14.5A8 8 0 1 1 9.5 5a6.5 6.5 0 0 0 9.5 9.5z',
  spark: 'M12 3c.8 4.2 2.8 6.2 9 9-6.2 2.8-8.2 4.8-9 9-.8-4.2-2.8-6.2-9-9 6.2-2.8 8.2-4.8 9-9z',
  gem: 'M6 4h12l3 5-9 11L3 9zM3 9h18M9 4l-2 5 5 11 5-11-2-5',
  needle: 'M19 3L7 19M17 4.5l2.5 2.5M5 12c4-4 10 5 15 1',
  button: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 6.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM10.2 10.2h.01M13.8 10.2h.01M10.2 13.8h.01M13.8 13.8h.01',
  paw: 'M12 13c3 0 5 3 5 5s-2 2-5 2-5 0-5-2 2-5 5-5zM6 7.5a1.8 2.3 0 1 1 0 4.6 1.8 2.3 0 0 1 0-4.6zM18 7.5a1.8 2.3 0 1 1 0 4.6 1.8 2.3 0 0 1 0-4.6zM9.5 3.5a1.8 2.3 0 1 1 0 4.6 1.8 2.3 0 0 1 0-4.6zM14.5 3.5a1.8 2.3 0 1 1 0 4.6 1.8 2.3 0 0 1 0-4.6z',
  // abstract
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  wave: 'M2 10c3 0 3-3 6-3s3 3 6 3 3-3 6-3M2 16c3 0 3-3 6-3s3 3 6 3 3-3 6-3',
  mountain: 'M2 20l7-12 4 6 3-4 6 10z',
  arch: 'M6 21V11a6 6 0 0 1 12 0v10M3 21h18M9.5 21v-8.5a2.5 2.5 0 0 1 5 0V21',
  dot: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.6A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
};
// Only symbols that make sense for what they sell (no hearts and stars for pasta).
export const CATEGORIES = {
  pasta: { words: ['pasta', 'fusilli', 'penne', 'farfalle', 'spaghetti', 'macaroni', 'noodle', 'italian'], glyphs: ['farfalle', 'wheat', 'bowl', 'olive', 'arch'], sub: 'PASTA' },
  candle: { words: ['candle', 'diya', 'wax', 'incense', 'agarbatti', 'dhoop', 'fragrance'], glyphs: ['flame', 'diya', 'lotus', 'drop', 'moon'], sub: 'CANDLES' },
  coffee: { words: ['coffee', 'espresso', 'cold brew', 'latte', 'cafe', 'café'], glyphs: ['bean', 'cup', 'steam', 'sun'], sub: 'COFFEE' },
  tea: { words: ['tea', 'chai', 'tulsi', 'matcha', 'kahwa', 'infusion'], glyphs: ['leaf', 'chaiglass', 'sprig', 'cup', 'steam'], sub: 'TEA' },
  pickle: { words: ['pickle', 'achaar', 'achar', 'chutney', 'murabba'], glyphs: ['mango', 'chilli', 'jar', 'sun'], sub: 'PICKLES' },
  spice: { words: ['spice', 'masala', 'chilli', 'chili', 'mirch', 'haldi', 'turmeric'], glyphs: ['chilli', 'leaf', 'sun', 'jar'], sub: 'SPICES' },
  honey: { words: ['honey', 'shahad', 'bee'], glyphs: ['bee', 'honeycomb', 'drop', 'sun'], sub: 'HONEY' },
  icecream: { words: ['ice cream', 'icecream', 'gelato', 'kulfi', 'sorbet'], glyphs: ['cone', 'cherry', 'citrus', 'sun'], sub: 'ICE CREAM' },
  bakery: { words: ['bakery', 'bake', 'cookie', 'cake', 'brownie', 'bread', 'croissant', 'dessert', 'chocolate'], glyphs: ['whisk', 'cupcake', 'wheat', 'cherry'], sub: 'BAKERY' },
  sweets: { words: ['mithai', 'sweet', 'laddoo', 'ladoo', 'barfi', 'diwali'], glyphs: ['diya', 'lotus', 'cupcake', 'spark'], sub: 'SWEETS' },
  drink: { words: ['juice', 'soda', 'kombucha', 'drink', 'lemonade', 'beverage', 'water'], glyphs: ['citrus', 'drop', 'wave', 'sun'], sub: 'DRINKS' },
  dairy: { words: ['milk', 'ghee', 'paneer', 'curd', 'dairy', 'butter', 'yogurt'], glyphs: ['drop', 'sun', 'sprout', 'wave'], sub: 'DAIRY' },
  skincare: { words: ['skincare', 'skin', 'nail', 'makeup', 'lipstick', 'lip ', 'kajal', 'hair', 'perfume', 'serum', 'soap', 'cream', 'beauty', 'cosmetic', 'oil', 'balm', 'ayurved'], glyphs: ['drop', 'leaf', 'lotus', 'moon', 'spark'], sub: 'BEAUTY' },
  fashion: { words: ['cloth', 'apparel', 'fashion', 'tshirt', 't-shirt', 'saree', 'kurta', 'wear', 'shoe', 'sneaker', 'tailor'], glyphs: ['needle', 'button', 'arch', 'spark'], sub: 'STUDIO' },
  jewellery: { words: ['jewel', 'jewelry', 'jewellery', 'earring', 'ring', 'necklace', 'silver', 'gold'], glyphs: ['gem', 'spark', 'moon', 'lotus'], sub: 'JEWELLERY' },
  pets: { words: ['pet', 'dog', 'cat', 'puppy'], glyphs: ['paw', 'dot', 'sun'], sub: 'PETS' },
  general: { words: [], glyphs: ['sprout', 'sun', 'wave', 'arch', 'mountain', 'dot'], sub: '' },
};
export function detectCategory(text) {
  const t = ` ${String(text).toLowerCase()} `;
  for (const [k, c] of Object.entries(CATEGORIES)) if (c.words.some((w) => t.includes(w))) return k;
  return 'general';
}
export const glyphsFor = (cat, idea = '') => {
  const list = [...(CATEGORIES[cat] || CATEGORIES.general).glyphs];
  const t = String(idea).toLowerCase();
  for (const g of Object.keys(GLYPHS)) if (t.includes(g) && !list.includes(g)) list.unshift(g); // "a flame", "a heart" — asked for
  if (/love|heart|dil/.test(t) && !list.includes('heart')) list.unshift('heart');
  return list;
};

export const LAYOUTS = { wordmark: 'Wordmark', stacked: 'Stacked', 'mark-left': 'Symbol + name', 'mark-top': 'Symbol on top', lettermark: 'Letter mark', emblem: 'Emblem' };
export const TREATMENTS = { none: 'Plain', swash: 'Swash underline', dot: 'Full stop', split: 'Two-colour', shadow: 'Retro shadow', cut: 'Sliced', outline: 'Outline', swap: 'Symbol as a letter' };
export const CONTAINERS = { none: 'None', circle: 'Circle', square: 'Rounded square', arch: 'Arch', shield: 'Shield', blob: 'Organic', pill: 'Pill' };
export const LOGO_FONTS = Object.keys(FONTS).filter((f) => !['Tiro Devanagari Hindi', 'Mukta'].includes(f));
const TYPE_LED = (s) => ['wordmark', 'stacked', 'lettermark'].includes(s.layout) || s.treatment !== 'none' || s.mark?.source === 'gen';
const hasDeva = (s) => /[ऀ-ॿ]/.test(s);

// ---------- scene: one list of shapes that renders to canvas AND to SVG ----------
const measureCtx = document.createElement('canvas').getContext('2d');
function measure(str, font, weight, size, spacing = 0) {
  measureCtx.font = fontCss(font, weight, size); if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = `${spacing}px`;
  const m = measureCtx.measureText(str);
  return { w: Math.max(0, m.width - (str.length ? spacing : 0)), asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
}
const advance = (str, font, weight, size, spacing) => { measureCtx.font = fontCss(font, weight, size); if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = `${spacing}px`; return measureCtx.measureText(str).width; };

class Scene {
  constructor() { this.items = []; }
  path(d, o = {}) { this.items.push({ t: 'path', d, ...o }); }
  text(str, x, y, o) { this.items.push({ t: 'text', str, x, y, ...o }); }
  erase(d, o = {}) { this.items.push({ t: 'path', d, erase: true, ...o }); }
  draw(g) {
    for (const it of this.items) {
      g.save();
      if (it.erase) g.globalCompositeOperation = 'destination-out';
      if (it.tf) g.transform(...it.tf);
      if (it.t === 'path') {
        const p = new Path2D(it.d);
        if (it.fill) { g.fillStyle = it.erase ? '#000' : it.fill; g.fill(p, it.rule || 'nonzero'); }
        if (it.stroke) { g.strokeStyle = it.erase ? '#000' : it.stroke; g.lineWidth = it.lw; g.lineCap = g.lineJoin = 'round'; g.stroke(p); }
      } else {
        g.font = fontCss(it.font, it.weight, it.size); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
        if ('letterSpacing' in g) g.letterSpacing = `${it.spacing || 0}px`;
        if (it.rot) { g.translate(it.x, it.y); g.rotate(it.rot); g.translate(-it.x, -it.y); }
        if (it.fill) { g.fillStyle = it.fill; g.fillText(it.str, it.x, it.y); }
        if (it.stroke) { g.strokeStyle = it.stroke; g.lineWidth = it.lw; g.lineJoin = 'round'; g.strokeText(it.str, it.x, it.y); }
      }
      g.restore();
    }
  }
  svg(box, fontFaces = '') {
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const el = (it) => {
      const tf = it.tf ? ` transform="matrix(${it.tf.map((v) => +v.toFixed(4)).join(' ')})"` : '';
      const paint = it.erase ? ` fill="${it.fill ? '#000' : 'none'}" stroke="${it.stroke ? '#000' : 'none'}"` : ` fill="${it.fill || 'none'}" stroke="${it.stroke || 'none'}"`;
      const sw = it.stroke ? ` stroke-width="${+it.lw.toFixed(3)}" stroke-linecap="round" stroke-linejoin="round"` : '';
      if (it.t === 'path') return `<path d="${it.d}"${it.rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}${paint}${sw}${tf}/>`;
      const rot = it.rot ? ` transform="rotate(${(it.rot * 180 / Math.PI).toFixed(3)} ${it.x.toFixed(2)} ${it.y.toFixed(2)})"` : '';
      return `<text x="${it.x.toFixed(2)}" y="${it.y.toFixed(2)}" font-family="${esc(it.font)}" font-weight="${fontWeight(it.font, it.weight)}" font-size="${it.size.toFixed(2)}" letter-spacing="${(it.spacing || 0).toFixed(2)}"${paint}${sw}${rot}${tf}>${esc(it.str)}</text>`;
    };
    // erase items become masks over everything drawn before them
    let body = '', defs = '', n = 0;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (!it.erase) { body += el(it); continue; }
      let cuts = ''; while (i < this.items.length && this.items[i].erase) { const e = this.items[i]; cuts += el({ ...e, erase: false, fill: e.fill ? '#000' : null, stroke: e.stroke ? '#000' : null }); i++; } i--;
      const id = `k${n++}`; defs += `<mask id="${id}" maskUnits="userSpaceOnUse" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="#fff"/>${cuts}</mask>`;
      body = `<g mask="url(#${id})">${body}</g>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}"><defs>${fontFaces ? `<style>${fontFaces}</style>` : ''}${defs}</defs>${body}</svg>`;
  }
}

// ---------- shapes ----------
const circleD = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const rrectD = (x, y, w, h, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
function containerD(type, cx, cy, r) {
  if (type === 'circle') return circleD(cx, cy, r);
  if (type === 'square') return rrectD(cx - r, cy - r, 2 * r, 2 * r, r * 0.3);
  if (type === 'pill') return rrectD(cx - r * 1.6, cy - r * 0.75, r * 3.2, r * 1.5, r * 0.75);
  if (type === 'arch') { const w = r * 0.86, top = cy - r * 1.08, bot = cy + r * 1.08; return `M${cx - w} ${bot}V${top + w}A${w} ${w} 0 0 1 ${cx + w} ${top + w}V${bot}z`; }
  if (type === 'shield') { const w = r * 0.9, t = cy - r, b2 = cy + r * 1.1; return `M${cx - w} ${t}H${cx + w}V${cy + r * 0.05}C${cx + w} ${cy + r * 0.62} ${cx + r * 0.45} ${b2 - r * 0.2} ${cx} ${b2}C${cx - r * 0.45} ${b2 - r * 0.2} ${cx - w} ${cy + r * 0.62} ${cx - w} ${cy + r * 0.05}z`; }
  if (type === 'blob') { // soft organic pebble, same every time
    const n = 7, pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, rr = r * (1 + 0.07 * Math.sin(i * 2.3 + 1) + 0.05 * Math.cos(i * 3.7)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    return smoothClosed(pts);
  }
  return '';
}
export function smoothClosed(p) { // Catmull-Rom → Bézier, closed
  const n = p.length; let d = `M${p[0][0].toFixed(2)} ${p[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) { const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`; }
  return d + 'z';
}
const onColor = (fill, pref) => (pref && contrast(pref, fill) >= 3 ? pref : isDark(fill) || autoInk(fill) !== '#1c1a17' ? '#fbf7ef' : '#1c1a17');

// the symbol, centred at cx,cy, `size` wide
function drawMark(sc, spec, cx, cy, size, color, { erase = false, boldK = 1, c2 } = {}) {
  const m = spec.mark || {};
  if (m.source === 'gen' && m.gen) { drawGen(sc, m.gen, cx, cy, size, color, c2 && contrast(c2, color) > 1.3 ? c2 : mix(color, '#ffffff', 0.45)); return; }
  if (m.source === 'sketch' && m.sketch?.paths?.length) {
    const k = size / 100, tf = [k, 0, 0, k, cx - 50 * k, cy - 50 * k];
    for (const p of m.sketch.paths) {
      const o = { tf, ...(p.fill ? { fill: color, rule: 'evenodd' } : {}), ...(p.stroke !== false ? { stroke: color, lw: (p.lw || m.sketch.sw || 4) * boldK } : {}) };
      if (p.knock && !erase) sc.erase(p.d, { tf, stroke: '#000', lw: (p.lw || m.sketch.sw) * boldK });
      else erase ? sc.erase(p.d, o) : sc.path(p.d, o);
    }
    return;
  }
  const d = GLYPHS[m.glyph]; if (!d) return;
  const k = size / 24, lw = (spec.weight === 'bold' ? 2.1 : 1.65) * boldK;
  const o = { tf: [k, 0, 0, k, cx - 12 * k, cy - 12 * k], stroke: color, lw };
  erase ? sc.erase(d, o) : sc.path(d, o);
}
function markWithContainer(sc, spec, cx, cy, r, col) {
  const ct = spec.mark?.container || 'none';
  if (ct === 'none') { drawMark(sc, spec, cx, cy, r * 2, col.primary, { c2: col.secondary }); return; }
  const d = containerD(ct, cx, cy, r);
  if (spec.mark?.style === 'line') { sc.path(d, { stroke: col.primary, lw: r * 0.07 }); drawMark(sc, spec, cx, cy, r * 1.15, col.primary); }
  else { sc.path(d, { fill: col.primary }); drawMark(sc, spec, cx, cy, r * 1.15, onColor(col.primary, col.secondary)); }
}

// ---------- name text with treatments ----------
const applyCase = (s, c) => (hasDeva(s) ? s : c === 'upper' ? s.toUpperCase() : c === 'lower' ? s.toLowerCase() : s);
const isRoundish = (spec) => spec.mark?.source === 'sketch' || ['dot', 'citrus', 'button', 'sun', 'flame', 'drop', 'diya', 'leaf', 'bean', 'lotus', 'farfalle', 'cherry', 'paw'].includes(spec.mark?.glyph);
// draws `str` with its left edge at x, baseline at y; returns width
function nameText(sc, spec, str, x, y, size, col, { allowTreat = true } = {}) {
  const font = spec.font, weight = spec.weight === 'bold' ? 700 : 400, sp = (spec.tracking || 0) / 100 * size;
  const m = measure(str, font, weight, size, sp), capH = measure('H', font, weight, size).asc;
  const T = allowTreat ? spec.treatment : 'none';
  const run = (s, xx, fill, extra = {}) => sc.text(s, xx, y, { font, weight, size, spacing: sp, fill, ...extra });
  if (T === 'shadow') { const o = size * 0.045; sc.text(str, x + o, y + o, { font, weight, size, spacing: sp, fill: col.secondary }); run(str, x, col.primary); }
  else if (T === 'outline') run(str, x, null, { stroke: col.primary, lw: size * 0.028 });
  else if (T === 'split') {
    const words = str.split(' ');
    const a = words.length > 1 ? words[0] + ' ' : [...str][0], bstr = words.length > 1 ? words.slice(1).join(' ') : str.slice(a.length);
    run(a, x, col.primary); run(bstr, x + advance(a, font, weight, size, sp), col.secondary);
  } else if (T === 'swap' && (spec.mark?.glyph || spec.mark?.sketch)) {
    let i = [...str].findIndex((ch, k) => /[oO0]/.test(ch) && k > 0); if (i < 0) i = [...str].findIndex((ch) => /[oO0]/.test(ch));
    if (i < 0) { run(str, x, col.primary); }
    else {
      const chars = [...str], pre = chars.slice(0, i).join(''), ch = chars[i], post = chars.slice(i + 1).join('');
      const px = x + advance(pre, font, weight, size, sp), cw = advance(ch, font, weight, size, sp);
      run(pre, x, col.primary); run(post, px + cw, col.primary);
      const h = /[o0]/.test(ch) ? measure('x', font, weight, size).asc : capH;
      drawMark(sc, spec, px + (cw - sp) / 2, y - h / 2, h * 1.25, col.secondary, { boldK: 1.15 });
    }
  } else run(str, x, col.primary);
  if (T === 'swash') {
    const w = m.w, y0 = y + size * 0.16, th = size * 0.05;
    sc.path(`M${x + w * 0.04} ${y0 + th * 0.2}C${x + w * 0.35} ${y0 + th * 2.4} ${x + w * 0.7} ${y0 + th * 1.6} ${x + w * 1.02} ${y0 - th * 0.6}C${x + w * 0.7} ${y0 + th * 0.8} ${x + w * 0.35} ${y0 + th * 1.2} ${x + w * 0.04} ${y0 + th * 0.2}z`, { fill: col.secondary });
  } else if (T === 'dot') {
    const r = size * 0.075; sc.path(circleD(x + m.w + r * 1.5, y - r, r), { fill: col.secondary });
  } else if (T === 'cut') {
    const ch = size * 0.035; sc.erase(`M${x - 10} ${y - capH * 0.5 - ch / 2}h${m.w + 20}v${ch}h${-(m.w + 20)}z`, { fill: '#000' });
  }
  return m.w + (T === 'dot' ? size * 0.2 : 0);
}

function arcText(sc, str, cx, cy, r, size, font, weight, sp, fill, bottom = false) {
  const chars = [...str], ws = chars.map((ch) => advance(ch, font, weight, size, sp));
  const total = ws.reduce((a, b) => a + b, 0) - sp;
  let a = bottom ? Math.PI / 2 + total / r / 2 : -Math.PI / 2 - total / r / 2;
  chars.forEach((ch, i) => {
    const step = ws[i] / r, mid = a + (bottom ? -1 : 1) * (ws[i] - sp) / r / 2;
    const px = cx + Math.cos(mid) * r, py = cy + Math.sin(mid) * r, rot = mid + (bottom ? -Math.PI / 2 : Math.PI / 2);
    const cw = ws[i] - sp, off = size * 0.36;
    // place the glyph centred on the arc point, rotated to the tangent
    const ox = -cw / 2, oy = off;
    sc.text(ch, px + Math.cos(rot) * ox - Math.sin(rot) * oy, py + Math.sin(rot) * ox + Math.cos(rot) * oy, { font, weight, size, spacing: 0, fill, rot });
    a += (bottom ? -1 : 1) * step;
  });
  return total / r; // angle used
}

// ---------- layouts ----------
function build(spec, col) {
  const sc = new Scene(), N = 200, name = applyCase(spec.name || 'Brand', spec.case);
  const font = spec.font, weight = spec.weight === 'bold' ? 700 : 400, sp = (spec.tracking || 0) / 100 * N;
  const L = spec.layout;
  if (L === 'mark') { drawMark(sc, spec, 0, 0, N * 3, col.primary); return sc; } // symbol only (previews)
  if (L === 'wordmark') {
    const w = measure(name, font, weight, N, sp).w + (spec.treatment === 'dot' ? N * 0.2 : 0);
    if ((spec.mark?.container === 'pill' || spec.mark?.container === 'square') && spec.treatment !== 'outline') {
      const capH = measure('H', font, weight, N).asc, padX = N * 0.45, padY = N * 0.42, H = capH + padY * 2;
      sc.path(rrectD(-w / 2 - padX, -capH / 2 - padY, w + padX * 2, H, spec.mark.container === 'pill' ? H / 2 : N * 0.18), { fill: col.primary });
      const on = onColor(col.primary, col.secondary);
      nameText(sc, { ...spec, treatment: ['swap', 'split', 'dot'].includes(spec.treatment) ? spec.treatment : 'none' }, name, -w / 2, capH / 2, N, { primary: on, secondary: col.secondary === on ? on : (contrast(col.secondary, col.primary) >= 2 ? col.secondary : on) });
    } else nameText(sc, spec, name, -w / 2, 0, N, col);
  } else if (L === 'stacked') {
    const words = name.split(/\s+/);
    if (words.length > 1) {
      const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words;
      const capH = measure('H', font, weight, N).asc, lead = capH * 1.32;
      lines.forEach((ln, i) => {
        const last = i === lines.length - 1, w = measure(ln, font, weight, N, sp).w;
        const c = spec.treatment === 'split' && last ? { primary: col.secondary, secondary: col.secondary } : col;
        nameText(sc, spec, ln, -w / 2, i * lead, N, c, { allowTreat: last && spec.treatment !== 'split' });
      });
    } else {
      const w = nameText(sc, spec, name, -measure(name, font, weight, N, sp).w / 2, 0, N, col);
      const sub = (spec.sub || '').toUpperCase(); if (sub) {
        const ss = N * 0.2, ssp = ss * 0.35, sw = measure(sub, 'Inter', 600, ss, ssp).w, y = N * 0.48;
        sc.text(sub, -sw / 2, y, { font: 'Inter', weight: 600, size: ss, spacing: ssp, fill: col.primary });
        const g = N * 0.12, rl = Math.max(N * 0.25, (w - sw) / 2 - g);
        sc.path(`M${-sw / 2 - g - rl} ${y - ss * 0.36}h${rl}M${sw / 2 + g} ${y - ss * 0.36}h${rl}`, { stroke: col.primary, lw: N * 0.018 });
      }
    }
  } else if (L === 'mark-left' || L === 'mark-top') {
    const capH = measure('H', font, weight, N).asc, w = measure(name, font, weight, N, sp).w;
    if (L === 'mark-left') {
      const r = capH * 0.95, gap = N * 0.32, total = r * 2 + gap + w;
      markWithContainer(sc, spec, -total / 2 + r, -capH / 2, r, col);
      nameText(sc, spec, name, -total / 2 + r * 2 + gap, 0, N, col);
    } else {
      const r = Math.max(capH * 1.2, Math.min(w * 0.3, N * 0.9));
      markWithContainer(sc, spec, 0, -capH - N * 0.3 - r * (spec.mark?.container === 'arch' ? 1.08 : 1), r, col);
      nameText(sc, spec, name, -w / 2, 0, N, col);
    }
  } else if (L === 'lettermark') {
    const words = name.replace(/^the\s+/i, '').split(/\s+/).filter(Boolean);
    const ini = (spec.monogram || (words.length > 1 ? words[0][0] + words[1][0] : [...words[0] || 'B'][0])).toUpperCase();
    const big = N * 2.1, iw = measure(ini, font, weight, big, -big * 0.02).w, icap = measure(ini, font, weight, big).asc;
    const ct = spec.mark?.container || 'none';
    let fill = col.primary;
    if (ct !== 'none') {
      const r = Math.max(iw, icap) * 0.82;
      if (spec.mark?.style === 'line') sc.path(containerD(ct, 0, -icap / 2, r), { stroke: col.primary, lw: N * 0.06 });
      else { sc.path(containerD(ct, 0, -icap / 2, r), { fill: col.primary }); fill = onColor(col.primary, col.secondary); }
    }
    sc.text(ini, -iw / 2, 0, { font, weight, size: big, spacing: -big * 0.02, fill });
    const ss = N * 0.3, ssp = ss * 0.32, nm = name.toUpperCase(), nw = measure(nm, 'Inter', 600, ss, ssp).w;
    const yb = ct !== 'none' ? Math.max(iw, icap) * 0.82 - icap / 2 + ss * 1.9 : ss * 2.1;
    sc.text(nm, -nw / 2, yb, { font: 'Inter', weight: 600, size: ss, spacing: ssp, fill: col.primary });
  } else { // emblem: name on the top arc, optional word on the bottom arc, symbol in the middle
    const R = N * 2.2, ring = spec.mark?.style === 'line' ? 'line' : 'fill';
    const bg = ring === 'fill' ? col.primary : null, fg = ring === 'fill' ? onColor(col.primary, col.secondary) : col.primary;
    if (bg) sc.path(circleD(0, 0, R), { fill: bg }); else sc.path(circleD(0, 0, R), { stroke: col.primary, lw: N * 0.06 });
    sc.path(circleD(0, 0, R * 0.9), { stroke: fg, lw: N * 0.025 });
    sc.path(circleD(0, 0, R * 0.56), { stroke: fg, lw: N * 0.018 });
    const ef = spec.font === 'Caveat' ? 'Inter' : spec.font, ew = FONTS[ef]?.w ? 400 : 700;
    const txt = name.toUpperCase(), rText = R * 0.73;
    let size = N * 0.42; const spE = size * 0.12;
    const perSize = (measure(txt, ef, ew, 100, 12).w) / 100; // width per 1px of size
    size = Math.min(size, (rText * Math.PI * 0.8) / Math.max(perSize, 0.01)); // never wider than ~145°, so it can't reach the side dots
    const used = arcText(sc, txt, 0, 0, rText, size, ef, ew, size * 0.12, fg);
    const sub = (spec.sub || '').toUpperCase().slice(0, 18);
    let usedB = 0;
    if (sub) { const ss = Math.min(size * 0.62, N * 0.26); usedB = arcText(sc, sub, 0, 0, rText, ss, 'Inter', 600, ss * 0.3, fg, true); }
    // separators sit in the gaps between the two arcs, so they can never touch the text
    for (const sx of [-1, 1]) sc.path(circleD(sx * rText, 0, N * 0.04), { fill: fg });
    if (spec.mark?.glyph || spec.mark?.sketch || spec.mark?.gen) drawMark(sc, spec, 0, 0, R * 0.68, fg);
    else { const ini = [...name.replace(/^the\s+/i, '')][0].toUpperCase(), s2 = R * 0.62, iw = measure(ini, spec.font, weight, s2).w, ic = measure(ini, spec.font, weight, s2).asc; sc.text(ini, -iw / 2, ic / 2, { font: spec.font, weight, size: s2, fill: fg }); }
  }
  return sc;
}

// ---------- render: canvas (trimmed to content) + SVG ----------
const cache = new Map();
export function renderLogo(spec, colors = spec.colors, { mono = false } = {}) {
  const col = mono ? { primary: '#141414', secondary: '#141414' } : { primary: colors?.primary || '#1c1a17', secondary: colors?.secondary || colors?.primary || '#1c1a17' };
  const key = JSON.stringify([spec, col]);
  if (cache.has(key)) return cache.get(key);
  const sc = build(spec, col);
  const W = 2600, H = 2200, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  let x0, y0, x1, y1, scale = 1;
  for (let tries = 0; tries < 4; tries++) { // long names: shrink until nothing touches the edge
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.translate(W / 2, H / 2); g.scale(scale, scale); sc.draw(g);
    const d = g.getImageData(0, 0, W, H).data; x0 = W; y0 = H; x1 = 0; y1 = 0;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x0 > 4 && y0 > 4 && x1 < W - 5 && y1 < H - 5) break;
    scale *= 0.6;
  }
  if (x1 <= x0) { x0 = 0; y0 = 0; x1 = 10; y1 = 10; }
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04) + 4;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
  const out = document.createElement('canvas'); out.width = x1 - x0; out.height = y1 - y0;
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  const box = { x: (x0 - W / 2) / scale, y: (y0 - H / 2) / scale, w: out.width / scale, h: out.height / scale };
  const res = { canvas: out, box, scene: sc, fonts: [...new Set(sc.items.filter((i) => i.t === 'text').map((i) => `${i.font}|${fontWeight(i.font, i.weight)}`))] };
  if (cache.size > 120) cache.clear();
  cache.set(key, res);
  return res;
}
// SVG with the fonts embedded, so it opens the same anywhere
export async function logoSVG(spec, colors, opts) {
  const r = renderLogo(spec, colors, opts);
  let faces = '';
  for (const fw of r.fonts) {
    const [fam, w] = fw.split('|');
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const f = rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
        const rw = rule.style.getPropertyValue('font-weight').trim();
        if (f !== fam || (rw && rw !== 'normal' && +rw !== +w)) continue;
        const url = (rule.style.getPropertyValue('src').match(/url\(["']?([^"')]+)/) || [])[1]; if (!url) continue;
        try {
          const buf = await (await fetch(new URL(url, sheet.href || location.href))).arrayBuffer();
          let bin = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
          faces += `@font-face{font-family:"${fam}";font-weight:${w};src:url(data:font/woff2;base64,${btoa(bin)}) format("woff2");}`;
        } catch {}
        break;
      }
    }
  }
  return r.scene.svg(r.box, faces);
}
// colours re-picked so the same logo always reads on any pack colour
export function packColors(spec, paperCol, accent, inkCol) {
  const ok = (c, min) => c && contrast(c, paperCol) >= min;
  const p = [spec.colors?.primary, accent, inkCol].find((c) => ok(c, 2.8)) || autoInk(paperCol);
  const s = [spec.colors?.secondary, accent].find((c) => ok(c, 1.7) && c !== p) || p;
  return { primary: p, secondary: s };
}

// ---------- built-in logo designer (also the fallback when AI is off) ----------
// trait vectors: modern(+)/classic(−), serious(+)/playful(−), bold(+)/delicate(−), precise(+)/handmade(−)
const TRAITS = {
  'Instrument Serif': [-0.2, 0.5, -0.6, 0.4], 'DM Serif Display': [-0.5, 0.5, 0.5, 0.5], 'Bebas Neue': [0.6, 0.2, 0.8, 0.7], 'Space Grotesk': [0.8, 0.3, 0, 0.8],
  Inter: [0.7, 0.6, -0.1, 0.9], Caveat: [0, -0.8, -0.3, -0.9], Fraunces: [-0.2, -0.2, 0.3, -0.2], 'Cormorant Garamond': [-0.8, 0.7, -0.8, 0.5],
  Marcellus: [-0.7, 0.8, -0.2, 0.7], 'Abril Fatface': [-0.6, 0.2, 0.9, 0.4], 'Rozha One': [-0.6, 0.3, 0.8, 0.4], 'Young Serif': [-0.4, -0.3, 0.4, 0],
  Shrikhand: [-0.3, -0.8, 0.9, -0.4], 'Baloo 2': [0.3, -0.8, 0.5, -0.2], Unbounded: [0.9, -0.1, 0.6, 0.6], 'Bricolage Grotesque': [0.7, -0.1, 0.4, 0.2], Syne: [0.9, 0.1, 0.2, 0.3],
};
const VARIABLE = (f) => FONTS[f]?.w == null;
export function vibesToPrefs(vibes = []) {
  const v = vibes.map((x) => x.toLowerCase()); const p = { modern: 0, serious: 0, bold: 0, precise: 0 };
  const add = (k, n) => { p[k] = Math.max(-1, Math.min(1, p[k] + n)); };
  if (v.some((x) => /minimal/.test(x))) { add('modern', 0.5); add('precise', 0.5); add('bold', -0.4); }
  if (v.some((x) => /premium|luxury/.test(x))) { add('modern', -0.5); add('serious', 0.6); add('bold', -0.3); }
  if (v.some((x) => /playful|cute/.test(x))) { add('serious', -0.8); add('bold', 0.3); }
  if (v.some((x) => /traditional|desi|retro/.test(x))) { add('modern', -0.6); add('bold', 0.3); }
  if (v.some((x) => /natural|handmade/.test(x))) { add('precise', -0.6); add('serious', -0.2); }
  if (v.some((x) => /bold|festive/.test(x))) add('bold', 0.6);
  if (v.some((x) => /modern/.test(x))) add('modern', 0.7);
  return p;
}
function rankFonts(prefs) {
  const t = [prefs.modern || 0, prefs.serious || 0, prefs.bold || 0, prefs.precise || 0];
  return Object.keys(TRAITS).map((f) => [f, TRAITS[f].reduce((a, v, i) => a + (v - t[i]) ** 2, 0)]).sort((a, b) => a[1] - b[1]).map(([f]) => f);
}
function treatmentsFor(prefs) {
  const out = [];
  if (prefs.serious < -0.2) out.push('dot', 'shadow', 'split');
  if (prefs.modern > 0.2) out.push('cut', 'dot', 'split');
  if (prefs.modern < -0.2) out.push('swash');
  if (prefs.precise < -0.2) out.push('swash');
  if (prefs.bold > 0.4) out.push('shadow');
  out.push('split', 'dot', 'swash');
  return [...new Set(out)];
}
const caseFor = (font, prefs, i) => (['Bebas Neue', 'Marcellus'].includes(font) ? 'upper' : font === 'Caveat' || font === 'Shrikhand' ? 'title' : prefs.serious < -0.3 && TRAITS[font]?.[0] > 0 ? 'lower' : prefs.modern > 0.4 && i % 2 ? 'upper' : prefs.modern > 0.4 ? 'lower' : 'title');
const trackFor = (font, c) => (c === 'upper' ? (['Bebas Neue'].includes(font) ? 6 : 14) : c === 'lower' ? -2 : 0);

// ctx = { name, brief, category, prefs, type, shape, colors:[c1,c2], idea, sketch }
export function designLogos(ctx) {
  const name = (ctx.name || 'Brand').trim(), cat = ctx.category || detectCategory(`${ctx.brief} ${ctx.idea || ''}`);
  const prefs = { modern: 0, serious: 0, bold: 0, precise: 0, ...(ctx.prefs || {}) };
  const deva = hasDeva(name);
  const fonts = deva ? ['Tiro Devanagari Hindi', 'Mukta', 'Tiro Devanagari Hindi', 'Mukta', 'Tiro Devanagari Hindi', 'Mukta'] : rankFonts(prefs);
  const glyphs = glyphsFor(cat, ctx.idea);
  const treats = treatmentsFor(prefs);
  const [c1, c2] = ctx.colors?.length ? [ctx.colors[0], ctx.colors[1] || ctx.colors[0]] : ['#2a2420', '#c8553d'];
  const primary = readable(c1, '#faf7f2', 3), secondary = c2;
  const shape = ctx.shape && ctx.shape !== 'none' ? ctx.shape : null;
  const sketch = ctx.sketch ? { source: 'sketch', sketch: ctx.sketch } : null;
  const mark = (i, container = 'none', style = 'fill') => (sketch ? { ...sketch, container, style } : { source: 'glyph', glyph: glyphs[i % glyphs.length], container, style });
  const W = (prefs.bold > 0.3 ? 'bold' : prefs.bold < -0.3 ? 'regular' : null);
  const S = (layout, i, extra = {}) => {
    const font = fonts[i % fonts.length], c = caseFor(font, prefs, i);
    return { name, layout, font, weight: W || (VARIABLE(font) && i % 2 === 0 ? 'bold' : 'regular'), case: c, tracking: trackFor(font, c), treatment: 'none', mark: { source: 'none' }, colors: { primary, secondary }, sub: '', category: cat, ...extra };
  };
  const sub = CATEGORIES[cat]?.sub || '';
  const gens = genReady() && !deva ? genMarks(name, ctx.seed ?? hash(name), 6, prefs) : null;
  const G = (i, fallback) => (gens ? { source: 'gen', gen: gens[i], container: 'none' } : fallback);
  const swapOk = /[oO0]/.test(name.slice(1)) || /[oO]/.test(name);
  const lists = {
    wordmark: [S('wordmark', 0, { treatment: treats[0] }), S('wordmark', 1, { treatment: 'none' }), S('mark-left', 2, { mark: G(0, mark(1)) }), S('wordmark', 3, { treatment: swapOk ? 'swap' : treats[1], mark: mark(0) }), S('stacked', 4, { sub }), S('mark-top', 5, { mark: G(1, { source: 'none', container: shape || 'circle' }) })],
    lettermark: [S('mark-top', 0, { mark: G(0, mark(0, shape || 'circle')) }), S('mark-top', 1, { mark: G(1, mark(1)) }), S('lettermark', 2, { mark: { source: 'none', container: shape || 'circle' } }), S('mark-left', 3, { mark: G(2, mark(2)) }), S('wordmark', 4, { treatment: treats[0] }), S('emblem', 5, { mark: G(3, mark(1)), sub })],
    symbol: [S('mark-left', 0, { mark: mark(0, 'none') }), S('mark-top', 1, { mark: G(0, mark(1, shape || 'circle')) }), S('mark-left', 2, { mark: G(1, mark(2, shape || 'square')) }), S('wordmark', 3, { treatment: swapOk ? 'swap' : treats[0], mark: mark(0) }), S('mark-top', 4, { mark: mark(1, shape || 'circle') }), S('stacked', 5, { sub })],
    emblem: [S('emblem', 0, { mark: mark(0), sub }), S('emblem', 1, { mark: G(0, mark(1, 'circle', 'line')), sub }), S('mark-top', 2, { mark: mark(2, shape || 'arch') }), S('lettermark', 3, { mark: { source: 'none', container: shape || 'shield' } }), S('mark-top', 4, { mark: G(1, mark(0)) }), S('stacked', 5, { sub })],
  };
  // first impressions matter: mostly one-of-a-kind letter marks, only one plain type option
  lists.surprise = gens ? [S('mark-top', 0, { mark: G(0) }), S('mark-left', 1, { mark: G(1) }), S('emblem', 2, { mark: G(2), sub }), S('mark-top', 3, { mark: G(3) }), S('mark-left', 5, { mark: G(4) }), S('wordmark', 4, { treatment: swapOk ? 'swap' : treats[0] === 'none' ? treats[1] || 'underline' : treats[0], mark: mark(0) })]
    : [lists.wordmark[0], lists.lettermark[0], lists.symbol[0], lists.emblem[1], lists.wordmark[4], lists.lettermark[3]];
  // their own drawing leads: 4 of the 6 use it
  const drawn = [S('mark-left', 0, { mark: mark(0) }), S('mark-top', 1, { mark: mark(0, 'none') }), S('emblem', 2, { mark: mark(0), sub }), swapOk ? S('wordmark', 3, { treatment: 'swap', mark: mark(0) }) : S('mark-left', 3, { mark: mark(0, shape || 'circle') }), S('wordmark', 4, { treatment: treats[0] }), S('stacked', 5, { sub })];
  const out = (sketch ? drawn : lists[ctx.type] || lists.surprise).map((s, i) => ({ ...s, colors: i % 3 === 1 ? { primary, secondary: primary } : { primary, secondary } }));
  return enforceLogos(out, { ...ctx, name, category: cat });
}

// quality rules, enforced in code (whatever the AI returns)
export function enforceLogos(specs, ctx) {
  const name = (ctx.name || 'Brand').trim(), cat = ctx.category || 'general';
  const allowed = glyphsFor(cat, ctx.idea), deva = hasDeva(name);
  const fontsAll = deva ? ['Tiro Devanagari Hindi', 'Mukta'] : LOGO_FONTS;
  const hex = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);
  const used = new Set();
  let out = (specs || []).filter(Boolean).slice(0, 6).map((s, i) => {
    const o = { ...s, name };
    o.layout = LAYOUTS[o.layout] ? o.layout : 'wordmark';
    o.font = fontsAll.includes(o.font) ? o.font : fontsAll[i % fontsAll.length];
    o.weight = o.weight === 'bold' && VARIABLE(o.font) ? 'bold' : 'regular';
    o.case = ['upper', 'lower', 'title'].includes(o.case) ? o.case : 'title';
    o.tracking = Math.max(-4, Math.min(30, +o.tracking || 0));
    o.treatment = TREATMENTS[o.treatment] ? o.treatment : 'none';
    if (o.treatment === 'outline' && !(['Bebas Neue', 'Abril Fatface', 'Shrikhand', 'Unbounded', 'Rozha One'].includes(o.font))) o.treatment = 'none'; // thin outlines vanish when small
    const m = { source: 'none', container: 'none', style: 'fill', ...(o.mark || {}) };
    if (m.source === 'sketch' && !ctx.sketch) m.source = 'glyph';
    if (m.source === 'gen' && !m.gen) m.source = 'glyph';
    if (m.source === 'sketch') m.sketch = ctx.sketch;
    if (m.source === 'glyph' && !allowed.includes(m.glyph)) m.glyph = allowed[i % allowed.length];
    if (!CONTAINERS[m.container]) m.container = 'none';
    if (['mark-left', 'mark-top'].includes(o.layout) && m.source === 'none') { m.source = ctx.sketch ? 'sketch' : 'glyph'; m.glyph = allowed[i % allowed.length]; if (ctx.sketch) m.sketch = ctx.sketch; }
    if (o.layout === 'emblem') m.container = 'circle';
    o.mark = m;
    if (o.treatment === 'swap' && m.source === 'none') { o.mark = { ...m, source: ctx.sketch ? 'sketch' : 'glyph', glyph: allowed[0], ...(ctx.sketch ? { sketch: ctx.sketch } : {}) }; }
    if (o.treatment === 'swap' && !/[oO0]/.test(name)) o.treatment = 'dot';
    o.colors = { primary: readable(hex(o.colors?.primary, '#2a2420'), '#faf7f2', 3), secondary: hex(o.colors?.secondary, hex(o.colors?.primary, '#c8553d')) };
    o.sub = ['emblem', 'stacked'].includes(o.layout) ? String(o.sub || '').slice(0, 18) : '';
    o.category = cat;
    return o;
  });
  // no two alike: layout+font must differ; fonts shouldn't repeat
  out.forEach((o, i) => {
    if (used.has(o.font) && !deva) o.font = fontsAll.find((f) => !used.has(f)) || o.font;
    used.add(o.font);
  });
  // at least 3 type-led options
  let tl = out.filter(TYPE_LED).length;
  for (let i = out.length - 1; i >= 0 && tl < 3; i--) if (!TYPE_LED(out[i])) { out[i] = { ...out[i], layout: 'wordmark', treatment: 'split' }; tl++; }
  return out;
}

// "More like this": 4 close variations of one logo
export function variations(spec) {
  const near = rankFonts({ modern: TRAITS[spec.font]?.[0] || 0, serious: TRAITS[spec.font]?.[1] || 0, bold: TRAITS[spec.font]?.[2] || 0, precise: TRAITS[spec.font]?.[3] || 0 }).filter((f) => f !== spec.font);
  const tr = Object.keys(TREATMENTS).filter((t) => t !== spec.treatment && t !== 'outline' && (t !== 'swap' || spec.mark?.source !== 'none'));
  const cases = ['title', 'upper', 'lower'].filter((c) => c !== spec.case);
  const v = [
    { ...spec, font: near[0], tracking: trackFor(near[0], spec.case) },
    { ...spec, treatment: tr[0] || 'none' },
    { ...spec, font: near[1], case: cases[0], tracking: trackFor(near[1], cases[0]) },
    { ...spec, weight: spec.weight === 'bold' ? 'regular' : 'bold', treatment: tr[1] || spec.treatment, ...(spec.mark?.source !== 'none' ? { mark: { ...spec.mark, container: spec.mark.container === 'none' ? 'circle' : 'none' } } : {}) },
  ];
  return v.map((s) => ({ ...s, weight: s.weight === 'bold' && VARIABLE(s.font) ? 'bold' : 'regular' }));
}
