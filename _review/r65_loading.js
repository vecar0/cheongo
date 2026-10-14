const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); for (const [tag, vp] of [['land', { width: 932, height: 430 }], ['port', { width: 430, height: 932 }]]) {
  const p = await (await b.newContext({ viewport: vp, serviceWorkers: 'block', isMobile: true, hasTouch: true })).newPage();
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500); await p.evaluate(() => { const l = document.getElementById('loading'); l.hidden = false; l.style.cssText = 'display:block;opacity:1;visibility:visible'; l.className = ''; }); await p.waitForTimeout(2600); await p.screenshot({ path: `_review/shots/load_${tag}.png` }); }
  await b.close(); })();
