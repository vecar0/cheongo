// What a blow leaves on the paper, as the web game draws it: one-shot painted frames that grow and fade (addFx),
// drops of ink (parts), spreading rings, brush trails, stamped seals and small floating words.
// Positions are world pixels; angles are the web's (radians, clockwise on screen).
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class Fx : MonoBehaviour
    {
        // frame numbers on the sheets (js/game.js: HUD, FX, PF, KF, KR, MECH, WF2, VIS, HFX)
        public const int HUD_SPARK = 6, HUD_SMOKE = 7, HUD_DUST = 8, FX_SLASH_A = 0, FX_SLASH_B = 2, FX_BURST = 4, FX_SPRAY = 5, FX_DROPS = 7, PF_SPARK = 7, PF_SPLASH = 8;
        public const int KF_XCUT = 3, KF_AURA = 5, KF_FIZZLE = 6, KF_FLAKES = 7, KR_DRIP = 7, MECH_DEFLECT = 9, WF_STREAK = 0, WF_XCUT = 1, WF_SMEAR = 5, VIS_SPLAT = 1, VIS_SEAL = 7, VIS_DROPS = 8;
        const int HFX_DASH = 0, HFX_JUMP = 1, HFX_LAND = 2;

        class One { public SpriteRenderer sr; public float t, life, grow, a, baseS; }
        class Drop { public SpriteRenderer sr; public float x, y, vx, vy, life, max, s; }
        class RingOne { public LineRenderer ink, col; public float x, y, r, t, life; public Color c; }
        class TrailOne { public SpriteRenderer sr; public float t, life; }
        class SealOne { public SpriteRenderer sr; public float t, x, y; public bool big; }
        public class Word { public float x, y, t; public string txt; public Color col; public bool stamp; }

        readonly List<One> live = new List<One>(); readonly Stack<SpriteRenderer> pool = new Stack<SpriteRenderer>();
        readonly List<Drop> drops = new List<Drop>(); readonly Stack<SpriteRenderer> dropPool = new Stack<SpriteRenderer>();
        readonly List<RingOne> rings = new List<RingOne>(); readonly List<TrailOne> trails = new List<TrailOne>(); readonly List<SealOne> seals = new List<SealOne>();
        public readonly List<Word> words = new List<Word>();
        static Sprite dot; static Material lineMat;

        // a soft round drop, shared by the ink particles and the shots
        public static Sprite Dot()
        {
            if (dot != null) return dot;
            const int n = 32; var tex = new Texture2D(n, n, TextureFormat.RGBA32, false) { filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp };
            for (int y = 0; y < n; y++) for (int x = 0; x < n; x++) { float d = Mathf.Sqrt((x - 15.5f) * (x - 15.5f) + (y - 15.5f) * (y - 15.5f)) / 15.5f; tex.SetPixel(x, y, new Color(1, 1, 1, Mathf.Clamp01((1 - d) * 6))); }
            tex.Apply(); return dot = Sprite.Create(tex, new Rect(0, 0, n, n), new Vector2(.5f, .5f), n);   // one unit across
        }
        public static Material LineMat() => lineMat != null ? lineMat : lineMat = new Material(Shader.Find("Sprites/Default"));
        public static Color Rgb(string hex, float a = 1) { var c = DB.Hex(hex); c.a = a; return c; }

        // the hero's effects, as heroFx / airKickFx / wallKickFx lay them
        public void Hero(string kind, float x, float y, int dir)
        {
            switch (kind)
            {
                case "dash": Add("herofx", HFX_DASH, x, y, 70, life: .32f, a: .9f, flip: dir < 0); break;
                case "jump": Add("herofx", HFX_JUMP, x, y, 46, life: .4f, ay: 1, a: .85f, flip: dir < 0); break;
                case "land": Add("herofx", HFX_LAND, x, y, 58, life: .4f, ay: 1, a: .8f, flip: dir < 0); break;
                case "dust": Add("hud", HUD_DUST, x, y, 22, life: .35f, ay: 1, a: .8f); break;
                case "air":   // 허공답보: a cup of ink pressed out under the feet and a few drops falling away
                    Add("herofx", HFX_LAND, x, y + 4, 50, life: .38f, ay: .55f, a: .85f, grow: .45f);
                    for (int i = 0; i < 6; i++) Part(x + (Random.value - .5f) * 18, y + 4, (Random.value - .5f) * 70, 60 + Random.value * 120, .35f, "#17161a", 1.6f + Random.value * 1.4f);
                    break;
                case "wall":   // 벽차기: ink bursts from the wall outward, a streak follows the leap (dir: which side the wall is on)
                    Add("herofx", HFX_JUMP, x, y, 56, life: .4f, ay: 1, a: .9f, rot: -dir * Mathf.PI / 2);
                    Add("herofx", HFX_DASH, x - dir * 30, y - 14, 30, life: .32f, a: .6f, flip: dir > 0, rot: dir * .5f, grow: .4f);
                    for (int i = 0; i < 5; i++) Part(x, y + (Random.value - .5f) * 16, -dir * (60 + Random.value * 120), (Random.value - .3f) * 80, .3f, "#17161a", 1.5f + Random.value * 1.5f);
                    break;
            }
        }

        public void Add(string sheetName, int i, float x, float y, float h, float life = .5f, float rot = 0, float grow = .35f, bool flip = false, float ax = .5f, float ay = .5f, float a = 1)
        {
            var sh = Sheet.Get(sheetName); if (sh == null) return;
            if (live.Count > 120) Retire(0);
            var sr = pool.Count > 0 ? pool.Pop() : NewRenderer("fx", 20); sr.gameObject.SetActive(true);
            sr.sprite = sh.Frame(i, ax, ay); sr.flipX = flip; sr.color = new Color(1, 1, 1, a);
            float s = World.ScaleFor(h, sh.FrameH(i));
            sr.transform.localPosition = World.ToUnity(x, y, -1); sr.transform.localRotation = Quaternion.Euler(0, 0, -rot * Mathf.Rad2Deg);
            var o = new One { sr = sr, life = life, grow = grow, a = a, baseS = s }; live.Add(o); Shape(o);
        }
        static void Shape(One o) { float k = o.t / o.life, s = o.baseS * (1 - o.grow * .5f + o.grow * k); o.sr.transform.localScale = new Vector3(s, s, 1); var c = o.sr.color; c.a = o.a * Mathf.Min(1, (1 - k) * 2.2f); o.sr.color = c; }
        void Retire(int i) { live[i].sr.gameObject.SetActive(false); pool.Push(live[i].sr); live.RemoveAt(i); }

        public void Part(float x, float y, float vx, float vy, float life, string col, float s)
        {
            if (drops.Count > 400) { drops[0].sr.gameObject.SetActive(false); dropPool.Push(drops[0].sr); drops.RemoveAt(0); }   // oldest drops go first
            SpriteRenderer sr; if (dropPool.Count > 0) sr = dropPool.Pop(); else { sr = NewRenderer("drop", 19); sr.sprite = Dot(); }
            sr.gameObject.SetActive(true); sr.color = Rgb(col);
            drops.Add(new Drop { sr = sr, x = x, y = y, vx = vx, vy = vy, life = life, max = life, s = s });
        }

        public void Ring(float x, float y, float r, Color col, float life)
        {
            var o = new RingOne { x = x, y = y, r = r, life = life, c = col, ink = NewLine("ring", 17), col = NewLine("ring", 18) }; rings.Add(o); ShapeRing(o);
        }
        void ShapeRing(RingOne o)
        {
            float k = o.t / o.life, rr = o.r * (.35f + .65f * Mathf.Sqrt(k)), al = Mathf.Min(1, (1 - k) * 1.5f);
            Circle(o.ink, o.x, o.y, rr, 9 * (1 - k) + 3, new Color(.09f, .086f, .1f, .35f * al));   // an ink shadow so pale rings read on paper
            var c = o.c; c.a *= al; Circle(o.col, o.x, o.y, rr, 6 * (1 - k) + 1.5f, c);
        }
        public static void Circle(LineRenderer lr, float x, float y, float r, float w, Color c, float from = 0, float to = Mathf.PI * 2)
        {
            int n = Mathf.Clamp(Mathf.CeilToInt(r * (to - from) / 5), 8, 64); lr.positionCount = n + 1;
            for (int i = 0; i <= n; i++) { float a = from + (to - from) * i / n; lr.SetPosition(i, World.ToUnity(x + Mathf.Cos(a) * r, y + Mathf.Sin(a) * r, -1)); }
            lr.startWidth = lr.endWidth = w / World.T; lr.startColor = lr.endColor = c;
        }

        // a painted streak laid along a segment (the web's trailFx / wfxLine)
        public void Trail(float x0, float y0, float x1, float y1, float w, float life, int frame)
        {
            var sh = Sheet.Get("wfx"); float L = Mathf.Sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)); if (sh == null || L < 2) return;
            var f = sh.Frames[frame]; var sr = NewRenderer("trail", 18); sr.sprite = sh.Frame(frame, .5f, .5f);
            sr.transform.localPosition = World.ToUnity((x0 + x1) / 2, (y0 + y1) / 2, -1); sr.transform.localRotation = Quaternion.Euler(0, 0, -Mathf.Atan2(y1 - y0, x1 - x0) * Mathf.Rad2Deg);
            sr.transform.localScale = new Vector3(L / World.T / (f.w / World.PPU), w * 6 / World.T / (f.h / World.PPU), 1);
            trails.Add(new TrailOne { sr = sr, life = life });
        }

        // a stamped seal: it lands hard and stays a moment
        public void Seal(float x, float y, float rot, bool big)
        {
            var sh = Sheet.Get("vis"); if (sh == null) return;
            var sr = NewRenderer("seal", 21); sr.sprite = sh.Frame(VIS_SEAL, .5f, .5f); sr.transform.localRotation = Quaternion.Euler(0, 0, -rot * Mathf.Rad2Deg);
            seals.Add(new SealOne { sr = sr, x = x, y = y - 30, big = big });
            words.Add(new Word { x = x, y = y - 30, txt = "妙", col = Rgb("#f6f0e2"), stamp = true });
        }
        // a name brushed large across the screen for a breath (an 오의, a guardian coming in)
        public string banner, bannerSub; public float bannerT = 9;
        public void Banner(string name, string sub) { banner = name; bannerSub = sub; bannerT = 0; }
        public void Pop(float x, float y, string txt, string col) { words.Add(new Word { x = x, y = y, txt = txt, col = Rgb(col) }); if (words.Count > 12) words.RemoveAt(0); }

        // blood burst + spray along the blow
        public void Bleed(Level lv, float x, float y, Vector2 dir, bool big)
        {
            Add("fx", FX_BURST, x, y, big ? 96 : 64, life: big ? .7f : .45f, rot: Random.value * 6.28f, grow: .5f);
            Add("fx", FX_SPRAY, x, y, big ? 50 : 34, life: .5f, rot: Mathf.Atan2(dir.y, dir.x), grow: .6f);
            Add("fx", FX_DROPS, x + dir.x * 20, y - 6, 26, life: .6f, rot: Random.value * 6.28f);
            Add("vis", VIS_SPLAT, x, y, big ? 48 : 34, life: .45f, grow: .3f, rot: Random.value * 6.28f, a: .85f);
            Add("vis", VIS_DROPS, x + dir.x * 20, y + 4, big ? 24 : 18, life: .55f, grow: .1f, rot: Mathf.Atan2(dir.y, dir.x), a: .85f);
        }

        SpriteRenderer NewRenderer(string name, int order) { var go = new GameObject(name); go.transform.SetParent(transform, false); var sr = go.AddComponent<SpriteRenderer>(); sr.sortingOrder = order; return sr; }
        LineRenderer NewLine(string name, int order) { var go = new GameObject(name); go.transform.SetParent(transform, false); var lr = go.AddComponent<LineRenderer>(); lr.sharedMaterial = LineMat(); lr.sortingOrder = order; lr.useWorldSpace = false; lr.numCapVertices = 2; return lr; }

        void Update()
        {
            float dt = Mathf.Min(.05f, Time.unscaledDeltaTime); bannerT += dt;
            for (int i = live.Count - 1; i >= 0; i--) { var o = live[i]; o.t += dt; if (o.t >= o.life) { Retire(i); continue; } Shape(o); }
            for (int i = drops.Count - 1; i >= 0; i--)
            {
                var p = drops[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt;
                if (p.life <= 0) { p.sr.gameObject.SetActive(false); dropPool.Push(p.sr); drops.RemoveAt(i); continue; }
                // round drops of ink, stretched a little along their flight — never square specks
                float k = p.life / p.max, sp = Mathf.Sqrt(p.vx * p.vx + p.vy * p.vy), d = p.s * (.6f + .4f * k) / World.T, st = Mathf.Min(2.2f, 1 + sp / 500);
                p.sr.transform.localPosition = World.ToUnity(p.x, p.y, -1); p.sr.transform.localScale = new Vector3(d * st, d, 1);
                p.sr.transform.localRotation = Quaternion.Euler(0, 0, sp > 20 ? -Mathf.Atan2(p.vy, p.vx) * Mathf.Rad2Deg : 0); var c = p.sr.color; c.a = k; p.sr.color = c;
            }
            for (int i = rings.Count - 1; i >= 0; i--) { var o = rings[i]; o.t += dt; if (o.t >= o.life) { Destroy(o.ink.gameObject); Destroy(o.col.gameObject); rings.RemoveAt(i); continue; } ShapeRing(o); }
            for (int i = trails.Count - 1; i >= 0; i--) { var o = trails[i]; o.t += dt; if (o.t >= o.life) { Destroy(o.sr.gameObject); trails.RemoveAt(i); continue; } o.sr.color = new Color(1, 1, 1, 1 - o.t / o.life); }
            for (int i = seals.Count - 1; i >= 0; i--)
            {
                var s = seals[i]; s.t += dt; if (s.t >= 1.1f) { Destroy(s.sr.gameObject); seals.RemoveAt(i); continue; }
                float a = s.t < .06f ? s.t / .06f : 1 - Mathf.Max(0, s.t - .7f) / .4f, sc = s.t < .06f ? 2 - s.t / .06f : 1 + Mathf.Max(0, .1f - s.t) * .6f, z = (s.big ? 46 : 30) * 1.08f;
                float k = World.ScaleFor(z, s.sr.sprite.rect.height) * sc; s.sr.transform.localPosition = World.ToUnity(s.x, s.y, -1); s.sr.transform.localScale = new Vector3(k, k, 1); s.sr.color = new Color(1, 1, 1, Mathf.Clamp01(a));
            }
            for (int i = words.Count - 1; i >= 0; i--) { words[i].t += dt; if (words[i].t >= (words[i].stamp ? 1.1f : .9f)) words.RemoveAt(i); }
        }
    }
}
