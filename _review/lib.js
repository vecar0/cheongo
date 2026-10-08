const { chromium } = require('/opt/node-tools/node_modules/playwright');
const RUN = (w = 'hwando', o = {}) => ({ v: 2, seed: 7, dateKey: 'x', m: 1, cycle: 0, cp: -1, dead: [], breath: 3, qi: 0, time: 0, deaths: 0, kills: 0, strikes: 0, slashes: 0, perks: [], weapon: w, char: 'mumyeong', ...o });
async function open(opts = {}) { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: opts.vp || { width: 844, height: 390 }, serviceWorkers: 'block', isMobile: !!opts.mobile, hasTouch: !!opts.mobile }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @' + ((e.stack || '').split('\n')[1] || '').trim()));
  await p.goto('http://localhost:8765/#debug'); await p.evaluate(([meta, run]) => { localStorage.clear(); localStorage.setItem('chungo.tut', '1'); localStorage.setItem('chungo.meta', JSON.stringify(meta)); if (run) localStorage.setItem('chungo.run', JSON.stringify(run)); }, [opts.meta || { firsts: { tutDone: 1 }, runN: 5, tips: { w_hwando: 1, w_jochong: 1, edge: 1, chungo: 1 } }, opts.run === undefined ? RUN(opts.w) : opts.run]);
  await p.reload(); await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 });
  if (opts.run !== null) { await p.evaluate(() => document.getElementById('bContinue').click()); await p.waitForTimeout(300); await p.click('#bEnter'); await p.waitForFunction(() => __dbg.state === 'play', null, { timeout: 60000 }); }
  return { b, ctx, p, errs }; }
const counts = p => p.evaluate(() => ({ st: __dbg.state, breath: __dbg.run && __dbg.run.breath, x: Math.round(__dbg.P ? __dbg.P.x : -1), y: Math.round(__dbg.P ? __dbg.P.y : -1), foes: __dbg.E.filter(e => e.alive).length, bullets: __dbg.B.length, beams: __dbg.beams.length, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1 }));
module.exports = { open, RUN, counts };
