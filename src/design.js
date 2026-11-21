// The "design plan": a small JSON object that fully describes a packaging design.
// The AI (or the built-in designer) writes plans; Wrapt's engine draws them.
// Because a plan is data, not a picture, every result stays editable.
import { contrast, luminance, mix, isDark, autoInk, readable, averageColor, logoCoverage, paper, ink, FONTS, PATTERNS, BORDERS, ICONS, LOGO_SHAPES } from './art.js';

export const PRODUCTS = ['can', 'box', 'tub', 'jar', 'pouch'];
export const STYLES = ['classic', 'bold', 'minimal', 'heritage'];
export const PLAN_KEYS = { product: PRODUCTS, style: STYLES, fontsDisplay: Object.keys(FONTS), pattern: Object.keys(PATTERNS).filter((p) => p !== 'none').concat('none'), border: Object.keys(BORDERS).filter((b) => b !== 'image'), logoShape: LOGO_SHAPES, icon: Object.keys(ICONS), finish: ['gloss', 'matte', 'metallic'], light: ['studio', 'sunlit', 'dramatic'] };

/* Example plan
{
  concept: "Premium", name: "Amma ka Achaar", tagline: "Small-batch mango pickle", detail: "Raw mango · 250 g",
  product: "jar", style: "heritage",
  palette: { pack: "#5b1a18", accent: "#e0a83a", background: "#f1e4cf" },
  fonts: { display: "DM Serif Display", body: "Inter" },
  pattern: { type: "kalamkari", opacity: 0.16 }, border: { type: "temple" },
  logo: { shape: "badge", icon: "fruit", monogram: "AK" },
  finish: "gloss", light: "sunlit",
  reasoning: { colour: "...", type: "...", layout: "..." }
}
*/

// ---------- built-in designer (works without AI; also the fallback) ----------
const KW = (t, words) => words.some((w) => t.includes(w));
const PALETTES = {
  mango: ['#f2a900', '#7a2e0e'], pickle: ['#6b1d14', '#e8a23a'], chocolate: ['#3a1f17', '#d9a066'], coffee: ['#2b1d16', '#c9915c'],
  tea: ['#1f5a4a', '#e7c27a'], herbal: ['#2f5d3a', '#e8dcb5'], spice: ['#9b2915', '#f4c542'], honey: ['#e3a31b', '#3d2410'],
  rose: ['#f4c7cf', '#9c2a4b'], ocean: ['#14466b', '#9bd3e6'], berry: ['#5c1a4a', '#f29bbd'], dairy: ['#f5efe2', '#2d5c8a'],
  lemon: ['#f3e15a', '#2c6e49'], festive: ['#7a1027', '#e8b04a'], kids: ['#ffcf3f', '#e4572e'], luxe: ['#111111', '#c9a35a'],
  default: ['#26324a', '#e9a03b'],
};
const COLOR_WORDS = { red: '#c0392b', green: '#2f7d4a', blue: '#2a5ca8', yellow: '#f2c230', orange: '#ec7b2c', pink: '#ee8fb0', purple: '#6c3b9e', black: '#141414', white: '#f6f3ee', gold: '#c9a35a', brown: '#5a3624', maroon: '#6e1423', teal: '#1f7a7a', cream: '#f3e7cf', navy: '#1b2a4a' };

