// 부스판 picture tour: walk the camera along gates of both 마당 and the four guardians' arenas, a frame every screen-width, to look for badly cut or out-of-place pictures
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = process.argv[2] || '_review/shots/tour';   // not kept in git (about 60MB a tour)
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/#debug'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 });
  const play = async () => { await p.waitForFunction(() => __dbg.state === 'play', null, { timeout: 30000 }); await p.waitForTimeout(1200); await p.evaluate(() => { for (const e of __dbg.E) e.hp = 1e9; __dbg.P.invT = 1e9; }); };
  const walk = async tag => { const w = await p.evaluate(() => __dbg.LV.w); for (let tx = 4, k = 0; tx < w - 4; tx += 22, k++) {
      await p.evaluate(tx => { const L = __dbg.LV; let ty = 2; while (ty < L.h - 1 && !__dbg.tileAt(tx, ty + 1)) ty++; __dbg.tp(tx, ty); __dbg.P.invT = 1e9; }, tx); await p.waitForTimeout(450);
      await p.screenshot({ path: `${OUT}/${tag}_${k}.png` }); } };
  for (let r = 0; r < 4; r++) {
    await p.click('#bBoothGo'); await play(); await walk(`r${r}_g1`);
    await p.evaluate(() => __dbg.clear()); await p.waitForTimeout(1200); await p.click('#cards .card'); await play(); await walk(`r${r}_g2`);
    await p.evaluate(() => __dbg.clear()); await p.waitForTimeout(1200); await p.click('#cards .card'); await play(); await p.waitForTimeout(2500);
    await p.screenshot({ path: `${OUT}/r${r}_boss.png` }); await walk(`r${r}_arena`);
    await p.evaluate(() => { __dbg.run.ended = false; }); await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.click('#bToMenu'); await p.waitForTimeout(500);
  }
  console.log('errors', errs); await b.close(); })();
