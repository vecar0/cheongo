const { open } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 1000, height: 462 }, run: null });
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /거점|산중|들어/.test(b.textContent) && b.offsetParent); if (b) b.click(); });
  await p.waitForTimeout(2500); await p.evaluate(() => __dbg.tp(9, 11)); await p.waitForTimeout(500);
  const kd = c => p.evaluate(c => window.dispatchEvent(new KeyboardEvent('keydown', { code: c })), c), ku = c => p.evaluate(c => window.dispatchEvent(new KeyboardEvent('keyup', { code: c })), c);
  await kd('KeyD'); const tr = []; for (let i = 0; i < 14; i++) { await p.waitForTimeout(110); tr.push(await p.evaluate(() => [Math.round(__dbg.P.x), Math.round(__dbg.P.y + __dbg.P.h), __dbg.P.onGround ? 1 : 0])); if (i === 6) await p.screenshot({ path: '_review/shots/stairs_mid.png' }); }
  await ku('KeyD'); console.log('up', JSON.stringify(tr)); await p.waitForTimeout(300);
  await p.evaluate(() => __dbg.tp(18, 9)); await p.waitForTimeout(400); await kd('KeyA'); const tr2 = []; for (let i = 0; i < 12; i++) { await p.waitForTimeout(110); tr2.push(await p.evaluate(() => [Math.round(__dbg.P.x), Math.round(__dbg.P.y + __dbg.P.h), __dbg.P.onGround ? 1 : 0])); }
  await ku('KeyA'); console.log('down', JSON.stringify(tr2)); console.log(errs); await b.close(); })();
