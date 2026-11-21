# Wrapt — 3D packaging studio in the browser

Turn a flat logo or label into photoreal 3D packaging renders and 360° videos. Built for small brands, home bakers and Instagram sellers who can't afford product shoots or a 3D artist.

**Version 2 — AI designer**
- Describe your product (type or speak) + optional reference photos → 3 design concepts (e.g. Premium / Minimal / Traditional) rendered in 3D, each with reasons
- The AI writes a JSON *design plan*; Wrapt renders it — every result stays editable. Built-in rule-based designer when no AI key is set
- Chat to refine ("make it more modern", "use green") or ask "why this font?"
- Generated vector logos (badge, stamp, arch, monogram, wordmark, hexagon + 13 icons)
- Indian art patterns (rangoli, Warli, Madhubani, Kalamkari, block-print) + upload your own; borders incl. 9-slice uploaded borders
- Hindi / Devanagari fonts, 8 font choices, 4 layouts (Classic, Bold, Minimal, Heritage)
- Design check: contrast, logo blending, size on curves, edges, pattern strength — one-click fixes
- Undo/redo, exact sizes in mm, logo export

**Setup for AI:** add `GEMINI_API_KEY` in Vercel → Settings → Environment Variables (free key from aistudio.google.com), then redeploy.

**Features (v1)**
- 5 products at real proportions: can, box, tub, jar, stand-up pouch — resizable
- Upload a logo → colours are extracted automatically (k-means) and a label is auto-designed (Classic / Bold / Minimal)
- Designers: download a dieline template, place your own artwork, upload it back
- Animated box fold: flat dieline → finished box
- Gloss / matte / metallic finishes, 3 lighting setups, curved studio backdrop, soft shadows
- Export: PNG at Instagram sizes, transparent PNG, 360° turntable video (MP4/WebM)
- Runs fully in the browser — nothing is uploaded anywhere

**How it works (short)**
- `src/art.js` — palette extraction, label layout system, dieline templates (Canvas 2D)
- `src/products.js` — geometry + UV mapping for each product; the box is a tree of hinged panels animated to fold
- `src/studio.js` — Three.js scene: PBR materials, environment lighting, cyclorama backdrop, image & video export (MediaRecorder)

```
npm install
npm run dev
```
Deploy on Vercel as a Vite project (no settings or keys needed).

Sample brands "Tapri Chai" and "Fizz & Fern" are fictional. D-SERT logo used with permission.
