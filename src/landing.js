// The start page: a scroll-driven 3D story. Real Wrapt packs (built by the same engine as the
// studio) float, swap, unfold and line up as you scroll. Native scrolling drives a smoothed
// progress value, so it feels the same with a trackpad, mouse wheel or finger.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];

export function initLanding({ demos, onStart, onHow }) {
  const root = $('#landing'), canvas = $('#lp-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 5, 4); scene.add(key, new THREE.HemisphereLight(0xffffff, 0x9a8a78, 0.7));
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);

  // items: every demo pack, each with its own smoothed position / scale
  const items = demos(renderer).map((d, i) => {
    const holder = new THREE.Group(); holder.add(d.built.group); scene.add(holder);
    const k = 1.75 / Math.max(d.built.height, d.built.radius * 1.6);
    const ang = (i / 9) * Math.PI * 2;
    // floaters live on the right half and behind, so they never cover the headline
    return { ...d, holder, k, cur: { x: 0, y: 0, z: -4, s: 0 }, home: [0.9 + Math.abs(Math.cos(ang)) * 2.4, 0.2 + Math.sin(i * 1.7) * 1.1, -1.4 - (i % 3) * 1.0], phase: i * 1.3 };
  });
  const byKey = (k) => items.find((it) => it.key === k);
  const SECTIONS = $$('#landing .lp-sec').length;
  let target = 0, prog = 0, raf = 0, running = false, mobile = false, last = 0;

  const resize = () => {
    const w = innerWidth, h = innerHeight; mobile = w < 760;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = mobile ? 44 : 34; camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize); resize();
  root.addEventListener('scroll', () => { target = root.scrollTop / innerHeight; }, { passive: true });

  // reveal text with a 3D tilt as each section scrolls in
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('in', e.isIntersecting)), { root, threshold: 0.35 });
  $$('#landing .lp-sec').forEach((s) => io.observe(s));

  function frame(time) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, last ? (time - last) / 1000 : 0.016); last = time;
    const ease = (k) => 1 - Math.pow(1 - k, dt * 60); // same feel at any frame rate
    prog += (target - prog) * ease(0.085); // smooth, a little inertia
    const sec = Math.min(SECTIONS - 1, Math.floor(prog + 0.5)), t = prog - Math.floor(prog);
    const T = time / 1000;
    $('#lp-bar').style.transform = `scaleX(${Math.min(1, prog / (SECTIONS - 1))})`;
    // sketch → logo card (section 1)
    const s1 = Math.max(0, Math.min(1, 1 - Math.abs(prog - 1) * 1.6 + 0.4));
    const draw = Math.max(0, Math.min(1, (prog - 0.55) / 0.5));
    $$('.lp-sketch path').forEach((p) => (p.style.strokeDashoffset = String(1 - draw)));
    const clean = Math.max(0, Math.min(1, (prog - 1.0) / 0.3));
    $('.lp-sketch').style.opacity = String(1 - clean * 0.9); $('.lp-clean').style.opacity = String(clean); $('.lp-clean').style.transform = `scale(${0.9 + clean * 0.1})`;
    void s1;

    const side = mobile ? 0 : 1, fy = mobile ? 1.55 : 0.95, fs = mobile ? 0.62 : 1;
    // which pack is in focus, and where
    let focus = null, fx = 0;
    const cycle = ['pouch', 'bottle', 'can', 'card', 'tube', 'cup', 'bag'];
    if (sec === 0) { focus = 'can'; fx = 1.2 * side; }
    else if (sec === 1) { focus = 'card'; fx = 1.4 * side; }
    else if (sec === 2) { focus = cycle[Math.min(cycle.length - 1, Math.max(0, Math.floor((prog - 1.5) * cycle.length)))]; fx = -1.4 * side; }
    else if (sec === 3) { focus = `box${Math.min(3, Math.max(0, Math.floor((prog - 2.5) * 4)))}`; fx = 1.4 * side; }
    else if (sec === 4) { focus = 'box0'; fx = -1.35 * side; }
    const fold = sec === 4 ? 1 - Math.max(0, Math.min(1, (prog - 3.7) / 0.6)) : 1;
    byKey('box0')?.built.fold?.(fold);

    items.forEach((it, i) => {
      let x, y, z, s;
      if (it.key === focus) { x = fx; y = fy; z = 0.4; s = fs * (sec === 4 ? 0.5 + 0.5 * fold : 1); if (sec === 4) { x = fx * (1.15 - 0.15 * fold); y = fy + (1 - fold) * 0.2; } }
      else if (sec === 0) { x = it.home[0] * (mobile ? 0.7 : 1); y = it.home[1] + (mobile ? 0.3 : 0); z = it.home[2]; s = mobile || (it.key.startsWith('box') && it.key !== 'box0') ? 0 : 0.42; }
      else if (sec === SECTIONS - 1) { // finale: everything on a slow carousel
        const ring = items.filter((q) => !q.key.startsWith('box') || q.key === 'box0'), j = ring.indexOf(it);
        if (j < 0) { x = 0; y = 0; z = -6; s = 0; }
        else { const a = (j / ring.length) * Math.PI * 2 + T * 0.18; x = Math.sin(a) * (mobile ? 1.5 : 2.6); z = Math.cos(a) * 1.4 - 1.2; y = mobile ? 1.6 : 0.55; s = 0.5; }
      } else { x = it.cur.x; y = it.cur.y; z = -5; s = 0; }
      const c = it.cur, L = ease(0.09);
      c.x += (x - c.x) * L; c.y += (y - c.y) * L; c.z += (z - c.z) * L; c.s += (s - c.s) * ease(s > c.s ? 0.11 : 0.16);
      const sc = c.s * it.k;
      it.holder.visible = c.s > 0.01;
      it.holder.scale.setScalar(Math.max(0.0001, sc));
      const bob = Math.sin(T * 1.1 + it.phase) * 0.05;
      it.holder.position.set(c.x, c.y - (it.built.height * sc) / 2 + bob, c.z);
      const isFocus = it.key === focus;
      it.holder.rotation.y = (isFocus && sec === 4 ? -0.5 + fold * 0.3 : T * 0.35 + it.phase + prog * 1.4);
      it.holder.rotation.x = isFocus ? 0.06 : Math.sin(T * 0.6 + it.phase) * 0.12;
      it.holder.rotation.z = isFocus ? 0 : Math.cos(T * 0.5 + it.phase) * 0.08;
    });
    camera.position.set(Math.sin(prog * 0.7) * 0.35, 1.0 + prog * 0.02, 6.4);
    camera.lookAt(0, 0.92, 0);
    renderer.render(scene, camera);
  }
  const start = () => { if (running) return; running = true; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-start]')) { e.preventDefault(); leave(); }
    if (e.target.closest('#lp-how')) onHow?.();
    if (e.target.closest('[data-goto]')) root.scrollTo({ top: innerHeight * +e.target.closest('[data-goto]').dataset.goto, behavior: 'smooth' });
  });
  function leave() {
    root.classList.add('leaving');
    onStart?.();
    setTimeout(() => { root.hidden = true; root.classList.remove('leaving'); stop(); }, 750);
  }
  function show() { root.hidden = false; root.scrollTop = 0; target = prog = 0; resize(); start(); }
  show();
  return { show, leave, isOpen: () => !root.hidden };
}
