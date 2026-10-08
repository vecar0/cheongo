// 난이도·오늘의 길·기록 옮기기·한자 점검
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/#debug'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('chungo.meta', JSON.stringify({ firsts: { tutDone: 1 }, runN: 5, hon: 77, tips: { w_hwando: 1, edge: 1, chungo: 1 } })); }); await p.reload(); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 }); await p.waitForTimeout(1200);
  console.log('hub hud', await p.evaluate(() => document.getElementById('hJang').innerText.replace(/\n/g, ' ')));
  // settings: difficulty
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.click('#bDiff'); console.log('diff', await p.evaluate(() => [document.getElementById('bDiff').innerText, document.getElementById('diffDesc').innerText]));
  await p.click('#bExport'); await p.waitForTimeout(300); const code = await p.evaluate(() => navigator.clipboard.readText()); console.log('export', code.slice(0, 30), code.length);
  await p.click('#bSetClose'); await p.waitForTimeout(400);
  // daily road from the gate
  for (let i = 0; i < 20; i++) { const n = await p.evaluate(() => __dbg.hub.hubNear && __dbg.hub.hubNear.st && __dbg.hub.hubNear.st.id); if (n === 'gate') break; await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(60); await p.keyboard.up('ArrowLeft'); await p.waitForTimeout(80); }
  await p.keyboard.press('KeyF'); await p.waitForTimeout(300); await p.locator('#bdBody .bd-row button').first().click(); await p.waitForTimeout(400);
  console.log('gate rows', await p.evaluate(() => [...document.querySelectorAll('#bdBody .bd-row b')].map(x => x.innerText).join(' | ')));
  await p.locator('#bdBody .bd-row', { hasText: '오늘의 길' }).locator('button').click(); await p.waitForTimeout(500);
  for (let i = 0; i < 8; i++) { const s = await p.evaluate(() => [__dbg.state, !document.getElementById('choice').hidden, !document.getElementById('interlude').hidden]); if (s[0] === 'play' && !s[1] && !s[2]) break; if (s[2]) await p.click('#bEnter'); else if (s[1]) await p.locator('#cards button.card, #cards .wp-go').first().click(); await p.waitForTimeout(450); }
  console.log('daily run', await p.evaluate(() => [__dbg.state, __dbg.run.daily, __dbg.run.seed, __dbg.run.breath]));
  await p.evaluate(() => { __dbg.run.breath = 1; __dbg.P.invT = 0; __dbg.die('hit'); }); await p.waitForTimeout(2500);
  console.log('result', await p.evaluate(() => document.getElementById('rStats').innerText.split('\n').slice(-6).join(' | ')));
  // import back
  await p.evaluate(c => { window.prompt = () => c; }, code); await p.evaluate(() => { document.getElementById('bImport').click(); }); await p.waitForTimeout(2500); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 });
  console.log('after import hon', await p.evaluate(() => JSON.parse(localStorage.getItem('chungo.meta')).hon), 'diff', await p.evaluate(() => JSON.parse(localStorage.getItem('chungo.settings')).diff));
  console.log('ERR', errs); await b.close(); })();
