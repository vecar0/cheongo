const { open } = require('./lib');
(async () => { const { b, p, errs } = await open({ run: null });
  const out = await p.evaluate(async () => { const r = {}; for (const k of ['jinyang','jungmori','jajinmori','hwimori','danmori']) r[k] = await Music.render(8, k, true, true);
    r.musicOnly = await Music.render(8, 'jungmori', false, true); r.sfxOnly = await Music.render(8, 'jungmori', true, false);
    r.hwiMusic = await Music.render(8, 'hwimori', false, true); return r; });
  console.log(JSON.stringify(out, null, 1)); console.log('errs', errs); await b.close(); })();
