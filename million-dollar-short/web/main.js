// Engine: toon world + ink + grade + lens blur, canvas-drawn character cards. Exposes window.renderFrame(f).
import * as THREE from "three";
import * as T from "./toon.js";
import * as P from "./paint.js";
import * as P2 from "./paint2.js";
import { drawStick, fxBillDraw, fxZzzDraw, fxBurstDraw, fxMarkDraw } from "./stick.js";
import { frameState, TOTAL } from "./story.js";

const W = 1080, H = 1920, PX = W / 1080;
const NOINK = 1;
const canvas = document.createElement("canvas");
canvas.width = W; canvas.height = H;
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 3000);
camera.layers.enableAll();
scene.fog = new THREE.Fog(0xb8d0ec, 80, 900);

// ---------- toon materials ----------
const grad = (() => { const d = new Uint8Array([0, 0, 255, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const ctex = (c, rep = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap: grad, ...opts });
/** triplanar toon: world-space projected texture (scale = metres per tile) */
const triToon = (tex, scale, color = 0xffffff, extra = {}) => {
  const m = toon({ color, ...extra });
  m.customProgramCacheKey = () => "tri";
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tTri = { value: tex };
    sh.uniforms.triS = { value: 1 / scale };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTP; varying vec3 vTN;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vTP = (modelMatrix * vec4(transformed, 1.0)).xyz; vTN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D tTri; uniform float triS; varying vec3 vTP; varying vec3 vTN;")
      .replace("#include <map_fragment>", `{
        vec3 bw = pow(abs(vTN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 tc = texture2D(tTri, vTP.zy * triS).rgb * bw.x + texture2D(tTri, vTP.xz * triS).rgb * bw.y + texture2D(tTri, vTP.xy * triS).rgb * bw.z;
        vec3 ta = textureLod(tTri, vec2(0.5), 12.0).rgb;
        tc = mix(tc, ta, smoothstep(70.0, 320.0, distance(vTP, cameraPosition)) * 0.85);
        diffuseColor.rgb *= tc; }`);
  };
  return m;
};

const TEX = { leaf: ctex(P.leafTex(8, 512, "#5fa04a")) };
const MAT = { leaf: triToon(TEX.leaf, 3) };
const STACKMAT = (() => { const band = toon({ map: ctex(P2.bandTex(), false) }), top = toon({ map: ctex(P2.billTopTex(), false) }); return [band, band, top, band, band, band]; })();
const world = []; // meshes that get inked
const addW = (mesh, cast = true, recv = true) => { mesh.castShadow = cast; mesh.receiveShadow = recv; mesh.layers.set(0); scene.add(mesh); world.push(mesh); return mesh; };

// ---------- world ----------
const groundAt = () => 0;
const box = (w, h, d, mat, x, y, z, parent = null, cast = true) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true;
  if (parent) { parent.add(m); world.push(m); } else addW(m, cast, true);
  return m;
};
const cyl = (r0, r1, h, mat, x, y, z, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, y, z); return addW(m); };
const plane = (w, d, mat, x, y, z) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); return addW(m, false, true); };
const basic = (tex, color = 0xffffff) => new THREE.MeshBasicMaterial({ map: tex, color, fog: false });
const rnd = P.rng(77);

// --- STREET (origin 0,0): sidewalk z[-3.2,3] top y=0, road below at y=-0.15 ---
plane(400, 400, triToon(ctex(P2.asphalt()), 4), 0, -0.15, 30);
box(90, 0.15, 6.2, triToon(ctex(P2.concrete()), 1.6), 0, -0.075, -0.1, null, false);
box(90, 0.17, 0.25, toon({ color: 0xa9a49e }), 0, -0.07, 3.0, null, false);
for (let x = -44; x < 44; x += 4) box(2, 0.01, 0.18, toon({ color: 0xf4f1ea }), x, -0.14, 9.5, null, false);
plane(90, 4, triToon(ctex(P2.concrete()), 1.6), 0, -0.14, 18);
{
  const pal = ["#e07a4f", "#f2d7a6", "#8fa6c9", "#c9645a", "#e8b04a", "#7ab0a6", "#d9a0b8", "#b8c98a"];
  let x = -44, i = 0;
  while (x < 44) {
    const w = 6 + rnd() * 4, h = 8 + rnd() * 11, col = pal[i % pal.length];
    const side = toon({ color: new THREE.Color(col).multiplyScalar(0.85) });
    const front = toon({ map: ctex(P2.facade(50 + i, col, w, h), false) });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, h, 10), [side, side, side, side, front, side]);
    m.position.set(x + w / 2, h / 2, -3.2 - 5); addW(m);
    box(w + 0.1, 0.45, 10.4, toon({ color: new THREE.Color(col).multiplyScalar(0.7) }), x + w / 2, h + 0.22, -8.2);
    x += w; i++;
  }
  // across the street (seen in reverse shots)
  x = -44; i = 0;
  while (x < 44) {
    const w = 7 + rnd() * 4, h = 9 + rnd() * 10, col = pal[(i + 3) % pal.length];
    const side = toon({ color: new THREE.Color(col).multiplyScalar(0.85) });
    const front = toon({ map: ctex(P2.facade(80 + i, col, w, h), false) });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, h, 10), [side, side, side, side, side, front]);
    m.position.set(x + w / 2, h / 2, 25); addW(m); x += w; i++;
  }
}
const lamp = (x, z) => {
  const pm = toon({ color: 0x2f3446 });
  cyl(0.07, 0.09, 4.4, pm, x, 2.2, z, 10); box(0.9, 0.08, 0.1, pm, x + 0.4, 4.35, z);
  const h = cyl(0.22, 0.12, 0.25, toon({ color: 0x2f3446 }), x + 0.8, 4.22, z, 10); void h;
};
for (const x of [-12, 12, 24, -24]) lamp(x + 3.5, 2.75);
const blobTree = (x, z, s, y0 = 0) => {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.16 * s, 2.2 * s, 8), toon({ color: 0x7a5236 })); t.position.y = 1.1 * s; g.add(t);
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s * (0.6 + rnd() * 0.3), 1), MAT.leaf); b.position.set((rnd() - 0.5) * s * 1.1, 2.4 * s + rnd() * 0.6 * s, (rnd() - 0.5) * s * 1.1); b.scale.y = 0.8; g.add(b); }
  g.position.set(x, y0, z); g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; world.push(o); } }); scene.add(g); return g;
};
for (const x of [-18, -6.5, 6.5, 18]) { box(1.2, 0.35, 1.2, toon({ color: 0x9a948c }), x, 0.17, 2.3); blobTree(x, 2.3, 1.1, 0.3); }
{ // hydrant, bench, bin
  const red = toon({ color: 0xd8323a }); cyl(0.16, 0.18, 0.7, red, -9.0, 0.35, 2.4, 12); cyl(0.2, 0.2, 0.1, red, -9.0, 0.72, 2.4, 12); box(0.5, 0.12, 0.12, red, -9.0, 0.45, 2.4);
  const wood = toon({ color: 0xb87a46 }), mt = toon({ color: 0x2f3446 });
  box(2.0, 0.08, 0.5, wood, -3.2, 0.5, -2.6); box(2.0, 0.45, 0.08, wood, -3.2, 0.8, -2.85); for (const s of [-0.85, 0.85]) box(0.08, 0.5, 0.45, mt, -3.2 + s, 0.25, -2.6);
  cyl(0.28, 0.24, 0.85, toon({ color: 0x3f7a4f }), 5.0, 0.42, -2.6, 12);
}

