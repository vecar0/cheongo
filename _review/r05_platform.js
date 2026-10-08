// 창 크기 변경, 세로 전환, 탭 전환 복귀, 포커스 잃음
const { open, RUN } = require('./lib');
(async () => { const { b, ctx, p, errs } = await open({ run: RUN('hwando', { breath: 99 }), mobile: true });
  const sizes = [[844, 390], [390, 844], [1280, 720], [667, 375], [1024, 1366], [2560, 1080], [844, 390]];
  for (const [w, h] of sizes) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(900);
    const r = await p.evaluate(() => { const c = document.getElementById('cv'); return [c.width, c.height, __dbg.state, getComputedStyle(document.getElementById('pad')).display, !!document.querySelector('#rotate:not([hidden]), .rotate:not([hidden])')]; });
    await p.screenshot({ path: `shots/05_${w}x${h}.png` }); console.log('size', w, h, '-> canvas', r.join(' ')); }
  // 탭 전환: 다른 탭을 앞으로 → 원래 탭 복귀
  const p2 = await ctx.newPage(); await p2.goto('about:blank'); await p2.bringToFront(); await p.waitForTimeout(1500);
  const hid = await p.evaluate(() => [document.hidden, __dbg.state]); await p.bringToFront(); await p.waitForTimeout(800);
  console.log('tab switch: while hidden', hid.join(' '), '| after return', await p.evaluate(() => [document.hidden, __dbg.state, document.getElementById('pause').hidden ? 'pause hidden' : 'pause shown'].join(' ')));
  // 창 포커스만 잃음 (blur)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.evaluate(() => window.dispatchEvent(new Event('blur'))); await p.waitForTimeout(500); console.log('blur only ->', await p.evaluate(() => __dbg.state));
  console.log('ERR', errs); await b.close(); })();
