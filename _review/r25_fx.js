const { open } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 } });
  await p.waitForTimeout(1500);
  const shot = async n => p.screenshot({ path: `shots/fx_${n}.png` });
  // walk to the first foe
  const near = await p.evaluate(() => { const P = __dbg.P, e = __dbg.E.filter(e => e.alive).sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x))[0]; P.x = e.x - 50; P.y = e.y + e.h - P.h; P.face = 1; return e.type; });
  await p.waitForTimeout(200);
  const kd = c => p.evaluate(c => { dispatchEvent(new KeyboardEvent('keydown', { code: c })); dispatchEvent(new KeyboardEvent('keyup', { code: c })); }, c);
  await kd('KeyJ'); await p.waitForTimeout(60); await shot('1_slash'); await p.waitForTimeout(90); await shot('2_slash_b');
  await p.evaluate(() => { const P = __dbg.P, e = __dbg.E.filter(e => e.alive).sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x))[0]; __dbg.kill(e); }); await p.waitForTimeout(80); await shot('3_kill'); await p.waitForTimeout(250); await shot('4_kill_b');
  await p.evaluate(() => { window.__forceStrike = true; const P = __dbg.P, e = __dbg.E.filter(e => e.alive).sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x))[0]; P.x = e.x - 50; P.y = e.y + e.h - P.h; });
  await kd('KeyJ'); await p.waitForTimeout(70); await shot('5_strike'); await p.waitForTimeout(200); await shot('6_strike_b'); await p.evaluate(() => { window.__forceStrike = false; });
  await kd('KeyK'); await p.waitForTimeout(80); await shot('7_dash');
  await p.evaluate(() => __dbg.die('hit', 1)); await p.waitForTimeout(100); await shot('8_hurt'); await p.waitForTimeout(400); await shot('9_hurt_b');
  console.log(near, errs); await b.close(); })();
