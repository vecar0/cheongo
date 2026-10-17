// Draws a fight as the web game does: each foe and guardian from its painted sheet, the musket's aim brushed from the muzzle,
// 간파 (ink rising behind the body as the blow gathers, one brush ring shrinking onto the weak point), shots, the ground's warnings,
// 천고난무's line from foe to foe, and what stands in a gate — 과녁, lanterns, the drum, the talisman barrier.
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class FightView : MonoBehaviour
    {
        const float FOE_H = 62; const int PROP_AIM = 1;
        class FoeV { public GameObject root; public SpriteRenderer body, aura, aim, dot, ward, mark, ring; }
        class ShotV { public SpriteRenderer tail, ball, core; }
        class HazV { public SpriteRenderer warn, art, ring; }

        Sim sim; Sheet foes, foes2, foes3, kfx, props, bossfx, bossB, kring;
        readonly Dictionary<Enemy, FoeV> views = new Dictionary<Enemy, FoeV>(); readonly List<ShotV> shotViews = new List<ShotV>(); readonly List<HazV> hazViews = new List<HazV>();
        readonly List<Transform> targetRoots = new List<Transform>(); readonly List<SpriteRenderer> targets = new List<SpriteRenderer>(), lanterns = new List<SpriteRenderer>(), cloneViews = new List<SpriteRenderer>(); SpriteRenderer drum, sealL, sealR; LineRenderer chungoLine;
        readonly List<SpriteRenderer> kites = new List<SpriteRenderer>(), chungoSegs = new List<SpriteRenderer>(); SpriteRenderer kiteRing, kiteAim, kiteSnap;   // 연
        static Sprite box;
        public static Sprite Box() { if (box == null) box = UnityEngine.Sprite.Create(Texture2D.whiteTexture, new Rect(0, 0, 4, 4), new Vector2(0, 1), 4); return box; }   // one unit square, pivot top-left

        public static FightView Create(Sim sim, Transform parent)
        {
            var go = new GameObject("Fight"); go.transform.SetParent(parent, false);
            var v = go.AddComponent<FightView>(); v.sim = sim;
            v.foes = Sheet.Get("foes"); v.foes2 = Sheet.Get("foes2"); v.foes3 = Sheet.Get("foes3"); v.kfx = Sheet.Get("kfx"); v.props = Sheet.Get("props"); v.bossfx = Sheet.Get("bossfx"); v.bossB = Sheet.Get("bossB"); v.kring = Sheet.Get("kring");
            v.Scenery(); return v;
        }

        SpriteRenderer Sprite(string name, Transform parent, int order) { var go = new GameObject(name); go.transform.SetParent(parent, false); var s = go.AddComponent<SpriteRenderer>(); s.sortingOrder = order; return s; }
        LineRenderer Line(string name, Transform parent, int order) { var go = new GameObject(name); go.transform.SetParent(parent, false); var lr = go.AddComponent<LineRenderer>(); lr.sharedMaterial = Fx.LineMat(); lr.sortingOrder = order; lr.useWorldSpace = false; lr.numCapVertices = 2; return lr; }
        static readonly System.Collections.Generic.Dictionary<string, int> WALK_ROW = new System.Collections.Generic.Dictionary<string, int> { { "gumiho", 0 }, { "dokkaebi", 1 }, { "haetae", 2 }, { "bulgasari", 3 }, { "baekho", 4 }, { "talchum", 5 }, { "sumun", 6 } };
        static readonly System.Collections.Generic.Dictionary<string, float> walkK = new System.Collections.Generic.Dictionary<string, float>();
        static float WalkK(Boss B, Sheet idle, Sheet bw, int row)   // world units per pixel of the walk frames: the idle's size, matched by area (gaits stretch the outline)
        {
            if (walkK.TryGetValue(B.key, out var k)) return k;
            var i0 = idle.Frames[B.idle]; float a0 = Mathf.Sqrt(i0.w * i0.h), a1 = 0;
            for (int i = 0; i < 4; i++) { var f = bw.Frames[row * 4 + i]; a1 += Mathf.Sqrt(f.w * f.h) / 4; }
            return walkK[B.key] = B.draw / idle.FrameH(B.idle) * a0 / a1 * .95f;
        }
        static void Put(SpriteRenderer r, Sheet sh, int frame, float x, float y, float h, float ax = .5f, float ay = 1, bool flip = false, float a = 1, float z = 0)
        {
            if (sh == null) { r.enabled = false; return; }
            r.enabled = true; r.sprite = sh.Frame(frame, ax, ay); r.flipX = flip; var c = r.color; c.a = a; r.color = c; float k = World.ScaleFor(h, sh.FrameH(frame));
            r.transform.localPosition = World.ToUnity(x, y, z); r.transform.localScale = new Vector3(k, k, 1);
        }
        // a painted frame laid along a segment (the web's wfxLine)
        public static void Stretch(SpriteRenderer r, Sheet sh, int frame, float x0, float y0, float x1, float y1, float h, float a)
        {
            if (sh == null) { r.enabled = false; return; } float L = Mathf.Sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)); var f = sh.Frames[frame]; r.enabled = L > 2; r.sprite = sh.Frame(frame, .5f, .5f); r.color = new Color(1, 1, 1, a);
            r.transform.localPosition = World.ToUnity((x0 + x1) / 2, (y0 + y1) / 2, -1); r.transform.localRotation = Quaternion.Euler(0, 0, -Mathf.Atan2(y1 - y0, x1 - x0) * Mathf.Rad2Deg); r.transform.localScale = new Vector3(L / World.T / (f.w / World.PPU), h / World.T / (f.h / World.PPU), 1);
        }
        // a painted frame repeated down a column from the top of the world to `bottom` (w wide), as a strip of talismans
        public static void Tile(SpriteRenderer r, Sheet sh, int frame, float cx, float bottom, float w, float a)
        {
            if (sh == null) { r.enabled = false; return; } var f = sh.Frames[frame]; r.enabled = true; r.sprite = sh.Frame(frame, .5f, 0); r.drawMode = SpriteDrawMode.Tiled; r.color = new Color(1, 1, 1, a);
            float k = w / World.T / (f.w / World.PPU); r.transform.localScale = new Vector3(k, k, 1); r.transform.localPosition = World.ToUnity(cx, 0, -.1f); r.size = new Vector2(f.w / World.PPU, bottom / World.T / k);
        }
        static void Rect(SpriteRenderer r, float x, float y, float w, float h, Color c) { r.enabled = true; r.sprite = Box(); r.color = c; r.transform.localPosition = World.ToUnity(x, y, -.1f); r.transform.localScale = new Vector3(w / World.T, h / World.T, 1); }

        void Scenery()
        {
            var lv = sim.lv; var solid = Sheet.Get("hudsolid");
            // 과녁: two brushed vermilion rings and a dot, hung on a thread
            foreach (var g in lv.targets)
            {
                var root = new GameObject("Target").transform; root.SetParent(transform, false); root.localPosition = World.ToUnity(g.x, g.y);
                var th = Sprite("Thread", root, 5); Put(th, solid, 5, 0, -14, 50, .5f, 1);    // the cord it hangs from
                var d = Sprite("Target", root, 6); Put(d, Sheet.Get("wfx"), 7, 0, 0, 30, .5f, .5f); d.transform.localPosition = Vector3.zero; targetRoots.Add(root); targets.Add(d);
            }
            // 청사초롱 (checkpoints): a lantern hung from a thin post, lit once passed
            var objects = Sheet.Get("objects");
            foreach (var c in lv.cps)
            {
                var mech = Sheet.Get("mech"); var post = Sprite("Post", transform, 3); var arm = Sprite("Arm", transform, 3);
                if (mech != null) { var mf = mech.Frames[11]; post.sprite = mech.Frame(11, .5f, .5f); post.transform.localPosition = World.ToUnity(c.x, c.y - 22); post.transform.localRotation = Quaternion.Euler(0, 0, 90); post.transform.localScale = new Vector3(46 / World.T / (mf.w / World.PPU), 4 / World.T / (mf.h / World.PPU), 1);
                  arm.sprite = mech.Frame(11, 0, .5f); arm.transform.localPosition = World.ToUnity(c.x - 1, c.y - 43); arm.transform.localScale = new Vector3(11 / World.T / (mf.w / World.PPU), 3 / World.T / (mf.h / World.PPU), 1); }
                var s = Sprite("Lantern", transform, 3); if (objects != null) Put(s, objects, 1, c.x + 8, c.y - 42, 38, .5f, 0); lanterns.Add(s);
            }
            // 연: kites on the wind; the one the line would catch is ringed in 쪽빛, with a faint line from the hand
            foreach (var p in lv.points) { var k = Sprite("Kite", transform, 3); if (objects != null) Put(k, objects, 2, p.x, p.y - 20, 52, .5f, 0); kites.Add(k); }
            kiteRing = Sprite("KiteRing", transform, 12); kiteAim = Sprite("KiteAim", transform, 12); kiteSnap = Sprite("KiteSnap", transform, 12); kiteRing.enabled = kiteAim.enabled = kiteSnap.enabled = false;
            if (lv.hasDrum) { drum = Sprite("Cheongo", transform, 4); if (solid != null) Put(drum, solid, 0, lv.drum.x, lv.drum.y + 4, 92); }
            sealL = Sprite("SealL", transform, 5); sealR = Sprite("SealR", transform, 5); sealL.enabled = sealR.enabled = false;

        }

        FoeV Make(Enemy e)
        {
            var v = new FoeV { root = new GameObject(e.type == 'b' ? e.B.name : Sim.NameOf(e)) }; v.root.transform.SetParent(transform, false);
            v.aura = Sprite("Aura", v.root.transform, 7); v.body = Sprite("Body", v.root.transform, 8); v.aim = Sprite("Aim", v.root.transform, 9); v.ward = Sprite("Ward", v.root.transform, 9); v.mark = Sprite("Elite", v.root.transform, 9);
            v.ring = Sprite("Ring", v.root.transform, 14); v.dot = Sprite("Dot", v.root.transform, 16);
            if (kfx != null) v.aura.sprite = kfx.Frame(Fx.KF_AURA, .5f, 1f);
            if (props != null) v.aim.sprite = props.Frame(PROP_AIM, 0, .5f);
            v.ward.enabled = v.mark.enabled = false; return v;
        }

        void Body(Enemy e, FoeV v, float now, float bl)
        {
            float cx = e.cx, feet = e.y + e.h + 1; bool near(float? t) => t != null && t - now < bl * 1.2f;
            v.body.color = e.hitT > 0 ? new Color(1, .55f, .5f, 1) : Color.white;
            switch (e.type)
            {
                case 'p': case 'a': case 'k':
                    {
                        int fr = e.type == 'p' ? (e.swingT > 0 ? 2 : near(e.swingAt) ? 1 : 0) : e.type == 'a' ? (e.lungeT > 0 || near(e.dashAt) ? 5 : e.counter ? 4 : 3) : (e.beatT > 0 ? 8 : near(e.drumAt) ? 7 : 6);
                        if (foes3 == null) return; float hh = e.type == 'k' ? 66 : e.type == 'a' ? 58 : 62; int rf = e.type == 'k' ? 6 : e.type == 'a' ? 3 : 0;
                        Put(v.body, foes3, fr, cx, feet, hh * foes3.FrameH(fr) / foes3.FrameH(rf), .5f, 1, e.face < 0);
                        if (e.counter) v.body.color = new Color(1, .7f, .7f, 1);   // 자객: settled into his counter stance
                        break;
                    }
                case 'd': if (foes != null) Put(v.body, foes, Mathf.Sin(Time.time * 11 + e.id) > 0 ? 4 : 5, cx, e.y + e.h + 12, FOE_H * .6f * foes.FrameH(4) / foes.FrameH(0), .5f, 1, e.vx < 0); break;
                case 'm': if (foes2 != null) { int fr = e.castT > 0 ? 1 : 0; Put(v.body, foes2, fr, cx, feet, FOE_H * 1.02f * foes2.FrameH(fr) / foes2.FrameH(0), .5f, 1, e.face < 0); } break;
                case 'r': if (foes2 != null) { int fr = e.ph == "gone" || e.fade < .9f ? 3 : 2; Put(v.body, foes2, fr, cx, feet, FOE_H * 1.08f * foes2.FrameH(fr) / foes2.FrameH(2), .5f, 1, e.face < 0, Mathf.Max(.05f, e.fade)); } break;
                case 'i': { var sh = Sheet.Get("bossA"); if (sh != null) Put(v.body, sh, 1, cx, feet, 84 * .8f, .5f, 1, e.face < 0, .45f + .2f * Mathf.Sin(Time.time * 16)); break; }
                case 'b':
                    {
                        var B = e.B; var sh = Sheet.Get(B.sheet); if (sh == null) return; int fr = B.idle; Sheet use = sh; float baseH = B.draw;
                        if (e.stagT > 0 && B.sheet == "foes2") fr = 7; else if (e.hitT > 0 && B.hurtFrame >= 0 && Sheet.Get(B.hurtSheet) != null) { use = Sheet.Get(B.hurtSheet); fr = B.hurtFrame; baseH = B.draw * use.FrameH(fr) / sh.FrameH(B.idle) * .5f; }
                        else if (e.swingT > 0) fr = B.sheet == "foes2" ? 6 : B.atk; else if (e.act != null || e.air || e.chargeT > 0 || e.danceT > 0) fr = B.atk;
                        float hh = use == sh ? B.draw * sh.FrameH(fr) / sh.FrameH(B.idle) : baseH; float a = e.hidden ? 0 : e.invisT > 0 ? .12f : 1;
                        float bob = e.walkT > 0 ? Mathf.Abs(Mathf.Sin(e.wph * Mathf.PI)) * 3 : 0;
                        // walking: the redrawn four-step loop (bwalk), its legs alternating, sized by area to the idle painting (js/game.js animScale)
                        if (use == sh && fr == B.idle && e.walkT > 0 && WALK_ROW.TryGetValue(B.key, out int row) && Sheet.Get("bwalk") is Sheet bw)
                        { int wf = row * 4 + ((Mathf.FloorToInt(e.wph) % 4) + 4) % 4; use = bw; fr = wf; hh = bw.FrameH(wf) * WalkK(B, sh, bw, row); bob = 0; }
                        Put(v.body, use, fr, cx, feet - bob, hh, .5f, 1, e.face < 0, a); if (e.raged && e.hitT <= 0) v.body.color = new Color(1, .82f, .8f, a);
                        break;
                    }
                default:   // 포수 · 저격수 · 등패수
                    {
                        if (foes == null) return; int b0 = e.type == 's' ? 2 : e.type == 'h' ? 6 : 0, fr = e.type == 'h' ? b0 + (e.vx != 0 ? Mathf.FloorToInt(Time.time / .26f) % 2 : 0) : b0 + (e.fireAt != null ? 1 : 0);
                        float ax = fr == 1 || fr == 3 ? .3f : fr == 2 || fr == 6 || fr == 7 ? .45f : .5f; Put(v.body, foes, fr, cx, feet, FOE_H * foes.FrameH(fr) / foes.FrameH(0), ax, 1, e.face < 0); break;
                    }
            }
        }

        public void Sync()
        {
            float now = sim.songPos, bl = sim.BeatLen; var lv = sim.lv;
            foreach (var e in sim.foes)
            {
                if (!views.TryGetValue(e, out var v)) views[e] = v = Make(e);
                if (v.root.activeSelf != e.alive) v.root.SetActive(e.alive);
                if (!e.alive) continue;
                float cx = e.cx; bool big = e.type == 'b';
                Body(e, v, now, bl);
                v.ward.enabled = e.ward && foes2 != null; if (v.ward.enabled) Put(v.ward, foes2, 8, cx, e.y - 4, 26, .5f, 1, false, .9f);   // 무당's talisman over the head
                v.mark.enabled = e.elite && kring != null; if (v.mark.enabled) Put(v.mark, kring, Fx.KR_DRIP, cx, e.y - 18, 16, .5f, .5f, false, .6f + .15f * Mathf.Sin(Time.time * 5 + e.id));   // 정예

                // 포수 · 저격수: one brush stroke from the muzzle, thickening as the shot locks
                bool aiming = (e.type == 'g' || e.type == 's') && e.fireAt != null && props != null; v.aim.enabled = aiming;
                if (aiming)
                {
                    bool sn = e.type == 's'; var m = sim.Muzzle(e); float dx = e.tx - m.x, dy = e.ty - m.y, d = Mathf.Max(1, Mathf.Sqrt(dx * dx + dy * dy)); bool locked = now >= e.fireAt - (sn ? .3f : .15f);
                    float prog = Mathf.Min(1, (now - e.aimFrom) / Mathf.Max(.01f, e.fireAt.Value - e.aimFrom)), len = (sn ? 1000 : Mathf.Min(d, 200)) * (locked ? 1 : .35f + prog * .65f), th = locked ? 10 : 4 + prog * 4;
                    var f = props.Frames[PROP_AIM]; v.aim.transform.localPosition = World.ToUnity(m.x, m.y, -.2f); v.aim.transform.localRotation = Quaternion.Euler(0, 0, -Mathf.Atan2(dy, dx) * Mathf.Rad2Deg);
                    v.aim.transform.localScale = new Vector3(len / World.T / (f.w / World.PPU), th / World.T / (f.h / World.PPU), 1); v.aim.color = new Color(1, 1, 1, locked ? 1 : .3f + prog * .5f);
                }

                // 간파
                float pre = sim.PreFlash(e), u = sim.KanRing(e); bool on = sim.IsFlashing(e), show = u >= 0;
                v.aura.enabled = show && kfx != null; v.ring.enabled = false; v.dot.enabled = show && kring != null;
                if (!show) continue;
                if (kfx != null)
                {
                    float ak = World.ScaleFor(e.h * (big ? 1.2f : 1.35f), kfx.FrameH(Fx.KF_AURA)); v.aura.transform.localPosition = World.ToUnity(cx, e.y + e.h + 4, .1f); v.aura.transform.localScale = new Vector3(ak, ak, 1);
                    v.aura.color = new Color(1, 1, 1, (on ? .6f + .15f * Mathf.Sin(Time.time * 20) : pre * .45f) * .55f);
                }
                float rx = cx + (big ? 0 : e.face * 2), ry = e.y + e.h * (big ? .38f : .42f), r = Mathf.Max(2.5f, (big ? 70 : 38) * (sim.P.focus ? 1.12f : 1) * (1 - u)), al = on ? 1 : .3f + .6f * Mathf.Max(pre, u), st = (e.id * 7 % 13) * .48f;
                if (r > 6 && kring != null) { v.ring.enabled = true; Put(v.ring, kring, 0, rx, ry, r * 2 * 1.08f, .5f, .5f, false, al, -1); v.ring.transform.localRotation = Quaternion.Euler(0, 0, st * Mathf.Rad2Deg); }   // the painted thin 간파 ring (kring 0), as fine as the web's brush ring
                if (kring != null) Put(v.dot, kring, 4, rx, ry, (on ? Mathf.Max(1.8f, 2.8f - u) : 1.4f) * 2 * 2.2f, .5f, .5f, false, on ? 1 : .5f, -1.1f);   // and the point it closes to (kring 4)
            }

            // shots: a dark ball with a hot core and a short tail — vermilion coming, indigo once turned back; the guardians throw their own
            while (shotViews.Count < sim.shots.Count)
            {
                var s = new ShotV { tail = Sprite("ShotTail", transform, 12), ball = Sprite("Shot", transform, 13), core = Sprite("ShotCore", transform, 14) }; shotViews.Add(s);
            }
            for (int i = 0; i < shotViews.Count; i++)
            {
                var s = shotViews[i]; bool live = i < sim.shots.Count; s.tail.enabled = s.ball.enabled = s.core.enabled = live; if (!live) continue;
                var b = sim.shots[i]; float sp = Mathf.Max(1, Mathf.Sqrt(b.vx * b.vx + b.vy * b.vy)), tl = b.sniper ? 34 : 18; s.ball.transform.localRotation = Quaternion.identity; s.ball.color = Color.white;
                var muz = Sheet.Get("muz"); var mech = Sheet.Get("mech"); var bfx3 = Sheet.Get("bfx3"); s.tail.enabled = s.core.enabled = false; float ang = -Mathf.Atan2(b.vy, b.vx) * Mathf.Rad2Deg;
                if (b.look == "rocket") { Put(s.ball, Sheet.Get("gfx"), 2, b.x, b.y, 20, .7f, .5f, false, 1, -.4f); s.ball.transform.localRotation = Quaternion.Euler(0, 0, ang); continue; }
                if (b.look == "cannon") { Put(s.ball, muz, 7, b.x, b.y, 22, .85f, .5f, false, 1, -.4f); s.ball.transform.localRotation = Quaternion.Euler(0, 0, ang); continue; }
                if (b.look != null && !b.friendly)
                {
                    if (b.look == "orb" && bossB != null) Put(s.ball, bossB, 8, b.x, b.y, 24, .5f, .5f, false, 1, -.4f);
                    else if (b.look == "wave") { Put(s.ball, bfx3, 2, b.x, b.y, 40, .5f, .7f, b.vx < 0, 1, -.4f); }
                    else if (bossfx != null) { Put(s.ball, bossfx, b.look == "fan" ? 6 : b.look == "water" ? 7 : 8, b.x, b.y, b.look == "fan" ? 30 : b.look == "water" ? 20 : 22, .5f, .5f, false, 1, -.4f); s.ball.transform.localRotation = Quaternion.Euler(0, 0, -(b.look == "fan" ? b.t * 18 : b.look == "scrap" ? b.t * 9 : 0) * Mathf.Rad2Deg); }
                    continue;
                }
                if (b.red && mech != null) { Put(s.ball, mech, 10, b.x, b.y, 22 + Mathf.Sin(Time.time * 16) * 2, .85f, .5f, false, 1, -.4f); s.ball.transform.localRotation = Quaternion.Euler(0, 0, ang); continue; }   // 붉은 탄: it burns, and cannot be turned
                Put(s.ball, muz, 7, b.x, b.y, b.sniper ? 12 : 9, .9f, .5f, false, 1, -.4f); s.ball.transform.localRotation = Quaternion.Euler(0, 0, ang);
                if (b.friendly) s.ball.color = new Color(.6f, .75f, 1, 1);   // turned back: indigo-washed
            }

            // the ground's warnings: a pale red wash where a blow will fall, then the blow itself; rings spreading from a drum or a scream
            while (hazViews.Count < sim.haz.Count) hazViews.Add(new HazV { warn = Sprite("Warn", transform, 6), art = Sprite("Hazard", transform, 11), ring = Sprite("HazRing", transform, 11) });
            for (int i = 0; i < hazViews.Count; i++)
            {
                var h = hazViews[i]; h.warn.enabled = h.art.enabled = h.ring.enabled = false; if (i >= sim.haz.Count) continue; var z = sim.haz[i];
                if (z.kind == "ring") { float r = (now - z.at) * z.speed; if (r < 0 || r > z.max) continue; Put(h.ring, Sheet.Get("bvfx"), 8, z.x, z.y, r * 2.3f, .5f, .5f, false, .9f * (1 - r / z.max), -.2f); continue; }   // the painted ink ring (bvfx 8), spreading
                bool active = now >= z.at; float lead = Mathf.Clamp01((now - z.t0) / Mathf.Max(.05f, z.at - z.t0));
                int fr = z.kind == "coin" ? 0 : z.kind == "fire" ? 1 : z.kind == "claw" ? 2 : z.kind == "hair" ? 3 : z.kind == "pillar" ? 4 : 5;
                if (!active && bossfx != null) { var wf = bossfx.Frames[fr]; h.warn.enabled = true; h.warn.sprite = bossfx.Frame(fr, 0, 0); h.warn.color = new Color(1, .75f, .75f, .1f + .25f * lead); h.warn.transform.localPosition = World.ToUnity(z.x, z.y, -.1f); h.warn.transform.localScale = new Vector3(z.w / World.T / (wf.w / World.PPU), z.h / World.T / (wf.h / World.PPU), 1); continue; }   // the blow to come, faint
                if (bossfx != null) { var f = bossfx.Frames[fr]; h.art.enabled = true; h.art.sprite = bossfx.Frame(fr, 0, 0); h.art.color = Color.white; h.art.transform.localPosition = World.ToUnity(z.x, z.y, -.2f); h.art.transform.localScale = new Vector3(z.w / World.T / (f.w / World.PPU), z.h / World.T / (f.h / World.PPU), 1); }
            }

            // 천고난무: a plain ink line laid from foe to foe
            var c = sim.chungo; int used = 0;
            if (c != null)
            {
                const float lay = .09f; int n = c.pts.Count - 1; float fade = c.done ? Mathf.Max(0, 1 - (c.t - (n * lay + .25f)) / .65f) : 1; var wfx = Sheet.Get("wfx");
                for (int i = 0; i < n && wfx != null; i++)
                {
                    float k = Mathf.Clamp01((c.t - i * lay) / lay); if (k <= 0) break; var a = c.pts[i]; var bb = c.pts[i + 1]; float x1 = a.x + (bb.x - a.x) * k, y1 = a.y + (bb.y - a.y) * k, L = Mathf.Sqrt((x1 - a.x) * (x1 - a.x) + (y1 - a.y) * (y1 - a.y)); if (L < 2) continue;
                    if (used >= chungoSegs.Count) chungoSegs.Add(Sprite("Chungo", transform, 22)); var sr = chungoSegs[used++]; var f = wfx.Frames[0]; float hh = c.plain ? 18 : 34;
                    sr.enabled = true; sr.sprite = wfx.Frame(0, .5f, .5f); sr.color = c.plain ? new Color(.35f, .35f, .38f, fade) : new Color(1, 1, 1, fade);
                    sr.transform.localPosition = World.ToUnity((a.x + x1) / 2, (a.y + y1) / 2, -1); sr.transform.localRotation = Quaternion.Euler(0, 0, -Mathf.Atan2(y1 - a.y, x1 - a.x) * Mathf.Rad2Deg); sr.transform.localScale = new Vector3(L / World.T / (f.w / World.PPU), hh / World.T / (f.h / World.PPU), 1);
                }
            }
            for (int i = used; i < chungoSegs.Count; i++) chungoSegs[i].enabled = false;

            // 과녁 sway back after a moment; the lantern last passed glows; the drum waits for the guardian to fall; the barrier stands while it lives
            for (int i = 0; i < targets.Count; i++) { var g = lv.targets[i]; bool up = g.t > 0; targetRoots[i].localPosition = World.ToUnity(g.x + Mathf.Sin(Time.time * 1.6f + i) * 2, g.y); foreach (var sr in targetRoots[i].GetComponentsInChildren<SpriteRenderer>()) sr.color = new Color(1, 1, 1, up ? .22f : 1); }
            for (int i = 0; i < kites.Count; i++) { var p = lv.points[i]; float sw = Mathf.Sin(Time.time * 1.3f + i * 1.7f) * 2.5f; kites[i].transform.localPosition = World.ToUnity(p.x + sw, p.y - 20); kites[i].transform.localRotation = Quaternion.Euler(0, 0, -sw * 1.7f); }
            var jjok = new Color(.18f, .35f, .48f, 1);
            bool kon = sim.kite != null && sim.state == "play"; kiteRing.enabled = kiteAim.enabled = kon;
            if (kon) { var k = sim.kite.Value; Put(kiteRing, kring, 5, k.x, k.y, 36, .5f, .5f, false, .55f + .25f * Mathf.Sin(Time.time * 12), -1); Stretch(kiteAim, Sheet.Get("hudsolid"), 3, sim.P.b.cx, sim.P.b.y + 10, k.x, k.y, 4, .35f); }
            kiteSnap.enabled = sim.kiteFlashT > 0;
            if (kiteSnap.enabled) Stretch(kiteSnap, Sheet.Get("wfx"), 0, sim.P.b.cx, sim.P.b.y + 12, sim.kiteTo.x, sim.kiteTo.y, 10, Mathf.Min(1, sim.kiteFlashT * 6));
            var obj = Sheet.Get("objects"); if (obj != null) for (int i = 0; i < lanterns.Count; i++) lanterns[i].sprite = obj.Frame(i == sim.cpIdx ? 0 : 1, .5f, 0);
            if (drum != null) { var solid = Sheet.Get("hudsolid"); if (sim.drumCut && solid != null) drum.sprite = solid.Frame(1, .5f, 1f); drum.color = sim.BossAlive ? new Color(1, 1, 1, .45f) : Color.white; }
            sealL.enabled = sealR.enabled = lv.sealOn;
            if (lv.sealOn) { float hh = (lv.sealY1 + 1) * World.T, pulse = .75f + .2f * Mathf.Sin(Time.time * 4); Tile(sealL, Sheet.Get("bcal"), 7, lv.sealX0 * World.T + 16, hh, 24, pulse); Tile(sealR, Sheet.Get("bcal"), 7, lv.sealX1 * World.T + 16, hh, 24, pulse); }
            while (cloneViews.Count < sim.clones.Count) cloneViews.Add(Sprite("Shadow", transform, 9));
            var hero = Sheet.Get("hero3");
            for (int i = 0; i < cloneViews.Count; i++) { bool live = i < sim.clones.Count && hero != null; cloneViews[i].enabled = live; if (live) { var q = sim.clones[i]; Put(cloneViews[i], hero, DB.Tables.H3.slash, q.x, q.y + 1, DB.Tables.HERO_H * 1.08f * hero.FrameH(DB.Tables.H3.slash) / hero.FrameH(0), .5f, 1, q.face < 0, .4f); } }
        }
    }
}
