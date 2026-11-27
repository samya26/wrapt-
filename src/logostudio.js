// Logo Studio: draw your idea or describe it → 6 real logo options → tweak → lock.
import { renderLogo, logoSVG, designLogos, enforceLogos, variations, detectCategory, glyphsFor, vibesToPrefs, GLYPHS, LAYOUTS, TREATMENTS, CONTAINERS, LOGO_FONTS } from './logo.js';
import { SketchPad, refineSketch } from './sketch.js';
import { loadGenFonts, genMarks, initials, GEN_KINDS, GEN_FONT_LABELS } from './genmark.js';
import { FONTS, loadFonts, mix } from './art.js';
import { askAI } from './design.js';

const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const SWATCHES = ['#1c1a17', '#f6f1e7', '#6e1423', '#c0392b', '#ec7b2c', '#f2c230', '#2f7d4a', '#1f7a7a', '#2a5ca8', '#6c3b9e', '#ee8fb0', '#c9a35a'];
const TYPES = [['wordmark', 'Wordmark', 'Just the name, in great type'], ['lettermark', 'Letter mark', 'Your initials'], ['symbol', 'Symbol + name', 'A small icon with the name'], ['emblem', 'Emblem', 'A round badge or seal'], ['surprise', 'Surprise me', 'A mix of everything']];
const SHAPES = [['', 'No preference'], ['circle', 'Round'], ['arch', 'Arch'], ['shield', 'Shield'], ['square', 'Square'], ['blob', 'Organic'], ['none', 'No shape']];
const SLIDERS = [['modern', 'Classic', 'Modern'], ['serious', 'Playful', 'Serious'], ['bold', 'Delicate', 'Bold'], ['precise', 'Handmade', 'Precise']];

const S = { name: '', brief: '', type: 'surprise', shape: '', prefs: { modern: 0, serious: 0, bold: 0, precise: 0 }, colors: [], idea: '', tab: 'describe',
  sketches: null, sketchMode: 'clean', options: [], sel: 0, onUse: null, onSkip: null, busy: false, used: false };
let pad, isAI = () => true;

const glyphSvg = (g) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${GLYPHS[g]}"/></svg>`;
function paintInto(canvas, spec, { mono = false, bg = '#faf7f2', pad: p = 0.14 } = {}) {
  const r = renderLogo(spec, spec.colors, { mono }).canvas, g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
  const k = Math.min((W * (1 - 2 * p)) / r.width, (H * (1 - 2 * p)) / r.height);
  g.drawImage(r, (W - r.width * k) / 2, (H - r.height * k) / 2, r.width * k, r.height * k);
}
const ctx = () => ({ seed: S.seed, name: S.name, brief: S.brief, category: detectCategory(`${S.brief} ${S.name} ${S.idea}`), prefs: S.prefs, type: S.type, shape: S.shape, colors: S.colors, idea: S.idea, sketch: S.tab === 'draw' && S.sketches ? S.sketches[S.sketchMode] : null });

