const { open, RUN } = require('./lib');
(async () => { let o = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 5 }) }); const p = o.p;
  await p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); __dbg.tp(Math.floor(bs.x / 32) - 8, Math.floor((bs.y + bs.h) / 32) - 1); bs.awake = true; bs.hp = Math.floor(bs.maxHp / 2) + 1; __dbg.hurt(bs, false); });
  await p.waitForTimeout(3500); await p.screenshot({ path: 'shots/b_rage.png' }); console.log('rage', await p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); return [bs.raged, bs.hp]; }), o.errs); await o.b.close();
  o = await open({ vp: { width: 1000, height: 462 }, w: 'cheonja' }); 
  const r = await o.p.evaluate(() => { const P = __dbg.P; const e = { type: 'p', x: P.x, y: P.y - 60, w: 20, h: 30 }; return 0; });
  // stuck test: push a walker into rock
  const s = await o.p.evaluate(() => { const e = __dbg.E.find(e => e.alive && e.type !== 'b' && e.type !== 'd'); const L = __dbg.LV; e.y += 64; return { before: [e.x, e.y] }; });
  await o.p.waitForTimeout(300); const s2 = await o.p.evaluate(() => { const e = __dbg.E.find(e => e.alive && e.type !== 'b' && e.type !== 'd'); return [Math.round(e.x), Math.round(e.y)]; });
  console.log('unstick', s, s2, o.errs); await o.b.close(); })();
