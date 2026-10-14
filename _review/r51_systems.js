const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { RUN } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 462 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  // an old save: 사당 2, 서고 3단 깨치기 2, 심법 하나 산 것, 모은 숨 7 — and a run holding shared 비급
  await p.goto('http://localhost:8765/#debug');
  await p.evaluate(([run]) => { localStorage.clear(); localStorage.setItem('chungo.tut', '1');
    localStorage.setItem('chungo.meta', JSON.stringify({ firsts: { tutDone: 1 }, runN: 5, hon: 100, sum: 7, bld: { seogo: 0, daejang: 0, bigeup: 0, sadang: 2, uibang: 0 }, treeOpen: { all: 2 }, simbeop: ['noe', 'hwa', 'pung'] }));
    localStorage.setItem('chungo.run', JSON.stringify(run)); }, [RUN('hwando', { m: 1, seed: 7, perks: ['d_myeong', 'd_air', 'hw_r'], simbeop: 'noe' })]);
  await p.reload(); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 });
  const meta = await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('chungo.meta')); return { hon: m.hon, sum: m.sum, mig: m.mig, back: m.migBack }; });
  console.log('meta', JSON.stringify(meta));   // expect 100 + 240 + 90+... 
  await p.evaluate(() => document.getElementById('bContinue').click()); await p.waitForTimeout(400);
  const perks = await p.evaluate(() => __dbg.run.perks);
  console.log('perks after load', perks);
  // choice screen: tree only
  await p.evaluate(() => { __dbg.run.sp = 3; }); await p.click('#bEnter').catch(() => {}); await p.waitForTimeout(1500);
  await p.evaluate(() => __dbg.clear()); await p.waitForTimeout(1500);
  const ch = await p.evaluate(() => ({ st: __dbg.state, shared: document.querySelectorAll('.tr-sh').length, nodes: document.querySelectorAll('.tr-n.can').length, sp: document.querySelector('.tr-sp') && document.querySelector('.tr-sp').textContent }));
  console.log('choice', JSON.stringify(ch)); await p.screenshot({ path: '_review/shots/sys_choice.png' });
  console.log(errs); await b.close(); })();