// --- MANSION interior (200,0) ---
{
  const X = 200;
  plane(18, 14, triToon(ctex(P2.checker()), 2.4), X, 0.002, 0);
  const teal = triToon(ctex(P2.plaster(512, "#2f8a86")), 5), gold = toon({ color: 0xe0b440 }), cream = toon({ color: 0xf2e6c8 });
  box(18, 6.5, 0.3, teal, X, 3.25, -5.15); box(0.3, 6.5, 12, teal, X - 9, 3.25, 0.8); box(0.3, 6.5, 12, teal, X + 9, 3.25, 0.8);
  box(18, 0.3, 0.1, gold, X, 0.15, -4.98); box(18, 0.12, 0.1, gold, X, 4.6, -4.98);
  for (const s of [-6.5, -2.2, 2.2, 6.5]) { cyl(0.32, 0.36, 5.6, cream, X + s, 2.8, -4.55, 18); box(0.95, 0.3, 0.95, gold, X + s, 5.65, -4.55); box(0.95, 0.25, 0.95, gold, X + s, 0.12, -4.55); }
  for (const s of [-4.35, 4.35]) { // tall windows
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6), basic(ctex(P2.skyline(false), false))); w.position.set(X + s, 2.7, -4.99); w.layers.set(NOINK); scene.add(w);
    box(2.9, 0.18, 0.12, cream, X + s, 0.85, -4.95); box(2.9, 0.18, 0.12, cream, X + s, 4.55, -4.95); box(0.16, 3.8, 0.12, cream, X + s - 1.38, 2.7, -4.95); box(0.16, 3.8, 0.12, cream, X + s + 1.38, 2.7, -4.95); box(0.08, 3.6, 0.1, cream, X + s, 2.7, -4.94);
  }
  // painting
  box(1.6, 1.2, 0.08, gold, X, 3.0, -4.92); const pt = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.95), toon({ map: ctex(P2.posterTex(4), false) })); pt.position.set(X, 3.0, -4.87); addW(pt, false, false);
  // red carpet
  const cg = new THREE.PlaneGeometry(4.4, 7); cg.rotateX(-Math.PI / 2); const carpet = new THREE.Mesh(cg, toon({ color: 0xc8303c })); carpet.position.set(X, 0.01, -0.5); addW(carpet, false, true);
  box(4.4, 0.012, 0.15, gold, X, 0.012, -4.0, null, false); box(4.4, 0.012, 0.15, gold, X, 0.012, 3.0, null, false);
  // gold couch
  const red = toon({ color: 0xa8263a });
  box(3.0, 0.5, 1.0, red, X + 5.6, 0.45, -3.6); box(3.0, 1.0, 0.25, red, X + 5.6, 1.0, -4.1); box(0.3, 0.75, 1.0, gold, X + 4.1, 0.55, -3.6); box(0.3, 0.75, 1.0, gold, X + 7.1, 0.55, -3.6);
  // chandelier
  cyl(0.03, 0.03, 1.4, gold, X, 5.6, -1.5, 6); cyl(0.9, 0.5, 0.35, gold, X, 4.75, -1.5, 18);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1b8 })); b.position.set(X + Math.cos(a) * 0.85, 5.0, -1.5 + Math.sin(a) * 0.85); b.layers.set(NOINK); scene.add(b); }
  // money piles (static) + gold bars
  const stackGeo = new THREE.BoxGeometry(0.36, 0.09, 0.17);
  const pile = (x, z, n) => { for (let j = 0; j < n; j++) { const m = new THREE.Mesh(stackGeo, STACKMAT); const l = Math.floor(Math.sqrt(j)); m.position.set(x + ((j * 0.37) % 1.1) - 0.5, 0.045 + (j % 4) * 0.09, z + ((j * 0.53) % 0.8) - 0.4); m.rotation.y = (rnd() - 0.5) * 0.4; void l; addW(m); } };
  pile(X - 5.2, -3.4, 28); pile(X - 3.4, -3.9, 16); pile(X + 3.1, -2.3, 12);
  for (let i = 0; i < 5; i++) box(0.4, 0.14, 0.2, gold, X - 5.6 + i * 0.3, 0.07 + (i % 2) * 0.14, -1.9);
}

