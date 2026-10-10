const { open, RUN } = require('./lib');
(async () => { let o = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 5 }) });
  await o.p.evaluate(() => { const bs = __dbg.E.find(e => e.type === 'b'); __dbg.tp(Math.floor(bs.x / 32) - 8, Math.floor((bs.y + bs.h) / 32) - 1); bs.awake = true; bs.hp = Math.floor(bs.maxHp / 2) + 1; __dbg.hurt(bs, false); });
  await o.p.waitForTimeout(3000); await o.p.screenshot({ path: 'shots/b_rage2.png' }); const e1 = o.errs; await o.b.close();
  for (const w of ['jochong', 'seungja', 'singi', 'cheonja']) { o = await open({ vp: { width: 1000, height: 462 }, w });
    const r = await o.p.evaluate(() => { const run = __dbg.run; run.qi = 100; const before = __dbg.E.filter(e => e.alive).length; __dbg.chungo(); return { before, qi: run.qi }; });
    await o.p.waitForTimeout(1500); const after = await o.p.evaluate(() => __dbg.E.filter(e => e.alive).length);
    // air shot with no air dash
    const shot = await o.p.evaluate(() => { const P = __dbg.P; P.y -= 120; P.onGround = false; P.airDash = 0; P.dashCd = .5; P.ki = 0.01; P.ammo = 3; return 0; });
    await o.p.keyboard.down('KeyK'); await o.p.waitForTimeout(250); await o.p.keyboard.up('KeyK'); await o.p.waitForTimeout(100);
    const ammo = await o.p.evaluate(() => [__dbg.P.ammo, __dbg.P.heat | 0]);
    console.log(w, r, 'alive', after, 'ammo/heat after air shot', ammo, o.errs); await o.b.close(); }
  console.log(e1); })();
