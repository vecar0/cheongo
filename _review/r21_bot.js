// heuristic bot: walk right, jump at walls/gaps, strike when a foe nearby is flashing (read), otherwise slash at close foes
const { open } = require('./lib');
const SKILL = process.argv[2] || 'good', DUR = +(process.argv[3] || 120);
(async () => { const { b, p, errs } = await open({});
  await p.evaluate((SKILL) => { const kd = c => window.dispatchEvent(new KeyboardEvent('keydown', { code: c })), ku = c => window.dispatchEvent(new KeyboardEvent('keyup', { code: c }));
    window.__bot = { log: [], lastX: 0, stuck: 0, t: 0 }; kd('KeyD');
    setInterval(() => { const B = __bot, P = __dbg.P; if (__dbg.state !== 'play' || !P) { const btn = [...document.querySelectorAll('button')].find(b => b.offsetParent && /계속|다음|들어|나아|이어|확인|고른|받/.test(b.textContent)); if (btn) btn.click(); return; }
      B.t++; const foes = __dbg.E.filter(e => e.alive && Math.abs(e.x - P.x) < 120 && Math.abs(e.y - P.y) < 90);
      const fl = foes.find(e => __dbg.flashing(e)); const react = SKILL === 'good' ? 1 : Math.random() < .55;
      if (fl && react) { kd('KeyJ'); ku('KeyJ'); } else if (foes.length && B.t % (SKILL === 'good' ? 6 : 4) === 0) { kd('KeyJ'); ku('KeyJ'); }
      if (Math.abs(P.x - B.lastX) < 2) B.stuck++; else B.stuck = 0; B.lastX = P.x;
      if (B.stuck > 3 || B.t % 23 === 0) { kd('Space'); setTimeout(() => ku('Space'), 180); }
      if (B.stuck > 12) { kd('KeyK'); ku('KeyK'); }
      if (B.stuck > 30) { ku('KeyD'); kd('KeyA'); setTimeout(() => { ku('KeyA'); kd('KeyD'); }, 600); B.stuck = 0; }
    }, 50); }, SKILL);
  const snaps = []; for (let s = 0; s < DUR; s += 10) { await p.waitForTimeout(10000); snaps.push(await p.evaluate(() => { const r = __dbg.run || {}; return [__dbg.state, r.m, r.cp, r.breath, r.deaths, r.kills, r.strikes, r.slashes, Math.round(r.time || 0)]; })); }
  console.log(SKILL, 'state,m,cp,breath,deaths,kills,strikes,slashes,time'); snaps.forEach(s => console.log(JSON.stringify(s)));
  const log = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('chungo.meta')).log; } catch (e) { return null; } });
  console.log('log', JSON.stringify(log)); console.log('errs', errs); await b.close(); })();
