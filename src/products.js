import * as THREE from 'three';
import { paintWrap, paintDisc, paintBox, paintFace, isDark, mix } from './art.js';

// Every product is built from real-world proportions (1 unit ≈ 10 cm) and sits on y = 0.
// UV mapping decides where each pixel of the 2D artwork lands on the 3D surface.

function tex(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// Printed surfaces: finish = gloss | matte | metallic
function printMat(map, finish) {
  const base = { map, side: THREE.FrontSide };
  if (finish === 'metallic') return new THREE.MeshPhysicalMaterial({ ...base, metalness: 0.75, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.15 });
  if (finish === 'matte') return new THREE.MeshPhysicalMaterial({ ...base, metalness: 0, roughness: 0.82 });
  return new THREE.MeshPhysicalMaterial({ ...base, metalness: 0.05, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.12 });
}
const aluminium = () => new THREE.MeshPhysicalMaterial({ color: 0xd3d7dc, metalness: 1, roughness: 0.28 });

function shadowAll(g) { g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return g; }

// ---------- CAN (330 ml: 6.6 cm × 11.5 cm) ----------
export function buildCan(brand, opts, renderer) {
  const r = opts.r ?? 0.33, h = opts.h ?? 1.15;
  const g = new THREE.Group();
  const bodyH = h * 0.8, y0 = h * 0.07;
  const art = paintWrap(brand, (2 * Math.PI * r) / bodyH);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bodyH, 128, 1, true), printMat(tex(art, renderer), opts.finish));
  body.position.y = y0 + bodyH / 2; body.rotation.y = Math.PI; // puts the front of the artwork towards the camera
  g.add(body);
  // metal top & bottom, from a lathe profile (the classic can silhouette)
  const bot = [[0, 0.012], [r * 0.62, 0.0], [r * 0.86, 0.004], [r * 0.95, 0.03], [r, y0]];
  const top = [[r, y0 + bodyH], [r * 0.96, h * 0.92], [r * 0.82, h * 0.985], [r * 0.82, h], [r * 0.79, h], [r * 0.77, h * 0.975], [0, h * 0.975]];
  for (const pts of [bot, top]) g.add(new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 96), aluminium()));
  // pull tab
  const tab = new THREE.Mesh(new THREE.BoxGeometry(r * 0.42, 0.008, r * 0.24), aluminium());
  tab.position.set(0, h * 0.98, r * 0.18); g.add(tab);
  g.rotation.y = 0.55; // turn the front of the label towards the hero camera
  return { group: shadowAll(g), height: h, radius: r };
}

// ---------- TUB (dessert / ice-cream) ----------
export function buildTub(brand, opts, renderer) {
  const rt = opts.r ?? 0.5, rb = rt * 0.8, h = opts.h ?? 0.55;
  const g = new THREE.Group();
  const art = paintWrap(brand, (Math.PI * (rt + rb)) / h);
  const side = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 128, 1, true), printMat(tex(art, renderer), opts.finish === 'metallic' ? 'gloss' : opts.finish));
  side.position.y = h / 2; side.rotation.y = Math.PI; g.add(side);
  const base = new THREE.Mesh(new THREE.CircleGeometry(rb, 64), new THREE.MeshStandardMaterial({ color: brand.pack, roughness: 0.5 }));
  base.rotation.x = Math.PI / 2; base.position.y = 0.001; g.add(base);
  const lidCol = new THREE.MeshPhysicalMaterial({ color: brand.pack, roughness: 0.35, clearcoat: 0.5 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(rt * 1.04, rt * 1.04, 0.07, 128, 1, true), lidCol);
  rim.position.y = h + 0.02; g.add(rim);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rt * 1.04, 0.012, 12, 128), lidCol);
  lip.rotation.x = Math.PI / 2; lip.position.y = h - 0.015; g.add(lip);
  const top = new THREE.Mesh(new THREE.CircleGeometry(rt * 1.04, 128), printMat(tex(paintDisc(brand), renderer), opts.finish === 'metallic' ? 'gloss' : opts.finish));
  top.rotation.set(-Math.PI / 2, 0, -0.55); top.position.y = h + 0.055; g.add(top);
  g.rotation.y = 0.55;
  return { group: shadowAll(g), height: h + 0.06, radius: rt * 1.04 };
}

