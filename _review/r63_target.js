const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 0, seed: 11 }) });
  await p.evaluate(() => { __dbg.META.codex = { gumiho: { kills: 1, marks: [] } }; __dbg.run.target = undefined; __dbg.run.picking = true; __dbg.picks(3); }); await p.waitForTimeout(400);
  const cards = await p.evaluate(() => [...document.querySelectorAll('#cards .card')].map(c => c.textContent.slice(0, 26)));
  await p.screenshot({ path: '_review/shots/target.png' });
  await p.evaluate(() => [...document.querySelectorAll('#cards .card')][0].click()); await p.waitForTimeout(400);
  const t = await p.evaluate(() => [__dbg.run.target]);
  console.log(cards, t, errs); await b.close(); })();
