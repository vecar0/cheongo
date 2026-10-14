const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 1, seed: 7 }) });
  const r = await p.evaluate(() => { const c3 = __dbg.chosik.find(c => c.tree === 'hwando' && c.tier === 3); __dbg.branchEnd(c3.id); const after3 = __dbg.run.ougiId || null;
    const c4 = __dbg.chosik.find(c => c.tree === 'hwando' && c.tier === 4); __dbg.branchEnd(c4.id); return { after3, after4: __dbg.run.ougiId, sp: __dbg.run.sp }; });
  console.log(JSON.stringify(r), errs); await b.close(); })();