// --- MANSION exterior (400,0) ---
{
  const X = 400;
  plane(200, 200, triToon(ctex(P2.grass()), 6), X, 0.001, 0);
  plane(22, 12, triToon(ctex(P2.concrete()), 1.6), X, 0.01, -3.5);
  const white = toon({ color: 0xf6f0e4 }), roof = toon({ color: 0x8a3b32 }), dark = toon({ color: 0x2a3550 });
  const fw = 24, fh = 10;
  const front = toon({ map: ctex(P2.facade(99, "#f6f0e4", fw, fh), false) });
  const mb = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 10), [white, white, white, white, front, white]); mb.position.set(X, fh / 2, -17); addW(mb);
  box(fw + 0.8, 0.6, 10.8, roof, X, fh + 0.3, -17);
  const roofG = new THREE.ConeGeometry(15, 4, 4, 1); const rf = new THREE.Mesh(roofG, roof); rf.rotation.y = Math.PI / 4; rf.scale.set(1.15, 1, 0.5); rf.position.set(X, fh + 2.6, -17); addW(rf);
  for (let i = 0; i < 6; i++) cyl(0.35, 0.4, 7, white, X - 6.25 + i * 2.5, 3.5, -11.3, 18);
  box(15.5, 0.9, 2.6, white, X, 7.4, -11.4); box(15, 0.4, 3, toon({ color: 0xd9d1c0 }), X, 0.2, -11.0);
  box(2.2, 3.4, 0.2, toon({ color: 0x6a3b22 }), X, 1.7, -11.95);
  for (const s of [-1, 1]) { blobTree(X + s * 15, -9, 1.6); blobTree(X + s * 9.5, -8.5, 1.2); }
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), MAT.leaf); b.position.set(X - 11 + i * 4.4 + (i > 2 ? 4 : 0), 0.5, -10.4); b.scale.y = 0.7; addW(b); }
  // sports car (along x, nose to +x) centred at (X-0.6, -2)
  const car = new THREE.Group();
  const shape = new THREE.Shape([[-2.2, 0.28], [2.2, 0.28], [2.3, 0.62], [1.05, 0.82], [0.25, 1.25], [-0.95, 1.28], [-1.9, 0.92], [-2.25, 0.75]].map(([x, y]) => new THREE.Vector2(x, y)));
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.8, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }), toon({ color: 0xd8262f }));
  body.position.z = -0.9; car.add(body);
  const glass = new THREE.Shape([[1.0, 0.86], [0.27, 1.2], [-0.88, 1.22], [-1.7, 0.92]].map(([x, y]) => new THREE.Vector2(x, y)));
  const gl = new THREE.Mesh(new THREE.ExtrudeGeometry(glass, { depth: 1.86, bevelEnabled: false }), toon({ color: 0x24324f })); gl.position.z = -0.93; car.add(gl);
  const tyre = toon({ color: 0x1b1c22 }), hub = toon({ color: 0xc9ccd4 });
  for (const sx of [-1.35, 1.35]) for (const sz of [-0.95, 0.95]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 20), tyre); w.rotation.x = Math.PI / 2; w.position.set(sx, 0.38, sz); car.add(w);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 14), hub); h.rotation.x = Math.PI / 2; h.position.set(sx, 0.38, sz); car.add(h);
  }
  for (const sz of [-0.6, 0.6]) { const hl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff6c8 })); hl.position.set(2.28, 0.58, sz); car.add(hl); }
  car.position.set(X - 0.6, 0, -2.2);
  car.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; world.push(o); } }); scene.add(car);
  // hedge in the foreground (neighbours peek over it)
  box(1.7, 0.95, 0.8, triToon(ctex(P2.hedge()), 1.5), X + 1.5, 0.47, 0.5);
  box(6, 1.05, 0.9, triToon(ctex(P2.hedge()), 1.5), X + 1.9, 0.52, -6.6);
}

