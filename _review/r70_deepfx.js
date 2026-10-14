// what each 깊이기·각성 does in play: how many foes the 오의 fells, the qi it leaves, the breath 피값 takes, how 명경 fills
const { open, RUN } = require('./lib');
const w = process.argv[2] || 'hwando', BR = +(process.argv[3] || 1);
(async () => { const out = {};
  for (const mod of ['none', 'f0', 'f1', 'aw']) {
    const { b, p, errs } = await open({ vp: { width: 932, height: 430 }, run: RUN(w, { m: 3, seed: 11, breath: 4 }) });
    const r = await p.evaluate(([mod, BR]) => { const D = __dbg, R = D.run, L = D.chosik.filter(c => c.tree === R.weapon), t4 = L.find(c => c.br === BR && c.tier === 4 && !c.alt);
      R.perks = [L.find(c => c.tier === 0).id, ...[1, 2].map(t => L.find(c => c.br === BR && c.tier === t && !c.alt).id), L.find(c => c.br === BR && c.tier === 3 && c.fork === 0).id, t4.id]; D.branchEnd(t4.id);
      if (mod !== 'none') R.perks.push(R.ougiId + '_f0'); if (mod === 'f1') R.perks[R.perks.length - 1] = R.ougiId + '_f1'; if (mod === 'aw') R.perks.push(R.ougiId + '_aw');
      const P = D.P, E = D.E.filter(e => e.alive && e.type !== 'b'); for (const [i, e] of E.slice(0, 12).entries()) { e.x = P.x + 60 + i * 40; e.y = P.y + P.h - e.h; e.hp = 1; }
      const before = D.E.filter(e => e.alive).length; R.qi = 100; D.chungo();
      return new Promise(res => setTimeout(() => res({ killed: before - D.E.filter(e => e.alive).length, qi: Math.round(R.qi), breath: R.breath, awName: (D.chosik.find(c => c.id === R.ougiId + '_aw') || {}).name }), 2500)); }, [mod, BR]);
    out[mod] = r; if (errs.length) out[mod].errs = errs; await b.close(); }
  console.log(w, JSON.stringify(out)); })();
