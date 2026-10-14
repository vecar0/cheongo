const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('seungja', { m: 1, seed: 7 }) });
  for (const f of [null, 'seungja_f']) { const r = await p.evaluate((f) => { __dbg.run.form = f; const P = __dbg.P; P.ammo = 3; P.aimDir = { x: 1, y: 0 }; const e = __dbg.E.find(o => o.alive && o.type !== 'b'); if (e) { e.x = P.x + 120; e.y = P.y + P.h - e.h; } const hp0 = e && e.hp; try { __dbg.gunShot(false); } catch (err) { return 'ERR ' + err.message; } return { hp0, hp: e && e.hp, alive: e && e.alive }; }, f); console.log(f, r); }
  console.log(errs); await b.close(); })();
