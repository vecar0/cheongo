const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 1, seed: 7 }) });
  await p.evaluate(() => { __dbg.META.forms = ['hwando_f', 'seungja_f']; __dbg.run.form = undefined; __dbg.run.picking = true; __dbg.picks(1.5); }); await p.waitForTimeout(400);
  const cards = await p.evaluate(() => [...document.querySelectorAll('#cards .card')].map(c => c.textContent.slice(0, 30)));
  await p.screenshot({ path: '_review/shots/form_pick.png' });
  await p.evaluate(() => [...document.querySelectorAll('#cards .card')][1].click()); await p.waitForTimeout(300);
  const d = await p.evaluate(() => ({ form: __dbg.run.form, cd: __dbg.wdef().cd, R: __dbg.wdef().R }));
  const sj = await p.evaluate(() => { __dbg.run.weapon = 'seungja'; __dbg.run.form = 'seungja_f'; return { mag: __dbg.wdef().mag }; });
  console.log(cards, d, sj, errs); await b.close(); })();
