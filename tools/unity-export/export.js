// 천고 → Unity: turns the web game's data and pictures into files a Unity project reads.
//   node tools/unity-export/export.js            data + the core pictures
//   node tools/unity-export/export.js --all      data + every picture
// Data goes to unity/Assets/Cheongo/Resources/Data/*.json; pictures (webp → png, Unity cannot import webp)
// to unity/Assets/Cheongo/Resources/Sprites/<name>.png with <name>.json (frame rectangles, top-left origin as on the web).
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, "../.."), OUT = path.join(ROOT, "unity/Assets/Cheongo/Resources");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

// run the plain data files in a sandbox and pick out their constants
const box = { console };
vm.createContext(box);
for (const f of ["js/tuning.js", "js/content.js", "js/data.js"]) vm.runInContext(read(f).replace(/^(const|let) /gm, "var "), box, { filename: f });
// the few tables that live inside game.js: lifted out by name, as text, and evaluated alone
const game = read("js/game.js");
const lift = name => { const i = game.indexOf(`const ${name} = `); if (i < 0) throw new Error("missing " + name);
  let j = game.indexOf("=", i) + 1, depth = 0, s = j, inStr = null;
  for (; j < game.length; j++) { const c = game[j];
    if (inStr) { if (c === "\\") j++; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === "`") inStr = c; else if ("([{".includes(c)) depth++; else if (")]}".includes(c)) depth--;
    else if (c === ";" && depth === 0) break; else if (c === "\n" && depth === 0 && game.slice(s, j).trim()) break; }
  return vm.runInContext("(" + game.slice(s, j).trim().replace(/;$/, "") + ")", box); };
const G = { T: 32, MADANG: lift("MADANG").map(m => ({ ...m, tiers: m.tiers.map(String) })),   // tiers mix numbers and "w1"-style strings: all strings for C#
  PAL: lift("PAL"), START_PIECE: lift("START_PIECE"), ARENA_PIECE: lift("ARENA_PIECE"), H3: lift("H3"), H3_AX: lift("H3_AX"), HERO_H: 58 };

const clean = v => JSON.parse(JSON.stringify(v));   // functions (rules written as code) are dropped; they are ported by hand
const write = (rel, obj) => { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(obj)); console.log("wrote", rel, fs.statSync(p).size, "bytes"); };
write("Data/tuning.json", clean(box.TUNING));
write("Data/content.json", clean({ STAGE: box.STAGE, LAIR: box.LAIR, CHOSIK: box.CHOSIK, TREES: box.TREES, TREE_EXT: box.TREE_EXT, RARITY: box.RARITY, RAR_NAME: box.RAR_NAME, COMBOS: box.COMBOS, COMBO_NEED: box.COMBO_NEED, OMENS: box.OMENS, SEASON: box.SEASON, PV: box.PV, SCHOOLS: box.SCHOOLS, SIMBEOP: box.SIMBEOP, WEAPONS: box.WEAPONS, OATHS: box.OATHS, OUGI: box.OUGI, CHARS: box.CHARS }));
write("Data/chunks.json", { chunks: box.CHUNKS.map(c => ({ tier: c.tier, wall: !!c.wall, multi: !!c.multi, map: c.map })) });
// the skill trees as plain arrays (Unity's JsonUtility reads no maps): each weapon's three branches with their later nodes appended, stats as key/value pairs
const tnode = n => ({ id: n.id, name: n.name, han: n.han || "", desc: n.desc || "", grant: n.grant || "", icon: n.icon || 0, stat: Object.entries(n.stat || {}).map(([k, v]) => ({ k, v })) });
write("Data/tree.json", { weapons: Object.entries(box.TREES).map(([key, t]) => { const ext = box.TREE_EXT[key] || {};
  return { key, name: t.name, root: ext.r ? tnode(ext.r) : null, br: t.br.map((b, i) => ({ name: b.name, han: b.han || "", nodes: b.nodes.map(tnode).concat((ext["abc"[i]] || []).map(tnode)) })) }; }) });
write("Data/game.json", clean(G));

// pictures: sheets keep their frame json (wrapped so Unity's JsonUtility can read it), images become png
const CORE = ["hero3", "herofx", "slashfx", "hud", "hudsolid", "fx", "props", "props2", "ui", "foes", "foes3", "kfx", "kring", "perkfx", "vis", "mech", "wfx"];
const IMGS = ["far", "mid", "mid2", "tex-paper", "tex-stone", "tex-giwa", "tex-granite", "tex-slab", "ui-plate", "hubground", "sealmap", "title"];
const all = process.argv.includes("--all");
const sheets = all ? fs.readdirSync(path.join(ROOT, "assets/sprites")).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)) : CORE;
const toPng = (src, dst) => execFileSync("python3", ["-I", "-c", "import sys\nfrom PIL import Image\nImage.open(sys.argv[1]).save(sys.argv[2], optimize=True)", src, dst]);
fs.mkdirSync(path.join(OUT, "Sprites"), { recursive: true });
for (const n of sheets) {
  const src = path.join(ROOT, "assets/sprites", n + ".webp"); if (!fs.existsSync(src)) continue;
  toPng(src, path.join(OUT, "Sprites", n + ".png"));
  fs.writeFileSync(path.join(OUT, "Sprites", n + ".json"), JSON.stringify({ f: JSON.parse(read(`assets/sprites/${n}.json`)) }));
  console.log("sheet", n);
}
for (const n of IMGS) { const src = path.join(ROOT, "assets", n + ".webp"); if (fs.existsSync(src)) { toPng(src, path.join(OUT, "Sprites", n + ".png")); console.log("image", n); } }
// the app's own small pictures: item icons (엽전 · 혼 · the wares) as Sprites/it-<name>.png, and the app icon for the player build
for (const f of fs.readdirSync(path.join(ROOT, "assets/it")).filter(f => f.endsWith(".webp"))) { toPng(path.join(ROOT, "assets/it", f), path.join(OUT, "Sprites", "it-" + f.replace(".webp", ".png"))); console.log("icon", f); }
{ const dir = path.join(ROOT, "unity/Assets/Cheongo/Icons"); fs.mkdirSync(dir, { recursive: true }); fs.copyFileSync(path.join(ROOT, "icons/icon-512.png"), path.join(dir, "icon-512.png")); console.log("app icon"); }