export function detectProduct(t) {
  for (const p of PRODUCTS) if (new RegExp(`\\b${p}\\b`).test(t)) return p; // user named the pack
  if (KW(t, ['ice cream', 'icecream', 'kulfi', 'dessert', 'curd', 'yogurt', 'kheer', 'pudding', 'mousse'])) return 'tub';
  if (KW(t, ['juice', 'soda', 'kombucha', 'beer', 'drink', 'cola', 'energy', 'sparkling', 'cold brew'])) return 'can';
  if (KW(t, ['pickle', 'achaar', 'achar', 'jam', 'honey', 'ghee', 'chutney', 'spread', 'face cream', 'balm', 'butter'])) return 'jar';
  if (KW(t, ['chai', 'tea', 'coffee', 'masala', 'spice', 'snack', 'chips', 'namkeen', 'granola', 'nuts', 'pouch', 'makhana', 'flour'])) return 'pouch';
  return 'box';
}
function detectPalette(t) {
  const order = [['mango', ['mango', 'aam']], ['pickle', ['pickle', 'achaar', 'achar']], ['chocolate', ['chocolate', 'brownie', 'cocoa']], ['coffee', ['coffee', 'espresso']], ['tea', ['chai', 'tea']], ['herbal', ['herbal', 'organic', 'ayurved', 'natural', 'tulsi', 'neem', 'green']], ['spice', ['spice', 'masala', 'chili', 'mirch', 'hot']], ['honey', ['honey', 'ghee']], ['rose', ['rose', 'skincare', 'beauty', 'soap', 'candle']], ['ocean', ['ocean', 'sea', 'water', 'fresh']], ['berry', ['berry', 'jamun', 'grape']], ['dairy', ['milk', 'dairy', 'curd', 'paneer', 'yogurt']], ['lemon', ['lemon', 'lime', 'nimbu', 'citrus']], ['festive', ['diwali', 'festive', 'wedding', 'mithai', 'gift', 'sweets']], ['kids', ['kids', 'children', 'fun', 'candy']], ['luxe', ['luxury', 'luxe', 'perfume', 'premium']]];
  for (const [k, words] of order) if (KW(t, words)) return PALETTES[k];
  return PALETTES.default;
}
function detectIcon(t) {
  const m = [['fruit', ['mango', 'fruit', 'apple', 'orange', 'lemon', 'berry', 'jamun']], ['chili', ['pickle', 'achaar', 'chili', 'mirch', 'spice', 'masala', 'hot']], ['cup', ['chai', 'tea', 'coffee']], ['bean', ['coffee bean', 'cocoa', 'chocolate']], ['cake', ['cake', 'dessert', 'brownie', 'bakery', 'mithai', 'sweet']], ['leaf', ['herbal', 'organic', 'tulsi', 'neem', 'natural', 'green']], ['drop', ['oil', 'juice', 'water', 'ghee', 'honey', 'serum']], ['wheat', ['flour', 'atta', 'granola', 'grain', 'bread', 'cookie']], ['flower', ['rose', 'flower', 'soap', 'candle', 'skincare']], ['heart', ['love', 'kids', 'homemade', 'mom', 'amma', 'maa']]];
  for (const [icon, words] of m) if (KW(t, words)) return icon;
  return 'star';
}
function detectName(brief) {
  const q = brief.match(/["“'‘]([^"”'’]{2,40})["”'’]/);
  if (q) return q[1].trim();
  const n = brief.match(/(?:called|named|brand(?: name)?(?: is)?)\s+([A-Zऀ-ॿ][\wऀ-ॿ'&-]*(?:\s+[A-Zऀ-ॿ][\wऀ-ॿ'&-]*){0,3})/);
  if (n) return n[1].trim();
  const t = brief.toLowerCase();
  const thing = ['mango pickle', 'pickle', 'chai', 'coffee', 'honey', 'chocolate', 'ice cream', 'juice', 'cookies', 'candles', 'soap', 'spices', 'snacks', 'tea'].find((w) => t.includes(w));
  return thing ? `The ${thing.replace(/\b\w/g, (c) => c.toUpperCase())} Co.` : 'Your Brand';
}
const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function designLocally(brief, { refColors = [], hasLogo = false } = {}) {
  const t = ` ${brief.toLowerCase()} `;
  const kidsy = KW(t, ['kids', 'children', 'fun', 'playful', 'bright']);
  const product = detectProduct(t);
  let [base, acc] = kidsy && !KW(t, ['mango']) ? PALETTES.kids : detectPalette(t);
  if (kidsy && KW(t, ['mango'])) [base, acc] = ['#ffb627', '#e4572e'];
  const tc = t.replace(/(ice|face|body|sour|whipped|fresh)[\s-]+cream|cream cheese|cold brew|black (?:coffee|tea|pepper|salt)|green (?:tea|chilli|chili)|orange juice/g, ' ');
  const named = Object.entries(COLOR_WORDS).filter(([w]) => new RegExp(`\\b${w}\\b`).test(tc)).map(([, c]) => c);
  if (named[0]) base = named[0]; if (named[1]) acc = named[1];
  if (refColors.length >= 2) { base = refColors[0]; acc = refColors[1]; }
  const name = detectName(brief);
  const icon = detectIcon(t);
  const traditional = KW(t, ['traditional', 'desi', 'indian', 'homemade', 'heritage', 'amma', 'nani', 'dadi', 'festive', 'diwali', 'mithai', 'handmade', 'village', 'ethnic', 'achaar', 'pickle']);
  const hindi = /[ऀ-ॿ]/.test(name);
  const tagline = KW(t, ['homemade', 'amma', 'nani', 'mom']) ? 'Made the way it is at home' : KW(t, ['organic', 'natural', 'herbal']) ? 'Pure, honest, natural' : KW(t, ['premium', 'luxury']) ? 'Crafted in small batches' : 'Made with care';
  const detail = { jar: 'Net wt. 250 g', can: '330 ml', tub: 'Net wt. 450 g', pouch: 'Net wt. 200 g', box: 'Net wt. 250 g' }[product];
  const deeper = luminance(base) < luminance(acc) ? base : acc;
  const dark = isDark(deeper) ? deeper : mix(deeper, '#14100c', 0.45);
  const light = isDark(base) ? mix(acc, '#ffffff', 0.82) : mix(base, '#ffffff', 0.86);
  const mono = name.replace(/^the\s+/i, '').split(/\s+/).map((w) => [...w][0]).join('').slice(0, 2);

  const premium = {
    concept: 'Premium', name, tagline, detail, product, style: 'classic',
    palette: { pack: dark, accent: mix(acc, '#d8b16a', 0.35), background: mix(dark, '#f4ecdf', 0.85) },
    fonts: { display: hindi ? 'Tiro Devanagari Hindi' : 'DM Serif Display', body: 'Inter' },
    pattern: { type: traditional ? 'kalamkari' : 'none', opacity: 0.12 }, border: { type: 'double' },
    logo: { shape: 'badge', icon, monogram: mono }, finish: product === 'can' ? 'metallic' : 'gloss', light: 'dramatic',
    reasoning: { colour: `A deep ${isDark(base) ? 'base' : 'version of your colour'} with a gold-leaning accent reads as expensive and lets the logo glow.`, type: 'A high-contrast serif signals craft and quality, like a patisserie or a fine tea house.', layout: 'Classic centred layout with a fine double rule — calm, symmetrical, and easy to trust.' },
  };
  const minimal = {
    concept: 'Minimal', name, tagline, detail, product, style: 'minimal',
    palette: { pack: isDark(base) ? acc : base, accent: isDark(base) ? base : acc, background: '#f2f0eb' },
    fonts: { display: hindi ? 'Mukta' : 'Instrument Serif', body: hindi ? 'Mukta' : 'Inter' },
    pattern: { type: 'none', opacity: 0 }, border: { type: 'none' },
    logo: { shape: 'wordmark', icon: 'none', monogram: mono }, finish: 'matte', light: 'studio',
    reasoning: { colour: 'A near-white pack with one strong colour band: clean, modern, and stands out on a crowded shelf.', type: 'An elegant serif name with a quiet sans for details keeps it airy.', layout: 'Lots of empty space and one bottom band — the product feels honest and contemporary.' },
  };
  const third = traditional ? {
    concept: 'Traditional', name, tagline, detail, product, style: 'heritage',
    palette: { pack: mix(acc, '#fff6e6', 0.78), accent: isDark(base) ? base : mix(base, '#6e1423', 0.5), background: '#f6e7cf' },
    fonts: { display: hindi ? 'Tiro Devanagari Hindi' : 'DM Serif Display', body: hindi ? 'Mukta' : 'Inter' },
    pattern: { type: KW(t, ['rangoli', 'kolam', 'festive', 'diwali']) ? 'rangoli' : KW(t, ['tribal', 'warli', 'village']) ? 'warli' : 'blockprint', opacity: 0.55 }, border: { type: 'temple' },
    logo: { shape: 'arch', icon, monogram: mono }, finish: 'matte', light: 'sunlit',
    reasoning: { colour: 'Warm cream with a rich festive accent feels homemade and familiar — like something from nani\'s kitchen.', type: 'A warm serif headline with a simple body font keeps it traditional but readable.', layout: 'Indian block-print bands frame the label, like the border of a sari — instantly desi, never cluttered.' },
  } : {
    concept: 'Playful', name, tagline, detail, product, style: 'bold',
    palette: { pack: isDark(base) ? mix(acc, '#ffffff', 0.15) : base, accent: isDark(base) ? base : mix(acc, '#000000', 0.1), background: mix(acc, '#ffffff', 0.75) },
    fonts: { display: hindi ? 'Mukta' : 'Bebas Neue', body: 'Space Grotesk' },
    pattern: { type: 'dots', opacity: 0.18 }, border: { type: 'none' },
    logo: { shape: 'stamp', icon, monogram: mono }, finish: 'gloss', light: 'sunlit',
    reasoning: { colour: 'A bright pack with a contrasting diagonal band grabs attention and feels fun and young.', type: 'A tall condensed display font is loud and confident, perfect for Instagram.', layout: 'An oversized logo and a dynamic diagonal stripe give it energy.' },
  };
  const order = kidsy && !traditional ? [third, minimal, premium] : traditional ? [third, premium, minimal] : [premium, minimal, third];
  return order.map((p) => normalizePlan(p, { hasLogo }));
}

