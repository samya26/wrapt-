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
import '@fontsource/fraunces/latin-400.css';
import '@fontsource/fraunces/latin-700.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/marcellus/latin-400.css';
import '@fontsource/abril-fatface/latin-400.css';
import '@fontsource/rozha-one/latin-400.css';
import '@fontsource/young-serif/latin-400.css';
import '@fontsource/shrikhand/latin-400.css';
import '@fontsource/baloo-2/latin-500.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/unbounded/latin-400.css';
import '@fontsource/unbounded/latin-700.css';
import '@fontsource/bricolage-grotesque/latin-400.css';
import '@fontsource/bricolage-grotesque/latin-700.css';
import '@fontsource/syne/latin-500.css';
import '@fontsource/syne/latin-700.css';
import './style.css';
import { Studio } from './studio.js';
import { BUILDERS, DEFAULTS, PRODUCT_NAMES, printArea } from './products.js';
import { printPDF } from './print.js';
import { paintBox, paintWrap, paintFace, loadImage, extractPalette, templateFor, mix, isDark, loadFonts, paper, ink, luminance, FONTS, PATTERNS, BORDERS, CORNER_OK, CENTRES, borderType, borderTile, centreTile, removeBackground, plainCorners, logoCoverage } from './art.js';
import { renderLogo, logoSVG, packColors, designLogos } from './logo.js';
import { openLogoStudio, initLogoStudio } from './logostudio.js';
import { initLanding } from './landing.js';
import { openEditor, initEditor } from './editor.js';
import { loadGenFonts } from './genmark.js';
import { designLocally, refineLocally, normalizePlan, audit, askAI, allowedPacks } from './design.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BASE = import.meta.env.BASE_URL;

// ---------- state ----------
const state = {
  product: 'can',
  dims: structuredClone(DEFAULTS),
  brand: {
    logo: null, logoSource: 'spec', uploadedLogo: null, logoSpec: null, logoHasName: false,
    name: '', tagline: '', detail: '', pack: '#2a1713', accent: '#d4a06a', ink: null, style: 'classic',
    fonts: { display: 'DM Serif Display', body: 'Inter' },
    pattern: { type: 'none', opacity: 0.18, image: null }, border: { type: 'double', size: 0.06, inset: 0.045, color: 'accent', corners: false, image: null },
    logoScale: 1, logoY: 0, logoPlate: false, artwork: null,
  },
  palette: [], finish: 'gloss', light: 'studio', bg: '#efe3d2', fold: 1,
  plan: null, concepts: [], refs: [], logoLocked: false,
};

const studio = new Studio($('#stage'));
window.__studio = studio;

// ---------- undo / redo ----------
const history = { past: [], future: [], timer: null };
const snap = () => ({ product: state.product, dims: structuredClone(state.dims), finish: state.finish, light: state.light, bg: state.bg, plan: state.plan, palette: [...state.palette],
  brand: { ...state.brand, fonts: { ...state.brand.fonts }, pattern: { ...state.brand.pattern }, border: { ...state.brand.border }, logoSpec: state.brand.logoSpec } , logoLocked: state.logoLocked });
let current = null;
function commit(now = false) {
  clearTimeout(history.timer);
  const go = () => { if (current) history.past.push(current); if (history.past.length > 60) history.past.shift(); history.future = []; current = snap(); updUndo(); };
  now ? go() : (history.timer = setTimeout(go, 350));
}
function restore(s) {
  Object.assign(state, { product: s.product, dims: structuredClone(s.dims), finish: s.finish, light: s.light, bg: s.bg, plan: s.plan, palette: [...s.palette] });
  state.brand = { ...s.brand, fonts: { ...s.brand.fonts }, pattern: { ...s.brand.pattern }, border: { ...s.brand.border }, logoSpec: s.brand.logoSpec }; state.logoLocked = !!s.logoLocked;
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
  if (b.logoSource === 'ai') b.logoSource = 'spec';
  if (b.logoSource === 'spec' && b.logoSpec) { b.logo = specLogo(b); b.logoHasName = true; }
  else b.logoHasName = false;
  const pc = $('#logo-preview'), g = pc.getContext('2d');
  g.clearRect(0, 0, 120, 120); g.fillStyle = state.brand.style === 'minimal' ? mix(b.pack, '#fff', 0.9) : b.pack; g.fillRect(0, 0, 120, 120);
  if (b.logo) { const k = 100 / Math.max(b.logo.width, b.logo.height); g.drawImage(b.logo, 60 - (b.logo.width * k) / 2, 60 - (b.logo.height * k) / 2, b.logo.width * k, b.logo.height * k); }
}
// the designed logo, re-coloured so it always reads on this pack
function specLogo(b) { const sp = { ...b.logoSpec, name: b.name || b.logoSpec.name }; return renderLogo(sp, packColors(sp, paper(b), b.accent, ink(b))).canvas; }
// a clean name-only logo when nobody designed one yet (used for all 3 concepts, so the brand stays consistent)
const STYLE_PREFS = { classic: { modern: -0.5, serious: 0.5, bold: 0 }, minimal: { modern: 0.6, serious: 0.4, bold: -0.3, precise: 0.6 }, bold: { modern: 0.4, serious: -0.5, bold: 0.8 }, heritage: { modern: -0.7, serious: 0, bold: 0.4, precise: -0.3 } };
function autoSpec(p) {
  const dark = luminance(p.palette.pack) < luminance(p.palette.accent) ? p.palette.pack : p.palette.accent;
  const opts = designLogos({ name: p.name, brief: $('#brief').value, type: 'surprise', prefs: STYLE_PREFS[p.style] || {}, colors: [dark, p.palette.accent] });
  return opts.find((o) => o.mark?.source === 'gen') || opts[0]; // a one-of-a-kind mark from their own letters
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
    const pt = issues[k].patch;
    if (pt._removeBg) { const img = removeBackground(state.brand.uploadedLogo || state.brand.logo); state.brand.uploadedLogo = img; state.brand.logo = img; toast('Background removed'); }
    else if (pt._studio) { $('#ai-logo').click(); return; }
    else Object.assign(state.brand, pt);
    syncInputs(); rebuild(true);
  };
}

