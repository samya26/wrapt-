// The "design plan": a small JSON object that fully describes a packaging design.
// The AI (or the built-in designer) writes plans; Wrapt's engine draws them.
// Because a plan is data, not a picture, every result stays editable.
import { contrast, luminance, mix, isDark, autoInk, readable, averageColor, logoCoverage, plainCorners, paper, ink, FONTS, PATTERNS, BORDERS, CENTRES, borderType } from './art.js';

export const PRODUCTS = ['can', 'slimcan', 'box', 'tub', 'jar', 'pouch', 'bottle', 'tube', 'papertube', 'cup', 'card', 'bag', 'tin', 'lidbox', 'bar', 'dropper', 'pump', 'takeout', 'drawer'];
export const STYLES = ['classic', 'poster', 'label', 'monogram', 'editorial', 'minimal', 'heritage', 'folk', 'matchbox'];
export const STYLE_NAMES = { classic: 'Classic', poster: 'Poster', label: 'Jar label', monogram: 'Signature pattern', editorial: 'Editorial', minimal: 'Minimal', heritage: 'Heritage', folk: 'Folk poster', matchbox: 'Matchbox label' };
export const PLAN_KEYS = { product: PRODUCTS, style: STYLES, fontsDisplay: Object.keys(FONTS), pattern: Object.keys(PATTERNS).filter((p) => p !== 'none').concat('none'), border: Object.keys(BORDERS).filter((b) => b !== 'image'), finish: ['gloss', 'matte', 'metallic'], light: ['studio', 'sunlit', 'dramatic'] };