// --- BEDROOM (600,0) ---
const BED = { win: null, nightSky: null, daySky: null, lampShade: null, lampMat: null };
{
  const X = 600;
  plane(14, 10, triToon(ctex(P2.planks(512, "#c98a4e")), 2.2), X, 0.002, 0);
  const wall = triToon(ctex(P2.plaster()), 4), wall2 = triToon(ctex(P2.plaster(512, "#d9663d")), 4), cream = toon({ color: 0xf4ecda });
  // back wall with a window hole x[600.5,602.7] y[1.1,3.0]
  box(5.6, 4.4, 0.25, wall, X - 3.7, 2.2, -3.3); box(5.4, 4.4, 0.25, wall, X + 4.0, 2.2, -3.3);
  box(2.2, 1.1, 0.25, wall, X + 0.2, 0.55, -3.3); box(2.2, 1.4, 0.25, wall, X + 0.2, 3.7, -3.3);
  box(0.25, 4.4, 9, wall2, X - 5.6, 2.2, 1.2);
  box(2.5, 0.14, 0.4, cream, X + 0.2, 1.06, -3.15); box(2.5, 0.14, 0.32, cream, X + 0.2, 3.04, -3.2);
  box(0.14, 2.1, 0.32, cream, X - 0.97, 2.05, -3.2); box(0.14, 2.1, 0.32, cream, X + 1.37, 2.05, -3.2); box(0.07, 1.9, 0.12, cream, X + 0.2, 2.05, -3.28); box(2.2, 0.07, 0.12, cream, X + 0.2, 2.05, -3.28);
  box(14, 0.18, 0.08, cream, X, 0.09, -3.15, null, false);
  BED.nightSky = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), basic(ctex(P2.skyline(true), false))); BED.nightSky.position.set(X + 0.2, 2.4, -6); BED.nightSky.layers.set(NOINK); scene.add(BED.nightSky);
  BED.daySky = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), basic(ctex(P2.skyline(false), false))); BED.daySky.position.set(X + 0.2, 2.4, -6.01); BED.daySky.layers.set(NOINK); scene.add(BED.daySky);
  // bed
  const wood = triToon(ctex(P2.planks(256, "#8a5a32")), 1.2), sheet = toon({ color: 0xf4f1ea }), blanket = toon({ color: 0x2f8f8a });
  box(2.7, 1.35, 0.18, wood, X - 1.6, 0.68, -3.05); box(2.7, 0.35, 2.7, wood, X - 1.6, 0.18, -1.65);
  box(2.6, 0.38, 2.6, sheet, X - 1.6, 0.54, -1.65); box(1.6, 0.25, 0.6, sheet, X - 1.6, 0.85, -2.6);
  box(2.66, 0.2, 1.75, blanket, X - 1.6, 0.8, -1.12); box(0.08, 0.5, 1.75, blanket, X - 0.27, 0.6, -1.12); box(2.66, 0.5, 0.08, blanket, X - 1.6, 0.6, -0.24);
  // nightstand + lamp
  box(0.7, 0.7, 0.6, wood, X + 1.9, 0.35, -2.8);
  cyl(0.06, 0.12, 0.4, toon({ color: 0x2f3446 }), X + 1.9, 0.9, -2.8, 10);
  BED.lampMat = new THREE.MeshBasicMaterial({ color: 0xf2d28a }); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.35, 16, 1, true), BED.lampMat); sh.position.set(X + 1.9, 1.22, -2.8); sh.layers.set(NOINK); scene.add(sh);
  // clock + poster
  const ck = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), toon({ map: ctex(P2.clockTex(2, 5), false) })); ck.position.set(X - 3.6, 3.0, -3.16); addW(ck, false, false);
  const ps = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.06), toon({ map: ctex(P2.posterTex(1), false) })); ps.position.set(X + 3.2, 2.3, -3.16); addW(ps, false, false);
  const rg = new THREE.CircleGeometry(1.6, 40); rg.rotateX(-Math.PI / 2); const rug = new THREE.Mesh(rg, toon({ color: 0x1fa3a0 })); rug.scale.z = 0.6; rug.position.set(X + 1.8, 0.01, 0.3); addW(rug, false, true);
}

// --- POLICE STATION (800,0) ---
{
  const X = 800;
  plane(16, 12, triToon(ctex(P2.tiles(512, "#c4ccd4")), 2.4), X, 0.002, 0);
  const wall = triToon(ctex(P2.plaster(512, "#a9bfd3")), 4), navy = toon({ color: 0x2f4a7a }), wood = triToon(ctex(P2.planks(256, "#9a6a40")), 1.2);
  box(16, 4.6, 0.25, wall, X, 2.3, -4.3); box(16, 1.15, 0.08, navy, X, 0.57, -4.14);
  box(0.25, 4.6, 9, wall, X + 6.5, 2.3, 0.2); box(0.25, 4.6, 9, wall, X - 6.5, 2.3, 0.2);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), toon({ map: ctex(P2.signTex("POLICE", "#1f2d5a", "#f0c94a"), false) })); sg.position.set(X - 0.2, 3.35, -4.15); addW(sg, false, false);
  box(1.9, 1.3, 0.06, toon({ color: 0xb98a56 }), X - 3.2, 2.2, -4.15);
  for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), toon({ map: ctex(P2.posterTex(i + 6), false) })); p.position.set(X - 3.75 + i * 0.55, 2.2, -4.11); p.rotation.z = (i - 1) * 0.05; addW(p, false, false); }
  // door on the right
  box(1.3, 2.5, 0.08, toon({ color: 0x5a3b22 }), X + 3.6, 1.25, -4.12); box(1.5, 0.12, 0.12, toon({ color: 0xf2ecdc }), X + 3.6, 2.56, -4.1);
  // desk
  box(3.0, 0.1, 1.2, wood, X + 0.3, 1.05, -1.35); box(3.0, 1.0, 0.1, navy, X + 0.3, 0.5, -0.78);
  const st = new THREE.Mesh(new THREE.CircleGeometry(0.22, 5), toon({ color: 0xe8c045 })); st.position.set(X + 0.3, 0.55, -0.72); st.rotation.z = Math.PI / 2; addW(st, false, false);
  box(0.75, 0.5, 0.06, toon({ color: 0x23263a }), X + 1.25, 1.42, -1.75); box(0.08, 0.2, 0.08, toon({ color: 0x23263a }), X + 1.25, 1.15, -1.75); box(0.62, 0.4, 0.02, new THREE.MeshBasicMaterial({ color: 0x7fc8f0 }), X + 1.25, 1.42, -1.71);
  box(0.42, 0.04, 0.3, toon({ color: 0xf8f6ef }), X - 0.9, 1.12, -1.4); cyl(0.07, 0.07, 0.16, toon({ color: 0xd8323a }), X - 0.5, 1.18, -1.55, 12);
  // plant
  cyl(0.25, 0.2, 0.5, toon({ color: 0xc9645a }), X - 5.2, 0.25, -3.6, 12); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), MAT.leaf); b.position.set(X - 5.2 + (rnd() - 0.5) * 0.4, 0.8 + i * 0.25, -3.6 + (rnd() - 0.5) * 0.3); addW(b); }
}

