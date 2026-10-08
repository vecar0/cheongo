const { open } = require('./lib');
(async () => { const { b, p } = await open({ vp: { width: 844, height: 390 }, mobile: true }); await p.waitForTimeout(1200);
  for (const t of [.3, .6, .75, .9, 1.0]) { await p.evaluate(t => { window.__wipeT = t; __dbg.wipe(); }, t); await p.waitForTimeout(100);
  console.log(t, await p.evaluate(() => { const c = document.getElementById('wipe'), x = c.getContext('2d'); const px = (u, v) => x.getImageData(u * c.width | 0, v * c.height | 0, 1, 1).data[3]; return [px(.5, .5), px(.6, .5), px(.75, .5), px(.9, .5), px(.1, .1), c.style.visibility]; })); }
  await b.close(); })();
