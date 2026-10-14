const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 1, seed: 7 }) });
  const G = ['hw_a2', 'hw_a4', 'hw_b2', 'hw_b4', 'hw_c2', 'hw_c4'];
  const before = await p.evaluate(G => G.map(g => __dbg.groupPick(g)), G);
  const draws = await p.evaluate(G => { __dbg.META.alts = __dbg.chosik.filter(c => c.alt).map(c => c.id); const out = [];
    for (let s = 1; s <= 6; s++) { __dbg.run.seed = s * 977; __dbg.run.gPick = {}; out.push(G.map(g => __dbg.groupPick(g)).join(',')); } return out; }, G);
  console.log('no alts open:', before.join(',')); console.log('all open, 6 runs:\n' + draws.join('\n'));
  // 분열섬: deflect one shot → three
  const split = await p.evaluate(() => { const P = __dbg.P; __dbg.run.perks.push('hw_c2c'); for (const e of __dbg.E) e.alive = false; const B = __dbg.B; B.length = 0;
    B.push({ x: P.x + P.w / 2 + 30, y: P.y + P.h / 2, vx: -300, vy: 0, friendly: false, life: 3, r: 5, owner: null }); __dbg.slashAt(1, 0); return true; });
  await p.waitForTimeout(150); const nB = await p.evaluate(() => __dbg.B.filter(b => b.friendly).length);
  // 대역
  const br0 = await p.evaluate(() => { __dbg.run.perks.push('hw_b4b'); __dbg.clones = [{ x: __dbg.P.x, y: __dbg.P.y + 30, face: 1, t: 5, ward: 0 }]; __dbg.P.invT = 0; const b0 = __dbg.run.breath; __dbg.die(); return [b0, __dbg.run.breath, __dbg.clones.length]; });
  console.log('split friendly', nB, '대역 breath', br0, errs); await b.close(); })();
