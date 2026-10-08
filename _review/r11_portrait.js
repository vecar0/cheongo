const { open, RUN } = require('./lib');
(async () => { for (const [w, h] of [[390, 844], [360, 740]]) { const { b, p, errs } = await open({ vp: { width: w, height: h }, mobile: true, run: RUN('hwando', { breath: 9 }) });
  await p.waitForTimeout(1500); await p.screenshot({ path: `shots/11_gate_${w}.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.screenshot({ path: `shots/11_pause_${w}.png` }); await p.keyboard.press('Escape');
  await p.evaluate(() => __dbg.clear()); await p.waitForTimeout(1500); await p.screenshot({ path: `shots/11_tree_${w}.png` });
  console.log(w, h, errs); await b.close(); }
  const { b, p, errs } = await open({ vp: { width: 390, height: 844 }, mobile: true, run: null }); await p.waitForTimeout(2500); await p.screenshot({ path: 'shots/11_hub_390.png' }); console.log('hub', errs); await b.close(); })();
