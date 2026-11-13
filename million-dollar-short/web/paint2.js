// Painted textures for the city sets: flat colour with dark seams.
import { rng, tint } from "./paint.js";
const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const INK = "#23263a";

export const concrete = (S = 512) => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(31);
  g.fillStyle = "#c9c4bd"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.10)" : "rgba(60,50,40,0.07)"; g.beginPath(); g.ellipse(r() * S, r() * S, 6 + r() * 30, 4 + r() * 18, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "#8f8a84"; g.lineWidth = 6; g.strokeRect(0, 0, S, S);
  return c;
};
export const asphalt = (S = 512) => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(32);
  g.fillStyle = "#4d5160"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)"; g.fillRect(r() * S, r() * S, 2 + r() * 6, 2 + r() * 6); }
  return c;
};
export const planks = (S = 512, base = "#c98a4e") => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(33);
  const n = 6, h = S / n;
  for (let i = 0; i < n; i++) {
    const off = r() * S;
    for (let k = -1; k < 2; k++) {
      g.fillStyle = tint(base, 0.9 + r() * 0.2); g.fillRect(off + k * S * 0.62, i * h, S * 0.62, h);
      g.fillStyle = "#5a3820"; g.fillRect(off + k * S * 0.62, i * h, 4, h);
    }
    for (let j = 0; j < 5; j++) { g.strokeStyle = tint(base, 0.78); g.lineWidth = 2; g.beginPath(); const y = i * h + 8 + r() * (h - 16); g.moveTo(r() * S, y); g.bezierCurveTo(r() * S, y + 4, r() * S, y - 4, r() * S, y); g.stroke(); }
    g.fillStyle = "#4a2e1a"; g.fillRect(0, i * h, S, 5);
  }
  return c;
};
export const checker = (S = 512, a = "#f3efe6", b = "#2d3040") => {
  const c = cv(S, S), g = c.getContext("2d");
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? b : a; g.fillRect(i * S / 2, j * S / 2, S / 2, S / 2); }
  g.strokeStyle = "#8d8a86"; g.lineWidth = 3; g.strokeRect(0, 0, S, S); g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.moveTo(0, S / 2); g.lineTo(S, S / 2); g.stroke();
  return c;
};
export const tiles = (S = 512, base = "#b9c3cc") => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(34);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = tint(base, 0.95 + r() * 0.1); g.fillRect(i * S / 4, j * S / 4, S / 4, S / 4); }
  g.strokeStyle = tint(base, 0.7); g.lineWidth = 4;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * S / 4, 0); g.lineTo(i * S / 4, S); g.moveTo(0, i * S / 4); g.lineTo(S, i * S / 4); g.stroke(); }
  return c;
};
export const plaster = (S = 512, base = "#e8774a") => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(35);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,240,220,0.06)" : "rgba(120,40,20,0.06)"; g.beginPath(); g.ellipse(r() * S, r() * S, 30 + r() * 90, 20 + r() * 60, r() * 3, 0, 7); g.fill(); }
  return c;
};
export const grass = (S = 512) => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(36);
  g.fillStyle = "#79b552"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 300; i++) { g.strokeStyle = r() < 0.5 ? "#8cc862" : "#629a41"; g.lineWidth = 3; const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y - 10 - r() * 10); g.stroke(); }
  return c;
};
export const hedge = (S = 512) => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(37);
  g.fillStyle = "#3f8a3e"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "#55a64c" : "#2f6e33"; g.beginPath(); g.ellipse(r() * S, r() * S, 10 + r() * 14, 7 + r() * 9, r() * 3, 0, 7); g.fill(); }
  return c;
};
/** building facade: base colour, window grid, ground floor door/shop. w,h in metres -> texture covers whole face */
export const facade = (seed, base, wM, hM, night = false) => {
  const ppm = 48, W = Math.round(wM * ppm), H = Math.round(hM * ppm);
  const c = cv(Math.min(1024, W), Math.min(1024, H)), g = c.getContext("2d"), r = rng(seed);
  g.scale(c.width / W, c.height / H);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  g.fillStyle = tint(base, 0.85); g.fillRect(0, 0, W, 0.5 * ppm);
  const cols = Math.max(2, Math.round(wM / 2.1)), rows = Math.max(1, Math.floor((hM - 3.4) / 2.9));
  const cw = W / cols, ww = 1.05 * ppm, wh = 1.5 * ppm;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * cw + (cw - ww) / 2, y = 0.9 * ppm + j * 2.9 * ppm;
    g.fillStyle = "#f6efe2"; g.fillRect(x - 6, y - 6, ww + 12, wh + 12);
    const lit = night ? r() < 0.45 : false;
    g.fillStyle = lit ? "#ffd27a" : night ? "#2a3550" : (r() < 0.7 ? "#9cc3ea" : "#7fa9d6"); g.fillRect(x, y, ww, wh);
    if (!night) { g.fillStyle = "rgba(255,255,255,0.45)"; g.beginPath(); g.moveTo(x + 6, y + wh * 0.6); g.lineTo(x + ww * 0.5, y + 6); g.lineTo(x + ww * 0.7, y + 6); g.lineTo(x + 6, y + wh * 0.85); g.fill(); }
    g.fillStyle = "#f6efe2"; g.fillRect(x + ww / 2 - 3, y, 6, wh); g.fillRect(x, y + wh / 2 - 3, ww, 6);
    g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(x - 6, y - 6, ww + 12, wh + 12);
    g.fillStyle = tint(base, 0.7); g.fillRect(x - 10, y + wh + 6, ww + 20, 10);
  }
  // ground floor
  const gy = H - 3.0 * ppm;
  g.fillStyle = tint(base, 0.78); g.fillRect(0, gy - 10, W, 12);
  const dx = (0.25 + r() * 0.5) * (W - 1.6 * ppm);
  g.fillStyle = "#5a3b2a"; g.fillRect(dx, H - 2.4 * ppm, 1.3 * ppm, 2.4 * ppm); g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(dx, H - 2.4 * ppm, 1.3 * ppm, 2.4 * ppm);
  g.fillStyle = "#e8c045"; g.beginPath(); g.arc(dx + 1.05 * ppm, H - 1.2 * ppm, 5, 0, 7); g.fill();
  for (let x = 0.4 * ppm; x < W - 2.2 * ppm; x += 2.6 * ppm) {
    if (Math.abs(x - dx) < 2.4 * ppm) continue;
    g.fillStyle = night ? "#ffd27a" : "#9cc3ea"; g.fillRect(x, H - 2.3 * ppm, 2.0 * ppm, 1.6 * ppm); g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(x, H - 2.3 * ppm, 2.0 * ppm, 1.6 * ppm);
  }
  g.strokeStyle = INK; g.lineWidth = 6; g.strokeRect(0, 0, W, H);
  return c;
};
/** skyline backdrop for windows */
export const skyline = (night) => {
  const c = cv(1024, 512), g = c.getContext("2d"), r = rng(night ? 41 : 40);
  const sky = g.createLinearGradient(0, 0, 0, 512);
  if (night) { sky.addColorStop(0, "#0e1838"); sky.addColorStop(1, "#2b3a66"); } else { sky.addColorStop(0, "#5aa0e8"); sky.addColorStop(1, "#bcdaf4"); }
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
  if (night) { g.fillStyle = "#f4f0d8"; g.beginPath(); g.arc(800, 90, 34, 0, 7); g.fill(); for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(r() * 1024, r() * 200, 3, 3); } }
  let x = -20;
  while (x < 1024) {
    const w = 70 + r() * 110, h = 140 + r() * 300;
    g.fillStyle = night ? "#1b2440" : ["#8ea4c8", "#a9bad6", "#7b93bb"][(r() * 3) | 0]; g.fillRect(x, 512 - h, w, h);
    g.strokeStyle = night ? "#0c1022" : "#5e7096"; g.lineWidth = 4; g.strokeRect(x, 512 - h, w, h);
    for (let yy = 512 - h + 16; yy < 500; yy += 30) for (let xx = x + 12; xx < x + w - 18; xx += 24) {
      g.fillStyle = night ? (r() < 0.35 ? "#ffd27a" : "#2a3352") : "#dceaf8"; g.fillRect(xx, yy, 12, 16);
    }
    x += w + 4;
  }
  return c;
};
/** wall sign with text */
export const signTex = (text, bg, fg, w = 1024, h = 256) => {
  const c = cv(w, h), g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 12; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = fg; g.font = `900 ${Math.round(h * 0.55)}px Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 6);
  return c;
};
export const clockTex = (hh = 2, mm = 0) => {
  const c = cv(256, 256), g = c.getContext("2d");
  g.fillStyle = "#fbf8f0"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 117, 0, 7); g.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.lineWidth = 8; g.beginPath(); g.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); g.lineTo(128 + Math.sin(a) * 76, 128 - Math.cos(a) * 76); g.stroke(); }
  const ha = ((hh % 12) + mm / 60) / 12 * Math.PI * 2, ma = mm / 60 * Math.PI * 2;
  g.lineCap = "round"; g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(ha) * 52, 128 - Math.cos(ha) * 52); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(ma) * 80, 128 - Math.cos(ma) * 80); g.stroke();
  g.fillStyle = "#d83a3a"; g.beginPath(); g.arc(128, 128, 10, 0, 7); g.fill();
  return c;
};
export const bandTex = () => { const c = cv(128, 64), g = c.getContext("2d"); g.fillStyle = "#6fb956"; g.fillRect(0, 0, 128, 64); g.fillStyle = "#4f9a3e"; for (let y = 4; y < 64; y += 8) g.fillRect(0, y, 128, 2); g.fillStyle = "#f4ecd2"; g.fillRect(52, 0, 24, 64); g.fillStyle = INK; g.fillRect(52, 0, 2, 64); g.fillRect(74, 0, 2, 64); return c; };
export const billTopTex = () => { const c = cv(256, 128), g = c.getContext("2d"); g.fillStyle = "#79c25e"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#3d7a33"; g.lineWidth = 6; g.strokeRect(14, 12, 228, 104); g.fillStyle = "#a7dd8a"; g.beginPath(); g.arc(128, 64, 30, 0, 7); g.fill(); g.fillStyle = "#2f6a2a"; g.font = "900 44px Inter, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 128, 66); g.fillStyle = "#f4ecd2"; g.fillRect(100, 0, 20, 128); return c; };
export const posterTex = (seed) => { const c = cv(256, 340), g = c.getContext("2d"), r = rng(seed); g.fillStyle = "#f4ecd2"; g.fillRect(0, 0, 256, 340); g.strokeStyle = INK; g.lineWidth = 10; g.strokeRect(5, 5, 246, 330); g.fillStyle = ["#d84a3a", "#3b7fd6", "#3fae4f"][seed % 3]; g.fillRect(30, 30, 196, 140); for (let i = 0; i < 6; i++) { g.fillStyle = "#8a8578"; g.fillRect(30, 195 + i * 22, 120 + r() * 76, 10); } return c; };
