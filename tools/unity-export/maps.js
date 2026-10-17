// 천고 → Unity: gates laid out by the web game's own generator (buildMadangMap), saved as plain rows so Unity plays the same ground.
//   node tools/unity-export/maps.js        (needs the web game served at http://localhost:8765 and Playwright)
// Writes unity/Assets/Cheongo/Resources/Data/maps.json: { maps: [{ md, arena, rows[], wind[x0,x1,...], arenas[x0,x1,y0,y1,...] }] }
// The 부스판 gates are short: three pieces between the start and the way out; 천고대 is one piece and the guardian's arena.
"use strict";
const fs = require("fs"), path = require("path");
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const OUT = path.resolve(__dirname, "../../unity/Assets/Cheongo/Resources/Data/maps.json");
const PER = 14, LEN = 3;
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ serviceWorkers: "block" })).newPage();
  await p.goto("http://localhost:8765/#debug"); await p.waitForFunction(() => window.__dbg && __dbg.genFull, null, { timeout: 90000 });
  const maps = await p.evaluate(([PER, LEN]) => {
    const out = [], clean = r => r.replace(/[oLM]/g, " ");   // 연 and 금줄 are not in the Unity game
    for (const md of [0, 1, 2, 3]) for (let i = 0; i < PER; i++) {
      const g = __dbg.genFull(1000 + md * 97 + i * 7919, md, false, LEN);
      if (g.meta.shafts && g.meta.shafts.length) continue;   // rising-ink shafts are not in the Unity game
      out.push({ md, arena: false, rows: g.rows.map(clean), wind: (g.meta.wind || []).flat(), arenas: (g.meta.arenas || []).flatMap(a => [a.x0, a.x1, a.y0, a.y1]) });
    }
    for (let i = 0; i < PER; i++) {   // 천고대: the guardian's arena, the drum where the way out would be
      const g = __dbg.genFull(5000 + i * 7919, 4, true, 1);
      out.push({ md: 4, arena: true, rows: g.rows.map(r => clean(r).replace("E", "D")), wind: [], arenas: [] });
    }
    return out; }, [PER, LEN]);
  fs.writeFileSync(OUT, JSON.stringify({ maps })); console.log("wrote", OUT, maps.length, "maps", fs.statSync(OUT).size, "bytes");
  const by = {}; for (const m of maps) by[m.md] = (by[m.md] || 0) + 1; console.log(by);
  await b.close(); })();
