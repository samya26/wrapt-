// Sketch pad + clean-up. The user's drawing IS the logo idea; we only tidy it.
// Strokes are stored as point lists (0..1), not pixels, so they can be simplified,
// snapped to perfect shapes and redrawn as smooth vector paths.
import { smoothClosed } from './logo.js';

export class SketchPad {
  constructor(canvas, onChange = () => {}) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.onChange = onChange;
    this.actions = []; this.cur = null; this.pen = 0.022; this.tool = 'pen'; this.mirror = false;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(ev, () => this.up());
    new ResizeObserver(() => this.fit()).observe(canvas);
    this.fit();
  }
  fit() { const r = this.c.getBoundingClientRect(); if (!r.width) return; const d = Math.min(devicePixelRatio || 1, 2); this.c.width = r.width * d; this.c.height = r.width * d; this.draw(); }
  pt(e) { const r = this.c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
  get strokes() { return this.actions.flat(); }
  down(e) {
    e.preventDefault(); this.c.setPointerCapture?.(e.pointerId);
    const p = this.pt(e);
    if (this.tool === 'eraser') { this.erasing = true; this.eraseAt(p); return; }
    this.cur = { pts: [p], w: this.pen }; this.draw();
  }
  move(e) {
    if (this.erasing) { this.eraseAt(this.pt(e)); return; }
    if (!this.cur) return; e.preventDefault();
    const p = this.pt(e), l = this.cur.pts[this.cur.pts.length - 1];
    if (Math.hypot(p.x - l.x, p.y - l.y) > 0.003) { this.cur.pts.push(p); this.draw(); }
  }
  up() {
    this.erasing = false;
    if (!this.cur) return;
    const s = this.cur; this.cur = null;
    const act = [s]; if (this.mirror) act.push({ pts: s.pts.map((p) => ({ x: 1 - p.x, y: p.y })), w: s.w });
    this.actions.push(act); this.draw(); this.onChange();
  }
  eraseAt(p) {
    const r = 0.03, before = this.actions.length;
    this.actions = this.actions.map((a) => a.filter((s) => !s.pts.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < r + s.w))).filter((a) => a.length);
    if (this.actions.length !== before || true) { this.draw(); this.onChange(); }
  }
  undo() { this.actions.pop(); this.draw(); this.onChange(); }
  clear() { this.actions = []; this.draw(); this.onChange(); }
  draw() {
    const g = this.g, W = this.c.width;
    g.clearRect(0, 0, W, W);
    // faint guides: grid + circle + centre line
    g.strokeStyle = 'rgba(40,30,20,.07)'; g.lineWidth = 1;
    for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo((i * W) / 8, 0); g.lineTo((i * W) / 8, W); g.moveTo(0, (i * W) / 8); g.lineTo(W, (i * W) / 8); g.stroke(); }
    g.strokeStyle = 'rgba(40,30,20,.13)'; g.setLineDash([4, 6]); g.beginPath(); g.arc(W / 2, W / 2, W * 0.38, 0, Math.PI * 2); g.stroke();
    if (this.mirror) { g.strokeStyle = 'rgba(200,85,61,.45)'; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, W); g.stroke(); }
    g.setLineDash([]);
    g.strokeStyle = '#1c1a17'; g.lineCap = g.lineJoin = 'round';
    const all = [...this.strokes, ...(this.cur ? [this.cur] : []), ...(this.cur && this.mirror ? [{ pts: this.cur.pts.map((p) => ({ x: 1 - p.x, y: p.y })), w: this.cur.w }] : [])];
    for (const s of all) {
      g.lineWidth = s.w * W; g.beginPath();
      s.pts.forEach((p, i) => (i ? g.lineTo(p.x * W, p.y * W) : g.moveTo(p.x * W, p.y * W)));
      if (s.pts.length === 1) g.lineTo(s.pts[0].x * W + 0.1, s.pts[0].y * W);
      g.stroke();
    }
  }
  png() { const c = document.createElement('canvas'); c.width = c.height = 384; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 384, 384); g.drawImage(this.c, 0, 0, 384, 384); return c.toDataURL('image/jpeg', 0.85); }
}

// ---------- geometry ----------
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function segDist(p, a, b) { const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2; if (!l2) return dist(p, a); let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2; t = Math.max(0, Math.min(1, t)); return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }); }
export function rdp(pts, eps) { // Ramer–Douglas–Peucker
  if (pts.length < 3) return pts.slice();
  let idx = 0, md = 0; for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i], pts[0], pts[pts.length - 1]); if (d > md) { md = d; idx = i; } }
  if (md <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}