// --- dynamic props: bags + cash stacks ---
const bagPool = [];
for (let i = 0; i < 2; i++) {
  const g = new THREE.Group(), blk = toon({ color: 0x2a2c35 });
  const cap = new THREE.CapsuleGeometry(0.2, 0.42, 6, 16); cap.rotateZ(Math.PI / 2);
  const b = new THREE.Mesh(cap, blk); b.position.y = 0.2; b.scale.set(1, 1, 1.1); g.add(b);
  const z = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, 0.035), toon({ color: 0x9aa0b0 })); z.position.set(0, 0.405, 0); g.add(z);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 20, Math.PI), toon({ color: 0x15161c })); hd.position.set(0, 0.4, 0); g.add(hd);
  const flap = new THREE.Group(); g.add(flap);
  const fill = new THREE.Group(); g.add(fill);
  const sg = new THREE.BoxGeometry(0.3, 0.075, 0.14);
  for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(sg, STACKMAT); m.position.set(-0.22 + k * 0.145, 0.34 + (k % 2) * 0.05, (k % 2 ? 0.03 : -0.03)); m.rotation.set(0.15 * (k - 1.5), 0.3 * (k - 1.5), Math.PI / 2 - 0.35 + k * 0.2); fill.add(m); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; world.push(o); } });
  g.visible = false; scene.add(g);
  bagPool.push({ g, flap, fill, hd });
}
const stackPool = [];
{ const geo = new THREE.BoxGeometry(0.36, 0.09, 0.17); for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(geo, STACKMAT); m.visible = false; addW(m); stackPool.push(m); } }
const siren = new THREE.PointLight(0xff2020, 0, 30, 0); scene.add(siren);

// ---------- sky + clouds ----------
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, sunSize: { value: 0 } },
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }",
  fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunSize; varying vec3 vD;
  void main(){ float h = clamp(vD.y, 0.0, 1.0); vec3 c = mix(mix(hor, mid, smoothstep(0.0, 0.22, h)), top, smoothstep(0.18, 0.85, h));
    float s = max(dot(normalize(vD), sunDir), 0.0); c += sunCol * (pow(s, 12.0) * 0.35 + smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.7, s) * 2.0);
    gl_FragColor = vec4(c, 1.0); }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), skyMat);
sky.layers.set(NOINK); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
const clouds = [];
for (let i = 0; i < 10; i++) {
  const t = ctex(P.cloudCanvas(i + 3), false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  const a = (i / 10) * Math.PI * 2 + 0.3, r = 850 + (i % 3) * 120;
  m.userData.base = [Math.cos(a) * r, 160 + (i % 4) * 45, Math.sin(a) * r - 100]; m.scale.setScalar(260 + (i % 3) * 90);
  m.layers.set(NOINK); scene.add(m); clouds.push(m);
}

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun); scene.add(sun.target);

// ---------- cards ----------
const SC = 0.00225; // metres per design unit
const cards = new Map();
const drawFn = {
  front: (p, a) => T.bodyFrontX(p, a.outfit, a.opts),
  side: (p, a) => T.bodySideX(p, a.outfit, a.opts),
  stick: (p, a) => drawStick(p.g, a.outfit, a.opts),
};
const blobTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; T.fxBlob(new T.Pen(c.getContext("2d")), "#7d7f96"); return ctex(c, false); })();
const multiply = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, fog: false, polygonOffset: true, polygonOffsetFactor: -2 });
const ndCardMat = (map, pullU) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map }, uPull: pullU }, side: THREE.DoubleSide,
  vertexShader: "uniform float uPull; varying vec2 vUv; varying float vZ; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); float d = length(mv.xyz); mv.xyz *= max(0.15, (d - uPull) / d); vZ = -mv.z; gl_Position = projectionMatrix * mv; }",
  fragmentShader: "uniform sampler2D map; varying vec2 vUv; varying float vZ; void main(){ if (texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, vZ); }",
});
const getCard = (id, DW, DH) => {
  let c = cards.get(id);
  if (c && c.DW === DW && c.DH === DH) return c;
  if (c) { scene.remove(c.mesh); scene.remove(c.blob); }
  const sc = DW > 600 ? 1.6 : 2;
  const cv = document.createElement("canvas"); cv.width = Math.round(DW * sc); cv.height = Math.round(DH * sc);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(DW * SC, DH * SC); geo.translate(0, (DH * SC) / 2 - 25 * SC, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const pullU = { value: 0.3 };
  mat.customProgramCacheKey = () => "cardpull";
  mat.onBeforeCompile = (sh) => { sh.uniforms.uPull = pullU; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uPull;").replace("#include <project_vertex>", "#include <project_vertex>\n{ float d = length(mvPosition.xyz); mvPosition.xyz *= max(0.15, (d - uPull) / d); gl_Position = projectionMatrix * mvPosition; }"); };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.order = "YXZ"; mesh.castShadow = true; mesh.layers.set(NOINK);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  mesh.userData.nd = ndCardMat(tex, pullU);
  const bg = new THREE.PlaneGeometry(1.1, 0.55); bg.rotateX(-Math.PI / 2);
  const blob = new THREE.Mesh(bg, multiply(blobTex)); blob.layers.set(NOINK);
  scene.add(mesh); scene.add(blob);
  c = { id, DW, DH, sc, cv, g: cv.getContext("2d"), tex, mesh, blob, key: "", pullU };
  cards.set(id, c);
  return c;
};
const fxCards = new Map();
const fxDraw = {
  burst: (p, s) => T.fxBurst(p, s.t, s.col || "#fff3b0"), puff: (p, s) => T.fxPuff(p, s.t), chips: (p, s) => T.fxChips(p, s.t, s.seed || 1),
  shards: (p, s) => T.fxShards(p, s.seed || 1), pot: (p) => T.fxPot(p), bird: (p, s) => T.fxBird(p, s.t), smoke: (p, s) => T.fxSmoke(p, s.t),
  glow: (p) => T.fxGlow(p), hammer: (p) => T.fxHammerProp(p),
  bill: (p, s) => fxBillDraw(p.g, 200, 120, s.t, s.seed || 1), zzz: (p, s) => fxZzzDraw(p.g, 300, 300, s.t), ray: (p, s) => fxBurstDraw(p.g, 500, 500, s.t, s.col), mark: (p, s) => fxMarkDraw(p.g, 300, 300, s.t, s.txt || "!"),
};
const FXSIZE = { burst: [500, 500], puff: [300, 300], chips: [400, 400], shards: [400, 200], pot: [300, 300], bird: [200, 100], smoke: [300, 600], glow: [256, 256], hammer: [420, 200], bill: [200, 120], zzz: [300, 300], ray: [500, 500], mark: [300, 300] };
const getFx = (id, kind) => {
  let c = fxCards.get(id);
  if (c && c.kind === kind) return c;
  const [w, h] = FXSIZE[kind];
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, h / w), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: kind !== "glow", blending: kind === "glow" ? THREE.AdditiveBlending : THREE.NormalBlending }));
  mesh.layers.set(NOINK); scene.add(mesh);
  c = { id, kind, cv, g: cv.getContext("2d"), tex, mesh, key: "" };
  fxCards.set(id, c);
  return c;
};

