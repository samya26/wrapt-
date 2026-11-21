// Vercel serverless function: the AI Design Director.
// Modes: "concepts" (brief + reference images → 3 design plans), "refine" (plan + instruction → plan),
//        "explain" (plan + question → answer).
// Set GEMINI_API_KEY in Vercel → Settings → Environment Variables. Optional: GEMINI_MODEL.
export const config = { maxDuration: 60 };

const API = 'https://generativelanguage.googleapis.com/v1beta';
const PRODUCTS = ['can', 'box', 'tub', 'jar', 'pouch'];
const STYLES = ['classic', 'bold', 'minimal', 'heritage'];
const FONTS = ['Instrument Serif', 'DM Serif Display', 'Bebas Neue', 'Space Grotesk', 'Inter', 'Caveat', 'Tiro Devanagari Hindi', 'Mukta'];
const PATTERNS = ['none', 'rangoli', 'warli', 'madhubani', 'kalamkari', 'blockprint', 'botanical', 'dots', 'stripes', 'chevron'];
const BORDERS = ['none', 'double', 'scallop', 'temple', 'dots'];
const SHAPES = ['badge', 'stamp', 'arch', 'monogram', 'wordmark', 'hexagon'];
const ICONS = ['none', 'leaf', 'cup', 'chili', 'drop', 'star', 'sun', 'flower', 'wheat', 'cake', 'bean', 'fruit', 'heart'];

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
    logo: { type: 'OBJECT', properties: { shape: S({ enum: SHAPES }), icon: S({ enum: ICONS }), monogram: S() }, required: ['shape', 'icon', 'monogram'] },
    finish: S({ enum: ['gloss', 'matte', 'metallic'] }), light: S({ enum: ['studio', 'sunlit', 'dramatic'] }),
    reasoning: { type: 'OBJECT', properties: { colour: S(), type: S(), layout: S() }, required: ['colour', 'type', 'layout'] },
  },
  required: ['concept', 'name', 'tagline', 'detail', 'product', 'style', 'palette', 'fonts', 'pattern', 'border', 'logo', 'finish', 'light', 'reasoning'],
};

const GUIDE = `You are the senior packaging & brand designer inside Wrapt, a 3D packaging studio for small brands, mostly in India.
You never draw pixels: you write a DESIGN PLAN that Wrapt's engine renders on real 3D packaging.
Rules:
- Colours are 6-digit hex. "pack" is the packaging base colour, "accent" is used for rules, borders and highlight text, "background" is the studio backdrop behind the product (soft and complementary).
- Make text readable: accent and pack need strong contrast; avoid putting a mid-tone accent on a mid-tone pack.
- Styles: classic = centred logo + small caps, calm; bold = big logo + diagonal colour band, energetic; minimal = near-white pack + one colour band, lots of space; heritage = Indian pattern bands at top & bottom + big display name, traditional.
- Patterns: rangoli/kolam (festive, South Indian), warli (tribal, earthy, Maharashtra), madhubani (Bihar folk art, fish motifs), kalamkari (paisley, premium ethnic), blockprint (Rajasthani booti, homely), botanical (natural/herbal), dots/stripes/chevron (modern/playful). opacity 0–0.6; heritage looks best 0.4–0.6, other styles 0.08–0.25.
- Fonts: use 'Tiro Devanagari Hindi' or 'Mukta' whenever name or tagline contains Hindi/Devanagari. Bebas Neue = loud/young, DM Serif Display = premium, Instrument Serif = elegant/minimal, Caveat = handmade, Space Grotesk/Inter = modern.
- Logo: shape + one icon that fits the product + a 1–2 letter monogram. If the user already has a logo, still fill this in (it is ignored).
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
  const { mode = 'concepts', brief = '', images = [], plan, instruction = '', question = '', hasLogo = false } = req.body || {};

  let parts, schema;
  if (mode === 'concepts') {
    parts = [
      ...images.slice(0, 3).map((d) => ({ inline_data: { mime_type: 'image/jpeg', data: String(d).split(',').pop() } })),
      { text: `${GUIDE}\n\n${images.length ? `The user attached ${images.length} reference image(s) — take only their mood.\n` : ''}${hasLogo ? 'The user already has their own logo.\n' : 'The user has no logo; design one with the logo fields.\n'}User brief: """${String(brief).slice(0, 1500)}"""\n\nReturn exactly 3 clearly different concepts (for example Premium, Minimal, and Traditional or Playful — pick what fits the brief), each a complete plan.` },
    ];
    schema = { type: 'OBJECT', properties: { concepts: { type: 'ARRAY', items: PLAN } }, required: ['concepts'] };
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
