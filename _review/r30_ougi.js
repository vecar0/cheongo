const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, meta: { firsts: { tutDone: 1 }, runN: 5, treeOpen: { all: 1 } } });
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const run = __dbg.run; run.qi = 100; const before = { open: !!run.ougiId, breath: run.breath, sp: run.sp };
    __dbg.chungo(); return before; });
  await p.waitForTimeout(100); await p.screenshot({ path: 'shots/chungo_plain.png' }); await p.waitForTimeout(1500);
  const r2 = await p.evaluate(() => { const run = __dbg.run; const fx = window.__lastFx; return { qi: run.qi }; });
  console.log('plain', r, r2, errs); await b.close(); })();