// Refine with simple language rules (fallback when AI is unavailable).
export function refineLocally(plan, instruction) {
  const t = ` ${instruction.toLowerCase()} `, p = structuredClone(plan); const did = [];
  const col = Object.entries(COLOR_WORDS).find(([w]) => new RegExp(`\\b${w}\\b`).test(t));
  if (col && KW(t, ['accent', 'text', 'border', 'gold'])) { p.palette.accent = col[1]; did.push(`accent → ${col[0]}`); }
  else if (col) { p.palette.pack = col[1]; did.push(`pack colour → ${col[0]}`); }
  if (KW(t, ['modern', 'clean', 'simple', 'minimal'])) { p.style = 'minimal'; p.fonts.display = 'Instrument Serif'; p.pattern.type = 'none'; p.border.type = 'none'; did.push('cleaner, more minimal'); }
  if (KW(t, ['premium', 'luxury', 'expensive', 'elegant', 'classy'])) { p.style = 'classic'; p.palette.pack = mix(p.palette.pack, '#000000', 0.5); p.palette.accent = '#c9a35a'; p.fonts.display = 'DM Serif Display'; p.border.type = 'double'; p.finish = 'gloss'; p.light = 'dramatic'; did.push('more premium'); }
  if (KW(t, ['fun', 'playful', 'young', 'bright', 'loud'])) { p.style = 'bold'; p.fonts.display = 'Bebas Neue'; p.pattern = { type: 'dots', opacity: 0.2 }; did.push('more playful'); }
  if (KW(t, ['traditional', 'desi', 'indian', 'ethnic', 'festive', 'diwali'])) { p.style = 'heritage'; p.border.type = 'temple'; p.pattern = { type: KW(t, ['diwali', 'festive']) ? 'rangoli' : 'blockprint', opacity: 0.5 }; did.push('more traditional'); }
  for (const pat of Object.keys(PATTERNS)) if (t.includes(pat)) { p.pattern = { type: pat, opacity: p.pattern?.opacity || 0.3 }; did.push(`${PATTERNS[pat]} pattern`); }
  if (KW(t, ['no pattern', 'remove pattern', 'without pattern'])) { p.pattern.type = 'none'; did.push('pattern removed'); }
  if (KW(t, ['bigger logo', 'larger logo', 'logo bigger'])) { p.logoScale = Math.min(1.4, (p.logoScale || 1) + 0.2); did.push('bigger logo'); }
  if (KW(t, ['smaller logo', 'logo smaller'])) { p.logoScale = Math.max(0.5, (p.logoScale || 1) - 0.2); did.push('smaller logo'); }
  for (const prod of PRODUCTS) if (new RegExp(`\\b${prod}\\b`).test(t)) { p.product = prod; did.push(`on a ${prod}`); }
  if (KW(t, ['matte'])) p.finish = 'matte'; if (KW(t, ['shiny', 'gloss'])) p.finish = 'gloss'; if (KW(t, ['metal'])) p.finish = 'metallic';
  if (KW(t, ['hindi'])) { p.fonts.display = 'Tiro Devanagari Hindi'; did.push('Hindi-ready font'); }
  const nm = instruction.match(/(?:rename|call it|name it|name to)\s+["“']?([^"”']+)["”']?/i); if (nm) { p.name = nm[1].trim(); did.push(`renamed to ${p.name}`); }
  const tg = instruction.match(/tagline\s+(?:to\s+)?["“']([^"”']+)["”']/i); if (tg) { p.tagline = tg[1]; did.push('new tagline'); }
  return { plan: normalizePlan(p), note: did.length ? `Done: ${did.join(', ')}.` : "I couldn't work that out offline — try words like modern, premium, playful, traditional, a colour, 'bigger logo', or a product (jar, can…)." };
}

