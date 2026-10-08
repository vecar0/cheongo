// 플레이 기록·성능 진단·소리 시험
const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ run: RUN('hwando', { seed: 7, breath: 9 }) });
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(3000); await p.keyboard.up('ArrowRight');
  await p.evaluate(() => __dbg.clear()); await p.waitForTimeout(1500);
  await p.locator('#choice .ch-tools .btn').last().click(); await p.waitForTimeout(700); await p.locator('#cards button.card').first().click(); await p.waitForTimeout(700);
  if (!(await p.evaluate(() => document.getElementById('interlude').hidden))) await p.click('#bEnter'); await p.waitForTimeout(1500);
  await p.evaluate(() => { __dbg.run.breath = 1; __dbg.P.invT = 0; __dbg.die('hit'); }); await p.waitForTimeout(2500);
  console.log('log', await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('chungo.meta')).log).slice(0, 300)), 'perf', await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('chungo.meta')).perf)));
  await p.click('#bResMenu'); await p.waitForTimeout(3000);
  await p.evaluate(() => __dbg.tp(36, 11)); await p.waitForTimeout(500); await p.keyboard.press('KeyF'); await p.waitForTimeout(300); await p.locator('#bdBody .bd-row', { hasText: '플레이 기록' }).locator('button').click(); await p.waitForTimeout(300);
  console.log('screen', await p.evaluate(() => [...document.querySelectorAll('#bdBody .bd-row')].map(r => r.innerText.replace(/\n/g, ' : ')).join(' || '))); await p.screenshot({ path: 'shots/18_log.png' });
  await p.locator('#bdBtns button').first().click(); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.click('#bSoundTest'); await p.waitForTimeout(600);
  console.log('ERR', errs); await b.close(); })();
