// Vercel serverless function: the AI Design Director.
// Modes: "concepts" (brief + reference images → 3 design plans), "refine" (plan + instruction → plan),
//        "explain" (plan + question → answer), "logos" (brief + preferences → 6 logo recipes).
// Set GEMINI_API_KEY in Vercel → Settings → Environment Variables. Optional: GEMINI_MODEL.
export const config = { maxDuration: 60 };

const API = 'https://generativelanguage.googleapis.com/v1beta';
const PRODUCTS = ['can', 'box', 'tub', 'jar', 'pouch', 'bottle', 'tube', 'papertube', 'cup', 'card', 'bag'];
const CENTRES = ['none', 'spotlight', 'frame', 'arch', 'seal', 'sunburst', 'band', 'sash', 'block', 'split', 'bigtype', 'halftone'];
const STYLES = ['classic', 'bold', 'minimal', 'heritage'];
const FONTS = ['Instrument Serif', 'DM Serif Display', 'Bebas Neue', 'Space Grotesk', 'Inter', 'Caveat', 'Tiro Devanagari Hindi', 'Mukta', 'Fraunces', 'Cormorant Garamond', 'Marcellus', 'Abril Fatface', 'Rozha One', 'Young Serif', 'Shrikhand', 'Baloo 2', 'Unbounded', 'Bricolage Grotesque', 'Syne'];
const PATTERNS = ['none', 'rangoli', 'warli', 'madhubani', 'kalamkari', 'blockprint', 'botanical', 'dots', 'stripes', 'chevron'];
const BORDERS = ['none', 'double', 'arch', 'ticket', 'stamp', 'crop', 'nameband', 'checker', 'wavy', 'stitched', 'torn', 'jali', 'deco', 'botanical', 'bauhaus', 'cutcorner', 'sticker'];
const LAYOUTS = ['wordmark', 'stacked', 'mark-left', 'mark-top', 'lettermark', 'emblem'];
const TREATMENTS = ['none', 'swash', 'dot', 'split', 'shadow', 'cut', 'outline', 'swap'];
const CONTAINERS = ['none', 'circle', 'square', 'arch', 'shield', 'blob', 'pill'];

const S = (extra = {}) => ({ type: 'STRING', ...extra });
const PLAN = {
  type: 'OBJECT',
  properties: {
    concept: S(), name: S(), tagline: S(), detail: S(),
    product: S({ enum: PRODUCTS }), style: S({ enum: STYLES }),
    palette: { type: 'OBJECT', properties: { pack: S(), accent: S(), background: S() }, required: ['pack', 'accent', 'background'] },
    fonts: { type: 'OBJECT', properties: { display: S({ enum: FONTS }), body: S({ enum: FONTS }) }, required: ['display', 'body'] },
    pattern: { type: 'OBJECT', properties: { type: S({ enum: PATTERNS }), opacity: { type: 'NUMBER' } }, required: ['type', 'opacity'] },
    border: { type: 'OBJECT', properties: { type: S({ enum: BORDERS }) }, required: ['type'] },
    centre: S({ enum: CENTRES }),
    finish: S({ enum: ['gloss', 'matte', 'metallic'] }), light: S({ enum: ['studio', 'sunlit', 'dramatic'] }),
    reasoning: { type: 'OBJECT', properties: { colour: S(), type: S(), layout: S() }, required: ['colour', 'type', 'layout'] },
  },
  required: ['concept', 'name', 'tagline', 'detail', 'product', 'style', 'palette', 'fonts', 'pattern', 'border', 'finish', 'light', 'reasoning'],
};

