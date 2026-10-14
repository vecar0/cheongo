const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 390, height: 844 }, mobile: true, run: RUN('hwando', { m: 4, seed: 7 }) });
  const sd = await p.evaluate(() => { for (let s = 1; s < 400; s++) if (__dbg.gen(s * 131, 3).meta.shafts.length) return s * 131; });
  await p.evaluate(([sd]) => { __dbg.loadGen(sd, 3); for (const e of __dbg.E) e.alive = false; }, [sd]);
  const s = await p.evaluate(() => __dbg.LV.shafts[0]);
  await p.evaluate(([s]) => __dbg.tp(s.x0 + 1, s.yBot - 1), [s]); await p.waitForTimeout(900); await p.screenshot({ path: '_review/shots/map_pt_bottom.png' });
  await p.evaluate(([s]) => __dbg.tp(s.x1 + 1, s.yTop - 1), [s]); await p.waitForTimeout(1500); await p.screenshot({ path: '_review/shots/map_pt_top.png' });
  console.log(errs); await b.close(); })();
