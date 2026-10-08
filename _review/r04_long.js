// 오래 플레이: 3분 동안 무작위 입력(숨 99), 30초마다 오브젝트 수·힙·프레임 시간
const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ run: RUN(process.argv[2] || 'hwando', { breath: 99, m: 2 }) });
  await p.evaluate(() => { window.__ft = []; let l = performance.now(); const f = n => { window.__ft.push(n - l); l = n; if (window.__ft.length > 600) window.__ft.shift(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const keys = ['KeyJ', 'KeyK', 'Space', 'KeyL'], dirs = ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowUp'];
  const t0 = Date.now(); let lastRep = 0, cur = null;
  while (Date.now() - t0 < 180000) {
    const st = await p.evaluate(() => __dbg.state);
    if (st === 'choice' || st === 'interlude' || st === 'result' || st === 'menu') { // keep the run going through the screens
      await p.evaluate(() => { const c = document.querySelector('#cards button.card'); const go = [...document.querySelectorAll('#cards .ch-tools .btn, #choice .btn')].find(x => /나아가기|남겨/.test(x.innerText)); if (go) go.click(); else if (c) c.click(); const e = document.getElementById('bEnter'); if (!document.getElementById('interlude').hidden) e.click(); });
      await p.waitForTimeout(400); continue; }
    if (cur) await p.keyboard.up(cur); cur = dirs[(Math.random() * dirs.length) | 0]; await p.keyboard.down(cur);
    const k = keys[(Math.random() * keys.length) | 0]; if (k === 'KeyK' && Math.random() < .5) { await p.keyboard.down('KeyK'); await p.waitForTimeout(200 + Math.random() * 300); await p.keyboard.up('KeyK'); } else await p.keyboard.press(k);
    await p.waitForTimeout(60 + Math.random() * 120);
    if (Date.now() - lastRep > 30000) { lastRep = Date.now(); const r = await p.evaluate(() => { const f = window.__ft.slice().sort((a, b) => a - b); return { t: Math.round(__dbg.run.time), st: __dbg.state, m: __dbg.run.m, kills: __dbg.run.kills, foes: __dbg.E.length, bullets: __dbg.B.length, beams: __dbg.beams.length, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1, p50: f[f.length >> 1] && f[f.length >> 1].toFixed(1), p95: f[Math.floor(f.length * .95)] && f[Math.floor(f.length * .95)].toFixed(1) }; }); console.log(JSON.stringify(r)); } }
  if (cur) await p.keyboard.up(cur);
  await p.screenshot({ path: 'shots/04_long.png' }); console.log('ERR', errs.slice(0, 5), errs.length); await b.close(); })();
