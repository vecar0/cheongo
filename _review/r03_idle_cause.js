// 방치 사망 원인 추적: 0.25초마다 숨, 가까운 적, 탄
const { open } = require('./lib');
(async () => { for (const seed of [7, 1234, 99]) { const { b, p, errs } = await open({ run: { ...require('./lib').RUN(), seed } }); const rows = [];
  for (let i = 0; i < 60; i++) { const r = await p.evaluate(() => { const P = __dbg.P, cx = P.x + P.w / 2; const near = __dbg.E.filter(e => e.alive && Math.abs(e.x - cx) < 400).map(e => e.type + ':' + Math.round(e.x - cx) + (e.fireAt != null ? '!' : '')).join(' '); const bl = __dbg.B.filter(b => !b.friendly).map(b => Math.round(b.x - cx)).join(','); return [__dbg.state, __dbg.run.breath, +__dbg.songPos.toFixed(1), near, bl]; }); rows.push(r.join(' | ')); if (r[0] !== 'play' && r[0] !== 'dead') break; await p.waitForTimeout(250); }
  console.log('seed', seed); let prev = ''; for (const r of rows) { const k = r.split(' | ').slice(0, 2).join(); if (k !== prev) console.log('  ', r); prev = k; }
  console.log('  last', rows[rows.length - 1]); await b.close(); } })();
