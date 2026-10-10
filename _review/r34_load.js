const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch();
  for (const vp of [{ width: 1000, height: 462 }, { width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/'); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 60000 }); await p.waitForTimeout(3000);
    await p.evaluate(() => { const el = document.getElementById('loading'); el.hidden = false; el.classList.remove('out'); document.getElementById('ldBar').style.width = '62%'; document.getElementById('ldTxt').textContent = '먹을 가는 중 · 62%'; document.getElementById('ldTip').textContent = '원이 점으로 닫히는 순간 베면 간파 — 무엇이든 한 번에 쓰러진다';
      for (const s of el.querySelectorAll('.ld-t span')) { s.style.animation = 'none'; void s.offsetWidth; s.style.animation = ''; } });
    await p.waitForTimeout(400); await p.screenshot({ path: `shots/load_${vp.width}_a.png` }); await p.waitForTimeout(1600); await p.screenshot({ path: `shots/load_${vp.width}_b.png` }); console.log(vp.width, errs); await ctx.close(); }
  await b.close(); })();