const GUIDE = `You are the senior packaging & brand designer inside Wrapt, a 3D packaging studio for small brands, mostly in India.
You never draw pixels: you write a DESIGN PLAN that Wrapt's engine renders on real 3D packaging.
Rules:
- Colours are 6-digit hex. "pack" is the packaging base colour, "accent" is used for rules, borders and highlight text, "background" is the studio backdrop behind the product (soft and complementary).
- Make text readable: accent and pack need strong contrast; avoid putting a mid-tone accent on a mid-tone pack.
- Styles: classic = centred logo + small caps, calm; bold = big logo + diagonal colour band, energetic; minimal = near-white pack + one colour band, lots of space; heritage = Indian pattern bands at top & bottom + big display name, traditional.
- Patterns: rangoli/kolam (festive, South Indian), warli (tribal, earthy, Maharashtra), madhubani (Bihar folk art, fish motifs), kalamkari (paisley, premium ethnic), blockprint (Rajasthani booti, homely), botanical (natural/herbal), dots/stripes/chevron (modern/playful). opacity 0–0.6; heritage looks best 0.4–0.6, other styles 0.08–0.25.
- Fonts: use 'Tiro Devanagari Hindi' or 'Mukta' whenever name or tagline contains Hindi/Devanagari. Bebas Neue = loud/young, DM Serif Display/Abril Fatface/Rozha One = premium & bold, Cormorant Garamond/Marcellus/Instrument Serif = elegant luxury, Fraunces/Young Serif = warm & friendly, Caveat = handmade, Shrikhand/Baloo 2 = playful, Space Grotesk/Inter/Unbounded/Syne/Bricolage Grotesque = modern.
- Borders: double (classic), arch (Mughal arch window — candles, skincare, D2C), ticket (snacks, coffee), stamp (gifting, heritage), crop (printer's crop marks — minimal, editorial), nameband (brand name ribbon — bold, streetwear), checker (retro cafe, fun), wavy (kids, drinks), stitched (handmade, crafts), torn (rustic, artisanal), jali (Indian lattice — traditional), deco (art deco corners — luxury, gold), botanical (leaf corners — tea, natural, skincare), bauhaus (geometric blocks — bold, colourful), cutcorner (apothecary — spices, wellness), sticker (friendly label), none.
- Packs: can, box, tub, jar, pouch, bottle (sauces, oils, drinks, skincare), tube (creams, gels), papertube (gift tubes: tea, candles), cup (coffee/smoothies to go), card (hang card for keychains, jewellery, accessories), bag (paper shopping/gift bag). Never put non-food items in food containers.
- Centre (shape behind the logo): spotlight, frame (label panel), arch, seal, sunburst, band, sash (diagonal), block (colour block), split, bigtype (giant faint name), halftone, none.
- The logo is designed separately — don't describe one.
- Product: choose the packaging type that suits what they sell (jar for pickles/jams/ghee/creams, can for drinks, tub for desserts/ice cream/curd, pouch for tea/coffee/spices/snacks, box for sweets/cookies/soap/cosmetics/gifts) unless the user asks for one.
- Name: use the user's brand name exactly if given (keep Hindi as Hindi). Otherwise invent a short, memorable, culturally fitting name. Tagline under 6 words. detail = variant + quantity, e.g. "Raw mango · 250 g".
- Reference images are for MOOD only (colour, era, feeling). Never copy another brand's name, logo or exact layout.
- reasoning: one friendly sentence each for colour, type and layout, written for a non-designer.`;