const bbox = (pts) => { const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys); return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, d: Math.hypot(x1 - x0, y1 - y0) }; };
const pathLen = (pts) => pts.reduce((a, p, i) => a + (i ? dist(p, pts[i - 1]) : 0), 0);
function smoothOpen(p) {
  if (p.length === 2) return `M${p[0].x} ${p[0].y}L${p[1].x} ${p[1].y}`;
  let d = `M${p[0].x.toFixed(2)} ${p[0].y.toFixed(2)}`;
  for (let i = 0; i < p.length - 1; i++) { const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(2)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(2)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(2)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`; }
  return d;
}
const poly = (p, closed) => p.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(2)} ${q.y.toFixed(2)}`).join('') + (closed ? 'z' : '');
const ellipseD = (cx, cy, rx, ry) => `M${(cx - rx).toFixed(2)} ${cy.toFixed(2)}a${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(2 * rx).toFixed(2)} 0a${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(-2 * rx).toFixed(2)} 0z`;

// Recognise what a stroke was meant to be
function classify(s, geo) {
  const pts = s.pts, b = bbox(pts), len = pathLen(pts);
  if (pts.length < 3 || len < 0.02) return { kind: 'dot', c: pts[0], r: Math.max(s.w * 0.6, 0.008) };
  const closed = dist(pts[0], pts[pts.length - 1]) < Math.max(0.035, b.d * 0.2);
  const straight = Math.max(...pts.map((p) => segDist(p, pts[0], pts[pts.length - 1]))) < len * (geo ? 0.08 : 0.05);
  if (!closed && straight) return { kind: 'line', a: pts[0], b: pts[pts.length - 1] };
  if (closed) {
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const rs = pts.map((p) => Math.hypot(p.x - cx, p.y - cy)), mr = rs.reduce((a, r) => a + r, 0) / rs.length;
    const sd = Math.sqrt(rs.reduce((a, r) => a + (r - mr) ** 2, 0) / rs.length);
    const corners = rdp(pts, b.d * 0.09); const nC = corners.length - (dist(corners[0], corners[corners.length - 1]) < b.d * 0.2 ? 1 : 0);
    const v0 = corners.slice(0, nC);
    // a real polygon has straight sides: every drawn point lies close to one of its edges
    const fits = nC >= 3 && Math.max(...pts.map((p) => Math.min(...v0.map((a, i) => segDist(p, a, v0[(i + 1) % nC]))))) < b.d * 0.028;
    if (nC >= 3 && nC <= 4 && sd / mr > 0.09 && fits) {
      const v = v0;
      if (nC === 4 && Math.abs(b.w - b.h) / Math.max(b.w, b.h) < 2) {
        const axis = v.every((p) => Math.min(Math.abs(p.x - b.x0), Math.abs(p.x - b.x1)) < b.w * 0.22 && Math.min(Math.abs(p.y - b.y0), Math.abs(p.y - b.y1)) < b.h * 0.22);
        if (axis) return { kind: 'rect', b };
      }
      return { kind: 'poly', v };
    }
    if (sd / mr < (geo ? 0.2 : 0.14)) return { kind: 'ellipse', cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, rx: b.w / 2, ry: b.h / 2 };
    return { kind: 'free', pts, closed: true };
  }
  return { kind: 'free', pts, closed: false };
}

// mode: 'clean' (smoothed, true to the drawing) · 'geo' (snapped, even, symmetric) · 'bold' (thick, solid)
export function refineSketch(strokes, mode = 'clean') {
  if (!strokes.length) return null;
  const geo = mode === 'geo';
  const shapes = strokes.map((s) => ({ ...classify(s, geo), w: s.w }));
  // fit everything into a 100×100 box (84 used)
  const all = strokes.flatMap((s) => s.pts); const b = bbox(all);
  const sc = 84 / Math.max(b.w, b.h, 0.05), ox = 50 - ((b.x0 + b.x1) / 2) * sc, oy = 50 - ((b.y0 + b.y1) / 2) * sc;
  const T = (p) => ({ x: p.x * sc + ox, y: p.y * sc + oy });
  const grid = (v, g = 100 / 24) => (geo ? Math.round(v / g) * g : v);
  const G = (p) => ({ x: grid(p.x), y: grid(p.y) });
  const median = [...strokes.map((s) => s.w)].sort((a, b2) => a - b2)[Math.floor(strokes.length / 2)];
  const sw = Math.min(10, Math.max(4.2, median * sc) * (mode === 'bold' ? 1.9 : 1));
  const paths = shapes.map((sh) => {
    const lw = geo || mode === 'bold' ? sw : Math.max(4.2, sh.w * sc);
    if (sh.kind === 'dot') { const c = T(sh.c); return { d: ellipseD(c.x, c.y, lw * 0.55, lw * 0.55), fill: true, stroke: false, lw }; }
    if (sh.kind === 'line') {
      let a = T(sh.a), e = T(sh.b);
      if (geo) { // snap angle to 45°
        const ang = Math.round(Math.atan2(e.y - a.y, e.x - a.x) / (Math.PI / 4)) * (Math.PI / 4), L = Math.hypot(e.x - a.x, e.y - a.y), m = { x: (a.x + e.x) / 2, y: (a.y + e.y) / 2 };
        a = G({ x: m.x - Math.cos(ang) * L / 2, y: m.y - Math.sin(ang) * L / 2 }); e = G({ x: m.x + Math.cos(ang) * L / 2, y: m.y + Math.sin(ang) * L / 2 });
      }
      return { d: `M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${e.x.toFixed(2)} ${e.y.toFixed(2)}`, lw, closed: false };
    }
    if (sh.kind === 'ellipse') {
      const c = T({ x: sh.cx, y: sh.cy }); let rx = sh.rx * sc, ry = sh.ry * sc;
      if (geo || Math.abs(rx - ry) / Math.max(rx, ry) < 0.12) { const r = (rx + ry) / 2; rx = ry = r; }
      const cc = geo ? G(c) : c;
      return { d: ellipseD(cc.x, cc.y, rx, ry), lw, closed: true, area: rx * ry };
    }
    if (sh.kind === 'rect') { const p0 = G(T({ x: sh.b.x0, y: sh.b.y0 })), p1 = G(T({ x: sh.b.x1, y: sh.b.y1 })); const r = geo ? 0 : Math.min(p1.x - p0.x, p1.y - p0.y) * 0.06;
      return { d: r ? `M${p0.x + r} ${p0.y}H${p1.x - r}Q${p1.x} ${p0.y} ${p1.x} ${p0.y + r}V${p1.y - r}Q${p1.x} ${p1.y} ${p1.x - r} ${p1.y}H${p0.x + r}Q${p0.x} ${p1.y} ${p0.x} ${p1.y - r}V${p0.y + r}Q${p0.x} ${p0.y} ${p0.x + r} ${p0.y}z` : poly([p0, { x: p1.x, y: p0.y }, p1, { x: p0.x, y: p1.y }], true), lw, closed: true, area: (p1.x - p0.x) * (p1.y - p0.y) }; }
    if (sh.kind === 'poly') { const v = sh.v.map((p) => G(T(p))); const bb = bbox(v); return { d: poly(v, true), lw, closed: true, area: bb.w * bb.h * 0.5 }; }
    // freeform
    const eps = (geo ? 0.022 : mode === 'bold' ? 0.01 : 0.007) * Math.max(b.w, b.h, 0.05);
    let p = rdp(sh.pts, eps).map(T);
    if (geo) p = p.map(G).filter((q, i, arr) => !i || q.x !== arr[i - 1].x || q.y !== arr[i - 1].y);
    if (sh.closed) { if (p.length > 2 && dist(p[0], p[p.length - 1]) < 6) p.pop(); const bb = bbox(p);
      return { d: geo ? poly(p, true) : smoothClosed(p.map((q) => [q.x, q.y])), lw, closed: true, area: bb.w * bb.h * 0.6 }; }
    return { d: geo ? poly(p, false) : smoothOpen(p), lw, closed: false };
  });
  if (mode === 'bold') {
    // the largest closed shape becomes solid; everything inside it is cut out of it (negative space)
    const big = paths.filter((p) => p.closed).sort((a, b2) => b2.area - a.area)[0];
    if (big && big.area > 900) {
      big.fill = true; big.stroke = true;
      for (const p of paths) if (p !== big) p.knock = true;
      // knock-outs must come after the solid shape
      paths.sort((a, b2) => (a === big ? -1 : b2 === big ? 1 : 0));
    } else for (const p of paths) if (p.closed && p.area < 900) p.fill = true;
  }
  return { paths, sw, mode };
}
