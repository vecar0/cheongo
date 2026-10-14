const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch();
  for (const [w, h, n] of [[1000, 462, 'w'], [390, 844, 't'], [1280, 720, 'pc']]) { const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500);
    await p.evaluate(() => { const el = document.getElementById('loading'); const c = el.cloneNode(true); el.replaceWith(c); c.hidden = false; c.classList.remove('out', 'done'); c.querySelector('#ldBar').style.width = '62%'; c.querySelector('#ldTip').textContent = '원이 점으로 닫히는 순간 베면 간파 — 무엇이든 한 번에 쓰러진다'; c.querySelector('#ldTxt').textContent = '먹을 가는 중 · 62%'; });
    await p.waitForTimeout(800); await p.screenshot({ path: `_review/shots/ld2_${n}_a.png` });
    await p.waitForTimeout(2200); await p.screenshot({ path: `_review/shots/ld2_${n}.png` }); console.log(n, errs); await p.close(); }
  await b.close(); process.exit(0); })();
