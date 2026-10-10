const { open, RUN } = require('./lib');
(async () => { const o = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 5 }) });
  await o.p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); __dbg.tp(Math.floor(bs.x / 32) - 7, Math.floor((bs.y + bs.h) / 32) - 1); });
  await o.p.waitForTimeout(1200);
  for (let i = 0; i < 10; i++) { await o.p.waitForTimeout(500); await o.p.screenshot({ path: `shots/bfx_${i}.png` }); }
  await o.p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); bs.hp = Math.floor(bs.maxHp / 2) + 1; __dbg.hurt(bs, true); }); await o.p.waitForTimeout(250); await o.p.screenshot({ path: 'shots/bfx_rage.png' });
  await o.p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); bs.hp = 1; __dbg.hurt(bs, true); }); await o.p.waitForTimeout(300); await o.p.screenshot({ path: 'shots/bfx_die.png' });
  console.log(o.errs, await o.p.evaluate(() => __dbg.missing)); await o.b.close(); })();