// ---------- post ----------
const rtColor = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtND = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const rtPost = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const ndWorld = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: "varying vec3 vN; varying float vZ; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }",
  fragmentShader: "varying vec3 vN; varying float vZ; void main(){ vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0); gl_FragColor = vec4(n, vZ); }",
});
const FSV = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); fsQuad.frustumCulled = false; fsScene.add(fsQuad);
const inkMat = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: rtColor.texture }, tND: { value: rtND.texture }, texel: { value: new THREE.Vector2(1 / W, 1 / H) }, px: { value: PX },
    inkCol: { value: new THREE.Color(0x0b0a0c) }, fogCol: { value: new THREE.Color() }, sat: { value: 1.08 }, expo: { value: 1 },
    lift: { value: new THREE.Vector3(0.02, 0.025, 0.05) }, gain: { value: new THREE.Vector3(1, 1, 1) }, vign: { value: 0.18 }, flash: { value: 0 }, inkK: { value: 1 }, dbg: { value: 0 },
  },
  vertexShader: FSV,
  fragmentShader: `uniform sampler2D tColor; uniform sampler2D tND; uniform vec2 texel; uniform float px; uniform vec3 inkCol; uniform vec3 fogCol;
  uniform float sat; uniform float expo; uniform vec3 lift; uniform vec3 gain; uniform float vign; uniform float flash; uniform float inkK; uniform float dbg; varying vec2 vUv;
  vec3 shoulder(vec3 x){ return mix(x, 0.78 + 0.3 * (1.0 - exp(-(x - 0.78) / 0.3)), step(0.78, x)); }
  void main(){
    vec3 c = texture2D(tColor, vUv).rgb * expo;
    vec4 nd = texture2D(tND, vUv); float zc = nd.a > 0.0 ? nd.a : 1e5; vec3 nc = nd.xyz;
    float ink = 0.0;
    if (dot(nc, nc) > 0.25 && zc < 4000.0) {
      float w = mix(5.0, 3.2, smoothstep(1.8, 4.5, log(zc))) * px;
      float bD = 99.0, bC = 99.0;
      for (int d = 0; d < 4; d++) {
        vec2 st = d == 0 ? vec2(1.0, 0.0) : d == 1 ? vec2(0.0, 1.0) : d == 2 ? vec2(0.7071, 0.7071) : vec2(0.7071, -0.7071);
        for (int s = 1; s <= 6; s++) {
          float fs = float(s);
          float fl = fs * (d > 1 ? 1.4142 : 1.0);
          if (fl > w + 1.0) break;
          vec2 o = st * texel * fs;
          vec4 a = texture2D(tND, vUv + o), b = texture2D(tND, vUv - o);
          if (a.a <= 0.0) a.a = 1e5; if (b.a <= 0.0) b.a = 1e5;
          float k = 2.0 - zc / a.a - zc / b.a;
          if (k > 0.02) bD = min(bD, fl);
          if (dot(a.xyz, a.xyz) > 0.25 && abs(a.a - zc) < zc * 0.03 && dot(a.xyz, nc) < 0.7) bC = min(bC, fl);
          if (dot(b.xyz, b.xyz) > 0.25 && abs(b.a - zc) < zc * 0.03 && dot(b.xyz, nc) < 0.7) bC = min(bC, fl);
        }
      }
      float iD = 1.0 - smoothstep(w - 0.6, w + 0.4, bD);
      float iC = (1.0 - smoothstep(w * 0.7 - 0.6, w * 0.7 + 0.4, bC)) * 0.85;
      ink = max(iD, iC) * (1.0 - smoothstep(170.0, 560.0, zc)) * inkK;
    }
    vec3 ic = mix(inkCol, fogCol * 0.55, 0.3 * smoothstep(60.0, 400.0, zc));
    c = mix(c, ic, ink);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, sat);
    c = c * gain + lift * (1.0 - clamp(c, 0.0, 1.0));
    c = shoulder(c);
    vec2 q = (vUv - 0.5) * vec2(0.75, 1.0);
    c *= 1.0 - vign * smoothstep(0.25, 0.75, length(q));
    c = mix(c, vec3(1.0), flash);
    if (dbg > 0.5) c = vec3(ink, zc / 60.0, dot(nc, nc));
    gl_FragColor = vec4(c, 1.0);
  }`,
});
const dofMat = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: rtPost.texture }, tND: { value: rtND.texture }, texel: { value: new THREE.Vector2(1 / W, 1 / H) }, focus: { value: 10 }, cInf: { value: 0 }, cMax: { value: 18 } },
  vertexShader: FSV,
  fragmentShader: `uniform sampler2D tColor; uniform sampler2D tND; uniform vec2 texel; uniform float focus; uniform float cInf; uniform float cMax; varying vec2 vUv;
  float coc(float z){ z = z > 0.0 ? z : 1e5; return min(cMax, cInf * abs(1.0 - focus / max(z, 0.05))); }
  vec3 enc(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main(){
    vec3 c0 = texture2D(tColor, vUv).rgb;
    float cc = coc(texture2D(tND, vUv).a);
    if (cInf < 0.3 || cc < 0.6) { gl_FragColor = vec4(enc(c0), 1.0); return; }
    vec3 acc = c0; float ws = 1.0;
    for (int i = 0; i < 48; i++) {
      float fi = float(i) + 0.5, r = sqrt(fi / 48.0) * cc, a = fi * 2.39996;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * texel;
      float cq = coc(texture2D(tND, uv).a);
      float w = clamp(cq - r + 1.0, 0.0, 1.0);
      acc += texture2D(tColor, uv).rgb * w; ws += w;
    }
    gl_FragColor = vec4(enc(acc / ws), 1.0);
  }`,
});

