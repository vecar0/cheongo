// 오의 5단·6단: offered only on the 오의's branch, cost 4/5, and they change the 오의 (focus hits 3, spread skips the guardian, 명경 fills only on reads)
const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ vp: { width: 932, height: 430 }, run: RUN('hwando', { m: 1, seed: 7, sp: 30 }) });
  const r = await p.evaluate(() => { const D = __dbg, L = D.chosik.filter(c => c.tree === 'hwando'), pick = (br, t, f) => L.find(c => c.br === br && c.tier === t && !c.merge && !c.alt && (f == null || c.fork === f));
    const R = D.run, out = {}; R.perks = [L.find(c => c.tier === 0).id];
    for (const t of [1, 2]) R.perks.push(pick(0, t).id); R.perks.push(pick(0, 3, 0).id); const t4 = pick(0, 4); R.perks.push(t4.id); D.branchEnd(t4.id);
    out.ougi = R.ougiId; out.f0 = D.spCost(R.ougiId + '_f0'); out.aw = D.spCost(R.ougiId + '_aw'); out.awName = D.chosik.find(c => c.id === R.ougiId + '_aw').name;
    out.otherBr = D.chosik.filter(c => c.tree === 'hwando' && c.tier >= 7).length;
    return out; });
  // tree screen with the 오의 open
  await p.evaluate(() => __dbg.picks ? 0 : 0); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.evaluate(() => { const bt = document.getElementById('bTree'); if (bt && !bt.hidden) bt.click(); }); await p.waitForTimeout(500);
  await p.screenshot({ path: '_review/shots/tree_deep.png' });
  const offer = await p.evaluate(() => [...document.querySelectorAll('.tr-n.can span')].map(s => s.textContent));
  // learn 모음 by clicking
  await p.evaluate(() => { const n = [...document.querySelectorAll('.tr-n')].find(n => /모음/.test(n.textContent)); n.click(); }); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('.tr-det .btn.pri').click()); await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ sp: __dbg.run.sp, perks: __dbg.run.perks.slice(-2), can: [...document.querySelectorAll('.tr-n.can span')].map(s => s.textContent) }));
  await p.screenshot({ path: '_review/shots/tree_deep2.png' });
  console.log(JSON.stringify(r), offer, JSON.stringify(after), errs); await b.close(); })();
