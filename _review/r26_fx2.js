const { open, RUN } = require('./lib');
(async () => { let o = await open({ vp: { width: 1000, height: 462 } }); await o.p.waitForTimeout(900); await o.p.screenshot({ path: 'shots/fx2_intro.png' });
  await o.p.evaluate(() => __dbg.die('hit', 9)); await o.p.waitForTimeout(250); await o.p.screenshot({ path: 'shots/fx2_death.png' }); const e1 = o.errs; await o.b.close();
  o = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { node: 'rest', m: 2 }) }); await o.p.evaluate(() => __dbg.tp(17, 10)); await o.p.waitForTimeout(1500); await o.p.screenshot({ path: 'shots/fx2_label.png' }); const e2 = o.errs; await o.b.close();
  console.log(e1, e2); })();
