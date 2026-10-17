// the redrawn run (무명): frames taken while running on the flat 쉼터 ground, cropped round the hero
const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 932, height: 430 }, run: RUN('hwando', { m: 1, seed: 7, node: 'rest' }) });
  await p.evaluate(() => __dbg.tp(3, 11)); await p.waitForTimeout(300); await p.keyboard.down('ArrowRight');
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(60);
    const s = await p.evaluate(() => { const cv = document.getElementById('cv'), P = __dbg.P; return { w: cv.clientWidth, h: cv.clientHeight }; });
    await p.screenshot({ path: `_review/shots/run_${i}.png`, clip: { x: 300, y: 150, width: 360, height: 150 } }); }
  await p.keyboard.up('ArrowRight'); console.log('hero', errs); await b.close(); })();
