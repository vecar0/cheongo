const { open } = require('./lib');
(async () => { for (const w of ['hwando', 'jochong', 'seungja', 'singi', 'cheonja']) { const o = await open({ vp: { width: 1000, height: 462 }, w });
    const before = await o.p.evaluate(() => { const P = __dbg.P; const es = __dbg.E.filter(e => e.alive && e.type !== 'b').slice(0, 6); es.forEach((e, i) => { e.x = P.x + 60 + i * 30; e.y = P.y + P.h - e.h; e.hp = 1; }); __dbg.run.qi = 100; __dbg.chungo(); return __dbg.E.filter(e => e.alive).length; });
    await o.p.waitForTimeout(250); await o.p.screenshot({ path: `shots/drum_${w}.png` }); await o.p.waitForTimeout(1500);
    const after = await o.p.evaluate(() => __dbg.E.filter(e => e.alive).length); console.log(w, 'killed', before - after, o.errs); await o.b.close(); } })();
