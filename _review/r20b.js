const { open } = require('./lib');
(async () => { const { b, p, errs } = await open({});
  const r = await p.evaluate(async () => { await Music.render(3,'jungmori'); Music.sfx('slash'); Music.sfx('kill',3); return { pv: Music.preview() }; });
  await p.waitForTimeout(1500); console.log(r, await p.evaluate(() => __dbg.state), 'errs', errs); await b.close(); })();
