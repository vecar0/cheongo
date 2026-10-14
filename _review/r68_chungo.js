// 천고난무 frames for one weapon: plain (no branch end) and 오의 (branch end taken)
const { open, RUN } = require('./lib');
const w = process.argv[2] || 'woldo', open_ = process.argv[3] === 'open';
(async () => { const { b, p, errs } = await open({ vp: { width: 932, height: 430 }, mobile: true, run: RUN(w, { m: 1, seed: 7, qi: 100 }), meta: { firsts: { tutDone: 1 }, runN: 5, weapons: ['woldo', 'ssang', 'baldo'], tips: { chungo: 1, w_woldo: 1, w_hwando: 1 } } });
  await p.evaluate(o => { if (o) { const c = __dbg.chosik.find(c => c.tree && c.tier === 4 && c.tree === __dbg.run.weapon); if (c) __dbg.branchEnd(c.id); }
    const E = __dbg.E.filter(e => e.alive).sort((a, b) => a.x - b.x); const P = __dbg.P; for (const [i, e] of E.slice(0, 5).entries()) { e.x = P.x + 90 + i * 70; e.y = P.y + P.h - e.h; } __dbg.chungo(); }, open_);
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(140); await p.screenshot({ path: `_review/shots/cg_${w}_${open_ ? 'o' : 'p'}_${i}.png`, clip: { x: 150, y: 60, width: 700, height: 330 } }); }
  console.log(errs); await b.close(); })();