// Keep any plan (from AI or local) inside the values Wrapt can render.
export function normalizePlan(p, { hasLogo } = {}) {
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const hexOk = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);
  p = { ...p };
  p.product = pick(p.product, PRODUCTS, 'box');
  p.style = pick(p.style, STYLES, 'classic');
  p.palette = { pack: hexOk(p.palette?.pack, '#26324a'), accent: hexOk(p.palette?.accent, '#e9a03b'), background: hexOk(p.palette?.background, '#efe9df') };
  // make sure accent text/rules read on the pack (the AI sometimes picks two mid-tones)
  if (p.style !== 'bold') p.palette.accent = readable(p.palette.accent, p.style === 'minimal' ? mix(p.palette.pack, '#ffffff', 0.9) : p.palette.pack, 2.2);
  p.fonts = { display: pick(p.fonts?.display, Object.keys(FONTS), 'DM Serif Display'), body: pick(p.fonts?.body, Object.keys(FONTS), 'Inter') };
  if (/[ऀ-ॿ]/.test(`${p.name}${p.tagline}`) && !['Tiro Devanagari Hindi', 'Mukta'].includes(p.fonts.display)) p.fonts.display = 'Tiro Devanagari Hindi';
  p.pattern = { type: pick(p.pattern?.type, Object.keys(PATTERNS), 'none'), opacity: Math.min(0.7, Math.max(0, +p.pattern?.opacity || 0.18)) };
  p.border = { type: pick(p.border?.type, Object.keys(BORDERS), 'none') };
  p.logo = { shape: pick(p.logo?.shape, LOGO_SHAPES, 'badge'), icon: pick(p.logo?.icon, Object.keys(ICONS), 'star'), monogram: String(p.logo?.monogram || '').slice(0, 2) };
  p.finish = pick(p.finish, ['gloss', 'matte', 'metallic'], 'gloss');
  p.light = pick(p.light, ['studio', 'sunlit', 'dramatic'], 'studio');
  p.name = String(p.name || 'Your Brand').slice(0, 40); p.tagline = String(p.tagline || '').slice(0, 60); p.detail = String(p.detail || '').slice(0, 50);
  p.reasoning = p.reasoning || {};
  if (hasLogo !== undefined) p.useMyLogo = hasLogo;
  return p;
}

