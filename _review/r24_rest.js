const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { RUN } = require('./lib');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1000, height: 462 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  await p.goto('http://localhost:8765/#debug'); await p.evaluate(run => { localStorage.clear(); localStorage.setItem('chungo.tut', '1'); localStorage.setItem('chungo.meta', JSON.stringify({ firsts: { tutDone: 1 }, runN: 5 })); localStorage.setItem('chungo.run', JSON.stringify(run)); }, RUN('hwando', { node: 'rest', m: 2 }));
  await p.reload(); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 });
  await p.evaluate(() => document.getElementById('bContinue').click()); await p.waitForTimeout(300); await p.click('#bEnter'); await p.waitForFunction(() => __dbg.state === 'play');
  await p.evaluate(() => __dbg.tp(19, 10)); await p.waitForTimeout(2500); await p.screenshot({ path: 'shots/rest_hd.png' }); await b.close(); })();