let cachedModel = null;
async function listModels(key) {
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
  const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || 'ListModels failed');
  const ver = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1]);
  return (j.models || []).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace('models/', ''))
    .filter((n) => /flash/.test(n) && !/(image|tts|live|audio|embedding|omni|exp)/.test(n)).sort((a, b) => ver(b) - ver(a));
}
async function generate(key, model, parts, schema, msLeft) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), Math.max(3000, msLeft));
  try {
    const thinking = /gemini-2\.5/.test(model) ? { thinkingBudget: 0 } : /gemini-[3-9]|latest/.test(model) ? { thinkingLevel: 'low' } : null;
    const body = (th) => JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.9, responseMimeType: 'application/json', responseSchema: schema, ...(th ? { thinkingConfig: th } : {}) } });
    let r = await fetch(`${API}/models/${model}:generateContent`, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: body(thinking) });
    let j = await r.json().catch(() => ({}));
    if (r.status === 400 && thinking && /thinking/i.test(j.error?.message || '')) {
      r = await fetch(`${API}/models/${model}:generateContent`, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: body(null) });
      j = await r.json().catch(() => ({}));
    }
    return { r, j };
  } catch (e) {
    if (e.name === 'AbortError') return { r: { ok: false, status: 504 }, j: { error: { message: 'took too long' } } };
    throw e;
  } finally { clearTimeout(t); }
}

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;
  if (req.method === 'GET') return res.status(200).json({ ok: !!key });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!key) return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
  const { mode = 'concepts', brief = '', images = [], plan, instruction = '', question = '', hasLogo = false, packs = [] } = req.body || {};

  let parts, schema;
  if (mode === 'concepts') {
    parts = [
      ...images.slice(0, 3).map((d) => ({ inline_data: { mime_type: 'image/jpeg', data: String(d).split(',').pop() } })),
      { text: `${GUIDE}\n\n${images.length ? `The user attached ${images.length} reference image(s) — take only their mood.\n` : ''}${hasLogo ? 'The user already has their logo.\n' : ''}${packs.length ? `Packaging that suits this product (use only these unless the user named one): ${packs.map(String).join(', ')}.\n` : ''}User brief: """${String(brief).slice(0, 1500)}"""\n\nReturn exactly 3 clearly different concepts (for example Premium, Minimal, and Traditional or Playful — pick what fits the brief), each a complete plan.` },
    ];
    schema = { type: 'OBJECT', properties: { concepts: { type: 'ARRAY', items: PLAN } }, required: ['concepts'] };
  } else if (mode === 'logos') {
    const b = req.body || {}, p = b.prefs || {};
    const fonts = (Array.isArray(b.fonts) ? b.fonts : FONTS).map(String).slice(0, 40), glyphs = (Array.isArray(b.glyphs) && b.glyphs.length ? b.glyphs : ['sun']).map(String).slice(0, 12);
    const sl = p.sliders || {}, word = (v, a, z) => (v < -0.25 ? a : v > 0.25 ? z : `between ${a} and ${z}`);
    parts = [
      ...(b.images || []).slice(0, 1).map((d) => ({ inline_data: { mime_type: 'image/jpeg', data: String(d).split(',').pop() } })),
      { text: `You are a senior brand identity designer. Design 6 LOGO RECIPES for a small brand. You never draw: Wrapt's engine renders each recipe as a vector logo.
Brand name: ${b.name ? `"${String(b.name).slice(0, 40)}"` : '(none — invent a short, memorable, culturally fitting name and return it in "name")'}
What they sell: """${String(b.brief).slice(0, 600)}"""
Logo type wanted: ${p.type || 'surprise me'}. Shape feel: ${p.shape || 'no preference'}. Personality: ${word(sl.modern || 0, 'classic', 'modern')}, ${word(sl.serious || 0, 'playful', 'serious')}, ${word(sl.bold || 0, 'delicate', 'bold')}, ${word(sl.precise || 0, 'handmade', 'precise')}.
${p.colors?.length ? `Colours they chose: ${p.colors.join(', ')} — use them.` : 'Pick a confident 1–2 colour palette that suits the product.'}
${p.idea ? `Their idea: """${String(p.idea).slice(0, 200)}"""` : ''}
${b.hasSketch ? 'The attached image is THE USER\'S OWN DRAWING of their symbol. It is the heart of the logo: use mark.source="sketch" in at least 4 of the 6 recipes, and pick fonts that match its character (mention it in rationale).' : ''}
Rules for great, non-generic logos:
- Typography first: at least 3 recipes are type-led (layout wordmark, stacked or lettermark, or a treatment). Great small-brand logos are mostly great type with one clever detail.
- Treatments: swash = curved underline; dot = coloured full stop after the name; split = second word (or first letter) in the second colour; shadow = retro offset shadow; cut = a thin horizontal slice through the letters; outline = only for heavy fonts; swap = the symbol replaces an "o" in the name (only if the name has an o).
- Symbols: use ONLY these glyphs, they fit the product: ${glyphs.join(', ')}. Use source "none" for pure type. Never add hearts or stars unless the user asked.
- Max 2 elements (symbol + name). Must read at 32px and in one colour. tracking: -4..30 (positive for UPPERCASE, about 0 for title/lower case).
- emblem = round seal with the name on the arc; "sub" is a short word for the bottom arc or under a stacked logo (e.g. the product category), max 14 characters.
- All 6 must clearly differ in layout and font. colors.primary must be dark or strong enough to read on cream.
- rationale: one friendly sentence for a non-designer about why this works.` },
    ];
    const LOGO = { type: 'OBJECT', properties: {
      layout: S({ enum: LAYOUTS }), font: S({ enum: fonts }), weight: S({ enum: ['regular', 'bold'] }), case: S({ enum: ['title', 'upper', 'lower'] }), tracking: { type: 'NUMBER' },
      treatment: S({ enum: TREATMENTS }), sub: S(),
      mark: { type: 'OBJECT', properties: { source: S({ enum: b.hasSketch ? ['none', 'glyph', 'sketch'] : ['none', 'glyph'] }), glyph: S({ enum: glyphs }), container: S({ enum: CONTAINERS }), style: S({ enum: ['fill', 'line'] }) }, required: ['source', 'glyph', 'container', 'style'] },
      colors: { type: 'OBJECT', properties: { primary: S(), secondary: S() }, required: ['primary', 'secondary'] }, rationale: S() },
      required: ['layout', 'font', 'weight', 'case', 'tracking', 'treatment', 'mark', 'colors', 'rationale'] };
    schema = { type: 'OBJECT', properties: { name: S(), logos: { type: 'ARRAY', items: LOGO } }, required: ['name', 'logos'] };
  } else if (mode === 'refine') {
    parts = [{ text: `${GUIDE}\n\nCurrent plan:\n${JSON.stringify(plan).slice(0, 4000)}\n\nUser request: """${String(instruction).slice(0, 500)}"""\nReturn the updated full plan (change only what the request implies) and a short friendly note saying what you changed.` }];
    schema = { type: 'OBJECT', properties: { plan: PLAN, note: S() }, required: ['plan', 'note'] };
  } else {
    parts = [{ text: `${GUIDE}\n\nCurrent plan:\n${JSON.stringify(plan).slice(0, 4000)}\n\nThe user asks: """${String(question).slice(0, 500)}"""\nAnswer as their designer in 2–4 friendly sentences, explaining the reasoning in plain words.` }];
    schema = { type: 'OBJECT', properties: { answer: S() }, required: ['answer'] };
  }

  try {
    const preferred = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
    let candidates = [...new Set([cachedModel, process.env.GEMINI_MODEL, ...preferred].filter(Boolean))];
    let listed = false, r, j, model; const t0 = Date.now(), BUDGET = 54000;
    for (let i = 0; i < candidates.length && i < 6 && Date.now() - t0 < BUDGET - 4000; i++) {
      model = candidates[i];
      ({ r, j } = await generate(key, model, parts, schema, BUDGET - (Date.now() - t0)));
      if (![404, 429, 500, 503, 504].includes(r.status)) break;
      if (i === candidates.length - 1 && !listed) { listed = true; candidates = [...candidates, ...(await listModels(key)).filter((m) => !candidates.includes(m))]; }
    }
    if (!r.ok) return res.status(502).json({ error: `Gemini ${r.status}: ${(j.error?.message || 'error').slice(0, 200)}` });
    cachedModel = model;
    const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const out = JSON.parse(text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, ''));
    return res.status(200).json({ ...out, model });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