// ---------- JAR (glass, with contents + label band + lid) ----------
export function buildJar(brand, opts, renderer) {
  const r = opts.r ?? 0.38, h = opts.h ?? 0.78;
  const g = new THREE.Group();
  const prof = (rr, hh, inset = 0) => [[0, inset], [rr * 0.85, inset], [rr - inset, inset + 0.03], [rr - inset, hh * 0.86], [rr * 0.8, hh * 0.95], [rr * 0.8, hh]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof(r, h), 96), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.08, ior: 1.5, transparent: true, opacity: 1, envMapIntensity: 1.2 }));
  g.add(glass);
  const fill = isDark(brand.pack) ? brand.pack : mix(brand.accent, '#3a2416', 0.4);
  const contents = new THREE.Mesh(new THREE.LatheGeometry(prof(r * 0.94, h * 0.8, 0.02), 96), new THREE.MeshPhysicalMaterial({ color: fill, roughness: 0.25, clearcoat: 1 }));
  g.add(contents);
  const bandH = h * 0.5, art = paintWrap(brand, (2 * Math.PI * r) / bandH);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.006, r * 1.006, bandH, 128, 1, true), printMat(tex(art, renderer), opts.finish === 'metallic' ? 'gloss' : opts.finish));
  band.position.y = h * 0.42; band.rotation.y = Math.PI; g.add(band);
  const lidMat = new THREE.MeshPhysicalMaterial({ color: isDark(brand.pack) ? brand.accent : brand.pack, metalness: opts.finish === 'metallic' ? 0.9 : 0.2, roughness: 0.3, clearcoat: 0.6 });
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, h * 0.16, 96), lidMat);
  lid.position.y = h + h * 0.06; g.add(lid);
  const lidTop = new THREE.Mesh(new THREE.CircleGeometry(r * 0.78, 96), printMat(tex(paintDisc(brand), renderer), 'gloss'));
  lidTop.rotation.set(-Math.PI / 2, 0, -0.55); lidTop.position.y = h + h * 0.141; g.add(lidTop);
  g.rotation.y = 0.55;
  return { group: shadowAll(g), height: h * 1.14, radius: r };
}

// ---------- BOX with an animated fold (dieline → box) ----------
// The flat "net" is a tree of hinged panels: front is the root; left/right hinge on its
// vertical edges, back hinges on the right panel, top/bottom hinge on the front.
function panel(x0, x1, y0, y1, R, W, H) {
  const geo = new THREE.BufferGeometry();
  const p = [x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0];
  const u0 = R.x / W, u1 = (R.x + R.w) / W, v1 = 1 - R.y / H, v0 = 1 - (R.y + R.h) / H;
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v1], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  return geo;
}
export function buildBox(brand, opts, renderer) {
  const W = opts.w ?? 1.0, H = opts.h ?? 1.3, D = opts.d ?? 0.45;
  const { canvas, layout: L } = paintBox(brand, { w: W, h: H, d: D });
  const map = tex(canvas, renderer);
  const outer = printMat(map, opts.finish === 'metallic' ? 'gloss' : opts.finish);
  const inner = new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 0.95, side: THREE.BackSide });
  const mk = (geo) => { const o = new THREE.Group(); o.add(new THREE.Mesh(geo, outer), new THREE.Mesh(geo, inner)); return o; };
  const CW = L.width, CH = L.height;
  const front = mk(panel(-W / 2, W / 2, -H / 2, H / 2, L.front, CW, CH));
  const rightH = new THREE.Group(); rightH.position.x = W / 2; rightH.add(mk(panel(0, D, -H / 2, H / 2, L.right, CW, CH)));
  const backH = new THREE.Group(); backH.position.x = D; backH.add(mk(panel(0, W, -H / 2, H / 2, L.back, CW, CH))); rightH.add(backH);
  const leftH = new THREE.Group(); leftH.position.x = -W / 2; leftH.add(mk(panel(-D, 0, -H / 2, H / 2, L.left, CW, CH)));
  const topH = new THREE.Group(); topH.position.y = H / 2; topH.add(mk(panel(-W / 2, W / 2, 0, D, L.top, CW, CH)));
  const botH = new THREE.Group(); botH.position.y = -H / 2; botH.add(mk(panel(-W / 2, W / 2, -D, 0, L.bottom, CW, CH)));
  front.add(rightH, leftH, topH, botH);
  const g = new THREE.Group(); g.add(front);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const fold = (t) => {
    const s = (a, b) => ease(Math.min(1, Math.max(0, (t - a) / (b - a)))); // staggered: sides, back, then flaps
    rightH.rotation.y = (Math.PI / 2) * s(0, 0.45);
    leftH.rotation.y = (-Math.PI / 2) * s(0.05, 0.5);
    backH.rotation.y = (Math.PI / 2) * s(0.35, 0.75);
    topH.rotation.x = (-Math.PI / 2) * s(0.6, 1);
    botH.rotation.x = (Math.PI / 2) * s(0.55, 0.95);
    const k = ease(t);
    front.position.set(0, H / 2 + (1 - k) * (D + 0.05), (D / 2) * k);
    front.rotation.y = -0.35 * Math.sin(Math.PI * t); // a little turn while folding, for drama
  };
  fold(opts.fold ?? 1);
  return { group: shadowAll(g), height: H, radius: Math.max(W, D) / 2 * 1.2, fold };
}

