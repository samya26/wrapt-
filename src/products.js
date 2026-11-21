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

export const BUILDERS = { can: buildCan, box: buildBox, tub: buildTub, jar: buildJar, pouch: buildPouch };
export const DEFAULTS = {
  can: { r: 0.33, h: 1.15 }, box: { w: 1.0, h: 1.3, d: 0.45 }, tub: { r: 0.5, h: 0.55 }, jar: { r: 0.38, h: 0.78 }, pouch: { w: 0.9, h: 1.25 },
};