// ---------- make view ----------
function renderMake() {
  $('#ls-name').value = S.name;
  $('#ls-types').innerHTML = TYPES.map(([k, t, d]) => `<button type="button" data-ltype="${k}" class="${S.type === k ? 'on' : ''}"><canvas width="220" height="110"></canvas><b>${t}</b><small>${d}</small></button>`).join('');
  const demo = (S.name || 'Brand').trim() || 'Brand';
  const sample = designLogos({ name: demo, brief: S.brief, type: 'surprise', prefs: S.prefs, colors: S.colors.length ? S.colors : ['#2a2420', '#c8553d'] });
  const pick = { wordmark: sample.find((s) => s.layout === 'wordmark'), lettermark: sample.find((s) => s.layout === 'lettermark'), symbol: sample.find((s) => s.layout === 'mark-left'), emblem: sample.find((s) => s.layout === 'emblem'), surprise: sample.find((s) => s.layout === 'stacked') || sample[4] };
  $$('#ls-types canvas').forEach((c, i) => { const sp = pick[TYPES[i][0]]; if (sp) paintInto(c, sp, { bg: null, pad: 0.12 }); });
  $('#ls-shapes').innerHTML = SHAPES.map(([k, t]) => `<button type="button" data-lshape="${k}" class="${S.shape === k ? 'on' : ''}">${t}</button>`).join('');
  $('#ls-sliders').innerHTML = SLIDERS.map(([k, a, b]) => `<label class="ls-sl"><span>${a}</span><input type="range" min="-1" max="1" step="0.1" value="${S.prefs[k] || 0}" data-pref="${k}"/><span>${b}</span></label>`).join('');
  $('#ls-colors').innerHTML = `<button type="button" class="wz-auto ${S.colors.length ? '' : 'on'}" data-lc="">✦ Let AI pick</button>`
    + SWATCHES.map((c) => `<button type="button" class="sw big ${S.colors.includes(c) ? 'on' : ''}" style="--c:${c}" data-lc="${c}" aria-label="${c}"></button>`).join('')
    + `<label class="pick"><input type="color" id="ls-custom" value="#7a3b2e" /><span>Custom</span></label>`;
  $('#ls-idea').value = S.idea;
  setTab(S.tab);
}
function setTab(t) {
  S.tab = t;
  $$('[data-lstab]').forEach((b) => b.classList.toggle('on', b.dataset.lstab === t));
  $('#ls-describe').hidden = t !== 'describe'; $('#ls-draw').hidden = t !== 'draw';
  if (t === 'draw') { if (!pad) pad = new SketchPad($('#ls-pad'), onSketch); else pad.fit(); }
  updGo();
}
function updGo() {
  const draw = S.tab === 'draw', has = draw && pad?.strokes.length;
  $('#ls-go').textContent = draw ? (has ? '✦ Make logos from my drawing' : 'Draw something first') : '✦ Show me logos';
  $('#ls-go').disabled = draw && !has;
}
let sketchT;
function onSketch() {
  updGo(); clearTimeout(sketchT);
  sketchT = setTimeout(() => {
    const st = pad.strokes;
    if (!st.length) { S.sketches = null; $('#ls-refined').innerHTML = ''; return; }
    S.sketches = { clean: refineSketch(st, 'clean'), geo: refineSketch(st, 'geo'), bold: refineSketch(st, 'bold') };
    $('#ls-refined').innerHTML = '<small>Cleaned up</small>' + [['clean', 'Clean'], ['geo', 'Geometric'], ['bold', 'Bold']].map(([k, t]) => `<button type="button" data-smode="${k}" class="${S.sketchMode === k ? 'on' : ''}"><canvas width="120" height="120"></canvas><span>${t}</span></button>`).join('');
    $$('#ls-refined canvas').forEach((c) => { const k = c.parentElement.dataset.smode; paintInto(c, { layout: 'mark', name: '', font: 'Inter', mark: { source: 'sketch', sketch: S.sketches[k], container: 'none' }, treatment: 'none', colors: { primary: '#1c1a17' } }, { pad: 0.14, bg: '#fff' }); });
  }, 120);
}
// a mark on its own (used for the clean-up previews): draw only the symbol
const _render = renderLogo;