// ---------- per-frame ----------
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const col = (c) => new THREE.Color(c);
const applyLight = (L, S) => {
  const d = new THREE.Vector3(Math.cos(L.el * Math.PI / 180) * Math.cos(L.az * Math.PI / 180), Math.sin(L.el * Math.PI / 180), Math.cos(L.el * Math.PI / 180) * Math.sin(L.az * Math.PI / 180)).normalize();
  sun.color.setRGB(L.sun[0], L.sun[1], L.sun[2]); sun.intensity = Math.PI;
  hemi.color.setRGB(L.amb[0], L.amb[1], L.amb[2]); hemi.groundColor.setRGB(L.gnd[0], L.gnd[1], L.gnd[2]); hemi.intensity = Math.PI;
  const c = v3(S.shadow.c), r = S.shadow.r;
  sun.position.copy(c).addScaledVector(d, 200); sun.target.position.copy(c);
  const sc = sun.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 420; sc.updateProjectionMatrix();
  skyMat.uniforms.top.value.copy(col(L.top)).convertSRGBToLinear(); skyMat.uniforms.hor.value.copy(col(L.hor)).convertSRGBToLinear(); skyMat.uniforms.mid.value.copy(col(L.mid)).convertSRGBToLinear();
  skyMat.uniforms.sunDir.value.copy(d); skyMat.uniforms.sunCol.value.setRGB(L.sun[0] * 0.6, L.sun[1] * 0.5, L.sun[2] * 0.4); skyMat.uniforms.sunSize.value = L.disc || 0;
  scene.fog.color.copy(col(L.hor)).convertSRGBToLinear(); scene.fog.near = L.fog[0]; scene.fog.far = L.fog[1];
  inkMat.uniforms.fogCol.value.copy(scene.fog.color);
  inkMat.uniforms.sat.value = L.sat; inkMat.uniforms.expo.value = L.expo ?? 1;
  inkMat.uniforms.lift.value.set(L.lift[0], L.lift[1], L.lift[2]); inkMat.uniforms.gain.value.set(L.gain[0], L.gain[1], L.gain[2]);
  return d;
};

const camRightOf = () => { const r = new THREE.Vector3(); camera.matrixWorld.extractBasis(r, new THREE.Vector3(), new THREE.Vector3()); return r; };