// ---------- plans ----------
function planFromState() {
  const b = state.brand;
  return normalizePlan({ concept: state.plan?.concept || 'Current', name: b.name, tagline: b.tagline, detail: b.detail, product: state.product, style: b.style,
    palette: { pack: b.pack, accent: b.accent, background: state.bg }, fonts: b.fonts, pattern: { type: b.pattern.type, opacity: b.pattern.opacity }, border: { type: b.border.type }, centre: b.centre || 'none',
    logo: b.logoSpec, finish: state.finish, light: state.light, reasoning: state.plan?.reasoning || {} });
}
function brandFromPlan(p, keepUploaded) {
  const b = { ...state.brand, fonts: { ...p.fonts }, pattern: { ...p.pattern, image: null }, border: { ...state.brand.border, type: borderType(p.border.type), image: null },
    name: p.name, tagline: p.tagline, detail: p.detail, pack: p.palette.pack, accent: p.palette.accent, ink: null, style: p.style, centre: p.centre || 'none',
    logoSpec: state.brand.logoSpec || autoSpec(p), logoScale: p.logoScale ?? 1, logoY: 0, logoPlate: false, artwork: null, layers: state.brand.layers || [] };
  if (keepUploaded && state.brand.uploadedLogo) { b.logo = state.brand.uploadedLogo; b.logoSource = 'upload'; b.logoHasName = false; }
  else { b.logoSource = 'spec'; b.logo = specLogo(b); b.logoHasName = true; }
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
  $('#mood-zone').classList.toggle('has', state.refs.length > 0);
  if (typeof moodDirty !== 'undefined') { moodDirty = state.refs.length > 0; $('#mood-apply').hidden = !moodDirty || !state.concepts.length; }
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
  const locked = !hasLogo && state.logoLocked && state.brand.logoSpec;
  if (locked) opts = { ...opts, name: opts.name || state.brand.logoSpec.name };
  let plans, note = '';
  if (aiMode !== 'local') {
    const res = await askAI({ mode: 'concepts', packs: opts.product ? [] : allowedPacks(brief), brief: brief + (locked ? ` Their logo is already designed (colours ${state.brand.logoSpec.colors.primary} and ${state.brand.logoSpec.colors.secondary}) — build the packaging around it.` : ''), images: state.refs.map((r) => r.data), hasLogo: hasLogo || !!locked });
    if (res?.concepts?.length) { plans = res.concepts.slice(0, 3).map((p) => normalizePlan(p, { hasLogo })); aiMode = 'ai'; }
    else { if (res?.unavailable) aiMode = 'local'; else note = `AI had a problem (${res?.error || 'unknown'}) — used the built-in designer.`; }
    setAiStatus();
  }
  if (!plans) plans = designLocally(brief, { refColors: colors.length ? [colors[0], colors[1] || mix(colors[0], isDark(colors[0]) ? '#f3d9a4' : '#2a1d16', 0.6)] : state.refs[0]?.colors || [], hasLogo });
  // hard choices from the start screen always win
  const fits = allowedPacks(brief), named = /\b(can|box|tub|jar|pouch|bottle|tube|cup|card|bag)s?\b|paper tube|hang card/i.test(brief);
  const same = plans.every((p) => p.product === plans[0].product);
  plans = plans.map((p, i) => normalizePlan({ ...p, ...(opts.name ? { name: opts.name } : {}),
    product: opts.product || (named ? p.product : fits.includes(p.product) && !(same && i > 0) ? p.product : fits[i % Math.min(3, fits.length)]) }, { hasLogo }));
  // one logo for all three concepts: the locked one, or a clean wordmark
  if (!locked && !hasLogo) state.brand.logoSpec = autoSpec(plans[0]);
  state.concepts = plans;
  await renderConcepts();
  await applyPlan(plans[0], { keepUploaded: hasLogo });
  markChosen(0);
  btn.disabled = false; btn.textContent = '✦ Design 3 new concepts'; $('#busy').hidden = true;
  say(`${note ? esc(note) + '<br>' : ''}Here are 3 directions for <b>${esc(plans[0].name)}</b> — pick one on the left, then tell me here what to change.`);
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

// ---------- Ask Wrapt: the main way to change things ----------
const CHIPS = ['More premium', 'More playful', 'Bigger logo', 'Try a different pack', 'Warmer colours', 'Use my mood photos', 'Why these colours?'];
$('#ask-chips').innerHTML = CHIPS.map((c) => `<button type="button" data-chip="${c}">${c}</button>`).join('');
let sayT;
function say(html, { typing = false } = {}) {
  const r = $('#ask-reply'); r.hidden = false; r.classList.toggle('typing', typing); r.innerHTML = typing ? '<i></i><i></i><i></i>' : `${html}<button type="button" class="x" aria-label="Close">✕</button>`;
  clearTimeout(sayT); if (!typing) sayT = setTimeout(() => (r.hidden = true), 14000);
}
const chat = (who, html) => { if (who !== 'me') say(html, { typing: who.includes('typing') }); };
$('#ask-reply').addEventListener('click', (e) => { if (e.target.closest('.x')) $('#ask-reply').hidden = true; });
$('#ask-chips').addEventListener('click', (e) => { const c = e.target.dataset.chip; if (c) { $('#ask-input').value = c; $('#ask-form').requestSubmit(); } });
$('#ask-file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (state.refs.length >= 3) state.refs.shift();
  state.refs.push(await shrinkData(f)); renderRefs();
  say('Photo added to your mood board. Tell me what you like about it — or tap <b>Apply mood</b> in the left panel.');
});
async function ask(q) {
  const plan = planFromState();
  const asking = /^(why|what|how|which|kyu|kyon|explain)\b/i.test(q) || q.endsWith('?');
  const moodish = /mood|photo|picture|image|inspir|reference|like (this|that|it)|similar/i.test(q);
  if (moodish && !asking) {
    if (!state.refs.length) { say('Add a mood photo first — use the ＋ in this bar or the Mood board on the left.'); return; }
    return applyMood(q);
  }
  say('', { typing: true });
  const res = aiMode === 'ai' ? await askAI(asking ? { mode: 'explain', plan, question: q } : { mode: 'refine', plan, instruction: q, images: state.refs.map((r) => r.data) }) : null;
  if (asking) { say(res?.answer ? esc(res.answer) : reasonHtml(plan.reasoning?.colour ? plan : (state.plan || plan)) || 'I picked these to keep the pack readable and on-brand.'); return; }
  let next, note;
  if (res?.plan) { next = normalizePlan(res.plan); note = res.note; }
  else {
    ({ plan: next, note } = refineLocally(plan, q));
    if (/couldn't|could not/i.test(note || '')) { say(aiMode === 'ai' ? 'The AI didn’t answer just now — try again in a moment, or use words like <i>premium</i>, <i>playful</i>, <i>bigger logo</i>, a colour or a pack name.' : esc(note)); return; }
  }
  next.reasoning = next.reasoning?.colour ? next.reasoning : plan.reasoning;
  await applyPlan(next, { keepUploaded: state.brand.logoSource === 'upload' });
  say(esc(note || 'Done.'));
}
$('#ask-form').onsubmit = (e) => { e.preventDefault(); const q = $('#ask-input').value.trim(); if (!q) return; $('#ask-input').value = ''; ask(q); };

// ---------- mood board: drop photos, then Apply to redesign from them ----------
let moodDirty = false;
async function applyMood(extra = '') {
  if (!state.refs.length) return;
  moodDirty = false; $('#mood-apply').hidden = true;
  const colors = state.refs.flatMap((r) => r.colors || []).slice(0, 2);
  await generate({ brief: `${$('#brief').value} Take the look and feel from their mood photos (colours, mood, style). ${extra}`.trim(), name: state.logoLocked ? state.brand.logoSpec?.name : state.brand.name, colors });
}
$('#mood-apply').onclick = () => applyMood();
// ---------- logo drop zone: drop, check, then Apply ----------
let pendingLogo = null;
async function stageLogo(file) {
  if (!file || !file.type.startsWith('image/')) return;
  pendingLogo = { img: await fileToImage(file), name: file.name.replace(/\.[^.]+$/, '') };
  const pc = $('#logo-preview'), g = pc.getContext('2d'); g.clearRect(0, 0, pc.width, pc.height);
  const im = pendingLogo.img, k = Math.min(pc.width / im.width, pc.height / im.height) * 0.86; g.drawImage(im, (pc.width - im.width * k) / 2, (pc.height - im.height * k) / 2, im.width * k, im.height * k);
  $('#logo-pending').hidden = false; $('#logo-zone-body').hidden = true; $('#logo-zone').classList.add('pending');
}
function unstageLogo() { pendingLogo = null; $('#logo-pending').hidden = true; $('#logo-zone-body').hidden = false; $('#logo-zone').classList.remove('pending'); refreshLogo(); }
$('#logo-apply').onclick = async () => { const p = pendingLogo; unstageLogo(); if (p) { state.logoLocked = false; await useUploadedLogo(p.img, state.brand.name || p.name); toast('Logo applied'); } };
$('#logo-cancel').onclick = unstageLogo;
for (const [zone, fn] of [['#logo-zone', (fs) => stageLogo(fs[0])], ['#mood-zone', async (fs) => { for (const f of fs.filter((x) => x.type.startsWith('image/')).slice(0, 3)) { if (state.refs.length >= 3) state.refs.shift(); state.refs.push(await shrinkData(f)); } renderRefs(); }]]) {
  const z = $(zone);
  z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('over'); });
  z.addEventListener('dragleave', () => z.classList.remove('over'));
  z.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); z.classList.remove('over'); fn([...e.dataTransfer.files]); });
}
// dropping a file anywhere else does nothing (no surprise logo changes)
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => e.preventDefault());