// ---------- results ----------
async function makeOptions() {
  S.busy = true; S.used = false;
  showResults();
  $('#ls-grid').innerHTML = Array.from({ length: 6 }, () => '<div class="ls-card skel"><i></i></div>').join('');
  $('#ls-res-note').textContent = 'Designing…'; $('#ls-tweak').innerHTML = '';
  S.seed = Math.floor(Math.random() * 1e9); // new ideas every time
  await loadGenFonts();
  const c = ctx();
  let opts = null, note = '';
  if (isAI()) {
    const allowed = glyphsFor(c.category, c.idea);
    const res = await askAI({ mode: 'logos', brief: S.brief, name: S.name, needName: !S.name.trim(), category: c.category, prefs: { type: S.type, shape: S.shape, sliders: S.prefs, colors: S.colors, idea: S.idea }, fonts: LOGO_FONTS, glyphs: allowed, hasSketch: !!c.sketch, images: c.sketch && pad ? [pad.png()] : [] });
    if (res?.logos?.length) {
      if (!S.name.trim() && res.name) { S.name = String(res.name).slice(0, 40); $('#ls-name').value = S.name; }
      opts = res.logos.map((l) => ({ ...l, mark: { ...(l.mark || {}), ...(l.mark?.source === 'sketch' ? { sketch: c.sketch } : {}) } }));
    } else if (res && !res.unavailable) note = 'AI was busy — these come from the built-in designer.';
  }
  if (!S.name.trim()) S.name = 'Your Brand';
  const local = designLogos({ ...c, name: S.name });
  // AI ideas + at least two one-of-a-kind generated marks from their own letters
  const gen = local.filter((o) => o.mark?.source === 'gen').slice(0, 2);
  opts = opts ? enforceLogos([...opts.slice(0, 6 - gen.length), ...gen, ...local].slice(0, 6), { ...c, name: S.name }) : local;
  S.options = opts; S.sel = 0; S.busy = false;
  await loadFonts(...new Set(opts.map((o) => o.font)));
  $('#ls-res-note').textContent = note;
  renderGrid(); renderTweak();
}
function showResults() { $('#ls-make').hidden = true; $('#ls-results').hidden = false; $('#ls-tabs').style.visibility = 'hidden'; $('.ls-wrap').scrollTop = 0; }
function renderGrid() {
  $('#ls-grid').innerHTML = S.options.map((o, i) => `<button type="button" class="ls-card ${i === S.sel ? 'on' : ''}" data-opt="${i}" aria-label="${LAYOUTS[o.layout]}"><canvas width="560" height="380"></canvas></button>`).join('');
  $$('#ls-grid canvas').forEach((c, i) => paintInto(c, S.options[i]));
}
function repaintSel() {
  const o = S.options[S.sel], c = $(`#ls-grid [data-opt="${S.sel}"] canvas`);
  if (c) paintInto(c, o);
  const sm = $('#lt-small'), mo = $('#lt-mono');
  if (sm) paintInto(sm, o, { pad: 0.08, bg: '#fff' });
  if (mo) paintInto(mo, o, { mono: true, bg: '#fff', pad: 0.08 });
}
function renderTweak() {
  const o = S.options[S.sel]; if (!o) return;
  const fixed = FONTS[o.font]?.w != null, c = ctx(), glyphs = glyphsFor(c.category, S.idea);
  const markOpts = [...(c.sketch || o.mark?.sketch ? ['__sketch'] : []), ...glyphs, 'none'];
  const curMark = o.mark?.source === 'sketch' ? '__sketch' : o.mark?.source === 'glyph' ? o.mark.glyph : 'none';
  const tab = S.ttab || 'type';
  const panes = {
    type: `
      <label class="lt"><span>Font</span><select data-t="font">${LOGO_FONTS.map((f) => `<option ${f === o.font ? 'selected' : ''} value="${f}">${f}</option>`).join('')}</select></label>
      <div class="lt"><span>Layout</span><div class="chips">${Object.entries(LAYOUTS).map(([k, v]) => `<button type="button" data-t="layout" data-v="${k}" class="${o.layout === k ? 'on' : ''}">${v}</button>`).join('')}</div></div>
      <div class="lt two"><div><span>Letters</span><div class="seg">${[['title', 'Aa'], ['upper', 'AA'], ['lower', 'aa']].map(([k, v]) => `<button type="button" data-t="case" data-v="${k}" class="${o.case === k ? 'on' : ''}">${v}</button>`).join('')}</div></div>
        <div><span>Weight</span><div class="seg">${['regular', 'bold'].map((k) => `<button type="button" data-t="weight" data-v="${k}" class="${o.weight === k ? 'on' : ''}" ${fixed && k === 'bold' ? 'disabled' : ''}>${k === 'bold' ? 'Bold' : 'Regular'}</button>`).join('')}</div></div></div>
      <label class="lt"><span>Spacing</span><input type="range" min="-4" max="30" step="1" value="${o.tracking}" data-t="tracking"/></label>
      <label class="lt"><span>Detail</span><select data-t="treatment">${Object.entries(TREATMENTS).map(([k, v]) => `<option value="${k}" ${o.treatment === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`,
    symbol: `
      <div class="lt"><span>Made from your letters</span><div class="chips">${Object.entries(GEN_KINDS).map(([k, v]) => `<button type="button" data-t="genkind" data-v="${k}" class="${o.mark?.source === 'gen' && o.mark.gen?.kind === k ? 'on' : ''}">${v}</button>`).join('')}</div>
        ${o.mark?.source === 'gen' ? `<div class="lt two"><label><span>Letter style</span><select data-t="genfont">${Object.entries(GEN_FONT_LABELS).map(([k, v]) => `<option value="${k}" ${o.mark.gen.font === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><div><span>&nbsp;</span><button type="button" class="ghost small" data-t="genshuffle">↻ Shuffle</button></div></div>` : ''}</div>
      <div class="lt"><span>Or a symbol</span><div class="chips icons">${markOpts.map((g) => `<button type="button" data-t="mark" data-v="${g}" class="${curMark === g ? 'on' : ''}" title="${g === '__sketch' ? 'My drawing' : g}">${g === '__sketch' ? '✍ Mine' : g === 'none' ? 'None' : glyphSvg(g)}</button>`).join('')}</div></div>
      <div class="lt"><span>Shape</span><div class="chips">${Object.entries(CONTAINERS).map(([k, v]) => `<button type="button" data-t="container" data-v="${k}" class="${(o.mark?.container || 'none') === k ? 'on' : ''}">${v}</button>`).join('')}</div></div>
      <label class="check"><input type="checkbox" data-t="style" ${o.mark?.style === 'line' ? 'checked' : ''}/><span>Outline instead of solid</span></label>`,
    colour: `
      <div class="lt two"><label><span>Main</span><input type="color" data-t="primary" value="${o.colors.primary}"/></label><label><span>Second</span><input type="color" data-t="secondary" value="${o.colors.secondary}"/></label></div>
      <div class="lt"><span>Quick picks</span><div class="wz-colors">${SWATCHES.filter((x) => x !== '#f6f1e7').map((x) => `<button type="button" class="sw" style="--c:${x}" data-t="pick" data-v="${x}" aria-label="${x}"></button>`).join('')}</div></div>`,
  };
  $('#ls-tweak').innerHTML = `
    <div class="lt-prev"><figure><canvas id="lt-small" width="300" height="80"></canvas><figcaption>Small</figcaption></figure><figure><canvas id="lt-mono" width="300" height="80"></canvas><figcaption>One colour</figcaption></figure></div>
    ${o.rationale ? `<p class="ls-why">${o.rationale}</p>` : ''}
    <div class="seg lt-tabs">${[['type', 'Type'], ['symbol', 'Symbol'], ['colour', 'Colour']].map(([k, v]) => `<button type="button" data-ttab="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <div class="lt-pane">${panes[tab]}</div>
    <div class="lt-dl">Download <button type="button" data-lsdl="png">PNG</button><button type="button" data-lsdl="svg">SVG</button><button type="button" data-lsdl="mono">Black</button></div>`;
  repaintSel();
}
function tweak(t, v) {
  const o = { ...S.options[S.sel], mark: { ...(S.options[S.sel].mark || {}) }, colors: { ...S.options[S.sel].colors } };
  if (t === 'font') { o.font = v; if (FONTS[v]?.w != null) o.weight = 'regular'; loadFonts(v).then(() => { repaintSel(); }); }
  else if (t === 'layout') o.layout = v;
  else if (t === 'case') o.case = v;
  else if (t === 'weight') o.weight = v;
  else if (t === 'tracking') o.tracking = +v;
  else if (t === 'treatment') { o.treatment = v; if (v === 'swap' && o.mark.source === 'none') { const sk = ctx().sketch; o.mark = sk ? { ...o.mark, source: 'sketch', sketch: sk } : { ...o.mark, source: 'glyph', glyph: glyphsFor(ctx().category, S.idea)[0] }; } }
  else if (t === 'mark') { if (v === '__sketch') o.mark = { ...o.mark, source: 'sketch', sketch: ctx().sketch || o.mark.sketch }; else if (v === 'none') o.mark = { ...o.mark, source: 'none' }; else o.mark = { ...o.mark, source: 'glyph', glyph: v }; }
  else if (t === 'container') o.mark.container = v;
  else if (t === 'style') o.mark.style = o.mark.style === 'line' ? 'fill' : 'line';
  else if (t === 'pick') o.colors.primary = v;
  else if (t === 'genkind') { const L = initials(o.name || S.name); const prev = o.mark.source === 'gen' ? o.mark.gen : genMarks(o.name || S.name, Math.floor(Math.random() * 1e9), 1)[0]; o.mark = { ...o.mark, source: 'gen', container: 'none', gen: { ...prev, kind: v, letters: v === 'interlock' ? (L.length > 1 ? L : L + L) : L[0] } }; if (o.layout === 'wordmark' || o.layout === 'stacked' || o.layout === 'lettermark') o.layout = 'mark-top'; }
  else if (t === 'genshuffle' && o.mark.gen) o.mark = { ...o.mark, gen: { ...o.mark.gen, seed: Math.floor(Math.random() * 1e9) } };
  else if (t === 'genfont' && o.mark.gen) o.mark = { ...o.mark, gen: { ...o.mark.gen, font: v } };
  else if (t === 'primary' || t === 'secondary') o.colors[t] = v;
  if (o.layout === 'emblem') o.mark.container = 'circle';
  if (['mark-left', 'mark-top'].includes(o.layout) && o.mark.source === 'none') o.mark = { ...o.mark, source: 'glyph', glyph: glyphsFor(ctx().category, S.idea)[0] };
  if (['emblem', 'stacked'].includes(o.layout) && !o.sub) o.sub = '';
  S.options[S.sel] = o;
  repaintSel();
  if (!['tracking', 'primary', 'secondary'].includes(t)) renderTweak();
}
async function download(kind) {
  const o = S.options[S.sel]; if (!o) return;
  const slug = (o.name || 'logo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'logo';
  const save = (blob, n) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = n; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  if (kind === 'svg') { save(new Blob([await logoSVG(o, o.colors)], { type: 'image/svg+xml' }), `${slug}-logo.svg`); return; }
  const src = renderLogo(o, o.colors, { mono: kind === 'mono' }).canvas, c = document.createElement('canvas');
  const k = 1024 / Math.max(src.width, src.height); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  c.toBlob((b) => save(b, `${slug}-logo${kind === 'mono' ? '-black' : ''}.png`));
}

// ---------- open / wire ----------
export function openLogoStudio({ name = '', brief = '', colors = [], vibes = [], spec = null, onUse, onSkip, ai } = {}) {
  if (ai) isAI = ai;
  Object.assign(S, { name, brief, colors: colors.slice(0, 2), onUse, onSkip, used: false });
  if (vibes.length) S.prefs = vibesToPrefs(vibes);
  $('#ls-name').placeholder = name ? 'Brand name' : 'Brand name — or leave empty for ideas';
  $('#ls-skip').textContent = onSkip ? 'Skip, use my name' : 'Cancel';
  $('#ls-tabs').style.visibility = 'visible'; S.ttab = 'type';
  $('#lstudio').showModal();
  document.querySelectorAll('#lstudio .jsteps li').forEach((li) => { const j = +li.dataset.j; li.classList.toggle('on', j === 4); li.classList.toggle('done', j < 4); li.classList.toggle('skip', false); });
  $('.ls-journey').hidden = !onSkip;
  if (spec) { // editing an existing logo
    S.options = [spec, ...variations(spec)]; S.sel = 0; showResults(); $('#ls-res-note').textContent = '';
    loadFonts(...new Set(S.options.map((o) => o.font))).then(() => { renderGrid(); renderTweak(); });
  } else { $('#ls-make').hidden = false; $('#ls-results').hidden = true; renderMake(); }
}
export function initLogoStudio() {
  const dlg = $('#lstudio');
  dlg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.lstab) setTab(d.lstab);
    if (d.ltype) { S.type = d.ltype; $$('[data-ltype]').forEach((x) => x.classList.toggle('on', x === b)); }
    if (d.lshape !== undefined) { S.shape = d.lshape; $$('[data-lshape]').forEach((x) => x.classList.toggle('on', x === b)); }
    if (d.lc !== undefined) { if (!d.lc) S.colors = []; else S.colors = S.colors.includes(d.lc) ? S.colors.filter((c) => c !== d.lc) : [...S.colors, d.lc].slice(-2); renderMake(); }
    if (d.pen) { pad.pen = +d.pen; pad.tool = 'pen'; $$('.ls-tools [data-pen], .ls-tools [data-tool]').forEach((x) => x.classList.toggle('on', x === b)); }
    if (d.tool) { pad.tool = d.tool; $$('.ls-tools [data-pen], .ls-tools [data-tool]').forEach((x) => x.classList.toggle('on', x === b)); }
    if (d.sact === 'mirror') { pad.mirror = !pad.mirror; b.classList.toggle('on', pad.mirror); pad.draw(); }
    if (d.sact === 'undo') pad.undo();
    if (d.sact === 'clear') pad.clear();
    if (d.smode) { S.sketchMode = d.smode; $$('[data-smode]').forEach((x) => x.classList.toggle('on', x === b)); }
    if (d.opt != null) { S.sel = +d.opt; $$('#ls-grid .ls-card').forEach((x) => x.classList.toggle('on', x === b)); renderTweak(); if (matchMedia('(max-width: 860px)').matches) $('#ls-tweak').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (d.ttab) { S.ttab = d.ttab; renderTweak(); }
    if (d.t && b.closest('#ls-tweak')) tweak(d.t, d.v);
    if (d.lsdl) download(d.lsdl);
  });
  dlg.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.pref) S.prefs[t.dataset.pref] = +t.value;
    if (t.id === 'ls-name') S.name = t.value;
    if (t.id === 'ls-idea') S.idea = t.value;
    if (t.dataset.t && t.closest('#ls-tweak') && t.tagName === 'INPUT' && t.type !== 'checkbox') tweak(t.dataset.t, t.value);
  });
  dlg.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'ls-custom') { S.colors = [...S.colors, t.value].slice(-2); renderMake(); }
    if (t.dataset.t && t.tagName === 'SELECT') tweak(t.dataset.t, t.value);
    if (t.dataset.t === 'style') tweak('style');
  });
  $('#ls-go').onclick = () => { S.name = $('#ls-name').value.trim(); makeOptions(); };
  $('#ls-regen').onclick = () => makeOptions();
  $('#ls-back').onclick = () => { $('#ls-results').hidden = true; $('#ls-make').hidden = false; $('#ls-tabs').style.visibility = 'visible'; renderMake(); };
  $('#ls-more').onclick = async () => {
    const base = S.options[S.sel]; if (!base) return;
    const v = variations(base); await loadFonts(...v.map((x) => x.font));
    S.options = [base, ...v, ...S.options.filter((o, i) => i !== S.sel).slice(0, 1)]; S.sel = 0;
    $('#ls-res-note').textContent = ''; renderGrid(); renderTweak();
  };
  $('#ls-use').onclick = () => { const o = S.options[S.sel]; if (!o) return; S.used = true; dlg.close(); S.onUse?.({ ...o, name: o.name || S.name }); };
  const skip = () => { if (dlg.open) dlg.close(); };
  $('#ls-skip').onclick = skip; $('#ls-close').onclick = skip;
  dlg.addEventListener('close', () => { if (!S.used) { const f = S.onSkip; S.onSkip = null; f?.(S.name.trim()); } S.onUse = null; });
}
void _render; void mix;
