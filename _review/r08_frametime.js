const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 870, height: 401 }, serviceWorkers: 'block', deviceScaleFactor: 2.3, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const w = process.argv[2] || 'hwando', where = process.argv[3] || 'gate';
  await p.goto('http://localhost:8765/#debug'); await p.evaluate(w => { localStorage.clear(); localStorage.setItem('chungo.tut', '1'); localStorage.setItem('chungo.meta', JSON.stringify({ firsts: { tutDone: 1 }, runN: 5, pet: { kind: 'fox', fed: 20 }, tips: { ['w_' + w]: 1, edge: 1, chungo: 1 } })); if (location.hash) localStorage.setItem('chungo.run', JSON.stringify({ v: 2, seed: 7, dateKey: 'x', m: 3, cycle: 0, cp: -1, dead: [], breath: 5, qi: 0, time: 0, deaths: 0, kills: 0, strikes: 0, slashes: 0, perks: [], weapon: w })); }, w);
  await p.reload(); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 });
  if (where === 'gate') { await p.evaluate(() => document.getElementById('bContinue').click()); await p.waitForTimeout(300); await p.click('#bEnter'); await p.waitForFunction(() => __dbg.state === 'play', null, { timeout: 60000 }); await p.evaluate(() => { __dbg.P.invT = 999; }); }
  await p.waitForTimeout(+(process.argv[4] || 2500));
  await p.keyboard.down('KeyD');
  const r = await p.evaluate(() => new Promise(res => { const t = []; let last = performance.now(); const f = n => { t.push(n - last); last = n; if (t.length < 240) requestAnimationFrame(f); else res(t); }; requestAnimationFrame(f); }));
  r.sort((a, b) => a - b); const avg = r.reduce((a, b) => a + b) / r.length;
  console.log(where, w, 'avg', avg.toFixed(1), 'p50', r[120].toFixed(1), 'p95', r[228].toFixed(1), 'max', r[239].toFixed(1));
  await b.close(); })();
