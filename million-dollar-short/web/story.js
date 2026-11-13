// "What If You Found $1,000,000?" staging: every value is a pure function of the frame number.
import { clamp, lin, smooth, smoother, easeOut, back, lerp, lerp3, add3, camKeys, kick, blinkAt, q } from "./motion.js";

export const FPS = 30, TOTAL = 860;

// ---------------- outfits ----------------
const HERO = { shirt: "#f2b632", hat: "beanie", hatCol: "#2f9e9a", bobble: "#f4f1ea" };
const COP = { shirt: "#3f63b5", hat: "police", badge: 1, tie: "#1f2d5a" };
const OLD = { shirt: "#9a6b4a", hat: "old", glasses: 1, moustache: "#f2f1ee", cardigan: 1 };
const N1 = { shirt: "#8a5ac9", hat: "curly", hair: "#2a2233" };
const N2 = { shirt: "#e0607a", hat: "bun", hair: "#5a3322" };

// ---------------- light presets ----------------
const LP = {
  day: { az: 68, el: 52, sun: [1.22, 1.12, 0.98], amb: [0.42, 0.42, 0.5], gnd: [0.34, 0.3, 0.26], top: "#3f80d4", mid: "#8fb7e6", hor: "#c4d8ee", fog: [120, 1300], sat: 1.12, lift: [0.02, 0.025, 0.05], gain: [1, 1, 1], card: [1, 1, 1], cloud: [1, 1, 1], disc: 0 },
  inside: { az: 62, el: 55, sun: [1.2, 1.06, 0.9], amb: [0.46, 0.43, 0.48], gnd: [0.36, 0.3, 0.26], top: "#3f80d4", mid: "#8fb7e6", hor: "#c4d8ee", fog: [120, 1300], sat: 1.1, lift: [0.025, 0.02, 0.04], gain: [1.02, 1, 0.97], card: [1, 0.99, 0.96], cloud: [1, 1, 1], disc: 0 },
  night: { az: 70, el: 50, sun: [0.32, 0.38, 0.7], amb: [0.18, 0.2, 0.36], gnd: [0.07, 0.08, 0.14], top: "#0d1838", mid: "#1f3058", hor: "#34496f", fog: [80, 900], sat: 0.95, lift: [0.01, 0.02, 0.05], gain: [0.95, 1, 1.08], card: [0.62, 0.66, 0.9], cloud: [0.32, 0.4, 0.58], disc: 0 },
  moon: { az: 75, el: 48, sun: [0.5, 0.56, 0.86], amb: [0.22, 0.24, 0.4], gnd: [0.12, 0.12, 0.2], top: "#14204a", mid: "#2a3b6a", hor: "#3c5180", fog: [80, 900], sat: 0.95, lift: [0.02, 0.025, 0.06], gain: [0.98, 1, 1.06], card: [0.8, 0.83, 1.0], cloud: [0.4, 0.48, 0.66], disc: 0 },
};

