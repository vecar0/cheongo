const { open } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 } }); await p.waitForTimeout(1200);
  for (const k of ['air', 'wall']) {
    const P = await p.evaluate(() => { const P = __dbg.P; P.y -= 110; P.vy = 0; return { x: P.x, y: P.y, w: P.w, h: P.h }; });
    await p.evaluate(([k, P]) => { k === 'air' ? __dbg.kickFx('air', P.x + P.w / 2, P.y + P.h, 1) : __dbg.kickFx('wall', P.x + P.w, P.y + P.h * .7, 1); __dbg.hs = 3; }, [k, P]);
    await p.waitForTimeout(60); await p.screenshot({ path: `shots/kick_${k}.png`, clip: { x: 0, y: 40, width: 360, height: 260 } }); await p.evaluate(() => { __dbg.hs = 0; }); await p.waitForTimeout(800); }
  console.log(errs); await b.close(); })();
