const { open } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, meta: { firsts: { tutDone: 1 }, runN: 5, treeOpen: { all: 1 } } });
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const c = __dbg.chosik.find(c => c.tree === 'hwando' && c.tier === 3); __dbg.branchEnd(c.id); const run = __dbg.run; run.qi = 100; const ok = __dbg.chungo(); return { id: c.id, ougiId: run.ougiId, perks: run.perks.slice(-2), ok, toast: document.getElementById('toast').textContent }; });
  await p.waitForTimeout(700); await p.screenshot({ path: 'shots/chungo_ougi.png' });
  console.log(r, errs); await b.close(); })();
