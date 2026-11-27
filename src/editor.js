// Artwork editor: add your own text, paragraphs, shapes, icons and images on top of the
// AI design — on the front or the back — then drag, resize and rotate them.
import { paintFace, FONTS, SHAPE_PATHS, OPEN_SHAPES, ink, paper, autoInk, withRecording } from './art.js';
import { GLYPHS } from './logo.js';

const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const SHAPES = { rect: 'Rectangle', round: 'Rounded', pill: 'Pill', circle: 'Circle', scallop: 'Scallop', flower: 'Flower', cloud: 'Cloud', blob: 'Blob', bubble: 'Speech bubble', sparkle: 'Sparkle', star: 'Star', heart: 'Heart', badge: 'Badge', crown: 'Crown', arch: 'Arch', ticket: 'Ticket', ribbon: 'Ribbon', arrow: 'Arrow', wave: 'Wave', squiggle: 'Squiggle', line: 'Line' };
// a few cute, hand-drawn-feel icons (24×24, drawn as rounded strokes)
const daisy = (() => { let d = 'M12 9.6a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8Z'; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a), p = (r, o) => `${(12 + c * r - s * o).toFixed(2)} ${(12 + s * r + c * o).toFixed(2)}`; d += `M${p(3.2, 0)}Q${p(6.5, 2.6)} ${p(9.2, 0)}Q${p(6.5, -2.6)} ${p(3.2, 0)}Z`; } return d; })();
const CUTE = {
  smiley: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M9 10v.6 M15 10v.6 M8.3 14.2c1.1 1.6 2.3 2.3 3.7 2.3s2.6-.7 3.7-2.3',
  strawberry: 'M12 7.5c-4 0-7 1.3-7 4.3 0 4 4 8.2 7 9.2 3-1 7-5.2 7-9.2 0-3-3-4.3-7-4.3Z M12 7.5 9 4.5 M12 7.5l3-3 M12 7.5V3.5 M9.2 11v.3 M12 13.2v.3 M14.8 11v.3 M10.5 16.2v.3 M13.5 16.2v.3',
  bow: 'M12 12C10 9 6 7 4.2 8.6S4 15 6 15s4-1.5 6-3Z M12 12c2-3 6-5 7.8-3.4S20 15 18 15s-4-1.5-6-3Z M12 12l-2.6 7 M12 12l2.6 7',
  rainbow: 'M3 18a9 9 0 0 1 18 0 M6.2 18a5.8 5.8 0 0 1 11.6 0 M9.4 18a2.6 2.6 0 0 1 5.2 0',
  butterfly: 'M12 8v11 M12 10C9.5 5 4 4.2 4 7.8s4.2 4.6 8 3.2 M12 10c2.5-5 8-5.8 8-2.2s-4.2 4.6-8 3.2 M12 13.5c-3 0-6 1-6 3.6s3.4 2.6 6-1.4 M12 13.5c3 0 6 1 6 3.6s-3.4 2.6-6-1.4 M12 8 10.2 5 M12 8l1.8-3',
  mushroom: 'M3.5 12.5a8.5 7.5 0 0 1 17 0Z M9 12.5v5.5a3 2 0 0 0 6 0v-5.5 M8 9v.3 M12 7v.3 M16 9.5v.3',
  donut: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 9.2a2.8 2.8 0 1 0 0 5.6a2.8 2.8 0 1 0 0-5.6Z M6.5 8.5l1 .6 M16.8 7.2l-.8 1 M17.8 14.6l-1-.4 M7.4 16l.9-.9 M11 5.6h1.6',
  icecream: 'M7.2 10.5 12 21l4.8-10.5 M6.8 10.5a5.2 5.2 0 0 1 10.4 0Z M9.4 13.6l4.6 1.8 M10.6 16.6l2.4 1',
  cake: 'M4 20.5h16V13L9 9 4 11Z M4 15.2h16 M9 9V5.5 M9 5.5c-.8-.8 0-2 0-2s.8 1.2 0 2',
  bolt: 'M13.5 2.5 5.5 14h6l-1 7.5 8-11.5h-6l1-7.5Z',
  music: 'M9 17.5V5.5l10-2v12 M9 17.5a2.5 2 0 1 1-5 0a2.5 2 0 1 1 5 0Z M19 15.5a2.5 2 0 1 1-5 0a2.5 2 0 1 1 5 0Z',
  planet: 'M12 6.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11Z M6.8 14.6C3.6 16.6 2.6 18 3.4 18.7c1.3 1.2 7-1 11.4-4.2s7.4-6.8 6.1-8c-.7-.7-2.4-.2-4.6 1',
  daisy,
  tulip: 'M12 21.5v-9 M12 17.2c-1.8-1.4-3.8-1.6-5-.8 M12 19c1.8-1.4 3.8-1.6 5-.8 M7 3.5l2.5 3L12 2.8l2.5 3.7L17 3.5V8a5 5 0 0 1-10 0Z',
  cat: 'M4 20c0-5 0-8 1-11L4 3.5l5 3c2-.6 4-.6 6 0l5-3-1 5.5c1 3 1 6 1 11Z M9 12.5v.6 M15 12.5v.6 M11 15.2l1 .9 1-.9',
  crown: 'M3.5 19h17 M4.5 16 3.5 7.5l5 4 3.5-6.5 3.5 6.5 5-4-1 8.5Z',
  cloud: 'M7 18.5a4.2 4.2 0 0 1-.6-8.4A5.6 5.6 0 0 1 17.2 9a4.7 4.7 0 0 1 .3 9.5Z',
  sparkles: 'M10 3c.5 4.6 1.9 6 6.5 6.5-4.6.5-6 1.9-6.5 6.5-.5-4.6-1.9-6-6.5-6.5C8.1 9 9.5 7.6 10 3Z M18 14c.3 2.2.8 2.7 3 3-2.2.3-2.7.8-3 3-.3-2.2-.8-2.7-3-3 2.2-.3 2.7-.8 3-3Z',
  avocado: 'M12 2.5c-3 0-4.5 4.5-6 8.5-1.6 4.4.4 10.5 6 10.5s7.6-6.1 6-10.5C16.5 7 15 2.5 12 2.5Z M12 11.2a3 3.4 0 1 0 0 6.8a3 3.4 0 1 0 0-6.8Z',
  coffee: 'M5 9.5h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z M16 11h1.5a2.3 2.3 0 0 1 0 4.6H16 M8.5 3.5c-.8 1 .8 2 0 3.2 M12 3.5c-.8 1 .8 2 0 3.2',
};
// ready-made stickers: a word on a little shape
const STICKERS = [
  { t: 'Handmade', bg: 'scallop', sq: true }, { t: '100% Natural', bg: 'badge', sq: true }, { t: 'Made in India', bg: 'ribbon' }, { t: 'Vegan', bg: 'flower', sq: true },
  { t: 'Limited edition', bg: 'ticket' }, { t: 'New!', bg: 'sparkle', sq: true }, { t: 'Hello!', bg: 'bubble' }, { t: 'Small batch', bg: 'pill' },
  { t: 'With love', bg: 'cloud' }, { t: 'No sugar', bg: 'circle', sq: true }, { t: 'Gift', bg: 'heart', sq: true }, { t: 'Bestseller', bg: 'crown', sq: true },
];
const ICONS = [...Object.keys(CUTE), 'leaf', 'sprout', 'sun', 'drop', 'flame', 'heart', 'star', 'wheat', 'cup', 'bean', 'lotus', 'moon', 'spark', 'gem', 'paw', 'wave', 'mountain', 'cherry', 'citrus', 'chilli', 'bee', 'whisk', 'cupcake', 'dot'];

