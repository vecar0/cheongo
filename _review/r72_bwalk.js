// each redrawn guardian walk in its arena: the guardian is woken and walks toward the swordsman; four moments each
const { open, RUN } = require('./lib');
(async () => { for (const kind of ['baekho', 'dokkaebi', 'sumun', 'haetae', 'gumiho', 'bulgasari', 'talchum']) {
  const { b, p, errs } = await open({ vp: { width: 932, height: 430 }, run: RUN('hwando', { m: 5, seed: 7 }), init: `window.__forceBoss = ${JSON.stringify(kind)}` });
  await p.evaluate(() => { const e = __dbg.E.find(e => e.type === 'b'); const P = __dbg.P; P.x = e.x - 330; P.y = e.y + e.h - P.h; e.awake = true; P.invT = 99; });
  await p.waitForTimeout(1600); await p.screenshot({ path: `_review/shots/bw_${kind}.png` });
  console.log(kind, errs); await b.close(); } })();
