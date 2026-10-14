const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('ssang', { m: 1, seed: 7 }) });
  const r = await p.evaluate(() => { __dbg.META.alts = __dbg.chosik.filter(c => c.alt).map(c => c.id); const res = {};
    for (const w of ["ssang","woldo","baldo","jochong","seungja","singi","cheonja"]) { const gs = [...new Set(__dbg.chosik.filter(c => c.tree === w && c.group).map(c => c.group))]; res[w] = gs.length + ":" + __dbg.chosik.filter(c => c.tree === w && c.alt).length; } return res; });
  // effects: x_killboom + x_coin + x_qikill on ssang
  const k = await p.evaluate(() => { __dbg.run.perks.push('ss_r', 'ss_a1', 'ss_a2', 'ss_a4c', 'ss_c4c'); __dbg.run.perks.push('ss_a2b');
    const al = __dbg.E.filter(e => e.alive && e.type !== 'b'); const c0 = __dbg.run.coin || 0, q0 = __dbg.run.qi || 0; __dbg.kill(al[0]); return { has: [__dbg.has('x_killboom'), __dbg.has('x_coin'), __dbg.has('x_qikill')], coin: (__dbg.run.coin || 0) - c0, qi: Math.round((__dbg.run.qi || 0) - q0) }; });
  console.log(JSON.stringify(r), JSON.stringify(k), errs); await b.close(); })();
