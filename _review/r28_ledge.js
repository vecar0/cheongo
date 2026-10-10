const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 3 }) });
  const r = await p.evaluate(() => { const L = __dbg.LV; let best = null; for (let y = 0; y < L.h; y++) { let x = 0; while (x < L.w) { if (L.grid[y * L.w + x] === 3) { let s = x; while (L.grid[y * L.w + x] === 3) x++; if (!best || x - s > best.n) best = { y, s, n: x - s }; } else x++; } } return best; });
  console.log(r); await p.evaluate(r => __dbg.tp(r.s + r.n - 2, r.y - 1), r); await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/ledge.png' }); console.log(errs); await b.close(); })();
