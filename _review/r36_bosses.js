const { open, RUN } = require('./lib');
(async () => { const seen = new Set();
  for (let seed = 1; seed < 40 && seen.size < 7; seed++) { const o = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 5, seed }) });
    const k = await o.p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); return bs && bs.kind; });
    if (k && !seen.has(k)) { seen.add(k); await o.p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); __dbg.tp(Math.floor(bs.x / 32) - 6, Math.floor((bs.y + bs.h) / 32) - 1); });
      await o.p.waitForTimeout(1600); await o.p.screenshot({ path: `shots/boss_${k}.png`, clip: { x: 200, y: 40, width: 800, height: 330 } }); console.log(seed, k, o.errs); }
    await o.b.close(); } })();
