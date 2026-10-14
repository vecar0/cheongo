const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: null });
  await p.evaluate(() => { __dbg.META.codex = { gumiho: { kills: 1, marks: [] }, sumun: { kills: 2, marks: [] }, baekho: { kills: 1, marks: [] } }; __dbg.META.runN = 5; });
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /거점|산중|들어/.test(b.textContent) && b.offsetParent); if (b) b.click(); }); await p.waitForTimeout(2000);
  await p.evaluate(() => __dbg.tp(18, 9)); await p.waitForTimeout(500); await p.evaluate(() => __dbg.hubAct()); await p.waitForTimeout(400);
  await p.evaluate(() => { const r = [...document.querySelectorAll('#bdBody .bd-row')].find(r => /봉인 지도/.test(r.textContent)); r.querySelector('button').click(); }); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('.seal-pt.on').click()); await p.waitForTimeout(200);
  await p.screenshot({ path: '_review/shots/sealmap.png' });
  // target pick at run start
  await p.evaluate(() => { __dbg.run && 0; }); console.log(errs); await b.close(); })();
