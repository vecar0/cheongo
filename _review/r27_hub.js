const { open } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: null });
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /거점|산중|들어/.test(b.textContent) && b.offsetParent); if (b) b.click(); });
  await p.waitForTimeout(2500); console.log(await p.evaluate(() => [__dbg.state, !!__dbg.hub.hubOn]));
  await p.evaluate(() => __dbg.tp(6, 11)); await p.waitForTimeout(1200); await p.screenshot({ path: 'shots/hub_l.png' }); await p.evaluate(() => __dbg.tp(34, 11)); await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/hub_r.png' }); console.log(errs); await b.close(); })();
