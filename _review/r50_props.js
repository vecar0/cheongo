const { open, RUN } = require('./lib');
const tag = process.argv[2] || 'a';
(async () => { for (const [m, seed] of [[0, 7], [1, 11], [2, 5], [4, 9], [5, 3]]) {
  const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m, seed }) });
  const d = await p.evaluate(() => { const L = __dbg.LV, ds = L.dress.filter(d => /^md/.test(d.sheet)); for (const e of __dbg.E) e.alive = false; const x = ds[1] || ds[0]; return x ? [Math.floor(x.x / 32), Math.floor(x.y / 32) - 1, ds.length] : null; });
  if (d) { await p.evaluate(([x, y]) => __dbg.tp(x - 3, y), d); await p.waitForTimeout(1300); await p.screenshot({ path: `_review/shots/props_${tag}_${m}.png` }); }
  console.log(m, d, errs.length); await b.close(); } })();
