const { open } = require('./lib');
(async () => { const o = await open({ vp: { width: 1000, height: 462 }, w: 'jochong' });
  const r = await o.p.evaluate(() => { const P = __dbg.P; const es = __dbg.E.filter(e => e.alive && e.type !== 'b').slice(0, 6); es.forEach((e, i) => { e.x = P.x + 60 + i * 30; e.y = P.y + P.h - e.h; e.hp = 1; }); __dbg.run.qi = 100; const ok = __dbg.chungo(); return { ok, w: __dbg.run.weapon, gun: !!window.WEAPONS, qi: __dbg.run.qi, hp: es.map(e => [e.alive, e.hp, e.type]) }; });
  console.log(JSON.stringify(r), o.errs); await o.b.close(); })();