window.renderFrame = (f) => {
  const S = frameState(f);
  // camera
  camera.position.set(...S.cam.pos); camera.up.set(0, 1, 0); camera.lookAt(...S.cam.look);
  camera.fov = S.cam.fov; camera.updateProjectionMatrix();
  if (S.cam.roll) camera.rotateZ((S.cam.roll * Math.PI) / 180);
  camera.updateMatrixWorld();
  const camR = camRightOf();
  applyLight(S.light, S);
  // dynamic props
  const W_ = S.world;
  bagPool.forEach((B, i) => {
    const s = (W_.bags || [])[i];
    B.g.visible = !!s; if (!s) return;
    B.g.position.set(...s.pos); B.g.rotation.set(s.rx || 0, s.ry || 0, s.rz || 0);
    B.fill.visible = (s.open || 0) > 0.05; B.fill.position.y = -0.05 + (s.open || 0) * 0.05; B.z = 0;
  });
  stackPool.forEach((m, i) => { const s = (W_.stacks || [])[i]; m.visible = !!s; if (!s) return; m.position.set(...s.pos); m.rotation.set(...(s.rot || [0, 0, 0])); });
  siren.intensity = W_.siren ? W_.siren.k : 0;
  if (W_.siren) { siren.position.set(...W_.siren.pos); siren.color.set(W_.siren.col); }
  BED.nightSky.visible = !!W_.night; BED.daySky.visible = !W_.night;
  BED.lampMat.color.set(W_.lampOn ? 0xffe2a0 : 0x6b6450);
  if (W_.night && W_.siren) BED.nightSky.material.color.set(W_.siren.k > 0.5 ? W_.siren.col : 0xffffff); else BED.nightSky.material.color.set(0xffffff);
  // cards
  const seen = new Set();
  for (const a of S.actors) {
    const DW = a.wide ? 1000 : 600, DH = a.wide ? 1150 : 1000;
    const c = getCard(a.id, DW, DH); seen.add(a.id);
    const key = a.kind + JSON.stringify(a.opts) + (a.outfitKey || "");
    if (key !== c.key) {
      c.key = key;
      c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.clearRect(0, 0, c.cv.width, c.cv.height);
      c.g.setTransform(c.sc, 0, 0, c.sc, 0, 0); c.g.translate((DW - 600) / 2, DH - 1000);
      drawFn[a.kind](new T.Pen(c.g), a);
      c.tex.needsUpdate = true;
    }
    const y = a.y ?? 0;
    c.mesh.position.set(a.pos[0], y + (a.lift || 0), a.pos[1]);
    const s = a.scale || 1;
    let mirror = 1;
    if (a.kind === "side" && a.dir) mirror = a.dir[0] * camR.x + a.dir[1] * camR.z < 0 ? -1 : 1;
    c.mesh.scale.set(s * mirror, s, s);
    c.mesh.rotation.set(0, Math.atan2(camera.position.x - a.pos[0], camera.position.z - a.pos[1]), ((a.roll || 0) * Math.PI) / 180);
    c.mesh.material.color.setRGB(...S.light.card);
    c.pullU.value = a.pull ?? 0.3;
    c.mesh.visible = a.visible !== false;
    c.blob.visible = a.visible !== false && a.blob !== false && !a.lift;
    c.blob.position.set(a.pos[0], (a.floor ?? 0) + 0.03, a.pos[1]);
    c.blob.scale.setScalar(s);
    c.blob.rotation.y = c.mesh.rotation.y;
  }
  for (const [id, c] of cards) if (!seen.has(id)) { c.mesh.visible = false; c.blob.visible = false; }
  // fx
  const seenFx = new Set();
  for (const e of (window.NOFX ? [] : S.fx)) {
    const c = getFx(e.id, e.kind); seenFx.add(e.id);
    const key = JSON.stringify([e.t, e.seed, e.col, e.txt]);
    if (key !== c.key) {
      c.key = key; c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.clearRect(0, 0, c.cv.width, c.cv.height);
      fxDraw[e.kind](new T.Pen(c.g), e); c.tex.needsUpdate = true;
    }
    c.mesh.position.set(...e.pos);
    if (e.flat) { c.mesh.rotation.set(-Math.PI / 2, 0, e.rot || 0); }
    else { c.mesh.quaternion.copy(camera.quaternion); if (e.rot) c.mesh.rotateZ(e.rot); }
    c.mesh.scale.set(e.size * (e.mirror ? -1 : 1), e.size, e.size);
    c.mesh.material.opacity = e.alpha ?? 1;
    c.mesh.material.color.setRGB(...(e.kind === "glow" ? [1, 1, 1] : S.light.card));
    c.mesh.visible = true;
  }
  for (const [id, c] of fxCards) if (!seenFx.has(id)) c.mesh.visible = false;
  // clouds drift
  for (const [i, m] of clouds.entries()) { const b = m.userData.base; m.position.set(b[0] + f * 0.25 * (1 + (i % 3) * 0.3), b[1], b[2]); m.quaternion.copy(camera.quaternion); m.material.color.setRGB(...S.light.cloud); }
  sky.position.copy(camera.position);

  // pass 1: colour
  renderer.shadowMap.enabled = true; renderer.shadowMap.needsUpdate = true;
  renderer.setRenderTarget(rtColor); renderer.setClearColor(0x000000, 1); renderer.clear();
  renderer.render(scene, camera);
  // pass 2: normal + depth (world inked, cards = depth only, everything else hidden)
  const hidden = [], swapped = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    if (o.userData.nd) { swapped.push([o, o.material]); o.material = o.userData.nd; }
    else if (world.includes(o)) { swapped.push([o, o.material]); o.material = ndWorld; }
    else { hidden.push(o); o.visible = false; }
  });
  const fog = scene.fog; scene.fog = null; renderer.shadowMap.enabled = false;
  renderer.setRenderTarget(rtND); renderer.setClearColor(0x000000, 0); renderer.clear();
  renderer.render(scene, camera);
  scene.fog = fog;
  for (const [o, m] of swapped) o.material = m;
  for (const o of hidden) o.visible = true;
  // pass 3: ink + grade
  inkMat.uniforms.dbg.value = window.INKDBG ? 1 : 0;
  inkMat.uniforms.flash.value = S.flash || 0; inkMat.uniforms.vign.value = S.vign ?? 0.18;
  fsQuad.material = inkMat; renderer.setRenderTarget(rtPost); renderer.render(fsScene, fsCam);
  // pass 4: lens blur -> screen
  dofMat.uniforms.focus.value = S.dof.focus; dofMat.uniforms.cInf.value = window.NODOF ? 0 : S.dof.cInf * PX;
  fsQuad.material = dofMat; renderer.setRenderTarget(null); renderer.render(fsScene, fsCam);
  return canvas.toDataURL("image/jpeg", 0.95);
};
window.TOTAL = TOTAL;
window.dbgND = () => { const out = []; const buf = new Float32Array(4); for (const [x, y] of [[540, 1700], [540, 1200], [540, 900], [540, 700], [300, 300], [800, 1500]]) { renderer.readRenderTargetPixels(rtND, x, y, 1, 1, buf); out.push([x, y, ...Array.from(buf).map((v) => +v.toFixed(3))]); } return JSON.stringify(out); };
window.ready = true;