// ---------- POUCH (stand-up) ----------
export function buildPouch(brand, opts, renderer) {
  const W = opts.w ?? 0.9, H = opts.h ?? 1.25, depth = 0.16;
  const g = new THREE.Group();
  const face = (role) => {
    const c = paintFace(brand, role, W / H);
    const gg = c.getContext('2d');
    // zipper line + heat-sealed top strip
    gg.fillStyle = 'rgba(0,0,0,.22)'; gg.fillRect(0, c.height * 0.09, c.width, Math.max(4, c.height * 0.006));
    gg.fillStyle = 'rgba(255,255,255,.16)'; gg.fillRect(0, 0, c.width, c.height * 0.055);
    return c;
  };
  const mkSide = (canvas) => {
    const geo = new THREE.PlaneGeometry(W, H, 48, 64);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const u = x / W + 0.5, v = y / H + 0.5;
      const seal = v > 0.94 ? 0 : 1;
      let z = depth * Math.pow(Math.sin(Math.PI * u), 0.7) * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.15 + 0.05)), 0.5) * seal;
      z += v < 0.18 ? depth * 0.9 * (1 - v / 0.18) * Math.pow(Math.sin(Math.PI * u), 0.4) : 0; // bottom gusset
      p.setZ(i, z);
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, printMat(tex(canvas, renderer), opts.finish));
  };
  const front = mkSide(face('front'));
  const back = mkSide(face('back')); back.rotation.y = Math.PI;
  const pg = new THREE.Group(); pg.add(front, back); pg.position.y = H / 2; g.add(pg);
  g.rotation.y = 0.3;
  return { group: shadowAll(g), height: H, radius: W / 2 };
}

// ---------- BOTTLE (sauce, cold brew, oils, skincare) ----------
export function buildBottle(brand, opts, renderer) {
  const r = opts.r ?? 0.3, h = opts.h ?? 1.45;
  const g = new THREE.Group();
  const nr = r * 0.34, sh = h * 0.62, nk = h * 0.8;
  const prof = [[0, 0], [r * 0.9, 0], [r, 0.035], [r, sh]];
  for (let i = 1; i <= 10; i++) { const t = i / 10, e = Math.sin((t * Math.PI) / 2); prof.push([r - (r - nr) * (1 - Math.cos((t * Math.PI) / 2)), sh + (nk - sh) * e]); }
  prof.push([nr, h * 0.9], [nr * 1.12, h * 0.9], [nr * 1.12, h * 0.91], [0, h * 0.91]);
  const glassy = brand.style === 'minimal' || brand.style === 'classic';
  const bodyMat = new THREE.MeshPhysicalMaterial(glassy
    ? { color: isDark(brand.pack) ? brand.pack : mix(brand.accent, '#2a1a0c', 0.55), roughness: 0.08, metalness: 0, clearcoat: 1, transmission: 0.25, thickness: 0.2 }
    : { color: brand.pack, roughness: 0.3, clearcoat: 0.7 });
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 96), bodyMat));
  const bandH = h * 0.42, art = paintWrap(brand, (2 * Math.PI * r) / bandH);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, bandH, 128, 1, true), printMat(tex(art, renderer), opts.finish === 'metallic' ? 'gloss' : opts.finish));
  band.position.y = sh * 0.52; band.rotation.y = Math.PI; g.add(band);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(nr * 1.15, nr * 1.15, h * 0.11, 64), new THREE.MeshPhysicalMaterial({ color: isDark(brand.pack) ? brand.accent : '#1c1a17', roughness: 0.35, metalness: opts.finish === 'metallic' ? 0.9 : 0.1, clearcoat: 0.5 }));
  cap.position.y = h * 0.945; g.add(cap);
  g.rotation.y = 0.55;
  return { group: shadowAll(g), height: h, radius: r };
}

