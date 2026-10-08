// 수정 확인: 첫 실행 수련터, 사망 원인·다음 목표·같은 채비로 다시, 조작법, 설정 볼륨
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { open, RUN } = require('./lib');
(async () => {
  { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, serviceWorkers: 'block' })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/#debug'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 }); await p.waitForTimeout(2500);
    console.log('fresh boot ->', await p.evaluate(() => [__dbg.state, __dbg.hub.hubOn, document.getElementById('hMadang').innerText])); await p.screenshot({ path: 'shots/10_fresh.png' }); console.log('ERR', errs); await b.close(); }
  { const { b, p, errs } = await open({ run: RUN('jochong', { seed: 7 }) }); await p.waitForTimeout(16000);
    console.log('result', await p.evaluate(() => [__dbg.state, document.getElementById('rSub').innerText, [...document.querySelectorAll('#rStats span')].map(x => x.innerText).join('|'), document.getElementById('rStats').innerText.split('\n').slice(-2).join(' '), !document.getElementById('bSame').hidden]));
    await p.screenshot({ path: 'shots/10_result.png' });
    await p.click('#bSame'); await p.waitForTimeout(600); console.log('same kit ->', await p.evaluate(() => [__dbg.state, !document.getElementById('interlude').hidden, __dbg.run.weapon, __dbg.run.breath]));
    await p.click('#bEnter'); await p.waitForTimeout(800); await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.click('#bHelp'); await p.waitForTimeout(300);
    console.log('help', await p.evaluate(() => [document.getElementById('bdTitle').innerText, document.querySelectorAll('#bdBody .bd-row').length])); await p.screenshot({ path: 'shots/10_help.png' });
    await p.locator('#bdBtns button').first().click(); await p.waitForTimeout(300); console.log('back ->', await p.evaluate(() => [__dbg.state, !document.getElementById('pause').hidden]));
    await p.click('#bPauseSet'); await p.waitForTimeout(300); await p.click('#bMusDn'); await p.click('#bTempoDn'); console.log('settings', await p.evaluate(() => [document.getElementById('musVal').innerText, document.getElementById('tempoVal').innerText, localStorage.getItem('chungo.settings')]));
    console.log('ERR', errs); await b.close(); } })();
