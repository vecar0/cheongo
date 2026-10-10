const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 5 }) });
  await p.waitForTimeout(500);
  const info = await p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); if (!bs) return null; __dbg.tp(Math.floor(bs.x / 32) - 8, Math.floor((bs.y + bs.h) / 32) - 1); return { kind: bs.kind, hp: bs.hp, x: bs.x }; });
  console.log(info);
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(i ? 1500 : 300); await p.screenshot({ path: `shots/boss_${i}.png` }); }
  console.log(await p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); return bs && { act: bs.act, hp: bs.hp }; }), errs); await b.close(); })();
