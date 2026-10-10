const { open } = require('./lib');
(async () => { const o = await open({ vp: { width: 1000, height: 462 } });
  const s = await o.p.evaluate(() => { const e = __dbg.E.find(e => e.alive && e.type === 'p') || __dbg.E.find(e => e.alive && e.type !== 'b' && e.type !== 'd'); const L = __dbg.LV; const tx = Math.floor(e.x / 32);
    let ty = 0; while (ty < L.h && L.grid[ty * L.w + tx] !== 1) ty++; e.y = (ty + 1) * 32 + 4; return { type: e.type, sunk: [Math.round(e.x), e.y], groundRow: ty }; });
  await o.p.waitForTimeout(200);
  const s2 = await o.p.evaluate(() => { const e = __dbg.E.find(e => e.alive && e.type === 'p') || __dbg.E.find(e => e.alive && e.type !== 'b' && e.type !== 'd'); return [Math.round(e.x), Math.round(e.y), Math.round(e.y + e.h)]; });
  console.log(s, s2, o.errs); await o.b.close(); })();
