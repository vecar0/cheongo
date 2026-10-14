// frame cost: run right through a gate for a few seconds with the CPU slowed 4x (a mid phone) and profile which functions take the time
const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 932, height: 430 }, mobile: true, run: RUN('hwando', { m: 2, seed: 5 }) });
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
  const ft = await p.evaluate(() => new Promise(res => { const t = []; let last = performance.now(), n = 0; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight' }));
    const f = now => { t.push(now - last); last = now; if (++n % 40 === 0) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z' })); setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyZ', key: 'z' })), 60); } if (n < 300) requestAnimationFrame(f); else res(t); }; requestAnimationFrame(f); }));
  const { profile } = await cdp.send('Profiler.stop');
  const self = {}; const dt = profile.timeDeltas; const byId = new Map(profile.nodes.map(n => [n.id, n]));
  profile.samples.forEach((id, i) => { const n = byId.get(id), k = `${n.callFrame.functionName || '(anon)'}:${n.callFrame.lineNumber + 1}`; self[k] = (self[k] || 0) + (dt[i] || 0); });
  const tot = Object.values(self).reduce((a, c) => a + c, 0);
  const top = Object.entries(self).sort((a, c) => c[1] - a[1]).slice(0, 18).map(([k, v]) => `${(v / tot * 100).toFixed(1)}% ${k}`);
  ft.sort((a, c) => a - c); console.log('median', ft[150].toFixed(1), 'p90', ft[270].toFixed(1), 'max', ft[299].toFixed(1)); console.log(top.join('\n')); console.log(errs); await b.close(); })();
