// 재평가: 처음 켠 사람이 수련터를 마치고 첫 관문에 들어가기까지 (입력 수·시간)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, serviceWorkers: 'block', isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const t0 = Date.now();
  await p.goto('http://localhost:8765/#debug'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 }); const tLoad = Date.now() - t0;
  await p.waitForTimeout(1200); console.log('load', tLoad, 'ms ->', await p.evaluate(() => [__dbg.state, document.getElementById('hMadang').innerText, document.getElementById('tip').hidden ? '' : document.getElementById('tip').innerText.replace(/\n/g, ' | ')]));
  await p.screenshot({ path: 'shots/12_tut_start.png' });
  // 수련터 길이: 맵 너비와 표지(hint) 수
  console.log('tutorial map', await p.evaluate(() => ({ w: __dbg.LV.w, foes: __dbg.E.length, hints: (__dbg.LV.hints || []).length })));
  // 수련터 끝내기(디버그 clear) → 거점
  await p.evaluate(() => __dbg.clear()); await p.waitForTimeout(2000); console.log('after tutorial', await p.evaluate(() => [__dbg.state, __dbg.hub.hubOn, document.getElementById('toast').innerText]));
  await p.screenshot({ path: 'shots/12_hub_after.png' });
  let inputs = 0; for (let i = 0; i < 25; i++) { const n = await p.evaluate(() => __dbg.hub.hubNear && __dbg.hub.hubNear.st && __dbg.hub.hubNear.st.id); if (n === 'gate') break; await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(60); await p.keyboard.up('ArrowLeft'); await p.waitForTimeout(80); inputs++; }
  await p.keyboard.press('KeyF'); inputs++; await p.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { const s = await p.evaluate(() => [__dbg.state, !document.getElementById('choice').hidden, !document.getElementById('interlude').hidden, !document.getElementById('board').hidden, document.getElementById('chTitle').innerText]); if (s[0] === 'play' && !s[1] && !s[3] && !s[2]) break;
    if (s[2]) { await p.click('#bEnter'); inputs++; } else if (s[1]) { console.log('  pick screen:', s[4]); await p.locator('#cards button.card, #cards .wp-go').first().click(); inputs++; } else if (s[3]) { await p.locator('#bdBody .bd-row button').first().click(); inputs++; } await p.waitForTimeout(450); }
  console.log('first run: inputs after tutorial', inputs, 'state', await p.evaluate(() => [__dbg.state, __dbg.run.weapon, __dbg.run.simbeop || '-', __dbg.run.oath || '-']));
  console.log('ERR', errs); await b.close(); })();
