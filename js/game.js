// 천고 — main game. Depends on data.js (TUTORIAL, CHUNKS) and music.js (Music).
(() => {
"use strict";
const T = 32;
const ASSET_V = "131";   // bump when any picture changes: the service worker then fetches the new json and webp together
const $ = id => document.getElementById(id);
const cv = $("cv"); let ctx = cv.getContext("2d", { alpha: false });   // let: the ground is baked by pointing ctx at an offscreen canvas for a moment   // opaque canvas: cheaper to composite on phones
let W = 0, H = 0, DPR = 1, SCALE = 1;
const MOBILE = matchMedia("(pointer:coarse)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
let autoLite = false;   // set for this session when frames stay slow even at 1x
let liteSaved = (() => { try { return localStorage.getItem("chungo.lite") === "1"; } catch (e) { return false; } })();   // read once: storage can be blocked, and this is asked every frame
const LITE = () => autoLite || liteSaved;
let dprCap = LITE() ? 1 : MOBILE ? 1.25 : 2;   // phones: 1.5x is sharp enough and much lighter on the GPU; lowered further if frames run long
const PORTRAIT = () => H > W * 1.05;
let SAT = 0, SAB = 0, hudBot = 46, hudBotAt = 0;   // the phone's notch and home bar, and where the HTML top bar ends
const saProbe = (() => { const d = document.createElement("div"); d.style.cssText = "position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)"; document.body.appendChild(d); return d; })();
function hudBottom() { const now = performance.now(); if (now - hudBotAt > 700) { hudBotAt = now; const h = $("hud"); let b = 0; if (h) for (const c of h.children) { if (!c.offsetParent) continue; const r = c.getBoundingClientRect(); if (r.width && r.bottom > b && r.bottom < H * .3) b = r.bottom; } hudBot = b || SAT + 46; } return hudBot; }
const padH = () => PORTRAIT() ? Math.round(Math.max(H * .3, SAB + 268)) : 0;   // 세로: the lowest part of the screen is for the thumbs, the stage sits above it
function resize() {
  DPR = Math.min(dprCap, window.devicePixelRatio || 1);
  for (const k in PAT) delete PAT[k];   // patterns carry the old pixel scale
  { const cs = getComputedStyle(saProbe); SAT = parseFloat(cs.height) || 0; SAB = parseFloat(cs.paddingBottom) || 0; hudBotAt = 0; }
  const r = cv.getBoundingClientRect(); W = Math.round(r.width) || window.innerWidth; H = Math.round(r.height) || window.innerHeight;   // the canvas's real laid-out box, not the (often stale) window size
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  SCALE = PORTRAIT() ? Math.max(0.5, W / (T * 11)) : Math.max(0.5, Math.min(W / (T * 13), H / (T * 11)));   // upright phone: eleven tiles across, the controls get the bottom of the screen
  document.body.classList.toggle("portrait", PORTRAIT());
  vignette = null;
}
window.addEventListener("resize", resize);
// phones change the visible area without a clean resize (address bar, rotation, coming back from the background): follow the canvas box itself
window.addEventListener("orientationchange", () => { setTimeout(resize, 150); setTimeout(resize, 500); });
if (window.visualViewport) visualViewport.addEventListener("resize", resize);
if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(cv);
document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(resize, 100); });
setInterval(() => { const r = cv.getBoundingClientRect(); if (Math.abs(Math.round(r.width) - W) > 1 || Math.abs(Math.round(r.height) - H) > 1) resize(); }, 700);

// ---------- persistence ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem("chungo." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("chungo." + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem("chungo." + k); } catch (e) {} }
};
const settings = Object.assign({ sound: true, offset: 0, mus: .8, fx: 1, tempo: 1, calm: false, keys: {}, diff: 1 }, (() => { const v = store.get("settings", {}); return v && typeof v === "object" ? v : {}; })());
for (const [k, d, lo, hi] of [["mus", .8, 0, 1], ["fx", 1, 0, 1], ["tempo", 1, .7, 1], ["offset", 0, -200, 200]]) if (!Number.isFinite(settings[k])) settings[k] = d; else settings[k] = Math.max(lo, Math.min(hi, settings[k]));
if (!settings.keys || typeof settings.keys !== "object" || Array.isArray(settings.keys)) settings.keys = {}; settings.calm = settings.calm === true; if (![0, 1, 2].includes(settings.diff)) settings.diff = 1;
Music.setVolume(settings.sound ? 1 : 0); Music.setOffset(settings.offset); Music.setMix(settings.mus, settings.fx);

// ---------- 마당 definitions & palettes ----------
const ORD = ["첫째", "둘째", "셋째", "넷째", "다섯째", "여섯째"];
// a turn of the tower is three 마당; each draws on one of the five tiers below (진양조 → 자진모리 → 단모리)
const LAST_M = 5, MD = m => [0, 1, 2, 2, 3, 4][Math.min(LAST_M, m)];   // a turn: five short 관문 chosen along the way, then 천고대
// which guardian waits: in 천고탑, a 그림자 every tenth floor and the drum's own lord at the thirtieth once the name is whole
function bossKindOf(r = run, m = r && r.m) {
  if (r && r.tower) { if (r.floor === 30 && META.mem.length >= 9) return "cheongo"; if (r.floor % 10 === 0 && META.books.length > 1) return "shadow"; }
  return bossFor(r.seed, r.cycle || 0, m);
}
function stageOf(m, r = run) {
  m = Math.min(LAST_M, m);
  if (m === LAST_M && r && r.seed != null) { const l = LAIR[bossKindOf(r, m)]; if (l) return { han: l[0], ko: l[1] }; }
  return STAGE[m];
}
const stageName = (m, r) => { const s = stageOf(m, r); return `${s.ko} ${s.han}`; };
const MNAME = ["초입", "연비", "망루", "승천", "결전"];   // 初入 鳶飛 望樓 昇天 決戰
const MADANG = [
  // "w" entries draw from wall chunks (climb / wall-jump), so every 마당 has walls to run
  // "w" entries draw from wall chunks, "m" from multi-floor chunks with ledges
  { jd: "jinyang",   line: "북은 아직 멀리서 울린다.",          tiers: [0, "m1", "w0", 1, "m1", "w1", 1, "m1", 1] },
  { jd: "jungmori",  line: "연줄 위로, 바람을 타라.",            tiers: ["m1", "w1", 1, "m1", "w0", 1, "m2", "w1", "m1"] },
  { jd: "jajinmori", line: "포수의 눈은 장단을 놓치지 않는다.",  tiers: [1, "m2", "w1", 2, "m1", "w2", 2, "m2", 2] },
  { jd: "hwimori",   line: "오를수록 장단은 빨라진다.",          tiers: ["w1", "m2", 2, "w2", "m1", 1, "w2", "m2", "w2"] },
  { jd: "danmori",   line: "천고가 가깝다.",                     tiers: ["m2", 2, "w2", "m2", 2, "w1", 2, 2, "m2"] }
];
const PAL = [
  { bg: "#e6e2d7", tile: "#1c1b1f", fig: "#141317", foe: "#55525b", text: "#1c1b1f", wash: "23,22,26", farA: .36, midA: .5, rim: null },
  { bg: "#dcd6c8", tile: "#1c1b1f", fig: "#141317", foe: "#55525b", text: "#1c1b1f", wash: "23,22,26", farA: .36, midA: .5, rim: null },
  { bg: "#c9c1b1", tile: "#19181c", fig: "#121115", foe: "#4c4952", text: "#19181c", wash: "23,22,26", farA: .36, midA: .52, rim: null },
  { bg: "#8e887e", tile: "#141316", fig: "#0f0e11", foe: "#3a3840", text: "#141316", wash: "18,17,20", farA: .32, midA: .48, rim: "rgba(236,230,216,.18)" },
  { bg: "#b9b1a4", tile: "#141316", fig: "#0f0e11", foe: "#3a3840", text: "#141316", wash: "18,17,20", farA: .3, midA: .46, rim: null }
];
const BODY_FONT = getComputedStyle(document.documentElement).getPropertyValue("--f-body");
const HAT_WEAVE = { "#ece6d8": "rgba(60,56,50,.6)" }; // weave lines on the inverted (night) figure
// slow-mo aim switches to this stone-rubbing palette: dark paper, bone-white ink
const NIGHT = { bg: "#252321", tile: "#0b0a0c", fig: "#ece6d8", foe: "#a49d92", text: "#ece6d8", wash: "236,230,216", farA: .22, midA: .35, rim: "rgba(236,230,216,.5)", night: true };
const SEAL = "#c3161c", JJOK = "#27466a", JJOK_L = "#5f86b5";

// ---------- images (optional; drawn procedurally when missing) ----------
// far/mid: Higgsfield ink-wash panoramas with alpha. tex-*: seamless tiles (seam ratio checked <= 1.3).
// A canvas we touched with getImageData lives in CPU memory, and on Android Chrome drawing it uploads the whole
// texture to the GPU every frame. Each processed picture is turned into an ImageBitmap (GPU-resident) once ready.
function gpuize(c, put) { if (window.createImageBitmap && c && c.getContext) createImageBitmap(c).then(put).catch(() => {}); return c; }
const IMG = {}, PAT = {};
let perfT = 0, perfN = 0, perfSlow = 0;   // frame-time watch for the automatic quality drop
for (const k of ["tex-paper", "tex-stone", "tex-giwa", "tex-granite", "tex-slab"]) { let n = 0; const go = () => { const im = new Image(); im.onload = () => { IMG[k] = im; PAT[k] = null; }; im.onerror = () => { ++n; setTimeout(go, Math.min(5000, 1200 * n)); }; im.src = "assets/" + k + ".webp"; }; go(); }
function tintedPaper(ssn) { // paper texture with the season's colour multiplied in once
  const key = "tex-paper-" + ssn; if (PAT[key]) return PAT[key]; const im = IMG["tex-paper"]; if (!im) return null;
  if (!IMG[key]) { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d"); g.drawImage(im, 0, 0); g.globalCompositeOperation = "multiply"; g.fillStyle = SEASON_TINT[ssn]; g.fillRect(0, 0, c.width, c.height); IMG[key] = c; }
  return pattern(key, DPR * 0.9);
}
// one full-screen pass fewer per frame: the paper grain is laid into the background colour and into the far/mid paintings
// once, instead of multiplying the whole screen by the paper every frame
function bgPaper(col, alpha, ssn) {
  const key = `bgp-${col}-${alpha}-${ssn}`; if (PAT[key]) return PAT[key]; const src = ssn ? (tintedPaper(ssn), IMG["tex-paper-" + ssn]) : IMG["tex-paper"]; if (!src) return null;
  if (!IMG[key]) { const c = document.createElement("canvas"); c.width = src.width; c.height = src.height; const g = c.getContext("2d"); g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); g.globalAlpha = alpha; g.globalCompositeOperation = "multiply"; g.drawImage(src, 0, 0); IMG[key] = c; }
  return pattern(key, DPR * 0.9);
}
const paperBaked = new WeakMap();
function bakePaper(img) { // a backdrop painting with the paper grain multiplied in, its own transparency kept
  if (paperBaked.has(img)) return paperBaked.get(img); const pp = IMG["tex-paper"]; if (!pp) return img;
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "multiply"; g.globalAlpha = .9; const pt = g.createPattern(pp, "repeat"); pt.setTransform(new DOMMatrix().scale(img.height / 600)); g.fillStyle = pt; g.fillRect(0, 0, c.width, c.height);
  g.globalAlpha = 1; g.globalCompositeOperation = "destination-in"; g.drawImage(img, 0, 0);
  paperBaked.set(img, c); gpuize(c, bm => paperBaked.set(img, bm)); return c;
}
function pattern(key, scale) { // world- or screen-anchored repeating pattern, built once per image
  if (!IMG[key]) return null;
  if (!PAT[key]) { PAT[key] = ctx.createPattern(IMG[key], "repeat"); PAT[key].setTransform(new DOMMatrix().scale(scale)); }
  return PAT[key];
}
for (const k of ["far", "mid"]) { let n = 0; const go = () => { const im = new Image(); im.onload = () => { IMG[k] = gpuize(softened(seamlessStrip(im), k === "far" ? 3 : 2), bm => { IMG[k] = bm; }); }; im.onerror = () => { ++n; setTimeout(go, Math.min(5000, 1200 * n)); }; im.src = "assets/" + k + ".webp"; }; go(); }
// Make a panorama wrap horizontally: the last 22% is cross-faded into the start, so tiling shows no cut or mirror.
function softened(c, px) { // blur once at load, so the backdrop recedes behind the sharp pines and actors
  const o = document.createElement("canvas"); o.width = c.width; o.height = c.height; const g = o.getContext("2d");
  g.filter = `blur(${px}px)`; g.drawImage(c, 0, 0); return o;
}
function seamlessStrip(img) {
  const w = img.width, h = img.height, ov = Math.round(w * 0.22), P = w - ov;
  const out = document.createElement("canvas"); out.width = P; out.height = h; const g = out.getContext("2d");
  g.drawImage(img, 0, 0, P, h, 0, 0, P, h);
  const t = document.createElement("canvas"); t.width = ov; t.height = h; const tg = t.getContext("2d");
  tg.drawImage(img, P, 0, ov, h, 0, 0, ov, h);
  const m = tg.createLinearGradient(0, 0, ov, 0); m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
  tg.globalCompositeOperation = "destination-in"; tg.fillStyle = m; tg.fillRect(0, 0, ov, h);
  g.globalCompositeOperation = "destination-out"; const m2 = g.createLinearGradient(0, 0, ov, 0); m2.addColorStop(0, "rgba(0,0,0,1)"); m2.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = m2; g.fillRect(0, 0, ov, h);
  g.globalCompositeOperation = "source-over"; g.drawImage(t, 0, 0);
  return out;
}
{ const im = new Image(); im.onload = () => $("menu").classList.add("art"); im.src = "assets/title.webp"; }

// ---------- sprites: Higgsfield sheets, keyed from white paper and sliced into strip atlases ----------
const SPR = {};
const HERO = { idle: 0, run: [1, 2, 3, 4, 5, 6, 7], rise: 8, wall: 9, slash: 10, dash: 11, fall: 12, up: 13, land: 14, dead: 15 };
// hero3: the painted-with-effects swordsman. 0 idle, 1-6 sprint, 7 take-off, 8 somersault, 9 fall, 10 wall, 11 dash, 12-14 slashes (fwd/up/down), 15 landing
const H3 = { idle: 0, run: [1, 2, 3, 4, 5, 6], rise: 7, flip: 8, fall: 9, wall: 10, dash: 11, slash: 12, up: 13, down: 14, land: 15 };
const H3_AX = [.48, .58, .64, .63, .65, .58, .62, .59, .58, .54, .62, .46, .32, .42, .52, .49];
const SF = { fwd: 0, up: 1, down: 2, arc: 3, arcRed: 4, bolt: 5, sword: 6, guard: 7, moon: 8 };          // slashfx sheet
const PF = { fire: 0, clone: 1, spin: 2, bloom: 3, wind: 4, dragon: 5, thunder: 6, spark: 7, splash: 8 }; // perkfx sheet
const WF = { ssIdle: 0, ssA: 1, ssB: 2, wdIdle: 3, wdSweep: 4, wdSlam: 5, bdStance: 6, bdCut: 7, bdSheathe: 8 }, WF_AX = [.46, .46, .52, .35, .24, .46, .55, .38, .56];   // weapons sheet
const SF_AX = [.44, .55, .6], SLASH_K = 1.18;   // measured on the sliced poses: the lunge reads at ~80% of standing height
const HFX = { dash: 0, jump: 1, land: 2, air: 3, wall: 4, strike: 5, arc: 6, wind: 7, ribbon: 8 };
const HERO_AX = { 0: .5, 9: .5, 10: .4, 11: .55, 13: .45, 14: .55, 15: .45 };   // body centre as a fraction of frame width
const FOE = { g: [0, 1], s: [2, 3], d: [4, 5], h: [6, 7] };
const FOE_AX = { 0: .5, 1: .3, 2: .45, 3: .3, 6: .45, 7: .45 };
const F2 = { mudang: 0, mudangCast: 1, reaper: 2, reaperSmoke: 3, boss: 4, bossUp: 5, bossSlam: 6, bossKneel: 7, ward: 8 };   // foes2 sheet
const FX = { slashA: 0, slashARed: 1, slashB: 2, slashBRed: 3, burst: 4, spray: 5, seal: 6, drops: 7, pool: 8 };
const HUD = { bigDrum: 0, struck: 1, drum: 2, aimLine: 3, reticle: 4, rope: 5, spark: 6, smoke: 7, dust: 8 }; // hudsolid for 0-5, hud (soft) for 6-8
// props sheet: geumjul rope, enemy aim stroke, dash reticle, then set dressing
const H2 = { idle: [0, 1, 2], guard: 3, start: 4, skid: 5, takeoff: 6, apex: 7, land: 8, turn: 9, cling: 10, climb: 11 };
for (const id of ["d_far", "d_sunbo", "d_sun", "d_jeong", "d_pajuk", "d_hyeol", "d_giseom", "d_dangong", "d_charge", "d_bounce", "d_chain"]) CHOSIK.find(c => c.id === id).only = "mumyeong";   // the swordsman's aimed dash
const SLOT = { 방어: 1, 간파: 1, 이동: 2 }, SLOT_ORDER = ["방어", "간파", "이동"];   // shared 비급; the weapon's own grow on its tree (no slots)
// 무기 수련 트리: each weapon is a build. Three branches, three steps each; the third step of a branch is its 오의.
// Clearing a 관문 offers nodes you can take now (a branch's next step), so each run grows in its own direction.
// numeric gifts of the held tree nodes, summed: { gise: .2, edge: 1, ... }
let _tsRun = null, _tsKey = "", _tsSum = {};   // summed tree stats, rebuilt only when the held list changes (asked every frame)
function treeStat(k) { if (!run || !run.perks) return 0; const key = run.perks.length + ":" + run.perks[run.perks.length - 1];
  if (_tsRun !== run || _tsKey !== key) { _tsRun = run; _tsKey = key; _tsSum = {}; for (const id of run.perks) { const c = CHOSIK_BY && CHOSIK_BY[id]; if (c && c.stat) for (const s in c.stat) _tsSum[s] = (_tsSum[s] || 0) + c.stat[s]; } }
  return _tsSum[k] || 0; }
let CHOSIK_BY = null;
const treeKey = () => { const w = wpn(), W = WEAPONS[w]; return W && W.gun ? w : wrule(); };   // 무녀's weapons grow on the sword tree they fight like
for (const [wk2, T] of Object.entries(TREES)) { const X = TREE_EXT[wk2], L = ["a", "b", "c"];
  if (X) CHOSIK.push({ ...X.r, kind: "수련", tree: wk2, br: -1, tier: 0, brName: "뿌리" });
  T.br.forEach((b, bi) => { const n = b.nodes, x = X && X[L[bi]];
    CHOSIK.push({ ...n[0], kind: "수련", tree: wk2, br: bi, tier: 1, brName: b.name }, { ...n[1], kind: "수련", tree: wk2, br: bi, tier: 2, brName: b.name });
    if (x) CHOSIK.push({ ...x[0], kind: "수련", tree: wk2, br: bi, tier: 3, fork: 0, brName: b.name, lock: 1 }, { ...x[1], kind: "수련", tree: wk2, br: bi, tier: 3, fork: 1, brName: b.name, lock: 1 }, { ...x[2], kind: "수련", tree: wk2, br: bi, tier: 4, brName: b.name, lock: 2 });
    CHOSIK.push({ ...n[2], kind: "수련", tree: wk2, br: bi, tier: 5, brName: b.name, ougi: true }); });
  if (X) X.m.forEach((m, k) => CHOSIK.push({ ...m, kind: "수련", tree: wk2, br: -2, merge: [k, k + 1], tier: 6, brName: "합류", lock: 2 })); }
for (const c of COMBOS) CHOSIK.push({ ...c, kind: "조합", combo: COMBO_NEED[c.id] });
CHOSIK_BY = Object.fromEntries(CHOSIK.map(c => [c.id, c]));
const nodeOf = id => CHOSIK.find(c => c.id === id && c.tree);
const treeNodesHeld = () => (run.perks || []).filter(id => nodeOf(id));
// 서고 수련: 0 → 3단까지, 1 → 4단까지, 2 → 합류까지 (META.treeOpen[weapon] counts what has been learned)
const TREE_OPEN = [{ hon: TUNING.TREE_OPEN_HON[0], ms: 0, name: "3단 깨치기", desc: "모든 무기의 갈래마다 둘 중 하나를 고르는 3단이 열린다" }, { hon: TUNING.TREE_OPEN_HON[1], ms: 1, name: "4단 깨치기", desc: "모든 무기의 3단 뒤 4단이 열린다 (어느 무기든 숙련 1)" }, { hon: TUNING.TREE_OPEN_HON[2], ms: 2, name: "합류 깨치기", desc: "모든 무기에서 이웃한 두 갈래를 잇는 합류가 열린다 (어느 무기든 숙련 2)" }];
const treeOpen = () => { const o = META.treeOpen || {}; return Math.max(o.all || 0, ...Object.values(o).filter(Number.isFinite)); };   // learned once for every weapon (older saves: the furthest any weapon got)
const lockLv = c => c.merge ? 3 : c.ougi ? 1 : c.lock || 0;   // 오의 too stays sealed until the 서고 opens the deeper steps
function treeOffer() { // the nodes you could take now: the root, then step by step along a branch; 오의 never (깨달음 gives it)
  const T = treeKey(), held = new Set(run.perks || []), out = [], hasRoot = CHOSIK.some(o => o.tree === T && o.tier === 0);
  const got = (br, tier) => CHOSIK.some(o => o.tree === T && o.br === br && o.tier === tier && held.has(o.id));
  for (const c of CHOSIK) { if (c.tree !== T || held.has(c.id) || c.ougi || lockLv(c) > treeOpen()) continue;
    const ok = c.tier === 0 ? true : c.tier === 1 ? (!hasRoot || got(-1, 0)) : c.tier === 3 ? got(c.br, 2) && !got(c.br, 3) : c.merge ? c.merge.every(b => got(b, 2)) : got(c.br, c.tier - 1);
    if (ok) out.push(c); }
  return out;
}
function syncCombos() { // two 비급 held together reveal a third
  for (const c of COMBOS) if (!run.perks.includes(c.id) && COMBO_NEED[c.id].every(id => has(id))) { run.perks.push(c.id); toast(`조합 발견 · ${c.name} — ${c.desc.replace(/^조합\([^)]*\) — /, "")}`); Music.jing(); }
}
// 깨달음: cutting 천고 opens one 오의 at the end of a branch you have walked two steps along; a second time awakens it
function enlighten(then) {
  then = then || (() => showChoice("cycle"));
  const tk = treeKey(), held = new Set(run.perks || []);
  if (run.ougiId) { if (!run.ougiAwake) { run.ougiAwake = true; saveRun(); const c = CHOSIK_BY[run.ougiId]; toast(`각성 · ${c ? c.name : "오의"} — 천고 오의가 더 넓고, 쓰면 기운 절반이 돌아온다`); Music.jing(); } run.choosing = "cycle"; saveRun(); return then(); }
  if (treeOpen() < 1) { toast("깨달음이 오지 않았다 · 본당 서고에서 \"3단 깨치기\"를 먼저 해야 오의를 깨칠 수 있다"); run.choosing = "cycle"; saveRun(); return then(); }
  const els = CHOSIK.filter(c => c.tree === tk && c.ougi && CHOSIK.some(o => o.tree === tk && o.br === c.br && o.tier === 2 && held.has(o.id)));
  if (!els.length) { toast("깨달음이 오지 않았다 · 한 갈래를 2단까지 걸어야 한다"); run.choosing = "cycle"; saveRun(); return then(); }
  pickScreen("깨달음", "천고를 베었다 — 걸어온 갈래 끝에서 오의 하나가 열린다", els.map(c => ({ id: c.id, name: pv(c).name, han: pv(c).han, desc: pv(c).desc.replace(/^오의 — /, ""), icon: pv(c).icon })), it => {
    run.ougiId = it.id; run.perks.push(it.id); run.choosing = "cycle"; saveRun(); Music.jing(); toast(`오의를 깨쳤다 · ${it.name}`); then(); });
}

const kindOf = id => (CHOSIK.find(c => c.id === id) || {}).kind;
const fitPerks = list => { const n = {}; return list.filter(id => { const k = kindOf(id); if (k === "수련") return true; if (!SLOT[k]) return false; n[k] = (n[k] || 0) + 1; return n[k] <= SLOT[k]; }); };   // keeps what fits the slots, first come first kept

let _hasRun = null, _hasKey = "", _hasSet = new Set();   // held ids plus what held tree nodes and 조합 grant
const has = id => { if (!run || !run.perks) return false; const k = run.perks.length + ":" + run.perks[run.perks.length - 1];
  if (_hasRun !== run || _hasKey !== k) { _hasRun = run; _hasKey = k; _hasSet = new Set(run.perks); for (const p of run.perks) { const c = CHOSIK_BY && CHOSIK_BY[p]; if (c && c.grant) _hasSet.add(c.grant); } }
  return _hasSet.has(id); };
const ICON_ORDER = {
  munyeo: "ssang ilseom yeongyeok gangta gwigeom geompung bigeom noejeon wolgwang hoeseon hyeolhwa bungwang suhoryeong heukryong cheohyeong geommak heup bangyeok cheol nakhwa bantan ssangryong gwisin mancheon mangeom hwanyeong geomu yuseong noegeom manwol ssangwol noesin noejeong cheonroe talhon seomil samyeon pilsal wolryeong hwangol sinnaerim neokpuri",
  posu: "ssang ilseom yeongyeok gangta gwigeom geompung bigeom noejeon wolgwang hoeseon hyeolhwa bungwang suhoryeong heukryong cheohyeong geommak heup bangyeok cheol nakhwa bantan ssangryong gwisin mancheon mangeom hwanyeong geomu yuseong noegeom manwol ssangwol noesin noejeong cheonroe talhon seomil samyeon pilsal wolryeong hwangol soksa hwayak" };
const PV_ICON = {};
for (const [ch, ids] of Object.entries(ICON_ORDER)) { PV_ICON[ch] = {}; ids.split(" ").forEach((id, i) => { PV_ICON[ch][id] = (ch === "munyeo" ? 700 : 750) + Math.floor(i / 9) * 10 + i % 9; }); }
{ const cmb = "cheonra nakhwayusu eunggyeok pacheon yeokryu suhosin yeongmak cheonyeong yeongseom seonpung nakcheon hyeolu hyeolhyang ssangryong2 biryong noego yeomryong2".split(" ");
  cmb.forEach((id, i) => { PV_ICON.munyeo[id] = 800 + Math.floor(i / 9) * 10 + i % 9; PV_ICON.posu[id] = 820 + Math.floor(i / 9) * 10 + i % 9; }); }
{ const tf = "yeonbal heup cheohyeong hwalgong bisang2 yeonsasl bangyeok dolgyeok geommak".split(" "); for (const c of CHOSIK) { const i = tf.indexOf(c.id); if (i >= 0) c.icon = 840 + i; if (c.id === "sunbo") c.icon = 850; } }   // the swordsman's transforms get their own pictures
{ const ic = { ohaeng: 748, ilgi: 796, gidung: 797 }; for (const c of CHOSIK) if (ic[c.id]) { c.icon = ic[c.id]; c.icon2 = null; } }
const pv = c => { const o = run && PV[run.char] && PV[run.char][c.id], ic = run && PV_ICON[run.char] && PV_ICON[run.char][c.id];
  return o && !c.skill ? { ...c, name: o[0], han: o[1], desc: o[2], icon: ic || c.icon, icon2: ic ? null : c.icon2 } : c; };
const TF_NAME = { dash: "대시", jump: "점프", hook: "연", strike: "일격", slash: "베기" };
const TIER_SHORT = { noe: ["일격 판정 확장", "일격이 번개를 튀김", "세 일격마다 번개 대시"], hwa: ["대시 빨리 참", "대시 끝 불꽃", "대시 일격 · 큰 불꽃"],
  pung: ["연 거리 확장", "공중 베기로 도약 회복", "공중 베기 모두 일격"], hyeol: ["열다섯 처치마다 숨", "처치 시 피 가시", "처치 시 무적 · 가시 셋"], yeong: ["대시 뒤 무적", "그림자 분신", "치명상 한 번 흘림"] };
const SCHOOL_OF = {};
for (const [k, ids] of Object.entries({
  noe: "eot gangta noejeon nakroe gwigeom ilseom yeongyeok jeong ssang cheol wolgwang",
  hwa: "jilpung chukji hwaryong seomgwang janyeong",
  pung: "idan biyeon baram pungsin heukryong gyeonggong byeokho yeonsa cheongeun hoeseon geompung",
  hyeol: "hyeol heuphon hyeolhwa yeon nakhwa josik",
  yeong: "hosin jangmak suhoryeong bungwang bulsa bantan gwian danhwa bigeom neokpuri",
  noe2: "sinnaerim soksa", hwa2: "hwayak" })) for (const id of ids.split(" ")) SCHOOL_OF[id] = k.replace("2", "");
for (const c of CHOSIK) if (c.combo && !SCHOOL_OF[c.id]) SCHOOL_OF[c.id] = SCHOOL_OF[c.combo[0]];
const schoolN = k => !run ? 0 : (run.perks || []).filter(id => SCHOOL_OF[id] === k).length + (run.simbeop === k ? 1 : 0) + (0);
const res = () => false;   // 공명 is gone
const simb = k => !!(run && run.simbeop === k);
const isGun = () => !!(run && WEAPONS[wpn()] && WEAPONS[wpn()].gun);
const wpn = () => (run && run.weapon && WEAPONS[run.weapon]) ? run.weapon : "hwando";
const wk = () => WEAPONS[wpn()].kind || wpn();   // the rules a weapon plays by
const wrule = () => { const w = WEAPONS[wpn()]; return w.kind || (w.ch ? "hwando" : wpn()); };   // 장단 · 기세 · 내려베기 · 거합
function regainAir() { P.airDash = Math.max(P.airDash, baseAir()); P.dashCd = 0; P.djN = 0; }
function ilseomCheon() { // 일섬천격: every foe in sight is answered at once
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2; flash = .3; hitstop = Math.max(hitstop, .15); shake = 16; Music.jing(); ougiArt(["ogA", 0], cx, cy, 260, { life: .6 });
  for (const o of enemies) if (o.alive && !ghostly(o) && Math.abs(o.x - cx) < 520 && Math.abs(o.y - cy) < 300) { trailFx(cx, cy, o.x + o.w / 2, o.y + o.h / 2, 5, .5); hurtEnemy(o, o.type !== "b" ? true : 2); }
}
const frenzy = () => !!(P && has("ss_a1") && (P.frenzyUntil || 0) > songPos);
function counterCut(e) { // 환도 받아치기: a read blow answered by stepping through to the foe's back
  P.countered = true; P.counterT = .28; const x0 = P.x + P.w / 2, y0 = P.y + P.h / 2, ex = e.x + e.w / 2, side = Math.sign(ex - x0) || P.face;
  const far = has("hw_a2") && (P.ctrN || 0) >= 3 ? 2 : 1;   // 연환반격: farther, and the landing cuts
  moveX(P, ex + side * (e.w / 2 + 20) * far + (far > 1 ? side * 30 : 0) - P.w / 2 - P.x); P.face = -side; P.vx = 0; P.invT = Math.max(P.invT || 0, .45); regainAir();
  if (far > 1) for (const o of enemies) if (o !== e && o.alive && Math.hypot(o.x + o.w / 2 - P.x, o.y + o.h / 2 - P.y) < 80) hurtEnemy(o, false);
  if (has("hw_b1")) clones.push({ x: x0, y: P.y + P.h, face: side, t: .4, ward: has("hw_b2") ? 1.5 : 0 });   // 잔영 (· 잔영진)
  trailFx(x0, y0, P.x + P.w / 2, P.y + P.h / 2, 6, .4, WF2.smear); addFx("wfx", WF2.xcut, ex, e.y + e.h / 2, e.type === "b" ? 120 : 70, { life: .35, grow: .2, rot: side * .3 });
  hitstop = Math.max(hitstop, .07); shake = Math.max(shake, 6); Music.sfx("strike");
}
function quakeSlam() { P.slamLandT = .3; const drop = Math.max(0, P.y - (P.slamFrom ?? P.y)), big = has("wd_a1") ? 1 + Math.min(1, drop / 300) : 1; // 월도 낙월: the plunge meets the ground — a ring of force that stills and clears
  const cx = P.x + P.w / 2, f = P.y + P.h; addFx("wfx", WF2.quake, cx, f + 4, 92 * big, { life: .5, grow: .2, ay: 1 });
  for (const e of enemies) if (e.alive && !ghostly(e) && Math.abs(e.x + e.w / 2 - cx) < 130 * big && Math.abs(e.y + e.h - f) < 70) { e.stunT = Math.max(e.stunT || 0, e.type === "b" ? .3 : .8); if (has("wd_a2") && e.type !== "b") { e.liftT = songPos + 1; } if (e.type !== "b") hurtEnemy(e, false); }   // 지진: lifted, open to anything
  if (has("wd_a3") && drop >= 128) { addFx("wfx", WF2.crescent, cx, f - 30, 160, { life: .5, grow: .5, rot: Math.PI / 2 }); trailFx(cx - 560, f - 6, cx + 560, f - 6, 8, .5, WF2.quake); for (const e of enemies) if (e.alive && !ghostly(e) && Math.abs(e.x - cx) < 600 && Math.abs(e.y + e.h - f) < 90) hurtEnemy(e, e.type !== "b" ? true : 2); flash = .25; shake = 18; ougiArt(["ogA", 6], cx, f + 10, 260, { life: .6, ay: 1 }); }   // 낙월
  for (const b of bullets) if (!b.friendly && Math.hypot(b.x - cx, b.y - f) < 150) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 18, { life: .2 }); }
  shake = Math.max(shake, 11); hitstop = Math.max(hitstop, .06); Music.sfx("kill"); buzz(25);
}
function pogo() { // 내려베기: the downward cut springs off whatever it struck
  if (P.pogoed) return; P.pogoed = true; P.slam = false; P.vy = has("wd_b1") ? -780 : -640; regainAir(); if (has("wd_b1")) P.airDash = Math.max(P.airDash, baseAir() + 1);
  P.pogoN = (P.pogoN || 0) + 1; if (P.pogoN >= 2 && has("wd_b2")) popText(P.x + P.w / 2, P.y - 16, `${P.pogoN + 1}연속`);
  if (has("wd_b3")) { P.slowT = 1; addQi(6); ougiArt(["ogA", 7], P.x + P.w / 2, P.y + P.h, 120, { life: .5, ay: .9, flip: P.face < 0 }); }   // 비월
  addFx("perkfx", PF.wind, P.x + P.w / 2, P.y + P.h, 64, { life: .3, ay: 1 }); hitstop = Math.max(hitstop, .05); Music.sfx("jump");
}
const BASE_W = { mumyeong: "hwando", munyeo: "buchae", posu: "chonggeom" };
const oath = id => !!(run && run.oath === id);
const diff = () => TUNING.DIFF[settings.diff] || TUNING.DIFF[1];   // 난이도
const startBreath = () => Math.max(2, TUNING.START_BREATH + diff().breath) + (META.bld.sadang >= 1 ? 1 : 0) + (META.well && META.well.includes("start1") ? 1 : 0) + (META.well && META.well.includes("start2") ? 1 : 0);
const breathCap = () => oath("pi") ? 2 : oath("jangdan") ? 3 : 5 + (META.well && META.well.includes("cap1") ? 1 : 0);   // five breaths (six once the 약수 deepens the vessel)
// 영구 기록: currencies, unlocks, sealed books, story, codex (one save, survives runs)
const META_DEF = () => ({ hon: 0, shard: 0, bld: { seogo: 0, daejang: 0, bigeup: 0, sadang: 0, uibang: 0 }, tfs: ["sunbo", "hwalgong", "yeonbal", "bangyeok", "heup"], oaths: ["gonggung", "goyo2", "jangdan", "jilpung2", "geommu"],
  weapons: ["hwando"], chars: ["mumyeong"], books: [], strokes: 0, mem: [], ended: false, upBest: 0, towerBest: 0, codex: {}, titles: [], title: null, mastery: {}, quests: null, sash: "red", firsts: {} });
const META = Object.assign(META_DEF(), (() => { const m = store.get("meta", {}); return m && typeof m === "object" && !Array.isArray(m) ? m : {}; })());
{ // a save written by an older or broken build: every field keeps its kind, or falls back to the default (never a dead load screen)
  const D = META_DEF(), kind = v => Array.isArray(v) ? "array" : v === null ? "null" : typeof v;
  for (const k in D) { const d = D[k], v = META[k]; if (d === null) continue; if (kind(v) !== kind(d) || (typeof d === "number" && !Number.isFinite(v))) META[k] = d; }
  for (const k in D.bld) if (!Number.isFinite(META.bld[k])) META.bld[k] = 0;
  for (const k of ["well", "simbeop", "deco"]) if (META[k] != null && !Array.isArray(META[k])) delete META[k];
  for (const k of ["treeOpen", "deck"]) if (META[k] != null && (typeof META[k] !== "object" || Array.isArray(META[k]))) delete META[k];
  if (!Number.isFinite(META.sum) || META.sum < 0) META.sum = 0;
  if (META.pet != null && (typeof META.pet !== "object" || typeof META.pet.kind !== "string")) META.pet = null;
  if (META.pet) { if (!Number.isFinite(META.pet.fed) || META.pet.fed < 0) META.pet.fed = 0; if (META.pet.jeong != null && (!Number.isFinite(META.pet.jeong) || META.pet.jeong < 0)) META.pet.jeong = 0; }   // jeong left unset: petMeta carries an older nest forward
  META.hon = Math.max(0, META.hon); META.shard = Math.max(0, META.shard);
  if (!Number.isFinite(META.runN)) META.runN = Object.keys(META.mastery).length || META.hon > 0 || META.books.length ? 4 : 0;   // players from before: everything already open
  META.books = META.books.filter(bk => bk && typeof bk === "object" && Array.isArray(bk.perks)); }
for (const o of ["jilpung2", "geommu"]) if (!META.oaths.includes(o)) META.oaths.push(o);   // oaths added after a save was made
if (META.bld.seogo >= 1 && !META.oaths.includes("godok")) META.oaths.push("godok");
if (!META.simbeop) META.simbeop = ["noe", "hwa"];
if (META.quests) for (const q of META.quests.list || []) if (q.k === "strikes") { q.k = "kanpa"; q.n = 15; q.text = "한 판에 간파 15회"; }   // the old 일격 errand, read as 간파 now
if (META.chars.includes("posu")) { for (const g of ["jochong", "seungja"]) if (!META.weapons.includes(g)) META.weapons.push(g); }   // 포수 became 무명's guns
META.chars = META.chars.filter(c => c !== "shadowc" && c !== "posu"); if (!META.weapons.includes("jochong")) META.weapons.push("jochong");   // 그림자 무명 is no longer a hand you can play
for (const bk of META.books) { if (bk.char === "shadowc") bk.char = "mumyeong"; bk.perks = fitPerks(bk.perks.filter(id => CHOSIK.some(c => c.id === id))); }
function saveMeta() { store.set("meta", META); }
const baseAir = () => (has("d_air") ? 2 : 1) + (simb("pung") ? 1 : 0) + (has("d_cheonbo") && run && (run.qi || 0) >= 50 ? 1 : 0);
const cyc = () => (run && mode !== "tutorial" ? (run.tower ? Math.floor((run.floor - 1) / 3) : run.cycle || 0) : 0);   // how many times 천고 has been cut
const omen = id => !!(run && mode !== "tutorial" && (run.omen === id || (run.omens && run.omens.includes(id))));
const upOn = id => !!(run && run.up && run.up.includes(id));
const isFinal = () => !!(run && (run.tower || run.m === LAST_M));   // a stage that ends at 천고 with its guardian
const season = () => { const c = cyc(); return c ? ((c - 1) % 3) + 1 : 0; };   // 여름 비, then 가을 · 겨울 · 봄 in turn
const ghostly = e => (e.type === "r" && e.ph === "gone") || !!e.hidden;
const bossAlive = () => enemies.some(e => e.alive && e.type === "b");
const F3 = { orb: 8 }, FXB = { coin: 0, fire: 1, claw: 2, hair: 3, pillar: 4, beam: 5, fan: 6, water: 7, scrap: 8 };   // bossB extra frame; bossfx sheet
const maxv = () => (frenzy() ? 1.3 : 1) * MAXV * (has("d_jilbo") && P ? 1 + .08 * Math.min(5, P.chain || 0) : 1) * (1) * (oath("jilpung2") ? 1.25 : 1) * (1 + treeStat("spd"));
const strikeWin = () => STRIKE_WIN * (upOn("narrow") ? .7 : 1) * (simb("noe") ? 1.25 : 1) * (res("noe", 2) ? 1.2 : 1);
const PINE_N = 5, DEATH_SEAL = 5;   // pines sheet: five misty pines, then the 絶命 seal
const P2 = { plank: 0, ledge: 1, board: 2, rack: 3, haetae: 4, gate: 5, brazier: 6, lanterns: 7, sacks: 8 };
const CAL = { title: 0, death: 1, madang: [2, 3, 4, 5, 6], end: 7, clear: 8 };   // 천고 절명 초입 연비 망루 승천 결전 종국 등천
const PROP = { rope: 0, aim: 1, reticle: 2, pine: 3, stoneLantern: 4, jars: 5, banner: 6, sotdae: 7, palisade: 8 };
const DRESS = [[PROP.pine, 74, 3], [PROP.stoneLantern, 34, 2], [PROP.jars, 26, 1], [PROP.banner, 80, 3], [PROP.sotdae, 84, 3], [PROP.palisade, 28, 1]]; // [frame, world height, headroom tiles]
const OBJ = { lanternOn: 0, lanternOff: 1, kite: 2, thorns: 3, seal: 4, emitter: 5, slash: 6, slashRed: 7, splat: 8 };
const LAZY_SHEETS = new Set(["gun1", "gun2", "grun2", "mv0", "mvrun", "weapons", "mu", "mv1", "mfx", "po", "mv2", "pfx", "arms", "bossA", "bossB", "bossC", "bossD", "bossE", "bossF", "bossfx", "bname"]);
const CHAR_SHEETS = { mumyeong: ["mv0", "mvrun", "weapons"], munyeo: ["mu", "mv1", "mfx", "arms"], posu: ["po", "mv2", "pfx", "arms"] };
const sheetLoading = new Set();
function loadSheet(n) { // one atlas: frames JSON + image (ink-inverted copy for the night palette where needed)
  if (SPR[n] || sheetLoading.has(n)) return; sheetLoading.add(n);
  Promise.all([
    fetch(`assets/sprites/${n}.json?v=${ASSET_V}`).then(r => r.json()),
    new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = `assets/sprites/${n}.webp?v=${ASSET_V}`; })
  ]).then(([f, img]) => { let inv = null; if (["hero", "hero2", "foes", "objects", "fx", "props", "props2", "rocks", "pines", "slabs", "pillars", "guide", "bname", "foes3"].includes(n)) try { inv = inkInverted(img); } catch (e) { inv = null; }   // short of canvas memory: keep the sheet, lose only its night copy
    SPR[n] = { f, img, inv };
    if (SPR[n].inv) gpuize(SPR[n].inv, bm => { SPR[n].inv = bm; }); applyUiSprites(); }).catch(() => { sheetLoading.delete(n); const a = (sheetTry[n] = (sheetTry[n] || 0) + 1); setTimeout(() => loadSheet(n), Math.min(5000, 1200 * a)); });   // a failed load (offline blip, a deploy in progress) is tried again
}
const sheetTry = {};
function bossSheets(kind) { const B = BOSSES[kind]; if (!B) return []; const out = ["bossfx", "bcal", "bvfx", "bname", B.sheet];
  for (const v of Object.values(BOSS_POSE[kind] || {})) out.push(v[0]); for (const a of BOSS_ANIM[kind] || []) out.push(a[0]); return out; }
// 로딩: nothing starts until the pictures it needs are in — a bar fills while they arrive
function loadGate(sheets, imgs, then, label) {
  const el = $("loading"), bar = $("ldBar"), txt = $("ldTxt"), t0 = performance.now();
  const left = () => sheets.filter(n => !SPR[n]).length + imgs.filter(k => !IMG[k]).length, total = sheets.length + imgs.length;
  if (!left()) { el.hidden = true; then(); return; }
  for (const n of sheets) loadSheet(n);
  el.hidden = false; txt.textContent = label || "먹을 가는 중";
  const tick = () => { const l = left(), q = total ? 1 - l / total : 1; bar.style.width = Math.round(q * 100) + "%";
    if (!l) { setTimeout(() => { el.hidden = true; then(); }, 150); return; }
    if (performance.now() - t0 > 8000) txt.textContent = "연결이 느리다 · 조금만 기다려라";
    setTimeout(tick, 100); };
  tick();
}
const BASE_IMGS = ["far", "mid", "tex-paper", "tex-stone", "tex-giwa"];
// 처음 켤 때: download every asset once (several at a time), so no gate, guardian or hand has to wait later.
// Sheets held in memory stay as before (the lazy ones are only fetched into the cache here, not decoded).
function bootLoad() {
  const el = $("loading"), bar = $("ldBar"), txt = $("ldTxt"), t0 = performance.now();
  const urls = []; for (const n of LAZY_SHEETS) urls.push(`assets/sprites/${n}.json?v=${ASSET_V}`, `assets/sprites/${n}.webp?v=${ASSET_V}`);   // the core sheets and textures are already on their way through their own loaders — fetching them twice would only double the download
  urls.push("assets/lore.webp", "assets/tex-granite.webp");
  const core = ALL_SHEETS.filter(n => !LAZY_SHEETS.has(n));
  let got = 0, q = urls.slice();
  const one = async u => { for (let a = 0; ; a++) { try { const r = await fetch(u); if (r.ok) { await r.arrayBuffer(); break; } } catch (e) {} await new Promise(r => setTimeout(r, Math.min(5000, 800 * (a + 1)))); } got++; };   // keeps trying until it arrives
  const worker = async () => { while (q.length) await one(q.shift()); };
  Promise.all(Array.from({ length: 6 }, worker));   // six at a time, alongside the core loaders: fast on phones without choking the connection
  el.hidden = false; txt.textContent = "먹을 가는 중";
  const tick = () => { const dec = core.filter(n => SPR[n]).length + BASE_IMGS.filter(k => IMG[k]).length, decT = core.length + BASE_IMGS.length;
    const prog = (got + dec) / (urls.length + decT); bar.style.width = Math.round(prog * 100) + "%";
    const done = got >= urls.length && dec >= decT;
    if (done) { setTimeout(() => { el.hidden = true; }, 150); return; }   // no time limit: the menu opens only once everything is here
    txt.textContent = performance.now() - t0 > 10000 ? `연결이 느리다 · 받는 중 ${Math.round(prog * 100)}%` : `먹을 가는 중 · ${Math.round(prog * 100)}%`;
    setTimeout(tick, 100); };
  tick();
}
function playSheets() { const ch = (run && run.char) || "mumyeong", out = ALL_SHEETS.filter(n => !LAZY_SHEETS.has(n)).concat(CHAR_SHEETS[ch] || []).concat(isGun() ? ["gun1", "gun2", "grun2"] : []);
  if (run && mode !== "tutorial" && (run.tower || run.m === LAST_M)) out.push(...bossSheets(bossKindOf(run)));
  return [...new Set(out)]; }
function needSheets(list) { for (const n of list) loadSheet(n); }   // phones: only the hand being played and the guardian being fought are held in memory
const ALL_SHEETS = ["hero", "hero2", "foes", "objects", "ui", "fx", "hud", "hudsolid", "props", "props2", "rocks", "pines", "slabs", "pillars", "rogue", "roguea", "rogue2", "rogue3", "rogue4", "foes2", "bossA", "bossB", "bossfx", "bossC", "bossD", "bossE", "bossF", "hero3", "herofx", "slashfx", "perkfx", "weapons", "chars", "misc", "arms", "ic0", "ic1", "ic2", "ic3", "ic4", "ic5", "ic6", "ic7", "ic8", "ic9", "ic10", "ic11", "ic12", "ic13", "ic14", "ic15", "mu", "po", "mfx", "pfx", "vis", "guide", "mv0", "mv1", "mv2", "bcal", "bvfx", "bname", "mvrun", "mech", "foes3", "kfx", "kring", "wfx", "ic16", "gfx", "swm", "gun1", "gun2", "grun2", "muz", "ogA", "ogB", "hub", "pet", "npc"];
for (const n of ALL_SHEETS) if (!LAZY_SHEETS.has(n)) loadSheet(n);
function inkInverted(img) { // night palette: grey ink becomes bone white, coloured accents stay as they are
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
    if (mx - mn < 70) { const v = 236 - (d[i] + d[i + 1] + d[i + 2]) / 3 * 0.55; d[i] = v; d[i + 1] = v * .98; d[i + 2] = v * .94; }
  }
  g.putImageData(id, 0, 0); return c;
}
// draw frame i of a sheet with its (ax, ay) anchor at (x, y); sc = world units per atlas pixel
function drawSprite(sheet, i, x, y, sc, flip, ax = .5, night = false, ay = 1) {
  const s = SPR[sheet]; if (!s || !s.f[i]) return false;
  const f = s.f[i], w = f.w * sc, h = f.h * sc, img = night && s.inv ? s.inv : s.img;
  if (!flip) { ctx.drawImage(img, f.x, f.y, f.w, f.h, x - w * ax, y - h * ay, w, h); return true; }   // no save/restore: the most common draw stays cheap
  ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(img, f.x, f.y, f.w, f.h, -w * ax, -h * ay, w, h); ctx.scale(-1, 1); ctx.translate(-x, -y); return true;
}
const HERO_H = 58, FOE_H = 62; // drawn heights in world units (hitboxes stay smaller, which reads as fair)
const kOf = (sheet, ref, worldH) => SPR[sheet] ? worldH / SPR[sheet].f[ref].h : 0;
function uiPatch(i, x, y, w, h, alpha = 1) { const s = SPR.ui; if (!s) return false; const f = s.f[i]; ctx.globalAlpha = alpha; ctx.drawImage(s.img, f.x, f.y, f.w, f.h, x, y, w, h); ctx.globalAlpha = 1; return true; }
function applyUiSprites() { // brush-painted UI pieces become CSS images
  const root = document.documentElement.style;
  const url = (sheet, i) => { const s = SPR[sheet], f = s.f[i], c = document.createElement("canvas"); c.width = f.w; c.height = f.h; c.getContext("2d").drawImage(s.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h); return `url(${c.toDataURL()})`; };
  if (SPR.ui && !document.body.classList.contains("ui-ready")) {
    [["ring", 0], ["disc", 1], ["bar", 2], ["drop", 3], ["drop-o", 4], ["wash", 5], ["up", 6], ["arrow", 7], ["pause", 8]].forEach(([n, i]) => root.setProperty("--ui-" + n, url("ui", i)));
    document.body.classList.add("ui-ready");
  }
  if (SPR.objects && !root.getPropertyValue("--ui-kite")) root.setProperty("--ui-kite", url("objects", OBJ.kite));
  // icons come from the colour-keyed sheet: the flood-keyed one left paper-white patches inside the art
  if (SPR.roguea && !root.getPropertyValue("--chosik-2")) for (let i = 2; i < 9; i++) root.setProperty("--chosik-" + i, url("roguea", i));
  if (SPR.rogue && !root.getPropertyValue("--card")) {
    const s = SPR.rogue, f = s.f[1], cx = Math.round(f.w * .4), c = document.createElement("canvas"); c.width = f.w - cx; c.height = f.h;
    c.getContext("2d").drawImage(s.img, f.x + cx, f.y, f.w - cx, f.h, 0, 0, f.w - cx, f.h); root.setProperty("--card", `url(${c.toDataURL()})`); document.body.classList.add("card-ready");
  }
  if (SPR.rogue2 && !root.getPropertyValue("--chosik-100")) {
    for (let i = 0; i < 9; i++) root.setProperty("--chosik-" + (100 + i), url("rogue2", i));
  }
  if (META.sash && META.sash !== "red" && SASH_SHEETS.some(n => SPR[n] && !SPR[n].orig)) recolorSash();   // every sheet the sash appears on, as each one arrives
  if (SPR.vis && !root.getPropertyValue("--vis-seal")) root.setProperty("--vis-seal", url("vis", VIS.seal));   // the carved stamp frame for the result seal
  if (SPR.misc && !root.getPropertyValue("--ui-hon")) { root.setProperty("--ui-hon", url("misc", 8)); for (let i = 0; i < 9; i++) root.setProperty("--misc-" + i, url("misc", i)); }
  for (const k in BOSSES) { const B = BOSSES[k]; if (B.sheet !== "hero3" && SPR[B.sheet] && !root.getPropertyValue("--boss-" + k)) root.setProperty("--boss-" + k, url(B.sheet, B.idle)); }   // 도감 portraits
  if (SPR.slashfx && !root.getPropertyValue("--chosik-505")) for (let i = 5; i < 9; i++) root.setProperty("--chosik-50" + i, url("slashfx", i));
  if (SPR.perkfx && !root.getPropertyValue("--chosik-600")) for (let i = 0; i < 7; i++) root.setProperty("--chosik-60" + i, url("perkfx", i));
  if (SPR.rogue3 && !root.getPropertyValue("--chosik-200")) for (let i = 0; i < 9; i++) root.setProperty("--chosik-" + (200 + i), url("rogue3", i));
  for (let k = 0; k < 17; k++) if (SPR["ic" + k] && !root.getPropertyValue("--chosik-" + (700 + k * 10))) for (let i = 0; i < SPR["ic" + k].f.length; i++) root.setProperty("--chosik-" + (700 + k * 10 + i), url("ic" + k, i));   // 무녀·포수 and the new 비급
  if (SPR.rogue4 && !root.getPropertyValue("--chosik-300")) for (let i = 0; i < 9; i++) root.setProperty("--chosik-" + (300 + i), url("rogue4", i));
  if (SPR.calli && !document.body.classList.contains("ui-cal")) {
    root.setProperty("--cal-title", url("calli", CAL.title)); root.setProperty("--cal-end", url("calli", CAL.end)); root.setProperty("--cal-clear", url("calli", CAL.clear));
    CAL.madang.forEach((i, m) => root.setProperty("--cal-m" + m, url("calli", i)));
    document.body.classList.add("ui-cal");
  }
}

// ---------- painted terrain: cliff sprites laid over the tile blocks, big pines behind and in front ----------
function buildScenery() {
  const R = SPR.rocks, rnd = mulberry(hashStr(LV.grid.length + ":" + LV.w)), skins = [], back = [];
  const tall = [], wide = [];
  R.f.forEach((f, i) => (f.h > f.w * 1.15 ? tall : wide).push(i));
  for (let y = 1; y < LV.h; y++) for (let x = 0; x < LV.w; x++) {
    if (tileAt(x, y) !== 1 || tileAt(x, y - 1) === 1 || (x > 0 && tileAt(x - 1, y) === 1 && tileAt(x - 1, y - 1) !== 1)) continue;
    let n = 0; while (x + n < LV.w && tileAt(x + n, y) === 1 && tileAt(x + n, y - 1) !== 1) n++;
    let d = 0; const mid = x + (n >> 1); while (y + d < LV.h && tileAt(mid, y + d) === 1) d++;
    const W0 = n * T, h = Math.min(d * T, (LV.h - y) * T) + 24;
    // long runs are cut into overlapping pieces close to the art's own proportions, so nothing gets smeared
    const segs = Math.max(1, Math.round(W0 / Math.min(8 * T, Math.max(3 * T, h * 1.3))));
    for (let k = 0; k < segs; k++) {
      const w = W0 / segs, pool = h > w * 1.2 && tall.length ? tall : wide.length ? wide : tall;
      const piece = (bias) => ({ i: pool[(rnd() * pool.length) | 0], flip: rnd() < .5, x: x * T + w * (k + .5) + bias, y: y * T - 4, w, h: h + 8 });
      skins.push(piece(0));
      ;
    }
    x += n - 1;
  }
  // upper floors: runs whose block has open air below get a painted slab with a jagged underside (aspect kept)
  const slabs = []; LV.slabTiles = new Set();
  if (SPR.slabs) for (let y = 1; y < LV.h - 1; y++) for (let x = 0; x < LV.w; x++) {
    if (tileAt(x, y) !== 1 || tileAt(x, y - 1) === 1 || (x > 0 && tileAt(x - 1, y) === 1 && tileAt(x - 1, y - 1) !== 1)) continue;
    let n = 0; while (x + n < LV.w && tileAt(x + n, y) === 1 && tileAt(x + n, y - 1) !== 1) n++;
    const mid = x + (n >> 1); let d = 0; while (y + d < LV.h && tileAt(mid, y + d) === 1) d++;
    if (y + d < LV.h && d <= 3) { // floating: air below within a few tiles
      for (let yy = y; yy < y + d; yy++) for (let xx = x; xx < x + n; xx++) LV.slabTiles.add(yy * LV.w + xx);
      const segs = Math.max(1, Math.round(n / 6)), w = n * T / segs;
      for (let k = 0; k < segs; k++) slabs.push({ i: (rnd() * SPR.slabs.f.length) | 0, x: x * T + w * (k + .5), y: y * T - 2, w: w + (segs > 1 ? 6 : 0), minH: d * T + 10, flip: rnd() < .5 });
    }
    x += n - 1;
  }
  const pillars = [];
  if (SPR.pillars) {
    const spans = new Map();
    for (let y = 0; y < LV.h; y++) for (let x = 0; x < LV.w; x++) {
      if (tileAt(x, y) !== 1 || tileAt(x - 1, y) === 1) continue;
      let n = 0; while (tileAt(x + n, y) === 1 && x + n < LV.w) n++;
      if (n <= 3 && x > 0 && tileAt(x - 1, y) !== 1 && tileAt(x + n, y) !== 1) { const k = x + "," + n; (spans.get(k) || spans.set(k, []).get(k)).push(y); }
      x += n - 1;
    }
    for (const [k, ys] of spans) {
      const [x, n] = k.split(",").map(Number);
      for (let a = 0; a < ys.length;) { let b = a; while (b + 1 < ys.length && ys[b + 1] === ys[b] + 1) b++;
        const grounded = ys[b] + 1 >= LV.h || [...Array(n).keys()].some(k => tileAt(x + k, ys[b] + 1) === 1) || tileAt(x - 1, ys[b] + 1) === 1 || tileAt(x + n, ys[b] + 1) === 1;
        if (b - a + 1 >= 3) { for (let y = ys[a]; y <= ys[b]; y++) for (let xx = x; xx < x + n; xx++) LV.slabTiles.add(y * LV.w + xx);
          pillars.push({ i: (rnd() * 3) | 0, x: x * T + n * T / 2, y0: ys[a] * T - 2, y1: ys[b] + 1 >= LV.h ? LV.h * T + 200 : (ys[b] + 1) * T, g: grounded && ys[b] + 1 < LV.h ? (ys[b] + 1) * T : 0, w: n * T + 10, flip: rnd() < .5 }); }
        a = b + 1; }
    }
  }
  const pines = [], P = SPR.pines;
  // pines grow from the ground in world space (no parallax, so they never slide), only where the air above is clear
  if (P) for (let x = 4, last = -99; x < LV.w - 4; x++) {
    if (x - last < 14 || rnd() > .35) continue;
    let y = 1; while (y < LV.h && tileAt(x, y) === 0) y++;
    if (y >= LV.h || tileAt(x, y) !== 1 || y < 8) continue;
    const h = 220 + rnd() * 110, rows = Math.ceil(h / T * .85);
    let clear = true;
    for (let dx = -3; dx <= 3 && clear; dx++) for (let dy = 1; dy <= rows; dy++) if (tileAt(x + dx, y - dy) !== 0) { clear = false; break; }
    if (!clear) continue;
    pines.push({ i: (rnd() * Math.min(PINE_N, P.f.length)) | 0, x: x * T + 16, gy: y * T + 14, h, flip: rnd() < .5, a: .55 }); last = x;
  }
  const front = []; // big pines rooted on cliff edges (behind the actors), like the reference art
  if (P) for (const c of skins) if (c.w >= 3 * T && rnd() < .2 && !pillars.some(q => Math.abs(q.x - c.x) < c.w / 2 + 160)) { const right = rnd() < .5; front.push({ i: (rnd() * Math.min(PINE_N, P.f.length)) | 0, x: c.x + (right ? 1 : -1) * (c.w / 2 - 14), y: c.y - 2, h: 150 + rnd() * 70, flip: right }); }
  LV.scenery = { skins, back, pines, front, slabs, pillars };
}
const baked = new Map();   // brightness/contrast done once per image, never with ctx.filter in the frame loop (slow on Android)
function bake(img, br, ct) {
  if (!img) return img; const key = img; let m = baked.get(key); if (!m) baked.set(key, m = {});
  const id = br + "/" + ct; if (m[id]) return m[id];
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  try { const d = g.getImageData(0, 0, c.width, c.height), a = d.data; for (let i = 0; i < a.length; i += 4) for (let k = 0; k < 3; k++) a[i + k] = Math.max(0, Math.min(255, ((a[i + k] * br / 255) - .5) * ct * 255 + 127.5)); g.putImageData(d, 0, 0); } catch (_) {}
  m[id] = c; gpuize(c, bm => { m[id] = bm; }); return c;
}
function drawPillar(c, pal) { // stacked rock segments; a grounded pillar fades into the ground over its last 56px
  const f = SPR.pillars.f[c.i], segH = c.w * f.h / f.w, img = bake(pal.night ? SPR.pillars.inv : SPR.pillars.img, .72, 1.15), base = pal.night ? .45 : .88;
  const solidEnd = c.g ? c.g : c.y1, fade = c.g ? 56 : 0;
  const bands = [[c.y0, c.g ? solidEnd : solidEnd + 4, base]];
  for (let k = 1; k <= 7 && fade; k++) bands.push([solidEnd, solidEnd + k * 8, .26]);   // nested translucent layers sum to a smooth fade with no band edges
  for (const [a, b, al] of bands) {
    ctx.save(); ctx.beginPath(); ctx.rect(c.x - c.w, a, c.w * 2, b - a); ctx.clip(); ctx.globalAlpha = al;
    for (let y = c.y0, k = 0; y < b; y += segH - 10, k++) { if (y + segH < a) continue; ctx.save(); ctx.translate(c.x, y); if ((k + (c.flip ? 1 : 0)) % 2) ctx.scale(-1, 1); ctx.drawImage(img, f.x, f.y, f.w, f.h, -c.w / 2, 0, c.w, segH); ctx.restore(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawCliff(c, img, alpha) {
  const f = SPR.rocks.f[c.i], w = f.w * c.h / f.h;   // height fixed, width follows the art

  ctx.save(); ctx.translate(c.x, 0); if (c.flip) ctx.scale(-1, 1); ctx.globalAlpha = alpha;
  ctx.drawImage(img, f.x, f.y, f.w, f.h, -w / 2, c.y, w, c.h); ctx.restore(); ctx.globalAlpha = 1;
}

// ---------- rng ----------
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function todayKey() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

// ---------- input ----------
const held = { left: 0, right: 0, up: 0, down: 0, jump: 0, dash: 0, hook: 0, drum: 0 };
const press = { jump: 0, dash: 0, hook: 0, drum: 0 };
const stick = { x: 0, y: 0, id: null, bx: 0, by: 0 };
let slashReq = null;   // {dir|null, ts, dash}
const trail = [];      // swipe ink trail, screen space
const slashKey = code => code === "KeyJ" || code === "KeyX" || (settings.keys && settings.keys.slash === code);
function keyAct(code) {
  const ck = settings.keys || {}; for (const a in ck) if (a !== "slash" && ck[a] === code) return a;   // keys the player set for themselves come first
  switch (code) {
    case "ArrowLeft": case "KeyA": return "left";
    case "ArrowRight": case "KeyD": return "right";
    case "ArrowUp": case "KeyW": return "up";
    case "ArrowDown": case "KeyS": return "down";
    case "Space": case "KeyZ": return "jump";
    case "KeyK": case "KeyC": case "ShiftLeft": case "ShiftRight": return "dash";
    case "KeyL": case "KeyV": case "KeyE": return "hook";
    case "KeyQ": case "KeyF": case "KeyI": return "drum";
  }
  return null;
}
window.addEventListener("keydown", e => {
  if (LV && LV.stations && state === "play" && !e.repeat && ["KeyF", "KeyQ", "ArrowUp", "KeyW", "Enter"].includes(e.code) && hubNear) { e.preventDefault(); hubAct(); return; }   // 거점: walk up to a place and use it
  if (e.code === "Escape" || e.code === "KeyP") { if (state === "play") pauseGame(); else if (state === "pause") resumeGame(); return; }
  if (remapFor) { e.preventDefault(); if (e.code !== "Escape") { settings.keys = { ...(settings.keys || {}), [remapFor]: e.code }; saveSettings(); } remapFor = null; keyScreen(); return; }
  if (slashKey(e.code)) { if (!e.repeat) { Music.unlock(); if (wk() === "baldo" && state === "play") { iaiFrom = e.timeStamp; if (P) { P.iaiHold = true; P.iaiAt = performance.now(); } } else slashReq = { dir: null, ts: e.timeStamp, dash: false }; } e.preventDefault(); return; }
  const a = keyAct(e.code); if (!a) return;
  e.preventDefault(); Music.unlock();
  if (!held[a] && a in press) press[a] = 1;
  held[a] = 1;
});
window.addEventListener("keyup", e => {
  if (slashKey(e.code) && iaiFrom != null) { slashReq = { dir: null, ts: e.timeStamp, dash: false, iai: (e.timeStamp - iaiFrom) / 1000 }; iaiFrom = null; if (P) P.iaiHold = false; return; }
  const a = keyAct(e.code); if (a) held[a] = 0; });
let iaiFrom = null, remapFor = null;
const KEY_ACTS = [["slash", "베기", "J"], ["jump", "점프", "Space"], ["dash", "대시", "K"], ["hook", "연", "L"], ["drum", "오의 (북)", "Q"]];
const keyName = c => !c ? "" : c.replace(/^Key/, "").replace(/^Digit/, "").replace("ShiftLeft", "왼 Shift").replace("ShiftRight", "오른 Shift").replace("Space", "Space");
function keyScreen() { // 키 바꾸기: one extra key per action, kept beside the defaults
  const ck = settings.keys || {};
  board("키 바꾸기", remapFor ? "새 키를 눌러라 (Esc는 취소)" : "기본 키는 그대로 두고, 하나를 더 붙인다", KEY_ACTS.map(([a, nm, def]) => bdRow(nm, `기본 ${def}${ck[a] ? ` · 더한 키 ${keyName(ck[a])}` : ""}`, null, remapFor === a ? "누르는 중…" : "바꾸기", () => { remapFor = a; keyScreen(); })),
    [["처음대로", () => { settings.keys = {}; saveSettings(); keyScreen(); }], ["돌아가기", () => { remapFor = null; showScreen("settings"); state = "menu"; }, true]]);
}
const IAI_FULL = .32, IAI_MASTER = .75, iaiF = () => IAI_FULL * (has("bd_c1") ? .7 : 1), iaiM = () => IAI_MASTER * (has("bd_c1") ? .7 : 1);   // seconds of holding before the 발도 / 각궁 draw is full   // 발도: when the hand went to the hilt
window.addEventListener("blur", () => { for (const k in held) held[k] = 0; if (!hubOn && state === "play") pauseGame(); });   // another window took the focus: stop, as a hidden tab does
function markTouch() { document.body.classList.add("touch"); }
if (matchMedia("(pointer:coarse)").matches || "ontouchstart" in window) markTouch();
window.addEventListener("touchstart", markTouch, { passive: true });
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("gesturestart", e => e.preventDefault());

const zone = $("stickZone"), sBase = $("stickBase"), sKnob = $("stickKnob"), STICK_R = 50;
zone.addEventListener("pointerdown", e => {
  if (stick.id !== null) return;
  Music.unlock(); stick.id = e.pointerId; stick.bx = e.clientX; stick.by = e.clientY;
  try { zone.setPointerCapture(e.pointerId); } catch (_) {}
  const r = zone.getBoundingClientRect();
  sBase.style.left = (e.clientX - r.left) + "px"; sBase.style.top = (e.clientY - r.top) + "px";
  sBase.classList.add("on"); sKnob.style.transform = "";
  e.preventDefault();
});
zone.addEventListener("pointermove", e => {
  if (e.pointerId !== stick.id) return;
  let dx = e.clientX - stick.bx, dy = e.clientY - stick.by; const d = Math.hypot(dx, dy);
  if (d > STICK_R) {
    stick.bx += dx * (1 - STICK_R / d); stick.by += dy * (1 - STICK_R / d);
    const r = zone.getBoundingClientRect();
    sBase.style.left = (stick.bx - r.left) + "px"; sBase.style.top = (stick.by - r.top) + "px";
    dx = e.clientX - stick.bx; dy = e.clientY - stick.by;
  }
  stick.x = dx / STICK_R; stick.y = dy / STICK_R;
  sKnob.style.transform = `translate(${dx}px,${dy}px)`;
});
function stickEnd(e) { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; sBase.classList.remove("on"); }
zone.addEventListener("pointerup", stickEnd); zone.addEventListener("pointercancel", stickEnd);

// swipe to slash: direction = stroke direction; a long fast stroke becomes a dash-slash.
// The 일격 judgement uses the moment the finger landed.
const swipes = new Map(), swipeZone = $("swipeZone");
let drumHit = null;
window.addEventListener("pointerdown", e => {   // 천고난무: touch (or click) the full drum
  if (!drumHit || state !== "play" || document.body.classList.contains("padEdit")) return;
  if (Math.hypot(e.clientX - drumHit.x, e.clientY - drumHit.y) > drumHit.r) return;
  e.preventDefault(); e.stopPropagation(); Music.unlock(); press.drum = 1;
}, true);
swipeZone.addEventListener("pointerdown", e => {
  Music.unlock(); e.preventDefault();
  try { swipeZone.setPointerCapture(e.pointerId); } catch (_) {}
  swipes.set(e.pointerId, { x0: e.clientX, y0: e.clientY, t0: e.timeStamp, fired: false, dashed: false });
  if (wk() === "baldo" && P) { P.iaiHold = true; P.iaiAt = performance.now(); }
  trail.push({ x: e.clientX, y: e.clientY, t: performance.now(), start: true });
});
swipeZone.addEventListener("pointermove", e => {
  const s = swipes.get(e.pointerId); if (!s) return;
  trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  const dx = e.clientX - s.x0, dy = e.clientY - s.y0, d = Math.hypot(dx, dy);
  if (!s.fired && d > 26) { s.fired = true; slashReq = { dir: { x: dx / d, y: dy / d }, ts: s.t0, dash: false }; }
  else if (s.fired && !s.dashed && d > 115 && e.timeStamp - s.t0 < 230) { s.dashed = true; slashReq = { dir: { x: dx / d, y: dy / d }, ts: s.t0, dash: true }; }
});
function swipeEnd(e) {
  const s = swipes.get(e.pointerId); if (!s) return; swipes.delete(e.pointerId);
  if (!s.fired) slashReq = wk() === "baldo" ? { dir: null, ts: e.timeStamp, dash: false, iai: (e.timeStamp - s.t0) / 1000 } : { dir: null, ts: s.t0, dash: false };
  if (P) P.iaiHold = false;
}
swipeZone.addEventListener("pointerup", swipeEnd); swipeZone.addEventListener("pointercancel", swipeEnd);

document.querySelectorAll(".tb").forEach(b => {
  const k = b.dataset.k;
  b.addEventListener("pointerdown", e => { e.preventDefault(); Music.unlock(); try { b.setPointerCapture(e.pointerId); } catch (_) {} if (!held[k]) press[k] = 1; held[k] = 1; b.classList.add("down"); });
  const up = () => { held[k] = 0; b.classList.remove("down"); };
  b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
});
function axis() {
  return { x: Math.max(-1, Math.min(1, stick.x + held.right - held.left)), y: Math.max(-1, Math.min(1, stick.y + held.down - held.up)) };
}

// ---------- level building ----------
const START_PIECE = (() => { const r = []; for (let y = 0; y < 16; y++) r.push(y >= 12 ? "########" : y === 11 ? "  P     " : "        "); return r; })();
const END_PIECE = (() => { const r = []; for (let y = 0; y < 16; y++) r.push(y >= 12 ? "########" : y === 11 ? "     E  " : "        "); return r; })();
// procedural piece: flat ground with a random run of features, each kept within jump reach
// (gaps <= 5 tiles, steps <= 2 up, pillars 3 tall); edges stay flat ground so pieces always join
function genPiece(rng, m, ropes, ctl = 0) {   // ctl (천고탑): the higher, the more the ground asks of your hands
  const W = 16 + ((rng() * 11) | 0), c = [];
  for (let y = 0; y < 16; y++) c.push(Array.from({ length: W }, () => (y >= 12 ? "#" : " ")));
  const put = (x, y, ch) => { if (x >= 0 && x < W && y >= 0 && y < 16) c[y][x] = ch; };
  let x = 3 + ((rng() * 2) | 0);
  while (x < W - 5) {
    let r = rng(); const room = W - 3 - x;
    if (ropes && r > .62 && room >= 4) r = .8;                   // 겹금줄: rock and open ground give way to more ropes
    if (ctl && rng() < .14 * ctl) { const kind = (rng() * 3) | 0;   // control pieces
      if (kind === 0 && room >= 12) {                           // 과녁 사다리: a long pit crossed only by cutting target after target
        const gw = Math.min(room - 2, 11 + ((rng() * (2 + ctl)) | 0)), n = 2 + (gw >= 14 ? 1 : 0);
        for (let k = 0; k < gw; k++) { for (let y = 12; y < 16; y++) put(x + k, y, " "); put(x + k, 15, "^"); }
        for (let i = 1; i <= n; i++) put(x + Math.round(gw * i / (n + 1)) - 1, 6 + ((rng() * 3) | 0), "T");
        if (ctl < 3) put(x + (gw >> 1), 4, "o");                  // a kite as a lifeline, until the hands are trusted
        x += gw + 2; continue; }
      if (kind === 1 && room >= 9) {                            // 가시 밭: thorns underfoot, narrow ledges to hop
        const gw = Math.min(room - 2, 8 + ((rng() * (2 + ctl)) | 0));
        for (let k = 0; k < gw; k++) { for (let y = 12; y < 16; y++) put(x + k, y, " "); put(x + k, 15, "^"); }
        for (let k = 1; k < gw - 1; k += 3 + ((rng() * 2) | 0)) { const ly = 9 + ((rng() * 3) | 0), lw = ctl >= 4 ? 1 : 2; for (let j = 0; j < lw; j++) put(x + k + j, ly, "="); if (ctl >= 3 && rng() < .3) put(x + k, ly - 1, "?"); }
        x += gw + 2; continue; }
      if (kind === 2 && room >= 9) {                            // 금줄 회랑: ropes in step, a run that needs timing
        const n = 2 + (ctl >= 3 ? 1 : 0); for (let i = 0; i < n; i++) { const lx = x + 1 + i * 3; for (let k = -1; k <= 1; k++) put(lx + k, 3, "#"); put(lx, 4, i % 2 ? "M" : "L"); }
        x += n * 3 + 2; continue; }
    }
    if (r < .24 && room >= 5) {                                   // gap over thorns, kite above the wide ones
      const gw = Math.min(room - 2, 2 + ((rng() * (m >= 2 ? 4 : 3)) | 0));
      for (let k = 0; k < gw; k++) { for (let y = 12; y < 16; y++) put(x + k, y, " "); put(x + k, 15, "^"); }
      if (gw >= 4 && rng() < .55) put(x + (gw >> 1), 5 + ((rng() * 2) | 0), "o");
      x += gw + 2;
    } else if (r < .44 && room >= 4) {                            // raised step with a guard on it
      const sw = Math.min(room - 1, 3 + ((rng() * 4) | 0)), sh = 1 + ((rng() * 2) | 0);
      for (let k = 0; k < sw; k++) for (let y = 12 - sh; y < 12; y++) put(x + k, y, "#");
      if (rng() < .55) put(x + (sw >> 1), 11 - sh, "?");
      x += sw + 1 + ((rng() * 2) | 0);
    } else if (r < .62 && room >= 4) {                            // floating ledge (stand on it, jump up through it)
      const lw = Math.min(room, 3 + ((rng() * 3) | 0)), ly = 8 + ((rng() * 2) | 0);
      for (let k = 0; k < lw; k++) put(x + k, ly, "=");
      if (rng() < .45) put(x + (lw >> 1), ly - 1, "?"); else if (rng() < .5) put(x + (lw >> 1), ly - 3, "*");
      x += lw + 1;
    } else if (r < .74 && room >= 3) {                            // short rock pillar
      for (let y = 9; y < 12; y++) { put(x, y, "#"); put(x + 1, y, "#"); }
      if (rng() < .4) put(x, 8, "?");
      x += 3 + ((rng() * 2) | 0);
    } else if (r < .84 && (m >= 1 || ropes) && room >= 4) {                  // 금줄 hung from a short roof
      for (let k = -1; k <= 1; k++) put(x + 1 + k, 3, "#");
      put(x + 1, 4, rng() < .5 ? "L" : "M");
      x += 4;
    } else if (r < .92 && m >= 1 && room >= 11) {                // 과녁 다리: a pit only an aimed dash crosses — cut the targets to keep the air dash
      const gw = Math.min(room - 2, 8 + ((rng() * 3) | 0));
      for (let k = 0; k < gw; k++) { for (let y = 12; y < 16; y++) put(x + k, y, " "); put(x + k, 15, "^"); }
      const n = gw >= 10 ? 2 : 1; for (let i = 1; i <= n; i++) put(x + Math.round(gw * i / (n + 1)) - 1, 7 + ((rng() * 2) | 0), "T");
      if (rng() < .5) put(x + gw - 2, 5, "*");
      x += gw + 2;
    } else {                                                      // open ground, maybe a guard or a hawk
      if (rng() < .5) put(x + 1, 11, "?"); else if (rng() < .4) put(x + 1, 6, "*");
      x += 3 + ((rng() * 3) | 0);
    }
  }
  return c;
}
// boss arena before the last drum: a long floor with two ledges to dodge the 수문장's ground waves
const ARENA_PIECE = (() => { const r = []; for (let y = 0; y < 16; y++) r.push(y >= 12 ? "#".repeat(26) : y === 11 ? " C" + " ".repeat(16) + "b" + " ".repeat(7) : y === 9 ? "     ====      ====       " : y === 5 ? "       T          T       " : " ".repeat(26)); return r; })();   // two 과녁 above: a loop of aimed dashes down onto the guardian
function buildMadangMap(seed, m, cy = 0, omIn = null, arena = m === 4, crowd = 0, ctl = 0, len = 9) {   // len: how many pieces — the gates are short now, and full
  const omList = Array.isArray(omIn) ? omIn : [omIn], om = omList.includes("gyeopjul") ? "gyeopjul" : omList.includes("gunse") || crowd ? "gunse" : omIn;
  const rng = mulberry(seed ^ Math.imul(m + 1, 0x9E3779B1) ^ Math.imul(cy, 0x85EBCA6B));   // each turn of the tower lays out fresh
  const rows = START_PIECE.slice();
  const used = new Set(), cyF = ctl ? Math.floor(cy / 4) : cy;   // more guards each turn; in the 탑 every fourth floor counts as a turn
  const tiers = MADANG[m].tiers.slice();
  for (let i = tiers.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [tiers[i], tiers[j]] = [tiers[j], tiers[i]]; }   // fresh order every run
  for (const tier of tiers.slice(0, len)) {
    const kind = typeof tier === "string" ? tier[0] : "", t = kind ? +tier.slice(1) : tier;
    const fits = i => kind === "w" ? CHUNKS[i].wall && CHUNKS[i].tier <= t : kind === "m" ? CHUNKS[i].multi && CHUNKS[i].tier <= t : CHUNKS[i].tier === t && !CHUNKS[i].multi;
    let pool = CHUNKS.map((c, i) => i).filter(i => fits(i) && !used.has(i));
    if (!pool.length) pool = CHUNKS.map((c, i) => i).filter(fits);
    const ci = pool[(rng() * pool.length) | 0];
    let c;
    if (rng() < (om === "gyeopjul" ? .7 : .4 + .08 * ctl)) c = genPiece(rng, m, om === "gyeopjul", ctl);                          // about 40% of pieces are generated fresh
    else { used.add(ci); c = CHUNKS[ci].map.map(r => r.split("")); if (rng() < .5) c.forEach(row => row.reverse()); }   // handmade, sometimes mirrored
    if (c[11][1] === " ") c[11][1] = "C";
    for (let y = 0; y < 16; y++) for (let x = 0; x < c[y].length; x++) {
      const ch = c[y][x];
      if (ch === "?") {
        const r = rng();
        c[y][x] = m === 0 ? (r < .55 ? "p" : "g") : m === 1 ? (r < .35 ? "p" : r < .62 ? "g" : r < .82 ? "s" : "a") : (r < .2 ? "p" : r < .36 ? "g" : r < .52 ? "h" : r < .66 ? "s" : r < .84 ? "a" : "k");   // 순라 in front, then 포수·저격수, 등패수, 자객, 북잡이
        if (cy >= 1) { const r2 = rng(); if (r2 < .14) c[y][x] = "m"; else if (cy >= 2 && r2 < .28) c[y][x] = "r"; }   // 무당 from the second turn, 저승사자 from the third
      } else if (ch === "*") c[y][x] = rng() < .5 + .12 * m ? "d" : " ";
      else if ((ch === "L" || ch === "M") && rng() < .5) c[y][x] = ch === "L" ? "M" : "L";
    }
    // extra guard on open ground in about half the pieces
    for (let extra = (om === "gunse" ? 2 : 1) + crowd + Math.min(4, cyF); extra > 0; extra--) if (rng() < .45 + .08 * m + (om === "gunse" ? .35 : 0) + .1 * Math.min(3, cyF)) /* each turn of 천고 brings more guards; the 탑 asks for hands instead */ for (let tries = 0; tries < 8; tries++) {
      const x = 3 + ((rng() * (c[0].length - 6)) | 0);
      let y = 2; while (y < 15 && c[y][x] === " ") y++;
      if (y < 15 && c[y][x] === "#" && c[y - 1][x] === " " && c[y - 2][x] === " " && !(cyF ? c[y - 1].slice(Math.max(0, x - 2), x + 3) : c[y - 1]).some(ch => "gshdmrpak".includes(ch))) { /* later turns: guards may share a stretch of ground, just not stand on top of each other */ c[y - 1][x] = m >= 2 && rng() < .35 ? "h" : rng() < .5 ? "p" : "g"; break; }
    }
    for (let y = 0; y < 16; y++) rows[y] += c[y].join("");
  }
  if (arena) for (let y = 0; y < 16; y++) rows[y] += ARENA_PIECE[y];   // only 天鼓臺 (tier 4) has a guardian, 천고 right behind it
  for (let y = 0; y < 16; y++) rows[y] += END_PIECE[y];
  // scatter extra kites through open sky so the 연 line can carry you across most of the 마당
  const W = rows[0].length, grid = rows.map(r => r.split(""));
  for (let x = 0; x < W; x++) {   // wide pits: a 과녁 over the middle so a missed dash is not the only way over
    if (grid[12][x] === "#" || grid[12][x] === "=") continue; let e = x; while (e < W && grid[12][e] !== "#" && grid[12][e] !== "=") e++;
    const gw = e - x, cover = grid.slice(3, 11).some(r => r.slice(x - 1, e + 1).some(ch => ch === "o" || ch === "T"));
    if (gw >= 6 && !cover) { const mx = x + (gw >> 1); if (grid[7][mx] === " " && grid[8][mx] === " ") grid[7][mx] = "T"; }
    x = e; }
  for (let x = 10, last = -99; x < W - 10; x++) {
    if (x - last < 18 || rng() > .12) continue;
    const y = 4 + ((rng() * 3) | 0);
    let ok = true;
    for (let dy = -2; dy <= 3 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (grid[y + dy] && grid[y + dy][x + dx] !== " ") { ok = false; break; }
    if (!ok || grid.some((r, yy) => r.slice(Math.max(0, x - 6), x + 7).includes("o") && Math.abs(yy - y) < 6)) continue;
    grid[y][x] = "o"; last = x;
  }
  return grid.map(r => r.join(""));
}

let LV = null;
function loadMap(map, pal, hints) {
  freeGround(LV);   // the old gate's baked ground goes with it
  const h = map.length, w = Math.max(...map.map(r => r.length));
  const grid = new Uint8Array(w * h);
  const lv = { w, h, grid, pal, hints: hints || [], defs: [], points: [], targets: [], cps: [], lasers: [], start: null, exit: null, stains: [] };
  let id = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = map[y][x] || " ";
    if (ch === "#") grid[y * w + x] = 1;
    else if (ch === "^") grid[y * w + x] = 2;
    else if (ch === "=") grid[y * w + x] = 3;   // ledge: stand on it, jump up through it
    else if (ch === "P") lv.start = { x: x * T + 7, y: (y + 1) * T - 30 };
    else if (ch === "E") lv.exit = { x: x * T + 1, y: (y - 1) * T + 6, w: T - 2, h: 2 * T - 6 };
    else if ("gsdhmrbpak".includes(ch)) lv.defs.push({ type: ch, tx: x, ty: y, id: id++ });
    else if (ch === "o") lv.points.push({ x: x * T + 16, y: y * T + 16, sway: Math.random() * 6 });
    else if (ch === "T") lv.targets.push({ x: x * T + 16, y: y * T + 16, t: 0, sway: Math.random() * 6 });   // 과녁: cut it with a dash and the air dash comes back
    else if (ch === "C") lv.cps.push({ x: x * T + 16, y: (y + 1) * T, on: false });
    else if (ch === "L" || ch === "M") lv.lasers.push({ tx: x, ty: y, phase: ch === "L" ? 0 : 2 });
  }
  for (const l of lv.lasers) { let yy = l.ty + 1; while (yy < h && grid[yy * w + l.tx] !== 1) yy++; l.x = l.tx * T + 16; l.y0 = l.ty * T + 22; l.y1 = yy * T; }
  lv.ridges = makeRidges(w * T, hashStr(map[11]));
  lv.drums = [];
  for (const frac of []) { // (retired) mid-마당 drums
    const spot = () => {
      for (let dx = 0; dx < 40; dx++) for (const x of [Math.floor(w * frac) + dx, Math.floor(w * frac) - dx]) {
        if (x < 3 || x >= w - 3 || lv.defs.some(d => Math.abs(d.tx - x) < 2)) continue;
        for (let y = 3; y < h; y++) if (grid[y * w + x] === 1 && grid[(y - 1) * w + x] === 0 && grid[(y - 2) * w + x] === 0) return { x, y };
      }
      return null;
    };
    const p = spot(); if (p) lv.drums.push({ id: lv.drums.length, x: p.x * T + 16, y: p.y * T, w: 34, h: 40 });
  }

  // set dressing placed where it means something (decor only, never collides)
  lv.dress = []; lv.ledgeStone = false;
  { const rnd = mulberry(hashStr(map.join("").slice(0, 400)) ^ w), used = new Set();
    const tile = (x, y) => x < 0 || x >= w || y < 0 || y >= h ? 0 : grid[y * w + x];
    const surf = (x, y0) => { for (let y = Math.max(1, y0 - 3); y < h; y++) if (tile(x, y) === 1 && tile(x, y - 1) === 0) return y; return -1; }; // top surface at or below y0-3
    const clear = (x, y, n) => { for (let k = 1; k <= n; k++) if (tile(x, y - k) !== 0) return false; return true; };
    const put = (sheet, i, tx, ty, hh, o = {}) => {
      const key = tx + "," + ty; if (tx < 1 || tx >= w - 1 || used.has(key) || ty < 1) return false;
      if (!o.hang && (tile(tx, ty) !== 1 || !clear(tx, ty, Math.ceil(hh / T)))) return false;
      used.add(key); lv.dress.push({ sheet, i, x: tx * T + 16 + (o.dx || 0), y: ty * T + (o.hang ? 0 : 2), h: hh, flip: !!o.flip, ay: o.hang ? 0 : 1 }); return true;
    };
    if (lv.start) { const sx = Math.floor(lv.start.x / T), sy = Math.floor((lv.start.y + 31) / T); put("props", PROP.sotdae, sx - 1, sy, 84); put("props2", P2.haetae, sx + 3, sy, 34); }
    if (lv.exit) { const ex = Math.floor(lv.exit.x / T), ey = Math.floor((lv.exit.y + lv.exit.h) / T); lv.gate = { x: ex * T + 16, y: ey * T + 2 }; put("props", PROP.stoneLantern, ex - 2, ey, 36); put("props", PROP.stoneLantern, ex + 2, ey, 36, { flip: true }); }
    for (const d of lv.defs) {
      const y = d.ty + 1; if (tile(d.tx, y) !== 1) continue;
      if (d.type === "h") { rnd() < .6 && put("props2", P2.rack, d.tx - 2, y, 46); rnd() < .5 && put("props", PROP.banner, d.tx + 1, y, 82); }
      else if (d.type === "g") { rnd() < .55 && put("props", PROP.banner, d.tx + 1, y, 82); rnd() < .45 && put("props", PROP.palisade, d.tx - 2, y, 28); }
      else if (d.type === "s") { rnd() < .5 && put("props2", P2.brazier, d.tx + 1, y, 34); }
    }
    for (const c of lv.cps) { const cx = Math.floor(c.x / T), cy = Math.floor(c.y / T); rnd() < .7 && put(rnd() < .5 ? "props2" : "props", rnd() < .5 ? P2.sacks : PROP.jars, cx + 1, cy, rnd() < .5 ? 30 : 26); }
    for (let x = 2; x < w - 2; x++) {
      const y = surf(x, 3); if (y < 0) continue;
      const edge = (tile(x + 1, y) === 0 && tile(x + 1, y + 1) === 0) || (tile(x - 1, y) === 0 && tile(x - 1, y + 1) === 0);
      if (!edge && y <= 7 && rnd() < .18) put("props2", P2.brazier, x, y, 34);
    }
    for (let y = 2; y < h - 4; y++) for (let x = 2; x < w - 6; x++) { // paper lanterns strung under roofs
      let n = 0; while (x + n < w && tile(x + n, y) === 1 && tile(x + n, y + 1) === 0 && tile(x + n, y + 2) === 0 && tile(x + n, y + 3) === 0) n++;
      ;
      x += Math.max(0, n);
    } }
  LV = lv;
}
function tileAt(tx, ty) { if (tx < 0 || tx >= LV.w) return 1; if (ty < 0 || ty >= LV.h) return 0; return LV.grid[ty * LV.w + tx]; }
function rectSolid(x, y, w, h) {
  const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 0.01) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (tileAt(tx, ty) === 1) return true;
  return false;
}
function solidPt(x, y) { return tileAt(Math.floor(x / T), Math.floor(y / T)) === 1; }
function los(x0, y0, x1, y1) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10); for (let i = 1; i < n; i++) { const t = i / n; if (solidPt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; } return true; }
function moveX(o, dx) { o.x += dx; if (!rectSolid(o.x, o.y, o.w, o.h)) return false; o.x = dx > 0 ? Math.floor((o.x + o.w) / T) * T - o.w - 0.001 : (Math.floor(o.x / T) + 1) * T + 0.001; return true; }
function moveY(o, dy) { o.y += dy; if (!rectSolid(o.x, o.y, o.w, o.h)) return false; o.y = dy > 0 ? Math.floor((o.y + o.h) / T) * T - o.h - 0.001 : (Math.floor(o.y / T) + 1) * T + 0.001; return true; }
// ledges (tile 3): only the top edge is solid, and only while falling onto it from above
function ledgeBelow(o, prevBottom) {
  const bottom = o.y + o.h, x0 = Math.floor(o.x / T), x1 = Math.floor((o.x + o.w - .01) / T);
  for (let r = Math.floor(prevBottom / T); r <= Math.floor(bottom / T); r++) {
    const top = r * T; if (top < prevBottom - .5 || top > bottom) continue;
    for (let tx = x0; tx <= x1; tx++) if (tileAt(tx, r) === 3) return top;
  }
  return null;
}
function onLedge(o) { const b = o.y + o.h, r = Math.round(b / T); if (Math.abs(b - r * T) > 1.5) return false; for (let tx = Math.floor(o.x / T); tx <= Math.floor((o.x + o.w - .01) / T); tx++) if (tileAt(tx, r) === 3) return true; return false; }
const groundPt = (x, y) => { const v = tileAt(Math.floor(x / T), Math.floor(y / T)); return v === 1 || v === 3; };
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function makeRidges(worldW, seed) {
  const rnd = mulberry(seed), layers = [];
  for (const [f, amp, base, step] of [[0.08, 120, 0.42, 90], [0.2, 80, 0.6, 60]]) {
    const pts = []; const span = worldW * f + 4000; let y = 0, v = 0;
    for (let x = -400; x < span; x += step) { v += (rnd() - 0.5) * 0.9; v *= 0.8; y = Math.max(-1, Math.min(1, y + v * 0.6)); pts.push([x, y * amp * (0.6 + rnd() * 0.6)]); }
    layers.push({ f, base, pts });
  }
  return layers;
}

// ---------- state ----------
let state = "menu";      // menu | interlude | play | dead | pause | result
let mode = null;         // "run" | "tower" | "tutorial"
let run = null;
let P = null, enemies = [], bullets = [], parts = [], ghosts = [], seals = [];
let deadIds = new Set(), cpSave = null, vfx = [], beams = [], clones = [], inBloom = false;
let lastHitDir = null, deathT = 0, hitstop = 0, shake = 0, songPos = 0, flash = 0;
let cam = { x: 0, y: 0 }, hookCand = null, toastT = 0;

function newPlayer(x, y) {
  return { x, y, w: 18, h: 30, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0, wall: 0, wallLock: 0,
    airDash: 1, dashT: 0, dashCd: 0, dashDir: { x: 1, y: 0 }, slashT: 0, slashCd: 0, slashDir: { x: 1, y: 0 }, strike: false, clanged: null, dashHit: new Set(), hitSet: new Set(),
    hook: null, hookCd: 0, ki: 1, chain: 0, climbT: 0.5, climbing: false, focus: false, focusT: 0, run: 0, scarf: [] };
}
const TYPE_HP = TUNING.TYPE_HP;   // plain cuts it takes: hawks and gunners fall at once, the shield and the drummer stand; 간파 and 일섬 still cut any of them down
function spawnEnemies() {
  needSheets(CHAR_SHEETS[(run && run.char) || "mumyeong"] || []);
  const up = upOn("hp") ? 1 : 0, eliteP = run && run.node === "elite" ? .45 + .1 * Math.min(3, cyc()) : cyc() >= 1 && mode !== "tutorial" ? .18 + .07 * Math.min(3, cyc()) : 0, es = ((run && run.seed) || 1) % 997 + (run && run.m || 0) * 31 + (run && run.floor || 0) * 17;
  const list = LV.defs.filter(d => !deadIds.has(d.id)).map(d => { const hp = mode === "tutorial" ? 1 : (TYPE_HP[d.type] || 1) + up;   // toughness by kind, not by turn (the 수련터 keeps everyone at one)
    if (d.type === "d") return { hp, maxHp: hp, id: d.id, type: "d", x: d.tx * T + 2, y: d.ty * T + 6, w: 28, h: 20, vx: 0, vy: 0, hx: d.tx * T + 2, hy: d.ty * T + 6, t: Math.random() * 6, alive: true };
    if (d.type === "h") return { hp, maxHp: hp, id: d.id, type: "h", x: d.tx * T + 4, y: (d.ty + 1) * T - 42, w: 24, h: 42, face: -1, vx: 0, alive: true };
    if (d.type === "m") return { hp, maxHp: hp, id: d.id, type: "m", x: d.tx * T + 5, y: (d.ty + 1) * T - 44, w: 22, h: 44, face: -1, castAt: songPos + 1 + Math.random(), castT: 0, alive: true };
    if (d.type === "r") return { hp, maxHp: hp, id: d.id, type: "r", x: d.tx * T + 5, y: (d.ty + 1) * T - 46, w: 22, h: 46, face: -1, ph: "idle", nextAt: songPos + 1.5 + Math.random(), fade: 1, alive: true };
    if (d.type === "p") return { hp, maxHp: hp, id: d.id, type: "p", x: d.tx * T + 5, y: (d.ty + 1) * T - 44, w: 22, h: 44, face: -1, vx: 0, swingAt: null, nextSwing: 0, alive: true };   // 순라: a patrol saber
    if (d.type === "a") return { hp, maxHp: hp, id: d.id, type: "a", x: d.tx * T + 5, y: (d.ty + 1) * T - 40, w: 22, h: 40, face: -1, vx: 0, dashAt: null, lungeT: 0, nextLunge: 1, counter: false, alive: true };   // 자객: reads your 무아경
    if (d.type === "k") return { hp, maxHp: hp, id: d.id, type: "k", x: d.tx * T + 1, y: (d.ty + 1) * T - 46, w: 30, h: 46, face: -1, drumAt: null, nextDrum: songPos + 2 + Math.random(), beatT: 0, alive: true };   // 북잡이: his drum sets the others striking together
    if (d.type === "b") {
      const kind = window.__forceBoss || (run && mode !== "tutorial" ? bossKindOf(run) : "sumun"), B = BOSSES[kind]; needSheets(bossSheets(kind)); const bh = Math.round((Math.round(B.hp * TUNING.BOSS_HP_MUL * diff().bossHp) + TUNING.BOSS_HP_PER_CYCLE * cyc()) * (upOn("bosshp") ? 1.5 : 1)), floor = (d.ty + 1) * T;
      return { hp: bh, maxHp: bh, id: d.id, type: "b", kind, x: d.tx * T + 16 - B.w / 2, y: (B.fly ? floor - 95 - B.h / 2 : floor - B.h), w: B.w, h: B.h, floor, face: -1, vx: 0, vy: 0, act: null, nextAt: 0, n: (run && run.seed || 0) % 4, mask: 0, raged: upOn("rage"), alive: true, book: kind === "shadow" ? shadowBook() : null };
    }
    return { hp, maxHp: hp, id: d.id, type: d.type, x: d.tx * T + 5, y: (d.ty + 1) * T - 42, w: 22, h: 42, face: -1, fireAt: null, aimFrom: 0, readyAt: songPos + (run && mode !== "tutorial" && !run.tower && run.node !== "elite" ? TUNING.ENTRY_FIRE_DELAY : 0.6) + Math.random() * 0.8, tx: 0, ty: 0, alive: true };
  });
  for (const e of list) if (e.type !== "b" && hrnd(e.id * 13 + cyc(), es) < eliteP) { e.elite = true; e.hp++; e.maxHp++; }   // 정예: from the second turn some foes come marked — tougher, red-shot, worth more
  enemies = list;
  if (run && mode !== "tutorial" && !run.tower && LV.start) for (const e of enemies) if ("gspak".includes(e.type) && Math.hypot(e.x - LV.start.x, e.y - LV.start.y) < TUNING.START_SLEEP_R) e.sleepy = true;   // foes near where you walk in hold until you make the first move
}

// ---------- run flow ----------
const dailySeed = key => { let h = 2166136261; for (const c of "천고" + key) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };   // 오늘의 길: one seed for everyone, today
function newRun(quiet, daily) {
  if (hubOn) leaveHub();
  const key = todayKey();
  run = { v: 2, seed: daily ? dailySeed(key) : (Math.random() * 2 ** 32) >>> 0, dateKey: key, daily: daily ? key : undefined, m: 0, cp: -1, dead: [],
    breath: startBreath(), time: 0, deaths: 0, kills: 0, strikes: 0, slashes: 0, perks: [], weapon: "hwando", oath: null, char: "mumyeong", picking: true };
  mode = "run";
  saveRun(); if (quiet !== true) startPicks();
}
// a row of cards for one decision; items: { name, han, desc, cost?, glyph? }
function pickScreen(title, sub, items, onPick) {
  $("choice").classList.remove("route", "wpick", "tree"); document.querySelectorAll(".route-trail,.ch-held").forEach(o => o.remove());
  $("chTitle").textContent = title; $("chMadang").textContent = sub;
  const box = $("cards"); box.innerHTML = "";
  for (const it of items) {
    const b = document.createElement("button"); b.className = "card omen" + (it.calm ? " calm" : "");
    b.innerHTML = `<i class="ic"></i><b class="nm"></b><span class="ds"></span><span class="cost"></span>`;
    b.querySelector(".ic").textContent = it.glyph || it.han; if ((it.glyph || it.han).length > 2) b.querySelector(".ic").style.fontSize = "30px"; b.querySelector(".nm").textContent = it.name; b.querySelector(".ds").textContent = it.desc || ""; b.querySelector(".cost").textContent = it.cost ? "대가 · " + it.cost : "";
    b.addEventListener("click", () => { Music.sfx("lantern"); onPick(it); });
    box.appendChild(b);
  }
  state = "choice"; Music.pause(); for (const k in held) held[k] = 0; showScreen("choice");
}
// what a run starts with: character, weapon, oath (and 업 once the tale is told)
function startPicks(step = 0) {
  const next = () => startPicks(step + 1);
  if (step === 0) { const cs = (typeof CHARS !== "undefined" ? CHARS : []).filter(c => META.chars.includes(c.id)); if (cs.length < 2) return next();
    return pickScreen("검객을 골라라", "누구로 오를 것인가", cs, c => { run.char = c.id; run.breath = Math.min(run.breath, breathCap()); saveRun(); next(); }); }
  if (step === 1) { const own = run.char === "munyeo" || run.char === "posu" ? run.char : undefined;   // 무녀 and 포수 have their own arms
    const ws = Object.entries(WEAPONS).filter(([id, w]) => w.ch === own && (META.weapons.includes(id) || id === BASE_W[run.char])).map(([id, w]) => ({ id, ...w }));
    run.weapon = BASE_W[run.char] || "hwando"; if (ws.length < 2) return next();
    return weaponPick(ws, w => { run.weapon = w.id; saveRun(); next(); }); }
  if (step === 2 && !run.simbeop && (META.runN || 0) >= 2) {   // 심법 opens after two runs, 서약 after four: the first run is the weapon alone
 const pool = SIMBEOP.filter(m => META.simbeop.includes(m.id)), rs = mulberry(run.seed ^ 0x51B), drawn = [];
    while (drawn.length < 3 && pool.length) drawn.push(pool.splice((rs() * pool.length) | 0, 1)[0]);   // three at random, like the oaths
    const ms = drawn.map(m => ({ ...m, desc: `${m.desc} · 시작 비급 ${CHOSIK.find(c => c.id === startOf(m, run.char)).name}` }));
    return pickScreen("심법을 골라라", "어느 계열로 오를 것인가", ms, m => { run.simbeop = m.id; if (!run.perks.includes(startOf(m, run.char))) run.perks.push(startOf(m, run.char)); saveRun(); startPicks(2.5); }); }
  if (step === 2.5) step = 2;
  if (step === 2 && (META.runN || 0) >= 4) { const rnd = mulberry(run.seed ^ 0x0A7), pool = OATHS.filter(o => META.oaths.includes(o.id)), picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice((rnd() * pool.length) | 0, 1)[0]);
    picks.push({ id: null, name: "서약 없음", han: "無", desc: "아무것도 걸지 않는다", calm: true });
    return pickScreen("서약을 하라", "무엇을 걸고 오를 것인가", picks, o => { run.oath = o.id; if (o.id === "pi") run.breath = Math.min(run.breath, 2); saveRun(); next(); }); }
  if (step === 3 && META.ended && typeof upPicks === "function") return upPicks(next);
  run.picking = false; saveRun(); Music.stop(); showInterlude();
}
function continueRun() {
  if (hubOn) leaveHub();
  const s = store.get("run", null); if (!s || typeof s !== "object" || Array.isArray(s)) return;
  if (!WEAPONS[s.weapon]) s.weapon = "hwando"; if (!Array.isArray(s.perks)) s.perks = []; if (!Array.isArray(s.dead)) s.dead = []; if (!Number.isFinite(s.m) || s.m < 0) s.m = 0;   // a broken save still plays
  if (!s.tower) s.breath = Math.max(1, Math.min(9, Number.isFinite(s.breath) ? s.breath : 3));
  s.perks = s.perks.filter(id => { const c = CHOSIK.find(o => o.id === id); return !(c && c.ougi && c.tree) || id === s.ougiId; });   // 오의 only by 깨달음
  run = s; mode = s.tower ? "tower" : "run"; if (run.char === "posu") { run.char = "mumyeong"; run.weapon = "jochong"; } if (run.char === "shadowc") run.char = "mumyeong"; run.perks = fitPerks((run.perks || []).filter(id => CHOSIK.some(c => c.id === id)));   // older saves may hold more than the slots allow
  if (!s.v && !s.tower) { s.m = [0, 2, 5][s.m] ?? s.m; s.v = 2; }   // a run saved when a turn was three long gates
  if (s.tower) s.m = LAST_M; if (s.m > LAST_M) s.m = LAST_M;
  if (s.picking) { startPicks(); return; }
  if (s.choosing === "route") { showRoute(); return; }
  if (s.choosing === "enlight") { enlighten(); return; }
  if (s.choosing === "omen") showOmen(); else if (s.choosing) showChoice(s.choosing); else showInterlude();
}
function saveRun() { if (run && mode !== "tutorial") store.set("run", run); }
function showInterlude() {
  state = "interlude"; hubNear = null; $("bAct").hidden = true;
  const md = MADANG[MD(run.m)], jd = Music.JANGDAN[md.jd];
  const sg = stageOf(run.m), road = !run.tower && (run.node === "rest" || run.node === "event"); $("iOrd").textContent = road ? (run.node === "rest" ? "쉼터 · 주막" : "기연") : (run.node === "elite" && !isFinal() ? "험로 · " : "") + sg.ko; $("iOrd").dataset.han = sg.han;   // the reading large in the brush face, the hanja small beneath
  const om = OMENS.find(o => o.id === run.omen);
  const bk = isFinal() && BOSSES[bossKindOf(run)];
  $("iLine").textContent = road ? (run.node === "rest" ? "주막 불빛이 보인다. 잠시 숨을 고르고 가자." : "길가에 누군가 서 있다.") : run.m === 0 && run.cycle ? SEASON[season()].line : bk ? `${bk.line} ${josa(bk.name, "을", "를")} 베면 그 뒤에 천고가 있다.` : md.line;
  $("iMeta").textContent = ((run.cycle || 0) ? `${run.cycle + 1}번째 판 · ${SEASON[season()].name} · ` : "") + `${sg.ko} (${ORD[run.m]} 관문) · ` + jd.name + " · " + "●".repeat(Math.max(0, Math.min(20, run.breath | 0))) + "○".repeat(Math.max(0, 3 - (run.breath | 0))) + (om && !om.calm ? " · 징조 " + om.name : "");
  $("interlude").classList.remove("night");
  if (run.tower) { // 천고탑: every floor is a guardian's stage, crowded, with all the omens gathered so far
    const tier = [0, 2, 4][(run.floor - 1) % 3];
    $("iMeta").textContent = `천고탑 ${run.floor}층 · ${SEASON[season()].name} · ` + Music.JANGDAN[MADANG[tier].jd].name + " · " + "●".repeat(Math.max(0, Math.min(20, run.breath | 0))) + (run.omens.length ? " · 징조 " + run.omens.map(id => OMENS.find(o => o.id === id).name).join("·") : "");
    loadMap(buildMadangMap(run.seed + run.floor * 7919, tier, run.cycle || 0, run.omens, true, Math.min(2, run.floor >> 3), Math.min(5, 1 + (run.floor >> 2)), 3), PAL[tier]); LV.ledgeStone = tier >= 3;   // higher floors: harder ground
  } else
  if (!run.tower && (run.node === "rest" || run.node === "event")) { loadMap(buildRoadMap(), PAL[MD(run.m)]); setupRoad(); }
  else loadMap(buildMadangMap(run.seed + run.m * 131, MD(run.m), run.cycle || 0, run.omen, run.m === LAST_M, run.node === "elite" ? 2 : 1, 0, run.m === LAST_M ? 2 : run.node === "elite" ? 4 : 5), PAL[MD(run.m)]); LV.ledgeStone = MD(run.m) >= 3;
  if (isFinal() && LV.exit) { // the last 마당 ends at 천고 itself instead of a seal
    LV.drums = [{ id: 0, big: true, x: LV.exit.x + LV.exit.w / 2, y: LV.exit.y + LV.exit.h, w: 60, h: 80 }]; LV.exit = null; LV.gate = null;
  }
  showScreen("interlude"); inkWipe();
  Music.unlock(); Music.stop(); Music.jing();
  setTimeout(() => $("bEnter").focus({ preventScroll: true }), 30);
  needSheets(playSheets());   // start fetching this gate's pictures while the card is read
}
function enterMadang() {
  Music.menuBgm(false);
  // map already loaded by showInterlude
  deadIds = new Set(run.dead || []); cpSave = null;
  if (run.cp < 0 && mode !== "tutorial") store.set("stage", run);
  setTimeout(weaponTip, 1200);   // 다시 시작 returns here: the gate as it was when you walked in
  if (run.cp >= 0 && LV.cps[run.cp]) {
    const c = LV.cps[run.cp]; c.on = true;
    cpSave = { x: c.x - 9, y: c.y - 30.01, dead: new Set(deadIds), idx: run.cp };
  }
  const s = cpSave || LV.start;
  if (run.qiStart) { run.qi = Math.max(run.qi || 0, run.qiStart); run.qiStart = 0; }
  if (mode !== "tutorial" && run.cp < 0 && !(run.node === "rest" || run.node === "event")) { const rg = mulberry((run.seed ^ Math.imul(run.m + 3, 7919) ^ (run.cycle || 0) * 131 ^ (run.floor || 0) * 17) >>> 0);
    run.gate = { goal: GOALS[(rg() * GOALS.length) | 0].id, t0: run.time, kan0: run.gKan || 0, hit0: run.gHits || 0, pf0: run.perfectN || 0 }; run.gMaxTier = Math.floor((run.mom || 0) / 100); }
  P = newPlayer(s.x, s.y); run.hosinUsed = 0; run.shadeUsed = false; run.cutDrums = run.cutDrums || []; 
  bullets = []; parts = []; ghosts = []; seals = []; vfx = []; haz = []; beams = []; bolts = []; kegs = []; rings = []; cutLines = []; trails = []; pops = []; pfires = []; bulletHold = 0; killCam = 0; clones = []; bossIntro = bossOut = bossBanner = roar = null; chungoFx = null; sealArena(null, false);
  Music.start(MADANG[run.tower ? [0, 2, 4][(run.floor - 1) % 3] : MD(run.m)].jd, run.seed + run.m, settings.tempo * (1 + .04 * Math.min(4, run.cycle || 0)) * (omen("geupbak") ? 1.15 : 1) * (upOn("fast") ? 1.15 : 1));
  songPos = Music.pos(); spawnEnemies(); spawnPet();
  cam.x = P.x; cam.y = P.y;
  setHud(); showScreen(null); state = "play"; inkWipe();
  Music.bak();
  try { navigator.wakeLock && navigator.wakeLock.request("screen").catch(() => {}); } catch (e) {}
}
function tutHints() { // the 수련터 signs, read for the hands in use: touch words on a phone, keys on a keyboard — plus the beat and the short dash
  const K = ["← → 이동 · Space 점프", null, "J = 베기 · ↑↓와 함께 위아래", null, null, "공중에서 K를 누르고 있으면 무아경 — 시간이 느려지고 기력이 닳는다", "원이 점이 될 때 베면 간파 · 북이 차면 Q로 오의"];
  const hs = TUTORIAL.hints.map((h, i) => MOBILE || !K[i] ? h : [h[0], h[1], K[i]]);
  hs.push([38, 8, MOBILE ? "대시 짧게 = 짧은 돌진" : "K 짧게 = 짧은 돌진"], [73, 2, "북이 쿵 울리는 박에 베면 붉은 일격"]);
  return hs;
}
function startTutorial() {
  if (hubOn) leaveHub();
  Music.menuBgm(false);
  mode = "tutorial";
  run = { m: 0, breath: Infinity, time: 0, deaths: 0, kills: 0, strikes: 0, slashes: 0, cp: -1, dead: [] };
  loadMap(TUTORIAL.map, PAL[0], tutHints());
  deadIds = new Set(); cpSave = null;
  P = newPlayer(LV.start.x, LV.start.y);
  bullets = []; parts = []; ghosts = []; seals = []; vfx = [];
  Music.unlock(); Music.start(TUTORIAL.jd, 7, settings.tempo);
  songPos = Music.pos(); spawnEnemies();
  cam.x = P.x; cam.y = P.y;
  setHud(); showScreen(null); state = "play";
}
function respawn() {
  bullets = []; ghosts = []; haz = []; beams = []; bolts = []; kegs = []; rings = []; cutLines = []; trails = []; pops = []; pfires = []; bulletHold = 0; killCam = 0; clones = []; bossIntro = bossOut = bossBanner = roar = null; chungoFx = null; sealArena(null, false);
  const s = cpSave || { x: LV.start.x, y: LV.start.y, dead: new Set() };
  deadIds = new Set(s.dead);
  P = newPlayer(s.x, s.y); clones = [];
  spawnEnemies(); spawnPet(); state = "play"; setHud();
}
function hitCause(kind) { // what took the breath: a fall, a shot (and whose), the nearest blade, or the ground's own traps
  if (kind === "fall") return "낭떠러지"; const by = P.hitBy; P.hitBy = null;
  const nm0 = e => e.type === "b" ? (BOSSES[e.kind] || {}).name || "우두머리" : FOE_NAME[e.type] || "적";
  if (typeof by === "string") return by; if (by && by.shot) return by.shot.owner && by.shot.owner.type ? `${nm0(by.shot.owner)}의 ${by.shot.red ? "붉은 탄" : "탄"}` : "날아든 탄";
  if (curFoe) return nm0(curFoe);   // struck while that foe was acting
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2, nm = e => e.type === "b" ? (BOSSES[e.kind] || {}).name || "우두머리" : FOE_NAME[e.type] || "적";
  const b = bullets.filter(b => !b.friendly && b.life > 0).sort((a, c) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(c.x - cx, c.y - cy))[0];
  if (b && Math.hypot(b.x - cx, b.y - cy) < 60) return b.owner ? `${nm(b.owner)}의 ${b.red ? "붉은 탄" : "탄"}` : "날아든 탄";
  const e = enemies.filter(e => e.alive).sort((a, c) => Math.hypot(a.x + a.w / 2 - cx, a.y + a.h / 2 - cy) - Math.hypot(c.x + c.w / 2 - cx, c.y + c.h / 2 - cy))[0];
  if (e && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < (e.type === "b" ? 260 : 130)) return nm(e); return "함정";
}
function die(kind, dmg = 1) {
  if (state !== "play" || (P.invT || 0) > 0) return;
  if (run && mode !== "tutorial") run.lastCause = hitCause(kind);
  ;
  if (res("yeong", 6) && !run.shadeUsed && P.y < LV.h * T) { // 영 공명: the blow passes through a shadow left behind
    run.shadeUsed = true; P.invT = 1.3; clones.push({ x: P.x + P.w / 2, y: P.y + P.h, face: P.face, t: .25 }); shadeFx(P.x + P.w / 2, P.y + P.h / 2, 26); flash = .2; shake = 6; Music.sfx("clang"); toast("영 공명 · 그림자가 대신 베였다"); return; }
  if (mode !== "tutorial" && guardBlow(kind)) return;
  if (kind !== "fall" && mode !== "tutorial") { momHit(); run.gHits = (run.gHits || 0) + 1; }
  if (kind !== "fall") { const loss = dmg + (oath("gonggung") && P.onGround ? 1 : 0);
    if (has("d_janmyeong") && mode !== "tutorial" && run.breath - loss <= 0 && !run.janUsed) { run.janUsed = true; run.breath = loss + 1; toast("잔명 · 끊길 숨을 붙들었다"); }   // 잔명
    if (mode === "tutorial" || run.breath - loss > 0) { if (mode !== "tutorial") { run.breath -= loss; saveRun(); setHud(); }
      const d = lastHitDir || { x: -P.face, y: -.3 }; lastHitDir = null; P.invT = TUNING.HIT_INVULN; P.vx = (Math.sign(d.x) || -P.face) * 340; P.vy = -300; P.onGround = false; P.dashT = 0; P.hook = null;
      P.focus = false; Music.muffle(false); P.chain = 0; bleed(P.x + P.w / 2, P.y + P.h / 2, d, false);
      if (has("d_ganggi") && mode !== "tutorial") { P.wardT = 1.5; for (const b of bullets) if (!b.friendly && Math.hypot(b.x - P.x, b.y - P.y) < 340) b.life = 0; ringFx(P.x + P.w / 2, P.y + P.h / 2, 150, "rgba(23,22,26,.7)", .4); }  /* 호신강기 */ shake = 9; flash = .3; hitstop = Math.max(hitstop, .08); Music.sfx("die"); buzz(40); return; } }
  state = "dead"; deathT = 0; run.deaths++;
  if (mode !== "tutorial") { run.breath -= oath("gonggung") && P.onGround ? 2 : 1; if (run.breath <= 0 && false && !run.bulsaUsed) { run.bulsaUsed = true; run.breath = 1; toast("불사 · 숨이 다시 이어졌다"); } saveRun(); }
  P.focus = false; Music.muffle(false);
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
  for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 340; parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: .8, max: .8, c: i % 4 ? LV.pal.fig : SEAL, s: 2 + Math.random() * 4 }); }
  bleed(cx, cy, lastHitDir || { x: -P.face, y: -.3 }, true); lastHitDir = null;
  shake = 12; Music.sfx("die"); buzz(70);
}
function guardBlow(kind) { // 방어 비급: what takes the blow instead of a 숨
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2, ward = (t, msg) => { P.invT = t; P.focus = false; Music.muffle(false); P.dashT = 0; shake = Math.max(shake, 7); flash = .15; hitstop = Math.max(hitstop, .06); Music.sfx("clang"); ringFx(cx, cy, 110, "rgba(195,22,28,.6)", .35); toast(msg); lastHitDir = null; return true; };
  if (kind === "fall") { if (has("d_nakbeop") && (run.nakN || 0) < 2 && P.safe) { run.nakN = (run.nakN || 0) + 1; P.x = P.safe.x; P.y = P.safe.y; P.vx = P.vy = 0; P.hook = null; return ward(1.2, `낙법 · 딛던 땅으로 (${2 - run.nakN}번 남음)`); } return false; }
  if (has("bd_b3") && (P.iaiHold || (P.focus && wk() === "baldo")) && (run.fudoN || 0) < 3) { run.fudoN = (run.fudoN || 0) + 1; const t = nearestFoes(cx, cy, 1, 400)[0];   // 부동명왕
    P.iaiHold = false; P.focus = false; Music.muffle(false); if (t) { const dx = t.x + t.w / 2 - cx, dy = t.y + t.h / 2 - cy, L = Math.hypot(dx, dy) || 1; P.iaiCut = true; startDash({ x: dx / L, y: 0 }, true); P.dashT = .22; hurtEnemy(t, t.type !== "b" ? true : 2); }
    ougiArt(["ogA", 10], cx, P.y + P.h, 150, { life: .7, ay: 1 }); return ward(.8, `부동명왕 · ${3 - run.fudoN}번 남음`); }
  if (kind !== "fall" && pet && !pet.rest && petStage() >= 3 && run.breath <= 1 && (pet.guardN || 0) < (META.pet.evo === 1 && petStage() >= 4 ? 2 : 1)) { pet.guardN = (pet.guardN || 0) + 1; if (pet.guardN >= (META.pet.evo === 1 && petStage() >= 4 ? 2 : 1)) pet.rest = true; pet.x = cx; pet.y = cy - 10; return ward(1.6, `수호 · ${PETS[META.pet.kind].name}이(가) 대신 맞았다`); }   // 수호
  if (has("d_gihyeol") && (run.qi || 0) >= 50) { run.qi = 0; return ward(1, "기혈 · 천고 기운이 대신 흩어졌다"); }
  if (has("d_gise") && (P.chain || 0) >= 3) { P.chain = 0; return ward(.9, "기세 · 연속 처치가 대신 끊겼다"); }
  return false;
}
function afterDeath() {
  if (mode !== "tutorial" && run.breath <= 0) { endRun(false); return; }
  respawn();
}
// 기세: reading and cutting build it, five tiers 一~五; a hit knocks it down a tier, idling lets it drain.
// At 五 comes 무아지경 — six seconds where every common foe falls to any cut — then it bursts into the drum.
const momOn = () => !!(run && mode !== "tutorial" && !hubOn && P);
const momTier = () => momOn() ? Math.min(5, Math.floor((run.mom || 0) / 100)) : 0;
function momAdd(n) {
  if (!momOn() || (run.trance || 0) > 0) return; const before = momTier(); run.mom = Math.min(500, (run.mom || 0) + n * (1 + (treeStat ? treeStat("gise") : 0))); run.momAt = songPos;
  const t = momTier(); Music.setTier(t); if (t > before) { run.gMaxTier = Math.max(run.gMaxTier || 0, t); popText(P.x + P.w / 2, P.y - 34, `기세 ${t}단`, t >= 4 ? SEAL : "#17161a"); Music.sfx(t >= 3 ? "strike" : "lantern");
    if (t >= 5) { run.trance = 6; flash = .35; shake = 12; Music.jing(); toast("무아지경"); addFx("ogA", 11, P.x + P.w / 2, P.y + P.h / 2, 220, { life: .7 }); } }
}
function momHit() { if (!momOn()) return; run.mom = Math.max(0, Math.floor((run.mom || 0) / 100) * 100 - 100); run.trance = 0; Music.setTier(momTier()); }
function stepMom(dt) {
  if (!momOn()) return; Music.setTier(momTier());
  if ((run.trance || 0) > 0) { run.trance -= dt; if (run.trance <= 0) { run.trance = 0; run.mom = 300;   // the trance breaks into the drum
      run.qi = Math.min(100, (run.qi || 0) + 50); const cx = P.x + P.w / 2, cy = P.y + P.h / 2; addFx("gfx", 8, cx, P.y + P.h, 150, { life: .6, ay: 1 }); ringFx(cx, cy, 160, "rgba(195,22,28,.8)", .5); shake = 10;
      for (const e of nearestFoes(cx, cy, 9, 170)) hurtEnemy(e, e.type !== "b" && !e.elite, "il"); } return; }
  if (songPos - (run.momAt ?? 0) > 2 && run.mom > 0) run.mom = Math.max(0, run.mom - dt * 18);
}
// 관문 과제와 등급: each fighting gate sets one small goal; at its end a grade is stamped — 甲 earns a 수련점 and a rare 비급
const GOALS = [
  { id: "kan", text: "간파 세 번", prog: g => `${Math.min(3, (run.gKan || 0) - g.kan0)}/3`, ok: g => (run.gKan || 0) - g.kan0 >= 3 },
  { id: "nohit", text: "숨을 잃지 않기", prog: g => (run.gHits || 0) - g.hit0 ? "실패" : "", ok: g => (run.gHits || 0) === g.hit0 },
  { id: "time", text: "60초 안에 넘기", prog: g => `${Math.max(0, Math.ceil(60 - (run.time - g.t0)))}초`, ok: g => run.time - g.t0 <= 60 },
  { id: "tier", text: "기세 3단에 이르기", prog: g => (run.gMaxTier || 0) >= 3 ? "이룸" : "", ok: g => (run.gMaxTier || 0) >= 3 },
  { id: "perfect", text: "완벽 간파 한 번", prog: g => (run.perfectN || 0) > g.pf0 ? "이룸" : "", ok: g => (run.perfectN || 0) > g.pf0 }];
const gateGoalOn = () => !!(run && run.gate && mode !== "tutorial" && !hubOn && !(run.node === "rest" || run.node === "event"));
function gateGoalText() { if (!gateGoalOn()) return null; const G = GOALS.find(o => o.id === run.gate.goal); const p = G.prog(run.gate); return `과제 · ${G.text}${p ? " (" + p + ")" : ""}`; }
function gateGrade() { const g = run.gate, G = GOALS.find(o => o.id === g.goal); let sc = 0;
  if (G.ok(g)) sc += 2; if ((run.gHits || 0) === g.hit0) sc++; if (run.time - g.t0 <= 60) sc++; if ((run.gMaxTier || 0) >= 3) sc++;
  return { ch: sc >= 4 ? "甲" : sc >= 2 ? "乙" : "丙", goal: G.ok(g) }; }
const GRADE_KO = { "甲": "상", "乙": "중", "丙": "하" }, gradeKo = g => GRADE_KO[g] || g;   // shown in Korean: 상 · 중 · 하
function logGate(outcome) { // 플레이 기록: each gate's time, breaths lost, grade and frame rate — kept on the device, shown at the 큰북
  if (!run || mode === "tutorial" || run.hub) return; const g = run.gate || {}, pf = perfSnap(); if (pf) META.perf = pf;
  run.log = run.log || []; run.log.push({ m: run.m, node: run.node || (run.m >= LAST_M ? "boss" : "gate"), t: Math.round(run.time - (g.t0 ?? run.gateT0 ?? run.time)), hits: (run.gHits || 0) - (g.hit0 || 0), out: outcome, fps: pf && pf.fps }); }
function madangClear() {
  Music.sfx("seal");
  if (mode === "tutorial") { META.firsts.tutDone = 1; saveMeta(); toast("수련을 마쳤다 · 산문으로 걸어가 길을 떠나라"); setTimeout(toMenu, 900); state = "result"; return; }
  if (run.m >= LAST_M) { logGate("clear"); endRun(true); return; }
  if (run.node === "rest" || run.node === "event") { run.m++; run.node = null; run.talked = false; run.cp = -1; run.dead = []; state = "result"; saveRun(); setTimeout(() => { Music.stop(); nextStep(); }, 500); return; }   // walked out of a road stage: on to the next fork
  if (mode !== "tutorial" && !(run.node === "rest" || run.node === "event")) logGate("clear");
  if (run.gate && !run.tower) { const gr = gateGrade(); run.lastGrade = gr.ch; run.grades = (run.grades || "") + gr.ch;
    seals.push({ x: P.x + P.w / 2, y: P.y - 10, t: 0, rot: -.12, ch: gr.ch, big: true }); popText(P.x + P.w / 2, P.y - 58, `${gradeKo(gr.ch)} 등급`, gr.ch === "甲" ? SEAL : "#17161a"); toast(`관문 등급 ${gradeKo(gr.ch)}${gr.goal ? " · 과제를 이뤘다" : ""}${gr.ch === "甲" ? " · 수련점 +1" : gr.ch === "乙" ? " · 혼 +10" : ""}`);
    if (gr.ch === "乙") run.honBonus = (run.honBonus || 0) + 10; if (gr.ch === "甲") petJeong(3); run.gate = null; }
  if (!run.tower && !oath("godok") && !upOn("noheal") && run.breath < TUNING.GATE_HEAL_TO) { run.breath++; toast(`숨을 골랐다 · 숨 ${run.breath}`); }   // each gate passed lets you catch one breath back (up to three)
  run.cleared = run.node || "gate"; if (run.cleared === "elite") { run.honBonus = (run.honBonus || 0) + 20; addQi(40); }
  run.m++; run.node = null; run.nakN = 0; run.janUsed = false; run.senN = 0; run.fudoN = 0; run.cp = -1; run.dead = []; run.cutDrums = []; if (!upOn("noheal") && !oath("godok") && (false)) run.breath = Math.min(breathCap(), (run.breath + 1));   // breath no longer refills by itself: rest on the road, or before 천고대
  run.choosing = "madang"; saveRun();   // every cleared 마당 grants a 초식
  state = "result";
  setTimeout(() => showChoice("madang"), 700);
}
// 수련: a real skill tree. Each cleared gate gives 수련점; spend them on the weapon's tree (a node opens the next along its branch),
// or on a shared 비급 for the 방어·간파·이동 slots. Unspent points are kept.
const SP_GAIN = TUNING.SP_GAIN;
const spCost = c => c.tier >= 3 ? 2 : 1;
function showChoice(kind) {   // kind: "madang" after a cleared gate, "cycle" after cutting 천고, "bonus", "tower", or "pause" (spending from the pause menu)
  const done = () => {
    run.choosing = null; $("choice").classList.remove("tree");
    if (kind === "pause") { state = "pause"; showScreen("pause"); pauseBuild(); return; }
    if (kind === "stage") { saveRun(); resumeStage(); return; }
    if (kind === "cycle") { // a new turn of the tower: next, its omen
      run.cycle = (run.cycle || 0) + 1; run.m = 0; run.breath = Math.max(run.breath, 3); run.cp = -1; run.dead = []; run.cutDrums = []; run.omen = null;
      run.choosing = "omen"; saveRun(); showOmen(); return;
    }
    if (kind === "tower") { saveRun(); towerRest(); return; }
    saveRun(); Music.stop(); nextStep();
  };
  const key = `${kind}:${run.cycle || 0}:${run.m}:${run.floor || 0}`;
  if (kind !== "pause" && run.spFor !== key) { run.spFor = key; run.sp = (run.sp || 0) + (SP_GAIN[kind] || 1) + (kind === "madang" && run.cleared === "elite" ? 1 : 0) + (kind === "madang" && run.lastGrade === "甲" ? 1 : 0) + (run.extraPick ? 2 : 0); run.extraPick = 0; run.rerollN = 0; run.discarded = false; saveRun(); }
  const owned = id => (run.perks || []).includes(id);
  const rnd = mulberry((run.seed ^ (run.m * 7919) ^ ((run.cycle || 0) * 104729) ^ ((run.floor || 0) * 31337)) >>> 0);
  for (let r = 0; r < (run.reroll || 0); r++) rnd();
  const pool = CHOSIK.filter(c => !c.combo && !c.tree && c.kind !== "일섬" && (!c.only || c.only === run.char) && (c.repeat ? run.breath < breathCap() && !oath("godok") : !owned(c.id) && SLOT[c.kind]));
  const shared = []; const nShared = (META.bld.sadang >= 3 ? 4 : 3) + (oath("godok") ? 1 : 0);
  const rar = c => RARITY[c.id] || 1, wt = c => [0, 6, 3, 1][rar(c)];
  const draw = min => { const ps = pool.filter(c => rar(c) >= min); if (!ps.length) return null; let t = rnd() * ps.reduce((a, c) => a + wt(c), 0); for (const c of ps) if ((t -= wt(c)) <= 0) return c; return ps[ps.length - 1]; };
  while (shared.length < nShared && pool.length) { const c = draw(!shared.length && run.lastGrade === "甲" && kind === "madang" ? 2 : 1) || pool[0]; pool.splice(pool.indexOf(c), 1); shared.push(c); }   // 甲 guarantees one 희귀 or better
  const T = TREES[treeKey()], tk = treeKey(), canTake = new Set(treeOffer().map(c => c.id));
  $("chTitle").textContent = "수련"; $("choice").classList.remove("route", "wpick"); $("choice").classList.add("tree"); document.querySelectorAll(".route-trail,.ch-held").forEach(o => o.remove());
  $("chMadang").textContent = kind === "pause" ? "멈춤 · 수련" : kind === "tower" ? `천고탑 ${run.floor - 1}층을 넘었다` : kind === "cycle" ? `천고를 베었다 · ${(run.cycle || 0) + 1}번째` : kind === "bonus" ? "징조의 대가" : run.cleared === "rest" ? "쉼터 · 수련" : run.cleared === "event" ? "기연" : `${josa(stageOf(run.m - 1).ko, "을", "를")} 넘었다`;
  const box = $("cards"); box.innerHTML = "";
  const sp = document.createElement("div"); sp.className = "tr-sp"; sp.innerHTML = `수련점 <b>${"●".repeat(run.sp || 0) || "－"}</b><small>1·2단 1점 · 3·4단·합류 2점 · 공용 1점 · 오의는 천고를 베면</small>`; box.appendChild(sp);
  const wrap = document.createElement("div"); wrap.className = "tr-wrap"; box.appendChild(wrap);
  const graph = document.createElement("div"); graph.className = "tr-graph"; const side = document.createElement("div"); side.className = "tr-side"; wrap.append(graph, side);
  let sel = null;
  const learn = c => { const cost = c.tree ? spCost(c) : 1; if ((run.sp || 0) < cost) { toast("수련점이 모자라다"); return; }
    if (!(META.seen = META.seen || []).includes(c.id)) { META.seen.push(c.id); saveMeta(); }
    if (c.id === "sum") { run.sp -= cost; run.breath = Math.min(breathCap(), run.breath + 1); }
    else if (c.tree) { if (!canTake.has(c.id)) return; run.sp -= cost; run.perks.push(c.id); }
    else if (slotFull(c.kind)) { replaceScreen(c, ok => { if (ok) run.sp -= cost; saveRun(); showChoice(kind); }); return; }
    else { run.sp -= cost; run.perks.push(c.id); }
    syncCombos(); Music.sfx("lantern"); saveRun(); showChoice(kind); };
  const detail = c => { sel = c; graph.querySelectorAll(".tr-n").forEach(n => n.classList.toggle("sel", n.dataset.id === c.id)); side.querySelectorAll(".tr-sh").forEach(n => n.classList.toggle("sel", n.dataset.id === c.id));
    const v = pv(c), mine = owned(c.id), can = c.tree ? canTake.has(c.id) : true, cost = c.tree ? spCost(c) : 1;
    const lk = c.tree && lockLv(c) > treeOpen(), r = !c.tree && RARITY[c.id] || 1, otherFork = c.fork != null && CHOSIK.some(o => o.tree === tk && o.br === c.br && o.tier === 3 && o.id !== c.id && owned(o.id));
    const d = side.querySelector(".tr-det"); d.innerHTML = `<em class="tag kind${c.ougi ? " ougi" : ""}">${c.tree ? `${T.name} · ${c.brName} ${c.ougi ? "오의" : c.tier ? c.tier + "단" : ""}` : `${c.kind || "숨"}${c.kind ? " · " + RAR_NAME[r] : ""}`}</em><b>${v.name}</b><p>${v.desc}</p>`;
    const b = document.createElement("button"); b.className = "btn pri"; b.textContent = mine ? "익혔다" : c.ougi ? (treeOpen() < 1 ? "서고에서 먼저 깨쳐야 한다" : "천고를 베면 깨닫는다") : lk ? "서고에서 먼저 깨쳐야 한다" : otherFork ? "다른 갈래를 골랐다" : !can ? "앞 단계를 먼저" : `익히기 · ${cost}점`; b.disabled = mine || !can || (run.sp || 0) < cost; b.addEventListener("click", () => learn(c)); d.appendChild(b); };
  if (T) { // the graph: root on the left, three branches → 1단 · 2단 · a fork of two · 4단 · 오의, two 합류 on the far right
    const ys = [14, 50, 86], X = { 0: 5, 1: 18, 2: 31, 3: 46, 4: 61, 5: 76 }, mx = 91, at = c => c.tier === 0 ? [X[0], 50] : c.merge ? [mx, (ys[c.merge[0]] + ys[c.merge[1]]) / 2] : [X[c.tier], ys[c.br] + (c.fork != null ? (c.fork ? 11 : -11) : 0)];
    const nodes = CHOSIK.filter(c => c.tree === tk), on = c => owned(c.id), line = (p, q, lit) => `<path d="M${p[0]} ${p[1]} C ${(p[0] + q[0]) / 2} ${p[1]}, ${(p[0] + q[0]) / 2} ${q[1]}, ${q[0]} ${q[1]}" class="${lit ? "on" : ""}"/>`;
    const root = nodes.find(c => c.tier === 0); let svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">`;
    T.br.forEach((b, bi) => { const st = t => nodes.filter(c => c.br === bi && c.tier === t);
      let prev = root ? [root] : [];
      for (let t = 1; t <= 5; t++) { const cur = st(t); for (const c of cur) for (const p of prev.length ? prev : [{ tier: -1 }]) svg += line(p.tier === -1 ? [X[0], 50] : at(p), at(c), on(c) && (p.tier === -1 || on(p))); if (cur.length) prev = cur; } });
    for (const m of nodes.filter(c => c.merge)) for (const bi of m.merge) { const t2 = nodes.find(c => c.br === bi && c.tier === 2); if (t2) svg += line(at(t2), at(m), on(m)).replace("<path", '<path stroke-dasharray="1 2.5"'); }
    graph.innerHTML = svg + `</svg>`;
    T.br.forEach((b, bi) => { const lab = document.createElement("span"); lab.className = "tr-bn"; lab.style.cssText = `left:${(X[1] + X[2]) / 2}%;top:${ys[bi]}%`; lab.textContent = b.name; graph.appendChild(lab); });
    for (const c of nodes) { const [x, y] = at(c), n = document.createElement("button"), lk = lockLv(c) > treeOpen() && !on(c);
      n.className = "tr-n" + (c.ougi ? " og" : "") + (c.tier === 0 ? " rt" : "") + (c.merge ? " mg" : "") + (c.fork != null ? " fk" : "") + (on(c) ? " on" : canTake.has(c.id) ? " can" : "") + (lk ? " lk" : "") + (c.ougi && run.ougiAwake && on(c) ? " aw" : "");
      n.dataset.id = c.id; n.style.cssText = `left:${x}%;top:${y}%;--ic:var(--chosik-${pv(c).icon})`;
      n.innerHTML = `<i></i><span>${c.tier === 0 ? T.name : pv(c).name}</span>`; n.addEventListener("click", () => { Music.sfx("hook"); detail(c); }); graph.appendChild(n); } }
  side.innerHTML = `<div class="tr-det"><p class="tr-hint">노드를 눌러 읽고, 수련점으로 익힌다</p></div><div class="tr-shl"><em>공용 비급</em></div>`;
  const shl = side.querySelector(".tr-shl");
  for (const c of shared) { const b = document.createElement("button"); b.className = "tr-sh"; b.dataset.id = c.id; b.style.setProperty("--ic", `var(--chosik-${pv(c).icon})`);
    const rr = RARITY[c.id] || 1; b.className += " r" + rr; b.style.animationDelay = `${shared.indexOf(c) * .09}s`;
    b.innerHTML = `<i></i><span><small>${c.kind || "숨"}${c.kind ? " · " + RAR_NAME[rr] : ""}${c.kind && slotFull(c.kind) ? " · 교체" : ""}</small>${pv(c).name}</span>`; b.addEventListener("click", () => { Music.sfx("hook"); detail(c); }); shl.appendChild(b); }
  const tools = document.createElement("div"); tools.className = "ch-tools";
  const left = (META.bld.sadang >= 2 ? 2 : 1) - (run.rerollN || 0);
  if (left > 0 && kind !== "pause") { const rb = document.createElement("button"); rb.className = "btn ghost"; rb.textContent = `공용 다시 뽑기 · ${left}`;
    rb.addEventListener("click", () => { run.rerollN = (run.rerollN || 0) + 1; run.reroll = (run.reroll || 0) + 3; saveRun(); showChoice(kind); }); tools.appendChild(rb); }
  const mine = heldPerks().filter(id => id !== SIMBEOP_START());
  if (!run.discarded && mine.length && run.breath < breathCap() && !oath("godok") && kind !== "pause") { const db = document.createElement("button"); db.className = "btn ghost"; db.textContent = "비급 버리고 숨 +1";
    db.addEventListener("click", () => discardScreen(kind)); tools.appendChild(db); }
  const go = document.createElement("button"); go.className = "btn" + ((run.sp || 0) ? "" : " pri"); go.textContent = kind === "pause" ? "닫기" : (run.sp || 0) ? `남겨 두고 나아가기 (${run.sp}점)` : "나아가기";
  go.addEventListener("click", () => { Music.sfx("lantern"); done(); }); tools.appendChild(go);
  box.appendChild(tools);
  const first = T && CHOSIK.find(c => c.tree === tk && canTake.has(c.id)); if (first) detail(first);
  state = "choice"; Music.pause(); if (P) P.focus = false; for (const k in held) held[k] = 0; showScreen("choice");
}
// 길 고르기: between the gates the road forks — a gate, a harder road, a rest, a chance meeting
const ROUTE = {
  gate: { name: "관문", han: "關", desc: "짧은 관문 하나 · 넘으면 수련점" },
  elite: { name: "험로", han: "險", desc: "정예가 몰린 더 짧은 길 · 수련점 하나 더, 혼 +20, 천고 기운" },
  rest: { name: "쉼터", han: "息", desc: "싸우지 않고 숨을 고른다" },
  event: { name: "기연", han: "緣", desc: "무엇을 만날지 모른다" } };
function nextStep() {
  if (run.tower || run.m <= 0) { showInterlude(); return; }
  if (run.forceNode && run.m < LAST_M) { run.node = run.forceNode; run.forceNode = null; saveRun(); showInterlude(); return; }   // 노승's test: the next gate is a hard road
  if (run.m >= LAST_M) { run.node = null; if (!upOn("noheal") && !oath("godok")) run.breath = Math.max(run.breath, Math.min(META.well && META.well.includes("boss1") ? 4 : 3, breathCap())); saveRun(); toast("천고대 앞 · 숨을 골랐다"); showInterlude(); return; }   // the guardian is met with breath
  showRoute();
}
function routeOptions() {
  const rnd = mulberry((run.seed ^ Math.imul(run.m + 1, 2654435761) ^ ((run.cycle || 0) * 40503)) >>> 0), pool = ["gate", "elite", "rest", "event"].filter(k => !(k === "rest" && run.lastNode === "rest")), out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice((rnd() * pool.length) | 0, 1)[0]);
  if (!out.includes("gate") && !out.includes("elite")) out[0] = "gate";   // there is always a road that fights
  return out;
}
const FOE_NAME = { p: "순라", g: "포수", s: "저격수", h: "등패수", a: "자객", k: "북잡이", d: "매", m: "무당" };
function foeComp(node) { // read the gate ahead from the same seed that will build it
  try { const map = buildMadangMap(run.seed + run.m * 131, MD(run.m), run.cycle || 0, run.omen, false, node === "elite" ? 2 : 1, 0, node === "elite" ? 4 : 5), n = {};
    for (const row of map) for (const ch of row) if (FOE_NAME[ch]) n[ch] = (n[ch] || 0) + 1;
    return Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${FOE_NAME[k]} ${v}`).join(" · "); } catch (e) { return ""; }
}
function showRoute() {
  run.choosing = "route"; saveRun();
  const items = routeOptions().map(id => { const c = id === "gate" || id === "elite" ? foeComp(id) : ""; return { id, ...ROUTE[id], desc: ROUTE[id].desc + (c ? `\n${c}` : ""), calm: id === "rest" }; });
  pickScreen("길을 골라라", `${ORD[run.m]} 갈림길 · 천고대까지 ${LAST_M - run.m}`, items, it => {
    run.lastNode = it.id; run.choosing = null;
    if (it.id === "gate" || it.id === "elite") { run.node = it.id; saveRun(); Music.stop(); showInterlude(); return; }
    run.node = it.id; if (it.id === "event") { const rnd = mulberry((run.seed ^ Math.imul(run.m + 7, 97531) ^ (run.cycle || 0)) >>> 0), pool = EVENTS.filter(e => e.ok()); run.eventId = pool[(rnd() * pool.length) | 0].id; }
    run.talked = false; saveRun(); Music.stop(); showInterlude(); });   // 쉼터 and 기연 are places now: walk in, meet someone, walk on
  document.querySelector("#choice").classList.add("route"); routeTrail();
}
function routeTrail() { // the road so far drawn as a line of seals above the cards
  document.querySelectorAll(".route-trail").forEach(o => o.remove()); const d = document.createElement("div"); d.className = "route-trail";
  d.innerHTML = Array.from({ length: LAST_M + 1 }, (_, i) => `<i class="${i < run.m ? "done" : i === run.m ? "now" : ""}">${i === LAST_M ? "북" : i < run.m ? "●" : "○"}</i>`).join("<b></b>"); $("cards").before(d);
}
function stepOn() { run.m++; run.choosing = null; saveRun(); nextStep(); }
// the people on the road: who stands in the 쉼터 or the 기연, and what they say
const NPC = { jumo: { i: 0, name: "주모", flip: true, line: "어서 오시오. 먼 길 오셨구려, 쉬었다 가시오." }, monk: { i: 1, name: "노승", line: "검이 무겁구나. 시험 하나 받아 보겠느냐." },
  dok: { i: 2, name: "도깨비", line: "히히, 한 판 걸어 보련? 숨 내기다!" }, mudang: { i: 3, name: "무당", line: "저 무덤에 칼 한 자루가 잠들어 있소. 주인을 기다리지." },
  seonbi: { i: 4, name: "떠돌이 선비", line: "피로 쓴 글이오. 숨 하나면 이 비결을 다 읽을 수 있지." }, spring: { i: 7, name: "약수", line: "맑은 물이 솟는다." } };
const EVENT_NPC = { blood: "seonbi", dok: "dok", grave: "mudang", monk: "monk", well: "spring" };
function stepOn() { run.m++; run.choosing = null; saveRun(); nextStep(); }
function buildRoadMap() { const rows = []; for (let y = 0; y < 16; y++) rows.push(Array.from({ length: 36 }, (_, x) => y >= 12 || x === 0 ? "#" : " ")); rows[11][2] = "P"; rows[11][33] = "E"; return rows.map(r => r.join("")); }
function setupRoad() { // the small road stage: set dressing, one person to talk to, a gate out on the right
  const put = (sheet, i, tx, h, flip) => LV.dress.push({ sheet, i, x: tx * T + 16, y: 12 * T + 2, h, flip: !!flip, ay: 1 });
  let who;
  if (run.node === "rest") { put("npc", 6, 9, 112); put("npc", 5, 15, 58); put("npc", 7, 26, 52); put("props2", P2.brazier, 5, 34); who = "jumo"; }
  else { const ev = run.eventId || "well"; who = EVENT_NPC[ev]; put("npc", 8, 11, 100); put("props", PROP.stoneLantern, 25, 44); if (who !== "spring") put("props", PROP.jars, 6, 30); }
  const n = NPC[who]; put("npc", n.i, 19, who === "spring" ? 54 : 64, n.flip); LV.stations = [{ id: "npc", who, tx: 19, h: 64, name: n.name, act: run.talked ? "인사" : "이야기" }];
}
function resumeStage() { state = "play"; showScreen(null); Music.resume(); hubNear = null; if (LV && LV.stations) for (const s of LV.stations) s.act = "인사"; hubPrompt(); }
function stageAct(st) {
  const n = NPC[st.who];
  if (run.talked) { toast(`${n.name} · ${run.node === "rest" ? "또 오시오." : "갈 길 가시오."}`); return; }
  run.talked = true; saveRun();
  if (run.node === "rest") return pickScreen(n.name, n.line, [
    { id: "breath", name: "숨 고르기", han: "息", desc: "숨 둘을 되찾는다" },
    { id: "train", name: "수련", han: "練", desc: "수련점 하나를 얻어 바로 쓴다" },
    { id: "qi", name: "북 다듬기", han: "鼓", desc: "다음 관문을 천고 기운 가득 차서 시작한다" }], it => {
    if (it.id === "breath") { run.breath = Math.min(breathCap(), run.breath + TUNING.REST_BREATH + (META.well && META.well.includes("rest1") ? 1 : 0)); toast(`숨 ${run.breath}`); saveRun(); setHud(); resumeStage(); }
    else if (it.id === "qi") { run.qiStart = 100; saveRun(); toast("북을 다듬었다 · 다음 관문은 기운 가득"); resumeStage(); }
    else { run.cleared = "rest"; saveRun(); showChoice("stage"); } });
  const ev = EVENTS.find(e => e.id === run.eventId) || EVENTS[4];
  pickScreen(n.name, n.line, [ev.ok() ? ev : { ...ev, desc: "지금은 할 수 없다", go: () => resumeStage() }, { id: "pass", name: "지나친다", han: "行", desc: "아무것도 하지 않는다", calm: true, go: () => resumeStage() }], it => it.go());
}
const EVENTS = [
  { id: "blood", name: "혈서", han: "血書", desc: "숨 하나를 바치면 수련점 셋", ok: () => run.breath > 1, go: () => { run.breath--; run.extraPick = 1; run.cleared = "event"; saveRun(); setHud(); showChoice("stage"); } },
  { id: "dok", name: "도깨비 내기", han: "賭", desc: "반반 — 숨 둘을 얻거나, 숨 하나를 잃는다", ok: () => run.breath > 1, go: () => { const win = Math.random() < .5; run.breath = Math.max(1, Math.min(breathCap(), run.breath + (win ? 2 : -1))); toast(win ? "도깨비가 졌다 · 숨 +2" : "도깨비가 웃는다 · 숨 −1"); saveRun(); setHud(); resumeStage(); } },
  { id: "grave", name: "무덤의 칼", han: "墓", desc: "혼 +40 (판이 끝날 때 받는다)", ok: () => true, go: () => { run.honBonus = (run.honBonus || 0) + 40; toast("혼 +40"); saveRun(); resumeStage(); } },
  { id: "monk", name: "노승의 시험", han: "僧", desc: "다음 관문은 정예가 몰리지만, 넘으면 수련점 하나 더", ok: () => true, go: () => { run.forceNode = "elite"; toast("다음 관문은 험로"); saveRun(); resumeStage(); } },
  { id: "well", name: "약수", han: "泉", desc: "숨 하나를 되찾는다", ok: () => run.breath < breathCap(), go: () => { run.breath = Math.min(breathCap(), run.breath + 1); toast("숨 +1"); saveRun(); setHud(); resumeStage(); } }];
// 수련도: the weapon's three branches as rows of seals (the third a red 오의), then the shared slots — one strip, no prose
function treeStrip(offer = []) {
  const d = document.createElement("div"); d.className = "ch-held"; const tk = treeKey(), T = TREES[tk], mine = new Set(run.perks || []), off = new Set(offer.map(c => c.id));
  let h = "";
  if (T) { h += `<div class="ts-tree"><b class="ts-w">${T.name}</b>`;
    T.br.forEach((b, bi) => { h += `<span class="ts-br"><em>${b.name}</em>`; for (let t = 1; t <= 5; t++) { const cs = CHOSIK.filter(o => o.tree === tk && o.br === bi && o.tier === t); if (!cs.length) continue;
      const c = cs.find(o => mine.has(o.id)) || cs.find(o => off.has(o.id)) || cs[0];
      h += `<i class="ts-n${c.ougi ? " og" : ""}${mine.has(c.id) ? " on" : ""}${off.has(c.id) ? " next" : ""}" title="${c.name} — ${c.desc}">${c.ougi ? "오" : ""}</i>`; } h += `</span>`; });
    h += `</div>`; }
  h += `<div class="ts-slots">` + SLOT_ORDER.map(k => { const ids = heldPerks().filter(id => kindOf(id) === k);
    return `<span class="ts-k"><em>${k}</em>` + Array.from({ length: SLOT[k] }, (_, n) => { const c = ids[n] && CHOSIK.find(o => o.id === ids[n]); return c ? `<i class="ts-s on" title="${c.name} — ${c.desc}" style="--ic:var(--chosik-${pv(c).icon})"></i>` : `<i class="ts-s"></i>`; }).join("") + `</span>`; }).join("") + `</div>`;
  d.innerHTML = h; return d;
}
// 무기걸이: the weapons hung on a rack — touch one to read it, then take it
function weaponPick(ws, onPick) {
  pickScreen("무기를 골라라", "손에 쥘 것", [], () => {});
  const box = $("cards"); box.innerHTML = ""; $("choice").classList.add("wpick");
  const rack = document.createElement("div"), det = document.createElement("div"); rack.className = "wp-rack"; det.className = "wp-det";
  let sel = ws.find(w => w.id === (META.lastWeapon || run.weapon)) || ws[0];
  const show = () => { const T = TREES[sel.id] || TREES[WEAPONS[sel.id].kind || sel.id], [style, ...rest] = sel.desc.split(" — ");
    det.innerHTML = `<div class="wp-h"><b>${sel.name}</b><small>${sel.han}</small><em>${sel.gun ? "총" : "칼"} · ${style}</em></div><p>${rest.join(" — ")}</p>` + (T ? `<div class="wp-tr">${T.br.map(b => `<span>${b.name}<small>${b.nodes[2].name}</small></span>`).join("")}</div>` : "") + `<button class="btn pri wp-go">${sel.name} 들기</button>`;
    det.querySelector(".wp-go").addEventListener("click", () => { Music.sfx("lantern"); META.lastWeapon = sel.id; saveMeta(); $("choice").classList.remove("wpick"); onPick(sel); });
    rack.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.id === sel.id)); };
  for (const grp of [["칼", ws.filter(w => !w.gun)], ["총", ws.filter(w => w.gun)]]) { if (!grp[1].length) continue; const g = document.createElement("div"); g.className = "wp-grp"; g.innerHTML = `<em>${grp[0]}</em>`;
    for (const w of grp[1]) { const b = document.createElement("button"); b.dataset.id = w.id; b.innerHTML = `<b>${w.han}</b><span>${w.name}</span>`; b.addEventListener("click", () => { sel = w; Music.sfx("hook"); show(); }); g.appendChild(b); }
    rack.appendChild(g); }
  box.append(rack, det); show();
}
const PERK_MAX = 4;
const heldPerks = () => (run.perks || []).filter(id => id !== "sum" && SLOT[kindOf(id)]);
const slotFull = k => !!SLOT[k] && heldPerks().filter(id => kindOf(id) === k).length >= SLOT[k];
function replaceScreen(nc, done) { // the slot is taken: the new one takes the place of one of the same kind
  const rows = heldPerks().filter(id => kindOf(id) === nc.kind).map(id => { const c = CHOSIK.find(o => o.id === id);
    return bdRow(c.name, c.desc, null, "내려놓기", () => { run.perks = run.perks.filter(x => x !== id); run.perks.push(nc.id); saveRun(); Music.sfx("lantern"); toast(`${josa(c.name, "을", "를")} 내려놓고 ${josa(nc.name, "을", "를")} 익혔다`); done(true); }); });
  rows.unshift(bdRow(`새 ${nc.kind} · ${nc.name}`, nc.desc));
  board(`${nc.kind} 비급은 ${SLOT[nc.kind] === 1 ? "하나" : "둘"}까지`, "같은 종류 하나를 내려놓아야 새 비급을 익힌다", rows, [["새 비급 포기", () => done(false)]]);
}
const START_ALT = {};   // every hand now starts from the same shared 비급
const startOf = (m, ch) => ((START_ALT[ch] || {})[m.start]) || m.start;
const SIMBEOP_START = () => { const m = SIMBEOP.find(m => m.id === run.simbeop); return m && startOf(m, run.char); };
function discardScreen(kind) { // trade a 비급 that no longer fits the build for one breath
  const rows = heldPerks().filter(id => id !== SIMBEOP_START()).map(id => { const c = CHOSIK.find(o => o.id === id);
    return bdRow(c.name, c.desc, null, "버리기", () => { run.perks = run.perks.filter(x => x !== id); run.breath = Math.min(breathCap(), run.breath + 1); run.discarded = true; saveRun(); toast(`${josa(c.name, "을", "를")} 버리고 숨을 얻었다`); showChoice(kind); }); });
  board("비급 버리기", "하나를 버리면 숨 하나를 되찾는다", rows, [["그만두기", () => showChoice(kind)]]);
}
function showOmen() {   // the rule for the coming turn: two omens drawn at random, or a calm one
  const rnd = mulberry((run.seed ^ ((run.cycle || 0) * 7477)) >>> 0), pool = OMENS.filter(o => !o.calm), picks = [];
  while (picks.length < 2) picks.push(pool.splice((rnd() * pool.length) | 0, 1)[0]);
  picks.push(OMENS.find(o => o.calm));
  $("chTitle").textContent = "징조를 골라라"; $("choice").classList.remove("route"); document.querySelectorAll(".route-trail,.ch-held").forEach(o => o.remove());
  const c = run.cycle || 0, twist = c >= 3 ? "정예가 더 많고, 우두머리는 모든 기술을 쓴다" : c === 2 ? "우두머리가 처음부터 모든 기술을 쓴다" : c === 1 ? "정예(붉은 표식)가 섞인다 — 쓰러뜨리면 천고 기운이 크게 찬다" : "";
  $("chMadang").textContent = `${c + 1}번째 판 · ${SEASON[season()].name}` + (twist ? ` · 변주: ${twist}` : "");
  const box = $("cards"); box.innerHTML = "";
  for (const o of picks) {
    const b = document.createElement("button"); b.className = "card omen" + (o.calm ? " calm" : "");
    b.innerHTML = `<i class="ic"></i><b class="nm"></b><span class="ds"></span><span class="gift"></span>`;
    b.querySelector(".ic").textContent = o.han; if (o.han.length > 2) b.querySelector(".ic").style.fontSize = "30px"; b.querySelector(".nm").textContent = o.name; b.querySelector(".ds").textContent = o.desc; b.querySelector(".gift").textContent = "대가 · " + o.gift;
    b.addEventListener("click", () => {
      run.omen = o.calm ? null : o.id; Music.sfx("lantern");
      if (o.id === "geupbak") run.breath = Math.min(breathCap(), run.breath + 1);
      if (o.bonus) { run.choosing = "bonus"; saveRun(); showChoice("bonus"); return; }
      run.choosing = null; saveRun(); Music.stop(); showInterlude();
    });
    box.appendChild(b);
  }
  state = "choice"; Music.pause(); if (P) P.focus = false; for (const k in held) held[k] = 0; showScreen("choice");
}
function nextGoal() { // the cheapest thing still locked in the 거점, and how much 혼 it wants
  const c = [];
  for (const B of BUILDINGS) { const nx = B.lv[META.bld[B.id] || 0]; if (nx && nx.hon && !nx.shard) c.push([nx.hon, `${B.name} · ${nx.desc}`]); }
  for (const w of WELL) if (!well(w.id) && (!w.need || well(w.need))) c.push([w.hon, `약수 · ${w.name}`]);
  for (const [id, w] of Object.entries(WEAPONS)) if (w.cost && !w.ch && !META.weapons.includes(id)) c.push([w.cost, `무기 · ${w.name}`]);
  const t = TREE_OPEN[treeOpen()]; if (t) c.push([t.hon, `수련 · ${t.name}`]);
  c.sort((a, b) => a[0] - b[0]); const g = c[0]; if (!g) return null;
  return META.hon >= g[0] ? `${g[1]} — 지금 거점에서 열 수 있다` : `${g[1]} — 혼 ${g[0] - META.hon} 더`;
}
let lastKit = null;   // 같은 채비로 다시: the hand, weapon, 심법 and 서약 of the run just ended
function endRun(won) {
  if (!won && run && mode !== "tutorial") logGate("dead");
  if (run && !run.tower && mode !== "tutorial") lastKit = { char: run.char, weapon: run.weapon, simbeop: run.simbeop, oath: run.oath, perks: (run.perks || []).filter(id => SIMBEOP.some(m => startOf(m, run.char) === id)).slice(0, 1) };
  state = "result"; Music.stop();
  if (run.daily && !run.tower) { const d = META.daily && META.daily.key === run.daily ? META.daily : { key: run.daily, reached: -1, time: 0 }, rc = (run.cycle || 0) * (LAST_M + 1) + run.m + (won ? 1 : 0);
    if (rc > d.reached || (rc === d.reached && run.time < d.time)) { META.daily = { key: run.daily, reached: rc, time: run.time }; run.dailyBest = true; } }
  if (mode !== "tutorial") { META.runN = (Number.isFinite(META.runN) ? META.runN : 0) + 1; if (META.runN === 2) setTimeout(() => toast("산문에서 이제 심법을 고를 수 있다"), 1200); if (META.runN === 4) setTimeout(() => toast("산문에서 이제 서약을 걸 수 있다"), 1200); }
  store.del("run");
  const reached = run.tower ? run.floor - (won ? 0 : 1) : (run.cycle || 0) * (LAST_M + 1) + run.m + (won ? 1 : 0);
  const rate = run.slashes ? Math.round(run.strikes / run.slashes * 100) : 0;
  $("rSeal").textContent = won ? "登" : "終";
  $("rTitle").textContent = won ? "등천" : "절명";
  $("rSub").textContent = run.tower ? (won ? "천고가 다시 울렸다." : `천고탑 ${run.floor}층에서 숨이 다했다.`) : won ? "천고는 아직 위에서 울린다." : stageName(run.m) + (run.lastCause ? `에서 ${run.lastCause}에 마지막 숨을 잃었다.` : "에서 숨이 다했다.");
  $("rStats").innerHTML = "";
  const gain = runRewards(reached);
  if (mode !== "tutorial") { META.log = (Array.isArray(META.log) ? META.log : []).slice(-29); META.log.push({ d: todayKey(), w: run.weapon, diff: settings.diff, r: reached, won: !!won, hon: gain.hon, cause: won ? null : run.lastCause || null, t: Math.round(run.time), g: (run.log || []).slice(-8) });   // the last thirty runs, for the 기록 board
    const last = META.log.slice(-3); if (settings.diff === 1 && last.length === 3 && last.every(l => !l.won && l.r <= 1) && !(META.tips || {}).suggestEasy) { (META.tips = META.tips || {}).suggestEasy = 1; setTimeout(() => toast("초반이 벅차면 설정에서 난이도 \"수월\"을 고를 수 있다"), 1800); } }
  if (mode !== "tutorial" && run.petJ && petMeta()) { const b4 = petStage(); META.pet.jeong = (META.pet.jeong || 0) + run.petJ; gain.jeong = run.petJ; run.petJ = 0; if (petStage() > b4) gain.petUp = PET_ST[petStage()]; }
  if (mode !== "tutorial") { gain.sum = Math.max(1, Math.max(0, run.breath) + Math.floor(reached / 2)); META.sum = (META.sum || 0) + gain.sum; saveMeta(); }   // the breath left over goes home to the 거점
  retryGain = null;   /* 다시 시작 is gone: a death is a death */
  for (const [k, v] of [[run.tower ? "오른 층" : "넘은 관문", reached + (!run.tower && (run.cycle || 0) ? ` · ${run.cycle}번 천고를 벰` : "")], ["시간", fmt(run.time)], ["간파", (run.kanpa || 0) + "회"], ["벤 적", run.kills], ["얻은 혼", "+" + gain.hon + (gain.shard ? ` · 천고 조각 +${gain.shard}` : "")], ["모인 숨", "+" + (gain.sum || 0)], ...(run.daily ? [["오늘의 길", run.dailyBest ? "오늘 최고 기록!" : `오늘 최고 ${META.daily.reached}관문`]] : []), ...(gain.jeong ? [["영물의 정", "+" + gain.jeong + (gain.petUp ? ` · ${gain.petUp}!` : "")]] : []), ...(run.grades ? [["관문 등급", [...run.grades].map(gradeKo).join(" · ")]] : [])]) {
    const a = document.createElement("span"), b = document.createElement("b"); a.textContent = k; b.textContent = v; $("rStats").append(a, b);
  }
  { const nx = nextGoal(); if (nx) { const a = document.createElement("span"), b = document.createElement("b"); a.textContent = "다음 목표"; b.textContent = nx; $("rStats").append(a, b); } }   // what this run's 혼 is walking toward
  $("bSame").hidden = !(lastKit && !won);
  let rec = "";
  sealable = ((!run.tower && (run.cycle || 0) >= 1) || (run.fresh && run.floor > 3)) ? JSON.parse(JSON.stringify(run)) : null; $("bSeal").hidden = !sealable;
  if (run.tower) {
    const bk = META.books.find(b => b.id === run.book); if (bk && reached > (bk.best || 0)) { bk.best = reached; rec = "이 비급첩의 최고 층"; }
    if (reached > META.towerBest) { META.towerBest = reached; rec = "천고탑 최고 기록"; } saveMeta();
  } else {
    const best = store.get("best", null);
    if (!best || reached > best.reached || (reached === best.reached && run.time < best.time)) { store.set("best", { reached, time: run.time }); rec = "최고 기록"; }
  }
  $("rRec").textContent = rec;
  lastResult = { daily: run.daily, reached, rate, kanpa: run.kanpa || 0, time: run.time, won };
  if (mode !== "tutorial") { const w = wpn(); META.mastery[w] = (META.mastery[w] || 0) + run.kills; if ((run.aimK || 0) >= 40) META.firsts.beat = true; saveMeta(); checkTitles(); }
  showScreen("result"); inkWipe();
}
let lastResult = null, sealable = null, retryGain = null;
// 혼 for everything done, 천고 조각 for the rare things (cutting 천고, every tenth floor); 업 multiplies both
function runRewards(reached) {
  const mult = (1 + .15 * (run.upPts || 0) + (run.honDouble || 0)) * diff().hon;
  const hon = Math.round(((run.honBonus || 0) + (run.tower ? reached * TUNING.HON_PER_FLOOR : reached * TUNING.HON_PER_GATE) + Math.floor(run.strikes / 4) + Math.floor(run.kills / 3) + (run.bossKills || 0) * 12) * mult);
  const shard = (run.tower ? Math.floor(reached / 10) : (run.cycle || 0)) + (run.firstBoss || 0);
  META.hon += hon; META.shard += shard; saveMeta(); if (typeof questEvent === "function") questEvent("runEnd", { reached });
  return { hon, shard };
}
function shareText() {
  const r = lastResult; if (!r) return "";
  const head = r.daily ? `천고 · 오늘의 길 ${r.daily}` : "천고";
  const n = LAST_M + 1, cyc = Math.floor(r.reached / n), m = r.reached % n;
  return `${head}\n관문 ${r.reached}개 넘음${cyc ? ` · 천고 ${cyc}번 벰` : ""} · ${fmt(r.time)} · 간파 ${r.kanpa || 0}회\n` + "●".repeat(cyc) + "▮".repeat(m) + "▯".repeat(n - m);
}

// ---------- player ----------
const { CLIMBV, CLIMB_T, GRAV, JUMPV, MAXV, DASHV, HOOK_R, STRIKE_WIN } = TUNING;
function aimDir() { const a = axis(), m = Math.hypot(a.x, a.y); let d = m < 0.35 ? { x: P.face, y: 0 } : { x: a.x / m, y: a.y / m };
  if (P.focus && has("d_jeong")) { const cx = P.x + P.w / 2, cy = P.y + P.h / 2; let best = null, bs = 1e9;   // 응시: the aim settles on the nearest foe in that direction
    for (const e of enemies) { if (!e.alive || ghostly(e)) continue; const dx = e.x + e.w / 2 - cx, dy = e.y + e.h / 2 - cy, L = Math.hypot(dx, dy); if (L > 300 || L < 10) continue; const c = (dx * d.x + dy * d.y) / L; if (c < .8) continue; if (L < bs) { bs = L; best = { x: dx / L, y: dy / L }; } }
    if (best) d = best; }
  return d; }
const TAP_T = TUNING.TAP_T;   // released sooner than this, the dash button is a tap
const focusLen = () => (upOn("narrow") ? .5 : 1) * (isGun() ? 1.6 : 1) * ((P && P.cloudT ? P.cloudT : 0) + 1.2 * (oath("gonggung") && !P.onGround ? 2 : 1) * (simb("hyeol") && run && run.breath <= 2 && mode !== "tutorial" ? 2 : 1) * (has("d_calm") && run && run.breath <= 1 && mode !== "tutorial" ? 2 : 1));
function talismans(d) { // 부적 세 장: a fan of paper charms thrown along the aim
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
  for (const t of [-.22, 0, .22]) { const vx = d.x * Math.cos(t) - d.y * Math.sin(t), vy = d.x * Math.sin(t) + d.y * Math.cos(t);
    bullets.push({ x: cx + vx * 16, y: cy + vy * 16, vx: vx * 720, vy: vy * 720, ang: Math.atan2(vy, vx), friendly: true, talisman: true, wind: true, strike: true, r: 14, life: .5, owner: null }); }
}
const GUN_AX = { gun1: [.5, .3, .25, .45, .28, .5, .5, .38, .3], gun2: [.42, .24, .45, .45, .25, .5, .45, .25, .5], grun: [.5, .5, .49, .44, .47, .46, .41, .41, .4], grun2: [.544, .551, .522, .510, .553, .573, .536, .522, .606, .629, .612, .609, .576, .623, .618, .605, .620, .603, .590, .591, .595, .601, .591, .591, .575, .567, .565, .583, .542, .559, .578, .577] };   // grun: the three heavy guns carried at a run
const gunMag = () => (WEAPONS[wpn()].mag || 1) + treeStat("mag");
function gunReload(n, why) { // a round goes back in (a bayonet that bit, a read blow, the slow match)
  const G = WEAPONS[wpn()]; if (!G || !G.gun || !P) return;
  if (G.heat) { P.heat = Math.max(0, (P.heat || 0) - 34 * n); if (P.overheat > 0 && n >= 3) P.overheat = 0; return; }
  const before = P.ammo ?? gunMag(); P.ammo = Math.min(gunMag(), before + n); if (P.ammo > before) { P.reloadT = .25; if (why !== "slow") Music.sfx("hook"); }
}
function blast(x, y, r, strike, opts = {}) { // a gun's explosion: ink and fire, everyone inside cut
  r *= 1 + treeStat("blast");
  if (SPR.gfx) addFx("gfx", 3, x, y, r * 2.1, { life: .45, grow: .25, rot: Math.random() * 6.28 }); else fireFx(x, y, r);
  shake = Math.max(shake, Math.min(14, 4 + r / 12)); hitstop = Math.max(hitstop, .04); Music.sfx("shoot");
  for (const e of enemies) { if (!e.alive || ghostly(e)) continue; const dd = Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y), rr = Math.max(e.w, e.h) / 2; if (dd >= r + rr) continue;
    const st = strike && (!opts.core || dd < r * .45 + rr);   /* a cannon's heart kills; its edge only wounds */ hurtEnemy(e, st && e.type !== "b" ? true : st ? 2 : false, "il"); if (opts.after) opts.after(e); }
  if (opts.clear) ougiArt(["ogB", 8], x, y, r * 2.2, { life: .4 });
  if (opts.clear) for (const b of bullets) if (!b.friendly && Math.hypot(b.x - x, b.y - y) < r) b.life = 0;
  if (opts.fire) pfire(x - r * .6, y - 8, r * 1.2, opts.fire);
}
function chainBlast(x, y, depth) { if (has("sj_c3") && depth) ougiArt(["ogB", 5], x, y, 110, { life: .4 }); blast(x, y, 48, false, { after: e => { if (!e.alive && has("sj_c3") && depth < 4) setTimeout(() => chainBlast(e.x + e.w / 2, e.y + e.h / 2, depth + 1), 90); } }); }   // 유폭 · 연쇄유폭
let pfires = [];   // fire left on the ground by your own shots: it burns foes, never you
function pfire(x, y, w, t) { pfires.push({ x, y, w, h: 20, until: songPos + t, tick: 0 }); }
function gunShot(hip) { // 총: the aimed release is a shot, and the recoil is the dash; an empty gun lunges with the bayonet instead
  const G = WEAPONS[wpn()], w = wpn();
  if (G.heat) { if ((P.overheat || 0) > 0 && !has("sg_b3")) return false; }
  else if ((P.ammo ?? gunMag()) <= 0) return false;
  if (hip) return hipShot(G, w);
  let d = aimDir();
  { const cx = P.x + P.w / 2, cy = P.y + P.h / 2 - 4; let bs = .9;   // a marksman's eye: a foe within a hair of the aim draws the barrel onto it
    for (const e of enemies) { if (!e.alive || ghostly(e)) continue; const dx = e.x + e.w / 2 - cx, dy = e.y + e.h / 2 - cy, L = Math.hypot(dx, dy); if (L > 560 || L < 10) continue; const c = (dx * d.x + dy * d.y) / L; if (c > bs) { bs = c; d = { x: dx / L, y: dy / L }; } } }
  const aimT = P.focusT || 0, air = !P.onGround, rot = t => ({ x: d.x * Math.cos(t) - d.y * Math.sin(t), y: d.x * Math.sin(t) + d.y * Math.cos(t) });
  const { x: cx, y: cy } = muzzleAt(w, d);
  if (G.heat) { P.heat = (P.heat || 0) + 38; if (P.heat >= 100) { if (has("sg_b3") && P.overheat > 0) { P.ki = Math.max(0, (P.ki || 0) - .2); ougiArt(["ogB", 7], P.x + P.w / 2, P.y + P.h, 80, { life: .4, ay: 1 }); } P.overheat = 1.6; P.heat = 100; if (has("sg_a3") && !P.volley) volleyFire(); } }
  else if (!(w === "cheonja" && air && has("cj_c2") && !P.airFree) && !(w === "jochong" && air && has("jc_b1") && !P.airFree)) P.ammo = (P.ammo ?? gunMag()) - 1;
  else P.airFree = true;   // 낙하포 · 반동술: one shot in each flight is free
  let k = 1, fxi = 0;
  if (w === "jochong") {   // 정밀: held long enough, the ball goes through and every body it meets falls
    const full = aimT >= (has("jc_a1") ? .25 : .45) || (has("jc_b3") && air) || P.nextFull; P.nextFull = false;
    aimRay(d, 600, full ? 14 : 9, 0, undefined, undefined, full, { full }); if (has("jc_b3") && air) ougiArt(["ogB", 1], P.x + P.w / 2, P.y, 110, { life: .45, flip: d.x < 0 });

    k = has("jc_b1") ? 1.5 : 1; if (has("jc_b2") && d.y > .6) { k *= 1.6; gunReload(1); } }
  else if (w === "seungja") {   // 산탄: a cone, short; the closer the harder
    const n = has("sj_a3") ? 7 : 4, sp = has("sj_a3") ? .5 : .32, once = new Set();   // each body takes one wound per shot, however many pellets find it
    for (let i = 0; i < n; i++) aimRay(rot(-sp + 2 * sp * i / (n - 1)), 180, 8, 0, cx, cy, false, { pellet: true, once });
    if (has("sj_a3")) ougiArt(["ogB", 3], cx + d.x * 50, cy + d.y * 50, 100, { life: .3, rot: Math.atan2(d.y, Math.abs(d.x)) * Math.sign(d.x || 1), flip: d.x < 0 });
    if (has("sj_a3")) for (const b of bullets) if (!b.friendly && Math.hypot(b.x - cx, b.y - cy) < 200 && ((b.x - cx) * d.x + (b.y - cy) * d.y) > 0) b.life = 0;
    fxi = 1; k = (has("sj_b1") ? 1.6 : 1.5) * (has("sj_b2") && air && P.airShots >= 1 ? 2 : 1); if (air) P.airShots = (P.airShots || 0) + 1;
    if (has("sj_b3")) { P.cannonT = .45; ougiArt(["ogB", 4], P.x + P.w / 2, P.y + P.h / 2, 90, { life: .45, rot: Math.atan2(-d.y, Math.abs(d.x)) * Math.sign(-d.x || 1), flip: d.x > 0 }); } }
  else if (w === "singi") {   // 신기전: three rocket arrows that burst
    const hot = (P.heat || 0) >= 70 && has("sg_b2"), spd = 560 * (has("sg_b2") ? 1 + (P.heat || 0) / 200 : 1);
    for (const t of [-.09, .09]) { const v = rot(t); bullets.push({ x: cx, y: cy, vx: v.x * spd, vy: v.y * spd, friendly: true, rocket: true, seek: has("sg_a1") ? 9 : 2.2, blast: 34 * (has("sg_c1") ? 1.5 : 1) * (has("sg_c3") ? 2 : 1), strike: hot, life: 1.6, owner: null, r: 8 }); }
    fxi = 2; k = .45; }
  else if (w === "cheonja") {   // 천자총통: a ball on an arc that bursts large
    const planted = P.onGround && (P.stillT || 0) >= 1 && has("cj_b1");
    bullets.push({ x: cx, y: cy, vx: d.x * 640, vy: d.y * 640 - 60, g: 900, friendly: true, cannon: true, blast: 70 * (has("cj_a1") ? 1.4 : 1) * (planted ? 1.6 : 1), strike: true, core: true, life: 2.6, owner: null, r: 10, bounces: has("cj_a2") ? 1 : 0 });
    k = has("cj_c1") && d.y > .6 ? 2.6 : 1.9; }
  const mz = { x: cx, y: cy }; muzzleFx(w, cx, cy, d);
  for (let i = 0; i < 10; i++) parts.push({ x: mz.x, y: mz.y, vx: d.x * 60 + (Math.random() - .5) * 90, vy: d.y * 60 - 30 - Math.random() * 60, life: .7, max: .7, c: "rgba(90,86,94,.75)", s: 4 + Math.random() * 5 });
  shake = Math.max(shake, w === "cheonja" ? 10 : 6); Music.sfx(w === "cheonja" ? "snipe" : "shoot"); P.fireT = .22; P.lastShotAt = songPos; P.shotDir = d;
  if (has("jc_c3") && w === "jochong") P.bayoT = .4;
  if (!P.onGround && !(has("jc_b1") && w === "jochong")) P.airDash = Math.max(0, P.airDash - 1);
  P.vx = -d.x * 560 * k; P.vy = -d.y * 560 * k - 140 * k; P.onGround = false; P.coyote = 0; if (Math.abs(d.x) > .2) P.face = Math.sign(d.x);
  return true;
}
function hipShot(G, w) { // a tap: fired from the hip — short, one wound, one round, barely a kick
  const d0 = aimDir(), d = Math.abs(d0.x) < .2 && Math.abs(d0.y) < .2 ? { x: P.face, y: 0 } : d0, { x: cx, y: cy } = muzzleAt(w, d);
  if (G.heat) { P.heat = (P.heat || 0) + 20; if (P.heat >= 100) { P.heat = 100; P.overheat = 1.6; } } else P.ammo = (P.ammo ?? gunMag()) - 1;
  const rot = t => ({ x: d.x * Math.cos(t) - d.y * Math.sin(t), y: d.x * Math.sin(t) + d.y * Math.cos(t) });
  if (w === "seungja") { const once = new Set(); for (const t of [-.2, 0, .2]) aimRay(rot(t), 150, 8, 0, cx, cy, false, { pellet: true, once }); }   // a short spray
  else if (w === "singi") bullets.push({ x: cx, y: cy, vx: d.x * 520, vy: d.y * 520, friendly: true, rocket: true, split: true, seek: 2.2, blast: 26, strike: false, life: 1.2, owner: null });   // one small rocket
  else if (w === "cheonja") bullets.push({ x: cx, y: cy, vx: d.x * 520, vy: d.y * 520 - 40, g: 900, friendly: true, cannon: true, blast: 40, strike: false, life: 2, owner: null, r: 8 });   // a light ball
  else aimRay(d, 300, 8, 0, cx, cy, false, {});
  muzzleFx(w, cx, cy, d);
  shake = Math.max(shake, 3); Music.sfx(w === "cheonja" ? "snipe" : "shoot"); P.fireT = .16; P.lastShotAt = songPos; P.shotDir = d; P.hipT = .2;
  P.vx -= d.x * 120; if (Math.abs(d.x) > .2) P.face = Math.sign(d.x); return true;
}
const MUZ_L = { jochong: 40, seungja: 30, singi: 30, cheonja: 40 };   // from the body's centre to the barrel's mouth, as drawn
function muzzleAt(w, d) { const L = MUZ_L[w] || 32; return { x: P.x + P.w / 2 + d.x * L, y: P.y + P.h / 2 - 7 + d.y * L * .8 }; }
const MUZ = { flash: 0, cone: 1, blast: 2, puff: 3, trail: 4, cloud: 5, sparks: 6, bullet: 7 };
function muzzleFx(w, x, y, d) { // fire and smoke out of the gun's own mouth (no painted barrel: the gun in his hands is the barrel)
  const rot = Math.atan2(d.y, d.x), fl = d.x < 0, r = fl ? rot - Math.PI : rot, big = w === "cheonja", wide = w === "seungja";
  if (SPR.muz) { if (w === "jochong") addFx("muz", MUZ.flash, x, y, 34, { life: .13, grow: .25, ax: 0, ay: .5, rot: r, flip: fl });
    addFx("muz", big ? MUZ.cloud : MUZ.puff, x + d.x * (big ? 26 : 12), y + d.y * 10, big ? 70 : 30, { life: .55, grow: .6, ay: .5, a: .7, rot: Math.random() * .4 - .2, flip: fl });
  }
  else ringFx(x, y, big ? 40 : 18, "rgba(195,22,28,.8)", .15);
}
function volleyFire() { // 화차: the overheated box empties itself
  P.volley = true; const cx = P.x + P.w / 2, cy = P.y + P.h / 2 - 6;
  for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + (i - 5.5) * .14 + (P.face < 0 ? 0 : 0); bullets.push({ x: cx, y: cy, vx: Math.cos(a) * 420 + P.face * 160, vy: Math.sin(a) * 420, friendly: true, rocket: true, seek: 9, blast: 46, strike: true, life: 2.2, owner: null, r: 8 }); }
  ougiArt(["ogB", 6], cx, cy, 170, { life: .6, ay: .9 }); shake = Math.max(shake, 10); setTimeout(() => { if (P) P.volley = false; }, 400);
}
// 날: a sword's edge is spent like a gun's rounds — every plain cut dulls it a notch; rest the hand and it comes back,
// a read blow (간파) or an 일섬 kill whets it at once. A dull blade does not bite: the cut glances off.
const EDGE = TUNING.EDGE;   // [notches, seconds per notch]
const edgeOn = () => !!(P && run && mode !== "tutorial" && !isGun() && EDGE[wk()]);
const edgeMax = () => (EDGE[wk()] || [4])[0] + treeStat("edge");
function stepEdge(dt) { if (!edgeOn()) return; if (P.edge == null) P.edge = edgeMax();
  P.edgeIdle = (P.edgeIdle || 0) + dt; if (P.edge < edgeMax() && P.edgeIdle > .35) { P.edgeT = (P.edgeT || 0) + dt; if (P.edgeT >= EDGE[wk()][1] / (momTier() >= 3 ? 2 : 1) / (1 + treeStat("edgeRate"))) { P.edgeT = 0; P.edge++; } } }
function whet(n = 99) { if (P && edgeOn()) P.edge = Math.min(edgeMax(), (P.edge ?? edgeMax()) + n); }
function stepGun(dt) { // the slow match: an empty gun refills by itself, a hot box cools
  const G = WEAPONS[wpn()]; if (!G || !G.gun) return;
  if (P.onGround) { P.airFree = false; P.airShots = 0; }
  P.stillT = P.onGround && Math.abs(P.vx) < 20 ? (P.stillT || 0) + dt : 0;
  P.fireT = Math.max(0, (P.fireT || 0) - dt); P.reloadT = Math.max(0, (P.reloadT || 0) - dt); P.bayoT = Math.max(0, (P.bayoT || 0) - dt); P.cannonT = Math.max(0, (P.cannonT || 0) - dt);
  if (G.heat) { P.heat = Math.max(0, (P.heat || 0) - dt * 30 * (has("sg_b1") ? 2 : 1) * (1 + treeStat("heat"))); if (P.overheat > 0) P.overheat -= dt * (has("sg_b1") ? 2 : 1); return; }
  if (P.ammo == null) P.ammo = gunMag();
  if (P.ammo < gunMag()) { P.slowRe = (P.slowRe || 0) + dt; if (P.slowRe > 2.4 / (1 + treeStat("reload"))) { P.slowRe = 0; gunReload(1, "slow"); } } else P.slowRe = 0;
  if (P.cannonT > 0) for (const e of enemies) if (e.alive && !ghostly(e) && overlap(e, P)) hurtEnemy(e, e.type !== "b");   // 포탄비행: the body itself is the shot
  if (has("cj_b3") && P.onGround && P.stillT >= 2 && (P.fortT = (P.fortT || 0) - dt) <= 0) { const t = nearestFoes(P.x, P.y, 1, 420)[0]; if (t) { P.fortT = 1.5; ougiArt(["ogB", 10], P.x + P.w / 2, P.y + P.h + 6, 90, { life: .5, ay: .8 }); const dx = t.x + t.w / 2 - P.x, dy = t.y - P.y - 40, L = Math.hypot(dx, dy) || 1; bullets.push({ x: P.x + P.w / 2, y: P.y + 8, vx: dx / L * 520, vy: dy / L * 520 - 120, g: 900, friendly: true, cannon: true, blast: 70, strike: true, life: 2.4, owner: null, r: 9 }); Music.sfx("snipe"); } }
}
function aimRay(d, L0, wide, bounce, ox, oy, str = false, o = {}) { // one aimed shot: a line that stops at walls; bosses take a full 일격
  const cx = ox ?? P.x + P.w / 2 + d.x * 20, cy = oy ?? P.y + P.h / 2 - 4 + d.y * 18; let L = L0, wall = false;
  for (let t = 10; t < L0; t += 8) if (solidPt(cx + d.x * t, cy + d.y * t)) { L = t; wall = true; break; }
  let hit = enemies.filter(e => { if (!e.alive || ghostly(e)) return false; const ex = e.x + e.w / 2 - cx, ey = e.y + e.h / 2 - cy, t = ex * d.x + ey * d.y; return t > 0 && t < L && Math.abs(ex * d.y - ey * d.x) < Math.max(e.w, e.h) / 2 + wide; })
    .sort((a, b) => ((a.x - cx) * d.x + (a.y - cy) * d.y) - ((b.x - cx) * d.x + (b.y - cy) * d.y));
  const burst = has("p_burst") && (hit.length || wall);
  if (burst && hit.length) { const e = hit[0]; L = (e.x + e.w / 2 - cx) * d.x + (e.y + e.h / 2 - cy) * d.y; hit = [e]; }   // 작렬탄: the ball stops at the first body
  if (o.pellet && hit.length) { const e = hit[0]; L = (e.x + e.w / 2 - cx) * d.x + (e.y + e.h / 2 - cy) * d.y; hit = [e]; str = has("sj_a1") && L < 130; }   // 산탄: each pellet stops in the first body; point blank (영거리) it kills
  for (const g of LV.targets) { const ex = g.x - cx, ey = g.y - cy, t = ex * d.x + ey * d.y; if (g.t <= 0 && t > 0 && t < L && Math.abs(ex * d.y - ey * d.x) < wide + 14) breakTarget(g); }
  for (const e of hit) { const ex = e.x + e.w / 2, ey = e.y + e.h / 2; if (o.once) { if (o.once.has(e)) continue; o.once.add(e); } hurtEnemy(e, str, "il"); addFx("perkfx", PF.splash, ex, ey, 36, { life: .22 });
    if (o.pellet) { if (has("sj_a2") && e.alive && e.type !== "b") { if (moveX(e, d.x * 70)) { e.stunT = Math.max(e.stunT || 0, 1); addFx("wfx", WF2.burst, ex, ey, 40, { life: .3 }); } }   // 밀쳐내기: into the wall, dazed
      if (has("sj_c1")) pfire(ex - 18, e.y + e.h - 16, 36, 1);   // 화승
      if (has("sj_c2") && !e.alive) chainBlast(ex, ey, 0); }   // 유폭
    if (o.full && !e.alive && has("jc_a2")) { gunReload(1); addQi(15); }   // 급소
    if (has("p_slug")) chainAdd(1);   // 대구경: every body the ball goes through
    if (has("p_scatter") && e.alive) { e.stunT = Math.max(e.stunT || 0, e.type === "b" ? .15 : .6); if (e.type !== "b") moveX(e, d.x * 30); } }   // 산탄: thrown back, dazed
  beams.push({ x0: cx, y0: cy, x1: cx + d.x * L, y1: cy + d.y * L, t: 0, life: .28, red: true, w: wide > 20 ? 2.4 : 1.2 });
  if (o.full && has("jc_a3") && hit.length) { let from = hit[hit.length - 1], done = new Set(hit), n = 0;   // 일발필중: the ball finds the next one, and the next
    while (n++ < 5) { const fx = from.x + from.w / 2, fy = from.y + from.h / 2, nx = nearestFoes(fx, fy, 6, 320).find(q => !done.has(q)); if (!nx) break; done.add(nx);
      beams.push({ x0: fx, y0: fy, x1: nx.x + nx.w / 2, y1: nx.y + nx.h / 2, t: 0, life: .3, red: true, w: 1.6 }); ougiArt(["ogB", 0], (fx + nx.x + nx.w / 2) / 2, (fy + nx.y + nx.h / 2) / 2, 80, { life: .35 }); hurtEnemy(nx, true, "il"); from = nx; } }
  const x = cx + d.x * L, y = cy + d.y * L;
  if (burst) { fireFx(x, y, 64); if (SPR.pfx) addFx("pfx", 2, x, y, 120, { life: .5, grow: .35, ay: .5 }); ringFx(x, y, 80, "rgba(60,52,48,.7)", .35);
    for (const e of nearestFoes(x, y, 9, 80)) if (!hit.includes(e)) hurtEnemy(e, false); for (const b of bullets) if (!b.friendly && Math.hypot(b.x - x, b.y - y) < 90) b.life = 0; return; }
  if (bounce && wall) { const bx = x - d.x * 6, by = y - d.y * 6, vert = solidPt(bx + d.x * 10, by);   // 도탄: off the wall once
    aimRay(vert ? { x: -d.x, y: d.y } : { x: d.x, y: -d.y }, L0 - L, wide, 0, bx, by, true); }   // the turned ball strikes true
}
function sunbo() { // 순보: the aimed release steps through to the back of the foe it points at, and cuts
  const d = aimDir(), cx = P.x + P.w / 2, cy = P.y + P.h / 2; let t = null, bs = 1e9;
  for (const e of enemies) { if (!e.alive || ghostly(e)) continue; const dx = e.x + e.w / 2 - cx, dy = e.y + e.h / 2 - cy, L = Math.hypot(dx, dy); if (L > 230 || L < 8) continue;
    if ((dx * d.x + dy * d.y) / L < .88 || !los(cx, cy, e.x + e.w / 2, e.y + e.h / 2)) continue; if (L < bs) { bs = L; t = e; } }
  if (!t) return false;
  const side = Math.sign(t.x + t.w / 2 - cx) || P.face, nx = t.x + t.w / 2 + side * (t.w / 2 + 16) - P.w / 2, ny = t.y + t.h - P.h - .01;
  if (rectSolid(nx, ny, P.w, P.h)) return false;
  addFx("perkfx", PF.clone, cx, P.y + P.h, 60, { life: .3, ay: 1, flip: P.face < 0, a: .6 });
  beams.push({ x0: cx, y0: cy, x1: nx + P.w / 2, y1: ny + P.h / 2, t: 0, life: .25 });
  P.x = nx; P.y = ny; P.vx = 0; P.vy = -120; P.face = -side; if (!P.onGround) P.airDash = Math.max(0, P.airDash - 1);
  P.aimedUntil = songPos + .45; P.aimDash = true; hurtEnemy(t, false, "il"); P.aimDash = false; P.dashCd = .55;   // a bodily step: it lands a cut, not the full 일격, and the feet need a moment
  addFx("perkfx", PF.splash, t.x + t.w / 2, t.y + t.h / 2, 40, { life: .25 }); Music.sfx("dash"); return true;
}
function startDash(dir, forced) { P.trail = null; P.yongArt = false;
  if (oath("hyeon") && !forced) return false;
  if (P.dashCd > 0 && !forced) { if (!(simb("hwa") && P.spare)) return false; P.spare = false; }   // 화심법: a second dash held in reserve
  ;
  if (!P.onGround) { if (P.airDash <= 0) return false; P.airDash--; ; }
  let d = dir || aimDir();
  if (P.onGround && d.y > 0.2) d = { x: d.x === 0 ? P.face : Math.sign(d.x), y: 0 };
  if (!forced && kanLunge(d)) return true;
  if (!forced) { if (P.flowReady && false) { P.flowReady = false; P.flowN = 0; P.flowDash = true; ringFx(P.x + P.w / 2, P.y + P.h / 2, 60, "rgba(195,22,28,.9)", .3); } else flow("dash"); }
  if (!forced && (P.boltDash)) { // 뇌섬: the dash becomes a bolt that is already there
    P.boltDash = false; P.dashCd = .4 * (res("hwa", 2) ? .75 : 1); P.hook = null;   // a bolt needs a breath between: 섬광 does not hurry it
    boltLunge(d, 250 * (1), true);
    ;
    return true; }
  { const ang = Math.atan2(d.y, Math.abs(d.x)), dx = Math.abs(d.x) > .2 ? Math.sign(d.x) : P.face; heroFx("dash", P.x + P.w / 2 - d.x * 26, P.y + P.h / 2 - d.y * 26, dx, ang); }
  P.dashFrom = { x: P.x + P.w / 2, y: P.y + P.h }; P.ram = false;
  P.bounced = false; P.dashDir = d; const fromGround = P.onGround; P.dashT = 0.15 * (P.aimDash ? (has("d_far") ? 1.8 : 1) * (has("d_pajuk") ? 1 + .15 * Math.min(5, P.chain || 0) : 1) * (has("d_hyeol") && run && mode !== "tutorial" ? (run.breath <= 1 ? 1.8 : run.breath <= 2 ? 1.4 : 1) : 1) * (oath("goyo2") ? 2 : 1) * (P.chargeK || 1) * (has("m_talis") ? .6 : 1) * (P.giseDash ? 1 + .08 * P.giseDash : 1) : 1) * (P.ram ? 1.7 : 1); P.dashCd = (0.32) * (res("hwa", 2) ? .65 : 1); P.dashHit = new Set(); P.hook = null;
  if (fromGround) P.dashCd = Math.max(P.dashCd, .45);   // on the ground the dash is free of the air count, so it cools a little longer
  if (Math.abs(d.x) > 0.2) P.face = Math.sign(d.x);
  Music.sfx("dash"); return true;
}
// 간파 돌진: a blow read from afar — dash toward a foe while it glints and the dash closes the distance in a single stride and cuts on the glint
const KAN_REACH = 300;
function kanLunge(d, own) {   // own: called on its own (the 무아경 release), so it pays its air dash itself
  if (own && !P.onGround && P.airDash <= 0) return false;
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2; let t = null, bs = -1;
  for (const e of enemies) { if (!e.alive || ghostly(e) || e.hidden || !isFlashing(e)) continue; const dx = e.x + e.w / 2 - cx, dy = e.y + e.h / 2 - cy, L = Math.hypot(dx, dy);
    if (L > KAN_REACH + e.w / 2 || L < 1) continue; const c = (dx * d.x + dy * d.y) / L, side = Math.abs(d.y) < .5 && Math.sign(dx) === Math.sign(d.x || P.face);   // aimed at it, or at least toward its side on the level
    const sc = c + (side ? .4 : 0); if ((c > .55 || side) && sc > bs && los(cx, cy, e.x + e.w / 2, e.y + e.h / 2)) { bs = sc; t = e; } }
  if (!t) return false;
  if (own && !P.onGround) P.airDash--;
  const side = Math.sign(t.x + t.w / 2 - cx) || P.face, nx = t.x + t.w / 2 - side * (t.w / 2 + 12) - P.w / 2, ny = Math.min(P.y, t.y + t.h - P.h - .01);
  const x0 = cx, y0 = cy; if (!rectSolid(nx, ny, P.w, P.h)) { P.x = nx; P.y = ny; }
  P.face = side; P.vx = side * 260; P.vy = Math.min(P.vy, -120); P.invT = Math.max(P.invT || 0, .35); P.dashHit = new Set([t.id]);
  trailFx(x0, y0, P.x + P.w / 2, P.y + P.h / 2, 8, .35, WF2.streak); P.kanLungeT = .18; tipOnce("kanLunge", "간파 돌진", "멀리 있어도 번뜩이는 적 쪽으로 대시하면 단숨에 붙어 간파한다", "번뜩일 때 그 적 쪽으로 대시");
  hurtEnemy(t, false, "il"); Music.sfx("dash"); P.dashCd = Math.max(P.dashCd, .2); return true;
}
function musket(d, arrow) { // 포수: the 일격 is a matchlock shot (or a loosed arrow) — then the match must be relit
  if (!arrow) { if ((P.reloadAt || 0) > songPos) return; P.reloadAt = songPos + (2) * Music.beatLen; }   // still reloading: the 일격 stays a thrust
  const rot = (v, t) => ({ x: v.x * Math.cos(t) - v.y * Math.sin(t), y: v.x * Math.sin(t) + v.y * Math.cos(t) });
  for (const t of ([0])) shot(rot(d, t), arrow);   // 쌍발
  if (arrow) { Music.sfx("slash"); return; }
  const cx = P.x + P.w / 2 + d.x * 20, cy = P.y + P.h / 2 - 4 + d.y * 18;
  if (SPR.pfx) addFx("pfx", 1, cx + d.x * 30, cy + d.y * 26, 46, { life: .22, grow: .3, ay: .5, ...dirFx(d) });   // the muzzle flash
  for (let i = 0; i < 12; i++) parts.push({ x: cx + d.x * 14, y: cy + d.y * 14, vx: d.x * 60 + (Math.random() - .5) * 90, vy: d.y * 60 - 30 - Math.random() * 60, life: .7, max: .7, c: "rgba(90,86,94,.75)", s: 4 + Math.random() * 5 });
  P.vx -= d.x * 160; shake = Math.max(shake, 4);
}
function shot(d, arrow) {
  const cx = P.x + P.w / 2 + d.x * 20, cy = P.y + P.h / 2 - 4 + d.y * 18, cannon = !arrow && false, wide = 8; let L = arrow ? 640 : 360;
  for (let t = 10; t < L; t += 8) if (solidPt(cx + d.x * t, cy + d.y * t)) { L = t; break; }
  const hit = enemies.filter(e => { if (!e.alive || ghostly(e)) return false; const ex = e.x + e.w / 2 - cx, ey = e.y + e.h / 2 - cy, t = ex * d.x + ey * d.y; return t > 0 && t < L && Math.abs(ex * d.y - ey * d.x) < Math.max(e.w, e.h) / 2 + wide; })
    .sort((a, b) => ((a.x - cx) * d.x + (a.y - cy) * d.y) - ((b.x - cx) * d.x + (b.y - cy) * d.y));
  if (cannon && hit.length) { const e = hit[0]; L = (e.x + e.w / 2 - cx) * d.x + (e.y + e.h / 2 - cy) * d.y; hit.length = 1; }   // 대포: the ball stops at the first body and bursts
  for (const e of hit) { hurtEnemy(e, e.type !== "b"); addFx("perkfx", PF.splash, e.x + e.w / 2, e.y + e.h / 2, 36, { life: .22 });
    ;
    ;
    ; }
  beams.push({ x0: cx, y0: cy, x1: cx + d.x * L, y1: cy + d.y * L, t: 0, life: arrow ? .4 : .26, red: true, arrow, w: cannon ? 2.4 : 1 });
  if (cannon) { const x = cx + d.x * L, y = cy + d.y * L, r = (90) * (1); fireFx(x, y, r * .8); if (SPR.pfx) addFx("pfx", 2, x, y, r * 1.5, { life: .55, grow: .35, ay: .5 }); ringFx(x, y, r, "rgba(60,52,48,.7)", .4); shake = Math.max(shake, 8); Music.sfx("kill");
    for (const e of enemies) if (e.alive && !ghostly(e) && !hit.includes(e) && Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y) < r + Math.max(e.w, e.h) / 2) { hurtEnemy(e, false); e.stunT = Math.max(e.stunT || 0, .45); } }
}function doSlash(req) {
  if (P.hook) return; P.pogoed = false;
  if (P.slashCd > 0 && !req.dash && !req.fromMua) return;
  if ((P.offBal || 0) > 0 && !req.dash && !req.fromMua) return;
  if (edgeOn() && !req.dash && !req.fromMua && req.iai == null) { if (P.edge == null) P.edge = edgeMax();
    if (P.edge < 1) { P.slashCd = .45; P.edgeIdle = 0; addFx("hud", HUD.spark, P.x + P.w / 2 + P.face * 22, P.y + P.h / 2, 26, { life: .2 }); Music.sfx("clang"); if (!P.dullTold) { P.dullTold = true; tipOnce("edge", "날이 무뎌졌다", "막 휘두르면 날이 닳는다 — 잠깐 손을 쉬거나 간파하면 날이 선다", "베기 사이에 쉬기"); } return; }
    P.edge--; P.edgeIdle = 0; P.edgeT = 0; }
  let d = req.dir;
  if (!d) { const a = axis(), m = Math.hypot(a.x, a.y); d = m > 0.5 ? { x: a.x / m, y: a.y / m } : { x: P.face, y: 0 }; }
  const off = Music.offBeat(Music.posAt(req.ts));
  const WP = WEAPONS[wpn()], onBeat = !!window.__forceStrike;   // the drum no longer judges the hand: an 일격 comes from 일섬, a full 거합 or a run of cuts
  let strike = onBeat;
  if (onBeat && false) P.chainT = .45;
  P.whiff = false;
  if (oath("geommu")) { const gap = songPos - (P.danceAt ?? -9); P.dance = gap < .7 ? Math.min(5, (P.dance || 0) + 1) : 0; P.danceAt = songPos; P.danceRest = gap > 1; }
  if (wk() === "ssang") { P.combo = songPos - (P.lastCut || -9) < .5 ? (P.combo || 0) + 1 : 1; P.lastCut = songPos; if (P.combo >= 5) { strike = true; P.combo = 0;
      if (has("ss_c3")) { const x = P.x + P.w / 2, y = P.y + P.h / 2, dx = d.x || P.face; trailFx(x, y, x + dx * 460, y + d.y * 460, 7, .4, WF2.xcut); ougiArt(["ogA", 5], x + dx * 200, y + d.y * 200, 150, { life: .45, rot: Math.atan2(d.y, Math.abs(dx)) * Math.sign(dx), flip: dx < 0 }); for (const o of foesInLine(x, y, { x: dx, y: d.y }, 460)) hurtEnemy(o, o.type !== "b" ? true : 2); } } }   // 천인참
  P.spinCut = wk() === "ssang" && has("ss_b1") && !P.onGround;
  if (P.spinCut && has("ss_b2")) { for (const b of bullets) if (!b.friendly && Math.hypot(b.x - P.x - P.w / 2, b.y - P.y - P.h / 2) < 80) b.life = 0; P.vy = Math.min(P.vy, -240); }   // 회오리
  if (wk() === "ssang" && has("ss_c1")) P.twinT = .12;   // 쌍수
  if (wk() === "baldo" && (P.renT || 0) > 0 && has("bd_c2") && req.iai == null) { req.iai = P.lastMaster ? iaiM() : iaiF(); req.dir = { x: -(P.lastIaiDir ? P.lastIaiDir.x : P.face), y: 0 }; d = req.dir; P.renT = 0; popText(P.x + P.w / 2, P.y - 20, "연도"); }   // 연도
  const full = wk() === "baldo" && req.iai != null && req.iai >= iaiF(), master = full && req.iai >= iaiM();   // 모아베기: a full draw always comes out; held to the second ring it is the 일격
  if (full && WP.bow) {   // 각궁: a full draw always flies; drawn to the second ring it is an 일격 and the air comes back
    P.arrow = true; if (master) { strike = true; regainAir(); }
  } else if (full) {   // 발도: a full draw lunges forward cutting; drawn to the second ring it is the 일격 and the air comes back
    const onBeat = master, inMua = P.focus || !!req.fromMua; P.iaiCut = onBeat; P.iaiPlain = !onBeat; P.lastMaster = onBeat; if (onBeat) { strike = true; regainAir(); } P.dashCd = 0; P.tapDash = !onBeat;
    if (onBeat && has("bd_a2") && req.iai - iaiM() < .2) { regainAir(); P.ki = Math.min(1, (P.ki || 0) + .35); P.slashCd = 0; popText(P.x + P.w / 2, P.y - 22, "완벽"); flash = .12; Music.sfx("strike"); }   // 무념: the perfect draw
    if (inMua) { P.focus = false; P.focusTap = false; Music.muffle(false); d = aimDir(); P.aimedUntil = songPos + .45; }   // drawn in 무아경: the cut goes where you aim, in any direction
    P.slashDir = d; const dd = inMua ? d : { x: Math.abs(d.x) > .2 ? Math.sign(d.x) : P.face, y: 0 }; startDash(dd, true); P.iaiDir = dd; P.lastIaiDir = dd;
    P.dashT = (onBeat ? .22 * (has("bd_a1") ? 1.5 : 1) : .16) * (has("bd_c3") ? 1 + Math.min(1, .08 * (run.senN || 0)) : 1); P.trail = trailFx(P.x + P.w / 2, P.y + P.h / 2, P.x + P.w / 2, P.y + P.h / 2, onBeat ? 9 : 5, onBeat ? .55 : .35, onBeat ? WF2.iai : WF2.streak);
    addFx("gfx", onBeat ? 8 : 6, P.x + P.w / 2, P.y + P.h + 2, onBeat ? 84 : 56, { life: .35, grow: .3, ay: 1 }); if (onBeat) { addFx("wfx", WF2.burst, P.x + P.w / 2, P.y + P.h / 2, 70, { life: .3, grow: .3 }); shake = Math.max(shake, 6); }   // the draw: the ink at the feet bursts
  }
  if (isGun() && P.bayoT > 0 && has("jc_c3") && P.shotDir) { P.bayoLunge = true; P.bayoT = 0; strike = true; startDash(P.shotDir, true); P.dashT = .18; ougiArt(["ogB", 2], P.x + P.w / 2 + P.shotDir.x * 50, P.y + P.h / 2 + P.shotDir.y * 50, 46, { life: .3, rot: Math.atan2(P.shotDir.y, Math.abs(P.shotDir.x)) * Math.sign(P.shotDir.x || 1), flip: P.shotDir.x < 0 }); }   // 총검술: in behind the shot
  run.slashes++; if (strike) run.strikes++;
  P.windBack = false; P.slashDir = d; P.slashT = P.slashDur = (req.dash ? 0.22 : WP.dur); P.slashCd = ((WP.cd)) * (oath("hyeon") ? .5 : 1) + (0); P.strike = strike; P.clanged = new Set(); P.hitSet = new Set(); P.countered = false;
  if (wrule() === "woldo" && has("wd_c3")) bullets.push({ x: P.x + P.w / 2 + d.x * 30, y: P.y + P.h / 2 + d.y * 20, vx: d.x * 560, vy: d.y * 560, ang: Math.atan2(d.y, d.x), friendly: true, moon: true, pierce: true, r: 22, life: .42, owner: null });   // 만월
  if (wrule() === "woldo" && !P.onGround && d.y > .5) { if (!P.slam) P.slamFrom = P.y; P.slam = true; P.vy = Math.max(P.vy, 760); }   // 낙월: the downward cut drives you down
  if (wk() === "ssang" && strike) { const cx = P.x + P.w / 2 + d.x * 34, cy = P.y + P.h / 2 + d.y * 26;   // 몰아치기: the fifth cut crosses
    addFx("wfx", WF2.xcut, cx, cy, 100, { life: .35, grow: .25, rot: Math.random() * .5 - .25 }); for (const b of bullets) if (!b.friendly && Math.hypot(b.x - cx, b.y - cy) < 120) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 18, { life: .2 }); } shake = Math.max(shake, 6); }
  if (strike && false) { const cx = P.x + P.w / 2, cy = P.y + P.h / 2;   // 반격: the shots around you die and their shooters answer for them
    for (const b of bullets) if (!b.friendly && Math.hypot(b.x - cx, b.y - cy) < 110) { b.life = 0; const o = b.owner; if (o && o.alive) { beams.push({ x0: cx, y0: cy, x1: o.x + o.w / 2, y1: o.y + o.h / 2, t: 0, life: .2 }); hurtEnemy(o, o.type !== "b"); } }
    for (const e of enemies) if (e.alive && e.fireAt != null && Math.abs(e.fireAt - songPos) < .3 && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 240) { e.fireAt = null; hurtEnemy(e, true); }
    addFx("slashfx", SF.guard, cx, cy, 80, { life: .3, grow: .5 }); }
  ;
  if (strike && false) for (const b of bullets) if (!b.friendly && Math.hypot(b.x - P.x - P.w / 2, b.y - P.y - P.h / 2) < 280) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 22, { life: .25 }); }
  if (strike && false && chr("posu")) { const cx = P.x + P.w / 2, cy = P.y + P.h / 2 - 4, L = 170;   // 산탄: a cone of shot
    for (const t of [-.32, -.16, 0, .16, .32]) { const v = { x: d.x * Math.cos(t) - d.y * Math.sin(t), y: d.x * Math.sin(t) + d.y * Math.cos(t) };
      for (const e of foesInLine(cx, cy, v, L)) if (!(P.hitSet && P.hitSet.has("g" + e.id))) { P.hitSet && P.hitSet.add("g" + e.id); hurtEnemy(e, false); }
      beams.push({ x0: cx + v.x * 16, y0: cy + v.y * 16, x1: cx + v.x * L, y1: cy + v.y * L, t: 0, life: .18, red: true, w: .5 }); }
    if (SPR.pfx) addFx("pfx", 5, cx + d.x * (L * .45), cy + d.y * (L * .45), L * .55, { life: .25, grow: .3, ay: .5, ...dirFx(d) });   // 산탄: the spray of shot
    for (let i = 0; i < 14; i++) { const a = Math.atan2(d.y, d.x) + (Math.random() - .5) * .7, v = 300 + Math.random() * 400; parts.push({ x: cx + d.x * 20, y: cy + d.y * 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .25, max: .25, c: i % 3 ? "#5a565e" : "#e8b84a", s: 2 }); } }
  else if (strike && false && chr("munyeo")) { const cx = P.x + P.w / 2, cy = P.y + P.h / 2, gr = 140;   // 신령의 손: hands rise from the ground and hold fast
    for (const e of enemies) if (e.alive && !ghostly(e) && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < gr) { hurtEnemy(e, false); e.stunT = Math.max(e.stunT || 0, e.type === "b" ? .25 : .8);
      if (SPR.mfx) addFx("mfx", 3, e.x + e.w / 2, e.y + e.h + 4, Math.max(56, e.h * 1.1), { life: .5, grow: .2, ay: 1 });   // 신령의 손
      for (let i = 0; i < 6; i++) parts.push({ x: e.x + e.w / 2 + (Math.random() - .5) * e.w, y: e.y + e.h, vx: (Math.random() - .5) * 30, vy: -120 - Math.random() * 120, life: .5, max: .5, c: i % 2 ? "rgba(217,165,32,.8)" : "rgba(242,239,230,.9)", s: 3 }); }
    ringFx(cx, cy, gr, "rgba(217,165,32,.75)", .45); ringFx(cx, cy, gr * .6, "rgba(195,22,28,.6)", .35); }
  else if (strike && false) { const cx = P.x + P.w / 2, cy = P.y + P.h / 2; const gr = 140; for (const e of enemies) if (e.alive && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < gr) hurtEnemy(e, false); addFx("hud", HUD.spark, cx, cy, gr * .85, { life: .35 }); }
  if (Math.abs(d.x) > 0.2) P.face = Math.sign(d.x);
  ;
  if (strike) shintong(d);
  P.boltArc = false;
  if (strike && false && !((P.possessUntil || 0) > songPos) && (P.sinN = (P.sinN || 0) + 1) % 5 === 0) { P.possessUntil = songPos + 2 * Music.beatLen; ringFx(P.x + P.w / 2, P.y + P.h / 2, 90, "rgba(217,165,32,.9)", .5); Music.sfx("lantern"); }   // 신내림
  if (strike && res("noe", 6) && (P.noeN = (P.noeN || 0) + 1) % 3 === 0 && !P.boltDash) { P.boltDash = true; resFx("noe", "다음 대시가 번개가 된다"); }
  if (!P.onGround && res("pung", 4)) for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28; parts.push({ x: P.x + P.w / 2 + Math.cos(a) * 30, y: P.y + P.h / 2 + Math.sin(a) * 26, vx: -Math.sin(a) * 160, vy: Math.cos(a) * 160, life: .3, max: .3, c: "rgba(47,138,120,.7)", s: 2 }); }
  if (P.arrow) musket(d, P.arrow); P.arrow = false;
  if (!P.onGround && P.vy > 60) P.vy = 60;
  if (req.dash) { P.tapDash = true; startDash(d); }
  Music.sfx(strike ? "strike" : "slash");
  if (strike) { flash = 0.06; if (onBeat) beatHitAt = performance.now(); }
  if (!isGun()) { const tx = P.x + P.w / 2 + d.x * 40, ty = P.y + P.h / 2 + d.y * 34, n = strike ? 12 : 8, gild = masteryLv(wpn()) >= 5;   // ink (and gold for 일격) thrown off the blade's path
    for (let i = 0; i < n; i++) { const a = Math.atan2(d.y, d.x) + (Math.random() - .5) * 1.6, v = 120 + Math.random() * 260; parts.push({ x: tx, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: .35, max: .35, c: strike ? (i % 3 ? SEAL : "#e8b84a") : gild && i % 3 === 0 ? "#e8b84a" : (i % 4 ? LV.pal.fig : "#6b6670"), s: 1.5 + Math.random() * 2.5 }); }
    if (strike) addFx("perkfx", PF.spark, tx, ty, 40, { life: .2, rot: Math.random() * 6.28, grow: .6 }); }
}
let kegs = [], rings = [], killCam = 0, cutLines = [], trails = [];   // trails: brush lines left by a weapon's move (받아치기, 일도)
// 보스전 연출: the entrance card, the sealed arena, big brush words (격노 · 간파), the fall
let bossIntro = null, bossOut = null, bossBanner = null, roar = null;   // roar: the guardian at half strength — the camera leans in, hands are held
const ACT_NAME = { slam: "내려찍기", charge: "돌진", volley: "연사", summon: "매 부르기", pounce: "덮치기", foxfire: "여우불", illusion: "환영", club: "방망이", coins: "엽전 비", gamtu: "감투",
  burst: "솟구침", burst2: "연이은 솟구침", spit: "독물", scream: "곡성", blink: "덮쳐 오기", hair: "머리카락", low: "아래 베기", high: "위 베기", lowhigh: "아래 · 위", highlow: "위 · 아래", spirits: "장승 정령",
  breath: "불길", leap: "도약", stomp: "짓밟기", inhale: "들이마시기", scrap: "쇳조각", claw: "할퀴기", roar: "포효", fan: "부채", fan2: "쌍부채", dance: "탈춤", mask: "탈 바꾸기", drum: "천고",
  shblink: "그림자 걸음", shcut: "그림자 베기", shstrike: "그림자 일격", shdash: "그림자 돌진" };
const RAGE_ADD = { sumun: ["volley", "summon"], gumiho: ["illusion", "foxfire"], dokkaebi: ["coins", "gamtu"], imugi: ["burst2"], wongwi: ["hair", "scream"], jangseung: ["lowhigh", "highlow"],
  haetae: ["breath", "leap"], bulgasari: ["scrap", "stomp"], baekho: ["roar", "claw"], talchum: ["fan2", "dance"] };
// painted boss-fight sheets: stamps and words (bcal), effects (bvfx), each guardian's name in brush (bname)
const BC = { gyeoljeon: 0, tobeol: 1, gyeoknu: 2, ganpa: 3, stroke: 4, redBurst: 5, inkBurst: 6, talisman: 7, enso: 8 };
const BV = { rage: 0, quake: 1, curtain: 2, dizzy: 3, impact: 4, warn: 5, crescent: 6, dissolve: 7, ring: 8 };
const WF2 = { streak: 0, xcut: 1, quake: 2, fall: 3, iai: 4, smear: 5, crescent: 6, mark: 7, burst: 8 };   // weapon moves, painted: the trail, the cross, the ground blow, the sky stroke, the one draw, the afterimage, the sweep, the mark, the burst
function wfxLine(i, x0, y0, x1, y1, h, sheet = "wfx") { // a painted streak laid along a segment
  const S = SPR[sheet]; if (!S) return false; const f = S.f[i], L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return true;
  ctx.save(); ctx.translate((x0 + x1) / 2, (y0 + y1) / 2); ctx.rotate(Math.atan2(y1 - y0, x1 - x0)); ctx.drawImage(S.img, f.x, f.y, f.w, f.h, -L / 2, -h / 2, L, h); ctx.restore(); return true;
}
const KF = { bead: 0, cross: 1, star: 2, xcut: 3, guide: 4, aura: 5, fizzle: 6, flakes: 7, ring: 8 };   // 간파 sheet: the gathering bead, the cross flash, the crossed cut, the guide, the aura, the fizzle
let flashDim = 0;
const KR = { thin: 0, lock: 1, dashed: 2, burst: 3, dot: 4, indigo: 5, double: 6, drip: 7, dial: 8 };   // 간파 rings: no gold until the kill
const MECH = { glint: 0, chungo: 1, drum: 2, slash: 3, n1: 4, deflect: 9, fire: 10, bar: 11 };   // 간파 glint, 天鼓, the drum, the cut, 一~五, the parry spark, the red shot, the gauge stroke
const BNAME = { sumun: 0, gumiho: 1, dokkaebi: 2, imugi: 3, wongwi: 4, jangseung: 5, haetae: 6, bulgasari: 7, baekho: 8, talchum: 9, cheongo: 10, shadow: 11 };
function spr(sheet, i, x, y, h, flip = false) { const S = SPR[sheet]; if (!S || !S.f[i]) return false; return drawSprite(sheet, i, x, y, h / S.f[i].h, flip, .5, sheet === "bname" && nightNow(), .5); }   // a name in black ink turns bone-white on the inverted night
function sprW(sheet, i, h) { const S = SPR[sheet]; return S && S.f[i] ? S.f[i].w * h / S.f[i].h : 0; }
function banner(text, col, sub) { bossBanner = { text, col, sub, t: 0 }; }
function sealArena(e, on) { // a talisman barrier closes both sides of the arena while the guardian lives
  if (!on) { if (LV && LV.seal) { for (const x of [LV.seal.x0, LV.seal.x1]) for (let y = 0; y <= LV.seal.y1; y++) LV.grid[y * LV.w + x] = 0; LV.seal = null; LV.gridVer = (LV.gridVer || 0) + 1; } return; }
  const d = LV.defs.find(o => o.id === e.id); if (!d || LV.seal) return;
  const x0 = d.tx - 18, x1 = d.tx + 7, px = Math.floor((P.x + P.w / 2) / T);
  if (x0 < 1 || x1 >= LV.w - 1 || px <= x0 || px >= x1) return;
  for (const x of [x0, x1]) for (let y = 0; y <= d.ty; y++) if (LV.grid[y * LV.w + x] !== 0) return;   // only where the arena is open sky
  for (const x of [x0, x1]) for (let y = 0; y <= d.ty; y++) LV.grid[y * LV.w + x] = 1; LV.gridVer = (LV.gridVer || 0) + 1;
  LV.seal = { x0, x1, y1: d.ty, t: 0 };
}
function killCamOn(e) {
  const x = e.x + e.w / 2, y = e.y + e.h / 2, d = P.dashDir || { x: P.face, y: 0 };
  killCam = Math.max(killCam, .35); hitstop = Math.max(hitstop, .05); shake = Math.max(shake, 6); Music.sfx("strike");
  cutLines.push({ x, y, a: Math.atan2(d.y, d.x), t: 0, life: .7 });
  seals.push({ x, y: e.y + 6, t: 0, rot: (Math.random() - .5) * .3 });

}
function drawCutLines() { // a short wet cut of blood across the body, drawn in one stroke
  for (const c of cutLines) { const k = c.t / c.life, grow = Math.min(1, c.t / .07), w = 1 - Math.max(0, k - .4) / .6;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.globalAlpha = w;
    { const L = 70 * grow, th = 2.2 * w + .6; ctx.fillStyle = "#a3121a"; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.quadraticCurveTo(0, -th, L, 0); ctx.quadraticCurveTo(0, th, -L, 0); ctx.fill(); }   // a thin line of blood, nothing more
    ctx.restore(); }
  ctx.globalAlpha = 1;
}
function ringFx(x, y, r, col, life) { rings.push({ x, y, r, col, t: 0, life }); }
let pops = [];   // small floating words: 연쇄 3, 완벽 …
function popText(x, y, txt, col) { pops.push({ x, y, txt, col: col || SEAL, t: 0 }); if (pops.length > 12) pops.shift(); }
function trailFx(x0, y0, x1, y1, w, life, fr = WF2.streak, sheet = "wfx") { const t = { x0, y0, x1, y1, w, t: 0, life, fr, sheet, seed: (Math.random() * 99) | 0 }; trails.push(t); if (trails.length > 48) trails.shift(); return t; }
function stepKegs() { // 화약통: each keg bursts a beat after it was set down
  for (const k of kegs) if (songPos >= k.at) { k.done = true; const r = 100; fireFx(k.x, k.y - 12, r * .8); if (SPR.pfx) addFx("pfx", 2, k.x, k.y - 14, r * 1.5, { life: .55, grow: .35, ay: .5 }); ringFx(k.x, k.y - 12, r, "rgba(60,52,48,.7)", .4); shake = Math.max(shake, 7); Music.sfx("kill");
    for (const e of enemies) if (e.alive && !ghostly(e) && Math.hypot(e.x + e.w / 2 - k.x, e.y + e.h / 2 - k.y + 12) < r + Math.max(e.w, e.h) / 2) { hurtEnemy(e, false); e.stunT = Math.max(e.stunT || 0, .5); } }
  kegs = kegs.filter(k => !k.done);
}
function drawFlame(b) { // a painted flame that flickers, sways and gutters out — each one a little different, glowing on the ground
  if (b.max == null) { b.max = b.life; b.sd = Math.random() * 6.28; b.fl = Math.random() < .5; b.sz = .75 + Math.random() * .5; }
  const k = 1 - b.life / b.max, t = performance.now() / 1000, big = b.big ? 1.5 : 1;
  const life = k < .1 ? k / .1 : 1 - Math.pow((k - .1) / .9, 1.6), h = 30 * big * b.sz * life;
  if (h <= 1) return;
  ctx.save(); ctx.translate(b.x, b.y);
  const g = ctx.createRadialGradient(0, -h * .2, 0, 0, -h * .2, h * .9); g.addColorStop(0, `rgba(240,120,40,${.28 * life})`); g.addColorStop(1, "rgba(240,120,40,0)");   // warm light around it
  ctx.fillStyle = g; ctx.fillRect(-h, -h * 1.1, h * 2, h * 1.4);
  if (b.ground) { ctx.fillStyle = `rgba(30,22,18,${.2 * (1 - k)})`; ctx.beginPath(); ctx.ellipse(0, 0, h * .5, h * .09, 0, 0, 6.283); ctx.fill(); }   // scorch
  ctx.globalAlpha = Math.min(1, b.life * 3) * .95;
  if (SPR.perkfx) { const f = SPR.perkfx.f[PF.fire];
    for (let j = 0; j < 2; j++) { const ph = b.sd + j * 2.1, sy = 1 + Math.sin(t * 17 + ph) * .14, sx = 1 - Math.sin(t * 17 + ph) * .07;
      ctx.save(); ctx.translate((j ? .28 : -.12) * h, 0); ctx.rotate(Math.sin(t * 6 + ph) * .13); ctx.scale(sx * (j ? .7 : 1), sy * (j ? .7 : 1));
      drawSprite("perkfx", PF.fire, 0, 2, h / f.h, b.fl !== !!j, .5, false, 1); ctx.restore(); } }
  ctx.restore(); ctx.globalAlpha = 1;
  if (Math.random() < .1) parts.push({ x: b.x + (Math.random() - .5) * h * .5, y: b.y - h * .8, vx: (Math.random() - .5) * 30, vy: -50 - Math.random() * 60, life: .45, max: .45, c: Math.random() < .5 ? "#ffd27a" : "#e8752a", s: 1.5 });   // embers
}
function drawKegsRings() {
  for (const k of kegs) { ctx.fillStyle = "#5a3a22"; ctx.fillRect(k.x - 7, k.y - 16, 14, 16); ctx.strokeStyle = "#17161a"; ctx.lineWidth = 1.4; ctx.strokeRect(k.x - 7, k.y - 16, 14, 16); ctx.beginPath(); ctx.moveTo(k.x - 7, k.y - 11); ctx.lineTo(k.x + 7, k.y - 11); ctx.moveTo(k.x - 7, k.y - 5); ctx.lineTo(k.x + 7, k.y - 5); ctx.stroke();
    ctx.fillStyle = Math.random() < .5 ? "#ffd27a" : SEAL; ctx.beginPath(); ctx.arc(k.x + 3, k.y - 20 - Math.random() * 3, 2.5, 0, 6.283); ctx.fill(); }   // a lit fuse
  for (const r of rings) { const k = r.t / r.life, rr = r.r * (.35 + .65 * Math.sqrt(k)); ctx.globalAlpha = Math.min(1, (1 - k) * 1.5);
    ctx.strokeStyle = LV.pal.night ? "rgba(236,230,216,.35)" : "rgba(23,22,26,.35)"; ctx.lineWidth = 9 * (1 - k) + 3; ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, 6.283); ctx.stroke();   // an ink shadow so pale rings read on paper
    ctx.strokeStyle = r.col; ctx.lineWidth = 6 * (1 - k) + 1.5; ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function stepGuards(dt) { // 비검's orbiting swords and 흑룡's coil: both cut only what comes close
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
  if (P.orbit) { const o = P.orbit; o.t -= dt; o.a += dt * 9; if (o.t <= 0) P.orbit = null; else for (let i = 0; i < o.n; i++) {
    const a = o.a + i * Math.PI * 2 / o.n, sx = cx + Math.cos(a) * 46, sy = cy + Math.sin(a) * 40;
    if (chr("munyeo")) for (const b of bullets) if (!b.friendly && Math.hypot(b.x - sx, b.y - sy) < 24) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 20, { life: .2 }); }
    for (const e of enemies) if (e.alive && !ghostly(e) && sx > e.x - 10 && sx < e.x + e.w + 10 && sy > e.y - 10 && sy < e.y + e.h + 10 && !(o.hit.get(e.id) > songPos)) {
      o.hit.set(e.id, songPos + .35); hurtEnemy(e, false); addFx("perkfx", PF.splash, sx, sy, 26, { life: .2 });
      ;
      ; } } }
  if (P.coil) { const c = P.coil; c.t -= dt; c.a += dt * 11; if (c.t <= 0) P.coil = null; else {
    for (const e of enemies) if (e.alive && !ghostly(e) && !(c.hit.get(e.id) > songPos) && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < c.r + Math.max(e.w, e.h) / 2) { c.hit.set(e.id, songPos + .3); hurtEnemy(e, false); addFx("perkfx", PF.splash, e.x + e.w / 2, e.y + e.h / 2, 34, { life: .2 }); ; }
    for (const b of bullets) if (!b.friendly && Math.hypot(b.x - cx, b.y - cy) < c.r) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 18, { life: .2 }); }   // shots break on its coils
    if (Math.random() < dt * 40) { const a = c.a + (Math.random() - .5) * .6, rr = c.r * (.7 + Math.random() * .3); parts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * .8, vx: -Math.sin(a) * 90, vy: Math.cos(a) * 90 - 20, life: .45, max: .45, c: Math.random() < .2 ? SEAL : LV.pal.fig, s: 2 + Math.random() * 3 }); }
    ; } }
}
function nearestFoes(x, y, n, r) { return enemies.filter(e => e.alive && !ghostly(e) && Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y) < r).sort((a, b) => Math.hypot(a.x + a.w / 2 - x, a.y + a.h / 2 - y) - Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y)).slice(0, n); }
function shintong(d) { // what an 일격 sets loose
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
  const tipx = cx + d.x * 30, tipy = cy + d.y * 26;
  ;
  ;   // guardian swords circle the swordsman
  ;
  ;
}
// ---------- 번개 돌진 · 공명 effects ----------
function foesInLine(x, y, d, L) { // who stands within reach of a straight line
  return enemies.filter(e => { if (!e.alive || ghostly(e)) return false; const ex = e.x + e.w / 2 - x, ey = e.y + e.h / 2 - y, t = ex * d.x + ey * d.y;
    return t > -10 && t < L && Math.abs(ex * d.y - ey * d.x) < Math.max(e.w, e.h) / 2 + 16; });
}
function boltLunge(d, L, isDash) { // 뇌전검·뇌섬: gone in a flash to the far end of the line, cutting all between
  const m = Math.hypot(d.x, d.y) || 1; d = { x: d.x / m, y: d.y / m };
  const x0 = P.x + P.w / 2, y0 = P.y + P.h / 2; let go = 0;
  for (let t = 6; t <= L; t += 6) { if (rectSolid(P.x + d.x * t, P.y + d.y * t, P.w, P.h)) break; go = t; }
  const hit = foesInLine(x0, y0, d, go + 20);
  if (!isDash && hit.length) { const far = Math.max(...hit.map(e => (e.x + e.w / 2 - x0) * d.x + (e.y + e.h / 2 - y0) * d.y)); go = Math.min(go, far + 46); }   // the blade stops just past the last one
  for (let t = 0; t < go; t += 26) ghosts.push({ x: P.x + d.x * t, y: P.y + d.y * t, face: d.x < 0 ? -1 : 1, age: t / go * .1, life: .3 });
  P.x += d.x * go; P.y += d.y * go; if (Math.abs(d.x) > .2) P.face = Math.sign(d.x);
  P.vx = d.x * maxv() * 1.2; P.vy = Math.min(P.vy, d.y * 300); P.invT = Math.max(P.invT || 0, .28); P.dashHit = new Set();
  const x1 = P.x + P.w / 2, y1 = P.y + P.h / 2;
  boltFx(x0, y0, x1, y1, .45, 24); boltFx(x0, y0 - 6, x1, y1 + 4, .3, 12);
  for (const e of hit) { hurtEnemy(e, false); ;
    addFx("perkfx", PF.spark, e.x + e.w / 2, e.y + e.h / 2, 54, { life: .25, rot: Math.random() * 6.28, grow: .6 });
    boltFx(e.x + e.w / 2, e.y - 40, e.x + e.w / 2, e.y + e.h / 2, .2, 8); }
  for (let i = 0; i < 18; i++) { const t = Math.random(), a = Math.random() * 6.28, v = 60 + Math.random() * 220; parts.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .3, max: .3, c: i % 3 ? "#2a54b4" : "#9fc0ff", s: 1.5 + Math.random() * 2.5 }); }
  flash = Math.max(flash, .07); shake = Math.max(shake, 6); hitstop = Math.max(hitstop, hit.length ? .06 : 0); Music.sfx("strike");
}
let bolts = [];
function boltFx(x0, y0, x1, y1, life, w) { // a jagged lightning stroke, re-forked every frame it lives
  bolts.push({ x0, y0, x1, y1, t: 0, life, w });
}
// painted guide strokes (guide sheet): 0-2 indigo dash/line/ring, 3-5 vermilion, 6 wash, 7 black line, 8 black ring
const nightNow = () => !!(LV && LV.pal.night) || !!(P && (P.focus || killCam > 0) && state === "play");
const GSET = col => col === SEAL ? [3, 4, 5, false] : col === JJOK ? [0, 1, 2, nightNow()] : [7, 7, 8, nightNow()];   // on the inverted night the indigo and black strokes turn pale
function guideSprite(i, x, y, ang, w, h, inv) { const S = SPR.guide, f = S.f[i]; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.drawImage(inv && S.inv ? S.inv : S.img, f.x, f.y, f.w, f.h, -w / 2, -h / 2, w, h); ctx.restore(); }
// ---------- brush strokes for guide lines: ink dabs, dry-brush lines and rings instead of clean vector marks ----------
const hrnd = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };   // stable noise, so strokes do not shimmer
function inkDab(x, y, ang, len, w, col) { // one press of a dry brush: a wet core and bristle hairs that split and run out at different lengths
  const sd = (x * 13.7 + y * 7.1) | 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-len * .45, 0); ctx.quadraticCurveTo(-len * .1, -w * .38, len * .3, -w * .08); ctx.quadraticCurveTo(-len * .05, w * .32, -len * .45, 0); ctx.fill();   // the wet heart of the stroke
  const a0 = ctx.globalAlpha;
  for (let k = 0; k < 5; k++) { const o = (k - 2) * w * .2 + (hrnd(sd, k) - .5) * w * .1, st = -len * (.5 - hrnd(sd, k + 9) * .25), en = len * (.15 + hrnd(sd, k + 3) * .4);
    ctx.globalAlpha = a0 * (.45 + hrnd(sd, k + 6) * .5); ctx.lineWidth = w * (.12 + hrnd(sd, k + 2) * .12); ctx.beginPath(); ctx.moveTo(st, o * .7); ctx.quadraticCurveTo((st + en) / 2, o, en, o * 1.25); ctx.stroke(); }   // bristles
  ctx.restore(); ctx.globalAlpha = a0;
}
function brushLine(x0, y0, x1, y1, col, w, dashed, seed = 0) { // dashed: a trail of separate dabs; solid: overlapping dabs with dry gaps at the tail
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 2) return;
  if (SPR.guide) { const [di, li, , inv] = GSET(col), a = Math.atan2(dy, dx);   // the painted strokes
    if (dashed) { const f = SPR.guide.f[di], len = w * 6.5, n = Math.max(1, Math.floor(L / (len * 1.3))); for (let i = 0; i < n; i++) { const t = (i + .5) / n, k = .85 + hrnd(seed + i, 2) * .3; guideSprite(di, x0 + dx * t, y0 + dy * t, a + (hrnd(seed + i, 1) - .5) * .1, len * k, len * k * f.h / f.w, inv); } }
    else guideSprite(li, (x0 + x1) / 2, (y0 + y1) / 2, a, L, w * 2.8, inv);
    return; } const a = Math.atan2(dy, dx), step = dashed ? 19 : 8, n = Math.max(2, Math.floor(L / step)), a0 = ctx.globalAlpha;
  for (let i = 0; i <= n; i++) { const t = i / n, r1 = hrnd(seed + i, 1), r2 = hrnd(seed + i, 2); if (!dashed && t > .75 && r1 < (t - .75) * 2.4) continue;   // the brush runs dry toward the end
    const taper = dashed ? 1 - t * .45 : Math.min(1, t * 6, (1 - t) * 3 + .35), off = (r2 - .5) * w * .5;
    ctx.globalAlpha = a0 * (dashed ? (.75 + r1 * .25) : (.55 + r1 * .35));
    inkDab(x0 + dx * t - Math.sin(a) * off, y0 + dy * t + Math.cos(a) * off, a + (r2 - .5) * .18, (dashed ? 15 : 14) * (.8 + r1 * .5), w * taper * (.85 + r2 * .5), col); }
  ctx.globalAlpha = a0;
}
function inkRing(x, y, r, w, seed) { // a thin dry-brush circle: a few black hairs that never quite close, a red thread laid inside them
  const a0 = ctx.globalAlpha, st = hrnd(seed, 1) * 6.28; ctx.lineCap = "round"; ctx.strokeStyle = "#17161a";
  for (let k = 0; k < 4; k++) { ctx.globalAlpha = a0 * (.45 + hrnd(seed + k, 5) * .5); ctx.lineWidth = w * (.28 + hrnd(seed + k, 6) * .22);
    ctx.beginPath(); ctx.arc(x, y, r + (k - 1.5) * w * .3, st + hrnd(seed + k, 3) * .35, st + 6.0 - hrnd(seed + k, 4) * .45); ctx.stroke(); }
  ctx.globalAlpha = a0; ctx.strokeStyle = SEAL; ctx.lineWidth = w * .42; ctx.beginPath(); ctx.arc(x, y, Math.max(1, r - w * .55), st + .5, st + 5.9); ctx.stroke(); ctx.lineCap = "butt";
}
function inkLine(x0, y0, x1, y1, w, seed) { // the same brush drawn straight: black hairs either side of a red thread
  const a0 = ctx.globalAlpha, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; ctx.lineCap = "round"; ctx.strokeStyle = "#17161a";
  for (let k = 0; k < 4; k++) { const o = (k - 1.5) * w * .3, s0 = hrnd(seed + k, 3) * .06, s1 = 1 - hrnd(seed + k, 4) * .08; ctx.globalAlpha = a0 * (.45 + hrnd(seed + k, 5) * .5); ctx.lineWidth = w * (.28 + hrnd(seed + k, 6) * .22);
    ctx.beginPath(); ctx.moveTo(x0 + dx * s0 + nx * o, y0 + dy * s0 + ny * o); ctx.lineTo(x0 + dx * s1 + nx * o, y0 + dy * s1 + ny * o); ctx.stroke(); }
  ctx.globalAlpha = a0; ctx.strokeStyle = SEAL; ctx.lineWidth = w * .42; ctx.beginPath(); ctx.moveTo(x0 + dx * .04, y0 + dy * .04); ctx.lineTo(x0 + dx * .97, y0 + dy * .97); ctx.stroke(); ctx.lineCap = "butt";
}
function brushRing(x, y, r, col, w, seed = 0) { // a circle swept by a dry brush: parallel hairs that start and stop raggedly, never quite closing
  if (SPR.guide) { const [, , ri, inv] = GSET(col); guideSprite(ri, x, y, hrnd(seed, 1) * 6.28, r * 2.3, r * 2.3, inv); return; }
  const a0 = ctx.globalAlpha; ctx.strokeStyle = col; ctx.lineCap = "round";
  const st = hrnd(seed, 1) * 6.28, span = 5.3 + hrnd(seed, 2) * .6;
  for (let k = 0; k < 6; k++) { const rr = r + (k - 2.5) * w * .32, s0 = st + hrnd(seed + k, 3) * .5, s1 = st + span - hrnd(seed + k, 4) * 1.1;
    ctx.globalAlpha = a0 * (.4 + hrnd(seed + k, 5) * .55); ctx.lineWidth = w * (.22 + hrnd(seed + k, 6) * .2); ctx.beginPath(); ctx.arc(x, y, rr, s0, s1); ctx.stroke(); }
  ctx.globalAlpha = a0 * .85; ctx.lineWidth = w * .55; ctx.beginPath(); ctx.arc(x, y, r, st + .2, st + span * .55); ctx.stroke();   // the loaded first half of the sweep
  ctx.globalAlpha = a0; ctx.lineCap = "butt";
}
function inkWash(x, y, w, h, col, seed = 0) { // a zone washed in with horizontal dry strokes, ragged at the edges
  if (SPR.guide) { guideSprite(6, x + w / 2, y + h / 2, 0, w * 1.08, h * 1.15, false); return; }
  const n = Math.max(2, Math.round(h / 9)), a0 = ctx.globalAlpha; ctx.fillStyle = col;
  for (let i = 0; i < n; i++) { const yy = y + (i + .5) * h / n, l = x + hrnd(seed + i, 1) * w * .08, r = x + w - hrnd(seed + i, 2) * w * .1, th = h / n * (1.1 + hrnd(seed + i, 3) * .5);
    ctx.globalAlpha = a0 * (.7 + hrnd(seed + i, 4) * .3); ctx.beginPath(); ctx.moveTo(l, yy - th * .3); ctx.quadraticCurveTo((l + r) / 2, yy - th * .62, r, yy - th * .15); ctx.quadraticCurveTo(r - w * .05, yy + th * .5, l + w * .04, yy + th * .45); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = a0;
}
function drawBolts() {
  if (!bolts.length) return;
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const b of bolts) { const k = 1 - b.t / b.life, len = Math.hypot(b.x1 - b.x0, b.y1 - b.y0), n = Math.max(3, Math.round(len / 18)), nx = -(b.y1 - b.y0) / (len || 1), ny = (b.x1 - b.x0) / (len || 1);
    const pts = [[b.x0, b.y0]]; for (let i = 1; i < n; i++) { const t = i / n, j = (Math.random() - .5) * b.w; pts.push([b.x0 + (b.x1 - b.x0) * t + nx * j, b.y0 + (b.y1 - b.y0) * t + ny * j]); } pts.push([b.x1, b.y1]);
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); };
    const dark = LV && LV.pal.night;   // on paper the bolt is ink-blue with a white core; at night it glows
    path(); ctx.strokeStyle = dark ? `rgba(120,160,255,${.35 * k})` : `rgba(20,36,90,${.28 * k})`; ctx.lineWidth = 14 * k + 3; ctx.stroke();
    path(); ctx.strokeStyle = dark ? `rgba(170,200,255,${.9 * k})` : `rgba(42,84,180,${.95 * k})`; ctx.lineWidth = 5 * k + 1.5; ctx.stroke();
    path(); ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 1.8 * k + .6; ctx.stroke();
    if (Math.random() < .5) { const q = pts[(Math.random() * pts.length) | 0], a = Math.random() * 6.28, r = 14 + Math.random() * 18; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r); ctx.strokeStyle = `rgba(42,84,180,${.8 * k})`; ctx.lineWidth = 1.6; ctx.stroke(); } }   // stray forks
  ctx.restore();
}
function fireFx(x, y, r) { // 화 공명: a ring of flame thrown out from where the dash stopped
  addFx("perkfx", PF.bloom, x, y, r * 1.6, { life: .4, grow: .6, a: .55 });
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; bullets.push({ x: x + Math.cos(a) * r * .35, y: y + Math.sin(a) * r * .25, vx: Math.cos(a) * r * 2.2, vy: Math.sin(a) * r * 1.4 - 40, friendly: true, fire: true, pierce: true, r: 10, life: .38, noHit: true, owner: null }); }
  for (let i = 0; i < 22; i++) { const a = Math.random() * 6.28, v = 80 + Math.random() * 260; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: .5, max: .5, c: i % 3 ? "#e8752a" : "#ffd27a", s: 2 + Math.random() * 3 }); }
}
function shadeFx(x, y, n) { // 영 공명: smoke of ink drifting off a shadow
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 30 + Math.random() * 120; parts.push({ x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 18, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50, life: .6, max: .6, c: i % 4 ? "rgba(40,34,52,.55)" : "rgba(120,100,150,.6)", s: 4 + Math.random() * 6 }); }
}
function resDashEnd() {
  const x = P.x + P.w / 2, y = P.y + P.h / 2;
  ;
  if (res("hwa", 4)) { const r = res("hwa", 6) ? 120 : 75; fireFx(x, y, r); shake = Math.max(shake, 4); Music.sfx("kill");
    for (const e of enemies) if (e.alive && !ghostly(e) && Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y) < r + Math.max(e.w, e.h) / 2) hurtEnemy(e, res("hwa", 6) && e.type !== "b"); }
  if (res("yeong", 2)) P.invT = Math.max(P.invT || 0, .3);
  if (res("yeong", 4)) { clones.push({ x, y: P.y + P.h, face: P.face, t: .3 }); shadeFx(x, y, 10); }
}
function resKill(e) {
  const x = e.x + e.w / 2, y = e.y + e.h / 2;
  if (res("hyeol", 2) && (run.hk = (run.hk || 0) + 1) % 15 === 0 && run.breath < breathCap()) { run.breath++; setHud(); toast("혈 공명 · 숨 하나를 되찾았다"); }
  if (res("hyeol", 4)) { const ts = nearestFoes(x, y, res("hyeol", 6) ? 3 : 1, 300).filter(o => o !== e);   // the blood flies on as thorns
    for (const t of ts) { const dx = t.x + t.w / 2 - x, dy = t.y + t.h / 2 - y, dd = Math.hypot(dx, dy) || 1; bullets.push({ x, y, vx: dx / dd * 950, vy: dy / dd * 950, friendly: true, thorn: true, r: 6, life: .5, owner: null }); } }
  if (res("hyeol", 6)) P.invT = Math.max(P.invT || 0, .3);
}
function resFx(k, line) { const S = SCHOOLS[k]; addFx("hud", HUD.spark, P.x + P.w / 2, P.y + P.h / 2, 90, { life: .4 }); toast(`${S.name} 공명 · ${line}`); }
function flow(kind) { // 기세: different moves chained close together build up momentum
  if (true || P.flowReady) return;
  const gap = songPos - (P.flowAt ?? -9);
  if (gap > 1.5) P.flowN = 0;   // a pause of more than a breath breaks the chain
  if (kind !== P.flowKind) P.flowN = (P.flowN || 0) + 1;
  P.flowKind = kind; P.flowAt = songPos;
  if (P.flowN >= (4)) { P.flowReady = true; ringFx(P.x + P.w / 2, P.y + P.h / 2, 70, "rgba(195,22,28,.85)", .4); Music.sfx("lantern"); }
}
function findHook() {
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2; let best = null, bs = 1e9;
  if (has("d_sasl")) for (const e of enemies) { if (!e.alive || ghostly(e)) continue; const ex = e.x + e.w / 2, ey = e.y + e.h / 2, d = Math.hypot(ex - cx, ey - cy);
    if (d > HOOK_R || d < 40 || !los(cx, cy, ex, ey)) continue; const sc = d - 120; if (sc < bs) { bs = sc; best = { x: ex, y: ey, enemy: e }; } }
  for (const p of LV.points) {
    const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
    if (d > HOOK_R * (1) * (res("pung", 2) ? 1.25 : 1) || d < 24 || !los(cx, cy, p.x, p.y)) continue;
    const s = d - (dx * P.face > 0 ? 70 : 0) - (dy < 0 ? 40 : 0);
    if (s < bs) { bs = s; best = p; }
  }
  return best;
}
function frameInput(rdt) {
  if (bossIntro || roar) { press.jump = press.dash = press.hook = press.drum = 0; slashReq = null; return; }   // the entrance card and the roar hold the hands
  if (press.drum) { press.drum = 0;   // 천고난무: loosed when you choose, once the drum is full
    if (mode !== "tutorial" && (run.qi || 0) >= 100 && !chungoFx) { if (!chungo()) toast("벨 적이 가까이 없다"); } }
  if (press.jump && P.onGround && axis().y > .5 && onLedge(P)) { P.dropT = .25; P.y += 3; P.onGround = false; press.jump = 0; } // down + jump: drop through a ledge
  if (press.jump) P.jumpBuf = 0.18;
  if (slashReq) { doSlash(slashReq); slashReq = null; }
  if (press.hook && hookCand && P.hookCd <= 0 && hookCand.enemy) { // 연사슬: the line hooks a foe and drags it in
    const e = hookCand.enemy, dx = Math.sign(e.x + e.w / 2 - P.x - P.w / 2) || 1; moveX(e, -dx * Math.min(Math.abs(e.x + e.w / 2 - P.x - P.w / 2) - 30, 260)); e.stunT = Math.max(e.stunT || 0, e.type === "b" ? .3 : 1);
    hurtEnemy(e, false); beams.push({ x0: P.x + P.w / 2, y0: P.y + 12, x1: e.x + e.w / 2, y1: e.y + e.h / 2, t: 0, life: .2 }); P.hookCd = .45; Music.sfx("hook"); press.hook = 0; }
  if (press.hook && hookCand && P.hookCd <= 0 && false) { // 연발판: the kite is a springboard
    P.vy = -940; P.vx *= .6; P.airDash = Math.max(P.airDash, baseAir()); P.djN = 0; P.hookCd = .3; heroFx("wind", hookCand.x, hookCand.y, 1); Music.sfx("hook"); press.hook = 0; }
  if (press.hook && hookCand && P.hookCd <= 0) { // 연: a sharp kick toward the kite and up — then the swordsman is free again
    const cx = P.x + P.w / 2, cy = P.y + P.h / 2, dx = hookCand.x - cx, dy = hookCand.y - cy, d = Math.hypot(dx, dy) || 1, lb = (1) * (1);
    P.dashT = 0; run.hooked = true; flow("hook"); P.focus = false; Music.muffle(false); Music.sfx("hook"); heroFx("wind", hookCand.x, hookCand.y, 1);
    P.vx = dx / d * 620 * lb; P.vy = Math.min(dy / d * 620, 0) * lb - 560 * lb; P.onGround = false; P.coyote = 0; P.jumpBuf = 0;
    P.kiteFlash = { x0: cx, y0: cy, x1: hookCand.x, y1: hookCand.y, t: .18 };   // the string snaps taut for a blink
    if (has("d_kite")) P.kiteAim = .12;
    ; P.hookCd = .35; P.airDash = baseAir(); ;
    ;
    if (Math.abs(P.vx) > 40) P.face = Math.sign(P.vx);
    ; }
  if (press.dash && P.returnT > 0 && !P.focus) {   // 회선: back along the line, cutting again
    const cx = P.x + P.w / 2, cy = P.y + P.h / 2, dx = P.returnTo.x - cx, dy = P.returnTo.y - cy, L = Math.hypot(dx, dy);
    if (L > 20) { P.returnT = 0; P.airDash++; P.aimDash = true; P.retDash = true; P.aimedUntil = songPos + .45;
      if (startDash({ x: dx / L, y: dy / L }, true)) { P.dashT = Math.min(.3, L / DASHV); ringFx(cx, cy, 50, "rgba(195,22,28,.8)", .25); } else { P.aimDash = false; P.retDash = false; }
      press.dash = 0; } }
  if (press.dash && !oath("hyeon") && !P.focus) {
    if (P.dashCd <= 0 && (P.onGround || P.hook || P.airDash > 0 || (P.wall && has("d_wall"))) && ((P.ki || 0) > .06 || mode === "tutorial")) { P.focus = true; P.focusT = 0; P.focusGround = P.onGround || !!P.wall; Music.muffle(true); }   // tap: dash now · hold: slow and aim
    press.dash = 0;
  }
  if (P.kiteFlash && (P.kiteFlash.t -= rdt) <= 0) P.kiteFlash = null;
  if (P.kiteAim > 0 && (P.kiteAim -= rdt) <= 0 && !P.onGround && !P.focus) { P.focus = true; P.focusTap = true; P.focusT = 0; Music.muffle(true); }   // 연 조준
  if (!P.focus && P.onGround) P.ki = Math.min(1, (P.ki || 0) + rdt * .9 * (1 + treeStat("ki")));   // 기력 comes back with the feet on the ground
  if (P.focus && mode !== "tutorial" && P.focusT > TAP_T) P.ki = Math.max(0, (P.ki || 0) - rdt / (has("d_jeong") ? 2.4 : 1.6) * (has("hw_c3") ? 2 : 1));   // and drains while time is held
  if (P.focus) { P.focusT += rdt;
    const release = P.focusTap ? press.dash : !held.dash, grounded = P.onGround && !P.focusGround;
    if (release || (P.focusT > focusLen() && !(P.iaiHold && wk() === "baldo")) || grounded || (P.ki <= 0 && mode !== "tutorial")) {   // a 발도 draw held in 무아경 keeps the world slow (기력 still drains)
 const tap = !P.focusTap && P.focusT < TAP_T;   // a tap is a plain quick dash: no slow, no 일격, shots still hit
      P.focus = false; P.focusTap = false; P.focusGround = false; Music.muffle(false); P.tapDash = tap; if (!tap) P.aimedUntil = songPos + .45;
      P.beatDash = false; P.cloudT = 0; if (!tap && !P.onGround) P.aimChain = (P.aimChain || 0) + 1;   // shorter next time, until the feet touch ground
      if (!tap && wrule() === "ssang" && (P.gise || 0) >= 3 && songPos - (P.giseAt ?? -9) < 3) { P.giseDash = P.gise; P.gise = 0; if (!P.onGround) P.airDash++; ringFx(P.x + P.w / 2, P.y + P.h / 2, 60, "rgba(195,22,28,.9)", .3); }   // 기세: the built-up momentum rides the dash
      P.chargeK = has("d_charge") && P.focusT < .35 ? .6 : 1; P.chargeFull = has("d_charge") && P.focusT >= .8;   // 축기: full → a wave flies on; too early → a short dash
      if (P.chargeFull) { ringFx(P.x + P.w / 2, P.y + P.h / 2, 70, "rgba(195,22,28,.9)", .3); shake = Math.max(shake, 5); }
      {
      if (!tap && wk() === "baldo" && !WEAPONS[wpn()].bow && P.focusT >= iaiF()) doSlash({ dir: null, ts: performance.now(), dash: false, iai: P.focusT, fromMua: true });   // 발도: 무아경 itself is the draw — held long enough, the release is an 일도 where you aim
      else if (chr("munyeo") && has("m_talis")) talismans(aimDir());
      if (isGun() && gunShot(tap)) {}
      else if (kanLunge(aimDir(), true)) {}
      else if (!(!tap && has("d_sunbo") && sunbo())) { P.aimDash = true; if (!startDash(null, true)) P.aimDash = false; } } } }
  press.jump = press.dash = press.hook = 0;
  P.jumpBuf = Math.max(0, P.jumpBuf - rdt);
}
const approach = (v, t, a) => v < t ? Math.min(t, v + a) : Math.max(t, v - a);
function stepPlayer(dt) {
  const a = axis(), ix = a.x > 0.3 ? 1 : a.x < -0.3 ? -1 : 0;
  if (P.twinT > 0 && (P.twinT -= dt) <= 0) { P.hitSet = new Set(); P.slashT = Math.max(P.slashT, .06); addFx("slashfx", SF.arc, P.x + P.w / 2 + P.slashDir.x * 26, P.y + P.h / 2 + P.slashDir.y * 20, 46, { life: .16, flip: P.face < 0, ay: .5 }); }   // 쌍수: the second blade
  if (frenzy() && Math.random() < dt * 14) addFx("gfx", 8, P.x + P.w / 2 + (Math.random() - .5) * 16, P.y + P.h + 2, 26, { life: .3, grow: .2, ay: 1, a: .7 });   // 폭주: red ink boils at the feet
  P.renT = Math.max(0, (P.renT || 0) - dt);
  if (has("bd_b1") && (P.iaiHold || (P.focus && wk() === "baldo"))) for (const b of bullets) if (!b.friendly && b.life > 0 && Math.abs(b.y - P.y - P.h / 2) < 34 && (b.x - P.x - P.w / 2) * P.face > 0 && Math.abs(b.x - P.x - P.w / 2) < 46) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 20, { life: .2 }); Music.sfx("clang"); }   // 정좌
  if (has("cj_b2") && P.onGround && P.focus) for (const b of bullets) if (!b.friendly && b.life > 0 && (b.x - P.x - P.w / 2) * P.face > 0 && Math.hypot(b.x - P.x - P.w / 2, b.y - P.y - P.h / 2) < 52) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 20, { life: .2 }); }   // 철갑
  stepGun(dt); stepEdge(dt); stepMom(dt); P.counterT = Math.max(0, (P.counterT || 0) - dt); P.slamLandT = Math.max(0, (P.slamLandT || 0) - dt);
  P.invT = Math.max(0, (P.invT || 0) - dt); P.dashInvT = 0; P.offBal = Math.max(0, (P.offBal || 0) - dt); P.returnT = Math.max(0, (P.returnT || 0) - dt); P.floatT = Math.max(0, (P.floatT || 0) - dt); for (const g of LV.targets) { if (g.t > 0) g.t -= dt;
    else if (!META.firsts.target && mode !== "tutorial" && Math.hypot(g.x - P.x, g.y - P.y) < 260) { META.firsts.target = 1; saveMeta(); toast("과녁 · 대시로 베면 공중 대시가 다시 찬다"); } }
  if (P.echo && (P.echo.t -= dt) <= 0) { const o = P.echo, dx = o.x1 - o.x0, dy = o.y1 - o.y0, L = Math.hypot(dx, dy) || 1, d = { x: dx / L, y: dy / L }; P.echo = null;   // the soul runs the same line
    for (const e of foesInLine(o.x0, o.y0, d, L)) { hurtEnemy(e, e.type !== "b"); if (e.alive) e.openT = songPos + 1; } beams.push({ x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1, t: 0, life: .3, red: true, w: 1.6 });
    if (SPR.mfx) addFx("mfx", 8, o.x0, o.y0, 60, { life: .3, ay: .5, a: .7 }); }
  if (P.wardT > 0) { P.wardT -= dt; const cx = P.x + P.w / 2, cy = P.y + P.h / 2;   // 검막: shots that come near are cut out of the air
    for (const b of bullets) if (!b.friendly && b.life > 0 && Math.hypot(b.x - cx, b.y - cy) < 95) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 18, { life: .2 }); }
    if ((P.wardFx = (P.wardFx || 0) - dt) <= 0) { P.wardFx = .3; addFx("slashfx", SF.guard, cx, cy, 120, { life: .3, grow: .2, a: .55 }); } }
  stepGuards(dt); stepKegs();
  if (P.dashT > 0 && !bossAlive()) for (const d of drumsInPlay()) if (Math.abs(P.x + P.w / 2 - d.x) < 24 && P.y + P.h > d.y - d.h && P.y < d.y) cutDrum(d); P.landT = Math.max(0, (P.landT || 0) - dt); P.dropT = Math.max(0, (P.dropT || 0) - dt); P.dashCd = Math.max(0, P.dashCd - dt); if (P.dashCd <= 0) P.spare = true; P.slashCd = Math.max(0, P.slashCd - dt); P.hookCd = Math.max(0, P.hookCd - dt); P.wallLock = Math.max(0, P.wallLock - dt);
  if (P.hook) {
    const cx = P.x + P.w / 2, cy = P.y + P.h / 2, dx = P.hook.x - cx, dy = P.hook.y - cy, d = Math.hypot(dx, dy);
    if (d < 30) { const lb = (1) * (1); ; P.vx = dx / d * 700 * lb; P.vy = dy / d * 700 * lb - 260 * lb; P.hook = null; P.hookCd = 0.25; P.airDash = baseAir(); ;
      ; if (Math.abs(P.vx) > 40) P.face = Math.sign(P.vx); }
    else {
      P.vx = dx / d * 1050; P.vy = dy / d * 1050;
      if (moveX(P, P.vx * dt) | moveY(P, P.vy * dt)) { P.hook = null; P.vx *= 0.3; P.vy *= 0.3; }
      ghost(0.02); return;
    }
  }
  if (P.focus && (has("d_hover") || (P.focusGround && !isGun()))) { P.vx = 0; P.vy = 0; }   // 체공
  if (P.dashT > 0) {
    P.dashT -= dt; P.vx = P.dashDir.x * DASHV; P.vy = P.dashDir.y * DASHV;
    P.trailD = (P.trailD || 0) + DASHV * dt;
    if (P.trailD > (44)) { P.trailD = 0; const tx = P.x + P.w / 2, ty = P.y + P.h / 2;
      ;
      ;
      ; }
    for (const g of LV.targets) if (g.t <= 0 && Math.hypot(g.x - P.x - P.w / 2, g.y - P.y - P.h / 2) < 30) breakTarget(g);
    if (P.aimDash && has("m_wind") && (P.windD = (P.windD || 0) + DASHV * dt) > 36) { P.windD = 0;   // 회오리 길
      bullets.push({ x: P.x + P.w / 2, y: P.y + P.h / 2, vx: 0, vy: 0, friendly: true, tornado: true, r: 16, pierce: true, life: .8, owner: null }); }
    if (P.trail) { P.trail.x1 = P.x + P.w / 2; P.trail.y1 = P.y + P.h / 2; P.trail.t = 0; }   // 일도: the line follows the draw
    if (P.iaiCut) for (const b of bullets) if (!b.friendly && b.life > 0 && Math.hypot(b.x - P.x - P.w / 2, b.y - P.y - P.h / 2) < 44) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 20, { life: .2 }); }
    if (P.aimDash && P.giseDash >= 5 && has("ss_b3")) { const cx = P.x + P.w / 2, cy = P.y + P.h / 2; if (!P.yongArt) { P.yongArt = true; ougiArt(["ogA", 4], cx, P.y + P.h, 170, { life: .6, ay: 1 }); } for (const o of enemies) if (o.alive && o.type !== "b" && Math.hypot(o.x + o.w / 2 - cx, o.y + o.h / 2 - cy) < 150) { moveX(o, Math.sign(cx - o.x - o.w / 2) * 6); if (Math.hypot(o.x + o.w / 2 - cx, o.y + o.h / 2 - cy) < 50) hurtEnemy(o, true); }
      if ((P.ykT = (P.ykT || 0) - dt) <= 0) { P.ykT = .06; addFx("swm", SWM.spin, cx, cy + 10, 60, { life: .25, a: .5 }); } }   // 용권
    if (P.aimDash) { const cx = P.x + P.w / 2, cy = P.y + P.h / 2, wide = (P.beatDash ? 90 : P.giseDash ? 75 : has("d_far") ? 60 : 30) * (has("d_pajuk") ? 1 + .2 * Math.min(5, P.chain || 0) : 1) * (has("d_hyeol") && run && mode !== "tutorial" ? (run.breath <= 1 ? 1.8 : run.breath <= 2 ? 1.4 : 1) : 1);
      for (const e of enemies) if (e.alive && !ghostly(e) && !P.dashHit.has(e.id) && Math.abs(e.x + e.w / 2 - cx) < wide + e.w / 2 && Math.abs(e.y + e.h / 2 - cy) < wide + e.h / 2) { P.dashHit.add(e.id); dashHurt(e); }   // 관통: a wider cut
      if (has("d_dangong")) for (const b of bullets) if (!b.friendly && b.life > 0 && Math.hypot(b.x - cx, b.y - cy) < 46) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 20, { life: .2 }); }   // 단공: the cut takes even the red shots
      if (has("d_reflect") || chr("munyeo")) for (const b of bullets) if (!b.friendly && !b.noReflect && b.life > 0 && Math.hypot(b.x - cx, b.y - cy) < 44) {   // 역탄: the shot turns on its shooter
        const o = b.owner, sp = Math.max(420, Math.hypot(b.vx, b.vy) * 1.4); b.friendly = true; b.pierce = true; b.life = 3; b.g = 0; b.home = 0; b.boom = 0;
        if (o && o.alive) { const dx = o.x + o.w / 2 - b.x, dy = o.y + o.h / 2 - b.y, L = Math.hypot(dx, dy) || 1; b.vx = dx / L * sp; b.vy = dy / L * sp; } else { const L = Math.hypot(b.vx, b.vy) || 1; b.vx = -b.vx / L * sp; b.vy = -b.vy / L * sp; }
        addFx("hud", HUD.spark, b.x, b.y, 22, { life: .2 }); } }
    const pb = P.y + P.h; let hx = moveX(P, P.vx * dt), hy = moveY(P, P.vy * dt); ghost(0.012);
    if (!hy && P.vy > 0 && !(P.dropT > 0)) { const top = ledgeBelow(P, pb); if (top != null) { P.y = top - P.h - .001; hy = true; } }
    ;
    if ((hx || hy) && P.aimDash && has("d_bounce") && !P.bounced && P.dashT > 0) {   // 반섬: one ricochet off the wall, the blade still out
      P.bounced = true; P.dashDir = { x: hx ? -P.dashDir.x : P.dashDir.x, y: hy ? -P.dashDir.y : P.dashDir.y }; P.dashT = Math.max(P.dashT, .1); if (Math.abs(P.dashDir.x) > .2) P.face = Math.sign(P.dashDir.x);
      addFx("hud", HUD.spark, P.x + P.w / 2, P.y + P.h / 2, 40, { life: .25 }); Music.sfx("clang"); shake = Math.max(shake, 3); hx = hy = false; }
    if (P.dashT <= 0 || hx || hy) { P.dashT = 0; P.trail = null; P.vx = P.dashDir.x * maxv() * 1.35; P.vy = P.dashDir.y * 380;
      if (P.aimDash && chr("munyeo")) { const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
        if (has("m_bell")) { for (const e of nearestFoes(cx, cy, 9, 110)) { e.stunT = Math.max(e.stunT || 0, e.type === "b" ? .25 : 1); P.ki = Math.min(1, (P.ki || 0) + .15); } ringFx(cx, cy, 110, "rgba(217,165,32,.85)", .4); Music.sfx("lantern"); }   // 방울 굿
        if (has("m_moon")) { for (const e of nearestFoes(cx, cy, 9, 90)) hurtEnemy(e, false); let mn = 0; for (const b of bullets) if (!b.friendly && b.life > 0 && Math.hypot(b.x - cx, b.y - cy) < 90) { b.life = 0; mn++; } if (mn) chainAdd(Math.min(3, mn));   // 달맞이
          addFx("slashfx", SF.moon, cx, cy, 180, { life: .35, grow: .3, a: .8 }); }
        if (has("m_float")) P.floatT = .7;   // 강신
        if (has("m_soul") && P.dashFrom) P.echo = { x0: P.dashFrom.x, y0: P.dashFrom.y - P.h / 2, x1: cx, y1: cy, t: .35 }; }   // 넋 분신
      if (P.aimDash && P.chargeFull) { const d = P.dashDir, a = Math.atan2(d.y, d.x);   // 축기: the stored breath leaves the blade as a crescent
        bullets.push({ x: P.x + P.w / 2 + d.x * 20, y: P.y + P.h / 2 + d.y * 20, vx: d.x * 900, vy: d.y * 900, ang: a, friendly: true, moon: true, strike: true, pierce: true, r: 22, life: .38, owner: null }); Music.sfx("slash"); }
      P.chargeFull = false;
      if (P.aimDash && false && !P.retDash && P.dashHit.size && P.dashFrom) { P.returnT = .6; P.returnTo = { x: P.dashFrom.x, y: P.dashFrom.y - P.h / 2 }; } P.retDash = false; P.chargeK = 1;
      if (P.aimDash && has("hw_b3")) { (P.marks = P.marks || []).push({ x: P.x + P.w / 2, y: P.y + P.h / 2 }); addFx("wfx", WF2.mark, P.x + P.w / 2, P.y + P.h / 2, 26, { life: 3, grow: 0 });   // 분신난무
        if (P.marks.length >= 3) { const m = P.marks; P.marks = []; for (let i = 0; i < 3; i++) { const a = m[i], b = m[(i + 1) % 3], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; trailFx(a.x, a.y, b.x, b.y, 6, .5, WF2.iai); for (const o of foesInLine(a.x, a.y, { x: dx / L, y: dy / L }, L)) hurtEnemy(o, o.type !== "b" ? true : 2); }
          flash = .2; shake = 12; Music.sfx("strike"); ougiArt(["ogA", 1], (m[0].x + m[1].x + m[2].x) / 3, (m[0].y + m[1].y + m[2].y) / 3, 220, { life: .6 }); } }
      if (P.iaiCut && has("bd_a3") && P.iaiDir) { const d = P.iaiDir, x = P.x + P.w / 2, y = P.y + P.h / 2; trailFx(x, y, x + d.x * 620, y + d.y * 620, 10, .5, WF2.iai); ougiArt(["ogA", 9], x + d.x * 300, y + d.y * 300, 60, { life: .5, rot: Math.atan2(d.y, Math.abs(d.x)) * Math.sign(d.x || 1), flip: d.x < 0 }); for (const o of foesInLine(x, y, d, 620)) hurtEnemy(o, o.type !== "b" ? true : 2); shake = 12; }   // 무공참
      if (P.iaiCut || P.iaiPlain) P.renT = has("bd_c2") ? .5 : 0; P.iaiPlain = false;
      if (P.aimDash && frenzy() && has("ss_a3") && (P.ranmu ?? 0) < 2) { const t = nearestFoes(P.x + P.w / 2, P.y + P.h / 2, 1, 280)[0]; if (t) { P.ranmu = (P.ranmu || 0) + 1; ougiArt(["ogA", 3], t.x + t.w / 2, t.y + t.h / 2, 120, { life: .4, rot: Math.random() * .6 - .3 }); const dx = t.x + t.w / 2 - P.x - P.w / 2, dy = t.y + t.h / 2 - P.y - P.h / 2, L = Math.hypot(dx, dy) || 1; P.aimDash = true; startDash({ x: dx / L, y: dy / L }, true); P.aimDash = true; return; } } P.ranmu = 0;   // 난무
      P.iaiCut = false; P.bayoLunge = false; P.ram = false; P.flowDash = false; P.aimDash = false; P.beatDash = false; P.tapDash = false; P.giseDash = 0; resDashEnd();
      if (P.reAim && !P.onGround && P.airDash > 0) { P.focus = true; P.focusTap = true; P.focusT = 0; Music.muffle(true); } P.reAim = false;   // 순환
      ;
      ; }
  } else {
    if (P.wallLock <= 0) {
      if (P.onGround) P.vx = (ix && Math.sign(P.vx) === ix && Math.abs(P.vx) > maxv()) ? approach(P.vx, ix * maxv(), 1400 * dt) : approach(P.vx, ix * maxv(), (ix ? 2600 : 2400) * dt);
      else if (ix) P.vx = (Math.sign(P.vx) === ix && Math.abs(P.vx) > maxv()) ? approach(P.vx, ix * maxv(), 450 * dt) : approach(P.vx, ix * maxv(), 1800 * dt);
      else P.vx = approach(P.vx, 0, 320 * dt);
      if (ix) P.face = ix;
    }
    const jb = P.jumpBuf > 0;
    if (P.jumpBuf > 0) {
      if (P.onGround || P.coyote > 0) { P.vy = -JUMPV * (1) * (1) * (oath("hyeon") ? 1.3 : 1); ; heroFx("jump", P.x + P.w / 2, P.y + P.h + 2, P.face); P.onGround = false; P.coyote = 0; P.jumpBuf = 0; Music.sfx("jump"); }
      else if (P.wall || P.wallT > 0) { const wd = P.wall || P.wallMem; P.wallT = 0; P.vy = -600; P.vx = -wd * 380; P.face = -wd; P.wallLock = 0.15; P.jumpBuf = 0; P.wallBonus = 1; P.climbT = Math.max(P.climbT, 0.35); if (has("d_bisang")) { P.airDash = Math.max(P.airDash, baseAir() + 1); P.dashCd = 0; } Music.sfx("jump"); puff(wd > 0 ? P.x + P.w : P.x, P.y + P.h - 6, 6); heroFx("wall", P.x + P.w / 2 + wd * 10, P.y + P.h / 2, wd); }
      else if (P.wallBonus > 0) { P.wallBonus = 0; P.vy = -JUMPV * .92; P.jumpBuf = 0; Music.sfx("jump"); heroFx("air", P.x + P.w / 2, P.y + P.h + 4, P.face); }   // a wall kick buys one more jump
      else if ((has("d_jump") || chr("munyeo")) && (P.djN || 0) < 1 + (has("d_jump") && chr("munyeo") ? 1 : 0)) { P.vy = -JUMPV * .9; P.djN = (P.djN || 0) + 1; if (has("m_cloud")) P.cloudT = .3; heroFx("air", P.x + P.w / 2, P.y + P.h + 4, P.face); P.jumpBuf = 0; Music.sfx("jump"); addFx("hud", HUD.dust, P.x + P.w / 2, P.y + P.h, 26, { life: .35, a: .7 }); }
    }
    if (jb && P.jumpBuf === 0) flow("jump");
    let g = GRAV; if (P.vy < 0 && !held.jump && !P.wallLock && !P.climbing) g *= 2.1;
    if (P.floatT > 0 && !P.onGround) { g = 0; P.vy *= .85; }   // 강신: held up in the air
    ;
    if (has("d_glide") && held.jump && P.vy > 0 && !P.wall) { g *= .25; if (P.vy > 110) P.vy = 110; }   // 활공: hold jump to glide
    P.vy = Math.min((1000), P.vy + g * dt);
    if (P.wall && P.vy > 0 && ix === P.wall) P.vy = Math.min(P.vy, 130);
    // wall run: pushing into a wall while airborne carries you up it for a moment
    P.climbing = !!(P.wall && ix === P.wall && P.climbT > 0 && !P.wallLock);
    if (P.climbing) { P.vy = Math.min(P.vy, -CLIMBV); P.climbT -= dt; if (Math.random() < .3) puff(P.wall > 0 ? P.x + P.w : P.x, P.y + P.h - 4, 1); }
    moveX(P, P.vx * dt);
    if (omen("yeokpung")) moveX(P, -(P.onGround ? 45 : 85) * dt);   // 역풍 blows back toward the start
    const pb = P.y + P.h; P.lastVy = P.vy;
    if (moveY(P, P.vy * dt)) P.vy = 0;
    else if (P.vy > 0 && !(P.dropT > 0)) { const top = ledgeBelow(P, pb); if (top != null) { P.y = top - P.h - .001; P.vy = 0; } }
  }
  const was = P.onGround;
  P.onGround = P.vy >= 0 && (rectSolid(P.x, P.y + P.h, P.w, 2) || (!(P.dropT > 0) && onLedge(P)));
  if (!P.onGround) P.airTop = Math.min(P.airTop ?? P.y, P.y); else { if (!was && has("cj_c3") && wpn() === "cheonja" && P.y - (P.airTop ?? P.y) > 150 && state === "play") { blast(P.x + P.w / 2, P.y + P.h - 6, 110, true, { core: true }); ougiArt(["ogB", 11], P.x + P.w / 2, P.y + P.h, 200, { life: .5, ay: 1 }); } P.airTop = null; }   // 유성
  if (P.onGround) P.pogoN = 0;
  if (P.onGround && P.slam) { P.slam = false; if (!was && state === "play") quakeSlam(); }
  if (P.onGround && rectSolid(P.x - 6, P.y + P.h, P.w + 12, 2) && (P.safeT = (P.safeT || 0) + dt) > .35) P.safe = { x: P.x, y: P.y };   // 낙법 remembers firm ground
  if (!P.onGround) P.safeT = 0;
  if (P.onGround) { P.airT = 0; P.aimChain = 0; P.airCutUsed = false; if (P.chain && (P.landG = (P.landG || 0) + dt) > (wrule() === "ssang" ? 1.4 : .3)) P.chain = 0; P.runT = Math.abs(P.vx) > 40 ? (P.runT || 0) + dt : 0; P.coyote = 0.14; P.airDash = baseAir(); P.climbT = CLIMB_T * (has("d_wall") ? 2 : 1); if (!was) { addFx("hud", HUD.dust, P.x + P.w / 2, P.y + P.h + 2, 22, { life: .35, ay: 1, a: .8 }); P.landT = 0.1; if ((P.lastVy || 0) > 650) heroFx("land", P.x + P.w / 2, P.y + P.h + 3, P.face);
      ; } } else { P.coyote = Math.max(0, P.coyote - dt); P.airT = (P.airT || 0) + dt; P.landG = 0; }
  const wl = rectSolid(P.x - 3, P.y + 4, 3, P.h - 8), wr = rectSolid(P.x + P.w, P.y + 4, 3, P.h - 8);
  P.wall = P.onGround ? 0 : wr ? 1 : wl ? -1 : 0;
  if (P.wall) { P.wallMem = P.wall; P.wallT = .12; } else P.wallT = Math.max(0, (P.wallT || 0) - dt);   // wall jump still works a moment after slipping off
  if (P.onGround || P.wall) P.djN = 0;
  if (P.onGround) P.wallBonus = 0;
  P.chainT = Math.max(0, (P.chainT || 0) - dt);
  if (P.wall) P.airDash = Math.max(P.airDash, baseAir());
  if (P.onGround && Math.abs(P.vx) > 20) P.run += dt * Math.abs(P.vx) * 0.045;
  ;
}
function ghost(gap) { const l = ghosts[ghosts.length - 1]; if (!l || l.age > gap) ghosts.push({ x: P.x, y: P.y, face: P.face, age: 0, life: 0.22 }); for (const g of ghosts) g.age += 0.004; }
// one-shot painted effects: grow and fade
function addFx(sheet, i, x, y, h, o = {}) { if (vfx.length > (MOBILE ? 60 : 120)) vfx.shift(); vfx.push({ sheet, i, x, y, h, t: 0, life: o.life || .5, rot: o.rot || 0, grow: o.grow ?? .35, flip: !!o.flip, back: !!o.back, ax: o.ax ?? .5, ay: o.ay ?? .5, a: o.a ?? 1 }); }
// the hero's painted effects; dir/angle orient the ones that point somewhere
function heroFx(kind, x, y, dir = 1, ang = 0) {
  if (!SPR.herofx) return;
  const o = { dash: [70, .32, .5, .9], jump: [46, .4, 1, .85], land: [58, .4, 1, .8], air: [44, .4, .5, .85], wall: [52, .35, .5, .85], strike: [96, .3, .5, 1], arc: [80, .25, .5, .8], wind: [56, .45, .5, .8], ribbon: [40, .35, .5, .7] }[kind];
  const arc = kind === "strike" || kind === "arc", flip = arc ? dir > 0 : dir < 0, rot = (dir < 0 ? -ang : ang);   // the crescents are painted bulging left, the rest pointing right
  addFx("herofx", HFX[kind], x, y, o[0], { life: o[1], ay: o[2], a: o[3], flip, rot, grow: kind === "strike" || kind === "arc" ? .15 : .35 });
}
function findFloor(x, y) { let ty = Math.floor(y / T); while (ty < LV.h && tileAt(Math.floor(x / T), ty) !== 1) ty++; return ty < LV.h ? ty * T : null; }
function bleed(x, y, dir, big) { // blood burst + spray along the blow + a pool where it lands
  addFx("fx", FX.burst, x, y, big ? 96 : 64, { life: big ? .7 : .45, rot: Math.random() * 6.28, grow: .5 });
  addFx("fx", FX.spray, x, y, big ? 50 : 34, { life: .5, rot: Math.atan2(dir.y, dir.x), ay: .5, grow: .6 });
  addFx("fx", FX.drops, x + dir.x * 20, y - 6, 26, { life: .6, rot: Math.random() * 6.28 });
  if (SPR.vis) { addFx("vis", VIS.splat, x, y, big ? 48 : 34, { life: .45, grow: .3, ay: .5, rot: Math.random() * 6.28, a: .85 }); addFx("vis", VIS.drops, x + dir.x * 20, y + 4, big ? 24 : 18, { life: .55, grow: .1, ay: .5, rot: Math.atan2(dir.y, dir.x), a: .85 }); }
  const fy = findFloor(x, y); if (fy != null && LV.stains.length < 160) LV.stains.push({ x, y: fy + 2, pool: true, w: big ? 70 : 46, rot: 0 });
}
function puff(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 80, life: .3, max: .3, c: LV.pal.foe, s: 2 }); }
function stain(x, y, n, col) {
  for (let i = 0; i < n; i++) LV.stains.push({ x: x + (Math.random() - .5) * 40, y: y + (Math.random() - .3) * 30, r: 2 + Math.random() * 6, c: col || LV.pal.tile, rot: Math.random() * 6.28 });
  if (LV.stains.length > 160) LV.stains.splice(0, LV.stains.length - 160);
}
function laserOn(l) { const b = Math.floor(songPos / Music.beatLen); return (((b + l.phase) % 4) + 4) % 4 < 2; }
function laserWarn(l) { const bl = Music.beatLen, b = Math.floor(songPos / bl), frac = songPos / bl - b; return !laserOn(l) && (((b + 1 + l.phase) % 4) + 4) % 4 === 0 && frac > 0.45; }
function playerHazards() {
  const pr = { x: P.x + 2, y: P.y + 2, w: P.w - 4, h: P.h - 4 };
  const x0 = Math.floor(pr.x / T), x1 = Math.floor((pr.x + pr.w) / T), y0 = Math.floor(pr.y / T), y1 = Math.floor((pr.y + pr.h) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++)
    if (tileAt(tx, ty) === 2 && overlap(pr, { x: tx * T + 4, y: ty * T + 14, w: T - 8, h: T - 14 })) return die("fall");
  if (P.y > LV.h * T + 80) return die("fall");
  for (const l of LV.lasers) if (laserOn(l) && overlap(pr, { x: l.x - 3, y: l.y0, w: 6, h: l.y1 - l.y0 })) { P.hitBy = "금줄"; return die(); }
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
  LV.cps.forEach((c, i) => {
    if (!c.on && Math.abs(cx - c.x) < 26 && cy < c.y && cy > c.y - 3 * T) {
      for (const o of LV.cps) o.on = false;
      c.on = true; cpSave = { x: c.x - 9, y: c.y - 30.01, dead: new Set(deadIds), idx: i };
      run.cp = i; run.dead = [...deadIds]; saveRun();
      Music.sfx("lantern");
    }
  });
  if (LV.exit && overlap(pr, LV.exit) && !bossAlive()) madangClear();
}

// ---------- enemies ----------
// one hit point per cut 천고 beyond the first; a plain cut removes one, an 일격 kills outright
function hurtEnemy(e, strike, kind) {
  if (!e.alive || ghostly(e)) return;
  const kan = isFlashing(e); if (kan) { strike = true; e.kanpa = true; if (P && P.iaiCut && wrule() === "baldo") addQi(25); e.kanZan = e.openT > songPos; e.kanMua = viaMua(); if (run && mode !== "tutorial") run.kanpa = (run.kanpa || 0) + 1;
    const x = e.x + e.w / 2, y = e.y + e.h / 2, big = e.type === "b";   // 간파: the crossed cut, gold flakes, the world holds a beat
    { const bt = blowAt(e), perfect = bt != null && songPos >= bt - .09; momAdd(perfect || isGun() ? TUNING.MOM_PERFECT : TUNING.MOM_KAN); if (isGun() && P) { gunReload(99); if (P.heat) P.heat = 0; P.overheat = 0; }   // a read shot: the gun is full again if (run && mode !== "tutorial") run.gKan = (run.gKan || 0) + 1;
      if (pet && Math.hypot(pet.x - x, pet.y - y) < 280) petJeong(1);
      if (pet && !pet.rest && kind !== "pet" && petStage() >= 2 && mode !== "tutorial") setTimeout(() => { if (!pet || state !== "play") return; const t = e.alive ? e : nearestFoes(x, y, 1, 320)[0]; if (t) { pet.cd = 0; petAttack(t, PETS[META.pet.kind], petStage() >= 3 ? 2 : 1); } }, 120);   // 합격
      Music.accent(perfect ? "perfect" : "kan"); if (perfect) { popText(x, y - 46, "완벽 간파", SEAL); hitstop = Math.max(hitstop, .16); seals.push({ x, y: y - 10, t: 0, rot: (Math.random() - .5) * .3, ch: "妙" }); Music.sfx("strike"); Music.jing(); flashDim = .1; if (run && mode !== "tutorial") run.perfectN = (run.perfectN || 0) + 1; } }
    addFx("kfx", KF.xcut, x, y, big ? 120 : 64, { life: .4, grow: .15, rot: Math.random() * .6 - .3 }); addFx("kfx", KF.flakes, x, y, big ? 130 : 80, { life: .5, grow: .5 });
    hitstop = Math.max(hitstop, .1); shake = Math.max(shake, 7); }
  else if (e.lastBlow != null && songPos - e.lastBlow < .3) { addFx("kfx", KF.fizzle, e.x + e.w / 2, e.y + e.h * .35, 46, { life: .45, grow: .2, ay: .5 }); addFx("kring", KR.drip, e.x + e.w / 2, e.y + e.h * .42, 30, { life: .5, grow: .1, a: .6 }); e.lastBlow = null; }   // just too late: a grey fizzle
  if (e.type === "a" && e.counter && kind === "il" && !kan && Math.sign(P.x + P.w / 2 - (e.x + e.w / 2)) === e.face) {   // 자객 받아치기: an 일섬 straight into his stance is turned on you
    addFx("mech", MECH.deflect, e.x + e.w / 2 + e.face * 14, e.y + 14, 60, { life: .3 }); Music.sfx("clang"); P.dashT = 0; lastHitDir = { x: e.face, y: -.4 }; die(); return; }   // 간파: any blow that lands on the glint
  if (e.ward && !strike) { // 무당's talisman takes the cut instead
    e.ward = false; addFx("hud", HUD.spark, e.x + e.w / 2, e.y + 6, 40, { life: .3 }); Music.sfx("clang"); return;
  }
  if (e.type === "b") { // a plain cut takes one, an 일격 three (four with 파천) and staggers it out of its wind-up
    const il = kind === "il", heavy = strike === 2;
    if (!strike && !il && (BOSSES[e.kind].armored || (e.kind === "talchum" && e.mask === 0))) { e.hitT = .1; Music.sfx("clang"); addFx("hud", HUD.spark, e.x + e.w / 2, e.y + 20, 34, { life: .25 }); return; }
    if (oath("goyo2") && !strike && !il) { e.hitT = .1; return; }
    if (!strike && !il && kind !== "pet" && !((e.recoverUntil || 0) > songPos)) { e.softHits = (e.softHits || 0) + 1;   // a flurry of plain cuts: the guardian sets its guard for a moment (never in its recovery)
      if ((e.guardT || 0) > songPos) { e.hitT = .1; Music.sfx("clang"); addFx("hud", HUD.spark, e.x + e.w / 2, e.y + e.h * .4, 40, { life: .25 }); return; }
      e.softN = songPos - (e.softAt ?? -9) < 1.6 ? (e.softN || 0) + 1 : 1; e.softAt = songPos;
      if (e.softN >= TUNING.BOSS_GUARD_HITS) { e.softN = 0; e.guardT = songPos + TUNING.BOSS_GUARD_T; toast("막아 낸다 · 틈이나 간파를 노려라"); } }
    const aimed = kan || heavy, read = kan, mua = kan && e.kanMua; e.kanpa = false;   // 간파 breaks the blow; 천고난무 cuts deep; 일섬 bites harder than a plain cut
    e.hp -= kan ? 3 : heavy ? 3 : strike ? 2 : il ? 2 : (e.recoverUntil || 0) > songPos ? 2 : 1; e.hitT = .22;   // a cut in the opening bites twice
    addFx("bvfx", BV.impact, e.x + e.w / 2 + (Math.random() - .5) * e.w * .4, e.y + e.h * (.3 + Math.random() * .3), aimed ? 120 : strike ? 80 : 54, { life: .28, grow: .25, rot: Math.random() * 6.28, a: .9 });
    if (il) addQi(4);
    if (read) { regainAir(); whet(); addQi((has("d_beat") ? 2 : 1) * (mua ? 2 : 1) * 15); P.ki = Math.min(1, (P.ki || 0) + .5); chainAdd(mua ? 2 : 1); kanPerks(e); if (mua) killCam = Math.max(killCam, .3); hitstop = Math.max(hitstop, .12); shake = Math.max(shake, 9); haz = haz.filter(z => z.kind === "ring"); }
    if (aimed) { e.stagT = read ? .7 : .3; e.act = null; e.suck = false; e.chargeT = 0; e.danceT = 0; e.swoopT = 0; e.nextAt = songPos + 2 * Music.beatLen; if (e.hidden) { e.hidden = false; e.x = e.tx - e.w / 2; } }
    addFx("fx", FX.drops, e.x + e.w / 2, e.y + 30, 30, { life: .4, rot: Math.random() * 6.28 });
    hitstop = Math.max(hitstop, .05); Music.sfx("clang"); shake = Math.max(shake, 4);
    if (e.hp <= 0) killEnemy(e); return;
  }
  if (run && (run.trance || 0) > 0 && e.type !== "b") strike = true;   // 무아지경
  if (!strike && momTier() >= 4 && e.elite) e.hp--;   // 기세 四: elites give way
  ;
  if ((e.liftT || 0) > songPos && e.type !== "b") strike = true;   // 지진: lifted off its feet   // 처형: the frozen fall to any cut
  if (oath("goyo2") && !strike && kind !== "il" && e.type !== "b") { e.hitT = .12; addFx("hud", HUD.spark, e.x + e.w / 2, e.y + 12, 22, { life: .2 }); return; }
  if (omen("hyeolmaeng") && !strike) { e.hitT = .12; Music.sfx("clang"); addFx("hud", HUD.spark, e.x + e.w / 2, e.y + 12, 26, { life: .25 }); return; }   // 피의 맹세: only an 일격 draws blood
  if (!strike && ((frenzy() && wk() === "ssang" && kind !== "il"))) e.hp--;   /* 폭주: every cut bites twice */
  if (e.type === "d" && false) strike = true;
  if (strike || (e.hp || 1) <= 1) { killEnemy(e); return; }
  e.hp--; e.hitT = .22;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  addFx("fx", FX.drops, cx, cy - 4, 22, { life: .4, rot: Math.random() * 6.28 });
  if (e.type !== "d") { const k = Math.sign(cx - (P.x + P.w / 2)) || 1; moveX(e, k * 10); }
  else { e.vx += (Math.sign(cx - (P.x + P.w / 2)) || 1) * 160; }
  hitstop = Math.max(hitstop, .04); Music.sfx("clang"); shake = Math.max(shake, 3);
}
function killEnemy(e) {
  if (!e.alive) return;
  e.alive = false; deadIds.add(e.id); run.kills++; if (e.type === "b") petJeong(5);
  if (momOn()) { momAdd(P.dashT > 0 || P.aimDash ? TUNING.MOM_KILL_MOVING : TUNING.MOM_KILL); const t = momTier(); if (t >= 2) run.honBonus = (run.honBonus || 0) + (t >= 4 ? 2 : 1); if (t >= 3 && isGun()) gunReload(1, "slow"); }
  if (momOn() && e.type !== "b" && !LV.drums.length && !enemies.some(o => o.alive && o.type !== "i")) { killCam = Math.max(killCam, 1.1); hitstop = Math.max(hitstop, .18); shake = Math.max(shake, 8); Music.jing(); }   // the last of the gate falls slowly
  if (e.type === "m") for (const o of enemies) if (o.wardBy === e.id) o.ward = false;
  ;
  if (mode !== "tutorial") resKill(e);
  addQi(3); if (P && state === "play") chainAdd(1);
  if (P && state === "play" && frenzy() && has("ss_a2")) P.frenzyUntil += .6;   // 광란
  if (P && state === "play" && P.iaiCut && has("bd_c3")) { run.senN = (run.senN || 0) + 1; ougiArt(["ogA", 11], e.x + e.w / 2, e.y + e.h / 2, 90, { life: .35, flip: P.face < 0 }); }   // 천섬
  if (e.elite && P && state === "play") { addQi(12); P.ki = 1; addFx("wfx", WF2.burst, e.x + e.w / 2, e.y + e.h / 2, 80, { life: .4, grow: .3 }); }   // 정예: worth the trouble
  if (P && e.kanpa && e.type !== "b" && state === "play") { const mua = e.kanMua;   // 간파: cut down on the glint — its shot dies with it
    addQi((has("d_beat") ? 2 : 1) * (mua ? 2 : 1) * 15); regainAir(); whet(); P.ki = Math.min(1, (P.ki || 0) + .5); if (mua) chainAdd(1); kanPerks(e);
    for (const b of bullets) if (b.owner === e && !b.friendly) b.life = 0;
    if (e.type === "k") { for (const o of enemies) if (o.alive && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 320) { o.stunT = Math.max(o.stunT || 0, 1.2); o.fireAt = null; o.swingAt = null; o.thrustAt = null; o.dashAt = null; }   // the drum falls silent: everyone near falters
      ringFx(e.x + e.w / 2, e.y + e.h / 2, 160, "rgba(39,70,106,.7)", .45); addQi(15); }
    hitstop = Math.max(hitstop, .06);
    if (mua) killCamOn(e); }
  if (P && ((P.aimDash && !P.tapDash) || (P.aimedUntil || 0) > songPos) && state === "play") {
    addQi(has("d_giseom") || has("p_charge") ? 18 : 9); run.aimK = (run.aimK || 0) + 1; P.ki = Math.min(1, (P.ki || 0) + .3); whet(1); // what an aimed-dash kill gives back
    P.airDash = Math.max(P.airDash, baseAir() + (has("d_sun") ? 1 : 0)); P.dashCd = 0;   // only an aimed kill gives the air dash back (연환: one more)
    if (has("d_sun")) P.reAim = true;
    if (has("p_quick")) P.reloadAt = 0;
    if (has("d_chain") && !inChain) { const x = e.x + e.w / 2, y = e.y + e.h / 2, n = nearestFoes(x, y, 2, 170).find(o => o !== e);   // 뇌인: one hop, never a chain of chains
      if (n) { inChain = true; boltFx(x, y, n.x + n.w / 2, n.y + n.h / 2, .3, 14); hurtEnemy(n, n.type !== "b"); inChain = false; } }
 }
  if (oath("pi") && P) { P.dashCd = 0; P.airDash = Math.max(P.airDash, baseAir()); }

  if (e.type === "b" && e.kind === "cheongo") { run.endingDue = true; toast("북의 주인이 쓰러졌다 · 천고를 쳐라"); }
  if (e.type === "b" && mode !== "tutorial") { run.bossKills = (run.bossKills || 0) + 1; (run.bossSeen = run.bossSeen || []).push(e.kind); codexBoss(e); }
  if (e.type === "b") { const x = e.x + e.w / 2, y = e.y + e.h / 2;   // ink and blood thrown wide, the body going up as wisps
    addFx("bcal", BC.inkBurst, x, y, e.h * 2.2, { life: .7, grow: .5, rot: Math.random() * 6.28, a: .9 }); addFx("bcal", BC.redBurst, x, y, e.h * 1.6, { life: .8, grow: .45, rot: Math.random() * 6.28, a: .85 });
    addFx("bvfx", BV.dissolve, x, e.y + e.h * .4, e.h * 1.8, { life: 1.4, grow: .3, ay: .7, a: .9 }); }
  if (e.type === "b" && e.kind !== "cheongo") { bossOut = { t: 0, x: e.x + e.w / 2, y: e.y + e.h / 2, kind: e.kind, name: BOSSES[e.kind].name, han: BOSSES[e.kind].han }; killCam = Math.max(killCam, .9); sealArena(null, false); }
  if (e.type === "b") { haz = []; for (const o of enemies) if (o.type === "i") o.alive = false; toast(`${josa(BOSSES[e.kind].name, "이", "가")} 쓰러졌다 · ${run.m === LAST_M ? "천고를 베어라" : "길이 열렸다"}`); Music.jing(); shake = 14; for (let k = 0; k < 3; k++) bleed(e.x + e.w / 2 + (k - 1) * 20, e.y + 20 + k * 18, { x: k - 1, y: -.4 }, true); }
  if (omen("hyeolmaeng") && mode !== "tutorial") { run.hmN = (run.hmN || 0) + 1; if (run.hmN % 5 === 0 && run.breath < breathCap()) { run.breath++; setHud(); toast("피의 맹세 · 숨 하나를 되찾았다"); } }
  if (has("hyeol") && run.kills % (10) === 0 && run.breath < breathCap()) { run.breath++; setHud(); toast("혈로 · 숨 하나를 되찾았다"); }
  ;
  ;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  for (let i = 0; i < 20; i++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 320; parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: .6, max: .6, c: i % 5 ? LV.pal.tile : SEAL, s: 2 + Math.random() * 4 }); }
  bleed(cx, cy, P.slashT > 0 ? P.slashDir : { x: Math.sign(cx - P.x - P.w / 2) || 1, y: -.2 }, false);
  hitstop = 0.07; shake = Math.max(shake, 6); P.dashCd = 0; if (mode === "tutorial") P.airDash = Math.max(P.airDash, baseAir());
  ;

  Music.sfx("kill", momTier()); buzz(18);
}
function clang(e) {
  P.vx = -Math.sign(e.x + e.w / 2 - (P.x + P.w / 2) || 1) * 300; P.dashT = 0; if (!P.onGround) P.vy = Math.min(P.vy, -150);
  for (let i = 0; i < 8; i++) parts.push({ x: e.x + e.w / 2 + e.face * 10, y: e.y + 12, vx: (Math.random() - .5) * 300, vy: -Math.random() * 200, life: .25, max: .25, c: "#fff", s: 2 });
  Music.sfx("clang"); shake = Math.max(shake, 3);
}
const FOE_TIP = { p: "다가와 벤다 · 두 번 베야 쓰러진다", g: "박에 맞춰 쏜다 · 탄은 베어 되받아칠 수 있다", s: "멀리서 오래 겨누고 빠른 탄을 쏜다 · 겨누는 동안 다가가 베라", h: "방패가 정면을 막는다 · 등 뒤를 베거나 간파·일섬·일격", a: "무아경에 들면 받아치기 자세를 잡는다 · 정면 일섬은 되받힌다 — 원이 닫힐 때 간파", k: "북으로 둘레 적을 부추긴다 · 칼의 평베기를 튕긴다 — 간파·일섬·일격", d: "하늘에서 내리꽂힌다 · 한 번에 떨어진다", m: "곁의 적에게 부적을 씌운다 · 부적이 먼저 한 번 막아 준다" };
function foeIntro(pcx, pcy) { // the first time each kind of foe comes into view, one line on how it fights (then never again)
  if (mode === "tutorial" || !run || (stepEnemies.introT = (stepEnemies.introT || 0) - 1) > 0) return; stepEnemies.introT = 20; META.tips = META.tips || {};
  for (const e of enemies) if (e.alive && FOE_TIP[e.type] && !META.tips["foe_" + e.type] && Math.abs(e.x - pcx) < 360 && Math.abs(e.y - pcy) < 220) { tipOnce("foe_" + e.type, `처음 보는 적 · ${FOE_NAME[e.type]}`, FOE_TIP[e.type]); e.introUntil = songPos + 2.5; killCam = Math.max(killCam, .7); if (e.sleepy !== false) { e.readyAt = Math.max(e.readyAt || 0, songPos + 1.5); e.nextSwing = Math.max(e.nextSwing || 0, songPos + 1.5); } break; }   // the world slows and the newcomer is ringed while you read about it
}
let curFoe = null;
function stepEnemies(dt) { stepEnemiesIn(dt); curFoe = null; }
function stepEnemiesIn(dt) {
  flashSync();
  const pcx = P.x + P.w / 2, pcy = P.y + P.h / 2, live = state === "play", bl = Music.beatLen; foeIntro(pcx, pcy);
  for (const e of enemies) {
    if (!e.alive) continue; curFoe = e;   // whoever is acting now: if a blow lands, it is theirs
    if (e.hitT > 0) e.hitT -= dt;
    if (!"dbri".includes(e.type)) { const f = e.y + e.h;   /* walkers fall: a foe shoved off a ledge drops instead of hanging in the air */
      if (!groundPt(e.x + 3, f + 1) && !groundPt(e.x + e.w - 3, f + 1)) { e.fvy = Math.min(900, (e.fvy || 0) + 1900 * dt); if (moveY(e, e.fvy * dt)) e.fvy = 0; else { const l = ledgeBelow(e, f); if (l != null) { e.y = l - e.h - .001; e.fvy = 0; } }
        if (e.y > LV.h * T + 60) { killEnemy(e); continue; } } else e.fvy = 0; }
    if (e.stunT > 0) { e.stunT -= dt; dashThrough(e); continue; }   // 월광 / 뇌전: frozen for a moment
    const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2, dist = Math.hypot(pcx - ecx, pcy - ecy);
    if (e.type === "d") {
      e.t += dt;
      const sees = live && dist < 430 && los(ecx, ecy, pcx, pcy);
      if (e.diveT > 0) { e.diveT -= dt; e.vx = e.dvx; e.vy = e.dvy; }   // 매: the dive itself
      else if (e.diveAt != null) { e.vx *= .85; e.vy *= .85; if (songPos >= e.diveAt) { const L = Math.hypot(pcx - ecx, pcy - ecy) || 1; e.dvx = (pcx - ecx) / L * 560; e.dvy = (pcy - ecy) / L * 560; e.diveT = .45; e.diveAt = null; e.diveReady = songPos + 3 * bl; Music.sfx("dash"); } }
      else if (sees && dist < 300 && songPos >= (e.diveReady || 1)) { e.diveAt = (Math.floor(songPos / bl) + 1) * bl; if (e.diveAt - songPos < .5) e.diveAt += bl; }
      else if (sees) { e.vx += (pcx - ecx) / dist * 520 * dt; e.vy += (pcy - ecy) / dist * 520 * dt; }
      else { e.vx += (e.hx - e.x) * 2 * dt; e.vy += (e.hy + Math.sin(e.t * 2) * 10 - e.y) * 2 * dt; }
      const sp = Math.hypot(e.vx, e.vy), cap = e.diveT > 0 ? 600 : (sees ? 175 : 80); if (sp > cap) { e.vx *= cap / sp; e.vy *= cap / sp; }
      if (moveX(e, e.vx * dt)) e.vx *= -0.5;
      if (moveY(e, e.vy * dt)) e.vy *= -0.5;
      if (live && overlap(e, P)) { if (P.dashT > 0 || P.slashT > 0) { if (P.dashT > 0 ? !P.dashHit.has(e.id) : !(P.hitSet && P.hitSet.has(e.id))) { (P.dashT > 0 ? P.dashHit : P.hitSet).add(e.id); if (P.dashT > 0) dashHurt(e); else hurtEnemy(e, P.strike && P.slashT > 0); } } else if (!(e.hitT > 0)) die(); }
      continue;
    }
    if (e.type === "m") { stepMudang(e, dt, pcx, dist, live); continue; }
    if (e.type === "r") { stepReaper(e, dt, pcx, pcy, dist, live); continue; }
    if (e.type === "b") { stepBoss(e, dt, pcx, pcy, dist, live); continue; }
    if (e.type === "i") { stepIllusion(e, dt, pcx, live); continue; }
    if (e.type === "p" || e.type === "a" || e.type === "k") { stepFoe3(e, dt, pcx, pcy, dist, live, bl); continue; }
    if (e.type === "h") {
      const sees = live && dist < 380 && Math.abs(pcy - ecy) < 80 && los(ecx, e.y + 8, pcx, pcy);
      if (sees) e.face = Math.sign(pcx - ecx) || e.face;
      const ahead = e.x + e.w / 2 + e.face * 16;
      const ground = groundPt(ahead, e.y + e.h + 4) && !solidPt(ahead, e.y + 10);
      e.vx = sees && ground && dist > 24 && e.thrustAt == null ? e.face * 55 : 0;
      moveX(e, e.vx * dt);
      if (live && sees && e.thrustAt == null && dist < 90 && songPos >= (e.nextThrust || 0)) { e.thrustAt = (Math.floor(songPos / bl) + 1) * bl; if (e.thrustAt - songPos < .5) e.thrustAt += bl; }   // 등패수: the shield drops for a thrust — the one opening
      if (e.thrustAt != null && songPos >= e.thrustAt) { const zone = { x: e.face > 0 ? ecx : ecx - 64, y: e.y + 6, w: 64, h: e.h - 10 };
        addFx("fx", FX.slashA, ecx + e.face * 34, e.y + e.h / 2, 54, { life: .25, rot: e.face > 0 ? 0 : Math.PI }); Music.sfx("slash");
        if (live && hurtsPlayer() && overlap(zone, P)) { lastHitDir = { x: e.face, y: -.3 }; die(); } e.thrustAt = null; e.nextThrust = songPos + 3 * bl * diff().fire; }
      if (live && overlap(e, P)) { if (P.dashT > 0) clang(e); else die(); }
      continue;
    }
    const fast = (1 + .08 * Math.min(3, cyc())) / (1);
    const sniper = e.type === "s", range = sniper ? 920 : 560, lead = (sniper ? 1.0 : 0.45) / fast, lock = (sniper ? 0.3 : 0.15) / Math.max(1, fast * .8);
    const sees = live && dist < range && los(ecx, e.y + 8, pcx, pcy);
    if (sees) e.face = Math.sign(pcx - ecx) || e.face;
    if (e.fireAt != null) {
      if (songPos < e.fireAt - lock && sees) { e.tx = pcx; e.ty = pcy; }
      if (!sees && songPos < e.fireAt - lock) { e.fireAt = null; e.readyAt = songPos + 0.3; }
      else if (songPos >= e.fireAt) {
        const [mx, my] = muzzle(e), dx = e.tx - mx, dy = e.ty - my, d = Math.hypot(dx, dy) || 1, sp = (sniper ? 1250 : 430) * (1 + .05 * Math.min(3, cyc())) * slowShot();
        const red = (sniper && cyc() >= 1) || !!e.elite;   // 붉은 탄: it cannot be cut or turned — dodge it, or 간파 the hand before it fires
        bullets.push({ x: mx, y: my, vx: dx / d * sp, vy: dy / d * sp, owner: e, friendly: false, life: 3, sniper, red, noReflect: red });
        addFx("hud", HUD.smoke, mx + e.face * 8, my - 4, 30, { life: .9, grow: .9, a: .8, flip: e.face < 0 }); // powder smoke
        e.fireAt = null; e.readyAt = songPos + Math.max(1, Math.round((sniper ? 4 : 2) / fast)) * bl * diff().fire;
        Music.sfx(sniper ? "snipe" : "shoot");
      }
    } else if (sees && songPos >= e.readyAt && !(e.sleepy && (e.sleepy = !sleepyWake()))) {
      let k = Math.ceil((songPos + lead) / bl);
      if (sniper) { const m4 = Math.max(1, Math.round(4 / fast)); k = Math.ceil(k / m4) * m4; }
      e.fireAt = k * bl; e.aimFrom = songPos; e.tx = pcx; e.ty = pcy;
    }
    if (live && P.dashT > 0 && overlap(e, P) && !P.dashHit.has(e.id)) { P.dashHit.add(e.id); dashHurt(e); }
  }
}
function sleepyWake() { return !LV.start || Math.abs(P.x - LV.start.x) > 48 || P.dashT > 0 || P.slashT > 0 || songPos > TUNING.START_SLEEP_T; }   // the first move (or eight seconds) wakes the foes near the start
function stepFoe3(e, dt, pcx, pcy, dist, live, bl) { // 순라 · 자객 · 북잡이
  if (e.sleepy && (e.sleepy = !sleepyWake())) { e.face = Math.sign(pcx - (e.x + e.w / 2)) || e.face; return; }   // waiting: watching, not yet coming
  const ecx = e.x + e.w / 2, sees = live && dist < 400 && Math.abs(pcy - (e.y + e.h / 2)) < 90 && los(ecx, e.y + 8, pcx, pcy), next = () => { let t = (Math.floor(songPos / bl) + 1) * bl; if (t - songPos < .5) t += bl; return t; };
  e.swingT = Math.max(0, (e.swingT || 0) - dt);
  const walk = sp => { const ahead = ecx + e.face * 14; if (groundPt(ahead, e.y + e.h + 4) && !solidPt(ahead, e.y + 10)) moveX(e, e.face * sp * dt); };
  if (e.type === "p") {
    if (sees && e.swingAt == null) e.face = Math.sign(pcx - ecx) || e.face;
    if (sees && e.swingAt == null && dist > 46) walk(70);
    if (sees && e.swingAt == null && dist < 76 && songPos >= e.nextSwing) { e.swingAt = next(); e.rush = false; }
    else if (sees && e.swingAt == null && dist > 130 && dist < 270 && songPos >= e.nextSwing && songPos >= (e.nextRush || 0)) { e.swingAt = next(); e.rush = true; e.nextRush = songPos + 5 * bl; }   // 돌진 베기: from mid-range he comes in with the blow — it glints from afar
    if (e.swingAt != null && songPos >= e.swingAt) { if (e.rush) { e.rush = false; const gap = Math.max(0, Math.abs(pcx - ecx) - 40); trailFx(ecx, e.y + e.h / 2, ecx + e.face * Math.min(gap, 200), e.y + e.h / 2, 5, .3, WF2.streak); moveX(e, e.face * Math.min(gap, 200)); }
      const zx = e.x + e.w / 2, zone = { x: e.face > 0 ? zx : zx - 70, y: e.y - 4, w: 70, h: e.h + 4 };
      addFx("fx", FX.slashA, zx + e.face * 36, e.y + e.h / 2, 64, { life: .25, rot: e.face > 0 ? 0 : Math.PI }); Music.sfx("slash"); e.swingT = .3;
      if (live && hurtsPlayer() && overlap(zone, P)) { lastHitDir = { x: e.face, y: -.3 }; die(); } e.swingAt = null; e.nextSwing = songPos + 2.5 * bl * diff().fire; }
  } else if (e.type === "a") {
    e.counter = live && P.focus && dist < 320 && !(e.lungeT > 0) && !(e.stunT > 0);   // 자객: when you slip into 무아경, he settles into a counter stance
    if (e.counter) e.face = Math.sign(pcx - ecx) || e.face;
    if (live && P.tapDash && P.dashT > 0 && dist < 130 && e.counter) { e.counter = false; e.stunT = .7; addFx("hud", HUD.spark, ecx, e.y + 10, 40, { life: .3 }); }   // a feint: the quick dash breaks his stance
    if (e.lungeT > 0) { e.lungeT -= dt; if (moveX(e, e.face * 620 * dt)) e.lungeT = 0;
      if (live && hurtsPlayer() && overlap(e, P)) { lastHitDir = { x: e.face, y: -.3 }; die(); } }
    else if (!e.counter) {
      if (sees && e.dashAt == null) e.face = Math.sign(pcx - ecx) || e.face;
      if (sees && e.dashAt == null && dist > 120) walk(120);
      if (sees && e.dashAt == null && dist < 230 && songPos >= e.nextLunge) e.dashAt = next();
      if (e.dashAt != null && songPos >= e.dashAt) { e.dashAt = null; e.lungeT = .32; e.nextLunge = songPos + 3 * bl; Music.sfx("dash"); }
    }
  } else {   // 북잡이
    e.beatT = Math.max(0, e.beatT - dt);
    if (sees) e.face = Math.sign(pcx - ecx) || e.face;
    if (live && dist < 560 && e.drumAt == null && songPos >= e.nextDrum) e.drumAt = next();
    if (e.drumAt != null && songPos >= e.drumAt) { e.drumAt = null; e.nextDrum = songPos + 4 * bl; e.beatT = .3; shake = Math.max(shake, 4); Music.sfx("kill");
      ringFx(ecx, e.y + e.h * .6, 120, "rgba(195,22,28,.6)", .4); haz.push({ kind: "ring", x: ecx, y: e.y + e.h * .6, at: songPos, speed: 260, max: 110 });
      const t = next();   // the drum sets every soldier near him to strike together on the next beat
      for (const o of enemies) { if (!o.alive || o === e || Math.hypot(o.x - e.x, o.y - e.y) > 320) continue;
        if ((o.type === "g" || o.type === "s") && o.fireAt == null) { o.fireAt = t; o.aimFrom = songPos; o.tx = pcx; o.ty = pcy; }
        else if (o.type === "p" && o.swingAt == null && Math.abs(o.x - P.x) < 120) o.swingAt = t;
        else if (o.type === "h" && o.thrustAt == null && Math.abs(o.x - P.x) < 120) o.thrustAt = t; } }
  }
  if (live && overlap(e, P) && !(P.dashT > 0) && !(e.lungeT > 0)) { P.vx = Math.sign(pcx - ecx || 1) * 260; }   // bodies shove
  dashThrough(e);
}
function dashThrough(e) { if (state === "play" && P.dashT > 0 && overlap(e, P) && !P.dashHit.has(e.id)) { P.dashHit.add(e.id); dashHurt(e); } }
let inChain = false;
const FLASH_BASE = TUNING.FLASH_BASE; let FLASH = FLASH_BASE;   // the glint before a blow lands: long enough to answer by hand, longer still in 무아경 (the music slows)
function flashSync() { FLASH = Math.min(TUNING.FLASH_MAX + Math.max(0, diff().kan), FLASH_BASE + (mode === "tutorial" ? 0 : diff().kan) + (simb("noe") ? .1 : 0) + (has("d_myeong") ? .15 : 0) + treeStat("kanWin") + (has("bd_b2") && P && (P.iaiHold || (P.focus && wk() === "baldo")) ? .1 : 0)) * (has("d_calm") && run && run.breath <= 1 && mode !== "tutorial" ? 2 : 1); }
function kanPerks(e) { // what the held 간파 비급 gives back for one read blow
  if (!P || state !== "play") return; const x = e.x + e.w / 2, y = e.y + e.h / 2, px = P.x + P.w / 2, py = P.y + P.h / 2;
  if (pet && !pet.act) pet.cd = Math.min(pet.cd, .05);   // the beast answers a read blow at once
  if (has("d_beat")) P.airDash++;
  if (isGun()) gunReload(9);   // 맞불: a read blow fills the gun
  if (has("hw_a1")) { P.ctrN = songPos < (P.ctrUntil || 0) ? (P.ctrN || 0) + 1 : 1; P.ctrUntil = songPos + .8; addQi(4 * P.ctrN); if (P.ctrN >= 2) { popText(x, e.y - 16, `연쇄 ${P.ctrN}`); Music.sfx(P.ctrN >= 4 ? "strike" : "reflect"); }   // 역습
    if (P.ctrN === 5 && has("hw_a3")) ilseomCheon(); }   // 일섬천격
  if (has("m_float") && P.floatT > 0) addQi(12);   // 강신: read while hanging in the air
  if (has("p_quick")) P.reloadAt = 0;   // 속사: a read blow reloads
  if (has("d_breathe")) { P.ki = 1; chainAdd(2); }
  if (has("d_ward")) P.wardT = 1.5;
  if (has("d_freeze")) bulletHold = Math.max(bulletHold, 1.2);
  if (has("d_tan")) { let n = 0; for (const b of bullets) if (!b.friendly && b.life > 0 && Math.hypot(b.x - px, b.y - py) < 260) { b.life = 0; if (n++ < 10) addFx("hud", HUD.spark, b.x, b.y, 18, { life: .2 }); } }
  if (has("d_zanshin") && !e.kanZan) { let n = 0; for (const o of enemies) if (o.alive && o !== e && Math.hypot(o.x + o.w / 2 - x, o.y + o.h / 2 - y) < 320) { o.openT = songPos + .7; n++; } if (n) ringFx(x, y, 150, "rgba(23,22,26,.65)", .35); }
  if (has("d_breath") && mode !== "tutorial" && run && (run.kanpa || 0) % 5 === 0 && run.breath < breathCap()) { run.breath++; setHud(); toast("혈로 · 숨 하나를 되찾았다"); }
}
let bulletHold = 0;
function blowAt(e) { // when this foe's blow lands (null when nothing is coming)
  if (!e || !e.alive) return null;
  if (e.type === "b") return e.act && !e.hidden && !["gamtu", "mask"].includes(e.act) ? e.hitAt : null;
  for (const k of ["fireAt", "thrustAt", "swingAt", "dashAt", "drumAt", "diveAt"]) if (e[k] != null) return e[k];
  if (e.type === "m") return e.castAt;
  if (e.type === "r") return e.ph === "rise" ? e.nextAt : null;
  return null;
}
function isFlashing(e) { if (e && e.alive && e.openT > songPos) return true; const t = blowAt(e); return t != null && songPos >= t - FLASH && songPos < t + .06; }   // 잔심 lays a foe open for a moment
const CLOSE = .35;   // the ring's approach before the glint opens
function preFlash(e) { const t = blowAt(e); return t != null && songPos >= t - FLASH - CLOSE && songPos < t - FLASH ? (songPos - (t - FLASH - CLOSE)) / CLOSE : 0; }
function drawKanAura(e) { // behind the body: ink rising as the blow gathers
  if (!SPR.kfx) return; const pre = preFlash(e), on = isFlashing(e); if (!pre && !on) return;
  const big = e.type === "b"; ctx.globalAlpha = on ? .6 + .15 * Math.sin(performance.now() / 50) : pre * .45;
  ctx.globalAlpha *= .55; drawSprite("kfx", KF.aura, e.x + e.w / 2, e.y + e.h + 4, e.h * (big ? 1.2 : 1.35) / SPR.kfx.f[KF.aura].h, false, .5, false, 1); ctx.globalAlpha = 1;
}
function drawKanFlash(e, tt) { // 간파: one brush ring shrinks onto the weak point and ends as a dot the instant the blow lands — the last stretch, bitten black, is the window
  const pre = preFlash(e), on = isFlashing(e), big = e.type === "b";
  if (!on && e.flashOn) { e.flashOn = false; e.lastBlow = songPos; }
  if (on && !e.flashOn) { e.flashOn = true; if (Math.hypot(e.x - P.x, e.y - P.y) < 520) { flashDim = .04; Music.sfx("clang"); } }
  if ((!pre && !on) || !SPR.kring || omen("goyo")) return;   // 고요: the ring is not shown — only the sound gives it away
  const t = blowAt(e), u = e.openT > songPos ? .75 + .25 * (1 - (e.openT - songPos) / .7) : Math.max(0, Math.min(1, (songPos - (t - FLASH - CLOSE)) / (CLOSE + FLASH)));   // 0 → 1 over the whole approach
  const cx = e.x + e.w / 2 + (big ? 0 : (e.face || 1) * 2), cy = e.y + e.h * (big ? .38 : .42), R0 = (big ? 70 : 38) * (P && P.focus ? 1.12 : 1), r = Math.max(2.5, R0 * (1 - u));
  ctx.save(); ctx.translate(cx, cy);
  if (r > 6) { ctx.globalAlpha = on ? 1 : .3 + .6 * Math.max(pre, u); inkRing(0, 0, r, big ? 2 : 1.4, (e.id || 1) * 7); }   // black hairs, a red thread inside: the same ring all the way down
  ctx.globalAlpha = on ? 1 : .5; ctx.fillStyle = SEAL; ctx.beginPath(); ctx.arc(0, 0, on ? Math.max(1.8, 2.8 - u) : 1.4, 0, Math.PI * 2); ctx.fill();   // and the point it closes to
  ctx.restore(); ctx.globalAlpha = 1;
}
const viaMua = () => !!(P && P.aimDash && !P.tapDash);   // the cut came out of 무아경
function chainAdd(n) { if (!P) return; const g0 = Math.min(5, P.chain || 0); P.chain = (P.chain || 0) + n; P.chainPop = .25; if (Math.min(5, P.chain) > g0) Music.sfx("lantern"); }
function addQi(n) { // 천고 기운: won by fighting well — 일섬, 간파, 과녁
  if (mode === "tutorial" || !run) return; const before = run.qi || 0; run.qi = Math.min(100, before + n * .6 * (1 + treeStat("qi")) * (oath("jangdan") ? 2 : 1) * (1 + .15 * Math.min(8, (P && P.chain) || 0)));
  if (before < 100 && run.qi >= 100) { if (META.tips && META.tips.chungo) toast(`천고 기운이 찼다 · ${MOBILE ? "태극 북" : "북 또는 Q"} → 오의 ${ougiOf().name}`);
    else tipOnce("chungo", `오의 · ${ougiOf().name}`, `북이 다 찼다 — ${ougiOf().tip}. 원할 때 쓴다`, MOBILE ? "아래 태극 북을 누르기" : "태극 북 클릭 또는 Q"); Music.jing(); }
}
let chungoFx = null;
const ougiOf = () => OUGI[wpn()] || OUGI[wrule()] || OUGI.hwando;
function ougiArt(key, x, y, h, o = {}) { const [sh, i] = key; if (SPR[sh]) { addFx(sh, i, x, y, h, { life: .6, grow: .3, ...o }); return true; } return false; }
function ougiCall(o) { flashDim = Math.max(flashDim, .1); }   // the art speaks for itself: no name is written
let bossBannerLite = null;   // the 오의's name brushed large for a moment
function chungo() { // the full drum: 오의. Swords lay ink lines from foe to foe, then all fall at once; guns let go a single overwhelming volley
  const o = ougiOf(), w = wpn();
  if (WEAPONS[w] && WEAPONS[w].gun) return gunOugi(w, o);
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2, d = a => Math.hypot(a.x + a.w / 2 - cx, a.y + a.h / 2 - cy);
  const ts = enemies.filter(e => e.alive && !ghostly(e) && !e.hidden && d(e) < (run.ougiAwake ? 640 : 480)).sort((a, b) => d(a) - d(b)).slice(0, (has("d_giseom") ? 10 : 8) + (run.ougiAwake ? 4 : 0));
  if (!ts.length) return false;
  const pts = [{ x: cx, y: cy }, ...ts.map(e => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 }))];
  chungoFx = { pts, ts, t: 0, done: false, w: wrule() }; run.qi = run.ougiAwake ? 50 : 0; P.invT = Math.max(P.invT || 0, 1.2); P.vx = P.vy = 0;
  for (const e of ts) e.stunT = Math.max(e.stunT || 0, 2); Music.sfx("dash"); flashDim = .12; ougiCall(o); return true;
}
function gunOugi(w, o) { // the four guns' 오의
  const cx = P.x + P.w / 2, cy = P.y + P.h / 2, near = nearestFoes(cx, cy, 12, 560);
  if (!near.length && w !== "cheonja") return false;
  run.qi = run.ougiAwake ? 50 : 0; P.invT = Math.max(P.invT || 0, 1); ougiCall(o); flash = .3; shake = 16; hitstop = Math.max(hitstop, .12); Music.jing(); killCam = Math.max(killCam, .5);
  if (w === "jochong") {   // 일발필중: one ball, foe to foe
    let from = { x: cx, y: cy - 6 }, n = 0; for (const e of near.slice(0, 8)) { const ex = e.x + e.w / 2, ey = e.y + e.h / 2; beams.push({ x0: from.x, y0: from.y, x1: ex, y1: ey, t: -n * .05, life: .5, red: true, w: 2.4 });
      if (SPR.gfx) trailFx(from.x, from.y, ex, ey, 4, .45, 5, "gfx"); hurtEnemy(e, e.type !== "b" ? true : 2, "il"); ougiArt(o.art, ex, ey, 80, { life: .45, rot: Math.random() * .6 - .3 }); from = { x: ex, y: ey }; n++; }
    Music.sfx("snipe"); }
  else if (w === "seungja") {   // 포화: a ring of pellets, every enemy shot nearby wiped
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; aimRay({ x: Math.cos(a), y: Math.sin(a) }, 320, 12, 0, cx, cy, false, {}); }
    for (const e of near) if (Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < 320) hurtEnemy(e, e.type !== "b" ? true : 2, "il");
    for (const b of bullets) if (!b.friendly && Math.hypot(b.x - cx, b.y - cy) < 360) b.life = 0;
    ougiArt(o.art, cx, cy, 240, { life: .6 }); ringFx(cx, cy, 320, "rgba(195,22,28,.7)", .4); Music.sfx("snipe"); }
  else if (w === "singi") {   // 화차: sixteen arrows, each finding its own
    for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (i - 7.5) * .16; bullets.push({ x: cx, y: cy - 8, vx: Math.cos(a) * 380 + P.face * 120, vy: Math.sin(a) * 420, friendly: true, rocket: true, seek: 12, blast: 50, strike: true, life: 2.6, owner: null, r: 8 }); }
    ougiArt(o.art, cx, cy - 40, 200, { life: .7, ay: .8 }); Music.sfx("shoot"); }
  else {   // 천지포: the ground itself goes off, and the gunner rides the blast up
    const f = P.y + P.h; blast(cx, f - 10, 130, true); ougiArt(o.art, cx, f, 260, { life: .7, ay: 1 });
    for (const e of enemies) if (e.alive && !ghostly(e) && Math.abs(e.x + e.w / 2 - cx) < 620 && Math.abs(e.y + e.h - f) < 100) { hurtEnemy(e, e.type !== "b" ? true : 2, "il"); addFx("wfx", WF2.quake, e.x + e.w / 2, e.y + e.h + 4, 60, { life: .45, ay: 1 }); }
    P.vy = -900; P.onGround = false; regainAir(); }
  return true;
}
function stepChungo(rdt) {
  const c = chungoFx; if (!c) return; c.t += rdt; hitstop = Math.max(hitstop, .05);
  const n = c.pts.length - 1, lay = .09;
  if (c.t >= n * lay + .25 && !c.done) { c.done = true;   // the held breath lets go
    P.aimDash = true; P.aimedUntil = songPos + .6; for (const e of c.ts) { hurtEnemy(e, 2); if (!e.alive) bleed(e.x + e.w / 2, e.y + e.h / 2, { x: (Math.random() - .5) * 2, y: -.5 }, true); } P.aimDash = false;
    const last = c.ts[c.ts.length - 1], side = Math.sign(last.x + last.w / 2 - c.pts[0].x) || P.face, nx = last.x + last.w / 2 + side * (last.w / 2 + 16) - P.w / 2, ny = last.y + last.h - P.h - .01;
    if (!rectSolid(nx, ny, P.w, P.h)) { P.x = nx; P.y = ny; P.face = -side; } P.vy = -200; regainAir();
    if (c.w === "woldo") for (const e of c.ts) addFx("wfx", WF2.quake, e.x + e.w / 2, e.y + e.h + 4, 70, { life: .5, grow: .2, ay: 1 });   // 낙월: each lands like a blow from above
    { const o = ougiOf(); for (const e of c.ts) ougiArt(o.art, e.x + e.w / 2, e.y + e.h / 2, c.w === "baldo" ? 150 : 110, { life: .55, rot: c.w === "woldo" ? 0 : Math.random() * .5 - .25, ay: c.w === "woldo" ? .85 : .5 }); }
    for (const e of c.ts) addFx("wfx", c.w === "ssang" ? WF2.xcut : WF2.burst, e.x + e.w / 2, e.y + e.h / 2, c.w === "ssang" ? 90 : 76, { life: .4, grow: .3, rot: Math.random() * 6.28 });
    shake = c.w === "woldo" ? 22 : 18; flash = c.w === "baldo" ? .5 : .35; killCam = Math.max(killCam, .7); Music.jing(); Music.sfx("strike"); }
  if (c.t > n * lay + .9) chungoFx = null;
}
function drawChungo(tt) { // painted, laid in order — each weapon writes its own: 환도 joins foe to foe, 쌍검 crosses each, 월도 drives down from the sky, 발도 waits and draws one line
  const c = chungoFx; if (!c) return; const n = c.pts.length - 1, lay = .09, fade = c.done ? Math.max(0, 1 - (c.t - (n * lay + .25)) / .65) : 1, w = c.w, S = SPR.wfx;
  const mark = (x, y) => { if (!S || !drawSprite("wfx", WF2.mark, x, y, (20 + Math.sin(tt * 30) * 2) / S.f[WF2.mark].h, false, .5, false, .5)) { ctx.fillStyle = SEAL; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); } };
  const line = (fr, x0, y0, x1, y1, h, sd) => { if (!wfxLine(fr, x0, y0, x1, y1, h)) inkLine(x0, y0, x1, y1, h / 6, sd); };
  ctx.save(); ctx.globalAlpha = fade;
  if (w === "baldo") {   // 일도: marks only, then a single drawn cut through them all
    for (let i = 0; i < n && c.t >= i * lay; i++) if (!c.done) mark(c.pts[i + 1].x, c.pts[i + 1].y);
    if (c.done) { const a = c.pts[0], far = c.pts.reduce((m, q) => Math.hypot(q.x - a.x, q.y - a.y) > Math.hypot(m.x - a.x, m.y - a.y) ? q : m, a), dx = far.x - a.x, dy = far.y - a.y, L = Math.hypot(dx, dy) || 1;
      line(WF2.iai, a.x - dx / L * 60, a.y - dy / L * 60, far.x + dx / L * 90, far.y + dy / L * 90, 70, 31); }
  } else for (let i = 0; i < n; i++) { const k = Math.max(0, Math.min(1, (c.t - i * lay) / lay)); if (!k) break; const a = c.pts[i], b = c.pts[i + 1];
    if (w === "woldo") { if (S) { const f = S.f[WF2.fall], hh = 190; ctx.save(); ctx.globalAlpha = fade * k; drawSprite("wfx", WF2.fall, b.x, b.y + 30 - (1 - k) * 80, hh / f.h, false, .5, false, 1); ctx.restore(); } else inkLine(b.x, b.y - 170, b.x, b.y + 24, 6, i); }   // 낙월: from the sky straight down
    else { line(WF2.streak, a.x, a.y, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, c.done ? 34 : 24, i * 13 + 5);
      if (w === "ssang" && k >= 1 && S) drawSprite("wfx", WF2.xcut, b.x, b.y, 70 / S.f[WF2.xcut].h, i % 2 === 1, .5, false, .5); }   // 쌍검: each one crossed
    if (k >= 1 && !c.done) mark(b.x, b.y); }
  ctx.restore(); ctx.globalAlpha = 1;
}
function breakTarget(g) { // 과녁: the cut gives the air dash back, and the target hangs again a moment later
  g.t = 2.5; addQi(5); P.ki = Math.min(1, (P.ki || 0) + .25); P.airDash = Math.max(P.airDash, baseAir()); P.dashCd = 0; P.djN = 0; if (has("p_quick")) P.reloadAt = 0;
  addFx("fx", FX.slashARed, g.x, g.y, 46, { life: .25, rot: Math.random() * 6.28 }); ringFx(g.x, g.y, 34, "rgba(195,22,28,.85)", .3);
  hitstop = Math.max(hitstop, .04); Music.sfx("lantern"); buzz(10);
}
function dashHurt(e) { // what a dash does to whatever it passes through
  if (P.ram && e.type !== "b") { e.stunT = Math.max(e.stunT || 0, .6); moveX(e, P.dashDir.x * 40); }
  if (P.iaiCut) seals.push({ x: e.x + e.w / 2, y: e.y + 6, t: 0, rot: (Math.random() - .5) * .4 });
  hurtEnemy(e, P.iaiCut, P.aimDash && !P.tapDash ? "il" : null);   // 일섬 is the reach; only the glint (간파) or a full 거합 makes it an 일격
}
// 무당: every fourth beat she lays a talisman ward on the two nearest soldiers; it eats one plain cut
function stepMudang(e, dt, pcx, dist, live) {
  e.castT = Math.max(0, e.castT - dt);
  const sees = live && dist < 560; if (sees) e.face = Math.sign(pcx - (e.x + e.w / 2)) || e.face;
  if (sees && songPos >= e.castAt) {
    const bl = Music.beatLen, near = enemies.filter(o => o.alive && o !== e && o.type !== "m" && o.type !== "b" && !o.ward && Math.hypot(o.x - e.x, o.y - e.y) < 280).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y)).slice(0, 2);
    for (const o of near) { o.ward = true; o.wardBy = e.id; addFx("hud", HUD.spark, o.x + o.w / 2, o.y + 4, 34, { life: .4 }); }
    e.castT = .6; e.castAt = (Math.floor(songPos / bl) + 4) * bl; if (near.length) Music.sfx("hook");
  }
  dashThrough(e);
}
// 저승사자: sinks into ink, rises beside you one beat later and swings on the next beat
function stepReaper(e, dt, pcx, pcy, dist, live) {
  const bl = Music.beatLen, fast = 1 + .08 * Math.min(3, cyc());
  e.fade = approach(e.fade, e.ph === "gone" ? 0 : 1, dt * 5); e.swingT = Math.max(0, (e.swingT || 0) - dt);
  if (e.ph === "idle") {
    e.face = Math.sign(pcx - (e.x + e.w / 2)) || e.face;
    if (live && dist < 620 && songPos >= e.nextAt) { e.ph = "gone"; e.nextAt = (Math.floor(songPos / bl) + 1) * bl; addFx("hud", HUD.smoke, e.x + e.w / 2, e.y + e.h - 10, 60, { life: .7, grow: .8 }); }
  } else if (e.ph === "gone" && songPos >= e.nextAt) {
    const foot = P.y + P.h, offs = [-140, 140, -175, 175, -105, 105]; if (Math.random() < .5) offs.reverse();
    for (const o of offs) { // stand on solid ground near the swordsman's feet, clear above
      const x = pcx + o, tx = Math.floor(x / T); let ty = Math.floor((foot - 4) / T);
      while (ty < LV.h && tileAt(tx, ty) !== 1) ty++;
      if (ty >= LV.h || Math.abs(ty * T - foot) > 3 * T || tileAt(tx, ty - 1) || tileAt(tx, ty - 2) || !los(x, ty * T - 20, pcx, pcy)) continue;
      e.x = x - e.w / 2; e.y = ty * T - e.h - .01; break;
    }
    e.face = Math.sign(pcx - (e.x + e.w / 2)) || 1; e.ph = "rise"; e.nextAt = (Math.floor(songPos / bl) + 1) * bl + (bl < .5 ? bl : 0);
    addFx("hud", HUD.smoke, e.x + e.w / 2, e.y + e.h - 10, 60, { life: .7, grow: .8 });
  } else if (e.ph === "rise" && songPos >= e.nextAt) {
    const ex = e.x + e.w / 2, zone = { x: e.face > 0 ? ex : ex - 78, y: e.y - 6, w: 78, h: e.h + 6 };
    addFx("fx", FX.slashARed, ex + e.face * 36, e.y + e.h / 2, 70, { life: .3, rot: e.face > 0 ? 0 : Math.PI });
    Music.sfx("slash"); e.swingT = .3;
    if (live && P.dashT <= 0 && !((P.invT || 0) > 0) && overlap(zone, P)) { lastHitDir = { x: e.face, y: -.2 }; die(); }
    e.ph = "idle"; e.nextAt = songPos + Math.max(3, Math.round(7 / fast)) * bl;
  }
  if (e.ph !== "gone") dashThrough(e);
}
// ---------- bosses ----------
// one guards 천고 at the end of 天鼓臺. All act on the beat: an act is chosen, wound up (telegraphed) until
// the next beat, then performed. A plain cut takes 1, an 일격 3 and staggers the boss out of its wind-up.
const BOSSES = {
  sumun: { name: "수문장", han: "守門將", hp: 8, w: 44, h: 84, draw: 124, sheet: "foes2", idle: F2.boss, atk: F2.bossUp, hit: F2.bossSlam, stag: F2.bossKneel, line: "천고를 지키는 장수가 길을 막는다.",
    pool: c => ["slam", "charge", ...(c >= 1 ? ["volley"] : []), ...(c >= 2 ? ["summon"] : [])] },
  gumiho: { name: "구미호", han: "九尾狐", hp: 8, w: 52, h: 44, draw: 84, sheet: "bossA", idle: 0, atk: 1, speed: 90, line: "아홉 꼬리가 달빛에 흔들린다.",
    pool: c => ["pounce", "foxfire", "pounce", "illusion", ...(c >= 1 ? ["foxfire"] : [])] },
  dokkaebi: { name: "도깨비", han: "鬼", hp: 10, w: 46, h: 80, draw: 120, sheet: "bossA", idle: 2, atk: 3, speed: 60, line: "방망이 소리가 뚝딱 울린다.",
    pool: c => ["club", "coins", "gamtu", ...(c >= 1 ? ["coins"] : [])] },
  imugi: { name: "이무기", han: "螭", hp: 8, w: 46, h: 90, draw: 134, sheet: "bossA", idle: 4, atk: 5, still: true, line: "용이 되지 못한 뱀이 땅 밑에서 운다.",
    pool: c => ["burst", "spit", ...(c >= 1 ? ["burst2"] : ["burst"])] },
  wongwi: { name: "원귀", han: "冤鬼", hp: 7, w: 34, h: 70, draw: 112, sheet: "bossA", idle: 6, atk: 7, fly: true, line: "흰 소복이 허공에 떠 있다.",
    pool: c => ["scream", "blink", "hair", ...(c >= 1 ? ["scream"] : [])] },
  jangseung: { name: "장승", han: "長丞", hp: 12, w: 64, h: 112, draw: 150, sheet: "bossA", idle: 8, atk: 8, still: true, line: "천하대장군과 지하여장군이 눈을 부릅뜬다.",
    pool: c => ["low", "high", "spirits", ...(c >= 1 ? ["lowhigh", "highlow"] : ["low"])] },
  haetae: { name: "해태", han: "獬豸", hp: 9, w: 70, h: 56, draw: 98, sheet: "bossB", idle: 0, atk: 1, speed: 70, line: "불을 먹는 짐승이 앞을 막는다.",
    pool: c => ["breath", "charge", "leap", ...(c >= 1 ? ["breath"] : [])] },
  bulgasari: { name: "불가사리", han: "不可殺", hp: 9, w: 72, h: 64, draw: 110, sheet: "bossB", idle: 2, atk: 3, speed: 40, armored: true, line: "쇠를 먹는 괴물. 보통 칼은 먹혀 버린다. 일섬과 간파만이 통한다.",
    pool: c => ["stomp", "inhale", "scrap", ...(c >= 1 ? ["stomp"] : [])] },
  baekho: { name: "백호", han: "白虎", hp: 8, w: 66, h: 46, draw: 86, sheet: "bossB", idle: 4, atk: 5, speed: 110, line: "산군이 내려왔다.",
    pool: c => ["leap", "claw", "roar", ...(c >= 1 ? ["leap"] : [])] },
  talchum: { name: "탈춤꾼", han: "假面", hp: 8, w: 28, h: 60, draw: 98, sheet: "bossB", idle: 6, atk: 7, speed: 80, line: "탈을 바꿔 쓸 때마다 다른 사람이 된다.",
    pool: c => ["fan", "dance", "mask", "fan", ...(c >= 1 ? ["fan2"] : [])] }
};
// extra poses on bossC/bossD: hurt (recoil) for everyone, plus a move or signature-move frame
const BOSS_POSE = {
  gumiho: { hurt: ["bossC", 1], move: ["bossC", 0] },
  dokkaebi: { hurt: ["bossC", 3], move: ["bossC", 2] },
  imugi: { hurt: ["bossC", 5], spec: ["bossC", 4] },
  wongwi: { hurt: ["bossC", 7], spec: ["bossC", 6] },
  jangseung: { hurt: ["bossD", 0], spec: ["bossC", 8] },
  haetae: { hurt: ["bossD", 2], spec: ["bossD", 1] },
  bulgasari: { hurt: ["bossD", 4], spec: ["bossD", 3] },
  baekho: { hurt: ["bossD", 6], spec: ["bossD", 5] },
  talchum: { hurt: ["bossD", 8], spec: ["bossD", 7] }
};
// 4-frame loops (bossE/bossF, one boss per row): walk/run cycles advance with distance, 원귀's drift with time
const cyc4 = (sh, r) => [0, 1, 2, 3].map(i => [sh, r * 4 + i]);
const BOSS_ANIM = { gumiho: cyc4("bossE", 0), dokkaebi: cyc4("bossE", 1), haetae: cyc4("bossE", 2), bulgasari: cyc4("bossE", 3), baekho: cyc4("bossF", 0), talchum: cyc4("bossF", 1), sumun: cyc4("bossF", 2), wongwi: cyc4("bossF", 3) };
const animK = {};
function animScale(kind) { // size a loop so its frames match the boss's idle painting (by area, since gaits stretch the outline)
  if (animK[kind]) return animK[kind];
  const B = BOSSES[kind], fr = BOSS_ANIM[kind], s0 = SPR[B.sheet]; if (!s0 || !fr.every(([sh]) => SPR[sh])) return 0;
  const i0 = s0.f[B.idle], a0 = Math.sqrt(i0.w * i0.h), a1 = fr.reduce((t, [sh, i]) => t + Math.sqrt(SPR[sh].f[i].w * SPR[sh].f[i].h), 0) / fr.length;
  return (animK[kind] = kOf(B.sheet, B.idle, B.draw) * a0 / a1 * (kind === "wongwi" ? 1 : .95));
}
const SHEET_SC = { bossA: 1.0241, bossB: .88235, bossC: 1, bossD: 1 };   // slicer scale per sheet, so poses from different sheets keep one size
Object.assign(BOSSES, {
  cheongo: { name: "천고의 주인", han: "天鼓主", hp: 26, w: 60, h: 100, draw: 156, sheet: "misc", idle: 0, atk: 1, stag: 2, speed: 35, line: "천고 앞에 북의 주인이 앉아 있다. 이름을 되찾은 자여, 북을 다시 울려라.",
    pool: c => ["drum", "coins", "low", "scream", "high", "summon", "drum", "lowhigh"] },
  shadow: { name: "그림자 무명", han: "影無名", hp: 12, w: 18, h: 30, draw: 64, sheet: "hero3", idle: 0, atk: 12, speed: 150, line: "삿갓 아래, 또 하나의 내가 서 있다.",
    pool: c => ["shblink", "shcut", "shdash", "shstrike"] }
});
function shadowBook() { const others = META.books.filter(b => !run || b.id !== run.book); return others.length ? others[(Math.random() * others.length) | 0] : null; }
const BOSS_ORDER = ["gumiho", "dokkaebi", "imugi", "wongwi", "jangseung", "haetae", "bulgasari", "baekho", "talchum"];
const MASKS = ["양반탈", "각시탈", "말뚝이탈"];
function bossFor(seed, cy, m) { // one guardian per turn, 수문장 first, then a run-seeded order of the rest
  const rnd = mulberry((seed ^ 0xB055) >>> 0), o = BOSS_ORDER.slice();
  for (let i = o.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [o[i], o[j]] = [o[j], o[i]]; }
  const full = [...o, "sumun"].sort(() => 0), k = cy;   // no fixed first guardian: 수문장 is shuffled in with the rest
  { const j = (rnd() * full.length) | 0; [full[0], full[j]] = [full[j], full[0]]; }
  return full[(k + Math.floor(k / 10) * 3) % 10];
}
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c % 28 ? a : b); };
// hazards: painted zones that turn deadly at songPos `at` until `end` (telegraphed before), and expanding rings
let haz = [];
function addHaz(kind, x, y, w, h, at, end) { const z = { kind, x, y, w, h, at, end, t0: songPos }; haz.push(z); return z; }
function hurtsPlayer() { return state === "play" && P.dashT <= 0 && !((P.invT || 0) > 0); }
function stepHazards() {
  for (const z of haz) {
    if (z.kind === "ring") {
      const r = (songPos - z.at) * z.speed; if (r < 0) continue;
      if (r > z.max) { z.done = true; continue; }
      const d = Math.hypot(P.x + P.w / 2 - z.x, P.y + P.h / 2 - z.y);
      if (hurtsPlayer() && Math.abs(d - r) < 14) { lastHitDir = { x: Math.sign(P.x - z.x) || 1, y: -.3 }; die(); }
      continue;
    }
    if (songPos > z.end) { z.done = true; continue; }
    if (songPos >= z.at && hurtsPlayer() && overlap(z, { x: P.x + 3, y: P.y + 3, w: P.w - 6, h: P.h - 6 })) { lastHitDir = { x: 0, y: -1 }; die(); }
  }
  haz = haz.filter(z => !z.done);
}
function bossFloor(e) { return e.floor; }
function leap(e, tx, t) { const g = 1900, ecx = e.x + e.w / 2; e.vx = (tx - ecx) / t; e.vy = -.5 * g * t; e.air = true; e.face = Math.sign(e.vx) || e.face; }
function summonHawks(e, n = 2) {
  const hp = 1, ecx = e.x + e.w / 2;
  for (let i = 0; i < n; i++) { const dx = (i - (n - 1) / 2) * 120; enemies.push({ hp, maxHp: hp, id: 9000 + Math.floor(Math.random() * 1e6), type: "d", x: ecx + dx, y: e.y - 60, w: 28, h: 20, vx: 0, vy: 0, hx: ecx + dx, hy: e.y - 60, t: Math.random() * 6, alive: true }); }
  Music.sfx("hook");
}
const slowShot = () => (1) * (upOn("tan") ? 1.3 : 1);
function aimShot(e, x, y, tx, ty, sp, o = {}) { const d = Math.hypot(tx - x, ty - y) || 1; bullets.push({ x, y, vx: (tx - x) / d * sp * slowShot(), vy: (ty - y) / d * sp * slowShot(), owner: e, friendly: false, life: 3, ...o }); }
function lob(e, x, y, tx, ty, t, o = {}) { const g = 900; bullets.push({ x, y, vx: (tx - x) / t, vy: (ty - y - .5 * g * t * t) / t, g, owner: e, friendly: false, life: 3, ...o }); }
function waves(e, sp) { const ecx = e.x + e.w / 2; for (const dir of [-1, 1]) bullets.push({ x: ecx + dir * (e.w / 2 + 8), y: e.floor - 12, vx: dir * sp, vy: 0, owner: e, friendly: false, life: 2.2, wave: true, noReflect: true }); }
// things decided the moment an act is chosen (so the telegraph can show where it will land)
function bossChoose(e, a, I) {
  const { pcx, bl, c } = I, f = e.floor, W = 1200;
  if (a === "burst" || a === "burst2") { e.hidden = true; e.tx = pcx; addHaz("pillar", pcx - 32, f - 160, 64, 160, e.hitAt, e.hitAt + .35); if (a === "burst2") { const x2 = pcx + (Math.random() < .5 ? -1 : 1) * 130; addHaz("pillar", x2 - 32, f - 160, 64, 160, e.hitAt + bl, e.hitAt + bl + .35); } addFx("hud", HUD.smoke, e.x + e.w / 2, f - 10, 90, { life: .8, grow: .8 }); }
  else if (a === "low" || a === "lowhigh") { addHaz("beam", e.x - W, f - 30, W * 2, 30, e.hitAt, e.hitAt + .3); if (a === "lowhigh") addHaz("beam", e.x - W, f - 140, W * 2, 102, e.hitAt + bl, e.hitAt + bl + .3); }
  else if (a === "high" || a === "highlow") { addHaz("beam", e.x - W, f - 140, W * 2, 102, e.hitAt, e.hitAt + .3); if (a === "highlow") addHaz("beam", e.x - W, f - 30, W * 2, 30, e.hitAt + bl, e.hitAt + bl + .3); }
  else if (a === "breath") { addHaz("fire", e.face > 0 ? e.x + e.w : e.x - 190, f - 64, 190, 64, e.hitAt, e.hitAt + bl).flip = e.face < 0; }
  else if (a === "hair") { const n = 3 + Math.min(2, c); for (let i = 0; i < n; i++) { const x = pcx + (i - (n - 1) / 2) * 85; addHaz("hair", x - 14, f - 120, 28, 120, e.hitAt + i * bl * .5, e.hitAt + i * bl * .5 + .3); } }
  else if (a === "coins") { const n = 5 + Math.min(3, c); for (let i = 0; i < n; i++) { const x = pcx + (i - (n - 1) / 2) * 64 + (Math.random() - .5) * 30, at = e.hitAt + bl * .5 + i * bl * .25; addHaz("coin", x - 16, f - 34, 32, 34, at, at + .14); } }
  else if (a === "inhale") e.suck = true;
  else if (a === "gamtu") { e.invisT = 2 * bl; toast("도깨비 감투 · 모습이 사라졌다"); }
  else if (a === "mask") { e.mask = ((e.mask || 0) + 1) % 3; toast(`탈을 바꿔 썼다 · ${MASKS[e.mask]}`); }
}
function bossPerform(e, a, I) {
  const { pcx, pcy, bl, c } = I, ecx = e.x + e.w / 2, f = e.floor;
  switch (a) {
    case "slam": case "club": { addFx("bvfx", BV.quake, ecx + e.face * 80, f - 18, 70, { life: .5, grow: .2, ay: .8 });
      const zone = { x: e.face > 0 ? ecx : ecx - 150, y: f - 70, w: 150, h: 70 };
      shake = 10; Music.sfx("kill"); addFx("hud", HUD.dust, ecx + e.face * 90, f, 90, { life: .5, ay: 1 });
      if (hurtsPlayer() && overlap(zone, P)) { lastHitDir = { x: e.face, y: -.5 }; die(null, 2); }
      if (c >= 1) waves(e, 360 + 30 * c); break; }
    case "charge": e.chargeT = e.kind === "haetae" ? .6 : .5; e.cv = e.kind === "haetae" ? 640 : 520 + 40 * c; Music.sfx("dash"); break;
    case "volley": { const n = c >= 3 ? 5 : 3, ang = Math.atan2(pcy - (e.y + 30), pcx - ecx), sp = 420 * (1 + .1 * c) * slowShot();
      for (let i = 0; i < n; i++) { const t = ang + (i - (n - 1) / 2) * .16; bullets.push({ x: ecx + e.face * 30, y: e.y + 30, vx: Math.cos(t) * sp, vy: Math.sin(t) * sp, owner: e, friendly: false, life: 3 }); }
      Music.sfx("shoot"); break; }
    case "summon": case "spirits": summonHawks(e, a === "spirits" && c >= 1 ? 3 : 2); break;
    case "pounce": leap(e, pcx, .55); Music.sfx("dash"); break;
    case "leap": leap(e, pcx, .6); Music.sfx("dash"); break;
    case "foxfire": { const n = 6 + 2 * Math.min(2, c); for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; bullets.push({ x: ecx, y: e.y + 10, vx: Math.cos(t) * 150 * slowShot(), vy: Math.sin(t) * 150 * slowShot(), owner: e, friendly: false, life: 4, orb: true, home: .9 }); } Music.sfx("hook"); break; }
    case "illusion": for (const dx of [-90, 90]) enemies.push({ hp: 1, maxHp: 1, id: 9000 + Math.floor(Math.random() * 1e6), type: "i", kind: "gumiho", x: ecx + dx - 20, y: f - 36, w: 40, h: 36, face: Math.sign(pcx - ecx - dx) || 1, life: 4, alive: true }); Music.sfx("hook"); break;
    case "coins": Music.sfx("clang"); break;
    case "gamtu": e.act = "club"; e.hitAt = (Math.floor(songPos / bl) + 2) * bl; return true;   // reappears swinging two beats later
    case "burst": case "burst2": e.hidden = false; e.emergeT = .6; e.x = e.tx - e.w / 2; e.y = f - e.h; e.face = Math.sign(pcx - e.tx) || e.face; shake = 10; Music.sfx("kill"); addFx("hud", HUD.dust, e.tx, f, 110, { life: .5, ay: 1 }); break;
    case "spit": for (const dx of [-70, 0, 70]) lob(e, ecx + e.face * 20, e.y + 16, pcx + dx, pcy, .9, { orb: true, water: true }); Music.sfx("shoot"); break;
    case "scream": addFx("bvfx", BV.ring, ecx, e.y + e.h / 2, 140, { life: .6, grow: 1.4, a: .8 }); haz.push({ kind: "ring", x: ecx, y: e.y + e.h / 2, at: songPos, speed: 300, max: 560 }); if (c >= 2) haz.push({ kind: "ring", x: ecx, y: e.y + e.h / 2, at: songPos + bl * .5, speed: 300, max: 560 }); shake = 6; Music.sfx("die"); break;
    case "blink": { const side = Math.random() < .5 ? -1 : 1; e.x = pcx + side * 190 - e.w / 2; e.y = f - 95 - e.h / 2; e.face = -side; addFx("hud", HUD.smoke, e.x + e.w / 2, e.y + e.h / 2, 70, { life: .6 });
      const dx = pcx - (e.x + e.w / 2), dy = pcy - (e.y + e.h / 2), d = Math.hypot(dx, dy) || 1; e.swoopT = .55; e.svx = dx / d * 480; e.svy = dy / d * 480; Music.sfx("dash"); break; }
    case "low": case "high": case "lowhigh": case "highlow": case "hair": Music.sfx("strike"); shake = 5; break;
    case "breath": Music.sfx("snipe"); if (c >= 1) addHaz("fire", e.face > 0 ? e.x + e.w + 150 : e.x - 230, f - 22, 80, 22, songPos + bl, songPos + bl * 3); break;
    case "stomp": addFx("bvfx", BV.quake, ecx, f - 18, 80, { life: .55, grow: .25, ay: .8 }); shake = 12; Music.sfx("kill"); waves(e, 340 + 30 * c); if (hurtsPlayer() && Math.abs(pcx - ecx) < e.w / 2 + 50 && P.y + P.h > f - 40) { lastHitDir = { x: Math.sign(pcx - ecx) || 1, y: -.6 }; die(null, 2); } break;
    case "inhale": { e.suck = false; const zone = { x: e.face > 0 ? ecx : ecx - 110, y: f - 70, w: 110, h: 70 }; Music.sfx("kill"); if (hurtsPlayer() && overlap(zone, P)) { lastHitDir = { x: e.face, y: -.3 }; die(null, 2); } break; }
    case "scrap": for (let i = 0; i < 5; i++) lob(e, ecx + e.face * 30, e.y + 10, pcx + (i - 2) * 55, f - 10, .8 + i * .05, { scrap: true }); Music.sfx("shoot"); break;
    case "claw": addFx("bvfx", BV.crescent, ecx + e.face * 60, f - 34, 90, { life: .3, flip: e.face < 0, grow: .2 }); for (let i = 0; i < 3; i++) { const at = songPos + i * bl * .5; addHaz("claw", e.face > 0 ? ecx + 10 : ecx - 120, f - 64, 110, 64, at, at + .15); } Music.sfx("slash"); break;
    case "roar": addFx("bvfx", BV.ring, ecx, e.y + e.h / 2, 140, { life: .6, grow: 1.4, a: .8 }); shake = 14; Music.sfx("die"); if (Math.abs(pcx - ecx) < 360) { P.vx = Math.sign(pcx - ecx || 1) * 560; P.dashCd = Math.max(P.dashCd, bl * 1.5); } break;   // the roar only pushes you back — it does not wound
    case "fan": case "fan2": { const n = a === "fan2" || e.mask === 2 ? 2 : 1;
      for (let i = 0; i < n; i++) { const ang = Math.atan2(pcy - (e.y + 20), pcx - ecx) + (n > 1 ? (i - .5) * .5 : 0), sp = 430 * slowShot(); bullets.push({ x: ecx + e.face * 16, y: e.y + 20, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, owner: e, friendly: false, life: 3.5, fan: true, boom: .7, t: 0 }); }
      Music.sfx("slash"); break; }
    case "dance": e.danceT = 2 * bl; Music.sfx("dash"); break;
    case "drum": // 천고의 주인 strikes its own drum: two rings and a ground wave addFx("bvfx", BV.ring, ecx, e.y + e.h / 2, 140, { life: .6, grow: 1.4, a: .8 });
      haz.push({ kind: "ring", x: ecx, y: e.y + e.h / 2, at: songPos, speed: 280, max: 620 }, { kind: "ring", x: ecx, y: e.y + e.h / 2, at: songPos + bl, speed: 280, max: 620 });
      waves(e, 340 + 25 * c); shake = 12; Music.jing(); break;
    case "shblink": { const side = Math.random() < .5 ? -1 : 1, nx = pcx + side * 60 - e.w / 2; if (!rectSolid(nx, e.y, e.w, e.h)) e.x = nx; e.face = -side; addFx("perkfx", PF.clone, ecx, f, 60, { life: .3, ay: 1, a: .5 });
      e.act = "shcut"; e.hitAt = (Math.floor(songPos / bl) + 1) * bl; return true; }
    case "shcut": case "shstrike": { const w = a === "shstrike" ? 120 : 70, zone = { x: e.face > 0 ? ecx : ecx - w, y: e.y - 20, w, h: e.h + 30 };
      addFx("slashfx", a === "shstrike" ? SF.arcRed : SF.arc, ecx + e.face * w / 2, e.y + e.h / 2, a === "shstrike" ? 90 : 60, { life: .25, flip: e.face < 0 }); Music.sfx(a === "shstrike" ? "strike" : "slash");
      if (hurtsPlayer() && overlap(zone, P)) { lastHitDir = { x: e.face, y: -.3 }; die(null, a === "shstrike" ? 2 : 1); } break; }
    case "shdash": e.chargeT = .28; e.cv = 760; Music.sfx("dash"); break;
  }
  return false;
}
const MELEE_ACT = new Set(["slam", "club", "claw", "stomp", "inhale", "shcut", "shblink", "dance", "charge", "pounce", "shdash"]), CLOSER_ACT = new Set(["leap", "pounce", "charge", "blink", "shblink", "shdash", "burst", "burst2", "dance"]),
  DELAYABLE = new Set(["slam", "club", "claw", "stomp", "inhale", "shcut", "shstrike", "low", "high", "breath"]);
function bossPick(e, pool, dist) { // weighted, read from the distance: close blows up close, reaching ones from afar, and no turtling at range
  e.rng = e.rng || mulberry((((run && run.seed) || 1) ^ hashStr(e.kind) ^ ((run && run.cycle) || 0) * 977) >>> 0);
  const ws = pool.map(m => { let w = 1; if (MELEE_ACT.has(m)) w *= dist < 230 ? 2.2 : .45; else w *= dist > 260 ? 1.5 : .85;
    if ((e.farT || 0) > 2.2 && CLOSER_ACT.has(m)) w *= 4; if (m === e.lastAct) w *= .3; if (m === e.lastAct && m === e.prevAct) w = 0; return w; });
  let r = e.rng() * ws.reduce((a, b) => a + b, 0), a = pool[0]; for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) { a = pool[i]; break; } }
  e.prevAct = e.lastAct; if (CLOSER_ACT.has(a)) e.farT = 0; return a;
}
function stepBoss(e, dt, pcx, pcy, dist, live) {
  e.farT = dist > 300 ? (e.farT || 0) + dt : 0;
  const B = BOSSES[e.kind], bl = Music.beatLen, c = cyc() + 1, I = { pcx, pcy, bl, c };   // guardians fight one tier above the turn
  e.emergeT = Math.max(0, (e.emergeT || 0) - dt); e.stagT = Math.max(0, (e.stagT || 0) - dt); e.swingT = Math.max(0, (e.swingT || 0) - dt); e.walkT = Math.max(0, (e.walkT || 0) - dt); e.landT = Math.max(0, (e.landT || 0) - dt); e.turnT = Math.max(0, (e.turnT || 0) - dt); e.invisT = Math.max(0, (e.invisT || 0) - dt);
  if (!e.awake) { if (!(live && dist < 470)) return; e.awake = true; Music.jing(); e.fightBreath = run.breath; sealArena(e, true); e.hpShow = e.hp;
    const seen = (LV.introSeen = LV.introSeen || new Set()).has(e.kind); LV.introSeen.add(e.kind);
    if (!seen && mode !== "tutorial") bossIntro = { t: 0, e }; else toast(josa(B.name, "이", "가") + " 길을 막는다");
    e.nextAt = (Math.floor(songPos / bl) + 2) * bl + (bossIntro ? 1.7 : 0); }
  let ecx = e.x + e.w / 2;
  const deadly = () => { if (live && hurtsPlayer() && overlap(e, P)) { lastHitDir = { x: Math.sign(pcx - ecx) || 1, y: -.3 }; die(null, e.raged ? 2 : 1); } };   // a charging guardian hits harder once enraged
  if (e.air) { // leaping: arc under gravity, deadly on contact, shake on landing
    e.vy += 1900 * dt; moveX(e, e.vx * dt);
    if (moveY(e, e.vy * dt) && e.vy > 0) { e.air = false; e.vx = 0; e.vy = 0; e.landT = .22; e.mv = 0; shake = 8; addFx("bvfx", BV.quake, e.x + e.w / 2, e.floor - 16, 60, { life: .45, grow: .2, ay: .8 }); addFx("hud", HUD.dust, e.x + e.w / 2, e.y + e.h, 80, { life: .4, ay: 1 });
      if (e.kind === "baekho") addHaz("claw", e.x - 50, e.y + e.h - 60, e.w + 100, 60, songPos, songPos + .12);
      if (e.kind === "haetae") { addHaz("fire", e.x - 40, e.floor - 22, e.w + 80, 22, songPos, songPos + bl * 1.5); if (c >= 1) waves(e, 330); }
      if (e.kind === "gumiho" && c >= 1) for (let i = 0; i < 4; i++) { const t = -Math.PI * (i + .5) / 4; bullets.push({ x: e.x + e.w / 2, y: e.y + 10, vx: Math.cos(t) * 170, vy: Math.sin(t) * 170, owner: e, friendly: false, life: 3, orb: true, home: .6 }); }
    }
    if (e.y > LV.h * T) { e.y = e.floor - e.h; e.air = false; }
    deadly();
  } else if (e.chargeT > 0) {
    e.chargeT -= dt; const ahead = ecx + e.face * (e.w / 2 + 4);
    if (!groundPt(ahead, e.y + e.h + 4) || moveX(e, e.face * e.cv * dt)) { if (e.kind === "haetae" && !e.bounced) { e.bounced = true; e.face = -e.face; } else e.chargeT = 0; }
    if (e.chargeT <= 0) e.bounced = false;
    deadly();
  } else if (e.swoopT > 0) { // 원귀's dive
    e.swoopT -= dt; e.x += e.svx * dt; e.y = Math.min(e.floor - e.h, e.y + e.svy * dt); deadly();
  } else if (e.danceT > 0) { // 탈춤꾼 spins toward you, step by step
    e.danceT -= dt; e.face = Math.sign(pcx - ecx) || e.face; const ahead = ecx + e.face * (e.w / 2 + 4);
    if (groundPt(ahead, e.y + e.h + 4)) moveX(e, e.face * (e.mask === 1 ? 300 : 220) * dt); deadly();
  } else if (!e.act) {
    if (e.stagT <= 0 && !e.hidden) { const want = Math.sign(pcx - ecx) || e.face;   // it turns only once you have stayed behind it a moment, and the turn takes a beat
      if (want !== e.face && Math.abs(pcx - ecx) > 24) { if ((e.turnWait = (e.turnWait || 0) + dt) > .2) { e.face = want; e.turnT = .16; e.turnWait = 0; e.mv = (e.mv || 0) * .3; } } else e.turnWait = 0; }
    if (B.fly && !e.hidden) { // hover a little way off, bobbing — eased, never on rails
      const tx = pcx - e.face * 200, ty = e.floor - 95 - e.h / 2 + Math.sin(songPos * 2) * 14, f = Math.min(1, dt * 2.4);
      e.fvx = (e.fvx || 0) + (Math.max(-160, Math.min(160, (tx - ecx) * 2)) - (e.fvx || 0)) * f; e.fvy = (e.fvy || 0) + (Math.max(-130, Math.min(130, (ty - (e.y + e.h / 2)) * 2)) - (e.fvy || 0)) * f;
      e.x += e.fvx * dt; e.y += e.fvy * dt;
    } else if (!B.still) {   // walking eases in and out instead of starting and stopping dead
      const sp = (B.speed || 55) * 1.25 * (e.hp <= e.maxHp / 2 ? 1.3 : 1) * (e.invisT > 0 ? 2 : 1) * (e.mask === 1 ? 1.6 : 1) + 10 * c, go = dist > 110 && e.stagT <= 0 && !(e.turnT > 0) && !(e.landT > 0);
      e.mv = (e.mv || 0) + Math.max(-sp * 4 * dt, Math.min(sp * 4 * dt, (go ? sp : 0) - (e.mv || 0)));
      const ahead = ecx + e.face * (e.w / 2 + 4);
      if (e.mv > 4 && groundPt(ahead, e.y + e.h + 4) && !solidPt(ahead, e.y + e.h - 10)) { moveX(e, e.face * e.mv * dt); e.walkT = .12; e.wph = (e.wph || 0) + e.mv * dt / Math.max(22, e.w * .55); } else if (!go) e.mv = Math.max(0, e.mv - sp * 6 * dt); else e.mv = 0;
    }
    if (live && songPos >= e.nextAt && e.stagT <= 0) {
      if (!e.raged && e.hp <= e.maxHp / 2) { e.raged = true; roar = { t: 0, e }; P.focus = false; Music.muffle(false); P.dashT = 0; P.invT = Math.max(P.invT || 0, 2.2); for (const b of bullets) if (!b.friendly) b.life = 0; haz = haz.filter(z => z.at > songPos + 2); shake = 14; Music.sfx("roar");   // no harm comes while it roars
        for (let i = 0; i < 3; i++) bleed(ecx + (i - 1) * 24, e.y + 20 + i * 10, { x: i - 1, y: -.5 }, true); }
      const pool = e.raged || cyc() >= 2 /* from the third turn a guardian knows all its moves */ ? [...B.pool(c), ...(RAGE_ADD[e.kind] || [])] : B.pool(c); let a = bossPick(e, pool, dist);
      if ((a === "slam" || a === "club" || a === "inhale") && dist > 280) a = e.kind === "sumun" ? (c >= 1 ? "volley" : "charge") : e.kind === "dokkaebi" ? "coins" : "scrap";
      if (a === "claw" && dist > 200) a = "leap";
      e.act = a; e.hitAt = (Math.floor(songPos / bl) + 1) * bl; if (e.hitAt - songPos < .45) e.hitAt += bl; e.actFrom = songPos;
      if (DELAYABLE.has(a) && e.rng() < (e.raged ? .45 : .25)) e.hitAt += bl * .5;   // a held swing: the blow waits half a beat longer than the eye expects
      bossChoose(e, a, I);
    }
  } else {
    if (e.suck && live && P.dashT <= 0) P.vx += Math.sign(ecx - pcx) * 1100 * dt;   // 불가사리 breathes in
    if (songPos >= e.hitAt) {
      const a = e.act; e.act = null; e.swingT = .35; e.lastAct = a;
      const rage = e.raged || e.hp <= e.maxHp / 2, gap = Math.max(1, 2 - (c >> 1) - (e.mask === 1 ? 1 : 0) - (rage ? 1 : 0) + (e.kind === "jangseung" ? 1 : 0));
      if (!bossPerform(e, a, I)) {   // strings of blows, then an opening: a guardian is punished in its recovery, not mid-string
        if (e.comboLeft > 0) { e.comboLeft--; e.nextAt = e.hitAt + bl * .5; }
        else { e.nextAt = e.hitAt + (gap + 1) * bl; e.recoverUntil = e.nextAt; const rg = e.raged || e.hp <= e.maxHp / 2; e.comboLeft = rg ? (e.rng() < .35 ? 3 : e.rng() < .7 ? 2 : 1) : (e.rng() < .3 ? 2 : e.rng() < .65 ? 1 : 0); } }
    }
  }
  ecx = e.x + e.w / 2;
  if (live && !e.hidden && !e.air && !(e.chargeT > 0) && !(e.swoopT > 0) && !(e.danceT > 0) && overlap(e, P) && P.dashT <= 0) { P.vx = Math.sign(pcx - ecx || 1) * 320; if (!P.onGround) P.vy = Math.min(P.vy, -120); }   // bulk shoves you back
  if (!e.hidden) dashThrough(e);
}
// 구미호's illusions: run at you, vanish after a few seconds or one cut
function stepIllusion(e, dt, pcx, live) {
  e.life -= dt; if (e.life <= 0) { e.alive = false; addFx("hud", HUD.smoke, e.x + e.w / 2, e.y + e.h / 2, 50, { life: .5 }); return; }
  e.face = Math.sign(pcx - (e.x + e.w / 2)) || e.face; const ahead = e.x + e.w / 2 + e.face * 24;
  if (groundPt(ahead, e.y + e.h + 4)) moveX(e, e.face * 230 * dt);
  if (live && hurtsPlayer() && overlap(e, P)) { lastHitDir = { x: e.face, y: -.3 }; die(); }
  dashThrough(e);
}
function muzzle(e) { return e.type === "s" ? [e.x + e.w / 2 + e.face * 34, e.y + 17] : [e.x + e.w / 2 + e.face * 32, e.y + 6]; }
function cutDrum(d) {
  run.cutDrums.push(d.id); saveRun();
  addFx("hud", HUD.spark, d.x, d.y - 20, 70, { life: .5 }); seals.push({ x: d.x, y: d.y - 30, t: 0, rot: -.1 });
  Music.sfx("strike"); Music.jing(); shake = 8; hitstop = .12; buzz(30);
  if (mode !== "tutorial") { questEvent("cut"); gainStroke("cut"); }
  if (run.endingDue) { state = "result"; Music.stop(); setTimeout(showEnding, 700); return; }
  if (run.tower) { towerNext(); return; }
  run.choosing = "enlight"; saveRun();
  state = "result"; Music.stop(); setTimeout(() => enlighten(), 700);
}
function drumsInPlay() { return mode === "tutorial" || !LV.drums ? [] : LV.drums.filter(d => !(run.cutDrums || []).includes(d.id)); }
function slashHits() {
  if (P.slashT <= 0) return;
  if (!bossAlive()) for (const d of drumsInPlay()) { const cx = P.x + P.w / 2 + P.slashDir.x * 26, cy = P.y + P.h / 2 + P.slashDir.y * 26; if (Math.abs(cx - d.x) < 52 + (d.big ? 20 : 0) && cy > d.y - d.h - 24 && cy < d.y + 10) cutDrum(d); }
  const WP = WEAPONS[wpn()];
  if (P.whiff) return;
  let R = (P.strike ? 54 * (1) : 40) * (1) * ((1)) + (0); let reach = (P.strike ? 30 : 26) + (0);
  R *= WP.R * (1) * (oath("hyeon") ? 1.2 : 1) * (P.strike && oath("goyo2") ? 2.5 : 1); reach += WP.reach + (0);
  if (P.flowBig) R *= 1.7;
  if (wrule() === "woldo" && has("wd_b2") && !P.onGround) { R *= 1 + .25 * Math.min(4, P.pogoN || 0); if ((P.pogoN || 0) >= 2) P.strike = true; }   // 연속낙
  if (wrule() === "woldo" && has("wd_c1")) { R *= 1.25; reach += 18; }   // 장창세
  if (oath("jilpung2")) R *= .7; if (oath("geommu")) R *= P.danceRest ? .5 : 1 + .2 * (P.dance || 0);
  if (chr("munyeo")) R *= .85; if (chr("posu")) { R *= .75; reach += 24; }
  ;
  const spin = (false) || !!WP.ring || P.spinCut, cx = P.x + P.w / 2 + (spin ? 0 : P.slashDir.x * reach), cy = P.y + P.h / 2 + (spin ? 0 : P.slashDir.y * reach);
  if (spin) R *= 1.35;
  const moon = P.strike && false && !chr("munyeo") && !chr("posu"); if (moon) R *= 2;
  const bx2 = P.x + P.w / 2 - P.slashDir.x * reach, by2 = P.y + P.h / 2 - P.slashDir.y * reach, back = moon && false;
  for (const e of enemies) {
    if (!e.alive || ghostly(e)) continue;
    const ex = Math.max(e.x, Math.min(cx, e.x + e.w)), ey = Math.max(e.y, Math.min(cy, e.y + e.h)), ex2 = Math.max(e.x, Math.min(bx2, e.x + e.w)), ey2 = Math.max(e.y, Math.min(by2, e.y + e.h));
    if (Math.hypot(ex - cx, ey - cy) >= R && !(back && Math.hypot(ex2 - bx2, ey2 - by2) < R)) continue;
    if (moon) e.stunT = Math.max(e.stunT || 0, (.5) * (e.type === "b" ? .35 : 1));
    if (P.strike && false && e.type !== "b") e.stunT = Math.max(e.stunT || 0, .45);
    if (wk() === "woldo" && e.type !== "b" && e.type !== "d") { const kx = Math.sign(e.x + e.w / 2 - P.x - P.w / 2), hitWall = moveX(e, kx * (has("wd_c1") ? 64 : 34));
      if (has("wd_c2") && (hitWall || enemies.some(o => o !== e && o.alive && Math.abs(o.x - e.x) < 26 && Math.abs(o.y - e.y) < 30))) { e.stunT = Math.max(e.stunT || 0, 1); addFx("wfx", WF2.burst, e.x + e.w / 2, e.y + e.h / 2, 40, { life: .3 }); } }   // 참마
    ;
    if (!P.strike && !isFlashing(e) && ((e.type === "h" && true && Math.sign(P.x + P.w / 2 - (e.x + e.w / 2)) === e.face) || (e.type === "k" && !isGun()))) { if (!P.clanged.has(e.id)) { P.clanged.add(e.id); clang(e); } continue; }   // the shield only covers his front
    if (P.hitSet && P.hitSet.has(e.id)) continue;   // one hit per swing
    if (P.hitSet) P.hitSet.add(e.id);
    if (P.strike) seals.push({ x: e.x + e.w / 2, y: e.y + 6, t: 0, rot: (Math.random() - .5) * 0.4 });
    addFx("perkfx", P.strike ? PF.spark : PF.splash, e.x + e.w / 2, e.y + e.h / 2, P.strike ? 46 : 34, { life: .22, rot: Math.random() * 6.28, grow: .5 });
    const kan0 = isFlashing(e); hurtEnemy(e, P.strike || (P.bayoLunge && isGun()));   // 단화: one who is aiming falls to any cut
    if (isGun()) { gunReload(has("jc_c1") ? 2 : 1); if (!e.alive && has("jc_c2")) P.nextFull = true; }   // 총검: a bayonet that bites reloads
    if (kan0 && wrule() === "hwando" && !P.countered) counterCut(e);   // 받아치기
    if (wrule() === "hwando" && !P.onGround && !P.airCutUsed) { P.airCutUsed = true; regainAir(); }   // 연격: once in each flight a plain cut in the air wins the air back
    if (wrule() === "ssang") { P.gise = songPos - (P.giseAt ?? -9) < (has("ss_c2") ? 3 : .8) ? Math.min(5, (P.gise || 0) + 1) : 1; P.giseAt = songPos; if (P.gise >= 5 && has("ss_a1") && !frenzy()) { P.frenzyUntil = songPos + 3; popText(P.x + P.w / 2, P.y - 26, "폭주"); Music.sfx("strike"); } }   // 기세 (→ 폭주)
    if (wrule() === "woldo" && !P.onGround && P.slashDir.y > .5) pogo();   // 내려베기
    if (P.strike && res("noe", 4) && !P.boltArc) { P.boltArc = true; const n = nearestFoes(e.x + e.w / 2, e.y + e.h / 2, 2, 190).find(o => o !== e);   // 뇌 공명: a spark leaps from the cut
      if (n) { boltFx(e.x + e.w / 2, e.y + e.h / 2, n.x + n.w / 2, n.y + n.h / 2, .28, 14); n.stunT = Math.max(n.stunT || 0, n.type === "b" ? .2 : .7); hurtEnemy(n, false); } }
    if (!P.onGround && res("pung", 4) && !P.windBack) { P.windBack = true; P.djN = 0; P.airDash = Math.max(P.airDash, baseAir()); P.wallBonus = 1; addFx("perkfx", PF.wind, P.x + P.w / 2, P.y + P.h / 2, 70, { life: .35, grow: .5, a: .8 }); }
  }
  for (const g of LV.targets) if (g.t <= 0 && Math.hypot(g.x - cx, g.y - cy) < R + 10) {   // the basic cut on a 과녁: only the 장단 on the beat, or a 내려베기
    if (wrule() === "hwando" && !P.onGround) breakTarget(g); else if (wrule() === "woldo" && !P.onGround && P.slashDir.y > .5) { breakTarget(g); pogo(); } }
  for (const b of bullets) {
    if (b.friendly || b.noReflect || Math.hypot(b.x - cx, b.y - cy) >= R + 8) continue;
    { const tti = Math.hypot(b.x - P.x - P.w / 2, b.y - P.y - P.h / 2) / (Math.hypot(b.vx, b.vy) || 1);   // 정밀 튕기기: only a cut in the last instant turns it back
      if (!(tti < (chr("munyeo") ? .3 : .15) * (has("d_reflect") ? 2 : 1) * (wrule() === "hwando" ? 1.5 : 1) || P.strike)) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 18, { life: .2 }); continue; }
      addFx("mech", MECH.deflect, b.x, b.y, 54, { life: .25, grow: .3 }); addQi(4); }
    if (wrule() === "woldo" && !P.onGround && P.slashDir.y > .5) pogo();
    b.friendly = true; b.pierce = P.strike || has("d_reflect"); if (has("d_reflect")) b.strike = true; if (has("hw_c1")) b.seek = 8; if (has("hw_c2")) { b.blast = 52; b.pierce = false; } b.life = 3; b.g = 0; b.home = 0; b.boom = 0;
    const sp = Math.max(700, Math.hypot(b.vx, b.vy) * (1.1)) * (chr("munyeo") ? 2 : 1), o = b.owner; if (chr("munyeo")) { b.pierce = true; b.strike = P.strike; } ;
    if (o && o.alive) { const dx = o.x + o.w / 2 - b.x, dy = o.y + o.h / 2 - b.y, d = Math.hypot(dx, dy) || 1; b.vx = dx / d * sp; b.vy = dy / d * sp; }
    else { b.vx = P.slashDir.x * sp; b.vy = P.slashDir.y * sp; }
    ;
    Music.sfx("reflect"); hitstop = Math.max(hitstop, 0.04);
    for (let i = 0; i < 6; i++) parts.push({ x: b.x, y: b.y, vx: (Math.random() - .5) * 300, vy: (Math.random() - .5) * 300, life: .25, max: .25, c: JJOK, s: 2 });
  }
}
function stepBullets(dt) {
  const pr = { x: P.x + 3, y: P.y + 3, w: P.w - 6, h: P.h - 6 };
  for (const b of bullets) {
    b.t = (b.t || 0) + dt;
    if (b.g) b.vy += b.g * dt;
    if (b.dragon && false && (b.fd = (b.fd || 0) + Math.abs(b.vx) * dt) > 50) { b.fd = 0; bullets.push({ x: b.x, y: b.y + 14, vx: 0, vy: 0, friendly: true, fire: true, pierce: true, life: .8, owner: null }); }
    if (b.seek && b.friendly) { const t = nearestFoes(b.x, b.y, 1, 420)[0]; if (t) { const a = Math.atan2(b.vy, b.vx), want = Math.atan2(t.y + t.h / 2 - b.y, t.x + t.w / 2 - b.x), sp = Math.hypot(b.vx, b.vy); let dd = want - a; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); const na = a + Math.max(-b.seek * dt, Math.min(b.seek * dt, dd)); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; } }
    if (b.tornado) for (const o of bullets) if (!o.friendly && o.life > 0 && Math.hypot(o.x - b.x, o.y - b.y) < (b.big ? 64 : 38)) { o.life = 0; if (has("m_wind")) addQi(2); addFx("hud", HUD.spark, o.x, o.y, 20, { life: .2 }); }
    if (b.home && !b.friendly && state === "play") { const a = Math.atan2(b.vy, b.vx), want = Math.atan2(P.y + P.h / 2 - b.y, P.x + P.w / 2 - b.x), sp = Math.hypot(b.vx, b.vy); let d = want - a; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = a + Math.max(-b.home * dt, Math.min(b.home * dt, d)); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
    if (b.boom && !b.friendly && b.t > b.boom && b.owner && b.owner.alive) { // the fan curves back to the dancer's hand
      const o = b.owner, dx = o.x + o.w / 2 - b.x, dy = o.y + 20 - b.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(b.vx, b.vy);
      b.vx += (dx / d * sp - b.vx) * Math.min(1, dt * 4); b.vy += (dy / d * sp - b.vy) * Math.min(1, dt * 4); if (d < 24) b.life = 0;
    }
    const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 8));
    for (let i = 0; i < n && b.life > 0; i++) {
      const bk = !b.friendly && bulletHold > 0 ? 0 : !b.friendly && P && P.focus ? (simb("yeong") ? 1.4 : 2.6) : 1;   // the aim slows the world, but shots still close in (정지 · 영심법 hold them back)
      b.x += b.vx * dt / n * bk; b.y += b.vy * dt / n * bk;
      if (solidPt(b.x, b.y) && b.cannon && b.bounces > 0) { b.bounces--; blast(b.x, b.y - 6, b.blast * .7, b.strike, { core: b.core }); b.x -= b.vx * dt / n; b.y -= b.vy * dt / n; b.vy = -Math.abs(b.vy) * .55; b.vx *= .8; continue; }   // 도탄포: it skips once, bursting
      if (solidPt(b.x, b.y) && !(b.fan && !b.friendly)) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 22, { life: .25, rot: Math.random() * 6.28 }); break; }
      if (b.friendly) {
        if (!b.noHit) for (const e of enemies) if (e.alive && !ghostly(e) && b.x > e.x - (b.r || 0) && b.x < e.x + e.w + (b.r || 0) && b.y > e.y - (b.r || 0) && b.y < e.y + e.h + (b.r || 0)) {
          if (b.hits && b.hits.has(e.id)) continue;
          if (b.blast) { b.life = 0; break; }   // rockets and balls burst on the first body
          if (b.petOrb) { hurtEnemy(e, petStrike() && e.type !== "b", "pet"); addFx("pet", b.petFr || 26, b.x, b.y, 36, { life: .3 }); (b.hits = b.hits || new Set()).add(e.id); if (!b.pierce) b.life = 0; break; }
          if (e.type === "h" && Math.sign(b.vx) === -e.face && !b.pierce && !isGun()) { b.life = 0; Music.sfx("clang"); break; }
          (b.hits = b.hits || new Set()).add(e.id); if (b.neok || b.talisman) e.stunT = Math.max(e.stunT || 0, e.type === "b" ? .25 : b.neok ? 1.4 : .5); if (b.talisman && has("m_talis") && e.alive) e.openT = songPos + .8; if (b.talisman && SPR.mfx) addFx("mfx", 2, e.x + e.w / 2, e.y + e.h / 2, 54, { life: .3, grow: .4, ay: .5 }); hurtEnemy(e, !!b.strike || (b.pierce && !b.wind && !b.fire && !b.tornado && !b.dragon && !b.sword)); if (!b.pierce) b.life = 0;
          if ((b.sword && false) || (b.dragon && false)) P.airDash = Math.max(P.airDash, baseAir());
          if (b.sword && false) { const o = nearestFoes(e.x + e.w / 2, e.y + e.h / 2, 2, 260).find(o => o !== e); if (o) { beams.push({ x0: e.x + e.w / 2, y0: e.y + e.h / 2, x1: o.x + o.w / 2, y1: o.y + o.h / 2, t: 0, life: .2 }); hurtEnemy(o, false); } }
        }
      } else if (state === "play" && !(false) && !((P.invT || 0) > 0) && b.x > pr.x - 3 && b.x < pr.x + pr.w + 3 && b.y > pr.y - 3 && b.y < pr.y + pr.h + 3) {
        if (P.ward) { P.ward = false; b.life = 0; addFx("slashfx", SF.guard, P.x + P.w / 2, P.y + P.h / 2, 70, { life: .35, grow: .6 }); Music.sfx("clang");   // 수호령 takes it
          ;
          ;
          break; }
        ;
        if ((has("hw_c3")) && P.focus && !b.noReflect) { // 천라지망: the shot turns back on its shooter
          const o = b.owner, sp = Math.hypot(b.vx, b.vy) * 1.3; b.friendly = true; b.pierce = true; b.life = 3;
          if (o && o.alive) { const dx = o.x + o.w / 2 - b.x, dy = o.y + o.h / 2 - b.y, d = Math.hypot(dx, dy) || 1; b.vx = dx / d * sp; b.vy = dy / d * sp; } else { b.vx = -b.vx; b.vy = -b.vy; }
          if (has("hw_c3") && Math.random() < .5) ougiArt(["ogA", 2], b.x, b.y, 70, { life: .3, rot: Math.atan2(b.vy, b.vx) });
          Music.sfx("reflect"); break;
        }
        const sp = Math.hypot(b.vx, b.vy) || 1; lastHitDir = { x: b.vx / sp, y: b.vy / sp }; P.hitBy = { shot: b }; die(); b.life = 0; }
    }
    b.life -= dt;
  }
  for (const b of bullets) if (b.blast && b.life <= 0 && !b.blown) { b.blown = true;   // the burst: rockets, cannon balls, turned shots that carry powder
    blast(b.x, b.y, b.blast, b.strike, { core: b.core, clear: b.rocket && has("sg_c3"), fire: b.rocket && has("sg_c2") ? 1.5 : 0 });
    if (b.rocket && has("sg_a2") && !b.split) for (const t of [-.6, 0, .6]) { const a = Math.atan2(b.vy, b.vx) + Math.PI + t; bullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 - 80, friendly: true, rocket: true, split: true, seek: 6, blast: 26, life: .9, owner: null, r: 6 }); }   // 분열
    if (b.cannon && has("cj_a3")) for (const e of enemies) if (e.alive && Math.abs(e.x + e.w / 2 - b.x) < 240 && Math.abs(e.y + e.h - b.y) < 70) { hurtEnemy(e, e.type !== "b"); addFx("wfx", WF2.quake, e.x + e.w / 2, e.y + e.h + 4, 50, { life: .4, ay: 1 }); } if (b.cannon && has("cj_a3")) ougiArt(["ogB", 9], b.x, b.y + 10, 200, { life: .5, ay: 1 }); }   // 천지포
  bullets = bullets.filter(b => b.life > 0);
  for (const f of pfires) if (songPos < f.until && (f.tick -= dt) <= 0) { f.tick = .4; for (const e of enemies) if (e.alive && !ghostly(e) && overlap(e, f)) hurtEnemy(e, false); }   // your own fire burns foes, never you
  pfires = pfires.filter(f => songPos < f.until);
}

// ---------- loop ----------
let last = performance.now(), cvInverted = false;
const GPU_SOFT = (() => { try { const g = document.createElement("canvas").getContext("webgl"), d = g && g.getExtension("WEBGL_debug_renderer_info"); return !!(d && /swiftshader|llvmpipe|software/i.test(g.getParameter(d.UNMASKED_RENDERER_WEBGL))); } catch (e) { return false; } })();   // the browser drawing without the GPU
if (GPU_SOFT && MOBILE) { dprCap = 1; setTimeout(resize, 0); }   // no GPU on this phone's browser: draw at native 1x from the start
const gatePerf = { t: 0, n: 0, slow: 0 };
function perfSnap() { if (gatePerf.n < 60) return null; const fps = Math.round(gatePerf.n / gatePerf.t), slow = Math.round(gatePerf.slow / gatePerf.n * 100); gatePerf.t = gatePerf.n = gatePerf.slow = 0; return { fps, slow, dpr: DPR, lite: LITE() }; }
let showFps = localStorage.getItem("chungo.fps") === "1", fpsNow = 0, fpsAcc = 0, fpsCnt = 0;
let vsyncMs = 16.7, lastTick = 0, workMs = 0;
let loopErrN = 0;
function frame(now) { // the loop itself never dies: an error in one frame is logged once and the next frame still comes
  try { frameBody(now); } catch (err) { if (loopErrN++ < 3) console.error(err); requestAnimationFrame(frame); }
}
function frameBody(now) {
  vsyncMs += (Math.min(40, now - lastTick) - vsyncMs) * .05; lastTick = now;   // the screen's own refresh, for the 진단 line
  if (now - last < 10) { requestAnimationFrame(frame); return; }   // 120Hz+ screens: draw every other refresh (a steady 60) instead of doubling the work
  const t0 = performance.now();
  const raw = (now - last) / 1000, rdt = Math.min(0.05, raw); last = now;
  fpsAcc += raw; fpsCnt++; if (fpsAcc >= 1) { fpsNow = Math.round(fpsCnt / fpsAcc); fpsAcc = fpsCnt = 0; hudCache = ""; }
  if (state === "play" && raw < .5 && !hubOn) { gatePerf.t += raw; gatePerf.n++; if (raw > 1 / 40) gatePerf.slow++; }   // 진단: how this gate ran on this device
  if (state === "play" && raw < .5) { perfT += raw; perfN++; if (perfN >= 60) { const avg = perfT / perfN; perfT = perfN = 0;   // three seconds of slow frames: draw at a lower resolution
    if (avg > 1 / 45 && dprCap > 1) { dprCap = Math.max(1, +(dprCap - .25).toFixed(2)); resize(); }
    else if (avg > 1 / 40 && !autoLite) autoLite = true; } }   // still slow at 1x: drop the full-screen paper wash, weather and vignette
  if (state === "play" || state === "dead") {
    songPos = Music.pos();
    if (state === "play") frameInput(rdt);
    let ts = 1;
    if (chungoFx) stepChungo(rdt);
    if (bossIntro && (bossIntro.t += rdt) > 1.7) bossIntro = null;
    if (roar) { const r = roar; r.t += rdt; if (r.t < 1) shake = Math.max(shake, 5); if ((r.ring = (r.ring || 0) - rdt) <= 0 && r.t < 1) { r.ring = .28; ringFx(r.e.x + r.e.w / 2, r.e.y + r.e.h * .35, 140, "rgba(120,10,16,.55)", .45); } if (r.t > 1.4) roar = null; }
    if (bossOut && (bossOut.t += rdt) > 2.2) bossOut = null;
    if (bossBanner && (bossBanner.t += rdt) > 1.3) bossBanner = null;
    if (LV && LV.seal) LV.seal.t += rdt;
    if (bulletHold > 0) bulletHold -= rdt;
    if (P && P.slowT > 0) P.slowT -= rdt;
    if (state === "play" && bossIntro) ts = 0.03;
    else if (state === "play" && roar) ts = 0.05;
    else if (hitstop > 0) { hitstop -= rdt; ts = 0.06; } else if (state === "play" && P.focus) ts = isGun() && P.focusT > TAP_T ? (has("d_jeong") ? .35 : .5) : has("d_jeong") ? 0.07 : 0.12;   // a gun aims on the move (half speed); a sword stills the world else if (state === "play" && killCam > 0) ts = .32;
    if (state === "play" && P && P.iaiHold && wk() === "baldo" && !P.focus && !bossIntro && !roar && performance.now() - (P.iaiAt || 0) < 1500) ts = Math.min(ts, has("bd_b2") ? .4 : .55);   // only for the draw itself, not forever   // 일도: the draw stills the world
    if (state === "play" && P && P.slowT > 0 && !P.focus) ts = Math.min(ts, .55);   // 비월
    if (state === "dead") ts = 0.3;
    const wdt = rdt * ts, n = Math.max(1, Math.ceil(wdt / (1 / 120))), sdt = wdt / n;
    for (let i = 0; i < n; i++) {
      if (state === "play") { stepPlayer(sdt); if (LV) P.x = Math.max(0, Math.min(LV.w * T - P.w, P.x)); stepPet(sdt); P.slashT = Math.max(0, P.slashT - sdt); slashHits(); playerHazards(); }
      if (state === "play" || state === "dead") { stepEnemies(sdt); stepBullets(sdt); if (state === "play") stepHazards(); }
      if (state !== "play" && state !== "dead") break;
    }
    if (state === "play") run.time += rdt;
    if (state === "dead") { deathT += rdt; if (deathT > 0.75) afterDeath(); }
    hookCand = state === "play" && !P.hook ? findHook() : null; if (LV && LV.stations) hubStep();
    updateHud();
  } else slashReq = null;
  for (const p of parts) { p.x += p.vx * rdt; p.y += p.vy * rdt; p.vy += 600 * rdt; p.life -= rdt; }
  parts = parts.filter(p => p.life > 0); if (parts.length > (MOBILE ? 220 : 400)) parts.splice(0, parts.length - (MOBILE ? 220 : 400));   // oldest drops go first
  for (const g of ghosts) g.age += rdt; ghosts = ghosts.filter(g => g.age < g.life);
  for (const s of seals) s.t += rdt; seals = seals.filter(s => s.t < (s.ch ? 1.1 : 0.7));
  for (const v of vfx) v.t += rdt; vfx = vfx.filter(v => v.t < v.life);
  for (const b of beams) b.t += rdt; beams = beams.filter(b => b.t < b.life); for (const b of bolts) b.t += rdt; bolts = bolts.filter(b => b.t < b.life); for (const t of trails) t.t += rdt; trails = trails.filter(t => t.t < t.life); for (const q of pops) q.t += rdt; pops = pops.filter(q => q.t < .9); for (const r of rings) r.t += rdt; rings = rings.filter(r => r.t < r.life); for (const c of cutLines) c.t += rdt; cutLines = cutLines.filter(c => c.t < c.life); killCam = Math.max(0, killCam - rdt);
  if (state === "play") for (const c of clones) if (c.ward > 0) { c.ward -= rdt; for (const b of bullets) if (!b.friendly && b.life > 0 && Math.hypot(b.x - c.x, b.y - (c.y - 20)) < 70) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 18, { life: .2 }); } }   // 잔영진
  if (state === "play") for (const c of clones) { c.t -= rdt; if (c.t <= 0) { // 분광: the shadow strikes once, then is gone
    const r = 85; for (const e of enemies) if (e.alive && Math.hypot(e.x + e.w / 2 - c.x, e.y + e.h / 2 - (c.y - 20)) < r) hurtEnemy(e, false);
    if (chr("munyeo") && SPR.mfx) addFx("mfx", 0, c.x + c.face * 26, c.y - 22, 70, { life: .28, flip: c.face < 0, ay: .5 }); else if (chr("posu") && SPR.pfx) addFx("pfx", 0, c.x + c.face * 40, c.y - 22, 30, { life: .25, flip: c.face < 0, ay: .5 }); else addFx("slashfx", SF.arc, c.x + c.face * 20, c.y - 22, 70, { life: .25, flip: c.face < 0 }); } }
  clones = clones.filter(c => c.t > 0 || c.ward > 0);
  shake = Math.max(0, shake - rdt * 40); flash = Math.max(0, flash - rdt);
  if (toastT > 0) { toastT -= rdt; if (toastT <= 0) $("toast").classList.remove("on"); }
  if (tipT > 0 || $("tip").classList.contains("on")) { tipT -= rdt; if (tipT <= 0) { $("tip").classList.remove("on"); setTimeout(() => { if (tipT <= 0) $("tip").hidden = true; }, 320); } }
  const inv = !!(P && (P.focus || killCam > 0) && state === "play");
  Music.setRate(inv ? .45 : 1 + .025 * momTier());   // 기세: the 장단 quickens tier by tier
  if (inv !== cvInverted) { cvInverted = inv; document.body.classList.toggle("night", inv); }
  try { render(rdt); } catch (err) { if (loopErrN++ < 3) console.error(err); }   // one bad draw must never stop the game loop
  workMs += (performance.now() - t0 - workMs) * .1;
  requestAnimationFrame(frame);
}

// ---------- HUD ----------
function fmt(t) { const m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2); }
function setHud() {
  document.body.classList.toggle("night", !!(LV && LV.pal.night));
  if (mode === "tutorial") { $("hMadang").textContent = "수련터"; $("hJang").textContent = Music.JANGDAN[TUTORIAL.jd].name; }
  else { const om = OMENS.find(o => o.id === run.omen); $("hMadang").textContent = !run.tower && run.node === "rest" ? "쉼터 · 주막" : !run.tower && run.node === "event" ? "기연" : (run.node === "elite" && !isFinal() ? "험로 · " : "") + stageName(run.m); $("hJang").textContent = Music.JANGDAN[MADANG[MD(run.m)].jd].name + (om ? " · " + om.name : ""); }
  const hb = $("hBreath"); hb.innerHTML = ""; hb.classList.toggle("inf", mode === "tutorial");
  if (mode !== "tutorial") { const lostNow = (hb.dataset.b != null && +hb.dataset.b > run.breath) ? +hb.dataset.b : -1;   // the 숨 just lost bursts red, and the row shakes
    for (let i = 0; i < Math.max(breathCap(), run.breath); i++) { const d = document.createElement("i"); if (i >= run.breath) d.className = "lost" + (i < lostNow ? " gone" : ""); hb.appendChild(d); }
    if (lostNow >= 0) { hb.classList.remove("hurt"); void hb.offsetWidth; hb.classList.add("hurt"); }
    hb.dataset.b = run.breath; }
  const hs = $("hSchool"); if (hs) { hs.hidden = true; } ;
  hudCache = "";
}
let hudCache = "";
function updateHud() {
  const t = fmt(run.time), pip = (P.onGround || P.airDash > 0) && P.dashCd <= 0, hk = !!hookCand, key = t + pip + hk;
  { const gt = gateGoalText(); if (gt !== (P.goalShown ?? null)) { P.goalShown = gt; $("hJang").classList.toggle("goal", !!gt); if (gt) $("hJang").textContent = gt; else setHud(); } }
  if (key === hudCache) return; hudCache = key;
  $("hTime").textContent = t + (showFps ? ` · ${fpsNow}fps ${workMs.toFixed(0)}ms ${Math.round(1000 / vsyncMs)}Hz ${DPR}x${GPU_SOFT ? " SW" : ""}` : ""); $("pip").classList.toggle("on", pip); $("bHook").classList.toggle("ready", hk);
}
let tipT = 0;
function tip(title, desc, keys) { // 첫 사용 안내: shown once per thing, for a few seconds
  $("tipT").textContent = title; $("tipD").textContent = desc; $("tipK").textContent = keys || ""; const el = $("tip"); el.hidden = false; requestAnimationFrame(() => el.classList.add("on")); tipT = 6.5; }
function tipOnce(id, title, desc, keys) { META.tips = META.tips || {}; if (META.tips[id]) return; META.tips[id] = 1; saveMeta(); tip(title, desc, keys); }
const WTIP = {   // how each weapon's own move is done, by the rules it plays by
  jochong: ["대시를 짧게 = 허리 사격(가까이 한 발) · 길게 누르면 걸으며 겨누고, 떼면 조준 사격 — 오래 겨눌수록 관통 일격. 탄 셋, 총검으로 찌르거나 번쩍이는 적을 쏘면 장전", MOBILE ? "대시 짧게 · 길게 누른 채 겨누고 떼기 · 화면을 그어 찌르기" : "K 짧게 · K를 누른 채 겨누고 떼기 · J로 찌르기"],
  seungja: ["대시를 짧게 = 가까이 짧은 산탄 · 길게 누르고 떼면 넓은 산탄과 큰 반동. 탄 둘", MOBILE ? "대시 짧게 · 길게 누른 채 겨누고 떼기" : "K 짧게 · K를 누른 채 겨누고 떼기"],
  singi: ["대시를 짧게 = 작은 화살 한 발 · 길게 누르고 떼면 터지는 화살 둘 — 탄 대신 열이 쌓이고 과열되면 잠깐 못 쏜다", MOBILE ? "대시 짧게 · 길게 누른 채 겨누고 떼기" : "K 짧게 · K를 누른 채 겨누고 떼기"],
  cheonja: ["대시를 짧게 = 가벼운 포탄 · 길게 누르고 떼면 포물선으로 크게 터지는 포탄 — 아래로 쏘면 높이 솟는다. 탄 하나", MOBILE ? "대시 짧게 · 길게 누른 채 겨누고 떼기" : "K 짧게 · K를 누른 채 겨누고 떼기"],
  hwando: ["원이 점이 될 때 보통 베기로 베면 적 뒤로 넘어간다", MOBILE ? "화면을 그어 베기" : "J 베기"],
  ssang: ["빠르게 이어 베면 기세가 쌓이고, 다섯 번째는 X자 일격", MOBILE ? "연달아 긋기" : "J 연타"],
  woldo: ["공중에서 아래로 베면 내리꽂힌다 — 땅에 꽂히면 충격파", MOBILE ? "공중에서 아래로 긋기" : "공중에서 S + J"],
  baldo: ["베기를 누르고 있거나 무아경을 유지하면 발밑 먹이 솟구친다 — 붉어지면 놓아 붉은 일격", MOBILE ? "화면을 누른 채 떼기 · 무아경을 길게" : "J를 누른 채 떼기 · 무아경을 길게"] };
function weaponTip() { if (mode === "tutorial" || !run || state !== "play") return; const w = WEAPONS[wpn()], t = WTIP[wrule()]; if (t) tipOnce("w_" + wpn(), `${w.name} · ${w.desc.split(" — ")[0]}`, t[0], t[1]); }
$("tip").addEventListener("pointerdown", e => { e.stopPropagation(); tipT = 0; });
function toast(msg) { const el = $("toast"); el.textContent = msg; el.classList.add("on"); toastT = 1.6; }
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

// ---------- render ----------
let paperPat = null, vignette = null;
function makePaper() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  const id = g.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random(); id.data[i] = id.data[i + 1] = id.data[i + 2] = v < 0.5 ? 0 : 255; id.data[i + 3] = Math.random() * 14; }
  g.putImageData(id, 0, 0);
  g.strokeStyle = "rgba(0,0,0,.05)"; g.lineWidth = 0.6;
  for (let i = 0; i < 40; i++) { g.beginPath(); const x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y); g.quadraticCurveTo(x + 10, y + Math.random() * 10, x + 20 + Math.random() * 30, y + (Math.random() - .5) * 8); g.stroke(); }
  paperPat = ctx.createPattern(c, "repeat");
}
function drawGround(pal, ssn, x0, x1, y0, y1, R) { // the rock, its painted face, giwa bands, edges, ledges and thorns over one region of the world — static, so it is baked
  const SC = LV.scenery;
  // tiles: all visible rock in one path, filled once with the stone texture
  const stone = pattern("tex-stone", 0.5), giwa = pattern("tex-giwa", 0.094), rock = new Path2D();
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (LV.grid[ty * LV.w + tx] === 1 && !(LV.slabTiles && LV.slabTiles.has(ty * LV.w + tx))) rock.rect(tx * T - .3, ty * T - .3, T + .6, T + .6);
  const granite = pattern("tex-slab", 0.45);
  ctx.fillStyle = pal.tile; ctx.fill(rock);
  if (SPR.pillars) { // ground built from the same painted rock columns as the pillars, so both read as one cliff
    const pf = SPR.pillars.f, colW = 70, img = bake(pal.night ? SPR.pillars.inv : SPR.pillars.img, .8, 1.15);
    ctx.save(); ctx.clip(rock); if (pal.night) ctx.globalAlpha = .45;
    const cx0 = Math.floor(R.wx0 / colW) - 1, cx1 = Math.ceil(R.wx1 / colW) + 1;
    for (let c = cx0; c <= cx1; c++) {
      const hsh = (c * 2654435761) >>> 0, i = hsh % 3, f = pf[i], w = colW * 1.35, segH = w * f.h / f.w, off = (hsh >>> 8) % 97;
      const rowH = segH - 10; // one spacing for both the start row and the step, so rows stay put as the camera moves
      for (let y = Math.floor((R.wy0 - off) / rowH) * rowH + off - rowH; y < R.wy1 + segH; y += rowH) {
        ctx.save(); ctx.translate(c * colW + colW / 2, y); if ((hsh >>> 3) & 1) ctx.scale(-1, 1); ctx.drawImage(img, f.x, f.y, f.w, f.h, -w / 2, 0, w, segH); ctx.restore();
      }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  } else if (granite) { // painted granite face, darkening with depth; night keeps it dim
    ctx.globalAlpha = pal.night ? .35 : 1; ctx.fillStyle = granite; ctx.fill(rock); ctx.globalAlpha = 1;
  } else if (stone) { ctx.globalAlpha = pal.rim ? .8 : 1; ctx.fillStyle = stone; ctx.fill(rock); ctx.globalAlpha = 1; }
  if (SC && SPR.pillars) for (const c of SC.pillars) if (c.g && c.x + c.w > R.wx0 && c.x - c.w < R.wx1) drawPillar(c, pal);   // grounded pillars over the rock but under every giwa band
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const v = LV.grid[ty * LV.w + tx], px = tx * T, py = ty * T;
    if (v === 1) {
      if (tileAt(tx, ty - 1) !== 1 && giwa) {
        // giwa eave band along exposed tops, overhanging open ends a little
        const l = tileAt(tx - 1, ty) !== 1 || tileAt(tx - 1, ty - 1) === 1 ? 3 : 0, r = tileAt(tx + 1, ty) !== 1 || tileAt(tx + 1, ty - 1) === 1 ? 3 : 0;
        ctx.fillStyle = pal.tile; ctx.fillRect(px - l, py - 4, T + l + r, 12);
        ctx.save(); ctx.translate(0, py - .8); ctx.fillStyle = giwa; ctx.fillRect(px - l, -3.2, T + l + r, 9); ctx.restore(); // align a cap row to the eave
        ctx.fillStyle = pal.tile; ctx.fillRect(px - l, py + 5, T + l + r, 2.5);
        if (pal.rim) { ctx.fillStyle = pal.rim; ctx.fillRect(px - l, py - 4.5, T + l + r, 1); }
        if (ssn === 2) { ctx.fillStyle = pal.night ? "rgba(236,230,216,.5)" : "rgba(250,250,252,.92)"; ctx.fillRect(px - l, py - 6.5, T + l + r, 3); }
      } else if (tileAt(tx, ty - 1) !== 1) {
        const s = (tx * 73 + ty * 31) % 7;
        ctx.beginPath(); ctx.moveTo(px - .5, py + 2); ctx.lineTo(px + 6 + s, py - 1.5); ctx.lineTo(px + 18, py + .5 - s * .2); ctx.lineTo(px + T + .5, py - 1); ctx.lineTo(px + T + .5, py + 3); ctx.closePath(); ctx.fill();
        if (pal.rim) { ctx.fillStyle = pal.rim; ctx.fillRect(px, py - 1, T, 1.2); }
      }
      for (const sd of [-1, 1]) if (tileAt(tx + sd, ty) !== 1 && granite && !(LV.slabTiles && LV.slabTiles.has(ty * LV.w + tx))) { // dark ink edge where the rock face turns away
        const gx = sd < 0 ? px : px + T - 7, gg = ctx.createLinearGradient(gx, 0, gx + 7, 0);
        gg.addColorStop(sd < 0 ? 0 : 1, "rgba(15,14,16,.75)"); gg.addColorStop(sd < 0 ? 1 : 0, "rgba(15,14,16,0)"); ctx.fillStyle = gg; ctx.fillRect(gx, py, 7, T);
      }
      if (pal.rim && (tileAt(tx - 1, ty) !== 1 || tileAt(tx + 1, ty) !== 1)) { // stone-rubbing speckle on exposed sides
        ctx.fillStyle = pal.rim; const sx = tileAt(tx - 1, ty) !== 1 ? px : px + T - 1.5;
        for (let i = 0; i < 4; i++) ctx.fillRect(sx, py + ((tx * 13 + ty * 7 + i * 9) % T), 1.5, 2 + (i % 2) * 2);
      }
    } else if (v === 3 && tileAt(tx - 1, ty) !== 3) { // one painted ledge per run of '=' tiles
      let n = 1; while (tileAt(tx + n, ty) === 3) n++;
      const i = LV.ledgeStone ? P2.ledge : P2.plank, f = SPR.props2 && SPR.props2.f[i];
      if (f) { const segN = Math.max(1, Math.round(n / 4)), segW = n * T / segN, hh = segW * f.h / f.w;
        for (let k = 0; k < segN; k++) ctx.drawImage(pal.night ? SPR.props2.inv : SPR.props2.img, f.x, f.y, f.w, f.h, px + k * segW - 2, py - 3, segW + 4, Math.min(hh, LV.ledgeStone ? 30 : 26)); }
      else { ctx.fillStyle = pal.tile; ctx.fillRect(px, py, n * T, 6); }
    } else if (v === 2 && SPR.objects) {
      const f = SPR.objects.f[OBJ.thorns];
      drawSprite("objects", OBJ.thorns, px + T / 2 + ((tx * 7) % 5) - 2, py + T + 3, (T + 10) / f.w, tx % 2 === 1, .5, pal.night);
    } else if (v === 2) {
      ctx.fillStyle = pal.tile; ctx.beginPath();
      for (let i = 0; i < 4; i++) { ctx.moveTo(px + i * 8, py + T); ctx.lineTo(px + i * 8 + 3 + (i % 2), py + 11); ctx.lineTo(px + i * 8 + 8, py + T); }
      ctx.fill(); ctx.fillStyle = SEAL; for (let i = 0; i < 4; i++) ctx.fillRect(px + i * 8 + 2.5 + (i % 2), py + 11, 1.5, 3);
    }
  }
}
let groundOff = false;
function freeGround(lv) { if (lv && lv._gc) { for (const v of lv._gc.values()) v.cv.width = v.cv.height = 0; lv._gc.clear(); } }
function bakeGround(gc, key, c, CW, top, hh, k, pal, ssn) { // paint one chunk of ground into its own canvas, at screen resolution
  const cvs = document.createElement("canvas"); cvs.width = Math.ceil((CW + 4) * k); cvs.height = Math.ceil(hh * k); let g = null; try { g = cvs.getContext("2d"); } catch (e) {} if (!g) { groundOff = true; cvs.width = cvs.height = 0; return; }   // out of canvas memory: paint the ground live from now on
  const main = ctx; ctx = g; try { g.setTransform(cvs.width / (CW + 4), 0, 0, cvs.height / hh, -(c * CW - 2) * cvs.width / (CW + 4), -top * cvs.height / hh);
    const x0 = Math.max(0, Math.floor(c * CW / T) - 1), x1 = Math.min(LV.w - 1, Math.ceil((c + 1) * CW / T) + 1);
    g.beginPath(); g.rect(c * CW - 2, top, CW + 4, hh); g.clip();
    drawGround(pal, ssn, x0, x1, 0, LV.h - 1, { wx0: c * CW - 2, wx1: (c + 1) * CW + 2, wy0: top, wy1: top + hh }); } finally { ctx = main; }
  gc.set(key + "#" + c, { cv: cvs, used: performance.now() });
  while (gc.size > (MOBILE ? 4 : 10)) { let old = null; for (const [kk, v] of gc) if (!old || v.used < old[1].used) old = [kk, v]; old[1].cv.width = old[1].cv.height = 0; gc.delete(old[0]); }   // iOS frees canvas memory only when the canvas is emptied   // keep memory small: drop the stalest
}
const camView = { x0: 0, y0: 0, x1: 0, y1: 0 }; let padFadeT = 0;
function render(rdt) {
  if (!paperPat) makePaper();
  const rz = roar ? Math.min(1, roar.t / .25) * Math.min(1, (1.4 - roar.t) / .4) : 0, zoom = LV && LV.hub ? hubZoom() : 1 + .22 * rz * (2 - rz) / 1;   // the roar leans the camera in, then lets go; the 거점 is framed by its painting
  const pal = !LV ? PAL[0] : (P && (P.focus || killCam > 0) && state === "play") ? NIGHT : LV.pal, k = SCALE * DPR * zoom, vw = W / SCALE / zoom, vh = H / SCALE / zoom;
  if (P && LV) {
    let tx = P.x + P.w / 2 + Math.max(-110, Math.min(110, P.vx * 0.22)) + P.face * 24, ty = P.y + P.h / 2 - 24; const f = Math.min(1, rdt * (bossIntro || roar ? 5 : 7));
    if (bossIntro) { const e = bossIntro.e; tx = tx * .25 + (e.x + e.w / 2) * .75; ty = ty * .4 + (e.y + e.h / 2 - 30) * .6; }
    if (roar) { const e = roar.e; tx = tx + ((e.x + e.w / 2) - tx) * .8 * rz; ty = ty + ((e.y + e.h / 2 - 20) - ty) * .8 * rz; }
    cam.x += (tx - cam.x) * f; cam.y += (ty - cam.y) * f;
    const lw = LV.w * T, lh = LV.h * T;
    cam.x = lw <= vw ? lw / 2 : Math.max(vw / 2, Math.min(lw - vw / 2, cam.x));
    const maxY = lh - vh / 2 + 8; cam.y = Math.min(maxY, Math.max(Math.min(maxY, vh / 2 - 96), cam.y));
    if (PORTRAIT()) { const bottom = LV.hub ? hubRect().y + hubRect().h : lh; cam.y = bottom - (H / 2 - padH()) / (SCALE * zoom); }   // the ground line sits just above the thumbs
    if (LV.hub && PORTRAIT()) { const r = hubRect(); cam.x = Math.max(r.x + vw / 2, Math.min(r.x + r.w - vw / 2, cam.x)); }
    if (LV.hub && !PORTRAIT()) { const r = hubRect(); cam.x = r.w <= vw ? r.x + r.w / 2 : Math.max(r.x + vw / 2, Math.min(r.x + r.w - vw / 2, cam.x)); cam.y = r.h <= vh ? r.y + r.h / 2 : Math.max(r.y + vh / 2, Math.min(r.y + r.h - vh / 2, cam.y)); }   // the 거점: the screen never leaves the painting
  }
  if (P && state === "play" && (padFadeT = (padFadeT || 0) - rdt) <= 0) { padFadeT = .2; const px = (P.x + P.w / 2 - cam.x) * SCALE * zoom + W / 2, py = (P.y + P.h / 2 - cam.y) * SCALE * zoom + H / 2;   // a button over the swordsman goes see-through
    for (const el of document.querySelectorAll("#pad .tb")) { const r = el.getBoundingClientRect(); el.classList.toggle("over", px > r.left - 30 && px < r.right + 30 && py > r.top - 40 && py < r.bottom + 30); } }
  camView.x0 = cam.x - vw / 2; camView.y0 = cam.y - vh / 2; camView.x1 = cam.x + vw / 2; camView.y1 = cam.y + vh / 2;
  const sk = settings.calm ? .35 : 1, sx = (Math.random() - .5) * shake * sk, sy = (Math.random() - .5) * shake * sk;   // 흔들림·번쩍임 줄이기

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const hubPainted = LV && LV.hub && state !== "menu" && HUBIMG.complete && HUBIMG.naturalWidth;   // the 거점 painting covers the whole screen: no paper, sky or weather under it
  const ssn0 = LV && state !== "menu" && !pal.night ? season() : 0;   // the season's tint is baked into the paper, so the screen is washed once, not twice
  if (!hubPainted) { ctx.fillStyle = (!LITE() && bgPaper(pal.bg, pal.rim ? .35 : .9, ssn0)) || pal.bg; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (!(LV && LV.hub)) drawBackdrop(pal);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const paperTex = ssn0 ? tintedPaper(ssn0) : pattern("tex-paper", DPR * 0.9);
  if (hubPainted || (paperTex && !LITE())) {}   // the grain is already in the background and the paintings (bgPaper, bakePaper)
  else { ctx.fillStyle = paperPat; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (!LV || state === "menu") return;
  const ssn = season(), tt = performance.now() / 1000;
  if (ssn && !pal.night && !IMG["tex-paper"]) { ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = SEASON_TINT[ssn]; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalCompositeOperation = "source-over"; }
  if (!LITE() && !hubPainted) drawWeather(ssn, tt, pal);

  ctx.setTransform(k, 0, 0, k, Math.round((W / 2 + sx) * DPR - cam.x * k), Math.round((H / 2 + sy) * DPR - cam.y * k));
  const x0 = Math.max(0, Math.floor((cam.x - vw / 2) / T) - 1), x1 = Math.min(LV.w - 1, Math.ceil((cam.x + vw / 2) / T) + 1);
  const y0 = Math.max(0, Math.floor((cam.y - vh / 2) / T) - 1), y1 = Math.min(LV.h - 1, Math.ceil((cam.y + vh / 2) / T) + 1);
  const visible = x => x > cam.x - vw / 2 - 60 && x < cam.x + vw / 2 + 60;

  if (SPR.rocks && LV && !LV.scenery) buildScenery();
  const SC = LV.scenery;
  if (SC && SPR.pines) for (const p of SC.pines) { // far pines drift slower than the ground (parallax .75)
    const f = SPR.pines.f[p.i], px = p.x, gy = p.gy;   // fixed in the world, rooted behind the ground edge
    if (px < cam.x - vw / 2 - 300 || px > cam.x + vw / 2 + 300) continue;
    ctx.save(); ctx.translate(px, gy); if (p.flip) ctx.scale(-1, 1); ctx.globalAlpha = pal.night ? p.a * .6 : p.a * 1.6;
    const k = p.h / f.h, im = pal.night ? SPR.pines.inv : SPR.pines.img; ctx.globalAlpha = pal.night ? .4 : .8;
    for (let r = 1; r > 0; r--) ctx.drawImage(im, f.x, f.y, f.w, f.h, -f.w * k / 2, -p.h, f.w * k, p.h); // stacked passes deepen the pale ink
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (SC && SPR.slabs) for (const c of SC.slabs) if (Math.abs(c.x - cam.x) < vw / 2 + c.w) { // drawn before tiles so the walkable top stays crisp
    const f = SPR.slabs.f[c.i], h = Math.max(c.minH + 14, Math.min(c.w * f.h / f.w, c.minH * 2.2)); // width = the run; height covers the block
    ctx.save(); ctx.translate(c.x, c.y); if (c.flip) ctx.scale(-1, 1);
    ctx.drawImage(pal.night ? SPR.slabs.inv : SPR.slabs.img, f.x, f.y, f.w, f.h, -c.w / 2, 0, c.w, h); ctx.restore();
  }
  if (SC && SPR.pillars) for (const c of SC.pillars) if (!c.g && Math.abs(c.x - cam.x) < vw / 2 + c.w) drawPillar(c, pal);   // floating ones behind the rock
  if (SC) for (const c of SC.back) if (Math.abs(c.x - cam.x) < vw / 2 + c.h * 2 + 200) drawCliff(c, pal.night ? SPR.rocks.inv : SPR.rocks.img, pal.night ? .25 : .45);
  // hints
  ctx.font = `600 11px ${BODY_FONT}`; ctx.textBaseline = "top";
  for (const [hx, hy, text] of LV.hints) {
    const px = hx * T, py = hy * T + 8; if (!visible(px) && !visible(px + 300)) continue;
    const tw = ctx.measureText(text).width;
    if (!uiPatch(5, px - 16, py - 9, tw + 32, 30, pal.night ? .35 : .9)) { ctx.fillStyle = pal.text; ctx.globalAlpha = 0.85; ctx.fillRect(px - 8, py - 2, 2, 15); }
    ctx.globalAlpha = 1; ctx.fillStyle = pal.text; ctx.fillText(text, px, py);
  }
  // 금줄
  for (const l of LV.lasers) {
    if (!visible(l.x)) continue;
    if (!drawSprite("objects", OBJ.emitter, l.x, l.ty * T + 26, kOf("objects", OBJ.emitter, 28), false, .5, pal.night)) { ctx.fillStyle = pal.tile; ctx.fillRect(l.x - 8, l.ty * T + 8, 16, 14); }
    if (SPR.props) { // 금줄: one straw rope hung the full height; charged (deadly) when it glows
      const f = SPR.props.f[PROP.rope], on = laserOn(l), len = l.y1 - l.y0, sw = Math.sin(tt * 1.7 + l.x) * (on ? .8 : 2);
      if (on) { const gl = ctx.createLinearGradient(l.x - 16, 0, l.x + 16, 0); gl.addColorStop(0, "rgba(195,22,28,0)"); gl.addColorStop(.5, `rgba(195,22,28,${.22 + .08 * Math.sin(tt * 9)})`); gl.addColorStop(1, "rgba(195,22,28,0)"); ctx.fillStyle = gl; ctx.fillRect(l.x - 16, l.y0, 32, len); }
      ctx.save(); ctx.translate(l.x, l.y0); ctx.rotate(sw * .01); ctx.globalAlpha = on ? 1 : laserWarn(l) ? .65 : .3;
      ctx.drawImage(SPR.props.img, f.x, f.y, f.w, f.h, -11, -4, 22, len + 4);
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (laserOn(l)) {
      ctx.fillStyle = "rgba(195,22,28,.08)"; ctx.fillRect(l.x - 12, l.y0, 24, l.y1 - l.y0);
      ctx.fillStyle = "rgba(195,22,28,.18)"; ctx.fillRect(l.x - 6, l.y0, 12, l.y1 - l.y0);
      ctx.fillStyle = SEAL; ctx.fillRect(l.x - 1.8, l.y0, 3.6, l.y1 - l.y0);
      // twisted straw-rope marks
      ctx.fillStyle = pal.tile; for (let yy = l.y0 + 10; yy < l.y1; yy += 24) { ctx.beginPath(); ctx.moveTo(l.x - 5, yy); ctx.lineTo(l.x + 5, yy + 5); ctx.lineTo(l.x - 5, yy + 9); ctx.lineTo(l.x - 3, yy + 5); ctx.fill(); }
    } else if (laserWarn(l) && Math.floor(performance.now() / 60) % 2) { ctx.fillStyle = "rgba(195,22,28,.55)"; ctx.fillRect(l.x - .6, l.y0, 1.2, l.y1 - l.y0); }
  }
  // tiles: the ground is static, so it is painted once into chunks and stamped; a chunk not yet baked falls back to painting live
  if (LV.hub) drawHubScene(pal); else { const k2 = Math.min(SCALE * DPR, MOBILE ? 1.25 : 2), key = (pal === NIGHT ? "n" : "d") + ssn + "|" + (LV.gridVer || 0) + "|" + k2.toFixed(3) + "|" + ["pillars", "objects", "props2"].map(n => SPR[n] ? 1 : 0).join("") + ["tex-stone", "tex-giwa", "tex-slab"].map(n => IMG[n] ? 1 : 0).join(""), CW = 512, top = -96, hh = LV.h * T + 192;
    const gc = LV._gc || (LV._gc = new Map()), c0 = Math.floor((cam.x - vw / 2) / CW), c1 = Math.floor((cam.x + vw / 2) / CW);
    let ready = true; for (let c = c0; c <= c1; c++) if (!gc.has(key + "#" + c)) ready = false;
    if (groundOff) ready = false;
    if (!ready) { for (let c = c0; c <= c1; c++) if (!groundOff && !gc.has(key + "#" + c)) { bakeGround(gc, key, c, CW, top, hh, k2, pal, ssn); break; }   // one per frame
      drawGround(pal, ssn, x0, x1, y0, y1, { wx0: cam.x - vw / 2, wx1: cam.x + vw / 2, wy0: cam.y - vh / 2, wy1: cam.y + vh / 2 }); }
    else for (let c = c0; c <= c1; c++) { const e = gc.get(key + "#" + c); e.used = performance.now(); ctx.drawImage(e.cv, c * CW - 2, top, CW + 4, hh); }   // chunks overlap by 2px so no seam shows
    if (SPR.pillars || pattern("tex-slab", .45)) { const rock = new Path2D(); for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (LV.grid[ty * LV.w + tx] === 1 && !(LV.slabTiles && LV.slabTiles.has(ty * LV.w + tx))) rock.rect(tx * T - .3, ty * T - .3, T + .6, T + .6);
      const sh = ctx.createLinearGradient(0, cam.y - vh / 2, 0, cam.y + vh / 2); sh.addColorStop(0, "rgba(20,18,16,0)"); sh.addColorStop(1, `rgba(20,18,16,${SPR.pillars ? .3 : .35})`); ctx.fillStyle = sh; ctx.fill(rock); } }   // depth shading follows the camera, so it stays live
  if (SC && SPR.pines) { ctx.globalAlpha = .8; for (const p of SC.front) if (visible(p.x)) for (let r = 1; r > 0; r--) drawSprite("pines", p.i, p.x, p.y + 6, p.h / SPR.pines.f[p.i].h, p.flip, .5, pal.night); ctx.globalAlpha = 1; }
  const sealed = bossAlive();
  for (const d of drumsInPlay()) if (visible(d.x)) { // 천고 on a lacquered stand, pulsing on the beat; dim while its guardian stands
    if (sealed) ctx.globalAlpha = .45;
    const beat = 1 - (songPos / Music.beatLen % 1), s = 1 + Math.max(0, beat - .75) * .4;
    const gl = ctx.createRadialGradient(d.x, d.y - 22, 4, d.x, d.y - 22, 44); gl.addColorStop(0, "rgba(195,22,28,.28)"); gl.addColorStop(1, "rgba(195,22,28,0)"); ctx.fillStyle = gl; ctx.fillRect(d.x - 44, d.y - 66, 88, 88);
    ctx.fillStyle = "#3a1b14"; ctx.fillRect(d.x - 12, d.y - 14, 3, 14); ctx.fillRect(d.x + 9, d.y - 14, 3, 14);
    if (!drawSprite("hudsolid", HUD.bigDrum, d.x, d.y - 10, (d.big ? 86 : 38) * s / (SPR.hudsolid ? SPR.hudsolid.f[HUD.bigDrum].h : 1), false, .5, false, 1)) { ctx.fillStyle = SEAL; ctx.beginPath(); ctx.arc(d.x, d.y - 26, 16, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  if (LV.gate && SPR.props2 && visible(LV.gate.x)) drawSprite("props2", P2.gate, LV.gate.x, LV.gate.y, 78 / SPR.props2.f[P2.gate].h, false, .5, pal.night);
  for (const d of LV.dress) {
    if (!visible(d.x) || !SPR[d.sheet]) continue;
    const f = SPR[d.sheet].f[d.i];
    if (d.w) { ctx.drawImage(pal.night ? SPR[d.sheet].inv : SPR[d.sheet].img, f.x, f.y, f.w, f.h, d.x - d.w / 2, d.y, d.w, d.h); continue; }
    if (d.ay === 1 && d.sheet !== "pet") { const rw = Math.min(f.w * d.h / f.h * .42, 90); ctx.fillStyle = pal.night ? "rgba(0,0,0,.28)" : "rgba(40,34,30,.16)"; ctx.beginPath(); ctx.ellipse(d.x, d.y - 1, rw, Math.max(3, rw * .12), 0, 0, Math.PI * 2); ctx.fill(); }   // a wash of shadow seats them on the ground
    drawSprite(d.sheet, d.i, d.x, d.y, d.h / f.h, d.flip, .5, pal.night, d.ay);
  }
  // ink stains
  for (const s of LV.stains) {
    if (!visible(s.x)) continue;
    ctx.globalAlpha = 0.75;
    if (s.pool && SPR.fx) { const f = SPR.fx.f[FX.pool]; drawSprite("fx", FX.pool, s.x, s.y, s.w / f.w, false, .5, false, 1); continue; }
    if (s.c !== SEAL && SPR.objects) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot || 0); drawSprite("objects", OBJ.splat, 0, 0, s.r * 3.4 / SPR.objects.f[OBJ.splat].h, false, .5, pal.night, .5); ctx.restore(); }
    else { ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // 청사초롱 (checkpoints)
  for (const c of LV.cps) {
    if (!visible(c.x)) continue;
    ctx.fillStyle = pal.tile; ctx.fillRect(c.x - 1, c.y - 44, 2, 44); ctx.fillRect(c.x - 1, c.y - 44, 10, 2);
    const lx = c.x + 8, ly = c.y - 40;
    if (SPR.objects) {
      if (c.on) { const gl = ctx.createRadialGradient(lx, ly + 16, 2, lx, ly + 16, 30); gl.addColorStop(0, "rgba(255,170,90,.45)"); gl.addColorStop(1, "rgba(255,170,90,0)"); ctx.fillStyle = gl; ctx.fillRect(lx - 30, ly - 14, 60, 60); }
      drawSprite("objects", c.on ? OBJ.lanternOn : OBJ.lanternOff, lx, ly - 2, kOf("objects", OBJ.lanternOff, 38), false, .5, false, 0);
      continue;
    }
    ctx.strokeStyle = pal.tile; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx, ly - 2); ctx.lineTo(lx, ly + 2); ctx.stroke();
    if (c.on) { ctx.fillStyle = "rgba(255,190,90,.25)"; ctx.beginPath(); ctx.arc(lx, ly + 11, 16, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = c.on ? JJOK : pal.foe; ctx.fillRect(lx - 6, ly + 2, 12, 9);
    ctx.fillStyle = c.on ? SEAL : pal.foe; ctx.fillRect(lx - 6, ly + 11, 12, 9);
    ctx.fillStyle = pal.tile; ctx.fillRect(lx - 7, ly + 2, 14, 1.5); ctx.fillRect(lx - 7, ly + 19, 14, 1.5);
  }
  // 낙관 (exit)
  if (LV.exit && visible(LV.exit.x)) {
    const e = LV.exit, cx = e.x + e.w / 2, cy = e.y + e.h / 2, beat = 1 - (songPos / Music.beatLen % 1);
    const s = 26 + Math.max(0, beat - 0.7) * 10;
    if (SPR.objects && drawSprite("objects", OBJ.seal, cx, cy, s / SPR.objects.f[OBJ.seal].h, false, .5, false, .5)) { /* painted seal */ } else {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.06);
    ctx.fillStyle = SEAL; ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeStyle = pal.bg; ctx.lineWidth = 2; ctx.strokeRect(-s / 2 + 4, -s / 2 + 4, s - 8, s - 8);
    ctx.fillStyle = pal.bg; ctx.fillRect(-1.5, -s / 2 + 7, 3, s - 14); ctx.fillRect(-s / 2 + 7, -1.5, s - 14, 3);
    ctx.restore(); }
  }
  if (LV.seal) { const sl = LV.seal, h = (sl.y1 + 1) * T, grow = Math.min(1, sl.t * 2.5);   // 결계: two curtains of ink hung with talismans
    for (const x of [sl.x0, sl.x1]) { const wx = x * T, top = h - h * grow;
      if (SPR.bvfx) { const f = SPR.bvfx.f[BV.curtain], sc = 54 / f.w; ctx.globalAlpha = .8; for (let y = h; y > top - f.h * sc * .5; y -= f.h * sc * .8) drawSprite("bvfx", BV.curtain, wx + T / 2, y, sc, false, .5, pal.night, 1); ctx.globalAlpha = 1; }
      else { ctx.globalAlpha = .55; inkWash(wx + 4, top, T - 8, h - top, pal.night ? "#d8d1c4" : "#1d1b20", x * 13); ctx.globalAlpha = 1; }
      for (let y = h - 40; y > top + 10; y -= 74) { const sw = Math.sin(tt * 2 + y * .05 + x) * 3; ctx.save(); ctx.translate(wx + T / 2 + sw, y); ctx.rotate(sw * .03);
        if (!spr("bcal", BC.talisman, 0, 0, 40)) { ctx.fillStyle = "#e8cf6a"; ctx.fillRect(-7, -16, 14, 32); ctx.strokeStyle = SEAL; ctx.lineWidth = 1.4; ctx.strokeRect(-5, -13, 10, 26); } ctx.restore(); } } }
  // 과녁: a red ring hung on a cord; a faint ghost of it while it waits to hang again
  for (const g of LV.targets) { if (!visible(g.x)) continue;
    const sw = Math.sin(tt * 1.6 + g.sway) * 2, up = g.t > 0, k = up ? Math.max(.18, 1 - g.t / 2.5) : 1;
    ctx.save(); ctx.translate(g.x + sw, g.y); ctx.globalAlpha = up ? .22 : 1;
    ctx.strokeStyle = pal.tile; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(-3, -40, 0, -64); ctx.stroke();
    brushRing(0, 0, 13 * (up ? k : 1), SEAL, 2.6, 3); brushRing(0, 0, 6.5, SEAL, 1.8, 4);
    if (!up) { ctx.fillStyle = SEAL; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); }
  // 연 (grapple kites)
  for (const p of LV.points) {
    if (!visible(p.x)) continue;
    const on = p === hookCand, sw = Math.sin(tt * 1.3 + p.sway) * 2.5;
    ctx.save(); ctx.translate(p.x + sw, p.y); ctx.rotate(sw * 0.03);
    if (drawSprite("objects", OBJ.kite, 0, -20, kOf("objects", OBJ.kite, 52), false, .5, false, 0)) { ctx.restore(); }
    else {
    ctx.strokeStyle = pal.tile; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 13); ctx.quadraticCurveTo(6, 40, -4, 70); ctx.stroke();
    ctx.fillStyle = on ? JJOK : (pal.rim ? "#3a3833" : "#f1ede4"); ctx.fillRect(-10, -13, 20, 26);
    ctx.strokeStyle = on ? JJOK_L : pal.tile; ctx.lineWidth = 1.6; ctx.strokeRect(-10, -13, 20, 26);
    ctx.beginPath(); ctx.moveTo(-10, -13); ctx.lineTo(10, 13); ctx.moveTo(10, -13); ctx.lineTo(-10, 13); ctx.lineWidth = .8; ctx.stroke();
    ctx.fillStyle = pal.bg; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = SEAL; ctx.fillRect(-10, -13, 20, 3);
    ctx.restore(); }
    if (on) { ctx.globalAlpha = .5 + .25 * Math.sin(tt * 12); brushRing(p.x + sw, p.y, 17, JJOK, 1.6, p.x); ctx.globalAlpha = 1; }
    if (on && P && !P.hook) { ctx.globalAlpha = .55; brushLine(P.x + P.w / 2, P.y + 10, p.x + sw, p.y, JJOK, 2, true, p.x); ctx.globalAlpha = 1; }   // what jump or 연 will catch
  }
  if (hookCand && hookCand.enemy && P && !P.hook) { ctx.globalAlpha = .6; brushLine(P.x + P.w / 2, P.y + 10, hookCand.x, hookCand.y, SEAL, 2, true, 7); brushRing(hookCand.x, hookCand.y, 16, SEAL, 1.6, 7); ctx.globalAlpha = 1; }   // 연사슬 target
  if (P && P.kiteFlash) { ctx.globalAlpha = Math.min(1, P.kiteFlash.t * 6); brushLine(P.x + P.w / 2, P.y + 12, P.kiteFlash.x1, P.kiteFlash.y1, pal.fig, 2, false, 3); ctx.globalAlpha = 1; }   // the kite string, snapping for a blink

  drawHazards(pal);
  for (const e of enemies) if (e.alive && (visible(e.x) || e.type === "b")) {
    if (e.hitT > 0 && Math.floor(e.hitT * 30) % 2) ctx.globalAlpha = .45;   // hit flicker
    if (e.alive) { const ga = ctx.globalAlpha; drawKanAura(e); ctx.globalAlpha = ga; }
    drawEnemy(e, pal); ctx.globalAlpha = 1;
    if (e.stunT > 0) { ctx.strokeStyle = `rgba(214,170,60,${.5 + .3 * Math.sin(tt * 20)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x + e.w / 2, e.type === "d" ? e.y - 8 : e.y - 26, 12, 4, 0, 0, 7); ctx.stroke(); }   // frozen by moonlight / lightning
    if (e.ward) { // 무당's talisman hovering over the warded soldier
      const wy = e.type === "d" ? e.y - 22 : e.y - 46, bob = Math.sin(tt * 3 + e.id) * 2;
      if (!drawSprite("foes2", F2.ward, e.x + e.w / 2, wy + bob, 24 / (SPR.foes2 ? SPR.foes2.f[F2.ward].h : 1), false, .5, false, .5)) { ctx.strokeStyle = JJOK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 26, 0, 7); ctx.stroke(); }
    }
    drawKanFlash(e, tt);
    if (e.maxHp > 1 && e.type !== "b") { // remaining hits as small ink drops over the head
      const top = e.type === "d" ? e.y - 10 : e.y - 34, cx = e.x + e.w / 2;
      for (let i = 0; i < e.maxHp; i++) { ctx.fillStyle = i < e.hp ? SEAL : "rgba(80,74,70,.35)"; ctx.beginPath(); ctx.arc(cx + (i - (e.maxHp - 1) / 2) * 7, top, 2.6, 0, 7); ctx.fill(); }
    }
  }
  for (const q of pops) { const a = Math.max(0, 1 - q.t / .9); ctx.globalAlpha = a; ctx.font = `400 ${q.big ? 20 : 14}px "Song Myung", serif`; ctx.textAlign = "center"; ctx.fillStyle = q.col; ctx.fillText(q.txt, q.x, q.y - q.t * 30); ctx.textAlign = "left"; } ctx.globalAlpha = 1;
  for (const t of trails) { ctx.globalAlpha = Math.max(0, 1 - t.t / t.life); if (!wfxLine(t.fr, t.x0, t.y0, t.x1, t.y1, t.w * 6, t.sheet)) inkLine(t.x0, t.y0, t.x1, t.y1, t.w, t.seed); } ctx.globalAlpha = 1;
  drawChungo(tt);
  for (const f of pfires) { ctx.globalAlpha = .75; if (SPR.gfx) drawSprite("gfx", 8, f.x + f.w / 2, f.y + f.h + 2, (f.h + 26) / SPR.gfx.f[8].h, false, .5, false, 1); ctx.globalAlpha = 1; }
  for (const b of bullets) {
    if (b.rocket && SPR.gfx) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); drawSprite("gfx", 2, -18, 0, (b.split ? 14 : 20) / SPR.gfx.f[2].h, false, .7, false, .5); ctx.restore(); continue; }
    if (b.cannon) { ctx.fillStyle = "#17161a"; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, 7); ctx.fill(); ctx.fillStyle = SEAL; ctx.beginPath(); ctx.arc(b.x - 2, b.y - 2, 2, 0, 7); ctx.fill(); if (Math.random() < .5) parts.push({ x: b.x, y: b.y, vx: 0, vy: -20, life: .4, max: .4, c: "rgba(60,56,58,.6)", s: 4 }); continue; }
    if (b.talisman) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang + Math.sin(b.t * 9) * .15); ctx.globalAlpha = Math.min(1, b.life * 4);   // 부적: yellow paper, vermilion seal strokes
      ctx.fillStyle = "#e8cf6a"; ctx.fillRect(-7, -12, 14, 24); ctx.strokeStyle = "#17161a"; ctx.lineWidth = .8; ctx.strokeRect(-7, -12, 14, 24);
      ctx.strokeStyle = SEAL; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(3, -8); ctx.moveTo(0, -9); ctx.lineTo(0, 8); ctx.moveTo(-4, -1); ctx.lineTo(4, 3); ctx.moveTo(4, -1); ctx.lineTo(-4, 3); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; continue; }
    if (b.blade && SPR.slashfx) { const f = SPR.slashfx.f[SF.arc], left = Math.cos(b.ang) < -.2; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(left ? b.ang + Math.PI : b.ang); ctx.globalAlpha = Math.min(1, b.life * 5) * .55;
      drawSprite("slashfx", SF.arc, 0, 0, 44 / f.h * (1 + .1 * Math.sin(b.t * 40)), left, .5, pal.night, .5); ctx.restore(); ctx.globalAlpha = 1; continue; }
    if (b.thorn) { const a = Math.atan2(b.vy, b.vx); ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a); ctx.fillStyle = "#9a1424"; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-10, -3); ctx.lineTo(-16, 0); ctx.lineTo(-10, 3); ctx.closePath(); ctx.fill(); ctx.restore();   // 혈 공명's thorn of blood
      if (Math.random() < .6) parts.push({ x: b.x, y: b.y, vx: 0, vy: 30, life: .3, max: .3, c: "#9a1424", s: 2 }); continue; }
    if (b.smoke && SPR.pfx) { const f = SPR.pfx.f[3]; ctx.globalAlpha = Math.min(1, b.life * 2.5) * .9; drawSprite("pfx", 3, b.x, b.y, 54 / f.h * (1 + (1 - Math.min(1, b.life)) * .3), false, .5, false, .5); ctx.globalAlpha = 1; continue; }   // 화약 연기
    if (b.fire && !b.smoke) { drawFlame(b); continue; }
    const bg = b.big ? 1.6 : 1, ps = b.sword ? ["slashfx", SF.sword, 16] : b.moon ? (SPR.ogA ? ["ogA", 8, 52 * bg] : ["slashfx", SF.moon, 46 * bg]) : b.dragon ? ["perkfx", PF.dragon, 40] : b.fire ? ["perkfx", PF.fire, 26 * bg] : b.tornado ? ["perkfx", PF.wind, 58 * bg] : null;
    if (ps && SPR[ps[0]]) { const f = SPR[ps[0]].f[ps[1]], fade = b.fire || b.tornado ? Math.min(1, b.life * 3) : 1; ctx.save(); ctx.translate(b.x, b.y); ctx.globalAlpha = fade * .95;
      if (b.sword || b.moon || b.dragon) { const a = Math.atan2(b.vy, b.vx), left = Math.cos(a) < 0; ctx.rotate(left ? a + Math.PI : a); drawSprite(ps[0], ps[1], 0, 0, ps[2] / f.h, left, .5, false, .5); }
      else drawSprite(ps[0], ps[1], 0, b.fire ? 8 : 0, ps[2] / f.h, false, .5, false, b.fire ? 1 : .5);
      ctx.restore(); ctx.globalAlpha = 1; continue; }
    const bs = b.fan ? FXB.fan : b.water ? FXB.water : b.scrap ? FXB.scrap : null;
    if (bs != null && SPR.bossfx && !b.friendly) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.fan ? b.t * 18 : b.scrap ? b.t * 9 : 0); drawSprite("bossfx", bs, 0, 0, (b.fan ? 30 : b.water ? 20 : 22) / SPR.bossfx.f[bs].h, false, .5, false, .5); ctx.restore(); continue; }
    if (b.orb && !b.friendly && SPR.bossB) { drawSprite("bossB", F3.orb, b.x, b.y, 24 / SPR.bossB.f[F3.orb].h, false, .5, false, .5); continue; }
    if (b.wave) { // the ground wave: a running crest of black ink with a red lip
      const d = Math.sign(b.vx), wob = Math.sin(tt * 30 + b.x * .05) * 2;
      ctx.fillStyle = pal.night ? "#d8d1c4" : "#17161a"; ctx.beginPath(); ctx.moveTo(b.x - d * 34, b.y + 12); ctx.quadraticCurveTo(b.x - d * 10, b.y - 20 + wob, b.x + d * 8, b.y - 14 + wob); ctx.quadraticCurveTo(b.x + d * 2, b.y, b.x + d * 12, b.y + 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = SEAL; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x - d * 6, b.y - 16 + wob); ctx.quadraticCurveTo(b.x + d * 6, b.y - 16 + wob, b.x + d * 8, b.y - 6); ctx.stroke();
      continue;
    }
    if (b.petOrb && SPR.pet) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(performance.now() / 120); drawSprite("pet", b.petFr || 26, 0, 0, 22 / SPR.pet.f[b.petFr || 26].h, false, .5, false, .5); ctx.restore(); continue; }
    if (b.red) { const r = 9 + Math.sin(performance.now() / 60) * 1.5; ctx.strokeStyle = "#17161a"; ctx.lineWidth = 1.6; ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, rr = k % 2 ? r : r + 5; ctx.lineTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr); } ctx.closePath(); ctx.stroke(); }   // the shot you cannot turn: a spiked ring, not only a colour
    if (b.red && SPR.mech) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI); drawSprite("mech", MECH.fire, 0, 0, 30 / SPR.mech.f[MECH.fire].h, false, .2, false, .5); ctx.restore(); continue; }
    const sp = Math.hypot(b.vx, b.vy) || 1, tl = b.sniper ? 34 : 18;
    const tr = ctx.createLinearGradient(b.x, b.y, b.x - b.vx / sp * tl, b.y - b.vy / sp * tl);
    tr.addColorStop(0, b.friendly ? "rgba(39,70,106,.8)" : "rgba(195,22,28,.75)"); tr.addColorStop(1, "rgba(140,134,126,0)");
    ctx.strokeStyle = tr; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx / sp * tl, b.y - b.vy / sp * tl); ctx.stroke();
    ctx.fillStyle = pal.night ? "#d8d1c4" : "#141317"; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = b.friendly ? JJOK_L : "#ff6a3d"; ctx.beginPath(); ctx.arc(b.x, b.y, 1.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineCap = "butt";
  const gsh = chr("munyeo") && SPR.mu ? "mu" : chr("posu") && SPR.po ? "po" : null;
  for (const g of ghosts) { ctx.globalAlpha = .3 * (1 - g.age / g.life); if (gsh) { drawSprite(gsh, H3.dash, g.x + 9, g.y + 31, kOf(gsh, 0, HERO_H * 1.08), g.face < 0, (gsh === "mu" ? MU_AX : PO_AX)[H3.dash], !!LV.pal.night); continue; } if (!(SPR.hero3 ? drawSprite("hero3", H3.dash, g.x + 9, g.y + 31, kOf("hero3", H3.idle, HERO_H * 1.08), g.face < 0, H3_AX[H3.dash], !!LV.pal.night) : drawSprite("hero", HERO.dash, g.x + 9, g.y + 31, kOf("hero", 0, HERO_H), g.face < 0, .55, !!LV.pal.night))) drawRunner(g.x, g.y, g.face, JJOK, null); }
  ctx.globalAlpha = 1;
  for (const bm of beams) if (bm.arrow) { // 각궁: the arrow crosses its line in a blink, a wake of ink behind it
    const k = 1 - bm.t / bm.life, f = Math.min(1, bm.t / .08), hx = bm.x0 + (bm.x1 - bm.x0) * f, hy = bm.y0 + (bm.y1 - bm.y0) * f, a = Math.atan2(bm.y1 - bm.y0, bm.x1 - bm.x0);
    ctx.strokeStyle = `rgba(23,22,26,${.45 * k})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bm.x0, bm.y0); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.globalAlpha = Math.min(1, k * 2);
    ctx.strokeStyle = "#17161a"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(4, 0); ctx.stroke();
    ctx.fillStyle = "#17161a"; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(2, -4); ctx.lineTo(2, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SEAL; ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(-38, -6); ctx.lineTo(-34, 0); ctx.lineTo(-38, 6); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }
  for (const bm of beams) if (bm.red && !bm.arrow && bm.t >= 0) { const k = Math.min(1, 1 - bm.t / bm.life);   // the shot's line: a painted tracer stroke, like every other line
    ctx.globalAlpha = Math.min(1, k * 1.6); const h = (5 + 6 * k) * Math.min(2, bm.w || 1);
    if (!wfxLine(5, bm.x0, bm.y0, bm.x1, bm.y1, h, "gfx")) wfxLine(WF2.streak, bm.x0, bm.y0, bm.x1, bm.y1, h * 2);
    ctx.globalAlpha = 1; }
  if (SPR.slashfx) for (const bm of beams) if (!bm.red) { // 뇌전: a bolt stretched from the blade to each foe
    const f = SPR.slashfx.f[SF.bolt], len = Math.hypot(bm.x1 - bm.x0, bm.y1 - bm.y0), th = 26 * (1 - bm.t / bm.life * .5);
    ctx.save(); ctx.translate(bm.x0, bm.y0); ctx.rotate(Math.atan2(bm.y1 - bm.y0, bm.x1 - bm.x0)); ctx.globalAlpha = 1 - bm.t / bm.life * .6;
    ctx.drawImage(SPR.slashfx.img, f.x, f.y, f.w, f.h, 0, -th / 2, len, th); ctx.restore(); ctx.globalAlpha = 1; }
  drawBolts(); drawKegsRings(); drawCutLines();
  if (SPR.perkfx) for (const c of clones) { ctx.globalAlpha = .45 + .15 * Math.sin(performance.now() / 40); const cf = CF("clone"); if (cf && SPR[cf[0]]) { drawSprite(cf[0], cf[1], c.x, c.y, HERO_H * 1.15 / SPR[cf[0]].f[cf[1]].h, c.face < 0, .5, false, 1); ctx.globalAlpha = 1; continue; } drawSprite("perkfx", PF.clone, c.x, c.y, kOf("hero3", H3.idle, HERO_H * 1.08) * 1.1, c.face < 0, .5, false, 1); ctx.globalAlpha = 1; }
  drawVfx(pal, true, vw);   // effects that belong behind the body (the 납도 ink at the feet)
  drawPet(pal); drawAmmo();
  for (const e of enemies) if (e.alive && e.introUntil > songPos) { const k = (e.introUntil - songPos) / 2.5, r = Math.max(e.w, e.h) * .75 + 6 + Math.sin(songPos * 9) * 2; ctx.globalAlpha = Math.min(1, k * 2); ctx.strokeStyle = SEAL; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(e.x + e.w / 2, e.y + e.h / 2, r, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }   // 처음 보는 적: a dashed red ring
  if (P && (state === "play" || state === "pause" || state === "result" || state === "dead")) drawPlayer(pal);
  drawHubLabels(pal);   // the names sit above every figure
  for (const p of parts) { // round drops of ink, stretched a little along their flight — never square specks
    const k = Math.max(0, p.life / p.max), sp = Math.hypot(p.vx, p.vy), r = p.s * .5 * (.6 + .4 * k), st = Math.min(2.2, 1 + sp / 500);
    ctx.globalAlpha = k; ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * st, r, sp > 20 ? Math.atan2(p.vy, p.vx) : 0, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
  // painted one-shot effects
  drawVfx(pal, false, vw);
  // 일격 seals
  for (const s of seals) {
    if (s.ch) { // a stamped character: vermilion block, carved frame, paper-white 斬 — it lands hard and stays a moment
      const a = s.t < .06 ? s.t / .06 : 1 - Math.max(0, s.t - .7) / .4, sc = s.t < .06 ? 2 - s.t / .06 : 1 + Math.max(0, .1 - s.t) * .6, z = s.big ? 46 : 30;
      ctx.save(); ctx.translate(s.x, s.y - 30); ctx.rotate(s.rot); ctx.scale(sc, sc); ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = "rgba(23,22,26,.35)"; ctx.fillRect(-z / 2 + 3, -z / 2 + 3, z, z);
      ctx.fillStyle = SEAL; ctx.fillRect(-z / 2, -z / 2, z, z);
      if (SPR.vis) drawSprite("vis", VIS.seal, 0, 0, z * 1.08 / SPR.vis.f[VIS.seal].h, false, .5, false, .5);
      ctx.fillStyle = "#f6f0e2"; ctx.font = `700 ${Math.round(z * .62)}px "Song Myung", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s.ch, 0, 1);
      ctx.restore(); ctx.textAlign = "left"; continue;
    }
    if (SPR.fx) {
      const a = s.t < .08 ? s.t / .08 : 1 - Math.max(0, s.t - .35) / .35, sc = s.t < .08 ? 1.7 - s.t / .08 * .7 : 1;
      ctx.save(); ctx.translate(s.x, s.y - 22); ctx.rotate(s.rot); ctx.globalAlpha = Math.max(0, a);
      drawSprite("fx", FX.seal, 0, 0, 30 * sc / SPR.fx.f[FX.seal].h, false, .5, false, .5);
      ctx.restore(); continue;
    }
    const a = s.t < .08 ? s.t / .08 : 1 - Math.max(0, s.t - .35) / .35, sc = s.t < .08 ? 1.6 - s.t / .08 * .6 : 1;
    ctx.save(); ctx.translate(s.x, s.y - 18); ctx.rotate(s.rot); ctx.scale(sc, sc); ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = SEAL; ctx.fillRect(-13, -13, 26, 26);
    ctx.fillStyle = "#f4efe4"; ctx.font = `700 15px "Song Myung", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("擊", 0, 1);
    ctx.restore(); ctx.textAlign = "left";
  }
  ctx.globalAlpha = 1;

  if (P && P.focus && state === "play") {
    const d = aimDir(), cx = P.x + P.w / 2, cy = P.y + P.h / 2;
    const ac = pal.night && !SPR.guide ? "#b9c8ea" : JJOK;   // indigo on paper, pale blue on the inverted night
    ctx.globalAlpha = .7; brushLine(cx + d.x * 20, cy + d.y * 20, cx + d.x * 138, cy + d.y * 138, ac, 2.4, true, 11); ctx.globalAlpha = 1;   // the line of the dash, a light trail of brush dabs
    if (has("d_charge")) { const c = Math.min(1, P.focusT / .8); ctx.globalAlpha = .75; brushRing(cx, cy, 16 + 22 * c, c >= 1 ? SEAL : ac, c >= 1 ? 2.4 : 1.4, 7); ctx.globalAlpha = 1; }   // 축기: the ring fills, red when full
    const rs = 1 + Math.sin(performance.now() / 90) * .06;
    { const rx = cx + d.x * 152, ry = cy + d.y * 152; ctx.globalAlpha = .8; brushRing(rx, ry, 9 * rs, ac, 1.6, 5); if (!SPR.guide) for (let q = 0; q < 4; q++) { const qa = q * Math.PI / 2 + .3; inkDab(rx + Math.cos(qa) * 14 * rs, ry + Math.sin(qa) * 14 * rs, qa, 6, 1.6, ac); } ctx.globalAlpha = 1; }   // where the dash will land, a small brushed ring
  }

  if (PORTRAIT() && LV && !LV.hub) { const g = ctx.createLinearGradient(0, LV.h * T - 8, 0, LV.h * T + 120); g.addColorStop(0, pal.night ? "rgba(10,10,14,.0)" : "rgba(23,22,26,0)"); g.addColorStop(.15, pal.night ? "#0c0b10" : "#2a2729"); g.addColorStop(1, pal.night ? "#0c0b10" : "#1d1b1e"); ctx.fillStyle = g; ctx.fillRect(cam.x - vw, LV.h * T - 8, vw * 2, vh + 16); }   // 세로: under the stage, the earth where the thumbs rest
  // screen space overlays
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!vignette) { vignette = ctx.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * .35, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * .75); vignette.addColorStop(0, "rgba(20,18,16,0)"); vignette.addColorStop(1, "rgba(20,18,16,.32)"); }
  if (omen("angae") && P) { // 안개: only a pocket of paper around the swordsman stays clear
    const px = (P.x + P.w / 2 - cam.x) * SCALE * DPR + cv.width / 2, py = (P.y + P.h / 2 - cam.y) * SCALE * DPR + cv.height / 2, r = 120 * SCALE * DPR;
    const fg = ctx.createRadialGradient(px, py, r * .8, px, py, r * 2.6); fg.addColorStop(0, "rgba(226,222,212,0)"); fg.addColorStop(1, pal.night ? "rgba(30,28,30,.9)" : "rgba(226,222,212,.9)");
    ctx.fillStyle = fg; ctx.fillRect(0, 0, cv.width, cv.height);
  }
  if (!LITE()) { ctx.fillStyle = vignette; ctx.fillRect(0, 0, cv.width, cv.height); }
  const boss = enemies.find(e => e.type === "b" && e.alive && e.awake);
  if (boss && (state === "play" || state === "dead" || state === "pause")) { // 수문장's life as a brush bar along the top
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const bw = Math.min(440, W * .6), bx = W / 2 - bw / 2, by = 48, fr = Math.max(0, boss.hp) / boss.maxHp;
    boss.hpShow = Math.max(boss.hp, (boss.hpShow ?? boss.hp) - rdt * boss.maxHp * .35);
    ctx.fillStyle = "rgba(23,22,26,.3)"; ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
    ctx.fillStyle = "rgba(242,226,200,.85)"; ctx.fillRect(bx, by, bw * Math.max(0, boss.hpShow) / boss.maxHp, 8);
    ctx.fillStyle = boss.raged ? "#e0331f" : SEAL; ctx.fillRect(bx, by, bw * fr, 8);
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(bx, by, bw * fr, 3);
    if (!boss.raged) { ctx.fillStyle = pal.text; ctx.fillRect(bx + bw / 2 - 1, by - 4, 2, 16); }   // where the fury wakes
    if ((boss.recoverUntil || 0) > songPos && !boss.act && boss.stagT <= .5) { ctx.fillStyle = SEAL; ctx.font = `400 12px "Song Myung", serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("틈", bx + bw + 8, by + 4); }
    if (boss.stagT > .5) { ctx.fillStyle = JJOK; ctx.font = `400 12px "Song Myung", serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("흐트러짐", bx + bw + 8, by + 4); }
    { const ni = BNAME[boss.kind], hw = SPR.bname && ni != null ? sprW("bname", ni, 20) : 0, label = `${BOSSES[boss.kind].name}${boss.raged ? " · 격노" : ""}`;
      ctx.font = `400 16px "Song Myung", serif`; const tw = ctx.measureText(label).width, x0 = W / 2 - (tw + (hw ? hw + 8 : 0)) / 2;
      ctx.fillStyle = boss.raged ? SEAL : pal.text; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(label, x0, by - 4);
      if (hw) spr("bname", ni, x0 + tw + 8 + hw / 2, by - 13, 20); else { ctx.fillStyle = pal.text; ctx.fillText(" " + BOSSES[boss.kind].han, x0 + tw, by - 4); } }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  drawBossCards(pal); drawCombatHud(pal);
  if (P && P.focus && state === "play") { ctx.fillStyle = "rgba(39,70,106,.14)"; ctx.fillRect(0, 0, cv.width, cv.height); }
  else if (killCam > 0 && state === "play") { ctx.fillStyle = `rgba(120,10,16,${.12 * Math.min(1, killCam * 3)})`; ctx.fillRect(0, 0, cv.width, cv.height); }   // a faint red breath over the held moment
  if (flash > 0) { ctx.strokeStyle = `rgba(195,22,28,${flash * (settings.calm ? 1 : 3)})`; ctx.lineWidth = 10 * DPR; ctx.strokeRect(0, 0, cv.width, cv.height); }
  drawTrail();
  if ((state === "play" || state === "dead" || state === "pause") && !hubOn) drawBeatBar(pal);
  if (state === "dead") {
    const a = Math.max(0, 1 - deathT / 0.75);
    ctx.fillStyle = `rgba(20,18,20,${0.55 * a})`; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = Math.min(1, a * 2);
    ctx.fillStyle = "#f1ede4"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const sf = SPR.roguea && SPR.roguea.f[0];
    if (sf) { // 絶命 in red brush, written down the screen; lands large and settles
      const k = Math.min(1, deathT / .12), sw = Math.min(W * .22, 180) * (1.2 - .2 * k), sh = sw * sf.h / sf.w;
      ctx.drawImage(SPR.roguea.img, sf.x, sf.y, sf.w, sf.h, W / 2 - sw / 2, H / 2 - sh / 2 - 6, sw, sh);
    } else { ctx.font = `400 ${Math.min(72, W / 8)}px "Song Myung", serif`; ctx.fillText("절명", W / 2, H / 2 - 12); }
    if (mode !== "tutorial") { ctx.font = `600 13px ${BODY_FONT}`; ctx.fillText(run.breath > 0 ? `남은 숨 ${run.breath}` : "숨이 다했다", W / 2, H - 92); }
    ctx.textAlign = "left"; ctx.globalAlpha = 1;
  }
}
const SEASON_TINT = [null, "rgb(236,206,170)", "rgb(196,210,232)", "rgb(246,226,226)"];
const LEAF = ["#a8471f", "#c7782a", "#7a3a1a", "#b5561f"], PETAL = ["#e9a3b0", "#f2c4cc", "#f7dbe0"];
function drawWeather(ssn, tt, pal) { // screen-space weather: 여름 비, 가을 낙엽, 겨울 눈, 봄 꽃잎; 역풍 slants it hard
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const wind = omen("yeokpung") ? 1 : 0, wrap = (v, m) => ((v % m) + m) % m;
  if (ssn === 0) {
    ctx.strokeStyle = `rgba(${pal.wash},.13)`; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 60; i++) {
      const rx = wrap(i * 137.5 + tt * (50 - wind * 420) - cam.x * 0.6, W + 40) - 20, ry = wrap(i * 89.3 + tt * 650, H + 40) - 20;
      ctx.moveTo(rx, ry); ctx.lineTo(rx - 3 - wind * 9, ry + 13);
    }
    ctx.stroke(); return;
  }
  const n = Math.round((ssn === 2 ? 80 : 34) * (MOBILE ? .55 : 1));   // phones: fewer flakes, same feel
  for (let i = 0; i < n; i++) {
    const sp = ssn === 2 ? 40 + (i % 5) * 12 : 55 + (i % 4) * 14, sway = Math.sin(tt * (1 + i % 3 * .4) + i) * (ssn === 2 ? 14 : 30);
    const x = wrap(i * 173.3 + sway + tt * (14 - wind * 260) - cam.x * .5, W + 40) - 20, y = wrap(i * 97.1 + tt * sp, H + 40) - 20;
    if (ssn === 2) { ctx.fillStyle = pal.night ? "rgba(236,230,216,.6)" : "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * .7, 0, 7); ctx.fill(); continue; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(tt * (1 + i % 4) * .7 + i); ctx.globalAlpha = .75;
    ctx.fillStyle = ssn === 1 ? LEAF[i % 4] : PETAL[i % 3];
    ctx.beginPath(); ctx.ellipse(0, 0, ssn === 1 ? 4.2 : 3, ssn === 1 ? 2.2 : 1.8, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawBackdrop(pal) {
  const camX = cam.x || 0, camY = cam.y || 0;
  const lh = LV ? LV.h * T : 512;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  { const by = H * .8 + (lh - camY) * .22 * .5 * SCALE, g = ctx.createLinearGradient(0, Math.min(H * .55, by - H * .25), 0, H);   // under the far hills: mist thickening toward the gorge, never bare paper
    g.addColorStop(0, `rgba(${pal.wash},0)`); g.addColorStop(.55, `rgba(${pal.wash},${pal.night ? .08 : .1})`); g.addColorStop(1, `rgba(${pal.wash},${pal.night ? .18 : .26})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  const layers = [["far", .08, pal.farA, .58, .66], ["mid", .22, pal.midA, .8, .78]];
  layers.forEach(([key, f, alpha, bottom, hFrac], li) => {
    const yoff = (lh - camY) * f * .5 * SCALE;
    const by = H * bottom + yoff;
    const img = IMG[key] && !LITE() ? bakePaper(IMG[key]) : IMG[key];
    ctx.globalAlpha = alpha;
    if (img) {
      const h = H * hFrac, w = h * img.width / img.height, off = ((camX * f * SCALE) % w + w) % w;
      for (let x = -off; x < W; x += w) ctx.drawImage(img, x, by - h, w, h);
    } else if (LV) {
      const r = LV.ridges[li], off = camX * r.f * SCALE;
      const g = ctx.createLinearGradient(0, by - 140, 0, by + 120);
      g.addColorStop(0, `rgba(${pal.wash},${li ? .55 : .35})`); g.addColorStop(1, `rgba(${pal.wash},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, H + 10);
      let prev = null;
      for (const [x, y] of r.pts) {
        const px = x * SCALE * .6 - off + W * .2, py = by - 60 + y * (li ? .9 : 1.3);
        if (px < -300 || px > W + 300) continue;
        if (!prev) ctx.lineTo(px, py); else ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + px) / 2, (prev[1] + py) / 2);
        prev = [px, py];
      }
      ctx.lineTo(W + 10, H + 10); ctx.closePath(); ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
  if (LV) { // mist band in front of the city, as in the reference art
    const my = H * .8 + (lh - camY) * .11 * SCALE, mg = ctx.createLinearGradient(0, my - 90, 0, my + 70);
    const fog = pal.rim ? "37,35,33" : "236,232,223";
    mg.addColorStop(0, `rgba(${fog},0)`); mg.addColorStop(.55, `rgba(${fog},${pal.rim ? .55 : .7})`); mg.addColorStop(1, `rgba(${fog},0)`);
    ctx.fillStyle = mg; ctx.fillRect(0, my - 90, W, 160);
  }
}
function drawTrail() {
  const now = performance.now();
  while (trail.length && now - trail[0].t > 260) trail.shift();
  if (trail.length < 2) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.lineCap = "round"; ctx.strokeStyle = LV ? LV.pal.fig : "#141317";
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i]; if (b.start) continue;
    const life = 1 - (now - b.t) / 260; ctx.globalAlpha = Math.max(0, life) * .55; ctx.lineWidth = 2 + life * 7;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.lineCap = "butt";
}
let beatHitAt = 0;   // when the last 일격 landed, for the burst on the ring
function drawBeatBar(pal) {
  // drums slide in at an even spacing and are struck as they reach the ring on the left: that moment is the 일격 window
  const def = Music.def; if (!def) return;
  const bl = Music.beatLen, pos = Music.pos(), ahead = 4, gap = Math.max(44, Math.min(64, (W - 40 - 104) / ahead)), mx = PORTRAIT() ? (W - gap * ahead) / 2 : W / 2 - 96, y = H - 30 - SAB;   // 세로: the board shrinks to the screen's width and sits centred above the home bar
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const bf = SPR.props2 && SPR.props2.f[P2.board];
  if (bf) { // lacquered board: end caps keep their proportions, only the plain middle stretches
    const bw = gap * ahead + 104, bh = 62, cap = bf.w * .16, capW = cap * bh / bf.h, bx = mx - 52, im = SPR.props2.img;
    ctx.drawImage(im, bf.x, bf.y, cap, bf.h, bx, y - 30, capW, bh);
    ctx.drawImage(im, bf.x + cap, bf.y, bf.w - cap * 2, bf.h, bx + capW - .5, y - 30, bw - capW * 2 + 1, bh);
    ctx.drawImage(im, bf.x + bf.w - cap, bf.y, cap, bf.h, bx + bw - capW, y - 30, capW, bh);
  }
  else uiPatch(5, mx - 46, y - 30, gap * ahead + 92, 60, pal.night ? .5 : .9);
  // 천고 기운: five drums light up as the fight is won by 일섬; all five lit, the great drum calls for 천고난무
  const qi = (run && run.qi) || 0, full = qi >= 100 && mode !== "tutorial", ph = ((pos / bl) % 1 + 1) % 1, beatK = Math.max(0, .2 - Math.min(ph, 1 - ph)) * 1.2;   // the drums still nod to the music
  for (let i = 0; i <= ahead; i++) {
    const x = mx + i * gap, big = i === ahead, lit = Math.max(0, Math.min(1, (qi - i * 20) / 20)), sz = (big ? 42 : 30) * (1 + (lit >= 1 ? beatK : 0) + (full && big ? .12 + beatK : 0));
    ctx.globalAlpha = .22 + .78 * lit;
    if (!(SPR.vis && drawSprite("vis", big ? VIS.bigDrum : VIS.drum, x, y, sz / SPR.vis.f[big ? VIS.bigDrum : VIS.drum].h, false, .5, false, .5))) { ctx.fillStyle = lit >= 1 ? SEAL : pal.text; ctx.beginPath(); ctx.arc(x, y, sz / 3, 0, Math.PI * 2); ctx.fill(); }
    if (lit > 0 && lit < 1) { ctx.globalAlpha = 1; ctx.strokeStyle = "rgba(232,184,74,.9)"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, sz * .56, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lit); ctx.stroke(); }
  }
  drumHit = full ? { x: mx + ahead * gap, y, r: 40 } : null;   // the full 태극 drum is itself the button
  if (full) { const x = mx + ahead * gap, pulse = .6 + .4 * Math.sin(performance.now() / 120); ctx.globalAlpha = pulse;
    if (!(SPR.mech && drawSprite("mech", MECH.drum, x, y, 66 * (1 + .06 * pulse) / SPR.mech.f[MECH.drum].h, false, .5, false, .5))) { ctx.strokeStyle = "rgba(232,184,74,.95)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1; }
  ctx.globalAlpha = 1;
}
function drawRunner(x, y, face, col, pl) {
  const cx = x + 9, lean = pl ? Math.max(-4, Math.min(4, pl.vx * 0.012)) : face * 2;
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = "round";
  // head under a 삿갓 (conical bamboo hat) - the silhouette that sets 무명 apart from the 갓-wearing guards
  const hx = cx + lean, tilt = lean * 0.04;
  ctx.beginPath(); ctx.arc(hx, y + 7.5, 4, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(hx, y + 4); ctx.rotate(tilt);
  ctx.beginPath(); ctx.moveTo(-12, 2.2); ctx.quadraticCurveTo(-6, -1, face * 1.2, -7.5); ctx.quadraticCurveTo(6, -1, 12, 2.2); ctx.quadraticCurveTo(0, 3.6, -12, 2.2); ctx.fill();
  ctx.strokeStyle = HAT_WEAVE[col] || "rgba(128,120,110,.55)"; ctx.lineWidth = .7;
  ctx.beginPath(); ctx.moveTo(-7, .9); ctx.lineTo(face * 1.2, -7); ctx.lineTo(7, .9); ctx.moveTo(-3.5, 1.4); ctx.lineTo(face * 1.2, -7); ctx.lineTo(3.5, 1.4); ctx.stroke();
  ctx.restore(); ctx.strokeStyle = col;
  // coat
  ctx.beginPath(); ctx.moveTo(cx + lean - 4, y + 10); ctx.lineTo(cx + lean + 4, y + 10); ctx.lineTo(cx + 5 - face * 2, y + 22); ctx.lineTo(cx - 5 - face * 4, y + 23); ctx.closePath(); ctx.fill();
  let a1 = .35, a2 = -.35;
  if (pl) {
    if (pl.onGround && Math.abs(pl.vx) > 20) { const s = Math.sin(pl.run); a1 = s * .9; a2 = -s * .9; }
    else if (!pl.onGround) { a1 = .9 * face; a2 = -.2 * face; if (pl.wall) { a1 = -.6 * pl.wall; a2 = -.2 * pl.wall; } }
  }
  ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.moveTo(cx, y + 20); ctx.lineTo(cx + Math.sin(a1) * 10, y + 20 + Math.cos(a1) * 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, y + 20); ctx.lineTo(cx + Math.sin(a2) * 10, y + 20 + Math.cos(a2) * 10); ctx.stroke();
  ctx.lineCap = "butt";
}
// mv0-2 (무명·무녀·포수): an 8-step run with the legs crossing, a 4-step cut and a 4-step dashing cut
const MV_BASE = { mv0: "hero3", mv1: "mu", mv2: "po", mvrun: "hero3" };
function movePose(mv) {
  if (!SPR[mv]) return null;
  if (P.slashT > 0 && Math.abs(P.slashDir.y) <= .5) { const pr = 1 - Math.min(1, P.slashT / (P.slashDur || .14)); return [mv, (P.dashT > 0 ? 12 : 8) + Math.min(3, Math.floor(pr * 4))]; }
  if (P.dashT > 0 && !P.hook && P.slashT <= 0) return [mv, 14];
  if (P.onGround && Math.abs(P.vx) > 40 && !(P.landT > 0) && P.slashT <= 0) return [mv === "mv0" && SPR.mvrun ? "mvrun" : mv, Math.floor(P.run / 1.05) % 8];
  return null;
}
const SWM = { parry: 0, counter: 1, spin: 2, xcut: 3, plunge: 4, slam: 5, iaiReady: 6, iaiCut: 7, sheathe: 8 }, SWM_AX = [.5, .55, .5, .45, .5, .4, .5, .3, .5];   // new sword moves
function gunPose() { // 무명 with a gun: aim, fire, recoil, thrust, reload — the cannon and the rocket box have their own sheet
  const w = wpn(), j = w === "jochong", b = { seungja: 0, singi: 3, cheonja: 6 }[w] ?? 0;
  if (!SPR.gun1 || (!j && !SPR.gun2)) return null;
  if (P.fireT > 0) return j ? ["gun1", 2] : ["gun2", b + 1];
  if (P.focus && !P.focusTap && P.focusT > TAP_T) { const a = aimDir(); if (j) return a.y > .6 ? ["gun1", 5] : !P.onGround ? ["gun1", 8] : ["gun1", 1]; return w === "singi" && a.y < -.5 ? ["gun2", 5] : w === "cheonja" && a.y > .5 ? ["gun2", 8] : ["gun2", b]; }
  if (P.slashT > 0 || P.bayoLunge) return j ? ["gun1", 4] : ["gun2", b];   // 근접: the 조총 thrusts its bayonet; the others ram with the barrel they hold
  if (!P.onGround && P.lastShotAt != null && songPos - P.lastShotAt < .6) return j ? ["gun1", 3] : ["gun2", w === "seungja" ? 2 : b];
  if (P.reloadT > 0 && P.onGround && j) return ["gun1", 6];
  if (!P.onGround) return j ? ["gun1", 8] : ["gun2", b];
  if (Math.abs(P.vx) > 40) { const rf = Math.floor(P.run / 1.05) % 8; return SPR.grun2 ? ["grun2", { jochong: 0, seungja: 8, singi: 16, cheonja: 24 }[w] + rf] : j ? ["gun1", 7] : ["gun2", b]; }   // an eight-step run, legs trading, for each gun
  return j ? ["gun1", 0] : ["gun2", b];
}
function heroPose() { // [sheet, frame]
  if (isGun() && state !== "dead") { const g = gunPose(); if (g) return g; }
  const cb = !SPR.chars ? -1 : chr("munyeo") ? 0 : chr("posu") ? 8 : -1;
  if (cb >= 0) { // 무녀 and 포수 have their own sheet
    const w = wpn();
    if (SPR.arms && state !== "dead") { // 방울·신칼·각궁·창 have their own stances
      if (w === "gakgung" && (P.iaiHold || (P.slashT > 0 && P.strike))) return ["arms", P.iaiHold ? 4 : 5];
      const A = { bangul: [0, 1], singal: [2, 3], gakgung: [null, 5], chang: [6, 7] }[w];
      if (A && P.slashT > 0) return ["arms", A[1]];
      if (A && A[0] != null && P.onGround && Math.abs(P.vx) <= 40 && !(P.dashT > 0)) return ["arms", A[0]];
    }
    if (state === "dead") return ["chars", cb + 7];
    const sh = cb ? "po" : "mu";
    if (SPR[sh]) { // the full set of moves
      const mp = movePose(cb ? "mv2" : "mv1"); if (mp) return mp;
      if (P.slashT > 0) return [sh, P.slashDir.y < -0.5 ? H3.up : (P.slashDir.y > 0.5 && !P.onGround ? H3.down : H3.slash)];
      if (P.dashT > 0 || P.hook) return [sh, H3.dash];
      if (!P.onGround) return [sh, P.wall ? H3.wall : P.vy < -150 ? H3.rise : Math.abs(P.vy) < 150 ? H3.flip : H3.fall];
      if (P.landT > 0) return [sh, H3.land];
      if (Math.abs(P.vx) > 40) return [sh, H3.run[Math.floor(P.run / 1.05) % H3.run.length]];
      return [sh, H3.idle];
    }
    if (P.slashT > 0) return ["chars", cb + (P.strike ? 6 : 5)];
    if (P.dashT > 0 || P.hook) return ["chars", cb ? cb + 2 : 6];
    if (!P.onGround) return ["chars", cb + 4];
    if (Math.abs(P.vx) > 40) return ["chars", cb + 1 + Math.floor(P.run / 1.05) % 3];
    return ["chars", cb];
  }
  if (state === "dead") return ["hero", HERO.dead];
  if (SPR.hero3 && SPR.weapons && wpn() !== "hwando") { // the weapon's own stances
    const w = wpn();
    if (SPR.swm) {   // the redrawn moves
      if (w === "baldo" && (P.iaiCut || (P.slashT > 0 && P.strike))) return ["swm", SWM.iaiCut];
      if (w === "baldo" && (P.iaiHold || (P.focus && P.focusT > TAP_T))) return ["swm", SWM.iaiReady];
      if (w === "woldo" && P.slam && !P.onGround) return ["swm", SWM.plunge];
      if (w === "woldo" && (P.slamLandT || 0) > 0) return ["swm", SWM.slam];
      if (w === "ssang" && P.slashT > 0 && P.strike) return ["swm", SWM.xcut];
      if (w === "ssang" && P.slashT > 0 && P.spinCut) return ["swm", SWM.spin];
      if (w === "baldo" && P.onGround && Math.abs(P.vx) <= 40 && !P.landT && !(P.dashT > 0) && !(P.slashT > 0)) return ["swm", SWM.sheathe]; }
    if (w === "baldo" && (P.iaiCut || (P.slashT > 0 && P.strike))) return ["weapons", WF.bdCut];
    if (w === "baldo" && P.iaiHold && P.onGround) return ["weapons", WF.bdStance];
    if (P.slashT > 0) return ["weapons", w === "ssang" ? ((P.combo || 0) % 2 ? WF.ssA : WF.ssB) : w === "woldo" ? (P.slashDir.y > .5 && !P.onGround ? WF.wdSlam : WF.wdSweep) : WF.bdCut];
    if (P.onGround && Math.abs(P.vx) <= 40 && !P.landT && !(P.dashT > 0)) return ["weapons", w === "ssang" ? WF.ssIdle : w === "woldo" ? WF.wdIdle : WF.bdSheathe];
  }
  if (SPR.hero3) {
    if (SPR.swm && wrule() === "hwando" && (P.counterT || 0) > 0) return ["swm", SWM.counter];   // 받아치기: through and past
    { const mp = movePose("mv0"); if (mp) return mp; }
    if (P.slashT > 0 && SPR.slashfx) return ["slashfx", P.slashDir.y < -0.5 ? SF.up : (P.slashDir.y > 0.5 && !P.onGround ? SF.down : SF.fwd)];
    if (P.slashT > 0) return ["hero3", P.slashDir.y < -0.5 ? H3.up : (P.slashDir.y > 0.5 && !P.onGround ? H3.down : H3.slash)];
    if (P.dashT > 0 || P.hook) return ["hero3", H3.dash];
    if (!P.onGround) return ["hero3", P.wall ? H3.wall : P.vy < -150 ? H3.rise : Math.abs(P.vy) < 150 ? H3.flip : H3.fall];
    if (P.landT > 0) return ["hero3", H3.land];
    if (Math.abs(P.vx) > 40) return ["hero3", H3.run[Math.floor(P.run / 1.05) % H3.run.length]];
    return ["hero3", H3.idle];
  }
  if (P.slashT > 0) return ["hero", P.slashDir.y < -0.5 ? HERO.up : (P.slashDir.y > 0.5 && !P.onGround ? HERO.fall : HERO.slash)];
  if (P.dashT > 0 || P.hook) return ["hero", HERO.dash];
  if (!P.onGround) {
    if (P.wall) return ["hero", HERO.wall];
    if (P.airT < .12 && P.vy < 0) return ["hero2", H2.takeoff];
    if (Math.abs(P.vy) < 150) return ["hero2", H2.apex];
    return ["hero", P.vy < 0 ? HERO.rise : HERO.fall];
  }
  if (P.landT > 0) return ["hero2", H2.land];
  const a = axis().x, ix = a > .3 ? 1 : a < -.3 ? -1 : 0;
  if (Math.abs(P.vx) > 40) {
    if (ix && Math.sign(P.vx) !== ix) return ["hero2", H2.turn];
    if (!ix && Math.abs(P.vx) > 110) return ["hero2", H2.skid];
    if ((P.runT || 0) < .12) return ["hero2", H2.start];
    return ["hero", HERO.run[Math.floor(P.run / 1.05) % HERO.run.length]];
  }
  if (P.slashCd > 0) return ["hero2", H2.guard];
  return ["hero2", H2.idle[Math.floor(performance.now() / 420) % 3]];
}
function drawVfx(pal, back, vw = 1e9) {
  for (const v of vfx) { if (!!v.back !== back || Math.abs(v.x - cam.x) > vw / 2 + v.h * 1.5 + 40) continue;   // off-screen effects are not drawn
    const k = v.t / v.life, s = SPR[v.sheet]; if (!s) continue; const f = s.f[v.i], sc = v.h / f.h * (1 - v.grow * .5 + v.grow * k);
    ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.rot); ctx.globalAlpha = v.a * Math.min(1, (1 - k) * 2.2);
    drawSprite(v.sheet, v.i, 0, 0, sc, v.flip, v.ax ?? .5, pal.night && v.sheet === "hud" && v.i !== HUD.spark, v.ay);
    ctx.restore(); }
  ctx.globalAlpha = 1;
}
function drawPlayer(pal) {
  if (!SPR.hero) { if (state !== "dead") legacyPlayer(pal); return; }
  let [sheet, fr] = heroPose(); if (sheet === "hero2" && !SPR.hero2) { sheet = "hero"; fr = HERO.idle; }
  const cx = P.x + P.w / 2, wallPose = sheet === "hero" && fr === HERO.wall, face = wallPose ? P.wall : P.face;
  // hero2 is scaled so its first running step matches the original running frames
  const k = sheet === "gun1" || sheet === "gun2" || sheet === "grun" || sheet === "grun2" || sheet === "swm" ? kOf("hero3", H3.idle, HERO_H * 1.08) * SLASH_K * .75 / .8 * (sheet === "swm" ? 1.05 : 1) : MV_BASE[sheet] ? kOf(MV_BASE[sheet], 0, HERO_H * 1.08) * SPR[MV_BASE[sheet]].f[1].h / SPR[sheet].f[0].h : sheet === "mu" || sheet === "po" ? kOf(sheet, 0, HERO_H * 1.08) : sheet === "arms" ? kOf("arms", fr < 4 ? 2 : 5, HERO_H * 1.08) : sheet === "chars" ? kOf("chars", fr < 8 ? 0 : 8, HERO_H * 1.08) : sheet === "weapons" ? kOf("hero3", H3.idle, HERO_H * 1.08) * SLASH_K * .75 / .8 : sheet === "slashfx" ? kOf("hero3", H3.idle, HERO_H * 1.08) * SLASH_K : sheet === "hero3" ? kOf("hero3", H3.idle, HERO_H * 1.08) : sheet === "hero" ? kOf("hero", 0, HERO_H) : kOf("hero", 0, HERO_H) * SPR.hero.f[1].h / SPR.hero2.f[H2.start].h;
  if (state === "dead") ctx.globalAlpha = Math.max(0, 1 - deathT / 0.75);
  else if (P.invT > 0 && !(P.dashInvT > 0)) ctx.globalAlpha = Math.floor(P.invT * 14) % 2 ? .35 : 1;
  else if (P.dashInvT > 0) ctx.globalAlpha = .75 + .25 * Math.sin(performance.now() / 60);
  if (pal.night && !LV.pal.night) { // slow-mo: hero keeps his ink, lifted off the dark paper by a pale wash
    const g = ctx.createRadialGradient(cx, P.y + P.h / 2, 4, cx, P.y + P.h / 2, 46); g.addColorStop(0, "rgba(236,230,216,.55)"); g.addColorStop(1, "rgba(236,230,216,0)");
    ctx.fillStyle = g; ctx.fillRect(cx - 46, P.y + P.h / 2 - 46, 92, 92);
  }
  const h3wall = (sheet === "hero3" || sheet === "mu" || sheet === "po") && fr === H3.wall, f3 = h3wall ? P.wall : face, breathe = (sheet === "hero3" || sheet === "mu" || sheet === "po") && fr === H3.idle ? 1 + Math.sin(performance.now() / 380) * .012 : 1;
  const ram = sheet === "gun2" && P.slashT > 0 && isGun() ? Math.sin(Math.PI * Math.min(1, 1 - P.slashT / (P.slashDur || .13))) * 10 * (face < 0 ? -1 : 1) : 0;   // the barrel-ram lunges a step forward
  ctx.save(); ctx.translate(cx + ram, P.y + P.h + 1 + (sheet === "mvrun" ? RUN_BOB[fr] : sheet === "grun2" ? RUN_BOB[fr % 8] : 0)); ctx.scale(1, breathe);
  drawSprite(sheet, fr, 0, 0, k, f3 < 0, GUN_AX[sheet] ? GUN_AX[sheet][fr] : sheet === "swm" ? SWM_AX[fr] : MV_BASE[sheet] ? (MV_AX[sheet][fr] ?? .5) : sheet === "mu" ? MU_AX[fr] : sheet === "po" ? PO_AX[fr] : sheet === "arms" ? AF_AX[fr] : sheet === "chars" ? CF_AX[fr] : sheet === "weapons" ? WF_AX[fr] : sheet === "slashfx" ? SF_AX[fr] : sheet === "hero3" ? H3_AX[fr] : sheet === "hero" ? (HERO_AX[fr] ?? .55) : (wallPose ? .62 : .5), !!LV.pal.night);
  ctx.restore();
  ctx.globalAlpha = 1;
  if (wrule() === "ssang" && P.gise > 0 && songPos - (P.giseAt ?? -9) < 3 && state !== "dead") { const n = P.gise, full = n >= 3;   // 기세: red beads over the head, ready at three
    for (let i = 0; i < n; i++) { ctx.fillStyle = full ? SEAL : "rgba(60,56,50,.75)"; ctx.beginPath(); ctx.arc(cx - (n - 1) * 3.5 + i * 7, P.y - 10, full ? 2.8 : 2.2, 0, Math.PI * 2); ctx.fill(); } }
  if (edgeOn() && state !== "dead" && P.edge != null && P.edge < edgeMax()) { const m = edgeMax(), y = P.y - 12;   // 날: short strokes, dark while sharp
    for (let i = 0; i < m; i++) { ctx.fillStyle = i < P.edge ? "#17161a" : "rgba(23,22,26,.2)"; ctx.save(); ctx.translate(cx - (m - 1) * 4 + i * 8, y); ctx.rotate(-.5); ctx.fillRect(-1.2, -4, 2.4, 8); ctx.restore(); }
    if (P.edge < 1) { ctx.fillStyle = SEAL; ctx.font = `400 10px "Song Myung", serif`; ctx.textAlign = "center"; ctx.fillText("무딤", cx, y - 8); } }
  const muaDraw = P.focus && !P.focusTap && wk() === "baldo" && !WEAPONS[wpn()].bow && P.focusT > TAP_T;
  if ((P.iaiHold || muaDraw) && wk() === "baldo" && state !== "dead") { const held = P.iaiHold ? (performance.now() - (P.iaiAt || 0)) / 1000 : P.focusT, fy = P.y + P.h + 2;   // 납도: ink leaps up from the feet, black at first, reddening as the draw fills
    const st = held >= iaiM() ? 2 : held >= iaiF() ? 1 : 0, q = Math.min(1, held / iaiM());
    if (st > (P.iaiStage || 0)) { addFx("gfx", st === 2 ? 8 : 7, cx, fy, st === 2 ? 50 : 38, { life: .35, grow: .25, ay: 1, back: true, a: .85 }); if (st === 2) { Music.sfx("clang"); shake = Math.max(shake, 3); } } P.iaiStage = st;
    if ((P.inkT = (P.inkT || 0) - 1 / 60) <= 0 && SPR.gfx) { P.inkT = .07 - .03 * q; { const sd = Math.random() < .5 ? -1 : 1; addFx("gfx", st === 0 ? 6 : st === 1 ? 7 : 8, cx + sd * (14 + Math.random() * 12), fy, 12 + 12 * q + Math.random() * 5, { life: .3, grow: .15, ay: 1, a: .45 + .35 * q, back: true }); } }
    if (Math.random() < .5) { const r = Math.round(23 + (195 - 23) * q), g = Math.round(22 * (1 - q) + 11 * q), b = Math.round(26 * (1 - q) + 28 * q), sd = Math.random() < .5 ? -1 : 1;   // droplets leap up beside the body, never across it
      parts.push({ x: cx + sd * (16 + Math.random() * 10), y: fy - 2, vx: sd * (20 + Math.random() * 40), vy: -100 - 180 * q * Math.random(), life: .3, max: .3, c: `rgba(${r},${g},${b},.8)`, s: 1.2 + 1.6 * q }); }
  } else if (P.iaiStage) P.iaiStage = 0;
  if (P.orbit && state !== "dead" && (chr("munyeo") || chr("posu"))) for (let i = 0; i < P.orbit.n; i++) { const a = P.orbit.a + i * Math.PI * 2 / P.orbit.n, ox = cx + Math.cos(a) * 46, oy = P.y + P.h / 2 + Math.sin(a) * 40;   // talismans for her, balls of shot for him
    ctx.save(); ctx.translate(ox, oy); ctx.globalAlpha = Math.min(1, P.orbit.t * 3);
    if (chr("munyeo")) { ctx.rotate(a + Math.PI / 2); ctx.fillStyle = "#e8cf6a"; ctx.fillRect(-6, -10, 12, 20); ctx.strokeStyle = SEAL; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.moveTo(-3, -2); ctx.lineTo(3, 2); ctx.stroke(); }
    else { ctx.fillStyle = "#2a2628"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 6.283); ctx.fill(); ctx.fillStyle = "rgba(232,184,74,.8)"; ctx.beginPath(); ctx.arc(-1.5, -1.5, 1.6, 0, 6.283); ctx.fill(); if (Math.random() < .4) parts.push({ x: ox, y: oy, vx: 0, vy: -20, life: .3, max: .3, c: "rgba(90,86,94,.5)", s: 3 }); }
    ctx.restore(); ctx.globalAlpha = 1; }
  else if (P.orbit && SPR.slashfx && state !== "dead") for (let i = 0; i < P.orbit.n; i++) { const a = P.orbit.a + i * Math.PI * 2 / P.orbit.n, f = SPR.slashfx.f[SF.sword];
    ctx.save(); ctx.translate(cx + Math.cos(a) * 46, P.y + P.h / 2 + Math.sin(a) * 40); ctx.rotate(a + Math.PI / 2); ctx.globalAlpha = Math.min(1, P.orbit.t * 3); drawSprite("slashfx", SF.sword, 0, 0, 13 / f.h, false, .5, pal.night, .5); ctx.restore(); ctx.globalAlpha = 1; }
  const cd = CF("dragon"), dsh = cd && SPR[cd[0]] ? cd[0] : "perkfx", dfr = cd && SPR[cd[0]] ? cd[1] : PF.dragon;
  if (P.coil && SPR[dsh] && state !== "dead") for (let i = 0; i < P.coil.n; i++) { const a = P.coil.a + i * Math.PI, f = SPR[dsh].f[dfr];
    const fade = Math.min(1, P.coil.t * 4, (P.coil.max - P.coil.t) * 8 + .3), sz = P.coil.r * .95;
    for (let j = 3; j >= 0; j--) { const aj = a - j * .32;   // the body trails behind the head in fading ink
      ctx.save(); ctx.translate(cx + Math.cos(aj) * P.coil.r * .78, P.y + P.h / 2 + Math.sin(aj) * P.coil.r * .6); ctx.rotate(aj + Math.PI / 2); ctx.globalAlpha = fade * (j ? .22 / j : .95); drawSprite(dsh, dfr, 0, 0, sz * (1 - j * .1) / f.h, false, .5, false, .5); ctx.restore(); }
    ctx.globalAlpha = 1; }
  if (P.coil && state !== "dead") { ctx.strokeStyle = `rgba(23,22,26,${.25 * Math.min(1, P.coil.t * 3)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, P.y + P.h / 2, P.coil.r * .78, P.coil.r * .6, 0, P.coil.a - 2.2, P.coil.a); ctx.stroke(); }   // the sweep of its coil
  if (P.flowReady && state !== "dead") { ctx.strokeStyle = `rgba(195,22,28,${.5 + .3 * Math.sin(performance.now() / 90)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, P.y + P.h / 2, 34, 0, 6.283); ctx.stroke(); }   // 기세: a vermilion ring while it is full
  else ;   // the count so far, as dots over the head
  if ((P.possessUntil || 0) > songPos && state !== "dead") for (let i = 0; i < 2; i++) parts.push({ x: cx + (Math.random() - .5) * 26, y: P.y + P.h - Math.random() * P.h, vx: 0, vy: -60 - Math.random() * 60, life: .4, max: .4, c: i ? "rgba(217,165,32,.8)" : "rgba(242,239,230,.9)", s: 2.5 });   // 신내림: the god's light rises off her
  if (P.ward && chr("posu") && SPR.pfx && state !== "dead") { ctx.globalAlpha = .7 + .15 * Math.sin(performance.now() / 160); drawSprite("pfx", 8, cx + P.face * 14, P.y + P.h / 2, 46 / SPR.pfx.f[8].h, P.face < 0, .5, false, .5); ctx.globalAlpha = 1; }
  else if (P.ward && SPR.slashfx && state !== "dead") { ctx.globalAlpha = .55 + .15 * Math.sin(performance.now() / 160); drawSprite("slashfx", SF.guard, cx, P.y + P.h / 2, 64 / SPR.slashfx.f[SF.guard].h, false, .5, false, .5); ctx.globalAlpha = 1; }
  const wfx = WEAPONS[wpn()].fx;
  if (isGun()) {}   // a gun's bayonet thrust is the pose alone: no ink wedge, no speed lines, no crescent
  else if (P.slashT > 0 && state !== "dead" && wfx && wfx !== "streamer") drawWeaponFx(wfx, cx, P.y + P.h / 2, pal);
  else if (P.slashT > 0 && state !== "dead" && SPR.slashfx) { // one clean crescent: black ink, or a thin vermilion line for 일격
    const d = P.slashDir, dur = P.slashDur || .14, prog = 1 - Math.min(1, P.slashT / dur), i = P.strike ? SF.arcRed : SF.arc, f = SPR.slashfx.f[i];
    const left = d.x < -.2, ang = Math.atan2(d.y, Math.abs(d.x) < .2 ? .001 : Math.abs(d.x)), hh = (P.strike ? 78 : 68) * (.9 + prog * .15) * ({ woldo: 1.45, ssang: .82, baldo: 1 }[wpn()] || 1);
    const ox = cx + d.x * 26, oy = P.y + P.h / 2 - 2 + d.y * 24, rot = left ? -ang : ang, a0 = prog < .2 ? prog / .2 : Math.min(1, (1 - prog) * 2.2), sw = left ? -1 : 1;
    ctx.save(); ctx.translate(ox, oy); ctx.rotate(rot);
    ctx.globalAlpha = a0 * .32; ctx.save(); ctx.rotate(-.42 * sw); drawSprite("slashfx", i, -6 * sw, 0, hh * .86 / f.h, left, .5, pal.night && !P.strike, .5); ctx.restore();   // afterimage of the swing a beat behind
    ctx.globalAlpha = a0; drawSprite("slashfx", i, 0, 0, hh / f.h, left, .5, pal.night && !P.strike, .5);
    if (prog > .35 && SPR.fx) { const bi = P.strike ? FX.slashBRed : FX.slashB, bf = SPR.fx.f[bi]; ctx.globalAlpha = Math.min(1, (1 - prog) * 1.6) * .45; ctx.save(); ctx.scale(sw, 1); ctx.rotate(Math.PI); drawSprite("fx", bi, -10, 0, hh * .9 / bf.h, false, .45, pal.night && !P.strike, .5); ctx.restore(); }   // the stroke breaking into ink as it ends
    if (P.strike) { ctx.globalAlpha = a0 * (1 - prog); ctx.strokeStyle = "rgba(255,236,190,.95)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-hh * .1 * sw, -hh * .48); ctx.quadraticCurveTo(hh * .3 * sw, 0, -hh * .1 * sw, hh * .48); ctx.stroke(); }   // a hairline of light along the 일격's edge
    ctx.restore(); ctx.globalAlpha = 1;
    if (wfx === "streamer") drawWeaponFx("streamer", cx, P.y + P.h / 2, pal);
  } else if (P.slashT > 0 && state !== "dead" && SPR.fx) { // fallback while the sheet loads
    const d = P.slashDir, prog = 1 - Math.min(1, P.slashT / 0.14), ang = Math.atan2(d.y, d.x), i = P.strike ? FX.slashBRed : FX.slashB, f = SPR.fx.f[i];
    ctx.save(); ctx.translate(cx + d.x * 24, P.y + P.h / 2 - 4 + d.y * 22); ctx.rotate(ang + Math.PI); if (d.x < -.2) ctx.scale(1, -1);
    ctx.globalAlpha = Math.min(1, (1 - prog) * 2.4); drawSprite("fx", i, 0, 0, 68 / f.h, false, .45, pal.night && !P.strike, .5); ctx.restore(); ctx.globalAlpha = 1;
  }
}
// 무녀·포수: their own strokes instead of the sword's crescent
const OBANG = ["#2f5fa8", "#c3161c", "#d9a520", "#f2efe6", "#1d1b20"];   // 오방색
function drawWeaponFx(kind, cx, cy, pal) {
  const d = P.slashDir, dur = P.slashDur || .14, prog = 1 - Math.min(1, P.slashT / dur), st = P.strike, left = d.x < -.2, sw = left ? -1 : 1;
  const ang = Math.atan2(d.y, Math.abs(d.x) < .2 ? .001 : Math.abs(d.x)), fade = prog < .15 ? prog / .15 : Math.min(1, (1 - prog) * 2.4), ink = pal.night ? "#ece6d8" : "#17161a";
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  if ((kind === "fan" || kind === "streamer") && SPR.mfx) { const f = SPR.mfx.f[st ? 1 : 0], hh = (st ? 104 : 84) * (.85 + prog * .3);   // the gust the fan throws
    ctx.save(); ctx.translate(cx + d.x * 34, cy + d.y * 30); ctx.rotate(left ? -ang : ang); ctx.globalAlpha = fade * .9; drawSprite("mfx", st ? 1 : 0, 0, 0, hh / f.h, left, .5, false, .5); ctx.restore(); }
  if ((kind === "thrust" || kind === "spear") && SPR.pfx && !isGun()) { const f = SPR.pfx.f[0], L = (kind === "spear" ? 130 : 96) * (st ? 1.15 : 1);   // a streak of ink along the thrust (guns: the thrust pose alone)
    ctx.save(); ctx.translate(cx + d.x * (L * .5 + 6), cy + d.y * (L * .5 + 4)); ctx.rotate(Math.atan2(d.y, d.x)); ctx.globalAlpha = fade * .85; drawSprite("pfx", 0, 0, 0, L / f.w, false, .5, false, .5); ctx.restore(); }
  if (kind === "fan") { // a folding fan snaps open through the swing: ribs of ink, paper washed white to vermilion
    const L = (st ? 70 : 56), open = Math.min(1, prog * 2.2) * 2.1, a0 = -1.05;
    ctx.translate(cx + d.x * 8, cy + d.y * 8); ctx.scale(sw, 1); ctx.rotate(left ? -ang : ang); ctx.globalAlpha = fade;
    const g = ctx.createRadialGradient(0, 0, L * .25, 0, 0, L); g.addColorStop(0, "rgba(242,239,230,.0)"); g.addColorStop(.55, "rgba(242,239,230,.85)"); g.addColorStop(1, st ? "rgba(195,22,28,.9)" : "rgba(195,22,28,.55)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, L, a0, a0 + open); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2; for (let i = 0; i <= 9; i++) { const a = a0 + open * i / 9; ctx.beginPath(); ctx.moveTo(Math.cos(a) * L * .2, Math.sin(a) * L * .2); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.stroke(); }
    ctx.lineWidth = 2.4; ctx.strokeStyle = st ? SEAL : ink; ctx.beginPath(); ctx.arc(0, 0, L, a0, a0 + open); ctx.stroke();
    if (prog > .4) { ctx.globalAlpha = fade * .5; ctx.strokeStyle = st ? SEAL : ink; ctx.lineWidth = 1.2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, L + 8 + i * 7, a0 + open * .3, a0 + open); ctx.stroke(); } }   // the gust it throws
  } else if (kind === "bell") { // spirit bells: rings of sound spread from the body, gold, vermilion for 일격
    ctx.translate(cx, cy);
    for (let i = 0; i < 3; i++) { const t = Math.max(0, prog - i * .14), r = (st ? 80 : 64) * (.3 + t * .9); if (t <= 0) continue;
      ctx.globalAlpha = Math.min(1, fade * 1.4) * (1 - t * .6) * (i ? .6 : 1);
      ctx.strokeStyle = pal.night ? "rgba(236,230,216,.5)" : "rgba(23,22,26,.45)"; ctx.lineWidth = (i ? 1 : 2) + 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();   // an ink edge so the gold reads on paper
      ctx.strokeStyle = st ? SEAL : "#d9a520"; ctx.lineWidth = i ? 1.6 : 3.4; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke(); }
    ctx.globalAlpha = fade;
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + prog * 2.4, r = (st ? 78 : 62) * (.4 + prog * .7), bx = Math.cos(a) * r, by = Math.sin(a) * r * .85;   // little bells shaken loose on the ring
      ctx.fillStyle = "#b8861b"; ctx.beginPath(); ctx.arc(bx, by, 4, Math.PI, 0); ctx.lineTo(bx + 4.6, by + 3); ctx.lineTo(bx - 4.6, by + 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#17161a"; ctx.beginPath(); ctx.arc(bx, by + 3.4, 1.3, 0, 6.283); ctx.fill(); }
  } else if (kind === "streamer") { // 신칼: five silk streamers trail the blade's arc
    ctx.translate(cx, cy); ctx.scale(sw, 1); ctx.rotate(left ? -ang : ang); ctx.globalAlpha = fade * .9;
    OBANG.forEach((c, i) => { const r = 40 + i * 7, a1 = -1.2 + prog * 2.3, a0 = a1 - 1.1 - i * .08; ctx.strokeStyle = c; ctx.lineWidth = 3.2;
      ctx.beginPath(); for (let k = 0; k <= 12; k++) { const a = a0 + (a1 - a0) * k / 12, w = Math.sin(k * .9 + prog * 12 + i) * 4; k ? ctx.lineTo(Math.cos(a) * (r + w), Math.sin(a) * (r + w)) : ctx.moveTo(Math.cos(a) * (r + w), Math.sin(a) * (r + w)); } ctx.stroke(); });
    if (pal.night) {} else { ctx.strokeStyle = "rgba(23,22,26,.35)"; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(0, 0, 61, -1.2 + prog * 2.3 - 1.4, -1.2 + prog * 2.3); ctx.stroke(); }   // the white silk needs an edge on paper
  } else { // thrust / spear: one hard line out and back, speed lines beside it, a glint at the tip
    const long = kind === "spear", L = (long ? 116 : 84) * (st ? 1.15 : 1) * (prog < .45 ? .35 + prog / .45 * .65 : 1), w = long ? 7 : 5;
    ctx.translate(cx + d.x * 10, cy + d.y * 8); ctx.rotate(Math.atan2(d.y, d.x)); ctx.globalAlpha = fade;
    ctx.fillStyle = st ? "rgba(195,22,28,.85)" : (pal.night ? "rgba(236,230,216,.8)" : "rgba(23,22,26,.8)"); ctx.beginPath(); ctx.moveTo(0, -w / 2); ctx.lineTo(L, 0); ctx.lineTo(0, w / 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.night ? "rgba(236,230,216,.5)" : "rgba(23,22,26,.4)"; ctx.lineWidth = 1;
    for (const o of [-13, -7, 8, 14]) { ctx.beginPath(); ctx.moveTo(L * .15, o); ctx.lineTo(L * (.55 + Math.abs(o) * .01), o * .8); ctx.stroke(); }
    if (prog > .3 && prog < .8) { ctx.fillStyle = "#fff6d8"; ctx.globalAlpha = fade * (1 - Math.abs(prog - .55) * 4); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 3 : 11; ctx.lineTo(L + Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function legacyPlayer(pal) {
  const cx = P.x + P.w / 2;
  P.scarf.unshift({ x: cx - P.face * 1, y: P.y + 11 }); if (P.scarf.length > 10) P.scarf.length = 10;
  ctx.strokeStyle = SEAL; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath();
  P.scarf.forEach((s, i) => { const wob = Math.sin(performance.now() / 70 + i) * i * .4, px = s.x - P.face * i * 1.7, py = s.y + wob + i * .6; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.stroke();
  drawRunner(P.x, P.y, P.face, pal.fig, P);
  const d = P.slashDir;
  if (P.slashT > 0) {
    const dur = 0.14, prog = 1 - Math.min(1, P.slashT / dur), ang = Math.atan2(d.y, d.x), sweep = 2.4;
    const a0 = ang - sweep / 2 + sweep * Math.max(0, prog - .45), a1 = ang - sweep / 2 + sweep * Math.min(1, prog * 1.6);
    const ox = cx, oy = P.y + P.h / 2, R = P.strike ? 56 : 44;
    ctx.fillStyle = P.strike ? "rgba(195,22,28,.55)" : `rgba(${pal.wash},.55)`;
    ctx.beginPath(); ctx.arc(ox, oy, R, a0, a1); ctx.arc(ox, oy, R * .45, a1, a0, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.fig; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ox, oy, R - 2, a0, a1); ctx.stroke();
  } else {
    ctx.strokeStyle = pal.fig; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx - P.face * 8, P.y + 23); ctx.lineTo(cx + P.face * 5, P.y + 6); ctx.stroke();
  }
  ctx.lineCap = "butt";
}
function drawEnemy(e, pal) {
  const cx = e.x + e.w / 2;
  if (e.elite && e.alive) { const t = performance.now() / 1000, gy = e.y + e.h;   // 정예: a red ink pool under the feet and a red mark overhead
    ctx.globalAlpha = .55 + .15 * Math.sin(t * 5 + e.id); ctx.fillStyle = "rgba(195,22,28,.55)"; ctx.beginPath(); ctx.ellipse(cx, gy - 1, e.w * .9, 4, 0, 0, 7); ctx.fill();
    if (SPR.kring) drawSprite("kring", KR.drip, cx, e.y - 18, 16 / SPR.kring.f[KR.drip].h, false, .5, false, .5); ctx.globalAlpha = 1; }
  if ("mrbi".includes(e.type)) { drawNewFoe(e, pal, cx); return; }
  if ("pak".includes(e.type) && SPR.foes3) { const near = t => t != null && t - songPos < Music.beatLen * 1.2;   // 순라 · 자객 · 북잡이
    const fr = e.type === "p" ? (e.swingT > 0 ? 2 : near(e.swingAt) ? 1 : 0) : e.type === "a" ? (e.lungeT > 0 || near(e.dashAt) ? 5 : e.counter ? 4 : 3) : (e.beatT > 0 ? 8 : near(e.drumAt) ? 7 : 6);
    const hh = e.type === "k" ? 66 : e.type === "a" ? 58 : 62, ref = e.type === "k" ? 6 : e.type === "a" ? 3 : 0, k = hh / SPR.foes3.f[ref].h;
    if (e.counter) { ctx.globalAlpha = .55 + .2 * Math.sin(performance.now() / 70); ctx.strokeStyle = SEAL; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, e.y + e.h - 2, 26, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    drawSprite("foes3", fr, cx, e.y + e.h + 1, k, e.face < 0, .5, pal.night); return; }
  if (SPR.foes && FOE[e.type]) {   // 순라·자객·북잡이 whose sheet has not arrived yet fall through to the plain figure below
    const fr = FOE[e.type], now = performance.now();
    if (e.type === "d") { drawSprite("foes", fr[Math.sin(now / 90 + e.id) > 0 ? 0 : 1], cx, e.y + e.h + 12, kOf("foes", 0, FOE_H) * .6, e.vx < 0, .5, pal.night); return; }
    if (e.fireAt != null) { // aim line from the musket muzzle
      const [mx, my] = muzzle(e), sniper = e.type === "s", locked = songPos >= e.fireAt - (sniper ? .3 : .15);
      let dx = e.tx - mx, dy = e.ty - my; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const prog = Math.min(1, (songPos - e.aimFrom) / Math.max(.01, e.fireAt - e.aimFrom)), len = sniper ? 1000 : Math.min(d, 200);
      if (SPR.props) { // one brush stroke from the muzzle, thickening as the shot locks
        const f = SPR.props.f[PROP.aim], th = locked ? 10 : 4 + prog * 4;
        ctx.save(); ctx.translate(mx, my); ctx.rotate(Math.atan2(dy, dx)); ctx.globalAlpha = locked ? 1 : .3 + prog * .5;
        ctx.drawImage(SPR.props.img, f.x, f.y, f.w, f.h, 0, -th / 2, len * (locked ? 1 : .35 + prog * .65), th);
        ctx.restore(); ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = SEAL; ctx.globalAlpha = locked ? .95 : .2 + prog * .5; ctx.lineWidth = locked ? 2.2 : 1;
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + dx * len, my + dy * len); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    const i = e.type === "h" ? fr[e.vx ? Math.floor(now / 260) % 2 : 0] : fr[e.fireAt != null ? 1 : 0];
    drawSprite("foes", i, cx, e.y + e.h + 1, kOf("foes", 0, FOE_H), e.face < 0, FOE_AX[i] ?? .5, pal.night);
    return;
  }
  if (e.type === "d") { // 매
    const cy = e.y + e.h / 2, fl = Math.sin(performance.now() / 60 + e.id) * 5;
    ctx.fillStyle = pal.foe; ctx.beginPath(); ctx.moveTo(cx - 16, cy - fl); ctx.quadraticCurveTo(cx - 6, cy - 4, cx, cy + 2); ctx.quadraticCurveTo(cx + 6, cy - 4, cx + 16, cy - fl); ctx.lineTo(cx, cy + 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = SEAL; ctx.beginPath(); ctx.arc(cx + (e.vx > 0 ? 2 : -2), cy - 1, 1.6, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (e.type === "h") { // 등패수: round rattan shield
    ctx.fillStyle = pal.foe; ctx.fillRect(e.x + 6, e.y + 8, 12, 22); ctx.beginPath(); ctx.arc(cx, e.y + 6, 5, 0, Math.PI * 2); ctx.fill();
    const sx = cx + e.face * 10;
    ctx.fillStyle = pal.tile; ctx.beginPath(); ctx.ellipse(sx, e.y + 16, 6, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal.rim || "rgba(230,226,215,.35)"; ctx.lineWidth = 1; for (let r = 3; r < 13; r += 4) { ctx.beginPath(); ctx.ellipse(sx, e.y + 16, r * .45, r, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = SEAL; ctx.fillRect(sx - 1.5, e.y + 14, 3, 4);
    return;
  }
  const sniper = e.type === "s";
  if (e.fireAt != null) {
    const mx = cx + e.face * 12, my = e.y + 9, locked = songPos >= e.fireAt - (sniper ? .3 : .15);
    let dx = e.tx - mx, dy = e.ty - my; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const prog = Math.min(1, (songPos - e.aimFrom) / Math.max(.01, e.fireAt - e.aimFrom)), len = sniper ? 1000 : Math.min(d, 200);
    ctx.globalAlpha = locked ? .95 : .25 + prog * .5; brushLine(mx, my, mx + dx * len, my + dy * len, SEAL, locked ? 3.6 : 2.2, !sniper && !locked, e.id * 13); ctx.globalAlpha = 1;   // the aim, brushed in vermilion
  }
  // 순라 / 포수: wide-brimmed hat silhouette
  ctx.fillStyle = pal.foe;
  ctx.beginPath(); ctx.moveTo(e.x + 3, e.y + 30); ctx.lineTo(e.x + 6, e.y + 10); ctx.lineTo(e.x + e.w - 6, e.y + 10); ctx.lineTo(e.x + e.w - 3, e.y + 30); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, e.y + 7, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pal.tile; ctx.fillRect(cx - (sniper ? 9 : 12), e.y + 1.5, sniper ? 18 : 24, 2.2); ctx.fillRect(cx - 3, e.y - 2, 6, 4);
  ctx.strokeStyle = pal.tile; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, e.y + 14); ctx.lineTo(cx + e.face * (sniper ? 22 : 14), e.y + 12); ctx.stroke();
  ctx.fillStyle = SEAL; ctx.fillRect(cx + e.face * 2 - 1, e.y + 6, 2, 2);
}

function drawNewFoe(e, pal, cx) {
  const has2 = !!SPR.foes2, feet = e.y + e.h + 1;
  if (e.type === "m") {
    if (!has2 || !drawSprite("foes2", e.castT > 0 ? F2.mudangCast : F2.mudang, cx, feet, kOf("foes2", F2.mudang, FOE_H * 1.02), e.face < 0, .5, pal.night)) { ctx.fillStyle = SEAL; ctx.fillRect(e.x, e.y, e.w, e.h); }
    return;
  }
  if (e.type === "r") {
    if (e.ph === "rise") { // the coming swing, painted as a red arc that fills in toward the beat
      const bl = Music.beatLen, prog = Math.max(0, Math.min(1, 1 - (e.nextAt - songPos) / bl));
      ctx.fillStyle = `rgba(195,22,28,${.08 + prog * .22})`; ctx.beginPath(); ctx.moveTo(cx, e.y + e.h / 2); ctx.arc(cx, e.y + e.h / 2, 78, e.face > 0 ? -1.1 : Math.PI - 1.1, e.face > 0 ? 1.1 : Math.PI + 1.1); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha *= Math.max(.05, e.fade);
    if (!has2 || !drawSprite("foes2", e.ph === "gone" || e.fade < .9 ? F2.reaperSmoke : F2.reaper, cx, feet, kOf("foes2", F2.reaper, FOE_H * 1.08), e.face < 0, .5, pal.night)) { ctx.fillStyle = "#111"; ctx.fillRect(e.x, e.y, e.w, e.h); }
    return;
  }
  if (e.type === "i") { // 구미호's illusion: a pale, flickering copy
    const B = BOSSES.gumiho; ctx.globalAlpha *= .45 + .2 * Math.sin(performance.now() / 60);
    const ak = animScale("gumiho"), [is, ifr] = ak ? BOSS_ANIM.gumiho[Math.floor(performance.now() / 90 + e.id) % 4] : SPR.bossC ? BOSS_POSE.gumiho.move : [B.sheet, B.atk];
    if (!drawSprite(is, ifr, cx, feet, ak ? ak * .8 : kOf(B.sheet, B.idle, B.draw * .8) * SHEET_SC[B.sheet] / SHEET_SC[is], e.face < 0, .5, pal.night)) { ctx.fillStyle = "#ddd"; ctx.fillRect(e.x, e.y, e.w, e.h); }
    return;
  }
  drawBoss(e, pal, cx, feet);
}
function drawOugiName(rdt) { // the 오의's name, brushed across the screen for a breath
  const b = bossBannerLite; if (!b) return; b.t += rdt; if (b.t > 1.3) { bossBannerLite = null; return; }
  const a = Math.min(1, b.t * 6) * Math.min(1, (1.3 - b.t) * 3), y = H * .3, sz = Math.min(64, W * .09);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(14,10,12,.55)"; ctx.fillRect(0, y - sz * .8, W, sz * 1.6);
  ctx.font = `${sz}px ${BODY_FONT}`; ctx.fillStyle = "#ece6d8"; ctx.fillText(b.name, W / 2 + (1 - Math.min(1, b.t * 4)) * 40, y);
  ctx.font = `${sz * .3}px ${BODY_FONT}`; ctx.fillStyle = SEAL; ctx.fillText("奧義 · " + b.han, W / 2, y + sz * .62); ctx.restore();
}
function drawCombatHud(pal) { // 기력 under the 숨, the chain's numeral at the right
  if (!P || !run || hubOn || (state !== "play" && state !== "pause")) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (chungoFx && !chungoFx.done) { ctx.fillStyle = "rgba(14,10,12,.38)"; ctx.fillRect(0, 0, W, H); }   // 오의: the world goes dark while the strokes are laid
  if (flashDim > 0) { ctx.fillStyle = `rgba(20,10,12,${flashDim * (settings.calm ? 1 : 3)})`; ctx.fillRect(0, 0, W, H); flashDim = Math.max(0, flashDim - 1 / 60); }   // the screen draws a breath as a glint opens
  drawOugiName(1 / 60);
  if (momOn()) { const v = run.mom || 0, t = momTier(), bx = 48, by = Math.max(72, hudBottom() + 26), sw = 19, tr = (run.trance || 0) > 0;   // 기세: five brush cells, the tier's numeral beside them
    ctx.font = `400 ${t ? 17 : 12}px "Song Myung", serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = tr ? SEAL : pal.text; ctx.globalAlpha = .85; ctx.fillText(t ? `${t}단` : "기세", 18, by + 5);
    for (let i = 0; i < 5; i++) { const fill = Math.max(0, Math.min(1, (v - i * 100) / 100)); ctx.globalAlpha = .18; ctx.fillStyle = pal.text; ctx.fillRect(bx + i * (sw + 2), by, sw, 8);
      if (fill > 0) { ctx.globalAlpha = .9; ctx.fillStyle = tr ? (Math.floor(performance.now() / 80) % 2 ? SEAL : "#f3c35a") : i >= 3 ? SEAL : pal.text; ctx.fillRect(bx + i * (sw + 2), by, sw * fill, 8); } }
    ctx.globalAlpha = 1;
    if (t >= 4 || tr) { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.max(W, H) * .7); g.addColorStop(0, "rgba(195,22,28,0)"); g.addColorStop(1, `rgba(195,22,28,${tr ? .32 : .16})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); } }   // 四 and up: red ink at the edges
  if (mode !== "tutorial") { const ki = Math.max(0, Math.min(1, P.ki ?? 1)), bx = 18, by = Math.max(54, hudBottom() + 8), bw = 104, bh = 10, f = SPR.mech && SPR.mech.f[MECH.bar];
    const low = ki < .25 && Math.sin(performance.now() / 90) > 0;
    ctx.font = `400 11px "Song Myung", serif`; ctx.fillStyle = pal.text; ctx.globalAlpha = .8; ctx.fillText("기력", bx, by + bh - 1);
    const x0 = bx + 30;
    if (f) { ctx.globalAlpha = .2; ctx.drawImage(SPR.mech.img, f.x, f.y, f.w, f.h, x0, by, bw, bh);
      ctx.globalAlpha = low ? .5 : 1; ctx.save(); ctx.beginPath(); ctx.rect(x0, by - 4, bw * ki, bh + 8); ctx.clip(); ctx.drawImage(SPR.mech.img, f.x, f.y, f.w, f.h, x0, by, bw, bh); ctx.restore();
      if (P.focus) { ctx.globalAlpha = .5; ctx.fillStyle = JJOK; ctx.fillRect(x0, by + bh / 2 - 1, bw * ki, 2); } }
    else { ctx.globalAlpha = .25; ctx.fillStyle = pal.text; ctx.fillRect(x0, by, bw, bh); ctx.globalAlpha = 1; ctx.fillRect(x0, by, bw * ki, bh); }
    ctx.globalAlpha = 1; }
  const n = P.chain || 0;
  if (n >= 1) { P.chainPop = Math.max(0, (P.chainPop || 0) - 1 / 60); const g = Math.min(5, n), k = 1 + P.chainPop * 1.6, x = W - 54, y = Math.max(86, hudBottom() + 40);
    const nf = SPR.mech && SPR.mech.f[MECH.n1 + g - 1];
    if (!(nf && drawSprite("mech", MECH.n1 + g - 1, x, y, Math.min(26 / nf.h, 36 / nf.w) * k, false, .5, pal.night, .5))) { ctx.font = `400 34px "Song Myung", serif`; ctx.textAlign = "center"; ctx.fillStyle = pal.text; ctx.fillText("一二三四五"[g - 1], x, y + 12); }
    ctx.font = `400 12px "Song Myung", serif`; ctx.textAlign = "center"; ctx.fillStyle = g >= 5 ? SEAL : pal.text; ctx.fillText(`${n} 연속`, x, y + 24); ctx.textAlign = "left"; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function drawBossCards(pal) { // screen-space: the guardian's entrance, the big words, the fall — painted where the sheets are in
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const halo = pal.night ? "rgba(20,18,20,.75)" : "rgba(242,239,230,.88)";
  if (bossIntro) { const t = bossIntro.t, kind = bossIntro.e.kind, B = BOSSES[kind], inA = Math.min(1, t / .25), out = Math.max(0, (t - 1.35) / .35), a = inA * (1 - out), bar = H * .13 * a;
    ctx.fillStyle = "#0e0d10"; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    ctx.globalAlpha = a; const sx = W / 2 + (1 - Math.min(1, t / .5)) * 30, cy = H * .46, fs = Math.round(Math.min(44, H * .11)), ink = pal.night ? "#f2efe6" : "#17161a";   // plain black words (white on the inverted screen), no outline
    const sw = Math.min(1, t / .35);   // the red stroke is laid first, the name written over it
    ctx.save(); ctx.beginPath(); ctx.rect(sx - W, 0, W + (sw - .5) * W * 1.2, H); ctx.clip(); if (!spr("bcal", BC.stroke, sx, cy + fs * .55, fs * .42)) brushLine(sx - 110, cy + 22, sx + 110, cy + 22, SEAL, 5, false, 77); ctx.restore();
    const glow = Math.min(1, Math.max(0, (t - .15) / .3)); ctx.font = `400 ${fs}px "Song Myung", serif`; const tw = ctx.measureText(B.name).width;
    ctx.globalAlpha = a * glow; ctx.fillStyle = ink; ctx.fillText(B.name, sx, cy);   // the name, in 한글, large and black
    const ni = BNAME[kind]; ctx.globalAlpha = a * glow * .8; if (ni == null || !spr("bname", ni, sx, cy - fs * .95, fs * .42)) { ctx.font = `400 ${Math.round(fs * .36)}px "Song Myung", serif`; ctx.fillStyle = ink; ctx.fillText(B.han, sx, cy - fs * .95); }   // 한자 small above it
    ctx.globalAlpha = a; ctx.font = `400 14px "Song Myung", serif`; ctx.fillStyle = ink; ctx.fillText(B.line || "", W / 2, cy + fs * .9 + 12);
    const st = Math.min(1, Math.max(0, (t - .5) / .15)); if (st > 0) { ctx.save(); ctx.translate(sx + tw / 2 + 26, cy - fs * .35); ctx.rotate(-.1); const k = 1.5 - .5 * st; ctx.scale(k, k); ctx.globalAlpha = a * st;
      if (!spr("bcal", BC.gyeoljeon, 0, 0, 34)) { ctx.fillStyle = SEAL; ctx.fillRect(-14, -14, 28, 28); } ctx.restore(); if (st < 1) shake = Math.max(shake, 2); }
    ctx.globalAlpha = 1; }
  if (bossBanner) { const t = bossBanner.t, a = Math.min(1, t / .12) * Math.min(1, (1.3 - t) / .35), k = 1 + Math.max(0, .25 - t) * 1.6, big = Math.round(Math.min(40, H * .1));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * .34); ctx.scale(k, k);
    ctx.font = `400 ${big}px "Song Myung", serif`; ctx.lineWidth = 6; ctx.strokeStyle = "rgba(242,239,230,.9)"; ctx.strokeText(bossBanner.text, 0, 0); ctx.fillStyle = "#17161a"; ctx.fillText(bossBanner.text, 0, 0);
    if (bossBanner.col === SEAL) { ctx.fillStyle = SEAL; ctx.fillRect(-big * .9, big * .55, big * 1.8, 2.5); }   // a red underline when it rages
    if (bossBanner.sub) { ctx.font = `400 14px "Song Myung", serif`; ctx.lineWidth = 4; ctx.strokeStyle = halo; ctx.fillStyle = pal.text; ctx.strokeText(bossBanner.sub, 0, big * .6 + 16); ctx.fillText(bossBanner.sub, 0, big * .6 + 16); } ctx.restore(); }
  if (bossOut) { const t = bossOut.t, a = Math.min(1, t / .2) * Math.min(1, (2.2 - t) / .5), st = Math.min(1, Math.max(0, (t - .35) / .18));
    ctx.fillStyle = `rgba(120,10,16,${.18 * a})`; ctx.fillRect(0, 0, W, H);
    if (st > 0) { ctx.save(); ctx.globalAlpha = a * .5; ctx.translate(W / 2, H * .42); ctx.rotate(.4); spr("bcal", BC.inkBurst, 0, 0, 180 * (.7 + .3 * st)); ctx.restore();
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * .42); ctx.rotate(-.08); ctx.scale(1.8 - .8 * st, 1.8 - .8 * st);
      if (!spr("bcal", BC.tobeol, 0, 0, 72)) { ctx.fillStyle = SEAL; ctx.fillRect(-30, -30, 60, 60); } ctx.restore();
      ctx.globalAlpha = a; const ni = BNAME[bossOut.kind], ny = H * .42 + 62;   // 한글 large and black, the 한자 small above
      ctx.font = `400 24px "Song Myung", serif`; ctx.fillStyle = pal.night ? "#f2efe6" : "#17161a"; ctx.fillText(`${bossOut.name} 처치`, W / 2, ny);
      ctx.globalAlpha = a * .75; if (ni == null || !spr("bname", ni, W / 2, ny + 24, 15)) { ctx.font = `400 12px "Song Myung", serif`; ctx.fillText(bossOut.han || "", W / 2, ny + 24); } ctx.globalAlpha = a;
      ctx.globalAlpha = 1; if (st < 1) shake = Math.max(shake, 6); } }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function drawBoss(e, pal, cx, feet) {
  const B = BOSSES[e.kind];
  if (e.kind === "shadow" && SPR.hero3) { // drawn from the hero's own sheet, inverted to bone white, trailing ink
    const fr = e.act || e.swingT > 0 ? (e.act === "shstrike" || e.swingT > 0 ? H3.slash : H3.idle) : e.chargeT > 0 ? H3.dash : e.walkT > 0 ? H3.run[Math.floor(performance.now() / 90) % 6] : H3.idle;
    ctx.globalAlpha *= .9; drawSprite("hero3", fr, cx, feet, kOf("hero3", H3.idle, HERO_H * 1.08), e.face < 0, H3_AX[fr], true); ctx.globalAlpha = 1;
    if (e.act && songPos < e.hitAt) { ctx.strokeStyle = "rgba(195,22,28,.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, e.y + e.h / 2, 26, 0, 7); ctx.stroke(); }
    return;
  }
  if (e.hidden) { // underground: only a heaving ripple of earth
    const x = e.tx || cx, w = 40 + Math.sin(performance.now() / 80) * 6; ctx.fillStyle = "rgba(40,34,30,.55)"; ctx.beginPath(); ctx.ellipse(x, e.floor - 2, w, 7, 0, 0, 7); ctx.fill(); return;
  }
  if (e.act && songPos < e.hitAt && !e.hidden && SPR.bvfx) { const q = Math.max(0, Math.min(1, 1 - (e.hitAt - songPos) / Math.max(.2, e.hitAt - (e.actFrom ?? e.hitAt - 1))));   // sparks gathering to the moment it lands
    ctx.save(); ctx.globalAlpha = .25 + .6 * q; ctx.translate(cx, e.y + e.h * .45); ctx.rotate(performance.now() / 700); spr("bvfx", BV.warn, 0, 0, e.h * (1.4 - .7 * q)); ctx.restore(); }
  if (e.stagT > 0 && !e.hidden && SPR.bvfx) { ctx.save(); ctx.translate(cx, e.y - 14); ctx.rotate(performance.now() / 260); ctx.globalAlpha = Math.min(1, e.stagT * 3); spr("bvfx", BV.dizzy, 0, 0, 30); ctx.restore(); }
  if (e.act && songPos < e.hitAt && ACT_NAME[e.act] && !e.hidden) { const span = Math.max(.2, e.hitAt - (e.actFrom ?? e.hitAt - Music.beatLen)), q = Math.max(0, Math.min(1, (songPos - (e.actFrom ?? songPos)) / span)), y = e.y - 22;
    ctx.save(); ctx.font = `400 15px "Song Myung", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; 
    ctx.fillStyle = pal.night ? "#f2efe6" : "#17161a"; ctx.fillText(ACT_NAME[e.act], cx, y);   // plain words, no outline
    ctx.strokeStyle = SEAL; ctx.globalAlpha = .35 + .5 * q; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(cx, y - 16, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * q); ctx.stroke(); ctx.restore(); }
  if (e.act && songPos < e.hitAt) { // telegraph what is coming
    const prog = Math.max(0, Math.min(1, 1 - (e.hitAt - songPos) / Music.beatLen)), a = .1 + prog * .3, f = e.floor;
    const sd = e.id * 7 + (e.hitAt * 3 | 0);   // the same strokes for the whole wind-up
    if (e.act === "slam" || e.act === "club" || e.act === "inhale") { const w = e.act === "inhale" ? 110 : 150; ctx.globalAlpha = a * 2.2; inkWash(e.face > 0 ? cx : cx - w, f - 70, w, 70, SEAL, sd); ctx.globalAlpha = 1; }
    else if (e.act === "stomp") { ctx.globalAlpha = a * 2.2; inkWash(e.x - 50, f - 40, e.w + 100, 40, SEAL, sd); ctx.globalAlpha = 1; }
    else if (["charge", "pounce", "leap", "dance"].includes(e.act)) { ctx.globalAlpha = Math.min(1, (a + .2) * 1.6); brushLine(cx, f - 20, cx + e.face * 220, f - 20, SEAL, 9, false, sd); ctx.globalAlpha = 1; }
    else if (["volley", "fan", "fan2", "spit", "scrap", "foxfire"].includes(e.act)) { ctx.globalAlpha = Math.min(1, a + .4); const r = 6 + prog * 8; for (let i = 0; i < 4; i++) inkDab(cx + e.face * 26, e.y + 22, i * .8 + hrnd(sd, i), r * 2.2, r * 1.2, SEAL); ctx.globalAlpha = 1; }
    else if (e.act === "shcut" || e.act === "shstrike") { const w = e.act === "shstrike" ? 120 : 70; ctx.globalAlpha = a * 2.2; inkWash(e.face > 0 ? cx : cx - w, e.y - 20, w, e.h + 30, SEAL, sd); ctx.globalAlpha = 1; }
    else if (["summon", "spirits", "illusion", "mask", "gamtu", "roar", "scream", "blink", "drum", "shblink"].includes(e.act)) { ctx.globalAlpha = Math.min(1, (a + .2) * 1.5); brushRing(cx, e.y + e.h / 2, 30 + prog * 40, "#17161a", 4, sd); ctx.globalAlpha = 1; }
  }
  if (e.raged && SPR.bvfx) { const fl = 1 + Math.sin(performance.now() / 90) * .05; ctx.globalAlpha = .55 + .15 * Math.sin(performance.now() / 140); spr("bvfx", BV.rage, cx, e.y + e.h * .45, e.h * 1.5 * fl); ctx.globalAlpha = 1; }   // 격노: a painted fire behind the body
  else if (e.raged) { const g = ctx.createRadialGradient(cx, e.y + e.h / 2, 6, cx, e.y + e.h / 2, Math.max(e.w, e.h)); g.addColorStop(0, `rgba(195,22,28,${.18 + .08 * Math.sin(performance.now() / 120)})`); g.addColorStop(1, "rgba(195,22,28,0)"); ctx.fillStyle = g; ctx.fillRect(cx - e.w - e.h, e.y - e.h, (e.w + e.h) * 2, e.h * 3); }   // 격노
  if (e.invisT > 0) ctx.globalAlpha *= .12;   // 도깨비 감투
  const atk = e.act || e.swingT > 0 || e.chargeT > 0 || e.air || e.swoopT > 0 || e.danceT > 0 || e.suck;
  const PO = BOSS_POSE[e.kind] || {}, now = performance.now();
  let kAnim = 0, sheet = B.sheet, fr = e.kind === "sumun" && (e.chargeT > 0 || (!e.act && e.swingT > 0)) ? B.hit : atk ? B.atk : B.idle;
  const spec = { imugi: e.emergeT > 0, wongwi: e.swoopT > 0, jangseung: !!e.act || e.swingT > 0, haetae: e.chargeT > 0, bulgasari: e.suck, baekho: e.act === "roar" || (e.lastAct === "roar" && e.swingT > 0), talchum: e.danceT > 0 }[e.kind];
  if (e.stagT > 0 || e.hitT > 0) { if (PO.hurt) [sheet, fr] = PO.hurt; else fr = B.stag ?? B.atk; }
  else if (spec && PO.spec) [sheet, fr] = PO.spec;
  else if (!atk && BOSS_ANIM[e.kind] && animScale(e.kind) && (e.walkT > 0 || e.kind === "wongwi")) { // walking (or drifting) loop
    const n = e.kind === "wongwi" ? Math.floor(now / 200 + e.id) : Math.floor(e.wph || 0); [sheet, fr] = BOSS_ANIM[e.kind][((n % 4) + 4) % 4]; kAnim = animScale(e.kind);
  }
  else if (!atk && e.walkT > 0 && PO.move) [sheet, fr] = PO.move;
  if (!SPR[sheet]) { sheet = B.sheet; fr = atk ? B.atk : B.idle; kAnim = 0; }
  const k = kAnim || kOf(B.sheet, B.idle, B.draw) * (SHEET_SC[B.sheet] || 1) / (SHEET_SC[sheet] || 1), spin = e.danceT > 0 && !PO.spec ? Math.sin(now / 50) : 1;
  const breathe = !atk && !(e.stagT > 0) && !kAnim ? 1 + Math.sin(now / 420 + e.id) * .015 : 1;   // idle: a slow breath so it never stands frozen
  const wind = e.act && songPos < e.hitAt ? Math.max(0, Math.min(1, 1 - (e.hitAt - songPos) / Math.max(.2, e.hitAt - (e.actFrom ?? e.hitAt - 1)))) : 0, rel = e.swingT > 0 ? Math.min(1, e.swingT / .25) : 0;
  const land = e.landT > 0 ? e.landT / .22 : 0, turn = e.turnT > 0 ? Math.sin(Math.PI * e.turnT / .16) : 0, mvK = Math.min(1, (e.mv || 0) / 120);
  const sxB = (1 + .05 * wind + .06 * land) * (1 - .22 * turn), syB = breathe * (1 - .05 * wind - .1 * land + .04 * rel);   // gather (squat), release (stretch), land (squash), turn (pinch)
  ctx.save(); ctx.translate(cx + (e.hitT > 0 ? (Math.random() - .5) * 4 : 0) + e.face * 7 * rel, feet); ctx.rotate(e.face * (-.06 * wind + .05 * rel + .035 * mvK)); ctx.scale(sxB, syB); if (e.stagT > 0 && B.stag == null && !PO.hurt) ctx.rotate(-.12 * e.face); if (e.kind === "jangseung" && e.act) ctx.translate(Math.sin(now / 30) * 1.5, 0);
  if (!drawSprite(sheet, fr, 0, 0, k, (e.face < 0) !== (spin < 0), .5, pal.night)) { ctx.fillStyle = "#222"; ctx.fillRect(-e.w / 2, -e.h, e.w, e.h); }
  ctx.restore();
  if (e.kind === "talchum") { ctx.fillStyle = SEAL; ctx.font = `400 13px "Song Myung", serif`; ctx.textAlign = "center"; ctx.fillText(MASKS[e.mask || 0], cx, e.y - 34); ctx.textAlign = "left"; }
}
function drawHazards(pal) {
  const tt = performance.now() / 1000;
  for (const z of haz) {
    if (z.kind === "ring") {
      const r = (songPos - z.at) * z.speed; if (r < 0) { ctx.globalAlpha = .45; brushRing(z.x, z.y, 20, "#17161a", 3, z.x); ctx.globalAlpha = 1; continue; }
      ctx.strokeStyle = `rgba(23,22,26,${.75 * (1 - r / z.max)})`; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(z.x, z.y, r, 0, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(236,230,216,${.8 * (1 - r / z.max)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, r, 0, 7); ctx.stroke(); continue;
    }
    const live = songPos >= z.at, prog = Math.max(0, Math.min(1, (songPos - z.t0) / Math.max(.01, z.at - z.t0)));
    if (!live) { // warning: a reddening wash that fills in toward the beat
      if (z.kind === "coin") { // the coin falls into place; its shadow marks the spot
        ctx.fillStyle = `rgba(23,22,26,${.15 + prog * .3})`; ctx.beginPath(); ctx.ellipse(z.x + z.w / 2, z.y + z.h, 12 + prog * 6, 3, 0, 0, 7); ctx.fill();
        const y = z.y - 260 * (1 - prog * prog);
        if (!drawSprite("bossfx", FXB.coin, z.x + z.w / 2, y + z.h / 2, 30 / (SPR.bossfx ? SPR.bossfx.f[FXB.coin].h : 1), false, .5, false, .5)) { ctx.fillStyle = "#b08a3a"; ctx.beginPath(); ctx.arc(z.x + z.w / 2, y + z.h / 2, 12, 0, 7); ctx.fill(); }
        continue;
      }
      ctx.globalAlpha = .1 + prog * .4; inkWash(z.x, z.y, z.w, z.h, SEAL, z.x + z.y); ctx.globalAlpha = 1;   // a reddening wash, brushed in
      if (z.kind === "beam") { ctx.globalAlpha = .4 + prog * .5; brushLine(z.x, z.y, z.x + z.w, z.y, SEAL, 3, false, z.x); brushLine(z.x, z.y + z.h, z.x + z.w, z.y + z.h, SEAL, 3, false, z.y); ctx.globalAlpha = 1; }
      continue;
    }
    const f = { coin: FXB.coin, fire: FXB.fire, claw: FXB.claw, hair: FXB.hair, pillar: FXB.pillar, beam: FXB.beam }[z.kind], S = SPR.bossfx;
    if (S && f != null) {
      const fr = S.f[f];
      if (z.kind === "beam") { ctx.globalAlpha = .9; ctx.drawImage(S.img, fr.x, fr.y, fr.w, fr.h, z.x, z.y - z.h * .2, z.w, z.h * 1.4); ctx.globalAlpha = 1; continue; }
      if (z.kind === "fire" || z.kind === "claw") { ctx.save(); ctx.translate(z.x + z.w / 2, z.y + z.h / 2); if (z.flip) ctx.scale(-1, 1); ctx.drawImage(S.img, fr.x, fr.y, fr.w, fr.h, -z.w / 2, -z.h * .6, z.w, z.h * 1.2 + Math.sin(tt * 30) * 2); ctx.restore(); continue; }
      if (z.kind === "coin") { drawSprite("bossfx", f, z.x + z.w / 2, z.y + z.h / 2, 30 / fr.h, false, .5, false, .5); continue; }
      ctx.drawImage(S.img, fr.x, fr.y, fr.w, fr.h, z.x - z.w * .2, z.y, z.w * 1.4, z.h + 4);   // hair, pillar: rise from the ground
      continue;
    }
    ctx.fillStyle = z.kind === "fire" ? "rgba(220,90,30,.75)" : z.kind === "beam" ? "rgba(214,160,40,.8)" : "rgba(23,22,26,.8)"; ctx.fillRect(z.x, z.y, z.w, z.h);
  }
}
// ---------- outside the run: 비급첩, 천고탑 ----------
// a board is a scrolling panel of rows with buttons, used by every screen outside a run
function board(title, sub, rows, buttons) {
  $("bdTitle").textContent = title; $("bdSub").textContent = sub || "";
  const body = $("bdBody"); body.innerHTML = "";
  for (const r of rows) body.appendChild(r);
  const bb = $("bdBtns"); bb.innerHTML = "";
  for (const [label, fn, pri] of buttons) { const b = document.createElement("button"); b.className = "btn" + (pri ? " pri" : ""); b.textContent = label; b.addEventListener("click", fn); bb.appendChild(b); }
  state = "menu"; showScreen("board");
}
function bdRow(title, desc, pic, btnLabel, onBtn, disabled) {
  const r = document.createElement("div"); r.className = "bd-row";
  r.innerHTML = `<i class="pic"></i><div><b></b><small></small></div>`;
  if (pic) r.querySelector(".pic").style.setProperty("--pic", pic); else r.classList.add("nopic");
  r.querySelector("b").textContent = title; r.querySelector("small").textContent = desc;
  if (btnLabel) { const b = document.createElement("button"); b.className = "btn"; b.textContent = btnLabel; b.disabled = !!disabled; b.addEventListener("click", onBtn); r.appendChild(b); } else r.appendChild(document.createElement("span"));
  return r;
}
function treeOpenScreen() { // 서고: learn the deeper steps of the trees with 혼, once for every weapon (gated by your best mastery)
  const lv = treeOpen(), nx = TREE_OPEN[lv], ms = Math.max(0, ...Object.keys(WEAPONS).map(w => masteryLv(w)));
  const rows = [curLine(), ...TREE_OPEN.map((o, i) => bdRow(`${i < lv ? "✓ " : ""}${o.name}`, `${o.desc} — 혼 ${o.hon}`))];
  rows.push(bdRow(nx ? `다음 · ${nx.name}` : "모두 깨쳤다", nx ? `혼 ${nx.hon}${nx.ms ? ` · 가장 익숙한 무기 숙련 ${ms}/${nx.ms}` : ""}` : "3단·4단·합류가 모든 무기에 열려 있다", null, nx ? "깨치기" : null, () => {
    META.hon -= nx.hon; META.treeOpen = { ...(META.treeOpen || {}), all: lv + 1 }; saveMeta(); Music.sfx("lantern"); toast(`${nx.name.replace(" 깨치기", "")}을 깨쳤다 · 모든 무기`); treeOpenScreen(); }, !nx || META.hon < nx.hon || ms < nx.ms));
  board("수련 깨치기", "판에서 수련점으로 익히기 전에, 여기서 먼저 깨쳐 둔다", rows, [["돌아가기", resumeHub]]);
}
const curLine = () => { const d = document.createElement("div"); d.className = "bd-cur"; d.innerHTML = `<span><i></i> 혼 ${META.hon}</span><span>천고 조각 ${META.shard}</span>`; return d; };
const bookCap = () => PERK_MAX;         // 비급 a 비급첩 can hold
const shelfCap = () => 3 + Math.min(4, META.bld.bigeup);        // 비급첩 kept at once
const perkName = id => (CHOSIK.find(c => c.id === id) || { name: id }).name;
function bookLine(bk) { return `${WEAPONS[bk.weapon || "hwando"].name}${bk.oath ? " · " + OATHS.find(o => o.id === bk.oath).name : ""} · 비급 ${bk.perks.length} · 최고 ${bk.best || 0}층`; }
// sealing: the run's 변형, weapon and oath come along; of the rest, only as many 비급 as the book can hold
function sealScreen(after, title, sub) {   // after: where to go once sealed or skipped (a restart goes on to a new run)
  const r = sealable; if (!r) return;
  const rest = r.perks.filter(id => id !== "sum" && CHOSIK.some(c => c.id === id));
  const pick = new Set(fitPerks(rest));   // the same slots as in a run
  const nK = k => [...pick].filter(id => kindOf(id) === k).length;
  const name = document.createElement("input"); name.className = "bd-name"; name.maxLength = 12; name.value = `제${(META.firsts.bookN || 0) + 1}첩`;
  const chips = document.createElement("div"); chips.className = "chips";
  const info = document.createElement("small");
  const draw = () => { chips.innerHTML = "";
    for (const id of rest) { const c = document.createElement("button"); c.className = "chip" + (pick.has(id) ? " on" : ""); c.textContent = `${kindOf(id)} · ${perkName(id)}`;
      c.addEventListener("click", () => {
        if (pick.has(id)) pick.delete(id);
        else if (nK(kindOf(id)) < SLOT[kindOf(id)]) pick.add(id); else toast(`${kindOf(id)} 비급은 ${SLOT[kindOf(id)]}개까지`); draw(); }); chips.appendChild(c); }
    info.textContent = `${SLOT_ORDER.map(k => `${k} ${nK(k)}/${SLOT[k]}`).join(" · ")} · ${WEAPONS[r.weapon || "hwando"].name}${r.oath ? " · " + OATHS.find(o => o.id === r.oath).name : ""}`; };
  draw();
  const save = (replace) => {
    const bk = { id: Date.now().toString(36), name: name.value.trim() || "이름 없는 첩", weapon: r.weapon || "hwando", oath: r.oath || null, char: r.char || "mumyeong", simbeop: r.simbeop || null, perks: [...pick], best: 0, made: todayKey() };
    if (replace != null) META.books.splice(replace, 1, bk); else META.books.push(bk);
    META.firsts.bookN = (META.firsts.bookN || 0) + 1; saveMeta(); sealable = null; $("bSeal").hidden = true; toast(`「${bk.name}」를 봉인했다`);
    if (typeof gainStroke === "function") gainStroke("seal"); if (after) after(); else toMenu();
  };
  const rows = [name, chips, info];
  if (META.books.length >= shelfCap()) { const t = document.createElement("small"); t.textContent = "비급첩을 둘 자리가 없다. 하나를 골라 덮어쓴다."; rows.push(t);
    META.books.forEach((bk, i) => rows.push(bdRow(bk.name, bookLine(bk), null, "덮어쓰기", () => save(i)))); }
  const skip = () => { if (after) { sealable = null; after(); } else showScreen("result"); };
  board(title || "비급첩에 봉인", sub || "이 판의 빌드에서 핵심만 골라 담는다", rows, META.books.length >= shelfCap() ? [[after ? "담지 않고 다시 시작" : "그만두기", skip]] : [["봉인", () => save(null), true], [after ? "담지 않고 다시 시작" : "그만두기", skip]]);
}
// 천고탑: pick a 비급첩, then climb until the breath runs out
function towerScreen() {
  const rows = [curLine()];
  rows.push(bdRow("맨몸으로 오르기", "검객·무기·심법·서약을 고르고 빈손으로 오른다. 층을 넘을 때마다 비급 하나", null, "오르기", startTowerFresh));
  if (!META.books.length) rows.push(bdRow("봉인된 비급첩이 없다", "천고를 한 번 이상 벤 판이 끝나면 그 빌드를 비급첩에 봉인해, 처음부터 그 빌드로 오를 수 있다."));
  META.books.forEach((bk, i) => rows.push(bdRow(bk.name, bookLine(bk), null, "오르기", () => startTower(bk))));
  board("천고탑", `최고 기록 ${META.towerBest}층 · 층마다 우두머리, 적은 늘고 징조는 쌓인다`, rows, [["돌아가기", toMenu]]);
}
function startTower(bk) {
  if (hubOn) leaveHub();
  run = { tower: true, book: bk.id, seed: (Math.random() * 2 ** 32) >>> 0, dateKey: todayKey(), m: LAST_M, floor: 1, cycle: 0, cp: -1, dead: [],
    breath: Math.min(oath2cap(bk.oath), 3 + (META.bld.sadang >= 1 ? 1 : 0)), time: 0, deaths: 0, kills: 0, strikes: 0, slashes: 0, perks: fitPerks(bk.perks), weapon: bk.weapon, oath: bk.oath, char: bk.char || "mumyeong", simbeop: bk.simbeop || null, omens: [], cutDrums: [] };
  mode = "tower"; saveRun();
  if (META.ended && typeof upPicks === "function") upPicks(() => { saveRun(); showInterlude(); }); else showInterlude();
}
const oath2cap = o => o === "pi" ? 2 : 6;
function startTowerFresh() { if (hubOn) leaveHub(); // no book: pick the hand like a new run, then climb, learning one 비급 a floor
  run = { tower: true, fresh: true, seed: (Math.random() * 2 ** 32) >>> 0, dateKey: todayKey(), m: LAST_M, floor: 1, cycle: 0, cp: -1, dead: [],
    breath: startBreath(), time: 0, deaths: 0, kills: 0, strikes: 0, slashes: 0, perks: [], weapon: "hwando", oath: null, char: "mumyeong", omens: [], picking: true };
  mode = "tower"; saveRun(); startPicks();
}
function towerRest() {
  if ((run.floor - 1) % 3 === 0) pickScreen("쉼터", `천고탑 ${run.floor - 1}층을 넘었다`, [
    { name: "숨 고르기", han: "息", desc: "숨 하나를 되찾는다" }, { name: "혼 모으기", han: "魂", desc: "이번 판에서 얻는 혼이 늘어난다" }, { name: "곧장 오르기", han: "登", desc: "아무것도 하지 않는다", calm: true }],
    it => { if (it.han === "息") run.breath = Math.min(breathCap(), run.breath + 1); if (it.han === "魂") run.honDouble = (run.honDouble || 0) + .25; saveRun(); Music.stop(); showInterlude(); });
  else { Music.stop(); showInterlude(); }
}
function towerNext() { // 천고 of this floor is cut: one floor up, another omen, and a rest every third floor
  run.floor++; run.cycle = run.floor - 1; run.cp = -1; run.nakN = 0; run.janUsed = false; run.senN = 0; run.fudoN = 0; run.dead = []; run.cutDrums = []; run.honDouble = 0;
  if (typeof gainStroke === "function") gainStroke("floor", run.floor - 1);
  if (run.floor % 10 === 0 || run.floor > 1) { const pool = OMENS.filter(o => !o.calm && !run.omens.includes(o.id) && o.id !== "geupbak"); if (pool.length && run.floor > 1 && run.omens.length < 6) run.omens.push(pool[(Math.random() * pool.length) | 0].id); }
  saveRun(); state = "result"; Music.stop();
  setTimeout(() => { if (run.fresh) { run.choosing = "tower"; saveRun(); showChoice("tower"); } else towerRest(); }, 700);
}
// first time a guardian falls: a 천고 조각 and its entry in the 도감
function codexBoss(e) {
  const c = META.codex[e.kind] = META.codex[e.kind] || { kills: 0, marks: [] };
  if (!c.kills) { run.firstBoss = (run.firstBoss || 0) + 1; toast(`도감에 ${BOSSES[e.kind].name}의 이름이 적혔다`); }
  c.kills++;
  const mk = m => { if (!c.marks.includes(m)) c.marks.push(m); };
  if (e.fightBreath != null && run.breath >= e.fightBreath) mk("nohit");
  if (!e.softHits) mk("strike");
  if ((run.upPts || 0) >= 10) mk("up");
  checkTitles(); questEvent("boss", { nohit: c.marks.includes("nohit") && e.fightBreath != null && run.breath >= e.fightBreath }); gainStroke("codex");
}
// ---------- 암자: buildings that widen what a run can be ----------
const BUILDINGS = [
  { id: "seogo", name: "서고", han: "書庫", pic: 3, lv: [
    { hon: 60, desc: "서약 해금 · 고독의 서약", give: () => unlockList("oaths", ["godok"]) },
    { hon: 130, desc: "서약 해금 · 피의 서약", give: () => unlockList("oaths", ["pi"]) },
    { hon: 220, desc: "서약 해금 · 현의 서약", give: () => unlockList("oaths", ["hyeon"]) }] },
  { id: "daejang", name: "대장간", han: "鍛冶間", pic: 4, lv: [
    { hon: 100, shard: 1, desc: "무기 해금 · 쌍검", give: () => unlockList("weapons", ["ssang"]) },
    { hon: 180, shard: 2, desc: "무기 해금 · 월도", give: () => unlockList("weapons", ["woldo"]) },
    { hon: 260, shard: 3, desc: "무기 해금 · 발도", give: () => unlockList("weapons", ["baldo"]) }] },
  { id: "bigeup", name: "비급각", han: "秘笈閣", pic: 5, lv: [1, 2, 3, 4].map(n => ({ shard: n, desc: `비급첩 보관 ${3 + n}권` })) },
  { id: "sadang", name: "사당", han: "祠堂", pic: 6, lv: [
    { hon: 80, desc: "판을 시작할 때 숨 하나 더" }, { hon: 160, desc: "비급을 고를 때 다시 뽑기 한 번" }, { hon: 260, desc: "비급 선택지가 네 장" }] },
  { id: "uibang", name: "의방", han: "衣房", pic: 7, lv: [
    { hon: 40, desc: "띠 물들이기 · 쪽빛" }, { hon: 60, desc: "띠 물들이기 · 금빛" }, { hon: 90, desc: "띠 물들이기 · 흰빛" }] }
];
const SASH = { red: ["붉은 띠", null], jjok: ["쪽빛 띠", 215], gold: ["금빛 띠", 42], white: ["흰 띠", -1] };
const SASH_BY_LV = ["red", "jjok", "gold", "white"];
function unlockList(key, ids) { for (const id of ids) if (!META[key].includes(id)) META[key].push(id); }
function hermitScreen(only) { // 암자 buildings; in the 거점 each building opens only its own rows
  questsToday();
  const rows = [curLine()], show = k => !only || only === k, back = () => hermitScreen(only);
  for (const B of BUILDINGS) { if (only ? B.id !== only : false) continue;
    const lv = META.bld[B.id] || 0, nx = B.lv[lv];
    const cost = nx ? [nx.hon ? `혼 ${nx.hon}` : "", nx.shard ? `천고 조각 ${nx.shard}` : ""].filter(Boolean).join(" · ") : "";
    const can = nx && META.hon >= (nx.hon || 0) && META.shard >= (nx.shard || 0);
    rows.push(bdRow(`${B.name} ${B.han} · ${lv}단계`, nx ? `${nx.desc} — ${cost}` : "모두 올렸다", `var(--misc-${B.pic})`, nx ? "올리기" : null, () => {
      META.hon -= nx.hon || 0; META.shard -= nx.shard || 0; META.bld[B.id] = lv + 1; if (nx.give) nx.give(); saveMeta(); Music.sfx("lantern"); toast(`${josa(B.name, "을", "를")} 올렸다 · ${nx.desc}`); back(); }, !can));
  }
  const cw = Object.entries(WEAPONS).filter(([, w]) => w.cost && (w.gun || (w.ch && META.chars.includes(w.ch))));
  if (cw.length && show("daejang")) { const wh = document.createElement("h2"); wh.textContent = "무구 武具"; wh.style.fontSize = "20px"; rows.push(wh);
    for (const [id, w] of cw) { const got = META.weapons.includes(id), who = w.ch ? CHARS.find(c => c.id === w.ch).name : "무명";
      rows.push(bdRow(`${w.han} ${w.name} · ${who}`, w.desc + (got ? "" : ` — 혼 ${w.cost}`), null, got ? null : "벼리기", () => {
        META.hon -= w.cost; META.weapons.push(id); saveMeta(); Music.sfx("lantern"); toast(`${who}의 ${josa(w.name, "을", "를")} 벼렸다`); back(); }, !got && META.hon < w.cost)); } }
  if (show("seogo")) { const mh = document.createElement("h2"); mh.textContent = "심법 心法"; mh.style.fontSize = "20px"; rows.push(mh);
  for (const m of SIMBEOP) { const got = META.simbeop.includes(m.id);
    rows.push(bdRow(`${m.han} ${m.name}`, `${m.desc} · 시작 비급 ${CHOSIK.find(c => c.id === m.start).name}` + (got ? "" : ` — 혼 ${m.hon}`), null, got ? null : "익히기", () => {
      META.hon -= m.hon; META.simbeop.push(m.id); saveMeta(); Music.sfx("lantern"); toast(`${josa(m.name, "을", "를")} 익혔다`); back(); }, !got && META.hon < m.hon)); } }
  // sash colours bought at the 의방
  if (show("uibang")) { const sash = document.createElement("div"); sash.className = "chips";
  SASH_BY_LV.slice(0, 1 + (META.bld.uibang || 0)).forEach(k => { const c = document.createElement("button"); c.className = "chip" + (META.sash === k ? " on" : ""); c.textContent = SASH[k][0];
    c.addEventListener("click", () => { META.sash = k; saveMeta(); recolorSash(); back(); }); sash.appendChild(c); });
  rows.push(sash); }
  if (!only) { const qh = document.createElement("h2"); qh.textContent = "오늘의 수행"; qh.style.fontSize = "20px"; rows.push(qh);
  for (const q of META.quests.list) rows.push(bdRow((q.done ? "✓ " : "") + q.text, q.done ? "마쳤다" : `${Math.min(q.prog || 0, q.n || 1)} / ${q.n || 1} · 보상 혼 40, 천고 조각 1`));
  rows.push(bdRow(`이름의 획 ${META.mem.length} / 9`, "획을 되찾을 때마다 기억이 하나씩 돌아온다", null, META.mem.length ? "기억 보기" : null, () => memoryList()));
  }
  const B0 = only && BUILDINGS.find(b => b.id === only);
  board(B0 ? `${B0.name} ${B0.han}` : "암자", B0 ? { seogo: "서약과 심법을 연다", daejang: "무기를 벼린다", sadang: "판의 시작을 넉넉하게", uibang: "띠의 빛깔" }[only] || "" : "산중 암자 · 건물을 올려 새 길을 연다", rows, [["돌아가기", toMenu]]);
}
// 의방: repaint the vermilion sash pixels of the hero's sheets in the chosen hue
const RUN_BOB = [0, 1.5, .5, -3, 0, 1.5, .5, -3];   // contact · down · passing · up, twice: the body dips and lifts with each stride
const SASH_SHEETS = ["hero3", "weapons", "mv0", "mvrun"];   // the swordsman's own sheets (the run, the cuts, the stances)
function recolorSash() {
  const hue = SASH[META.sash || "red"][1];
  for (const n of SASH_SHEETS) { const s = SPR[n]; if (!s) continue; if (!s.orig) s.orig = s.img; if (hue == null) { s.img = s.orig; continue; }
    const c = document.createElement("canvas"); c.width = s.orig.width; c.height = s.orig.height; const g = c.getContext("2d"); g.drawImage(s.orig, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2]; if (!(r > gg + 60 && r > b + 60)) continue;
      const v = r / 255; if (hue < 0) { d[i] = d[i + 1] = d[i + 2] = 200 + v * 50; continue; }
      const h = hue / 60, x = 1 - Math.abs(h % 2 - 1), rgb = h < 1 ? [1, x, 0] : h < 2 ? [x, 1, 0] : h < 3 ? [0, 1, x] : h < 4 ? [0, x, 1] : h < 5 ? [x, 0, 1] : [1, 0, x];
      d[i] = rgb[0] * v * 230; d[i + 1] = rgb[1] * v * 230; d[i + 2] = rgb[2] * v * 230; }
    g.putImageData(id, 0, 0); s.img = c; gpuize(c, bm => { if (s.img === c) s.img = bm; }); }
}
// ---------- 수행: three tasks a day ----------
const QUEST_POOL = [
  { k: "kills", n: 60, text: "한 판에 적 60명 베기" }, { k: "kanpa", n: 15, text: "한 판에 간파 15회" }, { k: "boss", n: 2, text: "우두머리 둘 쓰러뜨리기" },
  { k: "tower", n: 5, text: "천고탑 5층 넘기" }, { k: "oathCut", text: "서약을 걸고 천고 베기" }, { k: "noHook", text: "연을 잡지 않고 천고 베기" },
  { k: "nohitBoss", text: "숨을 잃지 않고 우두머리 쓰러뜨리기" }, { k: "weaponBoss", text: "기본 검이 아닌 무기로 우두머리 쓰러뜨리기" }, { k: "tower10", n: 10, text: "천고탑 10층 넘기" }];
function questsToday() {
  const key = todayKey(); if (META.quests && META.quests.date === key) return;
  const rnd = mulberry(hashStr("quest-" + key)), pool = QUEST_POOL.filter(q => q.k !== "weaponBoss" || META.weapons.length > 1), list = [];
  while (list.length < 3) list.push({ ...pool.splice((rnd() * pool.length) | 0, 1)[0], prog: 0, done: false });
  META.quests = { date: key, list }; saveMeta();
}
function questEvent(type, data = {}) {
  if (!run || mode === "tutorial") return; questsToday();
  for (const q of META.quests.list) { if (q.done) continue; let hit = false;
    if (type === "runEnd") { if (q.k === "kills") q.prog = Math.max(q.prog, run.kills); if (q.k === "strikes" || q.k === "kanpa") q.prog = Math.max(q.prog, run.kanpa || 0); if ((q.k === "tower" || q.k === "tower10") && run.tower) q.prog = Math.max(q.prog, data.reached); }
    if (type === "boss") { if (q.k === "boss") q.prog++; if (q.k === "nohitBoss" && data.nohit) hit = true; if (q.k === "weaponBoss" && !Object.values(BASE_W).includes(wpn())) hit = true; }
    if (type === "cut") { if (q.k === "oathCut" && run.oath) hit = true; if (q.k === "noHook" && !run.hooked) hit = true; }
    if (hit) q.prog = 1;
    if (q.prog >= (q.n || 1)) { q.done = true; META.firsts.quests = (META.firsts.quests || 0) + 1; META.hon += 40; META.shard += 1; toast(`수행을 마쳤다 · ${q.text}`); } }
  saveMeta();
}
// ---------- 이름의 획: nine milestones, each returns a stroke and a memory ----------
const NAME = "徐律", NAME_KO = "서율";
const MEMORY = [
  "새벽마다 천고를 치던 고수가 있었다. 북이 울리면 하늘이 날을 열었다.",
  "어느 새벽, 검은 그림자가 고수의 이름을 적은 두루마리를 앗아 갔다. 그날 북이 멈췄다.",
  "장단이 어긋나자 산과 물에 잠들어 있던 것들이 눈을 떴다.",
  "이름을 잃은 고수는 비 속에 무릎을 꿇었다. 아무도 그를 부르지 못했다.",
  "탑의 계단마다 수문장이 섰다. 북을 다시 울리려는 자를 막으라는 명이었다.",
  "북이 멈춘 밤, 마을이 불탔다. 붉은 달 아래 장단 없는 춤이 이어졌다.",
  "그림자는 고수와 같은 삿갓을 쓰고 있었다. 빼앗은 것은 이름만이 아니었다.",
  "탑 꼭대기, 천고는 쇠사슬에 묶여 있었다. 그 앞에 북의 주인이 앉아 있다.",
  "이름을 되찾은 자만이 천고를 다시 칠 수 있다. 그의 이름은 서율(徐律)이었다. 천고탑 30층, 북의 주인이 기다린다."];
const MILESTONE = [
  () => META.firsts.cut, () => META.books.length > 0, () => META.towerBest >= 5, () => META.towerBest >= 10,
  () => Object.keys(META.codex).length >= 3, () => META.towerBest >= 15, () => META.towerBest >= 20,
  () => Object.keys(META.codex).length >= 10, () => META.towerBest >= 25];
let memQueue = [];
function gainStroke(kind, v) {
  if (kind === "floor" && v > META.towerBest) META.towerBest = v;
  if (kind === "cut") META.firsts.cut = true;
  for (let i = 0; i < MILESTONE.length; i++) if (!META.mem.includes(i) && MILESTONE[i]()) { META.mem.push(i); memQueue.push(i); toast(`이름의 획 하나가 돌아왔다 · ${META.mem.length} / 9`); }
  saveMeta();
}
function memoryCard(i) {
  const d = document.createElement("div"); d.className = "mem";
  d.innerHTML = `<i style="background-position:${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%"></i><p></p>`; d.querySelector("p").textContent = MEMORY[i]; return d;
}
function showMemories(after) { // play back what returned during the run, one card at a time
  if (!memQueue.length) { after(); return; }
  const i = memQueue.shift();
  board(`기억 조각 ${META.mem.indexOf(i) + 1}`, `이름의 획 ${META.mem.length} / 9`, [memoryCard(i)], [["이어서", () => showMemories(after), true]]);
}
function memoryList() { board("기억", `이름의 획 ${META.mem.length} / 9`, META.mem.slice().sort((a, b) => a - b).map(memoryCard), [["돌아가기", hermitScreen]]); }
function nameProgress() { // the name on the title screen, filled in stroke by stroke
  const el = $("nameLine"); if (!el) return;
  el.style.setProperty("--p", (META.mem.length / 9).toFixed(3)); el.hidden = !META.mem.length;
  el.querySelector("b").textContent = NAME; const t = (typeof TITLES !== "undefined" && TITLES.find(t => t.id === META.title)) || null;
  el.querySelector("small").textContent = (META.mem.length >= 9 ? NAME_KO : `이름의 획 ${META.mem.length} / 9`) + (t ? ` · 호 「${t.name}」` : "");
}
// ---------- after the name: 결말, 업, 도감, 호, 숙련, 새 검객 ----------
function showEnding() {
  const first = !META.ended; META.ended = true; unlockList("chars", ["munyeo", "posu"]); saveMeta();
  const rows = [memoryCard(8)], t = document.createElement("p"); t.className = "end-p";
  t.textContent = first ? "천고가 다시 울렸다. 하늘이 날을 열고, 서율은 이름을 되찾았다. 그러나 장단은 끝나지 않는다. — 업(業)이 열렸고, 무녀와 포수가 탑에 오를 수 있다." : "천고가 다시 울렸다.";
  rows.push(t); run.won = true;
  board("천고가 울린다", "결말", rows, [["끝맺기", () => { run.endingDue = false; endRun(true); }, true]]);
}
// 업: self-imposed burdens for any run once the tale is told; each point raises the rewards
const UPS = [
  { id: "tan", name: "빠른 탄", pts: 1, desc: "적의 탄이 30% 빠르다" }, { id: "fast", name: "급한 장단", pts: 1, desc: "장단이 15% 빠르다" },
  { id: "omen2", name: "짙은 징조", pts: 1, desc: "징조 하나를 안고 시작한다" }, { id: "hp", name: "질긴 적", pts: 2, desc: "모든 적의 체력 +1" },
  { id: "narrow", name: "얕은 무아경", pts: 2, desc: "무아경이 절반 길이로 짧아진다" }, { id: "rage", name: "격노", pts: 2, desc: "우두머리가 처음부터 격노해 있다" },
  { id: "bosshp", name: "강철 우두머리", pts: 2, desc: "우두머리 체력 +50%" }, { id: "noheal", name: "마른 숨", pts: 3, desc: "관문을 넘어도 숨이 차지 않는다" }];
function upPicks(next) {
  const on = new Set(run.up || []), info = document.createElement("small"), chips = document.createElement("div"); chips.className = "chips";
  const pts = () => [...on].reduce((t, id) => t + UPS.find(u => u.id === id).pts, 0);
  const draw = () => { chips.innerHTML = ""; for (const u of UPS) { const c = document.createElement("button"); c.className = "chip" + (on.has(u.id) ? " on" : ""); c.textContent = `${u.name} +${u.pts}`; c.title = u.desc;
    c.addEventListener("click", () => { on.has(u.id) ? on.delete(u.id) : on.add(u.id); draw(); }); chips.appendChild(c); }
    info.textContent = `업 ${pts()} · 보상 ×${(1 + .15 * pts()).toFixed(2)} · 최고 업 ${META.upBest}` + (on.size ? " — " + [...on].map(id => UPS.find(u => u.id === id).desc).join(", ") : ""); };
  draw();
  board("업을 지라", "스스로 무게를 얹을수록 얻는 것이 크다", [chips, info], [["이대로 오른다", () => {
    run.up = [...on]; run.upPts = pts(); META.upBest = Math.max(META.upBest, run.upPts); saveMeta();
    if (upOn("omen2")) { const pool = OMENS.filter(o => !o.calm && o.id !== "geupbak"); (run.omens = run.omens || []).push(pool[(Math.random() * pool.length) | 0].id); }
    run.picking = false; saveRun(); Music.stop(); next(); }, true]]);
}
// 호: titles earned by deeds, one worn on the title screen
const TITLES = [
  { id: "drum", name: "첫 북소리", desc: "천고를 처음 베다", ok: () => META.firsts.cut },
  { id: "beat", name: "일섬의 귀신", desc: "한 판에 일섬으로 적 40을 베다", ok: () => META.firsts.beat },
  { id: "hundred", name: "백전불패", desc: "우두머리 열을 모두 도감에 올리다", ok: () => BOSS_ORDER.concat("sumun").every(k => META.codex[k]) },
  { id: "untouched", name: "맞지 않는 자", desc: "다섯 우두머리를 숨을 잃지 않고 쓰러뜨리다", ok: () => Object.values(META.codex).filter(c => c.marks.includes("nohit")).length >= 5 },
  { id: "tower", name: "탑의 주인", desc: "천고탑 30층에 오르다", ok: () => META.towerBest >= 30 },
  { id: "karma", name: "업보", desc: "업 10 이상을 지고 오르다", ok: () => META.upBest >= 10 },
  { id: "ascetic", name: "수행자", desc: "수행 열 가지를 마치다", ok: () => (META.firsts.quests || 0) >= 10 },
  { id: "name", name: "이름을 되찾은 자", desc: "결말을 보다", ok: () => META.ended }];
function checkTitles() { for (const t of TITLES) if (!META.titles.includes(t.id) && t.ok()) { META.titles.push(t.id); toast(`호를 얻었다 · ${t.name}`); if (!META.title) META.title = t.id; } saveMeta(); }
const BOSS_LORE = {
  sumun: "천고를 지키라는 마지막 명을 아직도 지키고 있다. 명을 내린 이가 누구였는지는 잊었다.",
  gumiho: "천 년을 채우면 사람이 된다 했다. 북이 멈춘 날, 그 천 년도 멈췄다.",
  dokkaebi: "장단에 맞춰 방망이를 두드리던 장난꾸러기. 장단이 사라지자 장난도 사나워졌다.",
  imugi: "여의주를 물고 하늘로 오르려던 날, 천고가 멈추어 길이 닫혔다.",
  wongwi: "이름을 불러 주는 이가 없어 떠나지 못한다. 무명과 닮은 처지다.",
  jangseung: "마을 어귀를 지키던 장승. 지킬 마을이 불탄 뒤에도 눈을 감지 못했다.",
  haetae: "불을 먹어 궁을 지키던 짐승. 붉은 달의 밤에 너무 많은 불을 삼켰다.",
  bulgasari: "쇠를 먹고 자란 괴물. 사람들이 버린 칼과 창을 먹고 탑만큼 커졌다.",
  baekho: "서쪽 산의 산군. 산에 장단이 사라지자 사냥만 남았다.",
  talchum: "탈을 쓰면 누구든 될 수 있었다. 이제는 탈 아래 얼굴을 잊었다.",
  cheongo: "북을 멈추게 한 자는 북의 주인 그 자신이었다. 날을 여는 일에 지쳐서.",
  shadow: "이름을 앗아 간 그림자. 이름을 되찾으려는 마음이 만든 또 하나의 나."
};
const MARK_NAME = { nohit: "무피격", strike: "보통 베기 없이", up: "업 10 이상" };
function codexScreen() {
  checkTitles();
  const rows = [curLine()];
  for (const k of ["sumun", ...BOSS_ORDER, "cheongo", "shadow"]) { const B = BOSSES[k], c = META.codex[k];
    rows.push(bdRow(c ? `${B.name} ${B.han}` : "？？？", c ? `처치 ${c.kills} · ${["nohit", "strike", "up"].map(m => (c.marks.includes(m) ? "◆" : "◇") + MARK_NAME[m]).join(" ")}${c.marks.length >= 3 ? " — " + BOSS_LORE[k] : ""}` : "아직 만나지 못했다",
      c && B.sheet !== "hero3" ? `var(--boss-${k})` : null)); }
  const seen = (META.seen || []).length, total = CHOSIK.filter(c => c.id !== "sum").length;
  rows.push(bdRow(`비급 도감 ${seen} / ${total}`, "한 번이라도 익힌 비급"));
  rows.push(bdRow("무기 숙련", Object.keys(WEAPONS).filter(w => META.weapons.includes(w) || (WEAPONS[w].ch && !WEAPONS[w].cost && META.chars.includes(WEAPONS[w].ch))).map(w => `${WEAPONS[w].name} ${masteryLv(w)}단`).join(" · ")));
  const th = document.createElement("h2"); th.textContent = "호(號)"; th.style.fontSize = "20px"; rows.push(th);
  for (const t of TITLES) { const got = META.titles.includes(t.id);
    rows.push(bdRow((META.title === t.id ? "◆ " : "") + (got ? t.name : "？？？"), t.desc, null, got && META.title !== t.id ? "쓰기" : null, () => { META.title = t.id; saveMeta(); codexScreen(); })); }
  board("도감", "만난 우두머리와 익힌 비급, 얻은 호", rows, [["돌아가기", toMenu]]);
}
// 숙련: each weapon grows with the foes it fells; the fifth step gilds its stroke
const masteryLv = w => Math.min(5, Math.floor(Math.sqrt((META.mastery[w] || 0) / 25)));
const chr = id => !!(run && (id === "posu" ? isGun() : run.char === id));   // 포수 is no longer a person: "posu" now means "holding a gun"
const MV_AX = { mvrun: [.627, .694, .688, .694, .604, .692, .689, .695],   // the run sheet, aligned on the hat so the head rides level
  mv0: [.52, .6, .64, .62, .61, .61, .55, .61, .54, .48, .44, .59, .58, .61, .43, .45],   // body axis of each frame, so the feet stay put
  mv1: [.53, .62, .62, .62, .57, .6, .57, .59, .63, .57, .44, .53, .54, .64, .46, .44], mv2: [.46, .5, .52, .49, .48, .5, .49, .46, .52, .41, .41, .44, .39, .45, .42, .42] };
const VIS = { cut: 0, splat: 1, ring: 2, drum: 3, bigDrum: 4, burst: 5, stroke: 6, seal: 7, drops: 8 };   // blood, stamps and the beat bar, painted to read at a glance
const MU_AX = [.57, .63, .61, .61, .54, .57, .57, .59, .58, .55, .62, .6, .44, .46, .49, .53], PO_AX = [.48, .5, .49, .47, .48, .47, .46, .51, .46, .42, .51, .43, .42, .47, .53, .39];   // 무녀·포수: same 16 moves as the swordsman's hero3
const CF = (k) => chr("munyeo") ? { dragon: ["mfx", 4], bloom: ["mfx", 5], clone: ["mfx", 8] }[k] : chr("posu") ? { dragon: ["pfx", 4], bloom: ["pfx", 2], clone: ["pfx", 7] }[k] : null;   // each hand's own picture of a shared gift
const dirFx = d => ({ rot: d.x < 0 ? Math.atan2(d.y, d.x) - Math.PI : Math.atan2(d.y, d.x), flip: d.x < 0 });
const AF_AX = [.48, .47, .4, .24, .37, .35, .47, .3];   // arms sheet: 무녀 방울 0-1, 신칼 2-3 / 포수 각궁 4-5, 창 6-7
const CF_AX = [.57, .64, .61, .67, .53, .41, .4, .66, .37, .47, .46, .46, .49, .34, .39, .53];   // chars sheet: 무녀 0-7, 포수 8-15
// ---------- 영물: a spirit beast raised from the egg on 숨 ----------
// the breath left at a run's end (and one for each gate passed) is kept at the 거점; fed to the egg it hatches (2) and grows (8), then fights at your side
const PETS = {
  kkachi: { name: "까치", han: "鵲", base: 0, range: 260, cd: [3, 1.8], desc: "날아들어 쪼고, 다 자라면 지나가는 길의 적 탄을 낚아챈다" },
  haetae: { name: "해치", han: "獬豸", base: 9, range: 150, cd: [3.6, 2.5], desc: "가까운 적에게 불을 뿜어 잠깐 묶는다" },
  yong: { name: "용", han: "龍", base: 18, range: 330, cd: [3.2, 2.2], desc: "멀리 있는 적을 쫓는 물구슬을 뱉는다" },
  fox: { name: "여우", han: "狐", base: 27, range: 300, cd: [3.4, 2.6], desc: "적을 쫓는 여우불을 띄운다 — 다 자라면 두 개" },
  crow: { name: "삼족오", han: "三足烏", base: 36, range: 380, cd: [4, 2.8], desc: "햇살을 쏘아 한 줄의 적을 꿰뚫는다 — 다 자라면 모두" } };
// 영물 2.0: 숨 hatches the egg, then 정 (won beside it — reading blows near it, felling guardians, 甲 gates) raises it;
// the last two steps also ask for more 숨, and the fourth splits two ways
const PET_ST = ["알", "새끼", "어린 영물", "성수", "진화", "각성"];
const PET_NEED = TUNING.PET_NEED;
const PET_EVO = { kkachi: [["흑작", "黑鵲", "#3a1630", "쪼면 잡졸은 단번에 쓰러진다"], ["청작", "靑鵲", "#1d5a8a", "더 자주 날고, 관문마다 두 번 막아 준다"]],
  haetae: [["화치", "火豸", "#b8321c", "불이 잡졸을 단번에 태운다"], ["석치", "石豸", "#3c5a6a", "더 자주 뿜고, 관문마다 두 번 막아 준다"]],
  yong: [["적룡", "赤龍", "#a8202a", "물구슬이 잡졸을 단번에 꿰뚫는다"], ["청룡", "靑龍", "#1f6a5a", "더 자주 뱉고, 관문마다 두 번 막아 준다"]],
  fox: [["구미호", "九尾狐", "#7a1e5a", "여우불이 잡졸을 단번에 태운다"], ["은호", "銀狐", "#5a6a8a", "더 자주 띄우고, 관문마다 두 번 막아 준다"]],
  crow: [["금오", "金烏", "#b8862b", "햇살이 잡졸을 단번에 꿰뚫는다"], ["흑오", "黑烏", "#2a1a4a", "더 자주 쏘고, 관문마다 두 번 막아 준다"]] };
const petMeta = () => { if (META.pet && !PETS[META.pet.kind]) META.pet = null; const m = META.pet; if (m && m.jeong == null) { m.jeong = m.fed >= 20 ? 200 : 0; m.evo = null; } return m; };   // older nests: a grown one keeps its growth
const petStage = () => { const m = petMeta(); if (!m) return -1; let s = 0; for (let k = 1; k < PET_NEED.length; k++) { const n = PET_NEED[k]; if ((m.fed || 0) < (n.fed || 0) || (m.jeong || 0) < (n.jeong || 0) || (k >= 4 && m.evo == null)) break; s = k; } return s; };
const petNextNeed = () => PET_NEED[petStage() + 1] || null;
const petIntimacy = () => Math.min(8, Math.floor(((petMeta() || {}).jeong || 0) / 100));
const petStrike = () => petStage() >= 4 && META.pet.evo === 0;
function petJeong(n) { if (!run || mode === "tutorial" || petStage() < 1) return; run.petJ = (run.petJ || 0) + n; }
let pet = null;
function spawnPet() { pet = null; if (petStage() < 1 || !P || !PETS[META.pet.kind]) return; pet = { x: P.x - 20, y: P.y - 40, vx: 0, vy: 0, cd: 1.2, face: 1, act: null, t: 0, guardN: 0 }; }
function stepPet(dt) {
  if (!pet || !P || state !== "play") return; const D = PETS[META.pet.kind], st = petStage() >= 3 ? 2 : 1, cx = P.x + P.w / 2, cy = P.y + P.h / 2; pet.t += dt;
  if (pet.act && pet.act.kind === "dive") { const a = pet.act, dx = a.e.x + a.e.w / 2 - pet.x, dy = a.e.y + a.e.h / 2 - pet.y, L = Math.hypot(dx, dy) || 1; a.t -= dt;
    pet.x += dx / L * Math.min(L, 900 * dt); pet.y += dy / L * Math.min(L, 900 * dt); pet.face = Math.sign(dx) || pet.face;
    if (st >= 2) for (const b of bullets) if (!b.friendly && Math.hypot(b.x - pet.x, b.y - pet.y) < 26) { b.life = 0; addFx("hud", HUD.spark, b.x, b.y, 18, { life: .2 }); }
    if (L < 16 || a.t <= 0) { if (a.e.alive) { hurtEnemy(a.e, petStrike() && a.e.type !== "b", "pet"); addFx("pet", D.base + 8, pet.x, pet.y, 40, { life: .3 }); } pet.act = null; }
    return; }
  const tx = cx - P.face * 34, ty = P.y - 30 + Math.sin(pet.t * 3) * 5, f = Math.min(1, dt * 5);
  pet.vx += ((tx - pet.x) * 6 - pet.vx) * f; pet.vy += ((ty - pet.y) * 6 - pet.vy) * f; pet.x += pet.vx * dt; pet.y += pet.vy * dt;
  if (Math.abs(pet.vx) > 30) pet.face = Math.sign(pet.vx); if (pet.atkT > 0) pet.atkT -= dt;
  if (mode === "tutorial" || hubOn || pet.rest || (pet.cd -= dt) > 0) return;
  let t = null, bd = D.range; for (const e of enemies) { if (!e.alive || ghostly(e) || e.hidden) continue; const d = Math.hypot(e.x + e.w / 2 - pet.x, e.y + e.h / 2 - pet.y); if (d < bd && los(pet.x, pet.y, e.x + e.w / 2, e.y + e.h / 2)) { bd = d; t = e; } }
  if (!t) { pet.cd = .3; return; }
  petAttack(t, D, st);
}
function petAttack(t, D, st) {
  const ps = petStage(); pet.cd = D.cd[st >= 2 ? 1 : 0] * (ps <= 1 ? 1.35 : ps >= 5 ? .7 : ps >= 4 ? .85 : 1) * (META.pet.evo === 1 && ps >= 4 ? .8 : 1) * (1 - .03 * petIntimacy()); pet.atkT = .35; const ex = t.x + t.w / 2, ey = t.y + t.h / 2; pet.face = Math.sign(ex - pet.x) || pet.face;
  if (META.pet.kind === "kkachi") { pet.act = { kind: "dive", e: t, t: .5 }; Music.sfx("dash"); }
  else if (META.pet.kind === "haetae") { const r = st >= 2 ? 150 : 110; addFx("pet", D.base + 8, pet.x + pet.face * r * .45, pet.y + 6, r * .9, { life: .4, flip: pet.face < 0 });
    for (const e of enemies) if (e.alive && !ghostly(e) && Math.abs(e.x + e.w / 2 - (pet.x + pet.face * r / 2)) < r / 2 + e.w / 2 && Math.abs(e.y + e.h / 2 - pet.y) < 70) { hurtEnemy(e, petStrike() && e.type !== "b", "pet"); if (e.alive && e.type !== "b") e.stunT = Math.max(e.stunT || 0, .5); }
    Music.sfx("shoot"); }
  else if (META.pet.kind === "fox") { for (let i = 0; i < (st >= 2 ? 2 : 1); i++) { const a = Math.atan2(ey - pet.y, ex - pet.x) + (i ? .5 : -.5) * (st >= 2 ? 1 : 0); bullets.push({ x: pet.x, y: pet.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, friendly: true, petOrb: true, petFr: D.base + 8, seek: 9, life: 2.4, owner: null, r: 9 }); } Music.sfx("hook"); }
  else if (META.pet.kind === "crow") { const L = Math.hypot(ex - pet.x, ey - pet.y) || 1, d = { x: (ex - pet.x) / L, y: (ey - pet.y) / L }, reach = 380;   // a sun ray: the young one burns the first body, the grown one the whole line
    const line = foesInLine(pet.x, pet.y, d, reach).sort((a, b) => Math.hypot(a.x - pet.x, a.y - pet.y) - Math.hypot(b.x - pet.x, b.y - pet.y)).slice(0, st >= 2 ? 9 : 1);
    beams.push({ x0: pet.x, y0: pet.y, x1: pet.x + d.x * reach, y1: pet.y + d.y * reach, t: 0, life: .3, red: true, w: 1.6 });
    for (const e of line) { hurtEnemy(e, petStrike() && e.type !== "b", "pet"); addFx("pet", D.base + 8, e.x + e.w / 2, e.y + e.h / 2, 46, { life: .3 }); } Music.sfx("snipe"); }
  else { const L = Math.hypot(ex - pet.x, ey - pet.y) || 1; bullets.push({ x: pet.x, y: pet.y, vx: (ex - pet.x) / L * 300, vy: (ey - pet.y) / L * 300, friendly: true, petOrb: true, seek: 7, life: 2, owner: null, r: 9, pierce: st >= 2, petHit: true }); Music.sfx("hook"); }
}
function drawAmmo() { // the rounds left, as little painted balls over the head
  if (!P || !isGun() || state !== "play" || hubOn || !SPR.muz) return; const G = WEAPONS[wpn()], f = SPR.muz.f[MUZ.bullet]; if (!f) return;
  const max = G.heat ? 3 : gunMag(), n = G.heat ? ((P.overheat || 0) > 0 ? 0 : Math.max(0, Math.min(3, Math.ceil((100 - (P.heat || 0)) / 38)))) : Math.max(0, P.ammo ?? max);
  const sw = f.w * .3, h = 7, w = sw * h / (f.h * .5), gap = w + 3, x0 = P.x + P.w / 2 - (max * gap - 3) / 2, y = P.y + P.h - HERO_H - 1;
  for (let i = 0; i < max; i++) { ctx.globalAlpha = i < n ? .95 : .22; ctx.drawImage(SPR.muz.img, f.x + f.w - sw, f.y + f.h * .25, sw, f.h * .5, x0 + i * gap, y, w, h); }
  if (G.heat && (P.overheat || 0) > 0) { ctx.globalAlpha = .8; ctx.fillStyle = SEAL; ctx.fillRect(x0, y + h + 2, (max * gap - 2) * Math.min(1, P.overheat / 1.6), 2); }
  else if (!G.heat && n < max) { ctx.globalAlpha = .7; ctx.fillStyle = SEAL; ctx.fillRect(x0, y + h + 2, (max * gap - 3) * Math.min(1, (P.slowRe || 0) * (1 + treeStat("reload")) / 2.4), 1.5); }   // the slow match: the next round coming
  ctx.globalAlpha = 1;
}
function drawPet(pal) {
  if (!pet || !SPR.pet) return; const D = PETS[META.pet.kind], ps = petStage(), st = ps >= 3 ? 2 : 1, ev = ps >= 4 && PET_EVO[META.pet.kind] ? PET_EVO[META.pet.kind][META.pet.evo] : null;
  if (pet.rest) ctx.globalAlpha = .35;
  if (ev) { const r = ps >= 5 ? 34 : 26, g = ctx.createRadialGradient(pet.x, pet.y - 4, 2, pet.x, pet.y - 4, r); g.addColorStop(0, ev[2] + "aa"); g.addColorStop(1, ev[2] + "00"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pet.x, pet.y - 4, r * (1 + .08 * Math.sin(pet.t * 4)), 0, 6.283); ctx.fill(); }   // an evolved one burns in its own colour
  const fr = D.base + (st >= 2 ? (pet.atkT > 0 || pet.act ? 6 : Math.abs(pet.vx) > 160 ? 7 : 5) : (pet.atkT > 0 || pet.act ? 4 : 3)), h = (st >= 2 ? 46 : ps <= 1 ? 26 : 32) * (ps >= 5 ? 1.18 : 1);
  drawSprite("pet", fr, pet.x, pet.y, h / SPR.pet.f[fr].h, pet.face < 0, .5, false, .5); ctx.globalAlpha = 1;
}
function petScreen() { // 둥지: choose an egg, feed it 숨
  const rows = [], cur = () => { const d = document.createElement("div"); d.className = "bd-cur"; d.innerHTML = `<span>숨 ${META.sum || 0}</span><span>혼 ${META.hon}</span>`; return d; };
  rows.push(cur());
  if (!META.pet) { for (const [k, D] of Object.entries(PETS)) rows.push(bdRow(`${D.name}의 알 ${D.han}`, D.desc, null, "품기", () => { META.pet = { kind: k, fed: 0 }; saveMeta(); toast(`${D.name}의 알을 품었다`); enterHub(); petScreen(); }));
    board("둥지", "알 하나를 골라 숨으로 키운다 · 숨은 판이 끝날 때 남은 숨과 넘은 관문으로 모인다", rows, [["돌아가기", resumeHub]]); return; }
  const D = PETS[META.pet.kind], m = petMeta(), st = petStage(), nx = petNextNeed(), ev = st >= 4 ? PET_EVO[m.kind][m.evo] : null;
  const needTxt = nx ? [nx.jeong ? `정 ${m.jeong || 0} / ${nx.jeong}` : "", nx.fed ? `숨 ${m.fed} / ${nx.fed}` : ""].filter(Boolean).join(" · ") : "다 이루었다";
  rows.push(bdRow(`${ev ? ev[0] + " " + ev[1] : D.name + " " + D.han} · ${PET_ST[st]}`, `${needTxt} → ${PET_ST[st + 1] || "끝"}${st >= 1 ? ` · 친밀 ${petIntimacy()}` : ""}`));
  rows.push(bdRow("함께 싸우면", [st >= 1 ? D.desc : "깨어나면 함께 싸운다", st >= 2 ? "합격 — 내가 간파하면 곧바로 덮친다" : "어린 영물이 되면 합격", st >= 3 ? `수호 — 죽을 일격을 관문마다 ${ev && m.evo === 1 ? "두" : "한"} 번 대신 막고 쉰다` : "성수가 되면 수호", ev ? ev[3] : "", st >= 1 ? "정은 영물 곁에서 간파 +1 · 우두머리 +5 · 상 등급 관문 +3" : ""].filter(Boolean).join(" · ")));
  const feedCap = Math.max(0, ((nx && nx.fed) || m.fed) - m.fed);
  const feed = n => { const give = Math.min(n, META.sum || 0, feedCap); if (!give) return; const before = petStage(); META.sum -= give; m.fed += give; saveMeta();
    const now = petStage(); toast(now > before ? `${D.name} · ${PET_ST[now]}` : `숨 ${give}을 먹였다`); Music.sfx(now > before ? "seal" : "lantern"); if (now > before) enterHub(); petScreen(); };
  if (feedCap > 0) { rows.push(bdRow("숨 하나 먹이기", `숨 1 · 이번 단계에 ${feedCap} 더`, null, "먹이기", () => feed(1), !(META.sum > 0)));
    rows.push(bdRow("숨 모두 먹이기", `가진 숨 ${META.sum || 0}`, null, "먹이기", () => feed(99), !(META.sum > 0))); }
  if (st === 3 && m.evo == null && (m.jeong || 0) >= 400 && m.fed >= 15) PET_EVO[m.kind].forEach((e, k) => rows.push(bdRow(`진화 · ${e[0]} ${e[1]}`, e[3], null, "고르기", () => { m.evo = k; saveMeta(); Music.sfx("seal"); Music.jing(); toast(`${D.name}이(가) ${e[0]}(으)로 거듭났다`); enterHub(); petScreen(); })));
  else if (st === 3 && m.evo == null) rows.push(bdRow("진화", `정 400 · 숨 15가 차면 두 갈래 중 하나로 거듭난다`));
  board("둥지", D.desc, rows, [["돌아가기", resumeHub]]);
}
// ---------- 거점: the mountain hermitage you walk around in between runs ----------
// every station is a place you walk up to; the 산문 at the left edge is the road out to 천고
let hubOn = false, hubNear = null;
// the 거점 is one painted courtyard: a yard, a stone terrace (축대) with the main hall on it, and five places to go
const HUB_W = 40, HUB_UP = 10, HUB_K = 40 * 32 / 1344, HUB_Y = 12 * 32 - 490 * (40 * 32 / 1344);   // the painting spans the map exactly   // the painting's ground line (y 490) sits on row 12; its terrace top lands on row 10
const HUBIMG = new Image(); HUBIMG.src = `assets/hubscene.webp?v=${ASSET_V}`;
const HUB_ST = [
  { id: "gate", tx: 4, ty: 12, h: 150, name: "산문", han: "山門", act: "길 떠나기 · 천고탑 · 수련터" },
  { id: "well", tx: 9, ty: 12, h: 80, name: "약수터", han: "藥水", act: "숨 다스리기 · 영물" },
  { id: "hall", tx: 18, ty: HUB_UP, h: 150, name: "본당", han: "本堂", act: "서약·심법 · 기도 · 비급첩" },
  { id: "forge", tx: 28, ty: 12, h: 110, name: "대장간", han: "鍛冶間", act: "무기 · 옷·띠" },
  { id: "drum", tx: 36, ty: 12, h: 110, name: "큰북", han: "大鼓", act: "수행·기억 · 도감" }];
const HUB_SLOTS = [{ tx: 6, ty: 12 }, { tx: 25, ty: 12 }, { tx: 32, ty: 12 }];   // the front of the yard, where a few things may stand
const DECO = [
  { id: "pine", name: "소나무", sheet: "props", i: PROP.pine, h: 96, hon: 30 }, { id: "lantern", name: "석등", sheet: "props", i: PROP.stoneLantern, h: 44, hon: 30 },
  { id: "jars", name: "항아리", sheet: "props", i: PROP.jars, h: 34, hon: 15 }, { id: "jangdok", name: "장독대", sheet: "hub", i: 8, h: 44, hon: 40 },
  { id: "banner", name: "깃발", sheet: "props", i: PROP.banner, h: 84, hon: 25 }, { id: "sotdae", name: "솟대", sheet: "props", i: PROP.sotdae, h: 86, hon: 25 },
  { id: "haetae", name: "해태상", sheet: "props2", i: P2.haetae, h: 40, hon: 60 }, { id: "brazier", name: "화로", sheet: "props2", i: P2.brazier, h: 36, hon: 30 },
  { id: "plum", name: "매화", sheet: "hub", i: 5, h: 92, hon: 50 }, { id: "pavilion", name: "정자", sheet: "hub", i: 6, h: 100, hon: 120 },
  { id: "rack", name: "창걸이", sheet: "props2", i: P2.rack, h: 46, hon: 30 }, { id: "fence", name: "붉은 울타리", sheet: "props2", i: P2.gate, h: 40, hon: 30 },
  { id: "sacks", name: "볏짐", sheet: "props2", i: P2.sacks, h: 32, hon: 15 }];
const hubDeco = () => (META.deco = META.deco || { own: [], slots: {} });
// 약수터: what 혼 buys for the breath itself
const WELL = [
  { id: "start1", name: "맑은 숨", desc: "판을 시작할 때 숨 +1", hon: 90 },
  { id: "cap1", name: "깊은 숨", desc: "숨을 담을 수 있는 그릇 +1", hon: 140 },
  { id: "rest1", name: "고른 숨", desc: "쉼터에서 숨을 고르면 하나 더", hon: 110 },
  { id: "boss1", name: "결전의 숨", desc: "천고대 앞에서 숨을 넷까지 채운다", hon: 160 },
  { id: "start2", name: "트인 숨", desc: "판을 시작할 때 숨 +1 (맑은 숨 다음)", hon: 220, need: "start1" }];
const well = id => !!(META.well && META.well.includes(id));
function buildHubMap() {
  const rows = []; for (let y = 0; y < 16; y++) rows.push(Array.from({ length: HUB_W }, (_, x) => y >= 12 || x === 0 || x === HUB_W - 1 ? "#" : " "));
  rows[11][13] = "#"; for (let x = 14; x <= 24; x++) rows[10][x] = rows[11][x] = "#";   // the painted steps and the terrace they climb to
  rows[11][6] = "P"; return rows.map(r => r.join(""));
}
const hubRect = () => { const w = 1344 * HUB_K, h = 576 * HUB_K; return { x: (LV.w * T - w) / 2, y: HUB_Y, w, h }; };
function hubZoom() { const r = hubRect(), vw0 = W / SCALE, vh0 = H / SCALE; return PORTRAIT() ? Math.max(1, vw0 / r.w) : Math.max(1, vw0 / r.w, vh0 / r.h); }   // any screen: zoom in until the painting covers it
function drawHubScene(pal) { // the painting itself is the place; the yard below its ground line is plain earth
  const top = HUB_Y, w = 1344 * HUB_K, h = 576 * HUB_K, x = (LV.w * T - w) / 2, I = HUBIMG;
  if (!(I.complete && I.naturalWidth)) { ctx.fillStyle = "#d9d3c4"; ctx.fillRect(-400, top + h - 2, LV.w * T + 800, 1200); return; }
  if (!I.edge) { const c = document.createElement("canvas"); c.width = 8; c.height = 8; const g = c.getContext("2d"), avg = (sx, sy, sw, sh) => { g.clearRect(0, 0, 8, 8); g.drawImage(I, sx, sy, sw, sh, 0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; };
    I.edge = { sky: avg(0, 0, I.width, 6), earth: avg(I.width * .1, I.height - 70, I.width * .8, 40), left: avg(0, 0, 6, I.height * .5), right: avg(I.width - 6, 0, 6, I.height * .5) }; }
  const E = I.edge;   // past the painting's edges the screen takes its colours, never a seam
  ctx.fillStyle = E.sky; ctx.fillRect(x - 900, top - 1400, w + 1800, 1402);
  ctx.fillStyle = E.earth; ctx.fillRect(x - 900, top + h - 2, w + 1800, 1400);
  ctx.fillStyle = E.left; ctx.fillRect(x - 900, top, 902, h); ctx.fillStyle = E.right; ctx.fillRect(x + w - 2, top, 902, h);
  ctx.drawImage(I, x, top, w, h);
  const fade = (y0, y1, col) => { const gr = ctx.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, col); return gr; };
  ctx.fillStyle = fade(top + h - 60, top + h, E.earth); ctx.fillRect(x, top + h - 60, w, 61);
}
function enterHub() {
  hubOn = true; mode = "tutorial"; Music.menuBgm(true);
  run = { hub: true, m: 0, breath: Infinity, time: 0, deaths: 0, kills: 0, strikes: 0, slashes: 0, cp: -1, dead: [], perks: [], weapon: META.lastWeapon && WEAPONS[META.lastWeapon] ? META.lastWeapon : "hwando" };
  loadMap(buildHubMap(), PAL[0], []); LV.hub = true; LV.dress = []; needSheets(playSheets());
  if (petStage() === 0) LV.dress.push({ sheet: "pet", i: PETS[META.pet.kind].base, x: 366 * HUB_K, y: 454 * HUB_K + HUB_Y, h: 26, flip: false, ay: 1 });   // the egg sits in the painted straw nest by the well
  LV.stations = HUB_ST;
  const dk = hubDeco(); for (let k = 0; k < HUB_SLOTS.length; k++) { const id = dk.slots[k], d = DECO.find(o => o.id === id); if (d) LV.dress.push({ sheet: d.sheet, i: d.i, x: HUB_SLOTS[k].tx * T + 16, y: HUB_SLOTS[k].ty * T + 2, h: d.h, flip: k % 2 === 1, ay: 1 }); }
  deadIds = new Set(); cpSave = null; enemies = [];
  if (!P || !P.hubKeep) P = newPlayer(6 * T + 7, LV.start.y); P.hubKeep = true; P.face = 1;
  bullets = []; parts = []; ghosts = []; seals = []; vfx = []; haz = []; beams = []; bolts = []; kegs = []; rings = []; cutLines = []; trails = []; pops = []; pfires = []; clones = []; chungoFx = null;
  songPos = Music.pos(); cam.x = P.x; cam.y = P.y; spawnPet();
  document.body.classList.add("inhub"); setHud(); hubHud(); showScreen(null); inkWipe(); state = "play"; hubNear = null; hubPrompt(); hubTitle();
}
let hubTitled = false;
function hubTitle() { // the name of the game, once, as the hermitage first comes into view
  if (hubTitled) return; hubTitled = true; const el = $("hubTitle"); el.hidden = false; $("nameLine2").textContent = META.mem.length ? `${NAME} · 이름의 획 ${META.mem.length} / 9` : "";
  setTimeout(() => el.classList.add("off"), 2600); setTimeout(() => { el.hidden = true; }, 3400);
}
function resumeHub() { if (!hubOn || !LV || !LV.hub) { enterHub(); return; } Music.menuBgm(true); document.body.classList.add("inhub"); hubHud(); showScreen(null); state = "play"; hubPrompt(); }
function leaveHub() { hubOn = false; $("hubTitle").hidden = true; document.body.classList.remove("inhub"); $("bAct").hidden = true; if (P) P.hubKeep = false; Music.menuBgm(false); }
function hubHud() { $("hMadang").textContent = "산중 거점"; $("hJang").innerHTML = `<em>혼 ${META.hon}</em><em>숨 ${META.sum || 0}</em><em>천고 조각 ${META.shard}</em>`; }
const stationsOn = () => !!(LV && LV.stations && state === "play" && P);
function hubStep() { // which station (or empty plot) is underfoot — in the 거점, or a person on the road
  if (!stationsOn()) return; const cx = P.x + P.w / 2; let best = null, bd = 44;
  const feet = P.y + P.h, on = ty => Math.abs(feet - (ty || 12) * T) < 24;   // only what stands on your own floor
  for (const st of LV.stations) { const d = Math.abs(st.tx * T + 16 - cx); if (d < bd && on(st.ty)) { bd = d; best = { st }; } }
  if (LV.hub) for (let k = 0; k < HUB_SLOTS.length; k++) { const d = Math.abs(HUB_SLOTS[k].tx * T + 16 - cx); if (d < Math.min(bd, 30) && on(HUB_SLOTS[k].ty)) { bd = d; best = { slot: k }; } }
  const key = best ? best.st ? best.st.id : "s" + best.slot : ""; if (key !== (hubNear ? hubNear.key : "")) { hubNear = best ? { ...best, key } : null; hubPrompt(); }
}
function hubPrompt() {
  const b = $("bAct"); if (!stationsOn() || !hubNear) { b.hidden = true; return; } b.hidden = false;
  if (hubNear.st) { const st = hubNear.st; b.innerHTML = `<b>${st.name}</b><small>${st.act}</small>`; }
  else { const id = hubDeco().slots[hubNear.slot], d = DECO.find(o => o.id === id); b.innerHTML = `<b>${d ? d.name : "빈 터"}</b><small>꾸미기</small>`; }
}
function hubAct() {
  if (!stationsOn() || !hubNear) return; Music.sfx("lantern");
  if (!LV.hub) return stageAct(hubNear.st);
  if (hubNear.slot != null) return decoScreen(hubNear.slot);
  const id = hubNear.st.id;
  const menu = (title, sub, items) => board(title, sub, items.map(([n, d, fn]) => bdRow(n, d, null, "가기", fn)), [["돌아가기", resumeHub]]);
  if (id === "gate") return menu("산문 山門", "어디로 갈 것인가", [["길 떠나기", "천고를 향한 한 바퀴", gateScreen], ["천고탑", "층마다 우두머리 · 무한", () => towerScreen()], ["수련터", "조작을 다시 익힌다", () => { leaveHub(); Music.unlock(); loadGate(playSheets(), BASE_IMGS, startTutorial, "수련터를 그리는 중"); }]]);
  if (id === "well") return menu("약수터 藥水", "숨을 다스리고 영물을 키운다", [["약수", "혼으로 숨을 다스린다", wellScreen], ["둥지", "숨으로 영물을 키운다", petScreen]]);
  if (id === "hall") return menu("본당 本堂", "산중 암자의 중심", [["서고", "서약과 심법", () => hermitScreen("seogo")], ["수련 깨치기", "무기 트리의 3단·4단·합류를 연다", treeOpenScreen], ["사당", "판의 시작을 넉넉하게", () => hermitScreen("sadang")], ["비급각", "봉인한 비급첩", sealShelf]]);
  if (id === "forge") return menu("대장간 鍛冶間", "벼리고 물들인다", [["무기", "새 무기를 벼린다", () => hermitScreen("daejang")], ["의방", "띠의 빛깔", () => hermitScreen("uibang")]]);
  if (id === "drum") return menu("큰북 大鼓", "북 곁의 기록", [["수행 · 기억", "오늘의 수행과 되찾은 기억", questScreen], ["도감", "만난 우두머리와 비급", () => codexScreen()], ["플레이 기록", "최근 판·관문 시간·자주 쓰러진 곳·기기 성능", logScreen]]);
  if (id === "gate") return gateScreen();
  if (id === "dummy") { leaveHub(); Music.unlock(); loadGate(playSheets(), BASE_IMGS, startTutorial, "수련터를 그리는 중"); return; }
  if (id === "well") return wellScreen();
  if (id === "nest") return petScreen();
  if (id === "tower") { towerScreen(); return; }
  if (id === "stele") { codexScreen(); return; }
  if (id === "drum") { questScreen(); return; }
  if (id === "bigeup") { sealShelf(); return; }
  hermitScreen(id);
}
function gateScreen() { // 산문: the road out
  const s = store.get("run", null), rows = [curLine()];
  if (s) rows.push(bdRow("이어 가기", `${stageName(s.m, s)} · 숨 ${s.breath}`, null, "이어 가기", () => { leaveHub(); continueRun(); }));
  rows.push(bdRow("새 길", s ? "이어 가던 판은 사라진다" : "검객·무기·심법·서약을 고르고 천고를 향해 떠난다", null, "떠나기", () => { leaveHub(); newRun(); }));
  { const k = todayKey(), d = META.daily && META.daily.key === k ? META.daily : null;   // 오늘의 길: everyone walks the same road today
    rows.push(bdRow(`오늘의 길 · ${+k.slice(5, 7)}월 ${+k.slice(8, 10)}일`, `오늘은 누구나 같은 갈림길과 같은 우두머리 — ${d ? `오늘 최고 ${d.reached}관문 · ${fmt(d.time)}` : "아직 걷지 않았다"}`, null, "떠나기", () => { leaveHub(); newRun(false, true); })); }
  const best = store.get("best", null); if (best) rows.push(bdRow("최고 기록", `관문 ${best.reached}개 · ${fmt(best.time)}`));
  board("산문 山門", "한 바퀴 = 갈림길 다섯과 천고대", rows, [["돌아가기", resumeHub]]);
}
function wellScreen() {
  const rows = [curLine()]; META.well = META.well || [];
  for (const w of WELL) { const got = well(w.id), locked = w.need && !well(w.need);
    rows.push(bdRow(`${got ? "✓ " : ""}${w.name}`, w.desc + (got ? "" : locked ? " — 먼저 앞의 숨을 다스려야 한다" : ` — 혼 ${w.hon}`), null, got ? null : "마시기", () => {
      META.hon -= w.hon; META.well.push(w.id); saveMeta(); hubHud(); toast(`${w.name} · ${w.desc}`); wellScreen(); }, got || locked || META.hon < w.hon)); }
  board("약수터 藥水", "혼을 바쳐 숨을 다스린다", rows, [["돌아가기", resumeHub]]);
}
function decoScreen(slot) {
  const dk = hubDeco(), cur = dk.slots[slot], rows = [curLine()];
  if (cur) rows.push(bdRow("치우기", "이 터를 비운다", null, "치우기", () => { delete dk.slots[slot]; saveMeta(); enterHub(); toast("터를 비웠다"); }));
  for (const d of DECO) { const own = dk.own.includes(d.id);
    rows.push(bdRow(d.name + (cur === d.id ? " · 놓여 있음" : ""), own ? "이미 들였다" : `혼 ${d.hon}`, null, cur === d.id ? null : own ? "놓기" : "들이기", () => {
      if (!own) { META.hon -= d.hon; dk.own.push(d.id); } dk.slots[slot] = d.id; saveMeta(); enterHub(); toast(`${d.name}을(를) 놓았다`); }, !own && META.hon < d.hon)); }
  board("거점 꾸미기", "들인 것은 어느 터에든 다시 놓을 수 있다", rows, [["돌아가기", resumeHub]]);
}
function questScreen() {
  questsToday(); const rows = [curLine()];
  for (const q of META.quests.list) rows.push(bdRow((q.done ? "✓ " : "") + q.text, q.done ? "마쳤다" : `${Math.min(q.prog || 0, q.n || 1)} / ${q.n || 1} · 보상 혼 40, 천고 조각 1`));
  rows.push(bdRow(`이름의 획 ${META.mem.length} / 9`, "획을 되찾을 때마다 기억이 하나씩 돌아온다", null, META.mem.length ? "기억 보기" : null, () => memoryList()));
  board("큰북 大鼓", "오늘의 수행과 되찾은 기억", rows, [["돌아가기", resumeHub]]);
}
function sealShelf() { // 비급각: the sealed books and the shelf that holds them
  const rows = [curLine()]; const B = BUILDINGS.find(b => b.id === "bigeup"), lv = META.bld.bigeup || 0, nx = B.lv[lv];
  rows.push(bdRow(`비급각 ${lv}단계`, nx ? `${nx.desc} — 천고 조각 ${nx.shard}` : "모두 올렸다", "var(--misc-5)", nx ? "올리기" : null, () => { META.shard -= nx.shard; META.bld.bigeup = lv + 1; saveMeta(); hubHud(); sealShelf(); }, !nx || META.shard < nx.shard));
  if (!META.books.length) rows.push(bdRow("봉인된 비급첩이 없다", "천고를 한 번 이상 벤 판이 끝나면 그 빌드를 비급첩에 봉인해 천고탑에 들고 갈 수 있다"));
  for (const bk of META.books) rows.push(bdRow(bk.name, bookLine(bk)));
  board("비급각 秘笈閣", `비급첩 ${META.books.length} / ${shelfCap()}`, rows, [["돌아가기", resumeHub]]);
}
function logScreen() { // 플레이 기록: what the last runs looked like, so the tuning can follow real play
  const L = Array.isArray(META.log) ? META.log.filter(l => l && typeof l === "object") : [], rows = [];
  if (!L.length) rows.push(bdRow("아직 기록이 없다", "판을 하나 마치면 여기에 쌓인다"));
  else { const gates = L.flatMap(l => Array.isArray(l.g) ? l.g : []), cl = gates.filter(g => g.out === "clear" && g.node !== "boss"), avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
    const causes = {}; for (const l of L) if (l.cause) causes[l.cause] = (causes[l.cause] || 0) + 1; const top = Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const deaths = {}; for (const g of gates) if (g.out === "dead") deaths[g.m] = (deaths[g.m] || 0) + 1; const hard = Object.entries(deaths).sort((a, b) => b[1] - a[1])[0];
    rows.push(bdRow(`최근 ${L.length}판`, `평균 ${avg(L.map(l => l.r))}관문 · 판당 혼 ${avg(L.map(l => l.hon || 0))} · 천고를 벤 판 ${L.filter(l => l.won).length}`));
    rows.push(bdRow("관문 하나에", cl.length ? `평균 ${avg(cl.map(g => g.t))}초 · 잃는 숨 평균 ${(cl.reduce((a, g) => a + (g.hits || 0), 0) / cl.length).toFixed(1)}` : "아직 넘은 관문이 없다"));
    if (top.length) rows.push(bdRow("자주 쓰러진 까닭", top.map(([c, n]) => `${c} ${n}번`).join(" · ")));
    if (hard) rows.push(bdRow("가장 많이 막힌 곳", `${stageOf(+hard[0]).ko} — ${hard[1]}번`));
    for (const l of L.slice(-6).reverse()) rows.push(bdRow(`${l.d || ""} · ${(WEAPONS[l.w] || {}).name || l.w} · ${(TUNING.DIFF[l.diff] || TUNING.DIFF[1]).name}`, `${l.won ? "천고를 벴다" : `${l.r}관문 · ${l.cause || "끝"}`} · ${fmt(l.t || 0)} · 혼 +${l.hon || 0}`)); }
  const pf = META.perf; rows.push(bdRow("이 기기의 성능", pf ? `최근 관문 평균 ${pf.fps}fps · 느린 프레임 ${pf.slow}% · 해상도 ×${pf.dpr}${pf.lite ? " · 가벼운 그래픽" : ""}` : "관문을 하나 넘으면 잰다"));
  board("플레이 기록", "이 기기에만 남는다 · 기록 옮기기로 함께 내보낼 수 있다", rows, [["돌아가기", resumeHub]]);
}
function hubReady(id) { // a red dot on the board where something can be opened right now
  const bld = b => { const B = BUILDINGS.find(o => o.id === b), nx = B && B.lv[META.bld[b] || 0]; return nx && META.hon >= (nx.hon || 0) && META.shard >= (nx.shard || 0); };
  if (id === "hall") { const t = TREE_OPEN[treeOpen()], ms = Math.max(0, ...Object.keys(WEAPONS).map(w => masteryLv(w))); return bld("seogo") || bld("sadang") || bld("bigeup") || !!(t && META.hon >= t.hon && ms >= t.ms); }
  if (id === "forge") return bld("daejang") || bld("uibang") || Object.entries(WEAPONS).some(([w, o]) => o.cost && !o.ch && !META.weapons.includes(w) && META.hon >= o.cost);
  if (id === "well") { const nx = petNextNeed && petNextNeed(); return WELL.some(w => !well(w.id) && (!w.need || well(w.need)) && META.hon >= w.hon) || !!(META.pet && nx && nx.fed && META.pet.fed < nx.fed && (META.sum || 0) > 0); }
  return false;
}
function drawHubLabels(pal) { // the names of the stations, painted on small boards above them
  if (!LV || !LV.stations) return; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (LV.hub) { // 거점: a hanging name board (현판) over every place you can use, and a stone mark on the ground where you stand to use it
    const t = performance.now() / 1000;
    for (const st of LV.stations) { const x = st.tx * T + 16, g = (st.ty || 12) * T, near = hubNear && hubNear.st === st, y = Math.max(camView.y0 + 22, g - st.h * .8 - 18);
      ctx.globalAlpha = near ? .9 : .55; ctx.fillStyle = near ? "rgba(195,22,28,.35)" : "rgba(23,22,26,.22)"; ctx.beginPath(); ctx.ellipse(x, g + 1, near ? 26 : 20, near ? 7 : 5, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.font = `400 ${near ? 16 : 13}px "Song Myung", serif`; const tw = ctx.measureText(st.name).width, w = tw + 22, h = near ? 26 : 22, by = y + (near ? Math.sin(t * 4) * 2 : 0);
      ctx.strokeStyle = "rgba(23,22,26,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, by - h / 2); ctx.lineTo(x - 6, by - h / 2 - 8); ctx.lineTo(x + w / 2 - 6, by - h / 2); ctx.stroke();   // the cord it hangs from
      ctx.fillStyle = near ? "#9a1424" : "rgba(28,24,26,.88)"; ctx.fillRect(x - w / 2, by - h / 2, w, h);
      ctx.strokeStyle = near ? "#e8c27a" : "rgba(232,194,122,.55)"; ctx.lineWidth = 1.5; ctx.strokeRect(x - w / 2 + 2.5, by - h / 2 + 2.5, w - 5, h - 5);
      ctx.fillStyle = "#f3ede0"; ctx.fillText(st.name, x, by + 1);
      if (hubReady(st.id)) { const dx = x + w / 2 - 2, dy = by - h / 2 + 2, pr = 4.5 + Math.sin(t * 5) * .8; ctx.fillStyle = "#c3161c"; ctx.beginPath(); ctx.arc(dx, dy, pr, 0, 6.283); ctx.fill(); ctx.strokeStyle = "#f3ede0"; ctx.lineWidth = 1.2; ctx.stroke(); }   // something can be opened here now
      if (near) { ctx.fillStyle = "#9a1424"; ctx.beginPath(); ctx.moveTo(x - 6, by + h / 2 + 4); ctx.lineTo(x + 6, by + h / 2 + 4); ctx.lineTo(x, by + h / 2 + 11); ctx.fill(); } } }
  for (const st of LV.stations || []) { const x = st.tx * T + 16, y = (st.ty || 12) * T - Math.max(st.h, 44) - 10, near = hubNear && hubNear.st === st; if (LV.hub) continue;
    ctx.font = `400 ${near ? 15 : 12}px "Song Myung", serif`; const w = ctx.measureText(st.name).width + 14;
    ctx.fillStyle = near ? "rgba(195,22,28,.92)" : "rgba(23,22,26,.72)"; ctx.fillRect(x - w / 2, y - 10, w, 20); ctx.fillStyle = "#f3ede0"; ctx.fillText(st.name, x, y + 1); }
  const dk = hubDeco(); if (LV.hub) for (let k = 0; k < HUB_SLOTS.length; k++) if (!dk.slots[k]) { const x = HUB_SLOTS[k].tx * T + 16, y = HUB_SLOTS[k].ty * T - 4, near = hubNear && hubNear.slot === k;
    ctx.strokeStyle = near ? "rgba(195,22,28,.8)" : "rgba(23,22,26,.3)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 18, 5, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
}
// ---------- screens ----------
// 먹 번짐 (scene change): a loaded brush sweeps across and covers the page, a drop of 주홍 blooms in the wet ink,
// then the ink soaks away from the middle with a ragged edge and leaves a few drips behind
let wipeRun = null;
function inkWipe(kind = "") {
  const cvW = $("wipe"); if (!cvW || !cvW.getContext) return;
  const calm = settings.calm || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const k = .5, w = Math.ceil(innerWidth * k), h = Math.ceil(innerHeight * k);   // half resolution: ink edges are soft anyway
  cvW.width = w; cvW.height = h; const c = cvW.getContext("2d");
  const rnd = mulberry((Math.random() * 1e9) >>> 0), J = Array.from({ length: 160 }, () => rnd());
  const dir = rnd() < .5 ? 1 : -1, red = kind !== "plain";
  const D = calm ? .35 : 1.1, T_COVER = .3, T_OPEN = .52, diag = Math.hypot(w, h);
  const spl = Array.from({ length: 26 }, (_, i) => ({ a: J[i] * 6.28, d: .3 + J[i + 30] * .5, r: 1 + J[i + 60] * 5 }));
  if (wipeRun) cancelAnimationFrame(wipeRun.raf);
  const me = {};
  const t0 = performance.now(); cvW.style.visibility = "visible";
  const ink = "#17161a", easeO = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3), easeIO = x => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const blob = (x, y, r, n, seed, amp) => { c.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * 6.283, q = 1 + amp * (Math.sin(a * 3 + seed) * .5 + Math.sin(a * 7 + seed * 2.3) * .3 + (J[(i + (seed * 13 | 0)) % 160] - .5) * .4); const px = x + Math.cos(a) * r * q, py = y + Math.sin(a) * r * q; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); };
  const frame = now => {
    const t = window.__wipeT ?? (now - t0) / 1000; c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, w, h);
    if (wipeRun !== me) return;
    if (t >= D) { cvW.style.visibility = "hidden"; wipeRun = null; return; }
    if (calm) { c.globalAlpha = Math.sin(Math.PI * t / D); c.fillStyle = ink; c.fillRect(0, 0, w, h); c.globalAlpha = 1; me.raf = requestAnimationFrame(frame); return; }
    // 1. the stroke: stamps along a gently bowed diagonal, wide enough at full press to hide the whole page
    const p = easeO(t / T_COVER), R = diag * .62, N = 34;
    c.fillStyle = ink;
    for (let i = 0; i < N * p; i++) { const u = i / N, x = dir > 0 ? -R * .6 + u * (w + R * 1.2) : w + R * .6 - u * (w + R * 1.2), y = h * (.5 + .18 * Math.sin(u * 3.1 + J[3] * 3)) ;
      const press = Math.min(1, u * 5) * (1 - .1 * Math.sin(u * 9)); blob(x, y, R * press * (.3 + .7 * easeO(t / T_COVER)), 28, i * .7, .12); c.fill(); }
    // dry-brush bristles trailing off the stroke's edges
    if (p < 1) { c.strokeStyle = ink; c.lineCap = "round"; for (let b = 0; b < 22; b++) { const off = (J[b + 80] - .5) * h * 1.3, len = (w + R) * p, a = .25 + J[b + 100] * .5; c.globalAlpha = a; c.lineWidth = 1 + J[b + 120] * 4; c.beginPath(); const x0 = dir > 0 ? -20 : w + 20; c.moveTo(x0, h / 2 + off); c.lineTo(x0 + dir * len * (.7 + J[b + 40] * .3), h / 2 + off * (1 + .1 * J[b])); c.stroke(); } c.globalAlpha = 1; }
    // splashes flung from the press
    for (const s of spl) { const g = easeO((t - .05) / .3); if (g <= 0) continue; c.globalAlpha = 1 - Math.max(0, (t - .8) / .25); c.beginPath(); c.arc(w / 2 + Math.cos(s.a) * diag * s.d * g, h / 2 + Math.sin(s.a) * diag * s.d * .7 * g, s.r * (1 + g), 0, 6.283); c.fill(); }
    c.globalAlpha = 1;
    // 2. 주홍: a drop of red blooms in the wet ink and spreads its feathered rim
    if (red && t > .22) { const q = easeO((t - .22) / .35), fade = 1 - Math.max(0, (t - .62) / .3), r = Math.min(w, h) * (.05 + .07 * q);
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r * 1.6); g.addColorStop(0, `rgba(205,30,34,${.95 * fade})`); g.addColorStop(.55, `rgba(178,22,28,${.85 * fade})`); g.addColorStop(1, "rgba(120,10,16,0)");
      c.fillStyle = g; blob(w / 2, h / 2, r * 1.5, 40, 4.2, .18); c.fill(); }
    // 3. the ink soaks away from the middle: a ragged hole that widens, with a soft wet rim
    if (t > T_OPEN) { const q = easeIO((t - T_OPEN) / (D - T_OPEN)), r = q * diag * .62; c.globalCompositeOperation = "destination-out"; c.fillStyle = "#000";
      c.globalAlpha = .45; blob(w / 2, h / 2, r * 1.12 + 6, 48, 1.7, .22); c.fill();
      c.globalAlpha = 1; blob(w / 2, h / 2, r, 48, 1.7, .22); c.fill();
      for (let i = 0; i < 9; i++) { const a = J[i + 140] * 6.28, rr = r * (.85 + J[i + 10] * .3); c.beginPath(); c.arc(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr * .8, r * .22 * J[i + 20], 0, 6.283); c.fill(); }
      c.globalCompositeOperation = "source-over"; }
    me.raf = requestAnimationFrame(frame);
  };
  wipeRun = me; me.raf = requestAnimationFrame(frame);
}
function showScreen(id) {
  if (id !== null && typeof tipT !== "undefined") { tipT = 0; $("tip").classList.remove("on"); $("tip").hidden = true; }   // a play tip never hangs over a menu
  for (const s of ["menu", "settings", "interlude", "pause", "result", "choice", "board"]) $(s).hidden = s !== id;
  const inGame = id === null;
  $("hud").hidden = !(inGame || id === "pause");
  $("pad").hidden = !inGame; if (!inGame) $("bAct").hidden = true;
}
let settingsBack = "menu";
function openSettings(back) { settingsBack = back; showScreen("settings"); refreshSettings(); }
function refreshSettings() { $("bDiff").textContent = diff().name; $("diffDesc").textContent = diff().desc; $("bCalm").textContent = settings.calm ? "켜짐" : "꺼짐"; $("keyRow").hidden = MOBILE; $("musVal").textContent = Math.round(settings.mus * 100) + "%"; $("fxVal").textContent = Math.round(settings.fx * 100) + "%"; $("tempoVal").textContent = Math.round(settings.tempo * 100) + "%"; $("bSound").textContent = settings.sound ? "켜짐" : "꺼짐"; $("offVal").textContent = (settings.offset > 0 ? "+" : "") + settings.offset + "ms"; }
function saveSettings() { store.set("settings", settings); Music.setVolume(settings.sound ? 1 : 0); Music.setOffset(settings.offset); Music.setMix(settings.mus, settings.fx); refreshSettings(); }
function buildMenu() {
  const s = store.get("run", null);
  $("bContinue").hidden = !s;
  if (s) $("bContinue").innerHTML = `<span>이어하기</span><small style="color:inherit">${stageName(s.m, s)} · 숨 ${s.breath}</small>`;
  $("bTower").hidden = false; $("towerInfo").textContent = `무한 · 최고 ${META.towerBest}층` + (META.books.length ? ` · 비급첩 ${META.books.length}권` : "");
}
function toMenu() {
  document.body.classList.remove("night"); Music.stop(); buildMenu(); nameProgress();
  if (hubOn && LV && LV.hub) { resumeHub(); return; }
  if (run && !run.hub && run.weapon) META.lastWeapon = run.weapon;
  P = null; enterHub();
}
function pauseGame() {
  if (state !== "play") return;
  if (hubOn) { state = "menu"; for (const k in held) held[k] = 0; $("bAct").hidden = true; openSettings("hub"); return; }
  state = "pause"; tipT = 0; $("tip").classList.remove("on"); $("tip").hidden = true; for (const k in held) held[k] = 0; Music.pause(); Music.muffle(false); if (P) P.focus = false;
  $("pTitle").textContent = mode === "tutorial" ? "수련터" : stageName(run.m);
  const st = $("pStats"); st.innerHTML = "";
  const rows = [["시간", fmt(run.time)], ["베인 횟수", run.deaths], ["간파", run.kanpa || 0]];
  if (mode !== "tutorial") rows.splice(1, 0, ["남은 숨", run.breath]);
  for (const [k, v] of rows) { const a = document.createElement("span"), b = document.createElement("b"); a.textContent = k; b.textContent = v; st.append(a, b); }
  pauseBuild();
  $("bGiveUp").hidden = mode === "tutorial"; $("bTree").hidden = mode === "tutorial" || !run || !TREES[treeKey()]; $("bTree").textContent = `수련${run && run.sp ? ` · ${run.sp}점` : ""}`;
  showScreen("pause");
}
function pauseBuild() { // the build so far: hand and weapon, 심법, 서약, 공명, and every 비급 read in this hand's words
  const box = $("pBuild"); box.innerHTML = ""; if (mode === "tutorial" || !run) { box.hidden = true; return; } box.hidden = false;
  const line = (label, name, desc, col) => { const d = document.createElement("div"); d.className = "pb-row"; d.innerHTML = `<span class="pb-k"></span><div><b></b><small></small></div>`;
    d.querySelector(".pb-k").textContent = label; const b = d.querySelector("b"); b.textContent = name; if (col) b.style.setProperty("--sc", col), b.classList.add("bead"); d.querySelector("small").textContent = desc || ""; box.appendChild(d); };
  const ch = CHARS.find(c => c.id === (run.char || "mumyeong")), w = WEAPONS[wpn()];
  line("검객", `${ch ? ch.name : "무명"} · ${w.name}`, w.desc);
  const sm = SIMBEOP.find(m => m.id === run.simbeop); line("심법", sm ? sm.name : "없음", sm ? sm.desc : "", sm ? SCHOOLS[sm.id].col : null);
  const oa = OATHS.find(o => o.id === run.oath); line("서약", oa ? oa.name : "없음", oa ? `${oa.desc} — 대가 · ${oa.cost}` : "");
  { const T = TREES[treeKey()], mine = new Set(run.perks || []);   // the weapon's tree, branch by branch
    if (T) T.br.forEach((b, bi) => { const got = CHOSIK.filter(c => c.tree === treeKey() && c.br === bi && mine.has(c.id)).sort((a, c) => a.tier - c.tier);
      line(bi ? "" : `${T.name} 수련`, `${b.name} ${[1, 2, 3, 4, 5].map(t => got.some(c => c.tier === t) ? "●" : "○").join("")}${got.length ? " · " + got.map(c => c.name).join(" → ") : ""}`, got.length ? got[got.length - 1].desc : "아직 익히지 않았다", got.some(c => c.ougi) ? SEAL : null); }); }
  { const tk = treeKey(), ex = (run.perks || []).map(id => CHOSIK_BY[id]).filter(c => c && ((c.tree === tk && (c.tier === 0 || c.merge)) || c.combo));
    ex.forEach((c, i) => line(i ? "" : "뿌리·합류·조합", c.name + (c.ougi && run.ougiAwake ? " · 각성" : ""), c.desc)); }
  for (const k of SLOT_ORDER) { const ps = heldPerks().filter(id => kindOf(id) === k).map(id => CHOSIK.find(c => c.id === id));
    if (!ps.length) line(`${k} 0/${SLOT[k]}`, "비어 있음", ""); ps.forEach((c, i) => line(i ? "" : `${k} ${ps.length}/${SLOT[k]}`, c.name, c.desc, null)); }
}
function resumeGame() { if (state !== "pause") return; showScreen(null); Music.resume(); state = "play"; last = performance.now(); }

$("bNew").addEventListener("click", () => newRun(false));
$("bContinue").addEventListener("click", continueRun);
$("bTut").addEventListener("click", () => { Music.unlock(); loadGate(playSheets(), BASE_IMGS, startTutorial, "수련터를 그리는 중"); });
$("bTower").addEventListener("click", towerScreen);
$("bSeal").addEventListener("click", sealScreen);
$("bHermit").addEventListener("click", () => typeof hermitScreen === "function" && hermitScreen());
$("bCodex").addEventListener("click", () => typeof codexScreen === "function" && codexScreen());
$("bAct").addEventListener("click", e => { e.stopPropagation(); hubAct(); });
$("bEnter").addEventListener("click", () => loadGate(playSheets(), BASE_IMGS, enterMadang, "관문을 그리는 중"));
$("bPause").addEventListener("click", pauseGame);
$("bResume").addEventListener("click", resumeGame);
$("bTree").addEventListener("click", () => { if (state === "pause" && run && mode !== "tutorial") showChoice("pause"); });
$("bGiveUp").addEventListener("click", () => { state = "play"; endRun(false); $("rSub").textContent = stageName(run.m) + "에서 판을 내려놓았다."; });
$("bToMenu").addEventListener("click", () => { saveRun(); toMenu(); });
$("bPauseSet").addEventListener("click", () => openSettings("pause"));
$("bSettings").addEventListener("click", () => openSettings("menu"));
const liteLabel = () => { $("bLite").textContent = LITE() ? "켜짐" : "꺼짐"; $("bFps").textContent = showFps ? "켜짐" : "꺼짐"; };
liteLabel();
$("bLite").addEventListener("click", () => { liteSaved = !liteSaved; try { localStorage.setItem("chungo.lite", liteSaved ? "1" : "0"); } catch (e) {} dprCap = LITE() ? 1 : MOBILE ? 1.25 : 2; resize(); liteLabel(); });
$("bFps").addEventListener("click", () => { showFps = !showFps; localStorage.setItem("chungo.fps", showFps ? "1" : "0"); liteLabel(); });
// touch buttons: a size for all of them and a place for each, kept on this device
const padCfg = Object.assign({ s: 1.2, pos: {} }, store.get("pad3", {}));   // "pad2": the new default layout replaces any older arrangement
function applyPad() {
  document.documentElement.style.setProperty("--tbs", padCfg.s); $("padVal").textContent = Math.round(padCfg.s * 100) + "%";
  for (const id of ["bJump", "bDash", "bHook"]) { const el = $(id), p = padCfg.pos[id]; el.style.right = p ? p.r + "px" : ""; el.style.bottom = p ? p.b + "px" : ""; }
}
applyPad();
$("bPadDn").addEventListener("click", () => { padCfg.s = Math.max(.6, +(padCfg.s - .1).toFixed(1)); store.set("pad3", padCfg); applyPad(); });
$("bPadUp").addEventListener("click", () => { padCfg.s = Math.min(1.6, +(padCfg.s + .1).toFixed(1)); store.set("pad3", padCfg); applyPad(); });
$("bPadReset").addEventListener("click", () => { padCfg.s = 1.2; padCfg.pos = {}; store.set("pad3", padCfg); applyPad(); toast("버튼을 처음 자리로 돌렸다"); });
$("bPadEdit").addEventListener("click", () => { $("settings").hidden = true; $("pad").hidden = false; $("padBar").hidden = false; document.body.classList.add("padEdit"); });
$("bPadDone").addEventListener("click", () => { document.body.classList.remove("padEdit"); $("padBar").hidden = true; store.set("pad3", padCfg); for (const k in held) held[k] = 0; for (const k in press) press[k] = 0; showScreen("settings"); });
{ let drag = null;   // while editing, the pad's own handlers never see the touch: it moves the button instead
  $("pad").addEventListener("pointerdown", e => { if (!document.body.classList.contains("padEdit")) return; const b = e.target.closest(".tb"); e.stopPropagation(); e.preventDefault(); if (!b) return;
    const r = b.getBoundingClientRect(); drag = { b, id: b.id, x0: e.clientX, y0: e.clientY, r0: innerWidth - r.right + (r.width - r.width / padCfg.s) / 2, b0: innerHeight - r.bottom + (r.height - r.height / padCfg.s) / 2 };
    try { $("pad").setPointerCapture(e.pointerId); } catch (_) {} }, true);
  $("pad").addEventListener("pointermove", e => { if (!drag) return; e.stopPropagation();
    const rr = Math.max(0, Math.min(innerWidth - 40, drag.r0 - (e.clientX - drag.x0))), bb = Math.max(0, Math.min(innerHeight - 40, drag.b0 - (e.clientY - drag.y0)));
    padCfg.pos[drag.id] = { r: Math.round(rr), b: Math.round(bb) }; drag.b.style.right = rr + "px"; drag.b.style.bottom = bb + "px"; }, true);
  const end = e => { if (!drag) return; e.stopPropagation(); drag = null; store.set("pad3", padCfg); };
  $("pad").addEventListener("pointerup", end, true); $("pad").addEventListener("pointercancel", end, true); }
$("bSetClose").addEventListener("click", () => { if (settingsBack === "pause") showScreen("pause"); else if (settingsBack === "hub") resumeHub(); else toMenu(); });
$("bSoundTest").addEventListener("click", () => { Music.unlock(); if (!settings.sound) { toast("소리가 꺼져 있다 · 위에서 소리를 켜라"); return; } if (!Music.preview()) toast("판 중에는 들을 수 없다 · 지금 들리는 것이 그 소리다"); });
$("bDiff").addEventListener("click", () => { settings.diff = (settings.diff + 1) % 3; saveSettings(); });
{ // 기록 옮기기: the whole 거점 (and settings) as one line of text — copy it out, paste it in on another device
  const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))), dec = t => JSON.parse(decodeURIComponent(escape(atob(t.trim()))));
  $("bExport").addEventListener("click", async () => { const code = "CHEONGO1:" + enc({ meta: META, settings }); try { await navigator.clipboard.writeText(code); toast("기록을 복사했다 · 다른 기기에서 가져오기에 붙여 넣는다"); } catch (e) { prompt("이 글자 묶음을 복사해 두어라", code); } });
  $("bImport").addEventListener("click", () => { const t = prompt("내보낸 글자 묶음을 붙여 넣어라 (지금 기록은 덮어쓴다)"); if (!t) return;
    try { if (!t.trim().startsWith("CHEONGO1:")) throw 0; const o = dec(t.trim().slice(9)); if (!o || typeof o.meta !== "object") throw 0; store.set("meta", o.meta); if (o.settings) store.set("settings", o.settings); store.del("run"); toast("기록을 가져왔다 · 다시 연다"); setTimeout(() => location.reload(), 700); }
    catch (e) { toast("글자 묶음을 읽지 못했다"); } }); }
$("bCalm").addEventListener("click", () => { settings.calm = !settings.calm; saveSettings(); });
$("bKeys").addEventListener("click", () => keyScreen());
$("bSound").addEventListener("click", () => { settings.sound = !settings.sound; saveSettings(); });
{ const st = (k, d, lo, hi) => () => { settings[k] = Math.round(Math.max(lo, Math.min(hi, settings[k] + d)) * 100) / 100; saveSettings(); Music.sfx("hook"); };
  $("bMusDn").addEventListener("click", st("mus", -.1, 0, 1)); $("bMusUp").addEventListener("click", st("mus", .1, 0, 1)); $("bFxDn").addEventListener("click", st("fx", -.1, 0, 1)); $("bFxUp").addEventListener("click", st("fx", .1, 0, 1));
  $("bTempoDn").addEventListener("click", st("tempo", -.1, .7, 1)); $("bTempoUp").addEventListener("click", st("tempo", .1, .7, 1)); }
$("bOffDn").addEventListener("click", () => { settings.offset = Math.max(-200, settings.offset - 10); saveSettings(); });
$("bOffUp").addEventListener("click", () => { settings.offset = Math.min(200, settings.offset + 10); saveSettings(); });
$("bAgain").addEventListener("click", () => newRun());
$("bHelp").addEventListener("click", () => { // the controls and the hidden rules, one board, back to the pause
  const T2 = MOBILE ? [["이동", "왼쪽 화면을 끌기"], ["베기", "오른쪽 화면을 긋거나 탭 — 그은 방향으로 벤다"], ["점프", "점프 버튼 · 벽에 붙어 누르면 벽차기"], ["대시", "짧게 = 돌진 · 길게 누르기 = 무아경(시간이 느려짐) → 떼면 일섬"], ["연", "연 버튼 — 가까운 연을 잡고 날아오른다"]]
    : [["이동", "← → (↑ ↓ 조준)"], ["베기", "J 또는 X"], ["점프", "Space · 벽에 붙어 누르면 벽차기"], ["대시", "K/C/Shift 짧게 = 돌진 · 길게 = 무아경 → 떼면 일섬"], ["연", "L"], ["멈춤", "Esc"]];
  const R2 = [["간파", "적 몸의 원이 점으로 닫히는 순간 베면 무조건 쓰러지고 기세·날·탄이 돌아온다"], ["일격", "북이 울리는 박에 맞춰 베면 붉은 일격"], ["총", "탭 = 허리 사격(가까이·한 발) · 길게 = 걸으며 조준 → 떼면 조준 사격 · 번쩍이는 적을 쏘면 탄이 가득"], ["방패", "등패수는 정면을, 북잡이는 모든 방향을 막는다 — 간파·일섬·일격으로 벤다 (총은 뚫는다)"], ["붉은 탄", "가시 테두리 탄은 되받아칠 수 없다 — 피하거나 쏘기 전에 간파"], ["숨", "맞으면 하나 잃는다 · 관문을 넘으면 셋까지 하나 돌아온다"], ["기력 (왼쪽 위 붓줄)", "무아경을 버티는 힘 · 땅을 밟으면 찬다"], ["기세 (왼쪽 위 다섯 칸)", "베고 간파할수록 오른다 · 5단이면 무아지경 · 맞으면 한 단 내려간다"], ["천고 기운 (아래 북)", "북이 다 차면 무기의 오의 한 번"], ["날 · 탄 (머리 위)", "칼은 날이 무디면 튕기고, 총은 탄이 비면 찌른다 — 쉬거나 간파하면 돌아온다"]];
  board("조작법", "멈춘 동안 읽어 둔다", [...T2, ...R2].map(([a, b]) => bdRow(a, b)), [["돌아가기", () => { state = "pause"; showScreen("pause"); }]]); });
$("bSame").addEventListener("click", () => { if (!lastKit) return newRun(); const k = lastKit; newRun(true); Object.assign(run, { char: k.char, weapon: k.weapon, simbeop: k.simbeop, oath: k.oath, perks: k.perks.slice(), picking: false }); if (k.oath === "pi") run.breath = Math.min(run.breath, 2); run.breath = Math.min(run.breath, breathCap()); saveRun(); Music.stop(); showInterlude(); });
$("bResMenu").addEventListener("click", () => showMemories(toMenu));
$("bShare").addEventListener("click", async () => {
  const text = shareText();
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(text); toast("결과를 복사했어요"); } catch (e) { toast("복사하지 못했어요"); }
});
document.addEventListener("visibilitychange", () => { if (document.hidden && !hubOn) pauseGame(); });

// install (Android/desktop Chrome); iOS gets a hint instead
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("bInstall").hidden = false; });
$("bInstall").addEventListener("click", async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $("bInstall").hidden = true; });
const standalone = matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone;


if (location.hash === "#debug" && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__dbg = { get missing() { return ALL_SHEETS.filter(n => !LAZY_SHEETS.has(n) && !SPR[n]).concat(BASE_IMGS.filter(k => !IMG[k])); }, tp(tx, ty) { P.x = tx * T + 7; P.y = (ty + 1) * T - 30; P.vx = P.vy = 0; }, get state() { return state; }, get P() { return P; }, get LV() { return LV; }, get state2() { return state; }, get SC() { return LV.scenery; }, get E() { return enemies; }, get run() { return run; }, set hs(v) { hitstop = v; }, kill(e) { killEnemy(e); }, hurt(e, s, k) { hurtEnemy(e, s, k); }, die(k, d) { die(k, d); }, banner(a, b, c) { banner(a, b === "red" ? SEAL : JJOK, c); }, chungo() { chungo(); }, clear() { madangClear(); }, hubAct() { hubAct(); }, get hub() { return { hubOn, hubNear }; }, get songPos() { return songPos; }, get FLASH() { return FLASH; }, get hold() { return bulletHold; }, get bolts() { return bolts; }, get rings() { return rings; }, get B() { return bullets; }, get beams() { return beams; }, flashing: e => isFlashing(e), wipe: k => inkWipe(k), enlighten: f => enlighten(f), syncCombos: () => syncCombos(), has: id => has(id), get FL() { flashSync(); return FLASH; } };
window.addEventListener("pointerdown", () => Music.unlock(), { once: true, capture: true });   // first tap anywhere starts the sound
resize();
toMenu();
if (!hubOn) { P = null; cam.x = 600; cam.y = 300; }
if (!META.firsts.tutDone && !META.runN) { META.firsts.tutDone = 1; saveMeta(); loadGate(playSheets(), BASE_IMGS, () => { Music.unlock(); startTutorial(); }, "수련터를 그리는 중"); }   // the very first time: straight into the 수련터, the 거점 comes after
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
bootLoad();   // boot: every picture and sound is fetched before the menu opens
})();
