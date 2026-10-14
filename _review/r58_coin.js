const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 1, seed: 7, charm: 1 }) });
  await p.evaluate(() => { let k = 0; for (const e of __dbg.E) if (e.alive && e.type !== 'b' && k++ < 3) __dbg.kill(e); }); await p.waitForTimeout(300);
  const c1 = await p.evaluate(() => [__dbg.run.coin, document.getElementById('hCoin').textContent]);
  const ch = await p.evaluate(() => { __dbg.P.invT = 0; const b0 = __dbg.run.breath; __dbg.die(); return [b0, __dbg.run.breath, __dbg.run.charm]; });
  await p.waitForTimeout(1500); await p.screenshot({ path: '_review/shots/coin_hud.png', clip: { x: 0, y: 0, width: 1000, height: 90 } });
  console.log(c1, ch, errs); await b.close(); })();
