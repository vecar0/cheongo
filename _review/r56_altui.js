const { open } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: null });
  await p.evaluate(() => { __dbg.META.hon = 500; __dbg.META.runN = 5; }); 
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /거점|산중|들어/.test(b.textContent) && b.offsetParent); if (b) b.click(); }); await p.waitForTimeout(2000);
  await p.evaluate(() => __dbg.tp(28, 11)); await p.waitForTimeout(500); await p.evaluate(() => __dbg.hubAct()); await p.waitForTimeout(400);
  await p.evaluate(() => { const r = [...document.querySelectorAll('button')].find(b => b.offsetParent && b.closest('*') && /가기/.test(b.textContent) && /수련 후보/.test(b.parentElement.textContent)); if (r) r.click(); }); await p.waitForTimeout(500);
  await p.evaluate(() => { const r = [...document.querySelectorAll('button')].find(b => b.offsetParent && /열기/.test(b.textContent)); if (r) r.click(); }); await p.waitForTimeout(400);
  await p.screenshot({ path: '_review/shots/alt_ui.png' }); console.log(await p.evaluate(() => [__dbg.META.alts, __dbg.META.hon]), errs); await b.close(); })();
