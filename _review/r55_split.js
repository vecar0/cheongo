const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: RUN('hwando', { m: 1, seed: 7 }) });
  for (const withC2c of [false, true]) {
    const r = await p.evaluate((w) => { const P = __dbg.P; if (w) __dbg.run.perks.push('hw_c2c'); for (const e of __dbg.E) e.alive = false; const B = __dbg.B; B.length = 0;
      P.x = 300; P.y = 11 * 32 - 30 + 32; B.push({ x: P.x + P.w / 2 + 30, y: P.y + P.h / 2, vx: -200, vy: 0, friendly: false, life: 3, r: 5, owner: null }); __dbg.slashAt(1, 0); return 0; }, withC2c);
    const seq = []; for (let i = 0; i < 6; i++) { await p.waitForTimeout(40); seq.push(await p.evaluate(() => __dbg.B.map(b => (b.friendly ? 'F' : 'e') + (b.split ? 's' : '') + Math.round(b.life * 10)).join(' '))); }
    console.log(withC2c, seq.join(' | ')); }
  console.log(errs); await b.close(); })();
