// 방치 / 연타 / 동시 입력 / 일시정지 반복
const { open, counts, RUN } = require('./lib');
(async () => { const log = (...a) => console.log(...a);
  { const { b, p, errs } = await open(); const tl = []; for (let s = 0; s <= 60; s += 5) { const c = await counts(p); tl.push(`${s}s:${c.st}/${c.breath}`); if (c.st === 'result') break; await p.waitForTimeout(5000); }
    log('1) idle timeline', tl.join(' ')); await p.screenshot({ path: 'shots/02_idle_end.png' }); log('ERR', errs); await b.close(); }
  { const { b, p, errs } = await open({ run: RUN('hwando', { breath: 99 }) }); const keys = ['KeyJ', 'KeyK', 'Space', 'KeyL', 'KeyF', 'ArrowRight'];
    let n = 0; const tEnd = Date.now() + 10000; while (Date.now() < tEnd) { await p.keyboard.press(keys[n % keys.length]); n++; }
    log('2) spam presses', n, JSON.stringify(await counts(p)), 'fps', await p.evaluate(() => document.getElementById('hud') ? 1 : 0));
    for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyK', 'KeyJ']) await p.keyboard.down(k); await p.waitForTimeout(2000); const c3 = await counts(p);
    log('3) chord held 2s', JSON.stringify(c3), 'P.focus/vx/ki', await p.evaluate(() => [__dbg.P.focus, Math.round(__dbg.P.vx), +__dbg.P.ki.toFixed(2)]));
    for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyK', 'KeyJ']) await p.keyboard.up(k); await p.waitForTimeout(500); log('   after release', await p.evaluate(() => [__dbg.P.focus, Math.round(__dbg.P.vx)]));
    const pt = []; for (let i = 0; i < 15; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(120); const a = await p.evaluate(() => [__dbg.state, __dbg.run.time, __dbg.songPos]); await p.waitForTimeout(400); const b2 = await p.evaluate(() => [__dbg.run.time, __dbg.songPos]); pt.push(`${a[0]}:${(b2[0] - a[1]).toFixed(2)}/${(b2[1] - a[2]).toFixed(2)}`); await p.keyboard.press('Escape'); await p.waitForTimeout(150); }
    log('4) pause x15 (state:runTimeDrift/songDrift while paused)', pt.join(' '), 'final', await p.evaluate(() => __dbg.state));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/02_pause.png' }); await p.keyboard.press('Escape');
    log('ERR', errs); await b.close(); } })();
