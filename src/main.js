import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/caveat/latin-600.css';
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource/bebas-neue/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/mukta/latin-400.css';
import '@fontsource/mukta/latin-700.css';
import '@fontsource/mukta/devanagari-400.css';
import '@fontsource/mukta/devanagari-700.css';
import '@fontsource/tiro-devanagari-hindi/latin-400.css';
import '@fontsource/tiro-devanagari-hindi/devanagari-400.css';
import './style.css';
import { Studio } from './studio.js';
import { BUILDERS, DEFAULTS } from './products.js';
import { loadImage, extractPalette, templateFor, mix, isDark, makeLogo, loadFonts, FONTS, PATTERNS, BORDERS, ICONS, LOGO_SHAPES } from './art.js';
import { designLocally, refineLocally, normalizePlan, audit, askAI } from './design.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BASE = import.meta.env.BASE_URL;

// ---------- state ----------
const state = {
  product: 'can',
  dims: structuredClone(DEFAULTS),
  brand: {
    logo: null, logoSource: 'upload', uploadedLogo: null, logoSpec: { shape: 'badge', icon: 'star', monogram: '' },
    name: '', tagline: '', detail: '', pack: '#2a1713', accent: '#d4a06a', ink: null, style: 'classic',
    fonts: { display: 'DM Serif Display', body: 'Inter' },
    pattern: { type: 'none', opacity: 0.18, image: null }, border: { type: 'double', size: 0.06, image: null },
    logoScale: 1, logoY: 0, logoPlate: false, artwork: null,
  },
  palette: [], finish: 'gloss', light: 'studio', bg: '#efe3d2', fold: 1,
  plan: null, concepts: [], refs: [],
};

const studio = new Studio($('#stage'));
window.__studio = studio;

// ---------- undo / redo ----------
const history = { past: [], future: [], timer: null };
const snap = () => ({ product: state.product, dims: structuredClone(state.dims), finish: state.finish, light: state.light, bg: state.bg, plan: state.plan, palette: [...state.palette],
  brand: { ...state.brand, fonts: { ...state.brand.fonts }, pattern: { ...state.brand.pattern }, border: { ...state.brand.border }, logoSpec: { ...state.brand.logoSpec } } });
let current = null;
function commit(now = false) {
  clearTimeout(history.timer);
  const go = () => { if (current) history.past.push(current); if (history.past.length > 60) history.past.shift(); history.future = []; current = snap(); updUndo(); };
  now ? go() : (history.timer = setTimeout(go, 350));
}
function restore(s) {
  Object.assign(state, { product: s.product, dims: structuredClone(s.dims), finish: s.finish, light: s.light, bg: s.bg, plan: s.plan, palette: [...s.palette] });
  state.brand = { ...s.brand, fonts: { ...s.brand.fonts }, pattern: { ...s.brand.pattern }, border: { ...s.brand.border }, logoSpec: { ...s.brand.logoSpec } };
  studio.setLight(state.light); studio.setBackground(state.bg); syncInputs(); rebuild(true);
}
function undo() { if (!history.past.length) return; history.future.push(current); current = history.past.pop(); restore(current); updUndo(); }
function redo() { if (!history.future.length) return; history.past.push(current); current = history.future.pop(); restore(current); updUndo(); }
function updUndo() { $('#undo').disabled = !history.past.length; $('#redo').disabled = !history.future.length; }
$('#undo').onclick = undo; $('#redo').onclick = redo;
addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  e.preventDefault(); e.shiftKey ? redo() : undo();
});

// ---------- build ----------
let buildT, lastProduct;
function refreshLogo() {
  const b = state.brand;
  if (b.logoSource === 'ai') b.logo = makeLogo(b);
  const pc = $('#logo-preview'), g = pc.getContext('2d');
  g.clearRect(0, 0, 120, 120); g.fillStyle = state.brand.style === 'minimal' ? mix(b.pack, '#fff', 0.9) : b.pack; g.fillRect(0, 0, 120, 120);
  if (b.logo) { const k = 100 / Math.max(b.logo.width, b.logo.height); g.drawImage(b.logo, 60 - (b.logo.width * k) / 2, 60 - (b.logo.height * k) / 2, b.logo.width * k, b.logo.height * k); }
}
function rebuild(now = false, { commitIt = true } = {}) {
  clearTimeout(buildT);
  const go = () => {
    refreshLogo();
    if (!state.brand.logo) return;
    const built = BUILDERS[state.product](state.brand, { ...state.dims[state.product], finish: state.finish, fold: state.fold }, studio.renderer);
    studio.setProduct(built, { keepCamera: lastProduct === state.product });
    lastProduct = state.product;
    $('#fold-row').hidden = state.product !== 'box';
    renderAudit();
    if (commitIt) commit();
  };
  now ? go() : (buildT = setTimeout(go, 90));
}

