// 재평가: 세로 화면에서 막간·길 고르기·결과·거점 메뉴 화면
(async () => { const { chromium } = require('/opt/node-tools/node_modules/playwright'); const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/#debug'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('chungo.meta', JSON.stringify({ firsts: { tutDone: 1 }, runN: 5, hon: 120, tips: { w_hwando: 1, edge: 1, chungo: 1 } })); localStorage.setItem('chungo.run', JSON.stringify({ v: 2, seed: 7, dateKey: 'x', m: 1, cycle: 0, cp: -1, dead: [], breath: 1, qi: 0, time: 0, deaths: 0, kills: 0, strikes: 0, slashes: 0, perks: [], weapon: 'hwando', char: 'mumyeong', choosing: 'route' })); });
  await p.reload(); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 }); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('bContinue').click()); await p.waitForTimeout(600); await p.screenshot({ path: 'shots/13_route.png' });
  await p.locator('#cards button.card').first().click(); await p.waitForTimeout(600); await p.screenshot({ path: 'shots/13_interlude.png' });
  if (!(await p.evaluate(() => document.getElementById('interlude').hidden))) await p.click('#bEnter'); await p.waitForTimeout(1500);
  await p.evaluate(() => { __dbg.P.invT = 0; __dbg.die('hit'); }); await p.waitForTimeout(2500); await p.screenshot({ path: 'shots/13_result.png' });
  console.log('state', await p.evaluate(() => [__dbg.state, document.getElementById('rSub').innerText])); console.log('ERR', errs); await br.close(); })();
