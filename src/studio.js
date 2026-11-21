import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// The virtual photo studio: a curved backdrop ("cyclorama"), soft lights, an environment
// map for realistic reflections, and a camera you can orbit.

const LIGHTS = {
  studio: { env: 1.0, key: [3.2, 0xffffff], keyPos: [3, 6, 4], fill: 0.6, exposure: 1.0, shadow: 0.35 },
  sunlit: { env: 0.7, key: [5.0, 0xffe2b8], keyPos: [-5, 4.5, 3], fill: 0.35, exposure: 1.05, shadow: 0.55 },
  dramatic: { env: 0.35, key: [7.0, 0xffffff], keyPos: [4, 5, -2], fill: 0.12, exposure: 0.95, shadow: 0.7 },
};

function cyclorama(color) {
  // floor that curves up into a wall: a seamless studio sweep
  const pts = [];
  const R = 3, floorZ = 8, wallH = 10;
  pts.push(new THREE.Vector3(0, 0, floorZ));
  pts.push(new THREE.Vector3(0, 0, -2));
  for (let i = 1; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; pts.push(new THREE.Vector3(0, R - Math.cos(a) * R, -2 - Math.sin(a) * R)); }
  pts.push(new THREE.Vector3(0, wallH, -2 - R));
  const geo = new THREE.BufferGeometry(); const pos = [], idx = [];
  const halfW = 14;
  pts.forEach((p) => { pos.push(-halfW, p.y, p.z, halfW, p.y, p.z); });
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }));
  m.receiveShadow = true;
  return m;
}

function contactShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,.55)'); grd.addColorStop(0.45, 'rgba(0,0,0,.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.002; m.renderOrder = 1;
  return m;
}

export class Studio {
  constructor(canvas) {
    this.canvas = canvas;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true }));
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
    this.camera.position.set(2.6, 1.6, 3.6);
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 1.2, maxDistance: 9, maxPolarAngle: Math.PI / 2 - 0.04, enablePan: false });
    this.key = new THREE.DirectionalLight(0xffffff, 3);
    this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048); this.key.shadow.radius = 8; this.key.shadow.bias = -0.0004;
    Object.assign(this.key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 });
    this.fill = new THREE.HemisphereLight(0xffffff, 0x888888, 0.6);
    this.scene.add(this.key, this.fill);
    this.backdrop = cyclorama('#efe3d2'); this.scene.add(this.backdrop);
    this.cshadow = contactShadow(); this.scene.add(this.cshadow);
    this.holder = new THREE.Group(); this.scene.add(this.holder);
    this.spin = 0; this.autoRotate = false; this.recording = null;
    this.setLight('studio');
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
    const loop = () => { requestAnimationFrame(loop); this.tick(); };
    loop();
  }

  resize(w = this.canvas.parentElement.clientWidth, h = this.canvas.parentElement.clientHeight) {
    if (this.recording) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  setLight(name) {
    const L = LIGHTS[name]; this.lightName = name;
    this.scene.environmentIntensity = L.env;
    this.key.intensity = L.key[0]; this.key.color.set(L.key[1]); this.key.position.set(...L.keyPos);
    this.fill.intensity = L.fill; this.renderer.toneMappingExposure = L.exposure;
    this.cshadow.material.opacity = L.shadow + 0.3;
  }
  setBackground(color, transparent = false) {
    this.bg = color; this.transparent = transparent;
    this.backdrop.material.color.set(color);
    this.backdrop.visible = !transparent;
    this.scene.background = transparent ? null : new THREE.Color(color);
  }

  setProduct(built, { keepCamera = false } = {}) {
    this.holder.clear();
    this.product = built; this.holder.add(built.group);
    const s = built.radius * 3.2; this.cshadow.scale.set(s, s, 1);
    this.target = new THREE.Vector3(0, built.height * 0.48, 0);
    this.controls.target.copy(this.target);
    if (!keepCamera) this.view('hero');
  }

  view(name) {
    const p = this.product; if (!p) return;
    const fit = Math.max(p.height, p.radius * 2.4);
    const dist = (fit / 2) / Math.tan((this.camera.fov * Math.PI) / 360) * 1.55;
    const dirs = { hero: [0.55, 0.32, 0.77], front: [0, 0.08, 1], top: [0.15, 0.95, 0.27], low: [0.6, 0.02, 0.8], wide: [0.35, 0.3, 0.9] };
    const d = new THREE.Vector3(...dirs[name]).normalize().multiplyScalar(dist * (name === 'wide' ? 2.1 : 1));
    const tgt = name === 'wide' ? this.target.clone().setY(this.target.y * 1.4) : this.target;
    this.controls.target.copy(tgt);
    this.camera.position.copy(tgt).add(d);
    this.controls.update();
  }

  tick() {
    if (this.autoRotate && !this.recording) this.holder.rotation.y += 0.006;
    if (this.foldAnim) {
      const t = Math.min(1, (performance.now() - this.foldAnim.t0) / this.foldAnim.dur);
      this.product?.fold?.(this.foldAnim.from + (this.foldAnim.to - this.foldAnim.from) * t);
      if (t >= 1) { this.foldAnim.done?.(); this.foldAnim = null; }
    }
    if (this.recording) this.recording.step();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  playFold(from = 0, to = 1, dur = 2600, done) { this.foldAnim = { from, to, dur, t0: performance.now(), done }; }

  // ---------- export ----------
  async snapshot(w, h, { transparent = false } = {}) {
    const prevT = this.transparent;
    if (transparent) this.setBackground(this.bg, true);
    const size = new THREE.Vector2(); this.renderer.getSize(size); const pr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1); this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    const blob = await new Promise((res) => this.renderer.domElement.toBlob(res, 'image/png'));
    this.renderer.setPixelRatio(pr); this.renderer.setSize(size.x, size.y, false);
    this.camera.aspect = size.x / size.y; this.camera.updateProjectionMatrix();
    if (transparent && !prevT) this.setBackground(this.bg, false);
    return blob;
  }

  // 360° turntable video, recorded straight from the WebGL canvas.
  recordTurntable(w, h, seconds = 6, onProgress) {
    return new Promise((resolve, reject) => {
      const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
      const mime = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
      if (!mime) return reject(new Error('Video recording is not supported in this browser'));
      const size = new THREE.Vector2(); this.renderer.getSize(size); const pr = this.renderer.getPixelRatio();
      this.renderer.setPixelRatio(1); this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      const stream = this.renderer.domElement.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const startRot = this.holder.rotation.y; const t0 = performance.now();
      const restore = () => {
        this.recording = null; this.holder.rotation.y = startRot;
        this.renderer.setPixelRatio(pr); this.renderer.setSize(size.x, size.y, false);
        this.camera.aspect = size.x / size.y; this.camera.updateProjectionMatrix();
      };
      rec.onstop = () => { restore(); resolve({ blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.includes('mp4') ? 'mp4' : 'webm' }); };
      this.recording = {
        step: () => {
          const t = (performance.now() - t0) / (seconds * 1000);
          const e = t < 1 ? t : 1;
          this.holder.rotation.y = startRot + e * Math.PI * 2;
          onProgress?.(e);
          if (t >= 1 && rec.state === 'recording') rec.stop();
        },
      };
      rec.start();
    });
  }
}