// ---------- SQUEEZE TUBE (creams, gels): round at the cap, flat at the crimp ----------
export function buildTube(brand, opts, renderer) {
  const r = opts.r ?? 0.22, h = opts.h ?? 1.2;
  const g = new THREE.Group();
  const capH = h * 0.13, sealH = h * 0.06, L = h - capH - sealH;
  const nu = 96, nv = 48, pos = [], uv = [], idx = [];
  const A = (v) => r * (1 + 0.42 * Math.pow(v, 1.3)), B = (v) => r * Math.max(0.03, 1 - Math.pow(v, 1.6));
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    for (let i = 0; i <= nu; i++) { const u = i / nu, th = (u - 0.5) * Math.PI * 2; pos.push(A(v) * Math.sin(th), capH + v * L, B(v) * Math.cos(th)); uv.push(u, v); }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b2 = a + nu + 1; idx.push(a, a + 1, b2, a + 1, b2 + 1, b2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const art = paintWrap(brand, (2 * Math.PI * r * 1.1) / L);
  g.add(new THREE.Mesh(geo, printMat(tex(art, renderer), opts.finish)));
  const sealMat = new THREE.MeshPhysicalMaterial({ color: brand.pack, roughness: 0.5 });
  const seal = new THREE.Mesh(new THREE.BoxGeometry(A(1) * 2 + 0.02, sealH, 0.022), sealMat); seal.position.y = h - sealH / 2; g.add(seal);
  for (let k = 1; k < 6; k++) { const ridge = new THREE.Mesh(new THREE.BoxGeometry(A(1) * 2 + 0.02, 0.004, 0.026), sealMat); ridge.position.y = h - sealH + (k * sealH) / 6; g.add(ridge); }
  const capMat = new THREE.MeshPhysicalMaterial({ color: isDark(brand.pack) ? brand.accent : '#1c1a17', roughness: 0.3, clearcoat: 0.6, metalness: opts.finish === 'metallic' ? 0.8 : 0 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.82, r * 0.78, capH, 64), capMat); cap.position.y = capH / 2; g.add(cap);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.82, 0.03, 64), sealMat); sh.position.y = capH + 0.012; g.add(sh);
  g.rotation.y = 0.45;
  return { group: shadowAll(g), height: h, radius: A(1) };
}

// ---------- PAPER TUBE (tea, gifts, candles): a printed cylinder with a lid ----------
export function buildPaperTube(brand, opts, renderer) {
  const r = opts.r ?? 0.3, h = opts.h ?? 1.1;
  const g = new THREE.Group();
  const bodyH = h * 0.8, lidH = h * 0.24;
  const art = paintWrap(brand, (2 * Math.PI * r) / bodyH);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bodyH, 128, 1, true), printMat(tex(art, renderer), opts.finish === 'metallic' ? 'gloss' : opts.finish));
  body.position.y = bodyH / 2; body.rotation.y = Math.PI; g.add(body);
  const lidMat = new THREE.MeshPhysicalMaterial({ color: brand.accent, roughness: opts.finish === 'gloss' ? 0.3 : 0.75, metalness: opts.finish === 'metallic' ? 0.85 : 0, clearcoat: opts.finish === 'gloss' ? 0.6 : 0 });
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.025, r * 1.025, lidH, 128, 1, true), lidMat); lid.position.y = h - lidH / 2; g.add(lid);
  const top = new THREE.Mesh(new THREE.CircleGeometry(r * 1.025, 96), printMat(tex(paintDisc(brand), renderer), 'matte'));
  top.rotation.set(-Math.PI / 2, 0, -0.55); top.position.y = h; g.add(top);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 1.025, 0.006, 8, 128), lidMat); lip.rotation.x = Math.PI / 2; lip.position.y = h - lidH; g.add(lip);
  g.rotation.y = 0.55;
  return { group: shadowAll(g), height: h, radius: r * 1.03 };
}

