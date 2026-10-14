const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 5, seed: 6 }) });
  const info = await p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); return { kind: bs.kind, x: Math.round(bs.x / 32), y: Math.round(bs.y / 32) }; });
  await p.evaluate(([x]) => { __dbg.tp(x - 10, 11); }, [info.x]); await p.waitForTimeout(3500);
  const seal = await p.evaluate(() => __dbg.LV.seal && { x0: __dbg.LV.seal.x0, x1: __dbg.LV.seal.x1 });
  await p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); bs.hp = Math.floor(bs.maxHp / 2); __dbg.P.invT = 99; });
  const acts = new Set(); let haz = 0; for (let i = 0; i < 24; i++) { await p.waitForTimeout(500); const r = await p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); __dbg.P.invT = 99; return { a: bs.act, r: bs.raged }; }); if (r.a) acts.add(r.a); if (i === 14) await p.screenshot({ path: '_review/shots/arena.png' }); }
  console.log(JSON.stringify({ info, seal, acts: [...acts] }), errs); await b.close(); })();
