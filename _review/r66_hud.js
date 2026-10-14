const { open, RUN } = require('./lib');
(async () => { const out = [];
  for (const [tag, vp, mobile, o] of [['gate', { width: 932, height: 430 }, true, { m: 1, seed: 7, coin: 4 }], ['rest', { width: 932, height: 430 }, true, { m: 1, seed: 7, node: 'rest', coin: 60 }], ['port', { width: 430, height: 932 }, true, { m: 2, seed: 5, coin: 12 }], ['pc', { width: 1280, height: 720 }, false, { m: 3, seed: 9 }]]) {
    const { b, p, errs } = await open({ vp, mobile, run: RUN('hwando', o) });
    if (tag === 'rest') { await p.evaluate(() => __dbg.tp(15, 11)); } else await p.evaluate(() => __dbg.tp(8, 9));
    await p.waitForTimeout(1500);
    const gap = await p.evaluate(() => { const c = document.getElementById('cv').getBoundingClientRect(); return [c.width, c.height, innerWidth, innerHeight]; });
    await p.screenshot({ path: `_review/shots/hud_${tag}.png` }); out.push([tag, gap, errs]); await b.close(); }
  console.log(JSON.stringify(out)); })();
