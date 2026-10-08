// 처음 켠 사람: 로딩 → 거점 → 첫 관문 플레이까지 걸리는 시간과 입력 수, 콘솔 오류
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, serviceWorkers: 'block', isMobile: true, hasTouch: true })).newPage();
  const errs = [], logs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  const t0 = Date.now(); await p.goto('http://localhost:8765/#debug'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 }); const tLoad = Date.now() - t0;
  await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/01_first.png' });
  const st = await p.evaluate(() => [__dbg.state, __dbg.hub.hubOn, document.getElementById('tip').hidden ? '' : document.getElementById('tip').innerText, [...document.querySelectorAll('.scr:not([hidden]), section:not([hidden])')].map(e => e.id).join(',')]);
  console.log('load ms', tLoad, 'state', JSON.stringify(st));
  let inputs = 0; const step = async (desc, fn) => { await fn(); inputs++; await p.waitForTimeout(500); const s = await p.evaluate(() => [__dbg.state, document.getElementById('chTitle') && document.getElementById('chTitle').innerText, document.getElementById('bdTitle').innerText, !document.getElementById('board').hidden, !document.getElementById('choice').hidden, !document.getElementById('interlude').hidden]); console.log(inputs, desc, JSON.stringify(s)); return s; };
  // walk left to the gate (산문 tx 4) — the player starts at tx 6
  for (let i = 0; i < 20; i++) { const n = await p.evaluate(() => __dbg.hub.hubNear && __dbg.hub.hubNear.st && __dbg.hub.hubNear.st.id); if (n === 'gate') break; await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(60); await p.keyboard.up('ArrowLeft'); await p.waitForTimeout(80); inputs++; }
  console.log('near', await p.evaluate(() => __dbg.hub.hubNear && __dbg.hub.hubNear.st && __dbg.hub.hubNear.st.id), 'prompt', await p.evaluate(() => document.getElementById('bAct').hidden ? '(hidden)' : document.getElementById('bAct').innerText.replace(/\n/g, ' ')));
  await step('F at gate', () => p.keyboard.press('KeyF'));
  await p.screenshot({ path: 'shots/01_gate_menu.png' });
  for (let i = 0; i < 14; i++) { const s = await p.evaluate(() => [__dbg.state, !document.getElementById('choice').hidden, !document.getElementById('interlude').hidden, !document.getElementById('board').hidden]); if (s[0] === 'play' && !s[1]) break;
    if (s[2]) { await step('들어가기', () => p.click('#bEnter')); continue; }
    if (s[1]) { await p.screenshot({ path: `shots/01_pick${i}.png` }); const btn = p.locator('#cards button.card, #cards .wp-go').first(); await step('pick card/weapon', () => btn.click()); continue; }
    if (s[3]) { await p.screenshot({ path: `shots/01_board${i}.png` }); await step('board: ' + await p.evaluate(() => document.getElementById('bdTitle').innerText), () => p.locator('#bdBody .bd-row button').first().click()); continue; } }
  const tPlay = Date.now() - t0; await p.waitForTimeout(800); await p.screenshot({ path: 'shots/01_play.png' });
  console.log('to play ms', tPlay, 'inputs', inputs, 'state', await p.evaluate(() => [__dbg.state, __dbg.run && __dbg.run.weapon, __dbg.run && __dbg.run.char]));
  console.log('tip', await p.evaluate(() => document.getElementById('tip').hidden ? '' : document.getElementById('tip').innerText.replace(/\n/g, ' | ')));
  console.log('ERR', errs, 'LOG', logs.slice(0, 10)); await b.close(); })();
