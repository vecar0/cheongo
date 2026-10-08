// 처음 보는 적 소개: 고리·느려짐·안내
const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ meta: { firsts: { tutDone: 1 }, runN: 5, tips: { w_hwando: 1, edge: 1, chungo: 1 } }, run: RUN('hwando', { breath: 9, seed: 31337 }) });
  for (let i = 0; i < 12; i++) { await p.keyboard.down('ArrowRight'); await p.waitForTimeout(250); const r = await p.evaluate(() => [document.getElementById('tip').hidden ? '' : document.getElementById('tip').innerText.replace(/\n/g, ' | '), __dbg.E.filter(e => e.introUntil > __dbg.songPos).length]); if (r[0]) { await p.keyboard.up('ArrowRight'); await p.waitForTimeout(250); await p.screenshot({ path: 'shots/15_intro.png' }); console.log('intro', r); break; } }
  await p.keyboard.up('ArrowRight'); console.log('ERR', errs); await b.close(); })();
