const { open } = require('./lib');
(async () => { for (const w of ['hwando', 'seungja', 'singi']) { const o = await open({ vp: { width: 1000, height: 462 }, w });
  const r = await o.p.evaluate(() => { const P = __dbg.P, es = __dbg.E.filter(e => e.alive && e.type !== 'b').slice(0, 6); es.forEach((e, i) => { e.x = P.x + 50 + i * 26; e.y = P.y + P.h - e.h; e.hp = 1; });
    __dbg.run.qi = 100; const ok = __dbg.chungo(); return { ok, qi0: __dbg.run.qi }; });
  await o.p.waitForTimeout(3600); const after = await o.p.evaluate(() => ({ qi: Math.round(__dbg.run.qi), alive: __dbg.E.filter(e => e.alive).length }));
  console.log(w, r, after, o.errs); await o.b.close(); } })();
