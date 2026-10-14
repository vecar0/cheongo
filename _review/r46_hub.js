const { open } = require('./lib');
(async () => { for (const [vp, n, mob] of [[{ width: 1000, height: 462 }, 'w', false], [{ width: 390, height: 844 }, 't', true]]) {
  const { b, p, errs } = await open({ vp, mobile: mob, run: null });
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /거점|산중|들어/.test(b.textContent) && b.offsetParent); if (b) b.click(); });
  await p.waitForTimeout(2500); await p.evaluate(() => __dbg.tp(16, 9)); await p.waitForTimeout(1500); await p.screenshot({ path: `_review/shots/hub2_${n}.png` }); console.log(n, errs); await b.close(); } })();