// ---------- design check ----------
function renderAudit() {
  const issues = audit(state.brand, state.product);
  const high = issues.filter((i) => i.level === 'high').length;
  $('#audit-score').textContent = issues.length ? `${issues.length} to look at` : 'all good';
  $('#audit-score').className = high ? 'bad' : issues.length ? 'warn' : 'ok';
  $('#audit').innerHTML = issues.length
    ? issues.map((i, k) => `<div class="issue ${i.level}"><p>${i.msg}</p>${i.fix ? `<button class="ghost small" data-fix="${k}">${i.fix}</button>` : ''}</div>`).join('')
    : '<div class="issue ok"><p>✓ Readable text, logo stands out, nothing too close to the edges.</p></div>';
  $('#audit').onclick = (e) => {
    const k = e.target.closest('[data-fix]')?.dataset.fix; if (k == null) return;
    Object.assign(state.brand, issues[k].patch); syncInputs(); rebuild(true);
  };
}

// ---------- plans ----------
function planFromState() {
  const b = state.brand;
  return normalizePlan({ concept: state.plan?.concept || 'Current', name: b.name, tagline: b.tagline, detail: b.detail, product: state.product, style: b.style,
    palette: { pack: b.pack, accent: b.accent, background: state.bg }, fonts: b.fonts, pattern: { type: b.pattern.type, opacity: b.pattern.opacity }, border: { type: b.border.type },
    logo: b.logoSpec, finish: state.finish, light: state.light, reasoning: state.plan?.reasoning || {} });
}
function brandFromPlan(p, keepUploaded) {
  const b = { ...state.brand, fonts: { ...p.fonts }, pattern: { ...p.pattern, image: null }, border: { ...state.brand.border, type: p.border.type },
    name: p.name, tagline: p.tagline, detail: p.detail, pack: p.palette.pack, accent: p.palette.accent, ink: null, style: p.style,
    logoSpec: { ...p.logo }, logoScale: p.logoScale ?? 1, logoY: 0, logoPlate: false, artwork: null };
  if (keepUploaded && state.brand.uploadedLogo) { b.logo = state.brand.uploadedLogo; b.logoSource = 'upload'; }
  else { b.logoSource = 'ai'; b.logo = makeLogo(b); }
  return b;
}
async function applyPlan(p, { keepUploaded = $('#use-logo').checked } = {}) {
  await loadFonts(p.fonts.display, p.fonts.body);
  state.plan = p; state.product = p.product;
  state.brand = brandFromPlan(p, keepUploaded);
  state.palette = [p.palette.pack, p.palette.accent, mix(p.palette.pack, '#ffffff', 0.5), mix(p.palette.accent, '#000000', 0.4), p.palette.background];
  state.finish = p.finish; state.light = p.light; state.bg = p.palette.background;
  studio.setLight(state.light); studio.setBackground(state.bg);
  syncInputs(); rebuild(true);
}

// ---------- AI designer ----------
const EXAMPLES = [
  "Homemade mango pickle called 'Amma ka Achaar' — traditional, warm, a bit premium",
  'Cold brew coffee in a can for college students — bold and modern',
  'Kids mango ice cream tub — fun, bright, playful',
  'Organic tulsi green tea — calm, natural, herbal',
  'Diwali mithai gift box — festive and royal, maroon and gold',
  "हल्दीराम जैसा नमकीन ब्रांड 'चटपटा' — desi and colourful",
];
$('#examples').innerHTML = EXAMPLES.map((e) => `<button class="ex" data-ex="${e.replace(/"/g, '&quot;')}">${e}</button>`).join('');
$('#examples').onclick = (e) => { const ex = e.target.closest('[data-ex]')?.dataset.ex; if (ex) { $('#brief').value = ex; generate(); } };
$('#new-btn').onclick = () => openWizard();

// voice
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  const rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = true; rec.continuous = false;
  let base = '';
  $('#mic').hidden = false;
  $('#mic').onclick = () => { if ($('#mic').classList.contains('on')) return rec.stop(); base = $('#brief').value ? $('#brief').value + ' ' : ''; try { rec.start(); $('#mic').classList.add('on'); } catch (e) {} };
  rec.onresult = (e) => { $('#brief').value = base + [...e.results].map((r) => r[0].transcript).join(''); };
  rec.onend = rec.onerror = () => $('#mic').classList.remove('on');
}