// ---------- artwork editor ----------
function faceInfo() {
  const P = state.product, d = state.dims[P], A = printArea(P, d);
  if (A.kind === 'wrap') return { aspect: A.w / 2 / A.h, wrap: true };
  if (P === 'box') return { aspect: d.w / d.h, wrap: false };
  return { aspect: A.w / A.h, wrap: false };
}
$('#edit-art').onclick = () => {
  const f = faceInfo();
  openEditor({ brand: state.brand, ...f, onDone: (layers) => { state.brand.layers = layers; syncInputs(); rebuild(true); toast(layers.length ? 'Artwork applied to the pack' : 'Artwork cleared'); } });
};

// ---------- inputs ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('#font-display').innerHTML = $('#font-body').innerHTML = Object.keys(FONTS).map((f) => `<option value="${f}">${f}</option>`).join('');
$('#patterns').innerHTML = Object.entries(PATTERNS).map(([k, v]) => `<button data-pattern="${k}">${v}</button>`).join('');
$('#borders').innerHTML = Object.entries(BORDERS).filter(([k]) => k !== 'image').map(([k, v]) => `<button data-border="${k}" title="${v}"><canvas width="128" height="168"></canvas><span>${v}</span></button>`).join('');
$('#centres').innerHTML = Object.entries(CENTRES).map(([k, v]) => `<button data-centre="${k}" title="${v}"><canvas width="128" height="168"></canvas><span>${v}</span></button>`).join('');
let tileKey = '';
function renderBorderTiles() {
  const b = state.brand, key = [paper(b), b.accent, b.name, b.border.color, b.style, b.fonts.body].join('|'); if (key === tileKey) return; tileKey = key;
  $$('#borders [data-border]').forEach((el) => { const c = el.querySelector('canvas'), t = borderTile(b, el.dataset.border, 64, 84); c.getContext('2d').drawImage(t, 0, 0, 128, 168); });
  $$('#centres [data-centre]').forEach((el) => { const c = el.querySelector('canvas'), t = centreTile(b, el.dataset.centre, 64, 84); c.getContext('2d').drawImage(t, 0, 0, 128, 168); });
}

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
  on('[data-pattern]', 'pattern', b.pattern.image ? '' : b.pattern.type); on('[data-border]', 'border', b.border.type === 'image' ? '' : borderType(b.border.type));
  on('[data-bcol]', 'bcol', b.border.color || 'accent'); on('[data-centre]', 'centre', b.centre || 'none'); on('[data-scene]', 'scene', state.scene || 'studio');
  $('#border-ctl').hidden = b.border.type === 'none';
  $('#corners-row').hidden = !CORNER_OK.includes(b.border.type); $('#border-corners').checked = !!b.border.corners;
  $('#border-inset').value = b.border.inset ?? 0.045; $('#bi-v').textContent = `${Math.round((b.border.inset ?? 0.045) * 100)}`;
  renderBorderTiles();
  $('#dl-logo-svg').hidden = b.logoSource !== 'spec';
  $('#logo-scale').value = b.logoScale; $('#ls-v').textContent = `${Math.round(b.logoScale * 100)}%`;
  $('#logo-y').value = b.logoY; $('#ly-v').textContent = Math.abs(b.logoY) < 0.01 ? 'centre' : b.logoY < 0 ? 'higher' : 'lower';
  $('#logo-plate').checked = b.logoPlate;
  $('#pattern-op').value = b.pattern.opacity; $('#po-v').textContent = `${Math.round(b.pattern.opacity * 100)}%`;
  $('#border-size').value = b.border.size; $('#bs-v').textContent = `${Math.round(b.border.size * 100)}`;
  $('#art-state').textContent = b.artwork ? '· using your artwork' : '';
  $('#clear-art').hidden = !b.artwork;
  $('#use-logo-row').hidden = !b.uploadedLogo;
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
  if (d.bcol) { b.border = { ...b.border, color: d.bcol }; syncInputs(); rebuild(); }
  if (d.centre) { b.centre = d.centre; syncInputs(); rebuild(); }
  if (d.scene) { state.scene = d.scene; studio.setScene(d.scene); syncInputs(); }
  if (d.ltab) { document.body.dataset.ltab = d.ltab; $$('[data-ltab]').forEach((x) => x.classList.toggle('on', x === t)); $('.panel.left').scrollTop = 0; }
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
$('#border-inset').oninput = (e) => { state.brand.border.inset = +e.target.value; $('#bi-v').textContent = `${Math.round(e.target.value * 100)}`; rebuild(); };
$('#border-corners').onchange = (e) => { state.brand.border.corners = e.target.checked; rebuild(); };
$('#use-logo').onchange = (e) => {
  const b = state.brand;
  if (e.target.checked && b.uploadedLogo) { b.logo = b.uploadedLogo; b.logoSource = 'upload'; }
  else { b.logoSource = 'spec'; if (!b.logoSpec) b.logoSpec = autoSpec(planFromState()); }
  syncInputs(); rebuild(true);
};
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
  if (logoCoverage(img) > 0.97 && plainCorners(img)) { img = removeBackground(img); toast('Removed the plain background from your logo'); }
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
  await stageLogo(f); // preview first — nothing changes until they tap Apply
  e.target.value = '';
});
// Logo Studio from the sidebar: edit the current logo (or start one)
function lockLogo(spec) {
  const b = state.brand; state.logoLocked = true; b.logoSpec = spec; b.logoSource = 'spec'; b.logoPlate = false; b.name = spec.name || b.name;
  $('#use-logo').checked = false; syncInputs(); rebuild(true);
}
$('#ai-logo').onclick = () => openLogoStudio({ name: state.brand.name, brief: $('#brief').value, colors: [state.brand.accent], spec: state.logoLocked ? { ...state.brand.logoSpec, name: state.brand.name } : null, onUse: lockLogo, ai: () => aiMode !== 'local' });
$('#pattern-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; state.brand.pattern = { type: 'image', opacity: 0.35, image: await fileToImage(f) }; e.target.value = ''; syncInputs(); rebuild(true); });
$('#border-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; state.brand.border = { ...state.brand.border, type: 'image', image: await fileToImage(f) }; e.target.value = ''; syncInputs(); rebuild(true); });
$('#art-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; state.brand.artwork = await fileToImage(f); e.target.value = ''; syncInputs(); rebuild(true); });
$('#clear-art').addEventListener('click', () => { state.brand.artwork = null; syncInputs(); rebuild(true); });
$('#template').addEventListener('click', () => templateFor(state.product, state.dims[state.product]).toBlob((b) => download(b, `wrapt-${state.product}-template.png`)));
// ---------- export ----------
const SIZES = { square: [1080, 1080], post: [1080, 1350], story: [1080, 1920], wide: [1920, 1080], hd: [2160, 2160] };
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const slug = () => (state.brand.name || 'wrapt').toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, '-');
$('#export-btn').addEventListener('click', () => $('#export').showModal());
$('#home-btn').addEventListener('click', () => openLanding());
$$('dialog .close').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
const size = () => SIZES[$('input[name=size]:checked').value];
// print-ready PDF at real size, with bleed, crop marks and the dieline
function printFile() {
  const b = state.brand, P = state.product, d = state.dims[P], A = printArea(P, d);
  let art, cuts = [], folds = [], mmW = A.w, mmH = A.h;
  if (A.kind === 'box') {
    const { canvas } = paintBox(b, d, 1000); art = canvas;
    const D = d.d * 100, W = d.w * 100, H = d.h * 100, k = 10, gx = art.getContext('2d'); // 10 px per mm
    gx.fillStyle = '#ffffff'; // nothing prints outside the dieline
    for (const [x, y, w, h] of [[0, 0, D, D], [D + W, 0, D + W, D], [0, D + H, D, D], [D + W, D + H, D + W, D]]) gx.fillRect(x * k, y * k, w * k, h * k);
    const poly = [[D, 0], [D + W, 0], [D + W, D], [2 * D + 2 * W, D], [2 * D + 2 * W, D + H], [D + W, D + H], [D + W, 2 * D + H], [D, 2 * D + H], [D, D + H], [0, D + H], [0, D], [D, D], [D, 0]];
    for (let i = 0; i < poly.length - 1; i++) cuts.push([...poly[i], ...poly[i + 1]]);
    folds = [[D, D, D, D + H], [D + W, D, D + W, D + H], [2 * D + W, D, 2 * D + W, D + H], [D, D, D + W, D], [D, D + H, D + W, D + H]];
  } else if (A.kind === 'faces') {
    const gap = 10, px = 2400, f = paintFace(b, 'front', d.w / d.h, px), bk = paintFace(b, 'back', d.w / d.h, px), k = px / A.w;
    art = document.createElement('canvas'); art.width = Math.round((A.w * 2 + gap) * k); art.height = f.height;
    const g = art.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, art.width, art.height); g.drawImage(f, 0, 0); g.drawImage(bk, (A.w + gap) * k, 0);
    mmW = A.w * 2 + gap;
    for (const ox of [0, A.w + gap]) cuts.push([ox, 0, ox + A.w, 0], [ox + A.w, 0, ox + A.w, A.h], [ox + A.w, A.h, ox, A.h], [ox, A.h, ox, 0]);
  } else {
    art = b.artwork || paintWrap(b, A.w / A.h, 3000);
    cuts = [[0, 0, mmW, 0], [mmW, 0, mmW, mmH], [mmW, mmH, 0, mmH], [0, mmH, 0, 0]];
  }
  return printPDF({ art, mmW, mmH, cuts, folds, title: `${b.name} - ${PRODUCT_NAMES[P]}` });
}
$('#dl-pdf').addEventListener('click', () => { download(printFile(), `${slug()}-${state.product}-print.pdf`); toast('Print-ready PDF downloaded'); });
$('#dl-png').addEventListener('click', async () => { const [w, h] = size(); download(await studio.snapshot(w, h), `${slug()}-${state.product}.png`); });
$('#dl-alpha').addEventListener('click', async () => { const [w, h] = size(); download(await studio.snapshot(w, h, { transparent: true }), `${slug()}-${state.product}-transparent.png`); });
$('#dl-logo').addEventListener('click', () => {
  const b = state.brand, l = b.logoSource === 'spec' && b.logoSpec ? renderLogo({ ...b.logoSpec, name: b.name }, b.logoSpec.colors).canvas : b.logo; if (!l) return;
  const k = Math.max(1, 1024 / Math.max(l.width, l.height)), c = document.createElement('canvas'); c.width = l.width * k; c.height = l.height * k; c.getContext('2d').drawImage(l, 0, 0, c.width, c.height); c.toBlob((bl) => download(bl, `${slug()}-logo.png`));
});
$('#dl-logo-svg').addEventListener('click', async () => { const b = state.brand; if (!b.logoSpec) return; const sp = { ...b.logoSpec, name: b.name }; download(new Blob([await logoSVG(sp, sp.colors)], { type: 'image/svg+xml' }), `${slug()}-logo.svg`); });
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
const wz = { product: '', vibes: [], colors: [], logo: null, choice: null };
let wzPage = 1, wzDir = 1;
// the step bar shared by the start screens and the Logo Studio
function setJourney(n) {
  $$('.jsteps li').forEach((li) => { const j = +li.dataset.j; li.classList.toggle('on', j === n); li.classList.toggle('done', j < n); li.classList.toggle('skip', j === 4 && wz.choice && wz.choice !== 'make'); });
}
// scrolling moves through the journey too (but never while typing)
let wheelLock = 0;
$('#start').addEventListener('wheel', (e) => {
  if (document.activeElement?.matches('textarea, input') || Date.now() < wheelLock || Math.abs(e.deltaY) < 30) return;
  wheelLock = Date.now() + 900;
  if (e.deltaY > 0 && !$('#wz-go').disabled && wzPage < 3 && (wzPage !== 2 || $('#wz-what').value.trim())) wzShow(wzPage + 1);
  else if (e.deltaY < 0 && wzPage > 1) wzShow(wzPage - 1);
}, { passive: true });
function wzShow(n) {
  const next = Math.max(1, Math.min(3, n)); wzDir = next >= wzPage ? 1 : -1; $('#wizard').dataset.dir = wzDir; wzPage = next;
  $$('.wz-page').forEach((p) => { p.hidden = +p.dataset.page !== wzPage; });
  setJourney(wzPage);
  $('#wz-back').style.visibility = wzPage > 1 ? 'visible' : 'hidden';
  const go = $('#wz-go');
  go.textContent = wzPage < 3 ? 'Next' : wz.choice === 'make' ? '✦ Design my logo' : '✦ Design my packaging';
  go.disabled = wzPage === 1 && !(wz.choice && (wz.choice !== 'upload' || wz.logo));
  go.style.visibility = wzPage === 1 && go.disabled ? 'hidden' : 'visible';
  if (wzPage === 2) setTimeout(() => $('#wz-what').focus(), 60);
}
function renderWizard() {
  $('#wz-vibe').innerHTML = VIBES.map((v) => `<button type="button" data-wv="${v}" class="${wz.vibes.includes(v) ? 'on' : ''}">${v}</button>`).join('');
  $('#wz-colors').innerHTML = `<button type="button" class="wz-auto ${wz.colors.length ? '' : 'on'}" data-wc="">✦ Let AI pick</button>`
    + SWATCHES.map((c) => `<button type="button" class="sw big ${wz.colors.includes(c) ? 'on' : ''}" style="--c:${c}" data-wc="${c}" aria-label="${c}"></button>`).join('')
    + `<label class="pick"><input type="color" id="wz-custom" value="#d4a06a" /><span>Custom</span></label>`
    + (wz.colors.length ? `<small class="wz-picked">Picked: ${wz.colors.map((c) => `<i style="background:${c}"></i>`).join('')}</small>` : '');
  $$('#wz-product [data-wp]').forEach((b) => b.classList.toggle('on', b.dataset.wp === wz.product));
  $('#wz-ref-list').innerHTML = state.refs.map((r, i) => `<span class="ref"><img src="${r.data}" alt="" /><button type="button" data-rmref="${i}" aria-label="Remove">✕</button></span>`).join('');
  $$('#wz-lchoice [data-wl]').forEach((b) => b.classList.toggle('on', b.dataset.wl === wz.choice));
  $('#wz-logo-drop').hidden = wz.choice !== 'upload';
  $('#wz-ideas').innerHTML = '<small>Try</small>' + IDEAS.map(([w, n], i) => `<button type="button" class="ex" data-idea="${i}">${w}</button>`).join('');
}
function openWizard() { renderWizard(); wzShow(1); $('#start').showModal(); }
$('#wizard').addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.wl) { wz.choice = d.wl; renderWizard(); if (d.wl === 'upload') { if (!wz.logo) $('#wz-logo').click(); wzShow(1); } else wzShow(2); }
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
  $('#wz-logo-txt').innerHTML = `<img src="${wz.logo.src}" alt="" /><small>Tap to change</small>`;
  wzShow(2);
});
$('#wz-close').onclick = () => $('#start').close();
$('#wz-back').onclick = () => wzShow(wzPage - 1);
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
  if (wzPage === 1) { if (!$('#wz-go').disabled) wzShow(2); return; }
  if (wzPage === 2 && what) { wzShow(3); return; }
  if (!what) { wzShow(2); $('#wz-what').focus(); $('#wz-what').classList.add('shake'); setTimeout(() => $('#wz-what').classList.remove('shake'), 500); return; }
  const brief = [
    what,
    name ? `Brand name: "${name}".` : 'No brand name yet — suggest one.',
    wz.product ? `Packaging: ${wz.product}.` : '',
    wz.vibes.length ? `Feel: ${wz.vibes.join(', ').toLowerCase()}.` : '',
    wz.colors.length ? `Preferred colours: ${wz.colors.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  if (wz.choice === 'upload' && !wz.logo) { $('#wz-logo-drop').classList.add('shake'); setTimeout(() => $('#wz-logo-drop').classList.remove('shake'), 500); return; }
  $('#start').close();
  $('#brief').value = brief;
  const toCreate = () => { if (matchMedia('(max-width: 899px)').matches) { $$('[data-tab]').forEach((x) => x.classList.toggle('on', x.dataset.tab === 'create')); document.body.dataset.tab = 'create'; } };
  if (wz.choice === 'upload') { state.logoLocked = false; await useUploadedLogo(wz.logo, name || undefined); toCreate(); return generate({ brief, name, product: wz.product, colors: wz.colors }); }
  $('#use-logo').checked = false; state.brand.logoSource = 'spec';
  if (wz.choice === 'name') { state.logoLocked = false; state.brand.logoSpec = null; toCreate(); return generate({ brief, name, product: wz.product, colors: wz.colors }); }
  // no logo yet: design it first, then the packaging is built around it
  openLogoStudio({
    name, brief: what, colors: wz.colors, vibes: wz.vibes, ai: () => aiMode !== 'local',
    onUse: (spec) => { state.logoLocked = true; state.brand.logoSpec = spec; state.brand.name = spec.name; state.brand.logoSource = 'spec'; refreshLogo(); toCreate(); generate({ brief: brief.replace(/No brand name yet — suggest one\./, `Brand name: "${spec.name}".`), name: spec.name, product: wz.product, colors: wz.colors.length ? wz.colors : [spec.colors.primary, spec.colors.secondary] }); },
    onSkip: (nm) => { state.logoLocked = false; state.brand.logoSpec = null; toCreate(); generate({ brief, name: nm || name, product: wz.product, colors: wz.colors }); },
  });
});

// ---------- start ----------
async function loadDsert() {
  const img = await loadImage(BASE + 'samples/dsert.png');
  Object.assign(state.brand, { name: 'D-SERT', tagline: 'Handcrafted desserts', detail: 'Belgian chocolate · 250 g', style: 'classic', fonts: { display: 'DM Serif Display', body: 'Inter' }, pattern: { type: 'none', opacity: 0.18, image: null }, border: { type: 'double', size: 0.06, inset: 0.045, color: 'accent', corners: false, image: null }, logoScale: 1, logoY: 0 });
  state.plan = null;
  await useUploadedLogo(img);
  $('#use-logo').checked = false; // a sample, not the user's own logo
  state.bg = '#efe3d2'; studio.setBackground(state.bg); syncInputs();
}
renderRefs();
initLogoStudio();
initEditor();
document.fonts.ready.then(async () => {
  await loadGenFonts();
  // a neutral demo brand sits behind the start screen (made by the built-in designer)
  const demo = designLocally("Premium masala chai called 'Kesar Chai' — warm, traditional")[0];
  await applyPlan({ ...demo, product: 'pouch' }, { keepUploaded: false });
  current = snap(); history.past = []; updUndo();
  // the start page: real packs built by the same engine
  const allFonts = Object.keys(FONTS); await loadFonts(...allFonts);
  $('.lp-clean').src = renderLogo(designLogos({ name: 'Tulsi Leaf', brief: 'tulsi tea', type: 'symbol', prefs: { modern: 0.3 }, colors: ['#1f4d3a', '#c8553d'] })[0]).canvas.toDataURL();
  landing = initLanding({ demos: buildDemos, onStart: () => { studio.paused = false; setTimeout(openWizard, 380); }, onHow: () => $('#how').showModal() });
});
let landing = null;
function openLanding() {
  for (const d of $$('dialog[open]')) d.close();
  studio.paused = true; landing?.show();
}
// demo brands for the start page
function demoBrand(o) {
  let p = designLocally(o.brief)[o.idx ?? 0];
  p = normalizePlan({ ...p, name: o.name, product: o.product, style: o.style || p.style, centre: o.centre || 'none', border: { type: o.border || p.border.type },
    pattern: o.pattern ? { type: o.pattern, opacity: 0.14 } : p.pattern, palette: o.palette ? { ...p.palette, ...o.palette } : p.palette, tagline: o.tagline || p.tagline, detail: o.detail || p.detail });
  const dark = luminance(p.palette.pack) < luminance(p.palette.accent) ? p.palette.pack : p.palette.accent;
  const spec = designLogos({ name: o.name, brief: o.brief, type: o.type || 'wordmark', prefs: STYLE_PREFS[p.style] || {}, colors: [dark, p.palette.accent] })[o.li || 0];
  const b = { ...state.brand, fonts: { ...p.fonts }, pattern: { ...p.pattern, image: null }, border: { type: p.border.type, size: 0.06, inset: 0.045, color: o.bcol || 'accent', corners: false, image: null },
    name: p.name, tagline: p.tagline, detail: p.detail, pack: p.palette.pack, accent: p.palette.accent, ink: null, style: p.style, centre: p.centre,
    logoSpec: spec, logoSource: 'spec', logoScale: 1, logoY: 0, logoPlate: false, artwork: null, textScale: 1 };
  b.logo = specLogo(b); b.logoHasName = true;
  return b;
}
function buildDemos(renderer) {
  const D = [
    ['can', { brief: 'Sparkling lemonade, playful and fun', name: 'Fizz & Co', product: 'can', style: 'bold', centre: 'sunburst', tagline: 'Sparkling lemonade' }],
    ['card', { brief: 'Handmade polymer clay keychains, cute', name: 'Knot & Key', product: 'card', style: 'classic', centre: 'frame', type: 'symbol', tagline: 'Handmade keychains', detail: '1 piece' }],
    ['pouch', { brief: "Masala chai called 'Kesar Chai' — warm, traditional", name: 'Kesar Chai', product: 'pouch', style: 'heritage', centre: 'arch', border: 'jali' }],
    ['bottle', { brief: 'Cold-pressed hair oil, natural, minimal', name: 'Bloom', product: 'bottle', style: 'minimal', tagline: 'Cold-pressed hair oil' }],
    ['tube', { brief: 'Rose face cream, cute beauty', name: 'Glow Lab', product: 'tube', style: 'bold', centre: 'spotlight', tagline: 'Rose face cream' }],
    ['cup', { brief: 'Cold brew coffee to go, modern', name: 'Brew Theory', product: 'cup', style: 'minimal', centre: 'band', tagline: 'Cold brew, done right' }],
    ['bag', { brief: 'Handmade soy candles gift shop, luxury', name: 'Diya & Co.', product: 'bag', style: 'classic', centre: 'frame', border: 'deco', bcol: 'gold' }],
    ['box0', { brief: 'Dark chocolate gift box, premium', name: 'Cocoa Club', product: 'box', style: 'classic', centre: 'frame', border: 'deco', bcol: 'gold', tagline: 'Single-origin dark chocolate' }],
    ['box1', { brief: 'Dark chocolate gift box, traditional festive', name: 'Cocoa Club', product: 'box', style: 'heritage', centre: 'arch', border: 'jali', palette: { pack: '#5a1426', accent: '#d9b46a' }, tagline: 'Festive gift edition' }],
    ['box2', { brief: 'Chocolate box, playful for kids', name: 'Cocoa Club', product: 'box', style: 'bold', centre: 'sunburst', border: 'checker', palette: { pack: '#f3b6c8', accent: '#2a1d16' }, tagline: 'Milk choc bites' }],
    ['box3', { brief: 'Chocolate, minimal modern', name: 'Cocoa Club', product: 'box', style: 'minimal', centre: 'none', border: 'crop', tagline: '72% dark' }],
  ];
  return D.map(([key, o]) => { const b = demoBrand(o); return { key, built: BUILDERS[o.product](b, { ...DEFAULTS[o.product], finish: o.product === 'can' ? 'metallic' : 'gloss', fold: 1 }, renderer) }; });
}
