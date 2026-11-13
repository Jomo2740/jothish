// Stickman cards: big round white head, dot eyes, rounded coloured torso, stick limbs with ball hands.
// Design space 600 x 1000, soles at y = 975 (wide cards are 1000 x 1150 with the body centred).
export const INK = "#23263a";
const LW = 13;

const C = (g, x, y, r, fill, lw = LW, stroke = INK) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } };
const E = (g, x, y, rx, ry, fill, lw = 0, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); } };
const L = (g, pts, lw = LW, col = INK) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = lw; g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); };
const RR = (g, x, y, w, h, r, fill, lw = LW) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); } };
const shadeHex = (c, k) => { const n = parseInt(c.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, "0"); return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`; };

// ---------- props ----------
export const drawBill = (g, x, y, w = 120, rot = 0, flip = 1) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, flip);
  const h = w * 0.46;
  RR(g, -w / 2, -h / 2, w, h, 6, "#79c25e", 6);
  g.lineWidth = 3; g.strokeStyle = "#3d7a33"; g.strokeRect(-w / 2 + 9, -h / 2 + 8, w - 18, h - 16);
  E(g, 0, 0, h * 0.3, h * 0.3, "#a7dd8a", 3);
  g.fillStyle = "#2f6a2a"; g.font = `900 ${Math.round(h * 0.42)}px Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 0, 2);
  g.restore();
};
const drawStack = (g, x, y, w = 110, rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot);
  const h = w * 0.5;
  RR(g, -w / 2, -h / 2 + 10, w, h, 6, "#5aa046", 6);
  RR(g, -w / 2, -h / 2, w, h, 6, "#79c25e", 6);
  g.fillStyle = "#f4ecd2"; g.fillRect(-12, -h / 2 + 3, 24, h - 6); g.lineWidth = 3; g.strokeStyle = INK; g.strokeRect(-12, -h / 2 + 3, 24, h - 6);
  g.restore();
};
const drawBag = (g, x, y, s = 1, open = 0) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  L(g, [[-60, -55], [-50, -110], [50, -110], [60, -55]], 14, "#15161c");
  RR(g, -120, -60, 240, 125, 34, "#2a2c35", LW);
  if (open > 0) { for (let i = 0; i < 4; i++) drawStack(g, -75 + i * 50, -58 - open * 18, 70, (i - 1.5) * 0.15); }
  L(g, [[-95, -28], [95, -28]], 5, "#555a68");
  g.restore();
};
const drawEnvelope = (g, x, y, rot = 0, open = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (open > 0) {
    for (let i = 0; i < 3; i++) drawBill(g, -30 + i * 30, -50 - open * 40 + i * 6, 100, -0.3 + i * 0.3);
  }
  RR(g, -75, -48, 150, 96, 6, "#f4e7c4", 7);
  L(g, [[-72, -44], [0, 12], [72, -44]], 6);
  g.restore();
};
const drawNote = (g, x, y, rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot);
  RR(g, -100, -70, 200, 140, 8, "#fffdf4", 7);
  g.fillStyle = "#c2323a"; g.font = "900 40px Inter, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("THANK", 0, -20); g.fillText("YOU!", 0, 26);
  g.fillStyle = "#e0485a"; g.beginPath(); const hx = 66, hy = 44; g.moveTo(hx, hy + 12); g.bezierCurveTo(hx - 22, hy - 4, hx - 12, hy - 18, hx, hy - 6); g.bezierCurveTo(hx + 12, hy - 18, hx + 22, hy - 4, hx, hy + 12); g.fill();
  g.restore();
};
const drawSign = (g, x, y, text, col, pop = 1, rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(pop, pop);
  L(g, [[0, 40], [0, 150]], 14, "#8a5a32");
  RR(g, -125, -80, 250, 140, 16, col, LW);
  g.fillStyle = "#ffffff"; g.font = `900 ${text.length > 4 ? 52 : 66}px Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 10; g.strokeStyle = INK; g.strokeText(text, 0, -8); g.fillText(text, 0, -8);
  g.restore();
};
const drawPhone = (g, x, y, rot = 0) => { g.save(); g.translate(x, y); g.rotate(rot); RR(g, -22, -40, 44, 80, 8, "#2b2e3a", 6); g.fillStyle = "#7fc8f0"; g.fillRect(-14, -30, 28, 52); g.restore(); };

// ---------- heads ----------
const FACES = {
  neutral: { brow: 0, mouth: "line" }, smile: { brow: 0, mouth: "smile" }, grin: { brow: -4, mouth: "open" },
  shock: { brow: -26, mouth: "o", eyes: "big" }, worried: { brow: 14, mouth: "wave", tilt: 1 }, greedy: { brow: 16, mouth: "open", eyes: "slit", tilt: -1 },
  scared: { brow: 18, mouth: "wave", eyes: "tiny", tilt: 1 }, happy: { brow: -10, mouth: "open", eyes: "happy" }, sleep: { brow: -2, mouth: "smile", eyes: "closed" },
  cry: { brow: 12, mouth: "open", eyes: "happy", tears: 1, tilt: 1 }, gulp: { brow: 20, mouth: "line", eyes: "tiny", tilt: 1, sweat: 1 }, sly: { brow: 10, mouth: "smirk", eyes: "slit" },
  frown: { brow: 8, mouth: "frown", tilt: -1 },
};
const drawHead = (g, o, s) => {
  const cx = 300, cy = 245, R = 165, f = FACES[s.expr || "smile"] || FACES.smile, lk = (s.look || 0) * 42, lky = (s.lookY || 0) * 20;
  // back hair (behind head)
  if (o.hat === "curly") { for (let i = 0; i < 13; i++) { const a = Math.PI * (0.98 + i * 1.04 / 12); C(g, cx + Math.cos(a) * R * 0.98, cy + Math.sin(a) * R * 0.98, 52, o.hair || INK, 0); } }
  if (o.hat === "bun") { C(g, cx, cy - R - 20, 52, o.hair || "#4a2c22", LW); }
  C(g, cx, cy, R, "#fbfaf7", 15);
  g.save(); g.beginPath(); g.arc(cx, cy, R - 7, 0, Math.PI * 2); g.clip();
  g.fillStyle = "rgba(40,40,80,0.07)"; g.beginPath(); g.arc(cx + 40, cy + 40, R, 0, Math.PI * 2); g.arc(cx, cy, R + 40, 0, Math.PI * 2, true); g.fill("evenodd");
  g.restore();
  // hats / hair over the head
  const top = (yCut, col, band) => {
    g.save(); g.beginPath(); g.arc(cx, cy, R + 8, 0, Math.PI * 2); g.clip();
    g.fillStyle = col; g.fillRect(cx - R - 20, cy - R - 20, 2 * R + 40, yCut - (cy - R - 20));
    if (band) { g.fillStyle = band; g.fillRect(cx - R - 20, yCut - 34, 2 * R + 40, 34); }
    g.restore();
    g.beginPath(); g.arc(cx, cy, R, Math.PI + Math.acos((cy - yCut) / R) * -1 + Math.PI * 0, 0); // no-op path reset
    const a = Math.asin((cy - yCut) / R);
    g.beginPath(); g.arc(cx, cy, R, Math.PI + a, -a); g.closePath(); g.lineWidth = 15; g.strokeStyle = INK; g.stroke();
  };
  if (o.hat === "beanie") { top(cy - 92, o.hatCol, shadeHex(o.hatCol, 0.8)); C(g, cx + 6, cy - R - 18, 30, o.bobble || "#f4f1ea", 11); }
  if (o.hat === "police") { top(cy - 78, "#1f2d5a"); E(g, cx, cy - 74, R * 0.98, 18, "#14182a"); g.fillStyle = "#e8c045"; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 26; g.lineTo(cx + Math.cos(a) * r, cy - 125 + Math.sin(a) * r); } g.closePath(); g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); }
  if (o.hat === "curly") { for (let i = 0; i < 9; i++) { const a = Math.PI * (1.08 + i * 0.84 / 8); C(g, cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8 - 6, 48, o.hair || INK, 0); } }
  if (o.hat === "bun") top(cy - 92, o.hair || "#4a2c22");
  if (o.hat === "old") { for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) C(g, cx + sx * (R - 8), cy - 30 + i * 34, 30, "#f2f1ee", 7); }
  // face
  const ex = 62, ey = 250 + lky, bl = s.blink || 0;
  const eyes = f.eyes || "dot";
  for (const sx of [-1, 1]) {
    const x = cx + sx * ex + lk, y = ey;
    if (eyes === "happy" || eyes === "closed" || bl > 0.6) { g.beginPath(); if (eyes === "happy") g.arc(x, y + 10, 24, Math.PI * 1.1, Math.PI * 1.9); else g.arc(x, y - 6, 24, Math.PI * 0.15, Math.PI * 0.85); g.lineWidth = 11; g.strokeStyle = INK; g.lineCap = "round"; g.stroke(); }
    else if (eyes === "slit") E(g, x, y + 6, 22, 12 * (1 - bl * 0.6), INK);
    else if (eyes === "big") { E(g, x, y, 34, 42, "#ffffff", 9); E(g, x + lk * 0.2, y + 4, 15, 19, INK); }
    else if (eyes === "tiny") E(g, x, y, 11, 15 * (1 - bl * 0.8), INK);
    else E(g, x, y, 20, 32 * (1 - bl * 0.85), INK);
    if (o.glasses) C(g, x, y, 44, null, 7);
    // brows
    const by = 190 + (eyes === "big" ? -10 : 0), tilt = (f.tilt || 0) * 0.28 * sx;
    const bx0 = x - 36, bx1 = x + 36, byy = by + (f.brow || 0) * 0.5;
    const col = o.hat === "old" ? "#e9e7e2" : INK;
    L(g, [[bx0, byy + (sx < 0 ? -tilt : tilt) * 40 * (sx < 0 ? 1 : -1)], [bx1, byy - (sx < 0 ? -tilt : tilt) * 40 * (sx < 0 ? 1 : -1)]], o.hat === "old" ? 18 : 12, col);
  }
  if (o.glasses) L(g, [[cx - ex + lk + 44, ey], [cx + ex + lk - 44, ey]], 7);
  const mx = cx + lk * 0.9, my = 340 + lky;
  g.lineCap = "round";
  const m = f.mouth;
  if (o.moustache) { E(g, mx - 30, my - 30, 38, 17, o.moustache, 5, 0.2); E(g, mx + 30, my - 30, 38, 17, o.moustache, 5, -0.2); }
  if (m === "smile") { g.beginPath(); g.arc(mx, my - 40, 52, Math.PI * 0.2, Math.PI * 0.8); g.lineWidth = 11; g.strokeStyle = INK; g.stroke(); }
  else if (m === "open") { g.beginPath(); g.moveTo(mx - 62, my - 22); g.quadraticCurveTo(mx, my - 18, mx + 62, my - 22); g.quadraticCurveTo(mx + 50, my + 40, mx, my + 42); g.quadraticCurveTo(mx - 50, my + 40, mx - 62, my - 22); g.fillStyle = INK; g.fill(); E(g, mx, my + 26, 26, 12, "#e2586a"); }
  else if (m === "o") { E(g, mx, my + 4, 22, 30, INK); }
  else if (m === "wave") { L(g, [[mx - 46, my], [mx - 23, my - 12], [mx, my], [mx + 23, my - 12], [mx + 46, my]], 10); }
  else if (m === "frown") { g.beginPath(); g.arc(mx, my + 40, 46, Math.PI * 1.2, Math.PI * 1.8); g.lineWidth = 11; g.strokeStyle = INK; g.stroke(); }
  else if (m === "smirk") { L(g, [[mx - 40, my - 4], [mx + 10, my + 4], [mx + 48, my - 18]], 11); }
  else L(g, [[mx - 34, my], [mx + 34, my]], 11);
  if (f.tears) for (const sx of [-1, 1]) { const x = cx + sx * (ex + 18) + lk; g.fillStyle = "#6cc4f2"; g.beginPath(); g.moveTo(x, ey + 26); g.quadraticCurveTo(x + 16 * sx, ey + 60, x, ey + 66); g.quadraticCurveTo(x - 16 * sx, ey + 60, x, ey + 26); g.fill(); }
  if (f.sweat) { const x = cx + 128, y = 150; g.fillStyle = "#8fd3f7"; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 22, y + 34, x, y + 42); g.quadraticCurveTo(x - 22, y + 34, x, y); g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke(); }
  if (s.shades) { for (const sx of [-1, 1]) RR(g, cx + sx * ex + lk - 46, ey - 30, 92, 58, 18, "#14161e", 6); L(g, [[cx - ex + lk + 40, ey - 18], [cx + ex + lk - 40, ey - 18]], 8); }
};

// ---------- arms ----------
const SH = { L: [244, 455], R: [356, 455] };
const UA = 118, FA = 118;
const ik = (sx, sy, hx, hy, out) => {
  const dx = hx - sx, dy = hy - sy, d = Math.min(Math.hypot(dx, dy), UA + FA - 1);
  const a = Math.atan2(dy, dx), b = Math.acos((UA * UA + d * d - FA * FA) / (2 * UA * d));
  const ang = a + b * out;
  return [sx + Math.cos(ang) * UA, sy + Math.sin(ang) * UA];
};
// hand offsets from the shoulder for a LEFT-side arm (mirrored for the right)
const POSE = {
  hang: [-28, 225], hip: [-20, 185], up: [-178, -148], wave: [-150, -120], out: [-200, 40], dance: [-180, -60],
  hug: [70, 150], reach: [-150, 170], point: [40, 70], give: [-150, 80], clutch: [40, 105], cane: [-70, 215], phone: [-125, -150],
  mouth: [40, -95], fan: [-170, -40], sign: [-170, -90], hold: [-45, 140], celebrate: [-140, -170], shrug: [-140, -20], fall: [-170, 90], shake: [-140, 190],
};
const arm = (g, side, pose, o, s) => {
  if (!pose) return null;
  const sx = side === "L" ? -1 : 1, sh = SH[side];
  const p = Array.isArray(pose) ? pose : POSE[pose] || POSE.hang;
  let hx = sh[0] - sx * -p[0] * -1, hy = sh[1] + p[1];
  hx = sh[0] + p[0] * -sx * -1; // offsets defined for the left arm
  hx = sh[0] + (side === "L" ? p[0] : -p[0]);
  if (s.shakeHand && side === "R") { hx += Math.sin(s.shakeHand * 9) * 7; hy += Math.cos(s.shakeHand * 13) * 5; }
  const out = (side === "L" ? 1 : -1) * (p[2] ? -1 : 1);
  const el = ik(sh[0], sh[1], hx, hy, out);
  L(g, [sh, el, [hx, hy]], LW + 1);
  return [hx, hy];
};
const hand = (g, h, big = 1) => { if (h) C(g, h[0], h[1], 21 * big, INK, 0); };

// ---------- legs ----------
const legs = (g, s) => {
  const mode = s.legs || "stand";
  const foot = (x, y, sx) => E(g, x + sx * 10, y + 2, 30, 15, INK);
  let Lf = [262, 963], Rf = [338, 963], Lh = [276, 700], Rh = [324, 700], Lk = null, Rk = null;
  if (mode === "walk") {
    const a = Math.sin((s.phase || 0) * Math.PI * 2);
    Lf = [262 - a * 34, 963 - Math.max(0, a) * 34]; Rf = [338 - a * 34, 963 - Math.max(0, -a) * 34];
    Lk = [266 - a * 10, 835 - Math.max(0, a) * 20]; Rk = [334 - a * 10, 835 - Math.max(0, -a) * 20];
  } else if (mode === "dance") {
    const a = Math.sin((s.phase || 0) * Math.PI * 2);
    if (a > 0) { Rf = [338 + 120 * a, 963 - 110 * a]; Rk = [360 + 70 * a, 840 - 30 * a]; } else { Lf = [262 + 120 * a, 963 + 110 * a]; Lk = [240 + 70 * a, 840 + 30 * a]; }
  } else if (mode === "kneel") {
    Lh = [276, 850]; Rh = [324, 850]; Lk = [200, 930]; Rk = [400, 930]; Lf = [262, 968]; Rf = [338, 968];
    L(g, [Lh, Lk, Lf], LW + 1); L(g, [Rh, Rk, Rf], LW + 1); E(g, Lf[0] - 8, Lf[1], 26, 13, INK); E(g, Rf[0] + 8, Rf[1], 26, 13, INK);
    return;
  } else if (mode === "trip") {
    Lf = [205, 920]; Lk = [230, 830]; Rf = [440, 860]; Rk = [370, 820];
  } else if (mode === "none") return;
  L(g, Lk ? [Lh, Lk, Lf] : [Lh, Lf], LW + 1); L(g, Rk ? [Rh, Rk, Rf] : [Rh, Rf], LW + 1);
  foot(Lf[0], Lf[1], -1); foot(Rf[0], Rf[1], 1);
};

/** draw one stickman. o = outfit {shirt, hat, hatCol, hair, glasses, moustache}, s = state */
export const drawStick = (g, o, s = {}) => {
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  const by = s.legs === "kneel" ? 150 : 0;
  legs(g, s);
  g.translate(s.bx || 0, (s.by || 0) + by);
  if (s.lean) { g.translate(300, 700); g.rotate((s.lean * Math.PI) / 180); g.translate(-300, -700); }
  // cane behind
  const back = [], front = [];
  // torso
  const sc = o.shirt || "#e9b437";
  g.save(); g.beginPath(); g.roundRect(232, 420, 136, 292, 46); g.fillStyle = sc; g.fill();
  g.clip(); g.fillStyle = shadeHex(sc, 0.82); g.fillRect(332, 400, 60, 330); g.restore();
  RR(g, 232, 420, 136, 292, 46, null, LW);
  if (o.badge) { g.fillStyle = "#e8c045"; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 22; g.lineTo(265 + Math.cos(a) * r, 500 + Math.sin(a) * r); } g.closePath(); g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); }
  if (o.tie) { g.fillStyle = o.tie; g.beginPath(); g.moveTo(290, 430); g.lineTo(310, 430); g.lineTo(318, 540); g.lineTo(300, 560); g.lineTo(282, 540); g.closePath(); g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke(); }
  if (o.cardigan) { L(g, [[300, 430], [300, 708]], 6); for (let i = 0; i < 3; i++) C(g, 314, 500 + i * 60, 7, "#f4ead0", 3); }
  // head (rotates about the neck)
  g.save();
  if (s.tilt) { g.translate(300, 410); g.rotate((s.tilt * Math.PI) / 180); g.translate(-300, -410); }
  g.translate((s.hx || 0), (s.hy || 0));
  drawHead(g, o, s);
  g.restore();
  // arms + props
  const hl = arm(g, "L", s.armL ?? "hang", o, s), hr = arm(g, "R", s.armR ?? "hang", o, s);
  const P = s.prop;
  if (P === "bag" || P === "bagOpen") { drawBag(g, 300, 600, 0.95, P === "bagOpen" ? 1 : 0); }
  if (P === "envelope" && hr) drawEnvelope(g, hr[0] + 10, hr[1] - 10, -0.15);
  if (P === "envelopeL" && hl) drawEnvelope(g, hl[0] - 10, hl[1] - 10, 0.15);
  if (P === "note") { drawNote(g, 300, 560, -0.05); }
  if (P === "fan" && hr) { for (let i = 0; i < 6; i++) drawBill(g, hr[0] + 20, hr[1] - 50, 120, -0.9 + i * 0.3); }
  if (P === "phone" && hl) drawPhone(g, hl[0] + 12, hl[1] - 4, -0.3);
  if (P === "cane" && hr) { L(g, [[hr[0], hr[1] - 20], [hr[0] + 8, 975 - (s.by || 0)]], 12, "#7a4a2a"); L(g, [[hr[0], hr[1] - 20], [hr[0] - 30, hr[1] - 30]], 12, "#7a4a2a"); }
  if (P === "signs") {
    if (hl) drawSign(g, hl[0] - 30, hl[1] - 70, "KEEP", "#3fae4f", s.popL ?? 1, -0.08);
    if (hr) drawSign(g, hr[0] + 30, hr[1] - 70, "RETURN", "#3b7fd6", s.popR ?? 1, 0.08);
  }
  if (P === "cash") { if (hl) drawStack(g, hl[0], hl[1] - 30, 100, -0.3); if (hr) drawStack(g, hr[0], hr[1] - 30, 100, 0.3); }
  hand(g, hl); hand(g, hr, s.armR === "point" ? 1.5 : 1);
  if (s.armR === "point" && hr) { E(g, hr[0], hr[1] - 2, 10, 10, "#454a66"); }
  if (P === "bagHold") drawBag(g, 300, 640, 1, 1);
  g.restore();
  // blanket over the legs (in bed)
  if (s.blanket) {
    g.save(); g.beginPath(); g.moveTo(20, 1000); g.lineTo(20, 640); g.quadraticCurveTo(300, 600 + (s.blanketY || 0), 580, 640); g.lineTo(580, 1000); g.closePath();
    g.fillStyle = s.blanket; g.fill(); g.lineWidth = LW; g.strokeStyle = INK; g.stroke();
    L(g, [[60, 700], [540, 700]], 6, shadeHex(s.blanket, 0.75));
    g.restore();
    if (s.clutch) { C(g, 250, 632, 22, INK, 0); C(g, 350, 632, 22, INK, 0); }
  }
};

// ---------- fx ----------
export const fxBillDraw = (g, W, H, t, seed) => {
  g.clearRect(0, 0, W, H);
  const flip = Math.cos(t * Math.PI * 2 * 1.3 + seed);
  drawBill(g, W / 2, H / 2, W * 0.8, Math.sin(t * 6 + seed) * 0.6, Math.abs(flip) < 0.15 ? 0.15 * Math.sign(flip || 1) : flip);
};
export const fxZzzDraw = (g, W, H, t) => {
  g.clearRect(0, 0, W, H);
  g.font = "900 70px Inter, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i < 3; i++) {
    const k = ((t + i / 3) % 1), x = W * 0.3 + k * W * 0.4 + Math.sin(k * 6 + i) * 20, y = H * 0.85 - k * H * 0.7, a = Math.sin(k * Math.PI);
    g.globalAlpha = a; g.lineWidth = 9; g.strokeStyle = INK; g.fillStyle = "#ffffff";
    g.save(); g.translate(x, y); g.scale(0.6 + k * 0.6, 0.6 + k * 0.6); g.strokeText("Z", 0, 0); g.fillText("Z", 0, 0); g.restore();
  }
  g.globalAlpha = 1;
};
export const fxBurstDraw = (g, W, H, t, col = "#fff3b0") => {
  g.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, a = 1 - t;
  g.globalAlpha = a; g.strokeStyle = col; g.lineCap = "round";
  for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 2 + 0.3, r0 = 40 + t * 120, r1 = r0 + 120 * (1 - t * 0.6); g.lineWidth = 16 * (1 - t); g.beginPath(); g.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); g.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); g.stroke(); }
  g.globalAlpha = 1;
};
export const fxMarkDraw = (g, W, H, t, txt = "!") => {
  g.clearRect(0, 0, W, H);
  const s = t < 0.3 ? 0.4 + t / 0.3 * 0.8 : 1.2 - Math.min(0.2, (t - 0.3));
  g.save(); g.translate(W / 2, H / 2); g.scale(s, s);
  g.font = "900 200px Inter, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 18; g.strokeStyle = INK; g.fillStyle = "#ffd23a";
  g.strokeText(txt, 0, 0); g.fillText(txt, 0, 0); g.restore();
};
