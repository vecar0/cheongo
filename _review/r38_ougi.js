const { open } = require('./lib');
(async () => { for (const [w, ids] of [['hwando', ['hw_a3', 'hw_b3', 'hw_c3']], ['jochong', ['jc_a3', 'jc_b3', 'jc_c3']]]) for (const id of ids) {
    const o = await open({ vp: { width: 1000, height: 462 }, w, meta: { firsts: { tutDone: 1 }, runN: 5, treeOpen: { all: 1 } } });
    const r = await o.p.evaluate(id => { const run = __dbg.run; const c = __dbg.chosik.find(c => c.id === id + 'x' || (c.tree && c.tier === 3 && c.id.startsWith(id))); __dbg.branchEnd(c.id); run.qi = 100; const P = __dbg.P; __dbg.E.filter(e => e.alive && e.type !== 'b').slice(0, 4).forEach((e, i) => { e.x = P.x + 70 + i * 40; e.y = P.y + P.h - e.h; });
      const ok = __dbg.chungo(); return { ougiId: run.ougiId, ok }; }, id);
    await o.p.waitForTimeout(450); await o.p.screenshot({ path: `shots/og_${id}.png` }); console.log(w, id, JSON.stringify(r), o.errs); await o.b.close(); } })();
