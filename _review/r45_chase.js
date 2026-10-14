const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 1, seed: 7 }) });
  // stand by the exit, invulnerable, and let the left-behind come; cut each as it arrives
  await p.evaluate(() => { const e = __dbg.LV.exit; __dbg.tp(Math.floor(e.x / 32) - 3, Math.floor((e.y + e.h) / 32) - 1); });
  for (let i = 0; i < 40; i++) { await p.evaluate(() => { __dbg.P.invT = 9; const P = __dbg.P; for (const e of __dbg.E) if (e.alive && e.type !== 'd' && Math.abs(e.x - P.x) < 400) __dbg.kill(e); }); await p.waitForTimeout(1000);
    const c = await p.evaluate(() => document.getElementById('hCut').textContent); if (i % 5 === 0) console.log(i, c); if (/열림|일소/.test(c)) { console.log('open at', i, c); break; } }
  console.log(errs); await b.close(); })();