let E = null; // { brand, layers, face, aspect, wrap, sel, onDone, onCancel }

export function openEditor({ brand, aspect, wrap, face = 'front', onDone }) {
  E = { brand, layers: (brand.layers || []).map((l) => ({ ...l })), els: JSON.parse(JSON.stringify(brand.els || {})), found: [], selEl: null, past: [], future: [], face, aspect, wrap, sel: null, onDone };
  updEdUndo();
  $('#editor').showModal();
  setFace(face);
}

function b2() { return { ...E.brand, layers: E.layers, els: E.els, _wrapK: E.wrap ? 0.66 : 1, artwork: null }; }
// ---------- undo / redo inside the editor ----------
let lastSave = 0;
function save(merge = false) {
  const now = Date.now(); if (merge && now - lastSave < 800) { lastSave = now; return; } lastSave = now;
  E.past.push({ layers: E.layers.map((l) => ({ ...l })), els: JSON.parse(JSON.stringify(E.els)) }); if (E.past.length > 80) E.past.shift();
  E.future = []; updEdUndo();
}
function step(dir) {
  const from = dir < 0 ? E.past : E.future, to = dir < 0 ? E.future : E.past; if (!from.length) return;
  to.push({ layers: E.layers.map((l) => ({ ...l })), els: JSON.parse(JSON.stringify(E.els)) });
  const s = from.pop(); E.layers = s.layers; E.els = s.els; lastSave = 0;
  if (!E.layers.some((l) => l.id === E.sel)) E.sel = null;
  render(); props(); layerList(); updEdUndo();
}
function updEdUndo() { $('#ed-undo').disabled = !E?.past.length; $('#ed-redo').disabled = !E?.future.length; }
// ---------- picking pieces of the design itself ----------
const hctx = document.createElement('canvas').getContext('2d');
const scaleOf = (m) => Math.hypot(m.a, m.b) || 1;
function hitEl(p) {
  const c = $('#ed-canvas'), X = p.x * c.width, Y = p.y * c.height, tol = c.width / 90;
  const vis = E.found.filter((f) => !f.hidden && !f.noHit && f.path).reverse();
  const test = (f) => { hctx.setTransform(f.m); if (f.op === 'stroke') { hctx.lineWidth = Math.max(f.lw, tol / scaleOf(f.m)); return hctx.isPointInStroke(f.path, X, Y); } return hctx.isPointInPath(f.path, X, Y); };
  const solid = (f) => f.kind === 'text' || f.kind === 'logo';
  return vis.find((f) => solid(f) && test(f)) || vis.find((f) => !solid(f) && f.op === 'stroke' && test(f)) || vis.find((f) => !solid(f) && f.op === 'fill' && test(f));
}
function drawHL() {
  const hl = $('#ed-hl'), o = $('#ed-over').getBoundingClientRect(), dpr = devicePixelRatio || 1;
  hl.width = Math.max(1, Math.round(o.width * dpr)); hl.height = Math.max(1, Math.round(o.height * dpr));
  const g = hl.getContext('2d'); g.clearRect(0, 0, hl.width, hl.height);
  if (!E?.selEl) return;
  const k = hl.width / $('#ed-canvas').width;
  for (const f of E.found) if (f.id === E.selEl && f.path) {
    const m = new DOMMatrix().scaleSelf(k, k).multiplySelf(f.m), sc = scaleOf(m);
    g.setTransform(m); g.strokeStyle = '#2f6bff';
    if (f.op === 'stroke' && f.kind !== 'text' && f.kind !== 'logo') { g.globalAlpha = 0.5; g.setLineDash([]); g.lineWidth = f.lw + (5 * dpr) / sc; }
    else { g.globalAlpha = 1; g.setLineDash([(6 * dpr) / sc, (4 * dpr) / sc]); g.lineWidth = (2 * dpr) / sc; }
    g.stroke(f.path);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}
const elOf = (id) => E.found.find((f) => f.id === id && f.path) || E.found.find((f) => f.id === id);
function setEl(id, patch) { const e = { ...(E.els[id] || {}), ...patch }; for (const k of Object.keys(e)) if (e[k] == null) delete e[k]; if (Object.keys(e).length) E.els[id] = e; else delete E.els[id]; }
function designItems() {
  const seen = new Map(), count = {};
  for (const f of E.found) { if (seen.has(f.id)) continue; seen.set(f.id, f); }
  return [...seen.values()].map((f) => {
    let name = f.label;
    if (f.kind === 'text') name = `“${String(E.els[f.id]?.text ?? f.label).slice(0, 24)}”`;
    else if (f.kind !== 'logo' && f.kind !== 'pattern') { count[f.label] = (count[f.label] || 0) + 1; name = `${f.label} ${count[f.label]}`; }
    return { f, name };
  });
}
let raf = 0;
function render() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const c = $('#ed-canvas'), box = $('#ed-stage').getBoundingClientRect();
    const maxW = box.width - 40, maxH = box.height - 40;
    let cw = maxW, ch = cw / E.aspect; if (ch > maxH) { ch = maxH; cw = ch * E.aspect; }
    c.style.width = `${cw}px`; c.style.height = `${ch}px`;
    const W = Math.round(Math.min(1400, cw * 2)), [art, found] = withRecording(() => paintFace(b2(), E.face, E.aspect, W));
    c.width = art.width; c.height = art.height; c.getContext('2d').drawImage(art, 0, 0);
    $('#ed-safe').hidden = !E.wrap;
    const r = c.getBoundingClientRect(), sr = $('#ed-stage').getBoundingClientRect();
    Object.assign($('#ed-over').style, { left: `${r.left - sr.left}px`, top: `${r.top - sr.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    E.found = found;
    drawSel();
  });
}
function drawSel() {
  drawHL();
  const l = E.layers.find((x) => x.id === E.sel), s = $('#ed-sel');
  if (!l || l.face !== E.face) { s.hidden = true; return; }
  const o = $('#ed-over').getBoundingClientRect(), w = l.w * o.width, h = (l.h ?? 0.1) * o.height;
  s.hidden = false;
  Object.assign(s.style, { left: `${l.x * o.width - w / 2}px`, top: `${l.y * o.height - h / 2}px`, width: `${w}px`, height: `${h}px`, transform: `rotate(${l.rot || 0}deg)` });
}
function setFace(f) {
  E.face = f; E.sel = null; E.selEl = null;
  $$('[data-edface]').forEach((b) => b.classList.toggle('on', b.dataset.edface === f));
  render(); props(); layerList();
}
function add(l) {
  save(); E.selEl = null;
  l = { id: uid(), face: E.face, x: 0.5, y: 0.5, rot: 0, opacity: 1, ...l };
  E.layers.push(l); E.sel = l.id; render(); props(); layerList();
}
// a square of side f × the short edge, in this face's 0..1 units
// biggest type that still sits comfortably inside the sticker (size is a fraction of the face height)
const fitSize = (st, w, h) => { const longest = Math.max(...st.t.split(' ').map((x) => x.length)), wpx = w * E.aspect; return st.sq ? Math.min(h * 0.2, (wpx * 0.66) / (longest * 0.66)) : Math.min(h * 0.42, (wpx * 0.8) / (st.t.length * 0.6)); };
const sq = (f) => ({ w: f * Math.min(1, 1 / E.aspect), h: f * Math.min(1, E.aspect) });
const brandCols = () => [...new Set([ink(E.brand), E.brand.accent, E.brand.pack, paper(E.brand), '#ffffff', '#1c1a17'])];

function layerList() {
  if (!E.found.length && E.layers.length === 0) setTimeout(() => E && E.found.length && layerList(), 120);
  const ls = E.layers.filter((l) => l.face === E.face);
  const added = ls.length ? ls.slice().reverse().map((l) => `<button type="button" data-edlayer="${l.id}" class="${l.id === E.sel ? 'on' : ''}"><span>${l.type === 'text' ? '𝐓' : l.type === 'image' ? '🖼' : l.type === 'icon' ? '✦' : '◼'}</span>${esc(l.type === 'text' ? (l.text || '').slice(0, 22) || 'Text' : l.type === 'shape' ? SHAPES[l.shape] : l.type === 'icon' ? l.name : 'Image')}</button>`).join('') : '';
  const items = designItems();
  const design = items.map(({ f, name }) => `<div class="ed-el ${f.hidden ? 'off' : ''} ${f.id === E.selEl ? 'on' : ''}"><button type="button" data-elpick="${f.id}" ${f.hidden ? 'disabled' : ''}><span>${f.kind === 'text' ? '𝐓' : f.kind === 'logo' ? '◉' : f.kind === 'pattern' ? '▦' : f.op === 'stroke' ? '▭' : '◼'}</span>${esc(name)}</button><button type="button" class="eye" data-eltoggle="${f.id}" title="${f.hidden ? 'Bring it back' : 'Delete'}">${f.hidden ? 'Restore' : '✕'}</button></div>`).join('');
  $('#ed-layers').innerHTML = (added ? `<small class="ed-sub">Added by you</small>${added}` : '') +
    (design ? `<small class="ed-sub">From the design <button type="button" class="link small" data-elact="resetall">Reset all</button></small>${design}` : '') ||
    '<p class="ed-empty">Nothing on this side yet. Use the tools on the left.</p>';
}
function elProps(f, P) {
  const e = E.els[f.id] || {};
  const sw = `<div class="ed-sw">${brandCols().map((c) => `<button type="button" style="--c:${c}" data-elset="color" data-v="${c}" class="${e.color === c ? 'on' : ''}"></button>`).join('')}<input type="color" data-elin="color" value="${/^#[0-9a-f]{6}$/i.test(e.color || '') ? e.color : '#1c1a17'}"/></div>`;
  let h = `<p class="ed-kind">${f.kind === 'text' ? 'Text from the design' : f.kind === 'logo' ? 'Your logo' : esc(f.label)}</p>`;
  if (f.kind === 'text') h += `<label class="ed-f"><span>Text</span><textarea data-elin="text" rows="2">${esc(e.text ?? f.text ?? f.label)}</textarea></label>`;
  if (f.kind === 'text' || f.kind === 'logo') h += `<label class="ed-f"><span>Size</span><input type="range" min="0.3" max="2.5" step="0.02" value="${e.scale ?? 1}" data-elin="scale"/></label>`;
  if (f.kind !== 'logo') h += `<div class="ed-f"><span>Colour</span>${sw}${e.color ? '<button type="button" class="link small" data-elset="color" data-v="">Original colour</button>' : ''}</div>`;
  if (f.op === 'stroke' && f.kind !== 'text') h += `<label class="ed-f"><span>Thickness</span><input type="range" min="0.2" max="4" step="0.1" value="${e.width ?? 1}" data-elin="width"/></label>`;
  h += `<p class="ed-tip">Drag it on the pack to move it.</p><div class="ed-acts"><button type="button" class="ghost small danger" data-elact="del">Delete</button>${E.els[f.id] ? '<button type="button" class="ghost small" data-elact="reset">Reset</button>' : ''}</div>`;
  P.innerHTML = h;
}
function props() {
  const P = $('#ed-props');
  if (E.selEl) { const f = elOf(E.selEl); if (f && !f.hidden) return elProps(f, P); E.selEl = null; }
  const l = E.layers.find((x) => x.id === E.sel);
  if (!l) { P.innerHTML = '<p class="ed-empty">Select something on the pack to change it — or add text, shapes, icons and images from the left.</p>'; return; }
  const sw = (key) => `<div class="ed-sw">${brandCols().map((c) => `<button type="button" style="--c:${c}" data-edset="${key}" data-v="${c}" class="${l[key] === c ? 'on' : ''}"></button>`).join('')}<input type="color" data-edin="${key}" value="${/^#[0-9a-f]{6}$/i.test(l[key] || '') ? l[key] : '#1c1a17'}"/></div>`;
  let h = '';
  if (l.type === 'text') h += `
    <label class="ed-f"><span>Text</span><textarea data-edin="text" rows="${l.para ? 5 : 2}">${esc(l.text)}</textarea></label>
    <label class="ed-f"><span>Font</span><select data-edin="font">${Object.keys(FONTS).map((f) => `<option ${f === l.font ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
    <div class="ed-row"><div class="seg">${[['left', '⟸'], ['center', '≡'], ['right', '⟹']].map(([k, v]) => `<button type="button" data-edset="align" data-v="${k}" class="${(l.align || 'center') === k ? 'on' : ''}">${v}</button>`).join('')}</div>
      <div class="seg"><button type="button" data-edtog="weight" class="${l.weight >= 700 ? 'on' : ''}"><b>B</b></button><button type="button" data-edtog="upper" class="${l.upper ? 'on' : ''}">AA</button></div></div>
    <label class="ed-f"><span>Size</span><input type="range" min="0.015" max="0.2" step="0.002" value="${l.size}" data-edin="size"/></label>
    <label class="ed-f"><span>Letter spacing</span><input type="range" min="-0.05" max="0.4" step="0.01" value="${l.spacing || 0}" data-edin="spacing"/></label>
    <div class="ed-f"><span>Colour</span>${sw('color')}</div>
    <div class="ed-f"><span>Sticker shape behind</span><div class="chips">${['none', 'pill', 'circle', 'scallop', 'flower', 'cloud', 'badge', 'sparkle', 'bubble', 'ribbon', 'ticket', 'heart', 'crown'].map((k) => `<button type="button" data-edset="bg" data-v="${k}" class="${(l.bg || 'none') === k ? 'on' : ''}">${k === 'none' ? 'None' : SHAPES[k]}</button>`).join('')}</div></div>
    ${l.bg && l.bg !== 'none' ? `<div class="ed-f"><span>Sticker colour</span>${sw('bgColor')}</div>` : ''}`;
  if (l.type === 'shape') h += `
    <div class="ed-f"><span>Shape</span><div class="chips">${Object.entries(SHAPES).map(([k, v]) => `<button type="button" data-edset="shape" data-v="${k}" class="${l.shape === k ? 'on' : ''}">${v}</button>`).join('')}</div></div>
    <div class="ed-f"><span>Fill</span>${sw('fill')}<button type="button" class="link small" data-edset="fill" data-v="none">No fill</button></div>
    <label class="ed-f"><span>Outline</span><input type="range" min="0" max="3" step="0.1" value="${l.sw || 0}" data-edin="sw"/></label>
    ${l.sw ? `<div class="ed-f"><span>Outline colour</span>${sw('stroke')}</div>` : ''}`;
  if (l.type === 'icon') h += `<div class="ed-f"><span>Colour</span>${sw('color')}</div><div class="ed-f"><span>Fill</span>${sw('iconFill')}<button type="button" class="link small" data-edset="iconFill" data-v="">No fill</button></div><label class="ed-f"><span>Line weight</span><input type="range" min="0.8" max="3.5" step="0.1" value="${l.sw ?? 1.8}" data-edin="sw"/></label>`;
  if (l.type === 'image') h += `<label class="check"><input type="checkbox" data-edtogc="round" ${l.round ? 'checked' : ''}/><span>Rounded corners</span></label>`;
  h += `
    <label class="ed-f"><span>Rotate</span><input type="range" min="-180" max="180" step="1" value="${l.rot || 0}" data-edin="rot"/></label>
    <label class="ed-f"><span>Opacity</span><input type="range" min="0.1" max="1" step="0.05" value="${l.opacity ?? 1}" data-edin="opacity"/></label>
    <div class="ed-acts"><button type="button" class="ghost small" data-edact="up">↑ Forward</button><button type="button" class="ghost small" data-edact="down">↓ Back</button><button type="button" class="ghost small" data-edact="dup">Duplicate</button><button type="button" class="ghost small danger" data-edact="del">Delete</button></div>`;
  P.innerHTML = h;
}
const num = (k) => ['size', 'spacing', 'sw', 'rot', 'opacity'].includes(k);

export function initEditor() {
  const dlg = $('#editor');
  $('#ed-icons').innerHTML = ICONS.map((k) => `<button type="button" data-edicon="${k}" title="${k}"><svg viewBox="0 0 24 24"><path d="${CUTE[k] || GLYPHS[k]}"/></svg></button>`).join('');
  $('#ed-stickers').innerHTML = STICKERS.map((st, i) => `<button type="button" data-edsticker="${i}" title="${st.t}"><svg viewBox="-12 -12 24 24"><path d="${st.bg === 'circle' ? 'M-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0' : SHAPE_PATHS[st.bg](st.sq ? 20 : 22, st.sq ? 20 : 12)}"/></svg><span>${st.t}</span></button>`).join('');
  $('#ed-shapes').innerHTML = Object.entries(SHAPES).map(([k, v]) => `<button type="button" data-edshape="${k}" title="${v}"><svg viewBox="-12 -12 24 24"><path d="${k === 'rect' ? 'M-9 -7h18v14h-18z' : k === 'round' ? 'M-6 -7h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-12a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z' : k === 'circle' ? 'M-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0' : k === 'line' ? 'M-9 0H9' : SHAPE_PATHS[k](18, 16)}"${OPEN_SHAPES.has(k) || k === 'line' ? ' class="open"' : ''}/></svg></button>`).join('');
  dlg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.edface) setFace(d.edface);
    if (d.edadd === 'heading') add({ type: 'text', text: E.face === 'front' ? 'New!' : E.brand.name, font: E.brand.fonts?.display, size: 0.07, weight: 700, w: 0.7, h: 0.1, color: ink(E.brand), align: 'center' });
    if (d.edadd === 'para') add({ type: 'text', para: true, text: 'Ingredients: …\nNet wt. 250 g · Store in a cool, dry place.\nMade with love in India.', font: E.brand.fonts?.body || 'Inter', size: 0.03, weight: 400, w: 0.72, h: 0.22, y: 0.72, color: ink(E.brand), align: 'left', lead: 1.35 });
    if (d.edadd === 'badge') add({ type: 'text', text: '100% NATURAL', font: E.brand.fonts?.body || 'Inter', size: 0.032, weight: 700, upper: true, spacing: 0.12, w: 0.5, h: 0.06, y: 0.2, color: E.brand.accent, align: 'center' });
    if (d.edshape) add({ type: 'shape', shape: d.edshape, fill: E.brand.accent, ...(d.edshape === 'line' ? { w: E.wrap ? 0.3 : 0.5, h: 0.006 } : ['wave', 'squiggle', 'pill', 'ticket', 'ribbon', 'arrow'].includes(d.edshape) ? { w: sq(0.5).w, h: sq(0.14).h } : sq(0.32)) });
    if (d.edicon) add({ type: 'icon', name: d.edicon, d: CUTE[d.edicon] || GLYPHS[d.edicon], color: ink(E.brand), ...sq(0.22), sw: 1.8 });
    if (d.edsticker) {
      const st = STICKERS[+d.edsticker], bgc = E.brand.accent, { w, h } = st.sq ? sq(0.27) : { w: sq(0.5).w, h: sq(0.13).h };
      add({ type: 'text', text: st.t, bg: st.bg, bgColor: bgc, color: autoInk(bgc), font: E.brand.fonts?.display || 'Inter', size: fitSize(st, w, h), weight: 700, upper: st.sq, spacing: st.sq ? 0.06 : 0.02, w, h, y: 0.24, x: E.wrap ? 0.64 : 0.74, rot: st.sq ? -10 : 0, align: 'center' });
    }
    if (d.edlayer) { E.sel = d.edlayer; E.selEl = null; drawSel(); props(); layerList(); }
    if (d.elpick) { E.selEl = d.elpick; E.sel = null; drawSel(); props(); layerList(); }
    if (d.eltoggle) { save(); const hid = E.els[d.eltoggle]?.hide; setEl(d.eltoggle, { hide: hid ? null : true }); if (E.selEl === d.eltoggle) E.selEl = null; render(); props(); setTimeout(layerList, 60); }
    if (d.elset && E.selEl) { save(); setEl(E.selEl, { [d.elset]: d.v || null }); render(); props(); }
    if (d.elact) {
      save();
      if (d.elact === 'resetall') { for (const k of Object.keys(E.els)) if (k.startsWith(E.face + ':')) delete E.els[k]; E.selEl = null; }
      else if (E.selEl && d.elact === 'del') { setEl(E.selEl, { hide: true }); E.selEl = null; }
      else if (E.selEl && d.elact === 'reset') delete E.els[E.selEl];
      render(); props(); setTimeout(layerList, 60);
    }
    if (d.edset) { const l = E.layers.find((x) => x.id === E.sel); if (l) { save(); l[d.edset] = d.v; render(); props(); } }
    if (d.edtog) { const l = E.layers.find((x) => x.id === E.sel); if (l) { save(); if (d.edtog === 'weight') l.weight = l.weight >= 700 ? 400 : 700; else l[d.edtog] = !l[d.edtog]; render(); props(); } }
    if (d.edact) {
      const i = E.layers.findIndex((x) => x.id === E.sel); if (i < 0) return; const l = E.layers[i]; save();
      if (d.edact === 'del') { E.layers.splice(i, 1); E.sel = null; }
      if (d.edact === 'dup') { const c = { ...l, id: uid(), x: Math.min(0.9, l.x + 0.04), y: Math.min(0.9, l.y + 0.04) }; E.layers.splice(i + 1, 0, c); E.sel = c.id; }
      if (d.edact === 'up' && i < E.layers.length - 1) [E.layers[i], E.layers[i + 1]] = [E.layers[i + 1], E.layers[i]];
      if (d.edact === 'down' && i > 0) [E.layers[i], E.layers[i - 1]] = [E.layers[i - 1], E.layers[i]];
      render(); props(); layerList();
    }
  });
  dlg.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.elin && E.selEl) { save(true); const k = t.dataset.elin; setEl(E.selEl, { [k]: k === 'text' || k === 'color' ? t.value : +t.value }); render(); if (k === 'text') setTimeout(layerList, 60); return; }
    const k = t.dataset.edin; if (!k) return;
    const l = E.layers.find((x) => x.id === E.sel); if (!l) return; save(true);
    l[k] = num(k) ? +t.value : t.value; render(); if (k === 'text') layerList();
  });
  dlg.addEventListener('change', (e) => { const t = e.target; if (t.dataset.edtogc) { const l = E.layers.find((x) => x.id === E.sel); if (l) { save(); l[t.dataset.edtogc] = t.checked; render(); } } });
  $('#ed-img').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const img = new Image(); img.src = URL.createObjectURL(f); await img.decode();
    const a = img.width / img.height, w = 0.4, h = (w / a) * E.aspect;
    add({ type: 'image', img, w, h });
  });
  // select / move / resize / rotate on the canvas
  const over = $('#ed-over');
  let drag = null;
  const pt = (e) => { const r = over.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, r }; };
  over.addEventListener('pointerdown', (e) => {
    const p = pt(e), handle = e.target.dataset.h;
    let l = E.layers.find((x) => x.id === E.sel);
    if (!handle) {
      const hit = E.layers.filter((x) => x.face === E.face).reverse().find((x) => Math.abs(p.x - x.x) < x.w / 2 + 0.01 && Math.abs(p.y - x.y) < (x.h ?? 0.1) / 2 + 0.01);
      E.sel = hit?.id || null; l = hit;
      if (!hit) { // not one of your layers: maybe a piece of the design itself
        const f = hitEl(p); E.selEl = f?.id || null; props(); layerList(); drawSel();
        if (!f) return;
        save(); over.setPointerCapture(e.pointerId);
        drag = { mode: 'el', start: p, orig: { dx: E.els[f.id]?.dx || 0, dy: E.els[f.id]?.dy || 0 } };
        return;
      }
      E.selEl = null; props(); layerList(); drawSel();
    }
    save(); over.setPointerCapture(e.pointerId);
    drag = { mode: handle || 'move', start: p, orig: { ...l } };
  });
  over.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (drag.mode === 'el') { const p = pt(e); setEl(E.selEl, { dx: drag.orig.dx + p.x - drag.start.x || null, dy: drag.orig.dy + p.y - drag.start.y || null }); render(); return; }
    const l = E.layers.find((x) => x.id === E.sel); if (!l) return;
    const p = pt(e), o = drag.orig;
    if (drag.mode === 'move') { l.x = Math.min(1, Math.max(0, o.x + p.x - drag.start.x)); l.y = Math.min(1, Math.max(0, o.y + p.y - drag.start.y)); }
    else if (drag.mode === 'rot') { l.rot = Math.round((Math.atan2(p.y * p.r.height - l.y * p.r.height, p.x * p.r.width - l.x * p.r.width) * 180) / Math.PI + 90); }
    else { // corner resize, from the centre
      const sx = Math.abs(p.x - l.x) / Math.max(0.001, Math.abs(drag.start.x - o.x)), sy = Math.abs(p.y - l.y) / Math.max(0.001, Math.abs(drag.start.y - o.y));
      const keep = l.type !== 'shape' || e.shiftKey, s = keep ? Math.max(sx, sy) : 1;
      l.w = Math.max(0.03, o.w * (keep ? s : sx)); l.h = Math.max(0.01, (o.h ?? 0.1) * (keep ? s : sy));
      if (l.type === 'text') l.size = Math.max(0.012, o.size * (keep ? s : 1));
    }
    render();
  });
  over.addEventListener('pointerup', () => { drag = null; props(); });
  $('#ed-undo').onclick = () => step(-1); $('#ed-redo').onclick = () => step(1);
  addEventListener('keydown', (e) => {
    if (!dlg.open || /input|textarea|select/i.test(document.activeElement?.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); step(e.shiftKey ? 1 : -1); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); step(1); return; }
    if (E?.selEl) {
      if (e.key === 'Delete' || e.key === 'Backspace') { save(); setEl(E.selEl, { hide: true }); E.selEl = null; render(); props(); setTimeout(layerList, 60); e.preventDefault(); return; }
      if (e.key.startsWith('Arrow')) { save(true); const st = e.shiftKey ? 0.02 : 0.004, c = E.els[E.selEl] || {}; setEl(E.selEl, { dx: (c.dx || 0) + (e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0) || null, dy: (c.dy || 0) + (e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0) || null }); render(); e.preventDefault(); }
      return;
    }
    if (!E?.sel) return;
    const l = E.layers.find((x) => x.id === E.sel); if (!l) return;
    if (e.key.startsWith('Arrow')) save(true);
    if (e.key === 'Delete' || e.key === 'Backspace') { save(); E.layers = E.layers.filter((x) => x !== l); E.sel = null; render(); props(); layerList(); e.preventDefault(); }
    const st = e.shiftKey ? 0.02 : 0.004;
    if (e.key === 'ArrowLeft') l.x -= st; if (e.key === 'ArrowRight') l.x += st; if (e.key === 'ArrowUp') l.y -= st; if (e.key === 'ArrowDown') l.y += st;
    if (e.key.startsWith('Arrow')) { e.preventDefault(); render(); }
  });
  addEventListener('resize', () => { if (dlg.open) render(); });
  $('#ed-done').onclick = () => { const f = E.onDone; dlg.close(); f?.({ layers: E.layers, els: E.els }); };
  $('#ed-cancel').onclick = () => dlg.close();
}
