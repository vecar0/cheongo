const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 870, height: 401 }, serviceWorkers: 'block', deviceScaleFactor: 2.3, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  const w = process.argv[2] || 'hwando', where = process.argv[3] || 'gate';
  await p.goto('http://localhost:8765/#debug'); await p.evaluate(w => { localStorage.clear(); localStorage.setItem('chungo.tut', '1'); localStorage.setItem('chungo.meta', JSON.stringify({ pet: { kind: 'fox', fed: 20 }, tips: { ['w_' + w]: 1, edge: 1, chungo: 1 } })); localStorage.setItem('chungo.run', JSON.stringify({ v: 2, seed: 7, dateKey: 'x', m: 3, cycle: 0, cp: -1, dead: [], breath: 5, qi: 0, time: 0, deaths: 0, kills: 0, strikes: 0, slashes: 0, perks: [], weapon: w })); }, w);
  await p.reload(); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 });
  if (where === 'gate') { await p.evaluate(() => document.getElementById('bContinue').click()); await p.waitForTimeout(300); await p.click('#bEnter'); await p.waitForFunction(() => __dbg.state === 'play', null, { timeout: 60000 }); await p.evaluate(() => { __dbg.P.invT = 999; }); }
  await p.waitForTimeout(2000); await p.keyboard.down('KeyD');
  const cdp = await ctx.newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await p.waitForTimeout(4000); const { profile } = await cdp.send('Profiler.stop');
  const self = {}; const dt = {}; const ids = {}; for (const n of profile.nodes) ids[n.id] = n;
  const counts = {}; profile.samples.forEach(s => counts[s] = (counts[s] || 0) + 1);
  for (const [id, c] of Object.entries(counts)) { const n = ids[id], k = `${n.callFrame.functionName || '(anon)'}:${n.callFrame.lineNumber + 1}`; self[k] = (self[k] || 0) + c; }
  const tot = profile.samples.length; console.log(where, 'samples', tot, 'dpr', await p.evaluate(() => [window.devicePixelRatio, document.getElementById('cv').width]));
  Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([k, v]) => console.log((v / tot * 100).toFixed(1) + '%', k));
  await b.close(); })();