// ---------------- helpers ----------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dist = (a, b) => Math.hypot(...sub(a, b));
const ext = (f, a, b) => f >= a && f < b;
const hash = (k) => { const x = Math.sin(k * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };
const life = (f, seed, amp = 6) => ({ by: q(Math.sin(f * 0.19 + seed) * amp, 1), tilt: q(1.6 * Math.sin(f * 0.071 + seed * 1.3), 0.5), blink: blinkAt(f, seed) });
const walkPh = (d) => q(d / 0.9, 1 / 16);
const walkBob = (ph) => q(-Math.abs(Math.sin(ph * Math.PI * 2)) * 14, 2);
const stick = (id, outfit, pos, opts, extra = {}) => ({ id, kind: "stick", outfit, outfitKey: id, pos, opts, ...extra });
const flashAt = (f, f0, n = 6) => (f >= f0 && f < f0 + n ? 0.9 * (1 - (f - f0) / n) : 0);
const sirenAt = (f, pos, k = 2.6) => ({ pos, col: Math.floor(f / 6) % 2 ? 0x3050ff : 0xff2a2a, k: k * (0.75 + 0.25 * Math.sin(f * 0.9)) });
const swingArms = (ph) => { const s = Math.sin(ph * Math.PI * 2) > 0; return [s ? [10, 215] : [-60, 210], s ? [-60, 210] : [10, 215]]; };

// ---------------- the bag + the cash burst (shared by the hook and the loop ending) ----------------
const BAG = [0.45, 0, 0.95];
const STACKS = Array.from({ length: 16 }, (_, i) => ({
  v: [(hash(i * 3 + 1) - 0.5) * 3.2, 2.0 + hash(i * 3 + 2) * 1.8, 0.3 + hash(i * 3 + 3) * 1.9],
  spin: [(hash(i + 40) - 0.5) * 14, (hash(i + 50) - 0.5) * 14, (hash(i + 60) - 0.5) * 14], yaw: hash(i + 70) * 3,
}));
const BILLS = Array.from({ length: 12 }, (_, i) => ({ v: [(hash(i + 100) - 0.5) * 3.0, 2.4 + hash(i + 110) * 1.6, -0.3 + hash(i + 120) * 0.9], seed: i + 1, fall: 0.35 + hash(i + 130) * 0.25 }));
const G = 6.5;
/** cash state tb frames after the burst (tb < 0: nothing yet) */
const cashAt = (tb) => {
  const stacks = [], fx = [];
  if (tb < 0) return { stacks, fx };
  const o = [BAG[0], 0.42, BAG[2]];
  STACKS.forEach((s, i) => {
    const t = Math.max(0, tb / 30 - i * 0.012);
    const tl = (s.v[1] + Math.sqrt(s.v[1] ** 2 + 2 * G * (o[1] - 0.045))) / G, tt = Math.min(t, tl), k = tt / tl;
    const y = o[1] + s.v[1] * tt - 0.5 * G * tt * tt;
    stacks.push({ pos: [o[0] + s.v[0] * tt, Math.max(0.045, y), o[2] + s.v[2] * tt], rot: [s.spin[0] * tt * (1 - k), s.yaw + s.spin[1] * tt, s.spin[2] * tt * (1 - k)] });
  });
  BILLS.forEach((b, i) => {
    const t = tb / 30, up = Math.min(t, 0.35);
    const y0 = o[1] + b.v[1] * up - 0.5 * G * up * up, td = Math.max(0, t - 0.35);
    const y = y0 - b.fall * td;
    if (y < 0.03) return;
    fx.push({ id: "bill" + i, kind: "bill", pos: [o[0] + b.v[0] * (up + td * 0.35) + Math.sin(t * 3 + i) * 0.15, y, o[2] + b.v[2] * (up + td * 0.3)], size: 0.3, t: q((t * 0.8 + i * 0.13) % 1, 0.02), seed: b.seed });
  });
  return { stacks, fx };
};
/** hook camera as a function of burst time (continuous across the loop) */
const hookCam = (tb) => camKeys([
  { f: 0, pos: [0.3, 1.05, 4.9], look: [0.05, 0.92, 0.5], fov: 42 },
  { f: 120, pos: [0.18, 0.9, 3.7], look: [0.1, 0.85, 0.55], fov: 40, ease: (t) => t },
], tb);
const heroKneel = (f, extra = {}) => stick("hero", HERO, [-0.45, 0.45], { legs: "kneel", expr: "shock", blink: blinkAt(f, 3), ...extra }, { pull: 0.3 });

// ---------------- shots ----------------
const SHOTS = [];
const shot = (id, a, b, fn) => SHOTS.push({ id, a, b, fn });

// 1 HOOK (0-78): cash already bursting out of the bag, hero on his knees (loops from the last shot)
shot("hook", 0, 78, (f) => {
  const tb = f + 38, cam = hookCam(tb), cash = cashAt(tb);
  const lf = life(f, 3, 3);
  const actors = [heroKneel(f, { armL: f < 24 ? "up" : "mouth", armR: f < 24 ? "up" : "hang", by: lf.by, tilt: lf.tilt, lookY: 0.4 })];
  const fx = [...cash.fx];
  if (ext(f, 36, 50)) fx.push({ id: "tingray", kind: "ray", pos: [BAG[0], 0.75, BAG[2] + 0.3], size: 1.4, t: q((f - 36) / 14, 0.07), col: "#fff3b0" });
  return { cam, L: LP.day, actors, fx, world: { bags: [{ pos: BAG, open: 1 }], stacks: cash.stacks }, kicks: [{ f: 36, a: 0.008 }], dof: { focus: dist(cam.pos, [0, 1, 0.6]), cInf: 9 }, shadow: { c: [0, 0, 0.5], r: 6 } };
});

// 2 "Nobody saw you. What do you do?" (78-142): look left, look right, trembling hand toward the bag
shot("look", 78, 142, (f) => {
  const tb = f + 38, cash = cashAt(tb), h0 = hookCam(116);
  const cam = camKeys([
    { f: 78, pos: h0.pos, look: h0.look, fov: h0.fov },
    { f: 104, pos: [0.4, 1.55, 6.2], look: [0.05, 1.15, 0.2], fov: 42 },
    { f: 116, pos: [0.35, 1.5, 5.8], look: [0.05, 1.12, 0.2], fov: 42, ease: (t) => t },
    { f: 132, pos: [-0.05, 1.15, 4.3], look: [-0.12, 0.98, 0.5], fov: 42, ease: easeOut },
    { f: 142, pos: [-0.06, 1.12, 4.05], look: [-0.12, 0.98, 0.5], fov: 42, ease: (t) => t },
  ], f);
  let look = 0;
  if (f < 84) look = 0; else if (f < 97) look = -smooth(lin(84, 89, f)); else if (f < 112) look = lerp(-1, 1, smooth(lin(97, 102, f))); else look = lerp(1, 0.5, smooth(lin(112, 118, f)));
  const reach = f >= 119;
  const actors = [heroKneel(f, { expr: f < 116 ? "worried" : "gulp", look: q(look, 0.05), armL: "hang", armR: reach ? "shake" : "hang", shakeHand: reach ? q((f - 119) * 0.7, 0.35) : 0, tilt: q(look * -4, 0.5) })];
  return { cam, L: LP.day, actors, fx: cash.fx, world: { bags: [{ pos: BAG, open: 1 }], stacks: cash.stacks }, dof: { focus: dist(cam.pos, [-0.2, 1.1, 0.5]), cInf: f > 120 ? 11 : 6 }, shadow: { c: [0, 0, 0.5], r: 7 } };
});

// 3 "Keep it," (142-172): grabs the bag, hugs it, greedy grin
shot("keep", 142, 172, (f) => {
  const cam = camKeys([{ f: 142, pos: [0.6, 1.0, 3.6], look: [0.05, 1.45, 0.3], fov: 40 }, { f: 172, pos: [0.45, 0.95, 3.1], look: [0.05, 1.5, 0.3], fov: 39, ease: (t) => t }], f);
  const grab = f >= 149;
  const lf = life(f, 3, 4);
  const sq = grab ? q(-10 * Math.sin(Math.min(1, (f - 149) / 6) * Math.PI), 1) : 0;
  const actors = [stick("hero", HERO, [0.0, 0.4], { expr: grab ? "greedy" : "sly", armL: grab ? "hug" : "hang", armR: grab ? "hug" : "hang", prop: grab ? "bagHold" : null, by: lf.by + sq, tilt: grab ? q(-4 + lf.tilt, 0.5) : lf.tilt, blink: lf.blink }, { pull: 0.3 })];
  const world = grab ? {} : { bags: [{ pos: [0.0, 0, 0.75], open: 1 }] };
  return { cam, L: LP.day, actors, fx: [], world, kicks: [{ f: 149, a: 0.012 }], dof: { focus: dist(cam.pos, [0, 1.5, 0.4]), cInf: 10 }, shadow: { c: [0, 0, 0.4], r: 6 } };
});

// 4 "and in most countries that's theft." (172-245): mansion, dancing in raining cash; police light on "theft"
shot("mansion", 172, 245, (f) => {
  const X = 200, A = [X - 0.2, -0.6];
  const cam = camKeys([
    { f: 172, pos: [X + 1.2, 2.0, 6.4], look: [X - 0.1, 1.75, -1.6], fov: 42 },
    { f: 224, pos: [X - 0.8, 1.8, 5.4], look: [X - 0.1, 1.75, -1.4], fov: 41, ease: smooth },
    { f: 233, pos: [X - 0.25, 1.55, 3.9], look: [X - 0.2, 1.55, -0.6], fov: 40, ease: easeOut, roll: -3 },
    { f: 245, pos: [X - 0.22, 1.5, 3.6], look: [X - 0.2, 1.55, -0.6], fov: 40, roll: -3.5, ease: (t) => t },
  ], f);
  const theft = f >= 227;
  const ph = ((f - 172) / 22) % 1, up = Math.sin(ph * Math.PI * 2) > 0;
  const opts = theft
    ? { expr: "gulp", armL: "hang", armR: "hang", look: q(lerp(0, 0.8, smooth(lin(227, 233, f))), 0.05), blink: 0, by: 0 }
    : { expr: "happy", legs: "dance", phase: q(ph, 1 / 22), armL: up ? "up" : "dance", armR: up ? "dance" : "up", by: q(-Math.abs(Math.sin(ph * Math.PI * 2)) * 30, 2), tilt: q(Math.sin(ph * Math.PI * 2) * 6, 1), blink: blinkAt(f, 3) };
  const actors = [stick("hero", HERO, A, opts, { pull: 0.3 })];
  const fx = [];
  for (let i = 0; i < 18; i++) {
    const k = (((f - 172) / 30 + hash(i) * 3) / 3) % 1;
    fx.push({ id: "rain" + i, kind: "bill", pos: [X - 2.6 + hash(i + 7) * 5.2 + Math.sin(f * 0.08 + i) * 0.2, 5.2 - k * 5.4, -2.2 + hash(i + 9) * 3.6], size: 0.32, t: q((f * 0.025 + hash(i)) % 1, 0.02), seed: i + 3 });
  }
  if (ext(f, 227, 240)) fx.push({ id: "gulpmark", kind: "mark", pos: [A[0] + 0.55, 2.55, A[1] + 0.3], size: 0.7, t: q((f - 227) / 13, 0.08), txt: "!" });
  const world = f >= 222 ? { siren: sirenAt(f, [X + 3, 3.2, 3], 2.2 * smooth(lin(222, 228, f))) } : {};
  return { cam, L: LP.inside, actors, fx: fx.filter((e) => e.pos[1] > 0.05), world, flash: flashAt(f, 172), kicks: [{ f: 227, a: 0.02 }], dof: { focus: dist(cam.pos, [A[0], 1.6, A[1]]), cInf: f > 228 ? 10 : 5 }, shadow: { c: [X, 0, -1], r: 9 } };
});

// 5 "Big cash spending gets noticed fast. Rich today..." (245-358): sports car, neighbours peek over the hedge
shot("car", 245, 358, (f) => {
  const X = 400, H = [X - 0.9, -0.5];
  const cam = camKeys([
    { f: 245, pos: [X + 0.5, 1.5, 8.0], look: [X + 0.45, 1.3, -0.8], fov: 42 },
    { f: 326, pos: [X + 0.42, 1.47, 7.3], look: [X + 0.4, 1.3, -0.8], fov: 42, ease: (t) => smooth(t) },
    { f: 340, pos: [X - 0.65, 1.6, 3.4], look: [X - 0.9, 1.55, -0.6], fov: 39, ease: easeOut },
    { f: 358, pos: [X - 0.7, 1.58, 3.0], look: [X - 0.9, 1.55, -0.6], fov: 39, ease: (t) => t },
  ], f);
  const rich = f >= 330;
  const lf = life(f, 3, 4);
  const laugh = rich ? q(Math.abs(Math.sin((f - 330) * 0.45)) * -16, 2) : 0;
  const actors = [stick("hero", HERO, H, { expr: rich ? "happy" : "sly", shades: 1, armR: "fan", prop: "fan", armL: "hip", by: lf.by + laugh, tilt: rich ? q(Math.sin((f - 330) * 0.45) * 4, 1) : lf.tilt, blink: 0 }, { pull: 0.3 })];
  const pop1 = smooth(lin(250, 262, f)), pop2 = smooth(lin(262, 274, f));
  actors.push(stick("n1", N1, [X + 1.2, 0.0], { expr: "shock", look: -1, armL: "mouth", armR: "hang", blink: blinkAt(f, 11), by: q(lerp(260, 0, pop1), 2) }, { pull: 0.1, blob: false }));
  const call = f >= 289;
  actors.push(stick("n2", N2, [X + 1.85, -0.2], { expr: call ? "worried" : "shock", look: call ? -0.6 : -1, armL: call ? "phone" : "hang", prop: call ? "phone" : null, blink: blinkAt(f, 17), by: q(lerp(260, 0, pop2), 2) }, { pull: 0.2, blob: false }));
  const fx = [];
  if (ext(f, 289, 300)) fx.push({ id: "callmark", kind: "mark", pos: [X + 2.15, 2.55, 0.1], size: 0.55, t: q((f - 289) / 11, 0.1), txt: "!" });
  return { cam, L: LP.day, actors, fx, world: {}, kicks: [{ f: 289, a: 0.008 }], dof: { focus: dist(cam.pos, rich ? [H[0], 1.6, H[1]] : [X, 1.4, 0]), cInf: rich ? 10 : 4 }, shadow: { c: [X, 0, 0], r: 9 } };
});

// 6 "...scared every night." (358-410): bedroom at night, siren light through the window
const heroBed = (f, opts) => stick("hero", HERO, [598.75, -2.3], { blanket: "#2f8f8a", armL: null, armR: null, ...opts }, { y: 0.13, pull: 0.12, blob: false });
shot("night", 358, 410, (f) => {
  const X = 600;
  const cam = camKeys([{ f: 358, pos: [X + 0.75, 1.8, 3.2], look: [X - 0.45, 1.55, -2.4], fov: 44 }, { f: 410, pos: [X + 0.45, 1.7, 2.0], look: [X - 0.55, 1.5, -2.4], fov: 43, ease: (t) => t }], f);
  const jolt = f >= 364 ? q(-14 * Math.sin(Math.min(1, (f - 364) / 5) * Math.PI), 1) : 0;
  const actors = [heroBed(f, { expr: "scared", look: q(0.7 + 0.2 * Math.sin(f * 0.13), 0.05), clutch: 1, by: jolt, bx: q(Math.sin(f * 2.1) * 3, 1), blink: 0 })];
  return { cam, L: LP.night, actors, fx: [], world: { night: true, siren: sirenAt(f, [X + 0.2, 2.1, -2.5], 2.2), lampOn: false }, vign: 0.3, kicks: [{ f: 364, a: 0.012 }], dof: { focus: dist(cam.pos, [X - 1.2, 1.6, -2.2]), cInf: 7 }, shadow: { c: [X - 0.5, 0, -1.5], r: 6 } };
});

// 7 "Return it, and the owner gets everything back." (410-500): police station
const DESKBAG = [800.0, 1.1, -1.3];
shot("station", 410, 500, (f) => {
  const X = 800;
  const cam = camKeys([
    { f: 410, pos: [X - 0.05, 1.75, 5.2], look: [X - 0.15, 1.35, -1.0], fov: 42 },
    { f: 440, pos: [X + 0.15, 1.75, 5.5], look: [X + 0.05, 1.35, -1.0], fov: 42, ease: (t) => t },
    { f: 470, pos: [X + 0.55, 1.8, 6.6], look: [X + 0.4, 1.3, -0.9], fov: 44 },
    { f: 500, pos: [X + 0.5, 1.75, 6.2], look: [X + 0.4, 1.32, -0.9], fov: 44, ease: (t) => t },
  ], f);
  const put = f >= 416;
  const lf = life(f, 3, 4);
  const hero = stick("hero", HERO, [X - 0.75, -0.15], { expr: put ? "smile" : "neutral", armL: put ? (f < 426 ? "give" : "hang") : "hug", armR: put ? (f < 426 ? "give" : "hip") : "hug", prop: put ? null : "bagHold", by: lf.by, tilt: lf.tilt, blink: lf.blink, look: f > 445 ? q(smooth(lin(445, 452, f)), 0.05) : 0.3 }, { pull: 0.3 });
  const shock = f >= 420;
  const cop = stick("cop", COP, [X + 0.5, -2.05], { expr: shock ? "shock" : "neutral", by: shock ? q(-18 * Math.sin(Math.min(1, (f - 420) / 6) * Math.PI), 1) : life(f, 21, 3).by, blink: shock ? 0 : blinkAt(f, 21), look: f > 452 ? q(smooth(lin(452, 458, f)), 0.05) : -0.3 }, { pull: 0.2 });
  const actors = [hero, cop];
  const fx = [];
  if (f >= 444) {
    const k = smooth(lin(444, 472, f)), ox = lerp(X + 3.6, X + 1.5, k), oz = lerp(-3.4, -0.25, k);
    const walking = f < 472, grab = f >= 478, ph = walkPh(Math.hypot(ox - X - 3.6, oz + 3.4));
    actors.push(stick("old", OLD, [ox, oz], { expr: grab ? "cry" : "shock", legs: walking ? "walk" : "stand", phase: ph, armR: grab ? "hug" : "cane", armL: grab ? "hug" : "hang", prop: grab ? "bagHold" : "cane", by: walking ? walkBob(ph) : q(Math.sin((f - 478) * 0.5) * -6, 2), blink: blinkAt(f, 31), look: walking ? -0.6 : 0 }, { pull: 0.3 }));
    if (ext(f, 478, 490)) fx.push({ id: "joy", kind: "ray", pos: [X + 1.5, 1.6, 0.0], size: 1.6, t: q((f - 478) / 12, 0.08), col: "#fff3b0" });
  }
  if (ext(f, 420, 433)) fx.push({ id: "copmark", kind: "mark", pos: [X + 0.95, 2.6, -1.8], size: 0.65, t: q((f - 420) / 13, 0.08), txt: "!" });
  const bags = put && f < 478 ? [{ pos: DESKBAG, ry: -0.1, rz: f < 422 ? q(Math.sin((f - 416) * 1.4) * 0.05, 0.01) : 0 }] : [];
  return { cam, L: LP.inside, actors, fx, world: { bags }, kicks: [{ f: 416, a: 0.01 }, { f: 420, a: 0.008 }], dof: { focus: dist(cam.pos, [X, 1.5, -0.8]), cInf: 5 }, shadow: { c: [X + 0.5, 0, -1], r: 8 } };
});

// 8 "Some places even give finders a reward." (500-572): old man thanks him, hands over an envelope
shot("reward", 500, 572, (f) => {
  const X = 800;
  const cam = camKeys([{ f: 500, pos: [X + 0.32, 1.72, 5.0], look: [X + 0.3, 1.4, -0.3], fov: 42 }, { f: 572, pos: [X + 0.3, 1.66, 4.4], look: [X + 0.3, 1.42, -0.3], fov: 42, ease: (t) => t }], f);
  const give = f >= 536, handed = f >= 551;
  const lf = life(f, 3, 4);
  const hero = stick("hero", HERO, [X - 0.35, 0.05], { expr: handed ? "happy" : "smile", armL: "hang", armR: give ? "give" : "hip", prop: handed ? "envelope" : null, look: 0.5, by: lf.by, tilt: lf.tilt, blink: lf.blink }, { pull: 0.3 });
  const old = stick("old", OLD, [X + 0.95, -0.1], { expr: "cry", armL: give && !handed ? "give" : "hang", armR: "cane", prop: give && !handed ? "envelopeL" : "cane", look: -0.5, by: q(Math.sin(f * 0.4) * -5, 1), blink: blinkAt(f, 31) }, { pull: 0.3 });
  const fx = [];
  if (ext(f, 551, 563)) fx.push({ id: "ting", kind: "ray", pos: [X + 0.2, 1.55, 0.4], size: 1.2, t: q((f - 551) / 12, 0.08), col: "#fff3b0" });
  const cop = stick("cop", COP, [X + 0.5, -2.05], { expr: "smile", blink: blinkAt(f, 21), by: life(f, 21, 3).by }, { pull: 0.2 });
  return { cam, L: LP.inside, actors: [hero, old, cop], fx, world: { bags: [{ pos: [X + 1.75, 0, 0.35], ry: 0.3 }] }, dof: { focus: dist(cam.pos, [X + 0.3, 1.5, 0]), cInf: 9 }, shadow: { c: [X + 0.3, 0, -0.5], r: 7 } };
});

// 9 "Less money," (572-602): insert, the modest reward + a THANK YOU note
shot("note", 572, 602, (f) => {
  const X = 800;
  const cam = camKeys([{ f: 572, pos: [X - 0.3, 1.52, 2.25], look: [X - 0.35, 1.32, 0.05], fov: 34 }, { f: 602, pos: [X - 0.32, 1.5, 1.95], look: [X - 0.35, 1.32, 0.05], fov: 34, ease: (t) => t }], f);
  const lf = life(f, 3, 3);
  const hero = stick("hero", HERO, [X - 0.35, 0.05], { expr: f < 580 ? "smile" : "happy", armL: "hold", armR: "hold", prop: "note", lookY: 0.6, by: lf.by, blink: lf.blink }, { pull: 0.3 });
  return { cam, L: LP.inside, actors: [hero], fx: [], world: {}, dof: { focus: dist(cam.pos, [X - 0.35, 1.3, 0.1]), cInf: 12 }, shadow: { c: [X, 0, -0.5], r: 6 } };
});

// 10 "but no fear." (602-640): asleep, smiling, moonlight
shot("sleep", 602, 640, (f) => {
  const X = 600;
  const cam = camKeys([{ f: 602, pos: [X + 0.6, 1.75, 2.8], look: [X - 0.5, 1.5, -2.4], fov: 43 }, { f: 640, pos: [X + 0.35, 1.68, 1.9], look: [X - 0.6, 1.48, -2.4], fov: 42, ease: (t) => t }], f);
  const actors = [heroBed(f, { expr: "sleep", tilt: 13, by: q(Math.sin(f * 0.15) * 5, 1) })];
  const fx = [{ id: "zzz", kind: "zzz", pos: [X - 0.4, 2.6, -2.1], size: 0.9, t: q(((f - 602) / 45) % 1, 0.02) }];
  return { cam, L: LP.moon, actors, fx, world: { night: true, lampOn: true }, flash: flashAt(f, 602, 5) * 0.6, vign: 0.24, dof: { focus: dist(cam.pos, [X - 1.2, 1.6, -2.2]), cInf: 6 }, shadow: { c: [X - 0.5, 0, -1.5], r: 6 } };
});

// 11 "Now be honest: what would YOU do?" (640-706): walking down the street, turns and points at the viewer
const WALKZ = 0.75;
shot("honest", 640, 706, (f) => {
  const x = lerp(4.6, 1.6, smooth(lin(640, 680, f)) * 0.85 + lin(640, 680, f) * 0.15);
  const walking = f < 680;
  const cam = camKeys([
    { f: 640, pos: [4.2, 1.5, 5.0], look: [4.4, 1.3, 0.4], fov: 41 },
    { f: 680, pos: [1.8, 1.45, 4.8], look: [1.6, 1.3, 0.4], fov: 41, ease: (t) => t },
    { f: 690, pos: [1.65, 1.5, 3.3], look: [1.6, 1.45, 0.5], fov: 40, ease: easeOut },
    { f: 706, pos: [1.65, 1.5, 3.1], look: [1.6, 1.45, 0.5], fov: 40, ease: (t) => t },
  ], f);
  const ph = walkPh(4.6 - x), [aL, aR] = swingArms(ph);
  const point = f >= 684;
  const hero = stick("hero", HERO, [x, WALKZ], { expr: point ? "grin" : "smile", legs: walking ? "walk" : "stand", phase: ph, by: walking ? walkBob(ph) : (point ? q(-8 * Math.sin(Math.min(1, (f - 684) / 6) * Math.PI), 1) : 0), armR: point ? "point" : (walking ? aR : "hang"), armL: walking ? aL : "hip", look: walking ? -0.6 : 0, blink: blinkAt(f, 3), tilt: point ? -3 : 0 }, { pull: 0.3 });
  return { cam, L: LP.day, actors: [hero], fx: [], world: { bags: [{ pos: BAG, ry: 0.15 }] }, kicks: [{ f: 686, a: 0.012 }], dof: { focus: dist(cam.pos, [x, 1.5, WALKZ]), cInf: f > 684 ? 10 : 5 }, shadow: { c: [x, 0, 0.5], r: 7 } };
});

// 12 "Comment KEEP or RETURN..." (706-772): two signs pop up
shot("signs", 706, 772, (f) => {
  const x = 1.6;
  const cam = camKeys([{ f: 706, pos: [1.65, 1.6, 5.9], look: [1.6, 1.55, 0.5], fov: 42 }, { f: 772, pos: [1.62, 1.55, 5.3], look: [1.6, 1.55, 0.5], fov: 42, ease: (t) => t }], f);
  const pL = f < 725 ? 0 : back(clamp((f - 725) / 7)), pR = f < 745 ? 0 : back(clamp((f - 745) / 7));
  const up = smooth(lin(708, 716, f));
  const armPose = (k) => [q(lerp(-28, -170, k), 2), q(lerp(225, -90, k), 2)];
  const hero = stick("hero", HERO, [x, WALKZ], { expr: f < 745 ? "grin" : "happy", armL: armPose(up), armR: armPose(up), prop: "signs", popL: q(Math.max(0.001, pL), 0.04), popR: q(Math.max(0.001, pR), 0.04), blink: blinkAt(f, 3), by: life(f, 3, 4).by, look: f >= 725 && f < 745 ? -0.5 : f >= 745 ? 0.5 : 0 }, { pull: 0.3, wide: true });
  const fx = [];
  if (ext(f, 725, 735)) fx.push({ id: "popk", kind: "ray", pos: [x - 0.75, 2.35, WALKZ + 0.5], size: 1.3, t: q((f - 725) / 10, 0.1), col: "#b6f5a0" });
  if (ext(f, 745, 755)) fx.push({ id: "popr", kind: "ray", pos: [x + 0.75, 2.35, WALKZ + 0.5], size: 1.3, t: q((f - 745) / 10, 0.1), col: "#a8d4ff" });
  return { cam, L: LP.day, actors: [hero], fx, world: { bags: [{ pos: BAG, ry: 0.15 }] }, kicks: [{ f: 725, a: 0.008 }, { f: 745, a: 0.008 }], dof: { focus: dist(cam.pos, [x, 1.6, WALKZ]), cInf: 6 }, shadow: { c: [x, 0, 0.5], r: 7 } };
});

// 13 "because you just found one million dollars." (772-860): walks on, trips over another bag -> loops to the hook
shot("trip", 772, 860, (f) => {
  const tb = f - 822;
  const xw = f < 804 ? lerp(1.6, 0.75, lin(774, 804, f)) : f < 818 ? lerp(0.75, -0.45, easeOut(lin(804, 818, f))) : -0.45;
  const zw = f < 804 ? WALKZ : lerp(WALKZ, 0.45, smooth(lin(804, 818, f)));
  const track = { pos: [xw + 0.2, 1.45, lerp(5.6, 4.9, lin(772, 806, f))], look: [xw, 1.25, 0.6], fov: 41 };
  const hc = hookCam(Math.max(6, tb));
  const k = smoother(lin(806, 830, f));
  const cam = { pos: lerp3(track.pos, hc.pos, k), look: lerp3(track.look, hc.look, k), fov: lerp(track.fov, hc.fov, k) };
  let opts;
  const ph = walkPh(1.6 - xw), [aL, aR] = swingArms(ph);
  if (f < 776) { const t = lin(772, 776, f), a = [q(lerp(-170, -28, t), 2), q(lerp(-90, 225, t), 2)]; opts = { expr: "happy", armL: a, armR: a, blink: 0 }; }
  else if (f < 804) opts = { expr: "smile", legs: "walk", phase: ph, by: walkBob(ph), armL: aL, armR: aR, look: -0.6, blink: blinkAt(f, 3) };
  else if (f < 818) opts = { expr: "shock", legs: "trip", armL: "fall", armR: "up", lean: q(-lerp(8, 24, lin(804, 812, f)), 1), blink: 0 };
  else opts = { legs: "kneel", expr: "shock", armL: "up", armR: "up", blink: 0, by: f < 822 ? q(-12 * Math.sin(lin(818, 822, f) * Math.PI), 1) : 0, lookY: 0.4 };
  const actors = [stick("hero", HERO, [xw, zw], opts, { pull: 0.3 })];
  const cash = cashAt(tb);
  const wob = f >= 804 && f < 822 ? q(Math.sin((f - 804) * 0.9) * 0.12 * (1 - (f - 804) / 18), 0.01) : 0;
  const fx = [...cash.fx];
  if (ext(f, 822, 834)) fx.push({ id: "burst", kind: "ray", pos: [BAG[0], 0.7, BAG[2] + 0.3], size: 1.8, t: q((f - 822) / 12, 0.08), col: "#fff3b0" });
  if (ext(f, 805, 816)) fx.push({ id: "tripmark", kind: "mark", pos: [xw + 0.1, 2.25, zw + 0.3], size: 0.6, t: q((f - 805) / 11, 0.1), txt: "!" });
  return { cam, L: LP.day, actors, fx, world: { bags: [{ pos: BAG, ry: 0.15 * (1 - k), rz: wob, open: f >= 822 ? 1 : 0 }], stacks: cash.stacks }, kicks: [{ f: 805, a: 0.012 }, { f: 822, a: 0.018 }], dof: { focus: dist(cam.pos, [xw, 1.1, zw]), cInf: f > 815 ? 9 : 5 }, shadow: { c: [0, 0, 0.5], r: 7 } };
});

export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f < s.b) || SHOTS[SHOTS.length - 1];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const frameState = (f) => {
  const s = shotAt(f), r = s.fn(f);
  const cam = { ...r.cam, pos: [...r.cam.pos], look: [...r.cam.look] };
  const [kx, ky] = kick(f, r.kicks || []);
  if (kx || ky) {
    const d = dist(cam.pos, cam.look), R = norm(cross(sub(cam.look, cam.pos), [0, 1, 0])), U = norm(cross(R, sub(cam.look, cam.pos)));
    cam.look = add3(cam.look, [R[0] * kx * d + U[0] * ky * d, R[1] * kx * d + U[1] * ky * d, R[2] * kx * d + U[2] * ky * d]);
  }
  return { shot: s.id, cam, light: r.L, actors: r.actors || [], fx: r.fx || [], world: r.world || {}, flash: r.flash || 0, vign: r.vign ?? 0.18, dof: r.dof, shadow: r.shadow };
};
export { SHOTS };
