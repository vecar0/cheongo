// 한자만 있는 글자 찾기: 화면(DOM)과 캔버스 fillText에서 한글 없이 한자만 있는 문자열
const { open, RUN } = require('./lib');
(async () => { const { b, p, errs } = await open({ run: RUN('hwando', { breath: 9 }) });
  await p.evaluate(() => { window.__hz = new Set(); const C = CanvasRenderingContext2D.prototype, o = C.fillText; C.fillText = function (t, ...a) { const s = String(t); if (/[一-鿿]/.test(s) && !/[가-힣]/.test(s)) window.__hz.add('canvas:' + s); return o.call(this, t, ...a); }; });
  const dom = async tag => { const r = await p.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const s = n.textContent.trim(); if (!s || !/[一-鿿]/.test(s) || /[가-힣]/.test(s)) continue; let el = n.parentElement, vis = true; while (el) { if (el.hidden || getComputedStyle(el).display === 'none') { vis = false; break; } el = el.parentElement; } if (vis) out.push((n.parentElement.id || n.parentElement.className || n.parentElement.tagName) + ':' + s); } return out; }); return r.map(x => tag + ' ' + x); };
  const all = new Set(); const add = a => a.forEach(x => all.add(x));
  await p.waitForTimeout(800); add(await dom('[gate]'));
  await p.evaluate(() => { __dbg.run.mom = 250; }); await p.waitForTimeout(400); add(await dom('[gate-mom]'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); add(await dom('[pause]')); await p.keyboard.press('Escape');
  await p.evaluate(() => __dbg.clear()); await p.waitForTimeout(1800); add(await dom('[tree]'));
  await p.locator('#choice .ch-tools .btn').last().click(); await p.waitForTimeout(800); add(await dom('[route]'));
  await p.locator('#cards button.card').first().click(); await p.waitForTimeout(700); add(await dom('[interlude]'));
  await p.click('#bEnter').catch(() => {}); await p.waitForTimeout(1200); await p.evaluate(() => { __dbg.run.breath = 1; __dbg.P.invT = 0; __dbg.die('hit'); }); await p.waitForTimeout(2500); add(await dom('[result]'));
  await p.click('#bResMenu').catch(() => {}); await p.waitForTimeout(2500); add(await dom('[hub]'));
  const cv = await p.evaluate(() => [...window.__hz]); console.log([...all].join('\n')); console.log('--- canvas'); console.log(cv.join('\n')); console.log('ERR', errs); await b.close(); })();