// references
async function shrinkData(file, max = 512) {
  const img = await fileToImage(file);
  const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { data: c.toDataURL('image/jpeg', 0.85), colors: extractPalette(c) };
}
$('#ref-file').addEventListener('change', async (e) => {
  for (const f of [...e.target.files].slice(0, 3 - state.refs.length)) state.refs.push(await shrinkData(f));
  e.target.value = ''; renderRefs();
});
function renderRefs() {
  $('#ref-list').innerHTML = state.refs.map((r, i) => `<span class="ref"><img src="${r.data}" alt="" /><button data-rmref="${i}" aria-label="Remove">✕</button></span>`).join('');
  $('.ref-add').hidden = state.refs.length >= 3;
}
$('#ref-list').onclick = (e) => { const i = e.target.dataset.rmref; if (i != null) { state.refs.splice(+i, 1); renderRefs(); } };

let aiMode = 'unknown';
function setAiStatus() { $('#ai-status').textContent = aiMode === 'ai' ? '● AI connected' : aiMode === 'local' ? '● built-in designer' : ''; $('#ai-status').className = aiMode; }
fetch('/api/design').then((r) => r.json()).then((j) => { aiMode = j.ok ? 'ai' : 'local'; setAiStatus(); }).catch(() => { aiMode = 'local'; setAiStatus(); });

async function generate(opts = {}) {
  const brief = (opts.brief ?? $('#brief').value).trim();
  if (!brief) { $('#brief').focus(); toast('Tell Wrapt about your product first'); return; }
  const btn = $('#generate'); btn.disabled = true; btn.textContent = 'Designing…'; $('#busy').hidden = false;
  const hasLogo = !!state.brand.uploadedLogo && $('#use-logo').checked;
  const colors = opts.colors || [];
  let plans, note = '';
  if (aiMode !== 'local') {
    const res = await askAI({ mode: 'concepts', brief, images: state.refs.map((r) => r.data), hasLogo });
    if (res?.concepts?.length) { plans = res.concepts.slice(0, 3).map((p) => normalizePlan(p, { hasLogo })); aiMode = 'ai'; }
    else { if (res?.unavailable) aiMode = 'local'; else note = `AI had a problem (${res?.error || 'unknown'}) — used the built-in designer.`; }
    setAiStatus();
  }
  if (!plans) plans = designLocally(brief, { refColors: colors.length ? [colors[0], colors[1] || mix(colors[0], isDark(colors[0]) ? '#f3d9a4' : '#2a1d16', 0.6)] : state.refs[0]?.colors || [], hasLogo });
  // hard choices from the start screen always win
  plans = plans.map((p) => normalizePlan({ ...p, ...(opts.name ? { name: opts.name } : {}), ...(opts.product ? { product: opts.product } : {}) }, { hasLogo }));
  state.concepts = plans;
  await renderConcepts();
  await applyPlan(plans[0], { keepUploaded: hasLogo });
  markChosen(0);
  btn.disabled = false; btn.textContent = '✦ Design 3 new concepts'; $('#busy').hidden = true;
  $('#chat').hidden = false;
  if (note) chat('bot', note);
  chat('bot', `Here are 3 directions for <b>${esc(plans[0].name)}</b>. Pick one, then tell me what to change — or ask <i>why</i> I chose something. Everything is also editable in Product, Design and Look.`);
}
$('#generate').onclick = () => generate();
$('#brief').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(); });

