// 수련터 표지: 키보드 문구와 새 표지(짧은 대시·박자 일격)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 600 }, serviceWorkers: 'block' })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/#debug'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 }); await p.waitForTimeout(1500);
  console.log('hints', await p.evaluate(() => __dbg.LV.hints.map(h => h[0] + ':' + h[2]).join(' / ')));
  for (const [tx, ty, n] of [[3, 9, 'a'], [37, 9, 'b'], [70, 6, 'c']]) { await p.evaluate(([x, y]) => __dbg.tp(x, y), [tx, ty]); await p.waitForTimeout(700); await p.screenshot({ path: `shots/14_tut_${n}.png` }); }
  console.log('ERR', errs); await b.close(); })();
