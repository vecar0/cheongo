// 부스판: title → gate 1 → branch card → gate 2 → fork card (오의) → 천고대 → boss down → score → name → board; mouse aim; revive once
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @' + ((e.stack || '').split('\n')[1] || '').trim()));
  await p.goto('http://localhost:8765/#debug'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 90000 });
  const S = n => p.screenshot({ path: `_review/shots/booth_${n}.png` });
  const st = () => p.evaluate(() => ({ st: __dbg.state, m: __dbg.run && __dbg.run.m, br: __dbg.run && __dbg.run.breath, perks: __dbg.run && __dbg.run.perks, og: __dbg.run && __dbg.run.ougiId, scr: [...document.querySelectorAll('.scr')].filter(s => !s.hidden).map(s => s.id) }));
  console.log('title', await st(), await p.evaluate(() => getComputedStyle(document.getElementById('boothCol')).display)); await S('1title');
  await p.click('#bBoothGo'); await p.waitForTimeout(400); console.log('after start', await st());
  await p.waitForFunction(() => __dbg.state === 'play', null, { timeout: 30000 }); await p.waitForTimeout(800); console.log('gate1', await st()); await S('2gate1');
  // mouse: hold the right button with the cursor up and right of 무명 → 무아경 aims at it; the release dashes that way
  const pp = await p.evaluate(() => { const P = __dbg.P; return { x: P.x, y: P.y }; });
  await p.mouse.move(1000, 150); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(500);
  const f = await p.evaluate(() => ({ focus: __dbg.P.focus, t: __dbg.P.focusT })); await S('3aim');
  await p.mouse.up({ button: 'right' }); await p.waitForTimeout(60);
  const d = await p.evaluate(() => ({ dir: __dbg.P.dashDir, vx: __dbg.P.vx, vy: __dbg.P.vy }));
  console.log('mouse 무아경', f, 'dash dir', d.dir);
  await p.waitForTimeout(700); await p.mouse.click(300, 600); await p.waitForTimeout(30); console.log('left click slash dir', await p.evaluate(() => __dbg.P.slashDir));
  // clear gate 1 → the branch card
  await p.evaluate(() => __dbg.clear()); await p.waitForTimeout(1200); console.log('card1', await st(), await p.evaluate(() => [...document.querySelectorAll('#cards .card .nm')].map(e => e.textContent))); await S('4branch');
  await p.click('#cards .card'); await p.waitForTimeout(300); console.log('picked', await st());
  await p.waitForFunction(() => __dbg.state === 'play', null, { timeout: 30000 }); await p.waitForTimeout(500); console.log('gate2', await st());
  await p.evaluate(() => __dbg.clear()); await p.waitForTimeout(1200); console.log('card2', await st(), await p.evaluate(() => [...document.querySelectorAll('#cards .card .nm')].map(e => e.textContent))); await S('5fork');
  await p.click('#cards .card'); await p.waitForFunction(() => __dbg.state === 'play', null, { timeout: 30000 }); await p.waitForTimeout(3500);
  console.log('boss stage', await st(), await p.evaluate(() => ({ qi: __dbg.run.qi, boss: __dbg.E.filter(e => e.type === 'b').map(e => [e.kind, e.hp]) }))); await S('6boss');
  // revive: lose every breath once
  await p.evaluate(() => { __dbg.run.breath = 1; __dbg.P.invT = 0; }); await p.evaluate(() => __dbg.die()); await p.waitForTimeout(2600);
  console.log('after last breath', await st(), await p.evaluate(() => __dbg.run.revived));
  await p.waitForFunction(() => __dbg.state === 'play', null, { timeout: 30000 }); await p.waitForTimeout(3500);
  await p.evaluate(() => { for (const e of __dbg.E) if (e.type === 'b') __dbg.kill(e); }); await p.waitForTimeout(3200);
  console.log('end', await st(), await p.evaluate(() => ({ t: document.getElementById('rTitle').textContent, sub: document.getElementById('rSub').textContent, stats: document.getElementById('rStats').textContent, name: !document.getElementById('boothName').hidden }))); await S('7result');
  await p.keyboard.type('ABC'); await p.keyboard.press('Enter'); await p.waitForTimeout(400); console.log('board', await st(), await p.evaluate(() => document.getElementById('bdBody').textContent)); await S('8board');
  await p.click('#bdBtns .btn:nth-child(2)'); await p.waitForTimeout(400); console.log('back to title', await st(), await p.evaluate(() => document.getElementById('boothTop').textContent));
  console.log('errors', errs); await b.close(); })();