// ---------- CUP (coffee, smoothies, desserts to go) ----------
export function buildCup(brand, opts, renderer) {
  const rt = opts.r ?? 0.4, rb = rt * 0.72, h = opts.h ?? 0.95;
  const g = new THREE.Group();
  const art = paintWrap(brand, (Math.PI * (rt + rb)) / h);
  const side = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 128, 1, true), printMat(tex(art, renderer), opts.finish === 'metallic' ? 'gloss' : opts.finish));
  side.position.y = h / 2; side.rotation.y = Math.PI; g.add(side);
  const base = new THREE.Mesh(new THREE.CircleGeometry(rb, 64), new THREE.MeshStandardMaterial({ color: brand.pack })); base.rotation.x = Math.PI / 2; base.position.y = 0.002; g.add(base);
  const lidMat = new THREE.MeshPhysicalMaterial({ color: isDark(brand.pack) ? '#1c1a17' : '#f7f4ee', roughness: 0.4, clearcoat: 0.4 });
  const lp = [[0, h + 0.075], [rt * 0.55, h + 0.075], [rt * 0.62, h + 0.06], [rt * 0.92, h + 0.05], [rt * 1.05, h + 0.02], [rt * 1.06, h - 0.01], [rt * 1.0, h - 0.02]];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(lp.map(([x, y]) => new THREE.Vector2(x, y)), 96), lidMat));
  const sip = new THREE.Mesh(new THREE.BoxGeometry(rt * 0.28, 0.012, rt * 0.08), new THREE.MeshStandardMaterial({ color: '#111' })); sip.position.set(0, h + 0.076, rt * 0.36); g.add(sip);
  g.rotation.y = 0.55;
  return { group: shadowAll(g), height: h + 0.08, radius: rt * 1.06 };
}

// ---------- HANG CARD / HEADER CARD (keychains, jewellery, accessories) ----------
export function buildCard(brand, opts, renderer) {
  const W = opts.w ?? 0.8, H = opts.h ?? 1.2, T = 0.014;
  const face = (role) => {
    const c = paintFace(brand, role, W / H), gg = c.getContext('2d');
    // euro hang slot, punched out
    const sw = c.width * 0.26, sh = c.height * 0.045, sx = c.width / 2 - sw / 2, sy = c.height * 0.045;
    gg.globalCompositeOperation = 'destination-out'; gg.beginPath(); gg.roundRect(sx, sy, sw, sh, sh / 2); gg.fill();
    gg.beginPath(); gg.arc(c.width / 2, sy + sh * 0.5, sh * 0.9, 0, Math.PI * 2); gg.fill();
    return c;
  };
  const mk = (canvas) => { const m = printMat(tex(canvas, renderer), opts.finish); m.alphaTest = 0.5; m.transparent = false; return m; };
  const edge = new THREE.MeshStandardMaterial({ color: brand.pack, roughness: 0.9 });
  const card = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [edge, edge, edge, edge, mk(face('front')), mk(face('back'))]);
  card.position.y = H / 2;
  const g = new THREE.Group(); g.add(card);
  // little stand so it doesn't float
  const stand = new THREE.Mesh(new THREE.BoxGeometry(W * 0.5, 0.02, 0.22), new THREE.MeshStandardMaterial({ color: '#d9d2c5', roughness: 0.6 })); stand.position.set(0, 0.01, -0.02); g.add(stand);
  card.rotation.x = -0.06;
  g.rotation.y = 0.35;
  return { group: shadowAll(g), height: H, radius: W / 2 };
}

