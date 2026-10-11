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
        class FoeV { public GameObject root; public SpriteRenderer body, aura, aim, dot, ward, mark; public LineRenderer ring, thread; }
        class ShotV { public SpriteRenderer tail, ball, core; }
        class HazV { public SpriteRenderer warn, art; public LineRenderer ring; }

        Sim sim; Sheet foes, foes2, foes3, kfx, props, bossfx, bossB, kring;
        readonly Dictionary<Enemy, FoeV> views = new Dictionary<Enemy, FoeV>(); readonly List<ShotV> shotViews = new List<ShotV>(); readonly List<HazV> hazViews = new List<HazV>();
        readonly List<SpriteRenderer> targets = new List<SpriteRenderer>(), lanterns = new List<SpriteRenderer>(), cloneViews = new List<SpriteRenderer>(); SpriteRenderer drum, sealL, sealR; LineRenderer chungoLine;
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
        static void Put(SpriteRenderer r, Sheet sh, int frame, float x, float y, float h, float ax = .5f, float ay = 1, bool flip = false, float a = 1, float z = 0)
        {
            if (sh == null) { r.enabled = false; return; }
            r.enabled = true; r.sprite = sh.Frame(frame, ax, ay); r.flipX = flip; var c = r.color; c.a = a; r.color = c; float k = World.ScaleFor(h, sh.FrameH(frame));
            r.transform.localPosition = World.ToUnity(x, y, z); r.transform.localScale = new Vector3(k, k, 1);
        }
        static void Rect(SpriteRenderer r, float x, float y, float w, float h, Color c) { r.enabled = true; r.sprite = Box(); r.color = c; r.transform.localPosition = World.ToUnity(x, y, -.1f); r.transform.localScale = new Vector3(w / World.T, h / World.T, 1); }

        void Scenery()
        {
            var lv = sim.lv; var solid = Sheet.Get("hudsolid");
            foreach (var g in lv.targets) { var s = Sprite("Target", transform, 6); if (solid != null) Put(s, solid, 4, g.x, g.y, 34, .5f, .5f); targets.Add(s); }
            foreach (var c in lv.cps) { var s = Sprite("Lantern", transform, 3); if (props != null) Put(s, props, 4, c.x, c.y + 2, 46); lanterns.Add(s); }
            if (lv.hasDrum) { drum = Sprite("Cheongo", transform, 4); if (solid != null) Put(drum, solid, 0, lv.drum.x, lv.drum.y + 4, 92); }
            sealL = Sprite("SealL", transform, 5); sealR = Sprite("SealR", transform, 5); sealL.enabled = sealR.enabled = false;
            chungoLine = Line("Chungo", transform, 22); chungoLine.enabled = false;
        }

        FoeV Make(Enemy e)
        {
            var v = new FoeV { root = new GameObject(e.type == 'b' ? e.B.name : Sim.NameOf(e)) }; v.root.transform.SetParent(transform, false);
            v.aura = Sprite("Aura", v.root.transform, 7); v.body = Sprite("Body", v.root.transform, 8); v.aim = Sprite("Aim", v.root.transform, 9); v.ward = Sprite("Ward", v.root.transform, 9); v.mark = Sprite("Elite", v.root.transform, 9);
            v.ring = Line("Ring", v.root.transform, 14); v.thread = Line("Thread", v.root.transform, 15); v.dot = Sprite("Dot", v.root.transform, 16); v.dot.sprite = Fx.Dot();
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
                v.aura.enabled = show && kfx != null; v.ring.enabled = v.thread.enabled = false; v.dot.enabled = show;
                if (!show) continue;
                if (kfx != null)
                {
                    float ak = World.ScaleFor(e.h * (big ? 1.2f : 1.35f), kfx.FrameH(Fx.KF_AURA)); v.aura.transform.localPosition = World.ToUnity(cx, e.y + e.h + 4, .1f); v.aura.transform.localScale = new Vector3(ak, ak, 1);
                    v.aura.color = new Color(1, 1, 1, (on ? .6f + .15f * Mathf.Sin(Time.time * 20) : pre * .45f) * .55f);
                }
                float rx = cx + (big ? 0 : e.face * 2), ry = e.y + e.h * (big ? .38f : .42f), r = Mathf.Max(2.5f, (big ? 70 : 38) * (sim.P.focus ? 1.12f : 1) * (1 - u)), al = on ? 1 : .3f + .6f * Mathf.Max(pre, u), st = (e.id * 7 % 13) * .48f;
                if (r > 6)   // black hairs, a red thread inside: the same ring all the way down
                {
                    v.ring.enabled = v.thread.enabled = true;
                    Fx.Circle(v.ring, rx, ry, r, big ? 3 : 2.2f, new Color(.09f, .086f, .1f, al * .9f), st + .2f, st + 5.8f);
                    Fx.Circle(v.thread, rx, ry, Mathf.Max(1, r - (big ? 2 : 1.4f)), big ? 1 : .7f, new Color(.76f, .09f, .11f, al), st + .5f, st + 5.9f);
                }
                float dd = 2 * (on ? Mathf.Max(1.8f, 2.8f - u) : 1.4f) / World.T;   // and the point it closes to
                v.dot.transform.localPosition = World.ToUnity(rx, ry, -1); v.dot.transform.localScale = new Vector3(dd, dd, 1); v.dot.color = new Color(.76f, .09f, .11f, on ? 1 : .5f);
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
                if (b.look != null && !b.friendly)
                {
                    s.tail.enabled = s.core.enabled = false;
                    if (b.look == "orb" && bossB != null) Put(s.ball, bossB, 8, b.x, b.y, 24, .5f, .5f, false, 1, -.4f);
                    else if (b.look == "wave") { s.ball.sprite = Fx.Dot(); s.ball.color = new Color(.09f, .086f, .1f, 1); s.ball.transform.localPosition = World.ToUnity(b.x, b.y, -.4f); s.ball.transform.localScale = new Vector3(46 / World.T, 30 / World.T, 1); s.core.enabled = true; s.core.sprite = Fx.Dot(); s.core.color = new Color(.76f, .09f, .11f, 1); s.core.transform.localPosition = World.ToUnity(b.x + Mathf.Sign(b.vx) * 8, b.y - 8, -.5f); s.core.transform.localScale = new Vector3(14 / World.T, 8 / World.T, 1); }
                    else if (bossfx != null) { Put(s.ball, bossfx, b.look == "fan" ? 6 : b.look == "water" ? 7 : 8, b.x, b.y, b.look == "fan" ? 30 : b.look == "water" ? 20 : 22, .5f, .5f, false, 1, -.4f); s.ball.transform.localRotation = Quaternion.Euler(0, 0, -(b.look == "fan" ? b.t * 18 : b.look == "scrap" ? b.t * 9 : 0) * Mathf.Rad2Deg); }
                    continue;
                }
                s.tail.sprite = s.ball.sprite = s.core.sprite = Fx.Dot();
                s.tail.transform.localPosition = World.ToUnity(b.x - b.vx / sp * tl / 2, b.y - b.vy / sp * tl / 2, -.3f); s.tail.transform.localRotation = Quaternion.Euler(0, 0, -Mathf.Atan2(b.vy, b.vx) * Mathf.Rad2Deg);
                s.tail.transform.localScale = new Vector3(tl / World.T, 3 / World.T, 1); s.tail.color = b.friendly ? new Color(.15f, .27f, .42f, .6f) : new Color(.76f, .09f, .11f, .55f);
                float bs = b.red ? 11 + Mathf.Sin(Time.time * 16) * 1.5f : 6;   // 붉은 탄: larger, burning — it cannot be turned
                s.ball.transform.localPosition = World.ToUnity(b.x, b.y, -.4f); s.ball.transform.localScale = new Vector3(bs / World.T, bs / World.T, 1); s.ball.color = b.red ? new Color(.76f, .09f, .11f, 1) : new Color(.08f, .075f, .09f, 1);
                s.core.transform.localPosition = World.ToUnity(b.x, b.y, -.5f); s.core.transform.localScale = new Vector3((b.red ? 5 : 2.4f) / World.T, (b.red ? 5 : 2.4f) / World.T, 1); s.core.color = b.friendly ? new Color(.37f, .53f, .71f, 1) : b.red ? new Color(.08f, .075f, .09f, 1) : new Color(1, .42f, .24f, 1);
            }

            // the ground's warnings: a pale red wash where a blow will fall, then the blow itself; rings spreading from a drum or a scream
            while (hazViews.Count < sim.haz.Count) hazViews.Add(new HazV { warn = Sprite("Warn", transform, 6), art = Sprite("Hazard", transform, 11), ring = Line("HazRing", transform, 11) });
            for (int i = 0; i < hazViews.Count; i++)
            {
                var h = hazViews[i]; h.warn.enabled = h.art.enabled = h.ring.enabled = false; if (i >= sim.haz.Count) continue; var z = sim.haz[i];
                if (z.kind == "ring") { float r = (now - z.at) * z.speed; if (r < 0 || r > z.max) continue; h.ring.enabled = true; Fx.Circle(h.ring, z.x, z.y, r, 8, new Color(.09f, .086f, .1f, .75f * (1 - r / z.max))); continue; }
                bool active = now >= z.at; float lead = Mathf.Clamp01((now - z.t0) / Mathf.Max(.05f, z.at - z.t0));
                if (!active) { Rect(h.warn, z.x, z.y, z.w, z.h, new Color(.76f, .09f, .11f, .1f + .25f * lead)); continue; }
                int fr = z.kind == "coin" ? 0 : z.kind == "fire" ? 1 : z.kind == "claw" ? 2 : z.kind == "hair" ? 3 : z.kind == "pillar" ? 4 : 5;
                if (bossfx != null) { var f = bossfx.Frames[fr]; h.art.enabled = true; h.art.sprite = bossfx.Frame(fr, 0, 0); h.art.color = Color.white; h.art.transform.localPosition = World.ToUnity(z.x, z.y, -.2f); h.art.transform.localScale = new Vector3(z.w / World.T / (f.w / World.PPU), z.h / World.T / (f.h / World.PPU), 1); }
                else Rect(h.warn, z.x, z.y, z.w, z.h, new Color(.76f, .09f, .11f, .7f));
            }

            // 천고난무: a plain ink line laid from foe to foe
            var c = sim.chungo; chungoLine.enabled = c != null;
            if (c != null)
            {
                const float lay = .09f; int n = c.pts.Count - 1; var pts = new List<Vector3> { World.ToUnity(c.pts[0].x, c.pts[0].y, -1) };
                for (int i = 0; i < n; i++) { float k = Mathf.Clamp01((c.t - i * lay) / lay); if (k <= 0) break; var a = c.pts[i]; var b = c.pts[i + 1]; pts.Add(World.ToUnity(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, -1)); }
                float fade = c.done ? Mathf.Max(0, 1 - (c.t - (n * lay + .25f)) / .65f) : 1; chungoLine.positionCount = pts.Count; chungoLine.SetPositions(pts.ToArray());
                chungoLine.startWidth = chungoLine.endWidth = (c.plain ? 3 : 7) / World.T; chungoLine.startColor = chungoLine.endColor = c.plain ? new Color(.09f, .086f, .1f, fade) : new Color(.76f, .09f, .11f, fade);
            }

            // 과녁 sway back after a moment; the lantern last passed glows; the drum waits for the guardian to fall; the barrier stands while it lives
            for (int i = 0; i < targets.Count; i++) { var g = lv.targets[i]; targets[i].color = new Color(1, 1, 1, g.t > 0 ? .15f : 1); targets[i].transform.localRotation = Quaternion.Euler(0, 0, Mathf.Sin(Time.time * 1.6f + i) * 6); }
            for (int i = 0; i < lanterns.Count; i++) lanterns[i].color = i == sim.cpIdx ? new Color(1, .86f, .6f, 1) : new Color(1, 1, 1, .85f);
            if (drum != null) { var solid = Sheet.Get("hudsolid"); if (sim.drumCut && solid != null) drum.sprite = solid.Frame(1, .5f, 1f); drum.color = sim.BossAlive ? new Color(1, 1, 1, .45f) : Color.white; }
            sealL.enabled = sealR.enabled = lv.sealOn;
            if (lv.sealOn) { float hh = (lv.sealY1 + 1) * World.T, pulse = .55f + .15f * Mathf.Sin(Time.time * 4); Rect(sealL, lv.sealX0 * World.T + 10, 0, 12, hh, new Color(.76f, .09f, .11f, pulse)); Rect(sealR, lv.sealX1 * World.T + 10, 0, 12, hh, new Color(.76f, .09f, .11f, pulse)); }
            while (cloneViews.Count < sim.clones.Count) cloneViews.Add(Sprite("Shadow", transform, 9));
            var hero = Sheet.Get("hero3");
            for (int i = 0; i < cloneViews.Count; i++) { bool live = i < sim.clones.Count && hero != null; cloneViews[i].enabled = live; if (live) { var q = sim.clones[i]; Put(cloneViews[i], hero, DB.Tables.H3.slash, q.x, q.y + 1, DB.Tables.HERO_H * 1.08f * hero.FrameH(DB.Tables.H3.slash) / hero.FrameH(0), .5f, 1, q.face < 0, .4f); } }
        }
    }
}