// ---------- design audit ----------
// Returns problems + one-click fixes. Each fix returns a patch for the brand.
export function audit(b, product) {
  const out = [], pap = paper(b), fg = ink(b);
  const c1 = contrast(fg, pap);
  if (c1 < 4.5) out.push({ level: 'high', msg: `Body text is hard to read (contrast ${c1.toFixed(1)}:1, needs 4.5).`, fix: 'Fix text colour', patch: { ink: autoInk(pap) } });
  const c2 = contrast(b.accent, pap);
  if (c2 < 1.6 && b.style !== 'bold') out.push({ level: 'mid', msg: 'Accent colour almost disappears on the pack.', fix: 'Boost accent', patch: { accent: readable(b.accent, pap, 2.4) } });
  // logos that are mostly solid (round badges etc.) bring their own background, so they can't blend in
  if (b.logo && !b.logoPlate && b.logoSource !== 'ai' && logoCoverage(b.logo) < 0.5) {
    const lc = contrast(averageColor(b.logo), pap);
    if (lc < 1.5) out.push({ level: 'high', msg: 'Your logo blends into the pack colour.', fix: 'Add a logo badge', patch: { logoPlate: true } });
  }
  if ((b.logoScale ?? 1) > 1.15 && ['tub', 'jar', 'can'].includes(product)) out.push({ level: 'mid', msg: 'Logo is very large — it may wrap around the curve and look stretched.', fix: 'Shrink logo', patch: { logoScale: 1 } });
  if (Math.abs(b.logoY ?? 0) > 0.12) out.push({ level: 'low', msg: 'Logo is close to the top/bottom edge.', fix: 'Centre logo', patch: { logoY: 0 } });
  if ((b.tagline || '').length > 38) out.push({ level: 'low', msg: 'Tagline is long — it will be shrunk to fit and may get small.', fix: null });
  if ((b.pattern?.opacity ?? 0) > 0.4 && b.style !== 'heritage' && b.pattern?.type !== 'none') out.push({ level: 'mid', msg: 'Pattern is strong and competes with the logo.', fix: 'Soften pattern', patch: { pattern: { ...b.pattern, opacity: 0.16 } } });
  if (b.artwork) out.push({ level: 'low', msg: 'Using your own artwork — audit checks only the colours Wrapt controls.', fix: null });
  return out;
}

// ---------- AI client ----------
// Calls /api/design (Gemini on the server). Returns null if the AI isn't available (e.g. preview).
export async function askAI(body) {
  try {
    const r = await fetch('/api/design', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); return { error: j.error || `AI error ${r.status}`, unavailable: r.status === 404 || r.status === 405 || /missing/i.test(j.error || '') }; }
    return await r.json();
  } catch (e) { return { error: 'AI not reachable', unavailable: true }; }
}
