const { open, RUN } = require('./lib');
(async () => {
  for (const [vp, n, mob] of [[{ width: 1000, height: 462 }, 'w', false], [{ width: 390, height: 844 }, 't', true]]) {
    const { b, p, errs } = await open({ vp, mobile: mob, run: RUN('hwando', { m: 1, seed: 7 }) });
    await p.waitForTimeout(800);
    // barrier: walk to exit without killing
    const r = await p.evaluate(() => { const L = __dbg.LV, e = L.exit; __dbg.tp(Math.floor(e.x / 32) - 2, Math.floor((e.y + e.h) / 32) - 1); return { n: L.defs.length }; });
    await p.waitForTimeout(1600); await p.screenshot({ path: `_review/shots/ui_exit_${n}.png` });
    const st1 = await p.evaluate(() => ({ st: __dbg.state, m: __dbg.run.m }));
    await p.evaluate(() => { const ids = __dbg.LV.foeIds; let k = 0; for (const e of __dbg.E) if (e.alive && ids.has(e.id) && k++ < 99) __dbg.kill(e); });
    await p.waitForTimeout(300); const cut = await p.evaluate(() => document.getElementById('hCut').textContent);
    await p.evaluate(() => { const e = __dbg.LV.exit; __dbg.tp(Math.floor(e.x / 32), Math.floor((e.y + e.h) / 32) - 1); });
    await p.waitForTimeout(1500); const st2 = await p.evaluate(() => ({ st: __dbg.state, m: __dbg.run.m, hon: __dbg.run.honBonus }));
    console.log(n, JSON.stringify({ r, st1, cut, st2 }), errs);
    await b.close(); }
})();