// Render each concept in 3D off-screen and show it as a thumbnail.
async function renderConcepts() {
  const box = $('#concepts'); box.hidden = false;
  box.innerHTML = state.concepts.map((p, i) => `<article class="concept" data-concept="${i}"><div class="thumb"><span class="spin-dot"></span></div><div class="c-body"><em>${p.concept}</em><b>${esc(p.name)}</b><small>${p.product} · ${p.style}</small></div></article>`).join('');
  const keep = snap();
  for (let i = 0; i < state.concepts.length; i++) {
    const p = state.concepts[i]; await loadFonts(p.fonts.display, p.fonts.body);
    const b = brandFromPlan(p, $('#use-logo').checked);
    const built = BUILDERS[p.product](b, { ...state.dims[p.product], finish: p.finish, fold: 1 }, studio.renderer);
    studio.setProduct(built); studio.setLight(p.light); studio.setBackground(p.palette.background);
    const blob = await studio.snapshot(360, 360);
    box.querySelector(`[data-concept="${i}"] .thumb`).innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="${esc(p.concept)} concept" />`;
  }
  lastProduct = null; restore(keep);
  box.querySelectorAll('.concept').forEach((el) => el.insertAdjacentHTML('beforeend', `<details class="why"><summary>Why this?</summary>${reasonHtml(state.concepts[+el.dataset.concept])}</details>`));
}
const reasonHtml = (p) => `<p><b>Colour</b> ${esc(p.reasoning.colour || '')}</p><p><b>Type</b> ${esc(p.reasoning.type || '')}</p><p><b>Layout</b> ${esc(p.reasoning.layout || '')}</p>`;
function markChosen(i) { $$('.concept').forEach((el) => el.classList.toggle('on', +el.dataset.concept === i)); }
$('#concepts').onclick = async (e) => {
  if (e.target.closest('details')) return;
  const el = e.target.closest('[data-concept]'); if (!el) return;
  const i = +el.dataset.concept; markChosen(i); await applyPlan(state.concepts[i]);
  if (matchMedia('(max-width: 899px)').matches) scrollTo({ top: 0, behavior: 'smooth' });
};

// chat: refine or explain
function chat(who, html) { const log = $('#chat-log'); log.insertAdjacentHTML('beforeend', `<p class="${who}">${html}</p>`); log.scrollTop = log.scrollHeight; }
$('#chat-form').onsubmit = async (e) => {
  e.preventDefault();
  const q = $('#chat-input').value.trim(); if (!q) return;
  $('#chat-input').value = ''; chat('me', esc(q));
  const plan = planFromState();
  const asking = /^(why|what|how|which|kyu|kyon|explain)\b/i.test(q) || q.endsWith('?');
  chat('bot typing', '…');
  let res = aiMode === 'ai' ? await askAI(asking ? { mode: 'explain', plan, question: q } : { mode: 'refine', plan, instruction: q }) : null;
  $('#chat-log .typing')?.remove();
  if (asking) {
    if (res?.answer) chat('bot', esc(res.answer));
    else chat('bot', reasonHtml(plan.reasoning?.colour ? plan : (state.plan || plan)) || 'I picked these to keep the pack readable and on-brand.');
    return;
  }
  let next, note;
  if (res?.plan) { next = normalizePlan(res.plan); note = res.note; }
  else ({ plan: next, note } = refineLocally(plan, q));
  next.reasoning = next.reasoning?.colour ? next.reasoning : plan.reasoning;
  await applyPlan(next, { keepUploaded: state.brand.logoSource === 'upload' });
  chat('bot', esc(note || 'Updated.'));
};

// ---------- inputs ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('#font-display').innerHTML = $('#font-body').innerHTML = Object.entries(FONTS).map(([f, v]) => `<option value="${f}">${f} — ${v.label}</option>`).join('');
$('#patterns').innerHTML = Object.entries(PATTERNS).map(([k, v]) => `<button data-pattern="${k}">${v}</button>`).join('');
$('#borders').innerHTML = Object.entries(BORDERS).filter(([k]) => k !== 'image').map(([k, v]) => `<button data-border="${k}">${v}</button>`).join('');
$('#logo-shapes').innerHTML = LOGO_SHAPES.map((s) => `<button data-lshape="${s}">${s}</button>`).join('');
$('#logo-icons').innerHTML = Object.keys(ICONS).map((s) => `<button data-licon="${s}" title="${s}">${s}</button>`).join('');

function syncInputs() {
  const b = state.brand;
  $('#f-name').value = b.name; $('#f-tagline').value = b.tagline; $('#f-detail').value = b.detail;
  $('#c-pack').value = b.pack; $('#c-accent').value = b.accent; $('#c-bg').value = state.bg;
  $('#font-display').value = b.fonts.display; $('#font-body').value = b.fonts.body;
  $('#palette').innerHTML = state.palette.map((c) => `<button class="sw" style="--c:${c}" data-c="${c}" title="${c}"></button>`).join('');
  const bgs = [mix(b.pack, '#ffffff', 0.85), mix(b.accent, '#ffffff', 0.7), '#f4f1ea', '#e9eef2', '#1d1d1f', b.pack];
  $('#bg-swatches').innerHTML = bgs.map((c) => `<button class="sw" style="--c:${c}" data-bg="${c}"></button>`).join('');
  const on = (sel, key, val) => $$(sel).forEach((el) => el.classList.toggle('on', el.dataset[key] === val));
  on('[data-style]', 'style', b.style); on('[data-product]', 'product', state.product); on('[data-finish]', 'finish', state.finish); on('[data-light]', 'light', state.light);
  on('[data-pattern]', 'pattern', b.pattern.image ? '' : b.pattern.type); on('[data-border]', 'border', b.border.type);
  on('[data-lshape]', 'lshape', b.logoSpec.shape); on('[data-licon]', 'licon', b.logoSpec.icon);
  $('#logo-gen').hidden = b.logoSource !== 'ai';
  $('#logo-scale').value = b.logoScale; $('#ls-v').textContent = `${Math.round(b.logoScale * 100)}%`;
  $('#logo-y').value = b.logoY; $('#ly-v').textContent = Math.abs(b.logoY) < 0.01 ? 'centre' : b.logoY < 0 ? 'higher' : 'lower';
  $('#logo-plate').checked = b.logoPlate;
  $('#pattern-op').value = b.pattern.opacity; $('#po-v').textContent = `${Math.round(b.pattern.opacity * 100)}%`;
  $('#border-size').value = b.border.size; $('#bs-v').textContent = `${Math.round(b.border.size * 100)}`;
  $('#art-state').textContent = b.artwork ? 'Using your artwork' : 'Auto-designed label';
  $('#clear-art').hidden = !b.artwork;
  $('#use-logo').disabled = !b.uploadedLogo; $('.check:has(#use-logo)')?.classList.toggle('dim', !b.uploadedLogo);
  renderDims();
}

const DIM_LABELS = { r: 'Radius', h: 'Height', w: 'Width', d: 'Depth' };
const DIM_RANGE = { r: [0.2, 0.7], h: [0.4, 2.0], w: [0.4, 1.8], d: [0.2, 1.0] };
function renderDims() {
  const d = state.dims[state.product];
  $('#dims').innerHTML = Object.keys(d).map((k) => `
    <label class="slider"><span>${DIM_LABELS[k]}<b><input class="mm" type="number" min="10" max="400" step="1" value="${Math.round(d[k] * 100)}" data-mm="${k}" aria-label="${DIM_LABELS[k]} in mm"> mm</b></span>
    <input type="range" min="${DIM_RANGE[k][0]}" max="${DIM_RANGE[k][1]}" step="0.01" value="${d[k]}" data-dim="${k}"></label>`).join('');
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset, b = state.brand;
  if (d.product) { state.product = d.product; b.artwork = null; state.fold = 1; $('#fold').value = 1; syncInputs(); rebuild(true); }
  if (d.style) { b.style = d.style; syncInputs(); rebuild(); }
  if (d.finish) { state.finish = d.finish; syncInputs(); rebuild(); }
  if (d.light) { state.light = d.light; studio.setLight(d.light); syncInputs(); commit(); }
  if (d.view) studio.view(d.view);
  if (d.c) { b.pack = d.c; syncInputs(); rebuild(); }
  if (d.bg) { state.bg = d.bg; studio.setBackground(d.bg); syncInputs(); commit(); }
  if (d.pattern) { b.pattern = { ...b.pattern, type: d.pattern, image: null, opacity: d.pattern !== 'none' && b.pattern.type === 'none' ? (b.style === 'heritage' ? 0.5 : 0.18) : b.pattern.opacity }; syncInputs(); rebuild(); }
  if (d.border) { b.border = { ...b.border, type: d.border }; syncInputs(); rebuild(); }
  if (d.lshape) { b.logoSpec = { ...b.logoSpec, shape: d.lshape }; syncInputs(); rebuild(); }
  if (d.licon) { b.logoSpec = { ...b.logoSpec, icon: d.licon }; syncInputs(); rebuild(); }
  if (d.tab) { $$('[data-tab]').forEach((x) => x.classList.toggle('on', x === t)); document.body.dataset.tab = d.tab; }
});
$('#c-pack').addEventListener('input', (e) => { state.brand.pack = e.target.value; rebuild(); });
$('#c-accent').addEventListener('input', (e) => { state.brand.accent = e.target.value; rebuild(); });
$('#c-bg').addEventListener('input', (e) => { state.bg = e.target.value; studio.setBackground(state.bg); commit(); });
for (const k of ['name', 'tagline', 'detail']) $(`#f-${k}`).addEventListener('input', (e) => { state.brand[k] = e.target.value; rebuild(); });
$('#font-display').onchange = async (e) => { await loadFonts(e.target.value); state.brand.fonts.display = e.target.value; rebuild(); };
$('#font-body').onchange = async (e) => { await loadFonts(e.target.value); state.brand.fonts.body = e.target.value; rebuild(); };
$('#logo-scale').oninput = (e) => { state.brand.logoScale = +e.target.value; $('#ls-v').textContent = `${Math.round(e.target.value * 100)}%`; rebuild(); };
$('#logo-y').oninput = (e) => { state.brand.logoY = +e.target.value; syncInputs(); rebuild(); };
$('#logo-plate').onchange = (e) => { state.brand.logoPlate = e.target.checked; rebuild(); };
$('#pattern-op').oninput = (e) => { state.brand.pattern.opacity = +e.target.value; $('#po-v').textContent = `${Math.round(e.target.value * 100)}%`; rebuild(); };
$('#border-size').oninput = (e) => { state.brand.border.size = +e.target.value; $('#bs-v').textContent = `${Math.round(e.target.value * 100)}`; rebuild(); };
$('#dims').addEventListener('input', (e) => {
  const k = e.target.dataset.dim, mm = e.target.dataset.mm;
  if (k) { state.dims[state.product][k] = +e.target.value; e.target.closest('label').querySelector('.mm').value = Math.round(e.target.value * 100); rebuild(); }
  if (mm && e.target.value) { const v = Math.min(400, Math.max(10, +e.target.value)) / 100; state.dims[state.product][mm] = v; e.target.closest('label').querySelector('[data-dim]').value = v; rebuild(); }
});
$('#spin').addEventListener('change', (e) => { studio.autoRotate = e.target.checked; });
$('#fold').addEventListener('input', (e) => { state.fold = +e.target.value; studio.product?.fold?.(state.fold); });
$('#play-fold').addEventListener('click', () => {
  state.fold = 1; $('#fold').value = 1; studio.view('wide'); studio.product?.fold?.(0);
  setTimeout(() => studio.playFold(0, 1, 3000, () => setTimeout(() => studio.view('hero'), 700)), 500);
});

// uploads
async function fileToImage(f) { const url = URL.createObjectURL(f); try { return await loadImage(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 5000); } }
async function useUploadedLogo(img, name) {
  const b = state.brand;
  b.uploadedLogo = img; b.logo = img; b.logoSource = 'upload'; b.artwork = null; b.logoPlate = false; b.ink = null;
  const [main, accent, ...rest] = extractPalette(img);
  state.palette = [main, accent, ...rest].filter(Boolean).slice(0, 5);
  b.pack = main; b.accent = accent;
  if (name) b.name = name;
  state.bg = mix(isDark(main) ? accent : main, '#ffffff', 0.78); studio.setBackground(state.bg);
  $('#use-logo').checked = true;
  syncInputs(); rebuild(true);
}
$('#logo-file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  await useUploadedLogo(await fileToImage(f), state.brand.name || f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
  e.target.value = '';
});
$('#ai-logo').onclick = () => { const b = state.brand; b.logoSource = 'ai'; b.logoPlate = false; if (!b.logoSpec.monogram) b.logoSpec.monogram = ''; syncInputs(); rebuild(true); };
$('#load-dsert').onclick = () => loadDsert();
$('#pattern-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; state.brand.pattern = { type: 'image', opacity: 0.35, image: await fileToImage(f) }; e.target.value = ''; syncInputs(); rebuild(true); });
$('#border-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; state.brand.border = { ...state.brand.border, type: 'image', image: await fileToImage(f) }; e.target.value = ''; syncInputs(); rebuild(true); });
$('#art-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; state.brand.artwork = await fileToImage(f); e.target.value = ''; syncInputs(); rebuild(true); });
$('#clear-art').addEventListener('click', () => { state.brand.artwork = null; syncInputs(); rebuild(true); });
$('#template').addEventListener('click', () => templateFor(state.product, state.dims[state.product]).toBlob((b) => download(b, `wrapt-${state.product}-template.png`)));
addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dropping'); });
addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
addEventListener('drop', async (e) => {
  e.preventDefault(); document.body.classList.remove('dropping');
  const f = e.dataTransfer.files[0]; if (!f || !f.type.startsWith('image/')) return;
  await useUploadedLogo(await fileToImage(f), state.brand.name || f.name.replace(/\.[^.]+$/, ''));
});

// ---------- export ----------
const SIZES = { square: [1080, 1080], post: [1080, 1350], story: [1080, 1920], wide: [1920, 1080], hd: [2160, 2160] };
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const slug = () => (state.brand.name || 'wrapt').toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, '-');
$('#export-btn').addEventListener('click', () => $('#export').showModal());
$('#how-btn').addEventListener('click', () => $('#how').showModal());
$$('dialog .close').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
const size = () => SIZES[$('input[name=size]:checked').value];
$('#dl-png').addEventListener('click', async () => { const [w, h] = size(); download(await studio.snapshot(w, h), `${slug()}-${state.product}.png`); });
$('#dl-alpha').addEventListener('click', async () => { const [w, h] = size(); download(await studio.snapshot(w, h, { transparent: true }), `${slug()}-${state.product}-transparent.png`); });
$('#dl-logo').addEventListener('click', () => { const l = state.brand.logo; if (!l) return; const c = document.createElement('canvas'); c.width = l.width; c.height = l.height; c.getContext('2d').drawImage(l, 0, 0); c.toBlob((b) => download(b, `${slug()}-logo.png`)); });
$('#dl-video').addEventListener('click', async (e) => {
  const btn = e.currentTarget, bar = $('#rec-bar'); const [w, h] = size();
  btn.disabled = true; bar.hidden = false;
  try { const { blob, ext } = await studio.recordTurntable(w, h, 6, (p) => { bar.firstElementChild.style.width = `${p * 100}%`; }); download(blob, `${slug()}-${state.product}-360.${ext}`); }
  catch (err) { toast(err.message); }
  btn.disabled = false; bar.hidden = true;
});

function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }

// ---------- start screen ----------
const VIBES = ['Minimal', 'Premium', 'Playful', 'Traditional / desi', 'Natural', 'Bold', 'Luxury', 'Cute', 'Modern', 'Handmade', 'Festive', 'Retro'];
const SWATCHES = ['#1c1a17', '#f6f1e7', '#6e1423', '#c0392b', '#ec7b2c', '#f2c230', '#2f7d4a', '#1f7a7a', '#2a5ca8', '#6c3b9e', '#ee8fb0', '#c9a35a'];
const IDEAS = [
  ['Homemade mango pickle made with my mom\'s recipe', 'Amma ka Achaar'],
  ['Cold brew coffee in cans for college students', ''],
  ['Organic tulsi green tea', 'Tulsi Leaf'],
  ['Handmade soy candles with Indian scents', ''],
  ['Kids mango ice cream', 'Scoopy'],
  ['Diwali mithai gift box', 'Shubh Mithai'],
];
const wz = { product: '', vibes: [], colors: [], logo: null };
function renderWizard() {
  $('#wz-vibe').innerHTML = VIBES.map((v) => `<button type="button" data-wv="${v}" class="${wz.vibes.includes(v) ? 'on' : ''}">${v}</button>`).join('');
  $('#wz-colors').innerHTML = `<button type="button" class="wz-auto ${wz.colors.length ? '' : 'on'}" data-wc="">✦ Let AI pick</button>`
    + SWATCHES.map((c) => `<button type="button" class="sw big ${wz.colors.includes(c) ? 'on' : ''}" style="--c:${c}" data-wc="${c}" aria-label="${c}"></button>`).join('')
    + `<label class="pick"><input type="color" id="wz-custom" value="#d4a06a" /><span>Custom</span></label>`
    + (wz.colors.length ? `<small class="wz-picked">Picked: ${wz.colors.map((c) => `<i style="background:${c}"></i>`).join('')}</small>` : '');
  $$('#wz-product [data-wp]').forEach((b) => b.classList.toggle('on', b.dataset.wp === wz.product));
  $('#wz-ref-list').innerHTML = state.refs.map((r, i) => `<span class="ref"><img src="${r.data}" alt="" /><button type="button" data-rmref="${i}" aria-label="Remove">✕</button></span>`).join('');
  $('#wz-ideas').innerHTML = '<small>Need an idea?</small>' + IDEAS.map(([w, n], i) => `<button type="button" class="ex" data-idea="${i}">${w}</button>`).join('');
}
function openWizard() { renderWizard(); $('#start').showModal(); setTimeout(() => $('#wz-what').focus(), 50); }
$('#wizard').addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.wp !== undefined) { wz.product = d.wp; renderWizard(); }
  if (d.wv) { wz.vibes = wz.vibes.includes(d.wv) ? wz.vibes.filter((v) => v !== d.wv) : [...wz.vibes, d.wv].slice(-3); renderWizard(); }
  if (d.wc !== undefined) { if (!d.wc) wz.colors = []; else wz.colors = wz.colors.includes(d.wc) ? wz.colors.filter((c) => c !== d.wc) : [...wz.colors, d.wc].slice(-2); renderWizard(); }
  if (d.rmref != null) { state.refs.splice(+d.rmref, 1); renderWizard(); renderRefs(); }
  if (d.idea != null) { const [w, n] = IDEAS[+d.idea]; $('#wz-what').value = w; $('#wz-name').value = n; }
});
$('#wizard').addEventListener('change', (e) => { if (e.target.id === 'wz-custom') { wz.colors = [...wz.colors, e.target.value].slice(-2); renderWizard(); } });
$('#wz-refs').addEventListener('change', async (e) => { for (const f of [...e.target.files].slice(0, 3 - state.refs.length)) state.refs.push(await shrinkData(f)); e.target.value = ''; renderWizard(); renderRefs(); });
$('#wz-logo').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  wz.logo = await fileToImage(f);
  $('#wz-logo-txt').innerHTML = `<img src="${wz.logo.src}" alt="" /><small>Logo added ✓ — tap to change</small>`;
});
$('#wz-close').onclick = $('#wz-skip').onclick = () => $('#start').close();
if (SR) {
  const rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = true; let base = '';
  $('#wz-mic').hidden = false;
  $('#wz-mic').onclick = () => { if ($('#wz-mic').classList.contains('on')) return rec.stop(); base = $('#wz-what').value ? $('#wz-what').value + ' ' : ''; try { rec.start(); $('#wz-mic').classList.add('on'); } catch (e) {} };
  rec.onresult = (e) => { $('#wz-what').value = base + [...e.results].map((r) => r[0].transcript).join(''); };
  rec.onend = rec.onerror = () => $('#wz-mic').classList.remove('on');
}
$('#wizard').addEventListener('submit', async (e) => {
  e.preventDefault();
  const what = $('#wz-what').value.trim(), name = $('#wz-name').value.trim();
  if (!what) { $('#wz-what').focus(); $('#wz-what').classList.add('shake'); setTimeout(() => $('#wz-what').classList.remove('shake'), 500); return; }
  const brief = [
    what,
    name ? `Brand name: "${name}".` : 'No brand name yet — suggest one.',
    wz.product ? `Packaging: ${wz.product}.` : '',
    wz.vibes.length ? `Feel: ${wz.vibes.join(', ').toLowerCase()}.` : '',
    wz.colors.length ? `Preferred colours: ${wz.colors.join(', ')}.` : '',
    wz.logo ? 'They already have a logo.' : 'They have no logo — design one.',
  ].filter(Boolean).join(' ');
  $('#start').close();
  if (wz.logo) { await useUploadedLogo(wz.logo, name || undefined); } else { $('#use-logo').checked = false; }
  $('#brief').value = brief;
  if (matchMedia('(max-width: 899px)').matches) { $$('[data-tab]').forEach((x) => x.classList.toggle('on', x.dataset.tab === 'create')); document.body.dataset.tab = 'create'; }
  await generate({ brief, name, product: wz.product, colors: wz.colors });
});

// ---------- start ----------
async function loadDsert() {
  const img = await loadImage(BASE + 'samples/dsert.png');
  Object.assign(state.brand, { name: 'D-SERT', tagline: 'Handcrafted desserts', detail: 'Belgian chocolate · 250 g', style: 'classic', fonts: { display: 'DM Serif Display', body: 'Inter' }, pattern: { type: 'none', opacity: 0.18, image: null }, border: { type: 'double', size: 0.06, image: null }, logoScale: 1, logoY: 0 });
  state.plan = null;
  await useUploadedLogo(img);
  $('#use-logo').checked = false; // a sample, not the user's own logo
  state.bg = '#efe3d2'; studio.setBackground(state.bg); syncInputs();
}
renderRefs();
document.fonts.ready.then(async () => {
  // a neutral demo brand sits behind the start screen (made by the built-in designer)
  const demo = designLocally("Premium masala chai called 'Kesar Chai' — warm, traditional")[0];
  await applyPlan({ ...demo, product: 'pouch' }, { keepUploaded: false });
  current = snap(); history.past = []; updUndo();
  openWizard();
});
