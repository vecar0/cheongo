const { open } = require('./lib');
const TS = [.06, .14, .24, .4, .55, .72, .9, 1.08];
(async () => { for (const vp of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) { const { b, p, errs } = await open({ vp, mobile: true });
  await p.waitForTimeout(1200);
  for (const t of TS) { await p.evaluate(t => { window.__wipeT = t; __dbg.wipe(); }, t); await p.waitForTimeout(120); await p.screenshot({ path: `shots/wipe_${vp.width}_${t}.png` }); }
  await p.evaluate(() => { window.__wipeT = null; __dbg.wipe(); }); await p.waitForTimeout(1500);
  console.log(vp.width, 'vis after', await p.evaluate(() => document.getElementById('wipe').style.visibility), errs); await b.close(); } })();
