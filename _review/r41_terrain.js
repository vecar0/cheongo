const { open, RUN } = require('./lib');
(async () => {
  const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 1, seed: 7 }) });
  // seed scan: features per 마당
  const scan = await p.evaluate(() => { const out = {}; for (let m = 0; m < 5; m++) { const f = { fog: 0, wind: 0, arena: 0, shaft: 0, crack: 0, chest: 0, maxH: 0, n: 0 };
    for (let s = 1; s <= 60; s++) { const g = __dbg.gen(s * 131, m); const mt = g.meta; f.n++; f.fog += mt.fog.length > 0; f.wind += mt.wind.length > 0; f.arena += mt.arenas.length > 0; f.shaft += mt.shafts.length > 0; f.crack += g.join('').includes('%'); f.chest += g.join('').includes('$'); f.maxH = Math.max(f.maxH, g.length); }
    out[m] = f; } return out; });
  console.log(JSON.stringify(scan));
  const find = async (m, pred) => p.evaluate(([m, pred]) => { for (let s = 1; s < 400; s++) { const g = __dbg.gen(s * 131, m); if (new Function('g', 'return ' + pred)(g)) return s * 131; } return -1; }, [m, pred]);
  const R = {};
  // giwa crumbles a beat after standing on it
  { const sd = await find(4, "g.join('').includes('x')"); await p.evaluate(([sd]) => __dbg.loadGen(sd, 4), [sd]);
    const pos = await p.evaluate(() => { const L = __dbg.LV, i = L.grid.findIndex(v => v === 6); return [i % L.w, Math.floor(i / L.w)]; });
    await p.evaluate(([x, y]) => { __dbg.tp(x, y - 1); __dbg.P.vy = 0; }, pos); await p.waitForTimeout(150);
    const a = await p.evaluate(([x, y]) => ({ t: __dbg.tileAt(x, y), crumb: __dbg.LV.crumb.size, ground: __dbg.P.onGround }), pos);
    await p.waitForTimeout(2200); const c = await p.evaluate(([x, y]) => ({ t: __dbg.tileAt(x, y), py: Math.round(__dbg.P.y), ty: y * 32 }), pos); R.giwa = { a, c }; }
  // planks toggle
  { const sd = await find(2, "g.join('').includes('1')"); await p.evaluate(([sd]) => __dbg.loadGen(sd, 2), [sd]);
    const st = []; for (let i = 0; i < 8; i++) { st.push(await p.evaluate(() => { const L = __dbg.LV, i = L.grid.findIndex(v => v === 4); return __dbg.tileAt(i % L.w, Math.floor(i / L.w)); })); await p.waitForTimeout(250); } R.plank = st.join(''); }
  // wind drift
  { const sd = await find(1, "g.meta.wind.length"); await p.evaluate(([sd]) => __dbg.loadGen(sd, 1), [sd]);
    const xs = await p.evaluate(() => { const z = __dbg.LV.winds[0], tx = Math.floor((z.x0 + z.x1) / 64); let y = 1; while (__dbg.LV.grid[y * __dbg.LV.w + tx] === 0) y++; __dbg.tp(tx, y - 1); for (const e of __dbg.E) e.alive = false; return tx; });
    const x0 = await p.evaluate(() => __dbg.P.x); await p.waitForTimeout(1500); R.wind = Math.round(await p.evaluate(() => __dbg.P.x) - x0); }
  // shaft ink
  { const sd = await find(3, "g.meta.shafts.length"); await p.evaluate(([sd]) => __dbg.loadGen(sd, 3), [sd]);
    await p.evaluate(() => { const s = __dbg.LV.shafts[0]; for (const e of __dbg.E) e.alive = false; let y = s.yBot - 3; for (let x = s.x0; x <= s.x1; x++) if (__dbg.LV.grid[y * __dbg.LV.w + x] >= 3) { __dbg.tp(x, y - 1); return; } __dbg.tp(s.x0 + 1, s.yBot - 4); });
    await p.waitForTimeout(400); const i1 = await p.evaluate(() => ({ ink: __dbg.LV.shafts[0].ink && Math.round(__dbg.LV.shafts[0].ink.y), b: __dbg.run.breath }));
    await p.waitForTimeout(4000); const i2 = await p.evaluate(() => ({ ink: __dbg.LV.shafts[0].ink && Math.round(__dbg.LV.shafts[0].ink.y), b: __dbg.run.breath, feet: Math.round(__dbg.P.y + __dbg.P.h) }));
    await p.screenshot({ path: '_review/shots/map_ink.png' }); R.ink = { i1, i2 }; }
  // arena
  { const sd = await find(2, "g.meta.arenas.length"); await p.evaluate(([sd]) => __dbg.loadGen(sd, 2), [sd]);
    await p.evaluate(() => { const a = __dbg.LV.arenas[0]; __dbg.tp(a.x0 + 4, a.y1); }); await p.waitForTimeout(300);
    const a1 = await p.evaluate(() => ({ st: __dbg.LV.arenas[0].st, wall: __dbg.tileAt(__dbg.LV.arenas[0].x0, __dbg.LV.arenas[0].y1) }));
    await p.evaluate(() => { const a = __dbg.LV.arenas[0]; for (const e of __dbg.E) if (e.alive && e.x > a.x0 * 32 && e.x < (a.x1 + 1) * 32) __dbg.kill(e); }); await p.waitForTimeout(300);
    const a2 = await p.evaluate(() => ({ st: __dbg.LV.arenas[0].st, wall: __dbg.tileAt(__dbg.LV.arenas[0].x0, __dbg.LV.arenas[0].y1) })); R.arena = { a1, a2 }; }
  // crack + chest
  { const sd = await find(0, "g.join('').includes('%')"); await p.evaluate(([sd]) => __dbg.loadGen(sd, 0), [sd]);
    const c = await p.evaluate(() => { const L = __dbg.LV; const [i] = [...L.cracks][0]; const x = i % L.w, y = Math.floor(i / L.w); const side = L.grid[y * L.w + x - 1] === 0 ? -1 : 1; for (const e of __dbg.E) e.alive = false; __dbg.tp(x + side * 1, y + (L.grid[(y + 1) * L.w + x] === 1 ? 0 : 1)); return { x, y, side, n: L.cracks.size }; });
    await p.waitForTimeout(200); await p.evaluate(([side]) => __dbg.slashAt(-side, 0), [c.side]); await p.waitForTimeout(200);
    const after = await p.evaluate(() => __dbg.LV.cracks.size);
    await p.evaluate(() => { const ch = __dbg.LV.chests[0]; __dbg.tp(Math.floor(ch.x / 32), Math.floor(ch.y / 32) - 1); }); await p.waitForTimeout(300);
    R.crack = { c, after, chest: await p.evaluate(() => __dbg.LV.chests[0].open) }; await p.screenshot({ path: '_review/shots/map_chest.png' }); }
  console.log(JSON.stringify(R, null, 1)); console.log('errs', errs); await b.close();
})();
