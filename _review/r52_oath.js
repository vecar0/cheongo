const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 1, seed: 7, oath: 'jangdan', cycle: 1 }) });
  await p.evaluate(() => __dbg.omenScreen()); await p.waitForTimeout(500);
  const cards = await p.evaluate(() => [...document.querySelectorAll('#cards .card')].map(c => c.textContent.slice(0, 40)));
  await p.screenshot({ path: '_review/shots/sys_oath.png' });
  await p.evaluate(() => document.querySelector('#cards .card').click()); await p.waitForTimeout(400);
  console.log(cards, await p.evaluate(() => [__dbg.run.oath, __dbg.run.oaths, __dbg.oathN()]), errs); await b.close(); })();
