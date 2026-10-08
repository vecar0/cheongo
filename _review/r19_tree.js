// 수련 트리: 해금 전 오의 잠김, 한자 없음, 관문 등급 도장
const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ run: RUN('hwando', { sp: 6, breath: 9 }) });
  await p.evaluate(() => __dbg.clear()); await p.waitForTimeout(250); await p.screenshot({ path: 'shots/19_seal.png' }); await p.waitForTimeout(1500);
  console.log('ougi nodes', await p.evaluate(() => [...document.querySelectorAll('.tr-n.og')].map(n => n.className).join(' | ')));
  await p.click('.tr-n.og'); await p.waitForTimeout(200); console.log('ougi detail', await p.evaluate(() => document.querySelector('.tr-det').innerText.replace(/\n/g, ' / ')));
  console.log('hanja in tree', await p.evaluate(() => (document.getElementById('choice').innerText.match(/[一-鿿]+/g) || []).join(',')));
  await p.screenshot({ path: 'shots/19_tree.png' });
  const r = await p.evaluate(() => __dbg.enlighten(() => { window.__e = 1; })); await p.waitForTimeout(300); console.log('enlighten without 서고', await p.evaluate(() => [document.getElementById('toast').innerText, window.__e, __dbg.run.ougiId || '-']));
  console.log('ERR', errs); await b.close(); })();
