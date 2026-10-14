const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 1, seed: 7, node: 'rest', coin: 120, breath: 2 }) });
  await p.evaluate(() => __dbg.tp(28, 11)); await p.waitForTimeout(600);
  const near = await p.evaluate(() => __dbg.hub.hubNear && __dbg.hub.hubNear.st && __dbg.hub.hubNear.st.id);
  await p.evaluate(() => __dbg.hubAct()); await p.waitForTimeout(400);
  const rows = await p.evaluate(() => [...document.querySelectorAll('#bdBody .bd-row')].map(r => r.textContent.slice(0, 40)));
  await p.screenshot({ path: '_review/shots/shop.png' });
  await p.evaluate(() => { const bt = [...document.querySelectorAll('#bdBody .bd-row button')].find(b => !b.disabled); if (bt) bt.click(); }); await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ coin: __dbg.run.coin, breath: __dbg.run.breath, charm: __dbg.run.charm, tr: __dbg.run.treasure }));
  // kill coins
  await p.evaluate(() => { const bt = [...document.querySelectorAll('#bdBtns button')].find(b => /나가기/.test(b.textContent)); if (bt) bt.click(); }); await p.waitForTimeout(300);
  console.log(near, rows, after, await p.evaluate(() => __dbg.state), errs); await b.close(); })();
