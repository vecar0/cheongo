const { open } = require('./lib');
(async () => { for (const [tag, vp, mobile] of [['land', { width: 844, height: 390 }, true], ['port', { width: 390, height: 844 }, true], ['pc', { width: 1280, height: 720 }, false]]) {
  const { b, p, errs } = await open({ vp, mobile, run: null });
  await p.evaluate(() => { const C = {}; for (const k of ['gumiho', 'sumun', 'baekho', 'dokkaebi']) C[k] = { kills: 1, marks: [] }; __dbg.META.codex = C; __dbg.META.runN = 5; });
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /거점|산중|들어/.test(b.textContent) && b.offsetParent); if (b) b.click(); }); await p.waitForTimeout(2000);
  await p.evaluate(() => __dbg.tp(18, 9)); await p.waitForTimeout(500); await p.evaluate(() => __dbg.hubAct()); await p.waitForTimeout(400);
  await p.evaluate(() => { const r = [...document.querySelectorAll('#bdBody .bd-row')].find(r => /봉인 지도/.test(r.textContent)); r.querySelector('button').click(); }); await p.waitForTimeout(600);
  const ov = await p.evaluate(() => { const pts = [...document.querySelectorAll('.seal-pt')].map(e => e.getBoundingClientRect()), m = document.querySelector('.seal-map').getBoundingClientRect(); let o = 0;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const a = pts[i], c = pts[j]; if (a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom) o++; }
    const out = pts.filter(r => r.left < m.left - 2 || r.right > m.right + 2 || r.top < m.top - 2 || r.bottom > m.bottom + 2).length; return { o, out, mw: m.width | 0, mh: m.height | 0 }; });
  await p.screenshot({ path: `_review/shots/sealmap_${tag}.png` }); console.log(tag, ov, errs); await b.close(); } })();
