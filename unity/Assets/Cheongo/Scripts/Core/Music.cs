// 천고 장단 엔진 (the web game's js/music.js): 장구 strokes and a 가야금 line synthesised into clips once,
// then scheduled ahead on the audio clock, so the game (enemy blows, 간파 judging) shares the same beat grid.
// Patterns are simplified versions of the named 장단, tuned for play rather than strict tradition.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class Music : MonoBehaviour
    {
        // strokes: D 덩 (both), K 쿵 (북편), T 덕 (채편), G 기덕 (grace + 덕), 0 rest
        public class Def { public string name, pat; public float bpm; public int beats, sub; }
        public static readonly Dictionary<string, Def> JANGDAN = new Dictionary<string, Def>
        {
            ["jinyang"] = new Def { name = "진양조", bpm = 66, beats = 6, sub = 3, pat = "D00K00T00K0TK00T00" },
            ["jungmori"] = new Def { name = "중모리", bpm = 84, beats = 12, sub = 1, pat = "DKTKTTDKTKTT" },
            ["jajinmori"] = new Def { name = "자진모리", bpm = 96, beats = 4, sub = 3, pat = "D00T0TK0TK0T" },
            ["hwimori"] = new Def { name = "휘모리", bpm = 108, beats = 4, sub = 2, pat = "D0TTK0T0" },
            ["danmori"] = new Def { name = "단모리", bpm = 120, beats = 4, sub = 2, pat = "DTKTDGKT" }
        };
        // 계면조 on A: 라 도 레 미 솔 라' 도' 레' (Hz), and three more steps for when 기세 lifts the tune
        static readonly float[] GYE = { 220.0f, 261.6f, 293.7f, 329.6f, 392.0f, 440.0f, 523.3f, 587.3f, 659.3f, 784.0f, 880.0f };
        const int GYE_N = 8;

        static Music inst;
        public static Music I { get { if (inst == null) { var go = new GameObject("Music"); DontDestroyOnLoad(go); inst = go.AddComponent<Music>(); } return inst; } }

        const int SR = 44100;
        const float MUS = .8f * .9f * 1.6f, SFX = .9f * 1.6f;   // the web desk's bus gains; the last factor stands in for its limiter's make-up
        readonly List<AudioSource> pool = new List<AudioSource>();
        readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
        Def def; double t0, lastNow, lastDsp, lastReal; int nextIdx, melDeg, tier; bool running; uint seed = 1; float pos;
        public float Volume = 1;

        public Def Current => def;
        public float BeatLen => def != null ? 60f / def.bpm : .6f;
        public float Pos => pos;                                   // song position (seconds since the first beat)
        public float OffBeat(float p) { float b = BeatLen; return p - Mathf.Round(p / b) * b; }   // signed distance to the nearest beat
        public void SetTier(int t) { tier = Mathf.Clamp(t, 0, 5); }

        void Awake() { Build(); }

        // ---- the clock ----
        double Now()   // the audio clock moves in blocks; between blocks the frame clock carries it on
        {
            double d = AudioSettings.dspTime, r = Time.realtimeSinceStartupAsDouble;
            if (d != lastDsp) { lastDsp = d; lastReal = r; }
            return d + Math.Min(.05, r - lastReal);
        }
        double AudioAt(float sp) => t0 + sp;
        float Rng() { seed = seed * 1664525u + 1013904223u; return seed / 4294967296f; }

        public void StartSong(string key, int songSeed)
        {
            StopSong();
            def = JANGDAN.TryGetValue(key ?? "", out var d) ? d : JANGDAN["jungmori"];
            seed = (uint)songSeed; if (seed == 0) seed = 1;
            nextIdx = 0; melDeg = 0; tier = 0; running = true;
            lastNow = Now(); t0 = lastNow + .25; pos = (float)(lastNow - t0);
        }
        public void StopSong() { running = false; }

        // called once a frame by the game, before anything reads Pos
        public void Tick()
        {
            if (!running) return;
            double now = Now();
            if (now - lastNow > .25) t0 += now - lastNow - 1 / 60.0;   // the game stood still (pause, lost focus): the song waits with it
            if (now < lastNow) now = lastNow;
            lastNow = now; pos = (float)(now - t0);
            double horizon = AudioSettings.dspTime + .15; float sl = 60f / def.bpm / def.sub; int len = def.pat.Length;
            if (AudioAt(nextIdx * sl) < AudioSettings.dspTime - .1) nextIdx = Mathf.CeilToInt((float)(AudioSettings.dspTime - t0) / sl);   // never play the strokes that fell inside a pause
            while (AudioAt(nextIdx * sl) < horizon)
            {
                double t = AudioAt(nextIdx * sl); int i = nextIdx % len; char ch = def.pat[i]; float v = (i == 0 ? 1 : .8f) * .7f;   // 장구 keeps the beat the game is judged on
                if (ch == 'D') { Play("kung", t, v * MUS); Play("deok", t, v * MUS); }
                else if (ch == 'K') Play("kung", t, v * MUS);
                else if (ch == 'T') Play("deok", t, v * MUS);
                else if (ch == 'G') { Play("deok", t - .045, .45f * MUS); Play("deok", t, v * MUS); }
                if (nextIdx % def.sub == 0) MelodyBeat(t, 60f / def.bpm, nextIdx / def.sub);
                nextIdx++;
            }
        }

        // 가야금 산조 선율: made up as it goes, in 계면조, one phrase per eight beats — walking by steps, resting now and then,
        // landing on 라 at the end of a phrase; the 아쟁 holds the low 라 under each 장단 cycle. No two gates sound alike.
        int Note(int d) => Mathf.Clamp(d + Mathf.Min(3, tier), 0, GYE.Length - 1);
        void MelodyBeat(double t, float beatLen, int beatIdx)
        {
            int ph = beatIdx % 8; const float v = .055f;
            if (beatIdx % Mathf.Max(4, def.beats) == 0) Play("drone", t, MUS);
            if (ph == 0 && Rng() < .35f) { Rng(); Rng(); Play("daegeum", t, MUS); }
            if (ph == 7) { melDeg = Rng() < .6f ? 0 : 5; Play("gaya" + Note(melDeg), t, v * 1.2f * MUS); return; }   // 퇴성: the phrase settles on 라
            if (Rng() < .28f) return;   // breath between notes
            int step = new[] { -2, -1, -1, 1, 1, 2 }[(int)(Rng() * 6)]; melDeg = Mathf.Clamp(melDeg + step, 0, GYE_N - 1);
            Play("gaya" + Note(melDeg), t, v * (1 + .12f * tier) * MUS, .55f + beatLen * .9f);
            if (def.bpm >= 96 && Rng() < .35f) { int d2 = Mathf.Clamp(melDeg + (Rng() < .5f ? -1 : 1), 0, GYE_N - 1); Play("gaya" + Note(d2), t + beatLen / 2, v * .8f * MUS, beatLen * .45f + .1f); melDeg = d2; }   // faster 장단: the hand doubles up
        }

        // the 가야금 answers a read blow on the next half-beat: a bent note, or for a perfect read a long shaken one
        public void Accent(bool perfect)
        {
            if (!running || def == null) return; float sl = 60f / def.bpm / def.sub; double t = AudioAt(Mathf.Ceil((pos + .02f) / sl) * sl); int hi = Note(melDeg + 2);
            if (perfect) { Play("gaya" + hi, t, .085f * MUS, 1.0f, 1.0595f); Play("gaya" + hi, t + .14, .07f * MUS); }
            else { Play("gaya" + hi, t, .06f * MUS, .3f, 1.12f); Play("gaya" + hi, t + .09, .055f * MUS, .55f); }
        }

        public void Jing() { Play("jing", AudioSettings.dspTime + .02, SFX); }
        public void Sfx(string kind, int lv = 0)
        {
            string name = kind == "kill" ? "kill" + Mathf.Clamp(lv, 0, 5) : kind;
            if (clips.ContainsKey(name)) Play(name, 0, SFX);
        }

        void Play(string clip, double at, float vol, float cut = 0, float pitch = 1)
        {
            if (Volume <= 0 || !clips.TryGetValue(clip, out var c)) return;
            AudioSource s = null; foreach (var o in pool) if (!o.isPlaying) { s = o; break; }
            if (s == null) { if (pool.Count >= 40) return; s = gameObject.AddComponent<AudioSource>(); s.playOnAwake = false; s.spatialBlend = 0; pool.Add(s); }
            s.clip = c; s.volume = Mathf.Min(1, vol * Volume); s.pitch = pitch;
            if (at <= 0) { s.Play(); return; }
            s.PlayScheduled(at); if (cut > 0) s.SetScheduledEndTime(at + cut);
        }

        // ---- instruments: each voice is rendered once into a clip (the web game builds the same shapes out of Web Audio nodes) ----
        class Buf
        {
            public float[] d; public Buf(float sec) { d = new float[Mathf.CeilToInt(sec * SR) + 64]; }
            static readonly System.Random rnd = new System.Random(572);
            // gain: up to the peak in `a` seconds, then down over `dur` — both exponential, as setExponentialRamp does it
            static float Env(float t, float a, float peak, float dur) { if (t < 0) return 0; if (t < a) return .0001f * Mathf.Pow(peak / .0001f, t / a); float u = (t - a) / dur; return u >= 1 ? 0 : peak * Mathf.Pow(.0001f / peak, u); }
            static float Wave(char type, double ph) { double x = ph - Math.Floor(ph); return type == 's' ? (float)Math.Sin(x * 2 * Math.PI) : type == 't' ? (float)(x < .25 ? x * 4 : x < .75 ? 2 - x * 4 : x * 4 - 4) : type == 'q' ? (x < .5 ? 1 : -1) : (float)(x * 2 - 1); }
            public void Osc(float t0, char type, float f0, float f1, float dur, float peak, float attack = .003f, bool linear = false)
            {
                int i0 = (int)(t0 * SR), n = (int)((attack + dur) * SR); double ph = 0;
                for (int i = 0; i < n && i0 + i < d.Length; i++) { float t = (float)i / SR, u = Mathf.Min(1, t / dur), f = linear ? f0 + (f1 - f0) * u : f0 * Mathf.Pow(f1 / f0, u); ph += f / SR; d[i0 + i] += Wave(type, ph) * Env(t, attack, peak, dur); }
            }
            // a voice (oscillator or noise) through a biquad whose corner may slide from c0 to c1
            public void Filtered(float t0, char src, float f0, float f1, float dur, float peak, char ftype, float c0, float c1, float q, float attack, float cDur = 0)
            {
                int i0 = (int)(t0 * SR), n = (int)((attack + dur) * SR); double ph = 0; float x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
                if (cDur <= 0) cDur = dur;
                for (int i = 0; i < n && i0 + i < d.Length; i++)
                {
                    float t = (float)i / SR;
                    if (i % 32 == 0)
                    {
                        float fc = Mathf.Min(SR * .45f, c0 * Mathf.Pow(c1 / c0, Mathf.Min(1, t / cDur))), w = 2 * Mathf.PI * fc / SR, cs = Mathf.Cos(w), al = Mathf.Sin(w) / (2 * q), a0 = 1 + al;
                        if (ftype == 'l') { b0 = (1 - cs) / 2 / a0; b1 = (1 - cs) / a0; b2 = b0; }
                        else if (ftype == 'h') { b0 = (1 + cs) / 2 / a0; b1 = -(1 + cs) / a0; b2 = b0; }
                        else { b0 = al / a0; b1 = 0; b2 = -al / a0; }
                        a1 = -2 * cs / a0; a2 = (1 - al) / a0;
                    }
                    float x;
                    if (src == 'n') x = (float)(rnd.NextDouble() * 2 - 1);
                    else { float u = Mathf.Min(1, t / dur); ph += (f0 + (f1 - f0) * u) / SR; x = Wave(src, ph); }
                    float y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y;
                    d[i0 + i] += y * Env(t, attack, peak, dur);
                }
            }
            public void Noise(float t0, float dur, float freq, char ftype, float peak, float q = .7f) => Filtered(t0, 'n', 0, 0, dur, peak, ftype, freq, freq, ftype == 'b' ? q : .8f, .002f);
            public void Kung(float t, float v) { Osc(t, 's', 96, 58, .5f, .6f * v); Osc(t, 's', 190, 120, .12f, .12f * v); Noise(t, .05f, 240, 'l', .22f * v); }   // 북편: leather, palm
            public void Deok(float t, float v) { Osc(t, 't', 430, 300, .09f, .2f * v); Osc(t, 's', 860, 640, .05f, .06f * v); Noise(t, .025f, 1800, 'b', .25f * v, 1.4f); }   // 채편: bamboo stick on tight skin
            static readonly float[,] KK = { { 1, .05f }, { 1.47f, .035f }, { 2.09f, .03f }, { 2.76f, .02f } };
            public void Kkwaeng(float t, float v, bool muted)   // 꽹과리: clustered metallic partials
            {
                float dd = muted ? .06f : .35f; for (int k = 0; k < 4; k++) Osc(t, 'q', 1180 * KK[k, 0], 1180 * KK[k, 0], dd, KK[k, 1] * v, .001f);
                Noise(t, dd * .6f, 6000, 'b', .12f * v, 1.5f);
            }
            // plucked silk string: bright attack, quick dark decay, a little 농현 bend at the end
            public void Gayageum(float t, float f, float dur, float vol) { Filtered(t, 'w', f * 1.005f, f * .985f, dur, vol, 'l', f * 8, f * 1.5f, .8f, .002f, dur * .6f); }
            public void Daegeum(float t, float f0, float f1, float dur) { Filtered(t, 't', f0, f1, dur, .08f, 'l', 2000, 2000, .8f, .03f); }   // 대금 swoop
            static readonly float[,] JG = { { 1, .18f }, { 1.48f, .06f }, { 2.03f, .05f }, { 2.74f, .03f } };
            public void Jing(float t) { for (int k = 0; k < 4; k++) Osc(t, 's', 196 * JG[k, 0], 190 * JG[k, 0], 3.1f, JG[k, 1], .08f, true); }   // 징: a few inharmonic partials with a slow swell
        }

        void Add(string name, float sec, Action<Buf> fill)
        {
            var b = new Buf(sec); fill(b);
            int fade = Mathf.Min(256, b.d.Length); for (int i = 0; i < fade; i++) b.d[b.d.Length - 1 - i] *= (float)i / fade;   // no click where the clip ends
            var c = AudioClip.Create(name, b.d.Length, 1, SR, false); c.SetData(b.d, 0); clips[name] = c;
        }

        void Build()
        {
            Add("kung", .55f, b => b.Kung(0, 1)); Add("deok", .12f, b => b.Deok(0, 1));
            for (int i = 0; i < GYE.Length; i++) { float f = GYE[i]; Add("gaya" + i, 1.3f, b => b.Gayageum(0, f, 1.25f, 1)); }
            Add("drone", 4.2f, b => { b.Filtered(0, 'w', 110, 110, 3.6f, .03f, 'l', 340, 340, .8f, .5f); });   // 아쟁-like low bow
            Add("daegeum", 1.4f, b => b.Daegeum(0, 440, 329.6f, 1.3f));
            Add("jing", 3.3f, b => b.Jing(0));
            Add("slash", .12f, b => { b.Noise(0, .07f, 5200, 'h', .2f); b.Kkwaeng(0, .25f, true); });                // swish + muted 꽹과리 tick
            Add("strike", .42f, b => { b.Kkwaeng(0, .9f, false); b.Deok(0, 1.2f); });                                  // open 꽹과리 + 채편: 일격
            float[] k1 = { 1, 1.125f, 1.25f, 1.5f, 1.68f, 2 }, k2 = { 1, 1, 1, 1.5f, 1.68f, 2 };
            for (int lv = 0; lv < 6; lv++) { int l = lv; Add("kill" + lv, .62f, b => { b.Kung(0, 1.1f); b.Gayageum(.02f, 98 * k1[l], .5f, .14f); if (l >= 3) b.Gayageum(.09f, 196 * k2[l], .35f, .1f); }); }   // 북 + low 가야금 string, climbing with 기세
            Add("clang", .16f, b => { b.Kkwaeng(0, .6f, true); b.Kkwaeng(.04f, .35f, true); });
            Add("dash", .3f, b => { b.Daegeum(0, 520, 300, .22f); b.Noise(0, .14f, 2600, 'b', .12f, .6f); });          // breathy 대금 swoop
            Add("jump", .2f, b => b.Filtered(0, 'n', 0, 0, .14f, .16f, 'b', 700, 2600, 1.2f, .02f));                    // coat swish, nothing drum-like
            Add("shoot", .16f, b => { b.Noise(0, .12f, 900, 'l', .35f); b.Noise(0, .05f, 3000, 'b', .2f); });           // 화승총 crack
            Add("reflect", .25f, b => { b.Kkwaeng(0, .5f, true); b.Gayageum(0, 880, .2f, .06f); });
            Add("die", 3.3f, b => { b.Jing(0); b.Kung(0, 1.3f); });                                                     // 징
            Add("lantern", .7f, b => { b.Gayageum(0, 330, .5f, .07f); b.Gayageum(.07f, 392, .5f, .07f); b.Gayageum(.14f, 494, .5f, .07f); });   // 가야금 arpeggio
        }
    }
}