// ---------- PAPER SHOPPING BAG ----------
export function buildBag(brand, opts, renderer) {
  const W = opts.w ?? 0.9, H = opts.h ?? 1.0, D = opts.d ?? 0.38;
  const g = new THREE.Group();
  const kraft = new THREE.MeshStandardMaterial({ color: '#c9a77c', roughness: 0.95, side: THREE.BackSide });
  const wall = (canvas, w, h) => { const geo = new THREE.PlaneGeometry(w, h); const o = new THREE.Group(); o.add(new THREE.Mesh(geo, printMat(tex(canvas, renderer), opts.finish === 'metallic' ? 'gloss' : opts.finish)), new THREE.Mesh(geo, kraft)); return o; };
  const front = wall(paintFace(brand, 'front', W / H), W, H); front.position.set(0, H / 2, D / 2); g.add(front);
  const back = wall(paintFace(brand, 'back', W / H), W, H); back.position.set(0, H / 2, -D / 2); back.rotation.y = Math.PI; g.add(back);
  const sideC = paintFace({ ...brand, logoScale: 0.6 }, 'side', D / H);
  for (const sx of [-1, 1]) { const sd = wall(sideC, D, H); sd.position.set((sx * W) / 2, H / 2, 0); sd.rotation.y = (sx * Math.PI) / 2; g.add(sd); }
  const bot = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: brand.pack })); bot.rotation.x = -Math.PI / 2; bot.position.y = 0.003; g.add(bot);
  // inner folded rim
  const rim = new THREE.Mesh(new THREE.BoxGeometry(W - 0.01, 0.06, D - 0.01), new THREE.MeshStandardMaterial({ color: '#c9a77c', roughness: 0.95, side: THREE.BackSide })); rim.position.y = H - 0.03; g.add(rim);
  // rope handles
  const ropeMat = new THREE.MeshStandardMaterial({ color: isDark(brand.pack) ? brand.accent : '#1c1a17', roughness: 0.7 });
  for (const z of [D / 2 - 0.012, -D / 2 + 0.012]) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-W * 0.2, H - 0.06, z), new THREE.Vector3(-W * 0.2, H + 0.12, z), new THREE.Vector3(-W * 0.1, H + 0.3, z), new THREE.Vector3(W * 0.1, H + 0.3, z), new THREE.Vector3(W * 0.2, H + 0.12, z), new THREE.Vector3(W * 0.2, H - 0.06, z)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.012, 8, false), ropeMat));
  }
  g.rotation.y = 0.5;
  return { group: shadowAll(g), height: H + 0.3, radius: Math.max(W, D) / 2 * 1.1 };
}

export const BUILDERS = { can: buildCan, box: buildBox, tub: buildTub, jar: buildJar, pouch: buildPouch, bottle: buildBottle, tube: buildTube, papertube: buildPaperTube, cup: buildCup, card: buildCard, bag: buildBag };
export const DEFAULTS = {
  can: { r: 0.33, h: 1.15 }, box: { w: 1.0, h: 1.3, d: 0.45 }, tub: { r: 0.5, h: 0.55 }, jar: { r: 0.38, h: 0.78 }, pouch: { w: 0.9, h: 1.25 },
  bottle: { r: 0.3, h: 1.45 }, tube: { r: 0.22, h: 1.2 }, papertube: { r: 0.3, h: 1.1 }, cup: { r: 0.4, h: 0.95 }, card: { w: 0.8, h: 1.2 }, bag: { w: 0.9, h: 1.0, d: 0.38 },
};
export const PRODUCT_NAMES = { can: 'Can', box: 'Box', tub: 'Tub', jar: 'Jar', pouch: 'Pouch', bottle: 'Bottle', tube: 'Tube', papertube: 'Paper tube', cup: 'Cup', card: 'Hang card', bag: 'Bag' };
// Printed area of each product, in mm (1 unit = 10 cm) — used by the print-ready PDF
export function printArea(product, d) {
  const C = (r) => 2 * Math.PI * r * 100;
  if (product === 'box') return { kind: 'box', w: (2 * d.d + 2 * d.w) * 100, h: (2 * d.d + d.h) * 100 };
  if (product === 'pouch' || product === 'card' || product === 'bag') return { kind: 'faces', w: d.w * 100, h: d.h * 100 };
  if (product === 'tub' || product === 'cup') { const rb = product === 'tub' ? d.r * 0.8 : d.r * 0.72; return { kind: 'wrap', w: Math.PI * (d.r + rb) * 100, h: d.h * 100 }; }
  if (product === 'jar') return { kind: 'wrap', w: C(d.r), h: d.h * 50 };
  if (product === 'bottle') return { kind: 'wrap', w: C(d.r), h: d.h * 42 };
  if (product === 'tube') return { kind: 'wrap', w: C(d.r * 1.1), h: d.h * 81 };
  return { kind: 'wrap', w: C(d.r), h: d.h * 80 };
}
