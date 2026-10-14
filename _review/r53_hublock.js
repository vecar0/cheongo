const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 462 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/#debug');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('chungo.tut', '1'); localStorage.setItem('chungo.meta', JSON.stringify({ firsts: { tutDone: 1 }, runN: 1, hon: 50 })); });
  await p.reload(); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 });
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /거점|산중|들어/.test(b.textContent) && b.offsetParent); if (b) b.click(); }); await p.waitForTimeout(2000);
  const out = {};
  for (const [tx, ty, k] of [[18, 9, 'hall'], [28, 11, 'forge'], [36, 11, 'drum'], [9, 11, 'well']]) { await p.evaluate(([x, y]) => __dbg.tp(x, y), [tx, ty]); await p.waitForTimeout(500); await p.evaluate(() => __dbg.hubAct()); await p.waitForTimeout(400);
    out[k] = await p.evaluate(() => [...document.querySelectorAll('.bd-row, .row, #board .r')].map(r => r.textContent.slice(0, 30)).slice(0, 6)); if (k === 'hall') await p.screenshot({ path: '_review/shots/sys_hall.png' });
    await p.keyboard.press('Escape'); await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /돌아가기/.test(b.textContent) && b.offsetParent); if (b) b.click(); }); await p.waitForTimeout(300); }
  console.log(JSON.stringify(out, null, 1), errs); await b.close(); })();
