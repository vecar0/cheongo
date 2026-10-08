// 저장 손상, 화면 밖·벽 속 이동, 판 포기→다시 한 판 10회
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { open, RUN } = require('./lib');
(async () => {
  for (const [name, meta, run] of [['meta garbage', '{{{not json', null], ['meta wrong types', JSON.stringify({ hon: 'abc', bld: 5, mastery: null, pet: { kind: 'zzz', fed: -3 }, weapons: 'x' }), null], ['run garbage', null, '[1,2'], ['run wrong weapon', null, JSON.stringify(RUN('nope', { m: 99, breath: -2 }))]]) {
    const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, serviceWorkers: 'block' })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/#debug'); await p.evaluate(([m, r]) => { localStorage.clear(); localStorage.setItem('chungo.tut', '1'); if (m) localStorage.setItem('chungo.meta', m); if (r) localStorage.setItem('chungo.run', r); }, [meta, run]);
    await p.reload(); let ok = true; try { await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 30000 }); } catch (e) { ok = false; }
    await p.waitForTimeout(1500); let extra = '';
    if (ok && run) { try { await p.evaluate(() => document.getElementById('bContinue').click()); await p.waitForTimeout(400); const s = await p.evaluate(() => [__dbg.state, !document.getElementById('interlude').hidden]); extra = 'continue->' + s.join('/'); if (s[1]) { await p.click('#bEnter', { timeout: 3000 }); await p.waitForTimeout(800); extra += ' enter->' + await p.evaluate(() => __dbg.state); } } catch (e) { extra += ' EXC ' + e.message.split('\n')[0]; } }
    await p.screenshot({ path: `shots/06_${name.replace(/ /g, '_')}.png` }); console.log('save:', name, '| loaded', ok, '| state', await p.evaluate(() => typeof __dbg !== 'undefined' ? __dbg.state : 'no dbg'), extra, '| ERR', errs.slice(0, 3)); await b.close(); }
  { const { b, p, errs } = await open({ run: RUN('hwando', { breath: 99 }) });
    for (const [tx, ty, label] of [[-5, 5, 'left of map'], [9999, 5, 'far right'], [10, -20, 'far above'], [10, 40, 'below map']]) { await p.evaluate(([x, y]) => __dbg.tp(x, y), [tx, ty]); await p.waitForTimeout(1500); console.log('oob', label, JSON.stringify(await p.evaluate(() => ({ st: __dbg.state, x: Math.round(__dbg.P.x), y: Math.round(__dbg.P.y), breath: __dbg.run.breath, w: __dbg.LV.w * 32, h: __dbg.LV.h * 32 })))); }
    // 벽 속: 단단한 칸 찾아 넣기
    const solid = await p.evaluate(() => { const L = __dbg.LV; for (let y = 2; y < L.h - 1; y++) for (let x = 5; x < L.w - 5; x++) if (L.map && L.map[y] && L.map[y][x] === '#' && L.map[y - 1][x] === '#' && L.map[y + 1][x] === '#') return [x, y]; return null; });
    if (solid) { await p.evaluate(([x, y]) => __dbg.tp(x, y), solid); await p.waitForTimeout(400); const a = await p.evaluate(() => [Math.round(__dbg.P.x), Math.round(__dbg.P.y)]); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(800); await p.keyboard.up('ArrowRight'); await p.keyboard.press('Space'); await p.waitForTimeout(600); console.log('inside wall', solid, a, '->', await p.evaluate(() => [Math.round(__dbg.P.x), Math.round(__dbg.P.y), __dbg.state])); } else console.log('inside wall: no map grid exposed');
    console.log('ERR', errs); await b.close(); }
  { const { b, p, errs } = await open({ run: RUN('hwando') }); const times = [];
    for (let i = 0; i < 10; i++) { const t0 = Date.now(); await p.keyboard.press('Escape'); await p.waitForTimeout(250); await p.click('#bGiveUp'); await p.waitForTimeout(300);
      await p.click('#bAgain'); let n = 2; for (let k = 0; k < 10; k++) { await p.waitForTimeout(300); const s = await p.evaluate(() => [__dbg.state, !document.getElementById('choice').hidden, !document.getElementById('interlude').hidden]); if (s[0] === 'play') break; if (s[2]) { await p.click('#bEnter'); n++; continue; } if (s[1]) { await p.locator('#cards button.card, #cards .wp-go').first().click(); n++; } }
      times.push(`${((Date.now() - t0) / 1000).toFixed(1)}s/${n}clicks`); }
    console.log('giveup->again x10', times.join(' '), 'heap', await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1), 'state', await p.evaluate(() => __dbg.state)); console.log('ERR', errs); await b.close(); }
})();
