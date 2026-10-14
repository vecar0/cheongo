const { open, RUN } = require('./lib');
const SH = '_review/shots/';
(async () => {
  for (const [m, seed] of [[0, 7], [1, 11], [2, 5], [4, 9], [5, 3], [3, 21]]) {
    const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m, seed }) });
    const info = await p.evaluate(() => { const L = __dbg.LV; const cnt = v => L.grid.filter(x => x === v).length;
      return { w: L.w, h: L.h, md: L.md, fogs: L.fogs.length, lamps: L.lamps.length, winds: L.winds.length, shafts: L.shafts.length, arenas: L.arenas.length, cracks: L.cracks.size, chests: L.chests.length, plank: cnt(4) + cnt(5), giwa: cnt(6), dress: L.dress.filter(d => /^md/.test(d.sheet)).length }; });
    console.log('m', m, JSON.stringify(info));
    // a view of each feature
    const spots = await p.evaluate(() => { const L = __dbg.LV, out = []; const ground = tx => { let y = 1; while (y < L.h && L.grid[y * L.w + tx] === 0) y++; return y - 1; };
      if (L.fogs[0]) { const tx = Math.floor((L.fogs[0].x0 + L.fogs[0].x1) / 2 / 32); out.push(['fog', tx, ground(tx)]); }
      if (L.winds[0]) { const tx = Math.floor((L.winds[0].x0 + L.winds[0].x1) / 2 / 32); out.push(['wind', tx, ground(tx)]); }
      for (const v of [4, 6]) { const i = L.grid.findIndex(x => x === v); if (i >= 0) out.push([v === 4 ? 'plank' : 'giwa', i % L.w, Math.floor(i / L.w) - 1]); }
      if (L.shafts[0]) out.push(['shaft', L.shafts[0].x0 + 2, L.shafts[0].yBot - 1]);
      if (L.arenas[0]) out.push(['arena', L.arenas[0].x0 + 4, L.arenas[0].y1]);
      if (L.chests[0]) out.push(['chest', Math.floor(L.chests[0].x / 32) - 3, Math.floor(L.chests[0].y / 32) - 1]);
      return out; });
    for (const [name, tx, ty] of spots) { await p.evaluate(([tx, ty]) => __dbg.tp(tx, ty), [tx, ty]); await p.waitForTimeout(name === 'shaft' ? 2500 : 1200); await p.screenshot({ path: `${SH}map_${m}_${name}.png` }); }
    if (errs.length) console.log('ERR', errs);
    await b.close();
  }
})();