/* Example plan
{
  concept: "Premium", name: "Amma ka Achaar", tagline: "Small-batch mango pickle", detail: "Raw mango · 250 g",
  product: "jar", style: "heritage",
  palette: { pack: "#5b1a18", accent: "#e0a83a", background: "#f1e4cf" },
  fonts: { display: "DM Serif Display", body: "Inter" },
  pattern: { type: "kalamkari", opacity: 0.16 }, border: { type: "jali" },
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

// Which packs make sense for what they sell (no keychains in a drink can).
const PACK_RULES = [
  [['earring', 'necklace', 'bracelet', 'jewel', 'ring '], ['lidbox', 'drawer', 'card', 'bag', 'box']],
  [['keychain', 'key chain', 'charm', 'accessor', 'sticker', 'bookmark', 'hair clip', 'scrunch', 'crochet', 'phone case', 'toy', 'stationery', 'polymer clay', 'resin', 'pin badge', 'magnet'], ['card', 'drawer', 'box', 'lidbox', 'bag']],
  [['chocolate bar', 'protein bar', 'granola bar', 'soap bar', 'bar of'], ['bar', 'box', 'lidbox']],
  [['noodle', 'momo', 'takeaway', 'take-away', 'cloud kitchen', 'biryani', 'fried rice', 'street food'], ['takeout', 'bag', 'cup', 'box']],
  [['serum', 'face oil', 'beard oil', 'essential oil', 'tincture'], ['dropper', 'bottle', 'box']],
  [['lotion', 'shampoo', 'conditioner', 'body wash', 'hand wash', 'face wash'], ['pump', 'bottle', 'tube']],
  [['cloth', 't-shirt', 'tshirt', 'saree', 'kurta', 'apparel', 'scarf', 'socks', 'shoe', 'sneaker', 'tote', 'fashion'], ['bag', 'box', 'card', 'pouch']],
  [['candle', 'wax', 'incense', 'agarbatti', 'dhoop'], ['jar', 'tin', 'box', 'papertube']],
  [['skincare', 'serum', 'lotion', 'shampoo', 'hair oil', 'face wash', 'lip', 'nail', 'makeup', 'perfume', 'soap', 'balm', 'sunscreen', 'face cream', 'body wash', 'cosmetic'], ['bottle', 'tube', 'dropper', 'pump', 'jar', 'tin']],
  [['ice cream', 'icecream', 'kulfi', 'dessert', 'curd', 'yogurt', 'kheer', 'pudding', 'mousse', 'gelato'], ['tub', 'cup', 'jar', 'box']],
  [['juice', 'soda', 'kombucha', 'beer', 'drink', 'cola', 'energy', 'sparkling', 'cold brew', 'water', 'lemonade', 'smoothie', 'milkshake', 'shake'], ['can', 'slimcan', 'bottle', 'cup']],
  [['sauce', 'ketchup', 'oil', 'vinegar', 'syrup', 'dressing'], ['bottle', 'jar', 'pouch']],
  [['pickle', 'achaar', 'achar', 'jam', 'honey', 'ghee', 'chutney', 'spread', 'butter'], ['jar', 'bottle', 'pouch']],
  [['coffee', 'espresso', 'beans'], ['pouch', 'box', 'papertube', 'can', 'cup']],
  [['tea', 'chai', 'tulsi', 'matcha', 'kahwa'], ['tin', 'box', 'pouch', 'papertube']],
  [['cookie', 'cake', 'brownie', 'bread', 'bakery', 'chocolate', 'mithai', 'sweets', 'laddoo', 'barfi', 'dessert box'], ['lidbox', 'drawer', 'box', 'bar', 'bag']],
  [['snack', 'chips', 'namkeen', 'granola', 'nuts', 'makhana', 'flour', 'pasta', 'spice', 'masala', 'rice', 'dal', 'cereal', 'oats', 'millet'], ['pouch', 'box', 'jar', 'papertube']],
  [['pet', 'dog', 'cat'], ['pouch', 'box', 'bag']],
];
const NAMED = { 'paper tube': 'papertube', 'gift tube': 'papertube', 'hang card': 'card', 'header card': 'card', 'shopping bag': 'bag', 'paper bag': 'bag', 'squeeze tube': 'tube', 'slim can': 'slimcan', 'gift box': 'lidbox', 'drawer box': 'drawer', 'matchbox': 'drawer', 'slide box': 'drawer', 'sliding box': 'drawer', 'takeout box': 'takeout', 'noodle box': 'takeout', 'pump bottle': 'pump', 'dropper bottle': 'dropper' };
export function allowedPacks(t) {
  t = ` ${String(t).toLowerCase()} `;
  for (const [words, packs] of PACK_RULES) if (KW(t, words)) return packs;
  return ['box', 'pouch', 'bag', 'bottle', 'card'];
}
export function detectProduct(t) {
  for (const [k, v] of Object.entries(NAMED)) if (t.includes(k)) return v;
  for (const p of PRODUCTS) if (new RegExp(`\\b${p}s?\\b`).test(t)) return p; // user named the pack
  return allowedPacks(t)[0];
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
  const accessory = allowedPacks(t)[0] === 'card' || allowedPacks(t)[0] === 'bag';
  const detail = accessory ? 'Handmade · 1 piece' : { drawer: 'Net wt. 250 g', jar: 'Net wt. 250 g', can: '330 ml', tub: 'Net wt. 450 g', pouch: 'Net wt. 200 g', box: 'Net wt. 250 g', bottle: '250 ml', tube: '100 ml', papertube: 'Net wt. 100 g', cup: '350 ml', card: '1 piece', bag: 'Gift bag', slimcan: '250 ml', tin: 'Net wt. 100 g', lidbox: 'Gift edition', bar: 'Net wt. 80 g', dropper: '30 ml', pump: '200 ml', takeout: 'Serves 1' }[product];
  const deeper = luminance(base) < luminance(acc) ? base : acc;
  const dark = isDark(deeper) ? deeper : mix(deeper, '#14100c', 0.45);
  const light = isDark(base) ? mix(acc, '#ffffff', 0.82) : mix(base, '#ffffff', 0.86);
  const mono = name.replace(/^the\s+/i, '').split(/\s+/).map((w) => [...w][0]).join('').slice(0, 2);

  const premium = {
    concept: 'Premium', name, tagline, detail, product, style: 'classic',
    palette: { pack: dark, accent: mix(acc, '#d8b16a', 0.35), background: mix(dark, '#f4ecdf', 0.85) },
    fonts: { display: hindi ? 'Tiro Devanagari Hindi' : 'DM Serif Display', body: 'Inter' },
    pattern: { type: traditional ? 'kalamkari' : 'none', opacity: 0.12 }, border: { type: KW(t, ['luxury', 'luxe', 'gift', 'perfume']) ? 'deco' : KW(t, ['natural', 'organic', 'herbal', 'tea', 'tulsi', 'skin']) ? 'botanical' : traditional ? 'arch' : 'double' }, finish: product === 'can' ? 'metallic' : 'gloss', light: 'dramatic',
    reasoning: { colour: `A deep ${isDark(base) ? 'base' : 'version of your colour'} with a gold-leaning accent reads as expensive and lets the logo glow.`, type: 'A high-contrast serif signals craft and quality, like a patisserie or a fine tea house.', layout: 'Classic centred layout with a fine double rule — calm, symmetrical, and easy to trust.' },
  };
  const minimal = {
    concept: 'Minimal', name, tagline, detail, product, style: 'minimal',
    palette: { pack: isDark(base) ? acc : base, accent: isDark(base) ? base : acc, background: '#f2f0eb' },
    fonts: { display: hindi ? 'Mukta' : 'Instrument Serif', body: hindi ? 'Mukta' : 'Inter' },
    pattern: { type: 'none', opacity: 0 }, border: { type: KW(t, ['handmade', 'craft', 'natural']) ? 'stitched' : 'crop' }, finish: 'matte', light: 'studio',
    reasoning: { colour: 'A near-white pack with one strong colour band: clean, modern, and stands out on a crowded shelf.', type: 'An elegant serif name with a quiet sans for details keeps it airy.', layout: 'Lots of empty space and one bottom band — the product feels honest and contemporary.' },
  };
  const third = traditional ? {
    concept: 'Traditional', name, tagline, detail, product, style: 'heritage',
    palette: { pack: mix(acc, '#fff6e6', 0.78), accent: isDark(base) ? base : mix(base, '#6e1423', 0.5), background: '#f6e7cf' },
    fonts: { display: hindi ? 'Tiro Devanagari Hindi' : 'DM Serif Display', body: hindi ? 'Mukta' : 'Inter' },
    pattern: { type: KW(t, ['rangoli', 'kolam', 'festive', 'diwali']) ? 'rangoli' : KW(t, ['tribal', 'warli', 'village']) ? 'warli' : 'blockprint', opacity: 0.55 }, border: { type: KW(t, ['gift', 'diwali', 'festive', 'mithai']) ? 'stamp' : 'jali' }, finish: 'matte', light: 'sunlit',
    reasoning: { colour: 'Warm cream with a rich festive accent feels homemade and familiar — like something from nani\'s kitchen.', type: 'A warm serif headline with a simple body font keeps it traditional but readable.', layout: 'Indian block-print bands frame the label, like the border of a sari — instantly desi, never cluttered.' },
  } : {
    concept: 'Playful', name, tagline, detail, product, style: 'poster',
    palette: { pack: isDark(base) ? mix(acc, '#ffffff', 0.15) : base, accent: isDark(base) ? base : mix(acc, '#000000', 0.1), background: mix(acc, '#ffffff', 0.75) },
    fonts: { display: hindi ? 'Mukta' : 'Bebas Neue', body: 'Space Grotesk' },
    pattern: { type: 'dots', opacity: 0.18 }, border: { type: KW(t, ['kids', 'candy', 'ice cream', 'icecream']) ? 'wavy' : KW(t, ['coffee', 'snack', 'chips', 'cafe']) ? 'ticket' : 'checker' }, finish: 'gloss', light: 'sunlit',
    reasoning: { colour: 'A bright pack with one strong colour block grabs attention and feels fun and young.', type: 'A tall condensed display font is loud and confident, perfect for Instagram.', layout: 'A big logo up top and a solid colour block for the words — bold, but every word stays readable.' },
  };
  // three more directions, each a different layout, so there are 6 to choose from
  const label = { ...premium, concept: 'Jar label', style: 'label', palette: { pack: isDark(base) ? base : mix(acc, '#000', 0.25), accent: mix(acc, '#000', 0.15), background: mix(acc, '#ffffff', 0.8) }, fonts: { display: hindi ? 'Tiro Devanagari Hindi' : 'Young Serif', body: 'Inter' }, pattern: { type: 'dots', opacity: 0.1 }, border: { type: 'none' }, finish: 'gloss', light: 'sunlit',
    reasoning: { colour: 'A rich pack colour with a cream oval label — the way jams and pickles have always looked trustworthy.', type: 'A warm serif feels homemade but tidy.', layout: 'An oval label holds the logo and line, like a hand-applied sticker.' } };
  const signature = { ...minimal, concept: 'Signature pattern', style: 'monogram', palette: { pack: light, accent: dark, background: mix(light, '#000', 0.05) }, fonts: { display: hindi ? 'Mukta' : 'Fraunces', body: 'Inter' }, pattern: { type: 'none', opacity: 0 }, border: { type: 'none' }, finish: 'matte', light: 'studio',
    reasoning: { colour: 'Soft tone-on-tone colours let the pattern whisper rather than shout.', type: 'A soft serif keeps it friendly and premium at once.', layout: 'Your own logo repeats as a quiet pattern behind a clean panel — like a luxury monogram, unique to you.' } };
  const editorial = { ...minimal, concept: 'Editorial', style: 'editorial', palette: { pack: isDark(base) ? '#f4efe6' : '#f7f3ec', accent: dark, background: '#e9e3d8' }, fonts: { display: hindi ? 'Tiro Devanagari Hindi' : 'Abril Fatface', body: 'Inter' }, pattern: { type: 'none', opacity: 0 }, border: { type: 'none' }, finish: 'matte', light: 'studio',
    reasoning: { colour: 'Paper-white with one deep colour, like a magazine cover.', type: 'A fat display serif set huge makes the name the hero.', layout: 'Big type, fine rules and a small lockup — confident and editorial.' } };
  const poster = third.style === 'poster' ? third : { ...minimal, concept: 'Playful', style: 'poster', palette: { pack: isDark(base) ? mix(acc, '#ffffff', 0.15) : base, accent: isDark(base) ? base : mix(acc, '#000000', 0.1), background: mix(acc, '#ffffff', 0.75) }, fonts: { display: hindi ? 'Mukta' : 'Bricolage Grotesque', body: 'Space Grotesk' }, pattern: { type: 'dots', opacity: 0.14 }, border: { type: 'none' }, finish: 'gloss', light: 'sunlit',
    reasoning: { colour: 'A bright pack with one strong colour block grabs attention.', type: 'A chunky modern grotesque is friendly and loud.', layout: 'Logo up top, words on a solid colour block — bold, and everything stays readable.' } };
  const first = kidsy && !traditional ? [poster, label, minimal] : traditional ? [third, premium, label] : [premium, minimal, poster];
  const order = [...first, ...[poster, label, signature, editorial, premium, minimal].filter((x) => !first.includes(x))].slice(0, 6);
  return order.map((p) => normalizePlan(p, { hasLogo }));
}

// Refine with simple language rules (fallback when AI is unavailable).
export function refineLocally(plan, instruction) {
  const t = ` ${instruction.toLowerCase()} `, p = structuredClone(plan); const did = [];
  const col = Object.entries(COLOR_WORDS).find(([w]) => new RegExp(`\\b${w}\\b`).test(t));
  if (col && KW(t, ['accent', 'text', 'border', 'gold'])) { p.palette.accent = col[1]; did.push(`accent → ${col[0]}`); }
  else if (col) { p.palette.pack = col[1]; did.push(`pack colour → ${col[0]}`); }
  if (KW(t, ['modern', 'clean', 'simple', 'minimal'])) { p.style = 'minimal'; p.fonts.display = 'Instrument Serif'; p.pattern.type = 'none'; p.border.type = 'crop'; did.push('cleaner, more minimal'); }
  if (KW(t, ['premium', 'luxury', 'expensive', 'elegant', 'classy'])) { p.style = 'classic'; p.palette.pack = mix(p.palette.pack, '#000000', 0.5); p.palette.accent = '#c9a35a'; p.fonts.display = 'DM Serif Display'; p.border.type = 'deco'; p.finish = 'gloss'; p.light = 'dramatic'; did.push('more premium'); }
  if (KW(t, ['folk', 'maximal', 'illustrat', 'busy', 'pinterest'])) { p.style = 'folk'; p.pattern = { type: 'folk', opacity: 1 }; p.fonts.display = 'Shrikhand'; p.border.type = 'none'; p.centre = 'none'; did.push('folk poster style'); }
  if (KW(t, ['matchbox', 'vintage', 'retro label'])) { p.style = 'matchbox'; p.pattern = { type: 'none', opacity: 0 }; p.fonts.display = 'Bebas Neue'; p.border.type = 'none'; p.centre = 'none'; did.push('matchbox label style'); }
  if (KW(t, ['fun', 'playful', 'young', 'bright', 'loud'])) { p.style = 'poster'; p.fonts.display = 'Bebas Neue'; p.pattern = { type: 'dots', opacity: 0.2 }; did.push('more playful'); }
  if (KW(t, ['traditional', 'desi', 'indian', 'ethnic', 'festive', 'diwali'])) { p.style = 'heritage'; p.border.type = 'jali'; p.pattern = { type: KW(t, ['diwali', 'festive']) ? 'rangoli' : 'blockprint', opacity: 0.5 }; did.push('more traditional'); }
  for (const pat of Object.keys(PATTERNS)) if (t.includes(pat)) { p.pattern = { type: pat, opacity: p.pattern?.opacity || 0.3 }; did.push(`${PATTERNS[pat]} pattern`); }
  if (KW(t, ['no pattern', 'remove pattern', 'without pattern'])) { p.pattern.type = 'none'; did.push('pattern removed'); }
  for (const [k, v] of Object.entries(BORDERS)) if (k !== 'none' && k !== 'image' && t.includes(v.toLowerCase())) { p.border = { type: k }; did.push(`${v} border`); }
  if (KW(t, ['no border', 'remove border', 'without border'])) { p.border = { type: 'none' }; did.push('border removed'); }
  for (const [k, v] of Object.entries(CENTRES)) if (k !== 'none' && t.includes(v.toLowerCase())) { p.centre = k; did.push(`${v} centre`); }
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
  p.centre = pick(p.centre, Object.keys(CENTRES), { classic: 'frame', minimal: 'none', bold: 'sunburst', heritage: 'arch' }[p.style] || 'none');
  p.style = pick(p.style === 'bold' ? 'poster' : p.style, STYLES, 'classic');
  p.palette = { pack: hexOk(p.palette?.pack, '#26324a'), accent: hexOk(p.palette?.accent, '#e9a03b'), background: hexOk(p.palette?.background, '#efe9df') };
  // make sure accent text/rules read on the pack (the AI sometimes picks two mid-tones)
  if (p.style !== 'bold' && p.style !== 'folk') p.palette.accent = readable(p.palette.accent, p.style === 'minimal' ? mix(p.palette.pack, '#ffffff', 0.9) : p.palette.pack, 2.2);
  p.fonts = { display: pick(p.fonts?.display, Object.keys(FONTS), 'DM Serif Display'), body: pick(p.fonts?.body, Object.keys(FONTS), 'Inter') };
  if (/[ऀ-ॿ]/.test(`${p.name}${p.tagline}`) && !['Tiro Devanagari Hindi', 'Mukta'].includes(p.fonts.display)) p.fonts.display = 'Tiro Devanagari Hindi';
  p.pattern = { type: pick(p.pattern?.type, Object.keys(PATTERNS), 'none'), opacity: Math.min(0.7, Math.max(0, +p.pattern?.opacity || 0.18)) };
  p.border = { type: borderType(p.border?.type) };
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
  if (c2 < 1.6 && b.style !== 'bold' && b.style !== 'folk') out.push({ level: 'mid', msg: 'Accent colour almost disappears on the pack.', fix: 'Boost accent', patch: { accent: readable(b.accent, pap, 2.4) } });
  // logos that are mostly solid (round badges etc.) bring their own background, so they can't blend in
  if (b.logo && !b.logoPlate && b.logoSource === 'upload' && logoCoverage(b.logo) < 0.5) {
    const lc = contrast(averageColor(b.logo), pap);
    if (lc < 1.5) out.push({ level: 'high', msg: 'Your logo blends into the pack colour.', fix: 'Add a logo badge', patch: { logoPlate: true } });
  }
  if ((b.logoScale ?? 1) > 1.15 && ['tub', 'jar', 'can'].includes(product)) out.push({ level: 'mid', msg: 'Logo is very large — it may wrap around the curve and look stretched.', fix: 'Shrink logo', patch: { logoScale: 1 } });
  if (Math.abs(b.logoY ?? 0) > 0.12) out.push({ level: 'low', msg: 'Logo is close to the top/bottom edge.', fix: 'Centre logo', patch: { logoY: 0 } });
  if ((b.tagline || '').length > 38) out.push({ level: 'low', msg: 'Tagline is long — it will be shrunk to fit and may get small.', fix: null });
  if ((b.pattern?.opacity ?? 0) > 0.4 && b.style !== 'heritage' && b.pattern?.type !== 'none') out.push({ level: 'mid', msg: 'Pattern is strong and competes with the logo.', fix: 'Soften pattern', patch: { pattern: { ...b.pattern, opacity: 0.16 } } });
  // text over a busy pattern or a centre shape: check against what is actually behind it
  const pt = b.pattern?.type, po = b.pattern?.opacity ?? 0;
  if (pt && pt !== 'none' && !b.pattern?.image) {
    const behind = mix(pap, b.accent, Math.min(1, po * (['stripes', 'chevron'].includes(pt) ? 1.6 : 1.1)));
    if (contrast(fg, behind) < 3.2 || (['stripes', 'chevron'].includes(pt) && po > 0.22)) out.push({ level: 'mid', msg: 'Text sits on a busy pattern and is harder to read than it looks.', fix: 'Soften pattern', patch: { pattern: { ...b.pattern, opacity: 0.1 } } });
  }
  if (b.logoSource === 'upload' && b.logo && logoCoverage(b.logo) > 0.97) {
    if (plainCorners(b.logo)) out.push({ level: 'high', msg: 'Your logo has a solid background box around it.', fix: 'Remove background', patch: { _removeBg: true } });
    else out.push({ level: 'high', msg: 'This looks like a photo, not a logo — it will look pasted on.', fix: 'Design a logo instead', patch: { _studio: true } });
  }
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

// ---------- six genuinely different directions ----------
// Each "vibe" is a whole look: layout, type, border, pattern, finish, light and a family of palettes.
// The AI (or the built-in designer) supplies the words; vibes guarantee no two concepts look alike.
export const VIBES = {
  folk: { concept: 'Folk poster', style: 'folk', fonts: { display: 'Shrikhand', body: 'Space Grotesk' }, border: 'none', centre: 'none', pattern: { type: 'folk', opacity: 1 }, finish: 'matte', light: 'sunlit',
    colour: 'Two loud, clashing colours with every inch covered in little hand-drawn motifs — like a screen-printed folk poster.',
    palettes: [{ pack: '#5fb4e6', accent: '#ef4e23', background: '#141414' }, { pack: '#f06a9b', accent: '#1f8a4c', background: '#fde4ee' }, { pack: '#f3c12b', accent: '#d6336c', background: '#2a1a12' }, { pack: '#1e8c8c', accent: '#f2542d', background: '#f3e9da' }, { pack: '#e9452f', accent: '#5ec2e8', background: '#1d1d1d' }] },
  matchbox: { concept: 'Matchbox label', style: 'matchbox', fonts: { display: 'Bebas Neue', body: 'Space Grotesk' }, border: 'none', centre: 'none', pattern: { type: 'none', opacity: 0 }, finish: 'matte', light: 'studio',
    colour: 'Vintage printing-press colours: one ink on warm paper, like an old matchbox label.',
    palettes: [{ pack: '#f6e9cf', accent: '#d7263d', background: '#e9dcc4' }, { pack: '#1d3f8c', accent: '#f2b705', background: '#f2ead8' }, { pack: '#f4d35e', accent: '#2f5d9e', background: '#2b2b2b' }, { pack: '#f7b2bd', accent: '#5b2a86', background: '#fbe9ec' }, { pack: '#2f7d4f', accent: '#f4d35e', background: '#ebe5d3' }] },
  pop: { concept: 'Bright & playful', style: 'poster', fonts: { display: 'Bricolage Grotesque', body: 'Space Grotesk' }, border: 'none', centre: 'none', pattern: { type: 'dots', opacity: 0.14 }, finish: 'gloss', light: 'sunlit',
    colour: 'Sunny, saturated colours with one punchy contrast — impossible to miss on a shelf or a feed.',
    palettes: [{ pack: '#ffd23f', accent: '#e4572e', background: '#fff4d6' }, { pack: '#ff8fab', accent: '#3a0ca3', background: '#ffe5ec' }, { pack: '#7bdff2', accent: '#f15bb5', background: '#e8fbff' }, { pack: '#b8e04a', accent: '#2d3a8c', background: '#f3fadf' }] },
  pastel: { concept: 'Soft & sweet', style: 'label', fonts: { display: 'Young Serif', body: 'Inter' }, border: 'wavy', centre: 'none', pattern: { type: 'none', opacity: 0 }, finish: 'matte', light: 'studio',
    colour: 'Gentle pastels with a deep matching tone for the words — friendly, giftable, calm.',
    palettes: [{ pack: '#f7c6d0', accent: '#8c3b56', background: '#fdf0f3' }, { pack: '#cdb4db', accent: '#4a2c6d', background: '#f4eef8' }, { pack: '#bde0c6', accent: '#2f5d46', background: '#eef7f0' }, { pack: '#ffd6a5', accent: '#8a4b1f', background: '#fff3e3' }] },
  luxe: { concept: 'Dark luxe', style: 'monogram', fonts: { display: 'Cormorant Garamond', body: 'Inter' }, border: 'deco', centre: 'none', pattern: { type: 'none', opacity: 0 }, finish: 'metallic', light: 'dramatic',
    colour: 'A deep, inky base with warm metallic gold — the colours of a premium gift.',
    palettes: [{ pack: '#14213d', accent: '#d4a84b', background: '#0d1424' }, { pack: '#1b1b1b', accent: '#c9a86a', background: '#2a2a2a' }, { pack: '#3d0c11', accent: '#e0b973', background: '#1f0609' }, { pack: '#0f3d3e', accent: '#e6c08a', background: '#0a2a2b' }] },
  clean: { concept: 'Clean minimal', style: 'minimal', fonts: { display: 'Syne', body: 'Inter' }, border: 'none', centre: 'none', pattern: { type: 'none', opacity: 0 }, finish: 'matte', light: 'studio',
    colour: 'Almost-white with a single confident colour — modern, honest and easy to trust.',
    palettes: [{ pack: '#2b59c3', accent: '#2b59c3', background: '#eef2fa' }, { pack: '#1f7a5a', accent: '#1f7a5a', background: '#eaf4ef' }, { pack: '#d1495b', accent: '#d1495b', background: '#fbecee' }, { pack: '#222222', accent: '#222222', background: '#efefef' }] },
  craft: { concept: 'Earthy craft', style: 'classic', fonts: { display: 'Marcellus', body: 'Inter' }, border: 'stitched', centre: 'none', pattern: { type: 'botanical', opacity: 0.1 }, finish: 'matte', light: 'sunlit',
    colour: 'Kraft, clay and olive tones — it looks handmade, natural and small-batch.',
    palettes: [{ pack: '#c8a27a', accent: '#4a3222', background: '#efe4d6' }, { pack: '#7a8450', accent: '#f3ead3', background: '#e7e5d5' }, { pack: '#b5562f', accent: '#f6e7cf', background: '#f2e1d3' }, { pack: '#e9dcc4', accent: '#6b3e26', background: '#f6efe2' }] },
  editorial: { concept: 'Bold editorial', style: 'editorial', fonts: { display: 'Abril Fatface', body: 'Inter' }, border: 'crop', centre: 'none', pattern: { type: 'none', opacity: 0 }, finish: 'matte', light: 'studio',
    colour: 'Paper-white with one loud colour, like a magazine cover.',
    palettes: [{ pack: '#f4efe6', accent: '#e63946', background: '#e9e3d8' }, { pack: '#f7f3ec', accent: '#1d3557', background: '#e7e2d6' }, { pack: '#fffaf0', accent: '#2a9d8f', background: '#ece7da' }, { pack: '#f2f0eb', accent: '#ff5d00', background: '#e6e2d9' }] },
  heritage: { concept: 'Indian heritage', style: 'heritage', fonts: { display: 'Rozha One', body: 'Inter' }, border: 'jali', centre: 'none', pattern: { type: 'blockprint', opacity: 0.16 }, finish: 'matte', light: 'sunlit',
    colour: 'Jewel tones with marigold and saffron — festive, rooted and proud.',
    palettes: [{ pack: '#8b1e3f', accent: '#f2c14e', background: '#f5e6d3' }, { pack: '#1f4e5f', accent: '#f4a259', background: '#e6eef0' }, { pack: '#2e6b3a', accent: '#f6d27a', background: '#ecf1e4' }, { pack: '#5b2a86', accent: '#f7b538', background: '#efe7f5' }] },
};
const STYLE_VIBE = { folk: 'folk', matchbox: 'matchbox', poster: 'pop', label: 'pastel', monogram: 'luxe', minimal: 'clean', classic: 'craft', editorial: 'editorial', heritage: 'heritage' };
function hsl(hex) {
  const n = parseInt(String(hex).slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
// how different two palettes look (0 = identical); compares the pack colour and the accent
function palDist(a, b) {
  const one = (x, y) => { const [h1, s1, l1] = hsl(x), [h2, s2, l2] = hsl(y), dh = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2)) / 180; return dh * Math.min(s1, s2) * 1.6 + Math.abs(l1 - l2) * 1.4 + Math.abs(s1 - s2) * 0.6; };
  return one(a.pack, b.pack) + one(a.accent, b.accent) * 0.6;
}
export function diversify(plans, brief = '', seed = Math.random()) {
  const t = String(brief).toLowerCase(), has = (w) => w.some((x) => t.includes(x));
  let order = ['folk', 'pop', 'matchbox', 'luxe', 'pastel', 'editorial'];
  if (has(['traditional', 'indian', 'desi', 'masala', 'chai', 'ayurved', 'mithai', 'pickle', 'achaar', 'heritage', 'festive', 'diwali'])) order = ['heritage', 'folk', 'matchbox', 'craft', 'luxe', 'editorial'];
  else if (has(['premium', 'luxury', 'elegant'])) order = ['luxe', 'matchbox', 'editorial', 'folk', 'clean', 'craft'];
  else if (has(['natural', 'organic', 'handmade', 'herbal', 'eco'])) order = ['craft', 'folk', 'clean', 'matchbox', 'pastel', 'luxe'];
  else if (has(['kid', 'cute', 'fun', 'candy', 'toy', 'magnet', 'sticker', 'sweet'])) order = ['pop', 'folk', 'matchbox', 'pastel', 'editorial', 'craft'];
  // keep the AI's best idea first: give it the vibe that matches its layout
  const firstVibe = STYLE_VIBE[plans[0]?.style];
  if (firstVibe) order = [firstVibe, ...order.filter((v) => v !== firstVibe)].slice(0, 6);
  if (order.length < 6) order.push(...Object.keys(VIBES).filter((v) => !order.includes(v)).slice(0, 6 - order.length));
  const pool = [...plans], out = [], used = { fonts: new Set(), borders: new Set(), patterns: new Set(), names: new Set() };
  let k = Math.floor(seed * 4);
  order.forEach((vk, i) => {
    const v = VIBES[vk];
    const j = pool.findIndex((p) => STYLE_VIBE[p.style] === vk); const base = j >= 0 ? pool.splice(j, 1)[0] : pool.shift() || plans[i % plans.length] || {};
    const p = { ...base, style: v.style, reasoning: { ...(base.reasoning || {}) } };
    // colours: keep the AI's palette only if it clearly differs from every concept so far
    const own = base.palette && STYLE_VIBE[base.style] === vk ? base.palette : null;
    if (own && out.every((o) => palDist(o.palette, own) > 0.55)) p.palette = own;
    else {
      const cands = v.palettes.map((pal, n) => v.palettes[(n + k) % v.palettes.length]);
      p.palette = { ...(cands.find((pal) => out.every((o) => palDist(o.palette, pal) > 0.55)) || cands[0]) };
      p.reasoning.colour = v.colour;
    }
    k++;
    const fontOk = own && base.fonts?.display && !used.fonts.has(base.fonts.display);
    p.fonts = fontOk ? base.fonts : { ...v.fonts };
    if (!fontOk) p.reasoning.type = `${v.fonts.display} sets the tone for this direction.`;
    const bt = borderType(base.border?.type);
    p.border = { type: own && bt !== 'none' && !used.borders.has(bt) ? bt : v.border };
    p.centre = ['poster', 'label', 'monogram', 'editorial', 'folk', 'matchbox'].includes(v.style) ? 'none' : own && base.centre && base.centre !== 'none' ? base.centre : v.centre;
    const pt = base.pattern?.type;
    p.pattern = v.style === 'folk' ? { ...v.pattern } : own && pt && pt !== 'none' && pt !== 'folk' && !used.patterns.has(pt) ? base.pattern : { ...v.pattern };
    p.finish = v.finish; p.light = v.light;
    let name = String(base.concept || '').replace(/\b(\w+)\s+\1\b/gi, '$1').trim();
    if (!name || used.names.has(name.toLowerCase()) || !own) name = v.concept;
    p.concept = name;
    used.fonts.add(p.fonts.display); if (p.border.type !== 'none') used.borders.add(p.border.type); if (p.pattern.type !== 'none') used.patterns.add(p.pattern.type); used.names.add(name.toLowerCase());
    out.push(p);
  });
  return out;
}
