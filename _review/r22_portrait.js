const { open, RUN } = require('./lib');
const tag = process.argv[2] || 'after';
(async () => { let o = await open({ vp: { width: 390, height: 844 }, mobile: true });
  await o.p.addStyleTag({ content: '#hud{padding-top:55px !important}' }); await o.p.evaluate(() => dispatchEvent(new Event('resize')));
  await o.p.waitForTimeout(2500); await o.p.screenshot({ path: `shots/p_${tag}_gate.png` }); const e1 = o.errs; await o.b.close();
  o = await open({ vp: { width: 390, height: 844 }, mobile: true, run: RUN('hwando', { node: 'rest', m: 2 }) }); await o.p.evaluate(() => __dbg.tp(14, 10)); await o.p.waitForTimeout(2000); await o.p.screenshot({ path: `shots/p_${tag}_rest.png` }); const e2 = o.errs; await o.b.close();
  o = await open({ vp: { width: 844, height: 390 }, mobile: true, run: RUN('hwando', { node: 'event', eventId: 'grave', m: 2 }) }); await o.p.evaluate(() => __dbg.tp(16, 10)); await o.p.waitForTimeout(2000); await o.p.screenshot({ path: `shots/l_${tag}_event.png` }); const e3 = o.errs; await o.b.close();
  o = await open({ vp: { width: 844, height: 390 }, mobile: true }); await o.p.waitForTimeout(2000); await o.p.screenshot({ path: `shots/l_${tag}_gate.png` }); const e4 = o.errs; await o.b.close();
  console.log('errs', e1, e2, e3, e4); })();
