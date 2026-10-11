// Draws the foes and the shots of a fight as the web game does: each foe from its painted sheet (순라 on foes3, 포수 on foes),
// the musket's aim brushed from the muzzle, and 간파 — ink rising behind the body as the blow gathers,
// one brush ring shrinking onto the weak point and ending as a dot the instant the blow lands.
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class FightView : MonoBehaviour
    {
        const float FOE_H = 62; const int PROP_AIM = 1;
        class FoeV { public GameObject root; public SpriteRenderer body, aura, aim, dot; public LineRenderer ring, thread; }
        class ShotV { public SpriteRenderer tail, ball, core; }

        Sim sim; Sheet foes, foes3, kfx, props;
        readonly Dictionary<Enemy, FoeV> views = new Dictionary<Enemy, FoeV>(); readonly List<ShotV> shotViews = new List<ShotV>();

        public static FightView Create(Sim sim, Transform parent)
        {
            var go = new GameObject("Fight"); go.transform.SetParent(parent, false);
            var v = go.AddComponent<FightView>(); v.sim = sim;
            v.foes = Sheet.Get("foes"); v.foes3 = Sheet.Get("foes3"); v.kfx = Sheet.Get("kfx"); v.props = Sheet.Get("props");
            return v;
        }

        SpriteRenderer Sprite(string name, Transform parent, int order) { var go = new GameObject(name); go.transform.SetParent(parent, false); var s = go.AddComponent<SpriteRenderer>(); s.sortingOrder = order; return s; }
        LineRenderer Line(string name, Transform parent, int order) { var go = new GameObject(name); go.transform.SetParent(parent, false); var lr = go.AddComponent<LineRenderer>(); lr.sharedMaterial = Fx.LineMat(); lr.sortingOrder = order; lr.useWorldSpace = false; lr.numCapVertices = 2; return lr; }

        FoeV Make(Enemy e)
        {
            var v = new FoeV { root = new GameObject(e.type == 'p' ? "Sunra" : "Posu") }; v.root.transform.SetParent(transform, false);
            v.aura = Sprite("Aura", v.root.transform, 7); v.body = Sprite("Body", v.root.transform, 8); v.aim = Sprite("Aim", v.root.transform, 9);
            v.ring = Line("Ring", v.root.transform, 14); v.thread = Line("Thread", v.root.transform, 15); v.dot = Sprite("Dot", v.root.transform, 16); v.dot.sprite = Fx.Dot();
            if (kfx != null) v.aura.sprite = kfx.Frame(Fx.KF_AURA, .5f, 1f);
            if (props != null) v.aim.sprite = props.Frame(PROP_AIM, 0, .5f);
            return v;
        }

        public void Sync()
        {
            float now = sim.songPos, bl = sim.BeatLen;
            foreach (var e in sim.foes)
            {
                if (!views.TryGetValue(e, out var v)) views[e] = v = Make(e);
                if (v.root.activeSelf != e.alive) v.root.SetActive(e.alive);
                if (!e.alive) continue;
                float cx = e.cx;
                // the body
                Sheet sh; int fr; float k, ax = .5f;
                if (e.type == 'p') { sh = foes3; fr = e.swingT > 0 ? 2 : e.swingAt != null && e.swingAt - now < bl * 1.2f ? 1 : 0; k = sh != null ? World.ScaleFor(FOE_H, sh.FrameH(0)) : 1; }
                else { sh = foes; fr = e.fireAt != null ? 1 : 0; k = sh != null ? World.ScaleFor(FOE_H, sh.FrameH(0)) : 1; ax = fr == 1 ? .3f : .5f; }
                if (sh != null) { v.body.sprite = sh.Frame(fr, ax, 1f); v.body.flipX = e.face < 0; v.body.transform.localPosition = World.ToUnity(cx, e.y + e.h + 1); v.body.transform.localScale = new Vector3(k, k, 1); }
                v.body.color = e.hitT > 0 ? new Color(1, .55f, .5f, 1) : Color.white;

                // 포수: one brush stroke from the muzzle, thickening as the shot locks
                bool aiming = e.type == 'g' && e.fireAt != null && props != null; v.aim.enabled = aiming;
                if (aiming)
                {
                    var m = sim.Muzzle(e); float dx = e.tx - m.x, dy = e.ty - m.y, d = Mathf.Max(1, Mathf.Sqrt(dx * dx + dy * dy)); bool locked = now >= e.fireAt - .15f;
                    float prog = Mathf.Min(1, (now - e.aimFrom) / Mathf.Max(.01f, e.fireAt.Value - e.aimFrom)), len = Mathf.Min(d, 200) * (locked ? 1 : .35f + prog * .65f), th = locked ? 10 : 4 + prog * 4;
                    var f = props.Frames[PROP_AIM]; v.aim.transform.localPosition = World.ToUnity(m.x, m.y, -.2f); v.aim.transform.localRotation = Quaternion.Euler(0, 0, -Mathf.Atan2(dy, dx) * Mathf.Rad2Deg);
                    v.aim.transform.localScale = new Vector3(len / World.T / (f.w / World.PPU), th / World.T / (f.h / World.PPU), 1); v.aim.color = new Color(1, 1, 1, locked ? 1 : .3f + prog * .5f);
                }

                // 간파
                float pre = sim.PreFlash(e), u = sim.KanRing(e); bool on = sim.IsFlashing(e), show = u >= 0;
                v.aura.enabled = show && kfx != null; v.ring.enabled = v.thread.enabled = false; v.dot.enabled = show;
                if (!show) continue;
                if (kfx != null)
                {
                    float ak = World.ScaleFor(e.h * 1.35f, kfx.FrameH(Fx.KF_AURA)); v.aura.transform.localPosition = World.ToUnity(cx, e.y + e.h + 4, .1f); v.aura.transform.localScale = new Vector3(ak, ak, 1);
                    v.aura.color = new Color(1, 1, 1, (on ? .6f + .15f * Mathf.Sin(Time.time * 20) : pre * .45f) * .55f);
                }
                float rx = cx + e.face * 2, ry = e.y + e.h * .42f, r = Mathf.Max(2.5f, 38 * (1 - u)), al = on ? 1 : .3f + .6f * Mathf.Max(pre, u), st = (e.id * 7 % 13) * .48f;
                if (r > 6)   // black hairs, a red thread inside: the same ring all the way down
                {
                    v.ring.enabled = v.thread.enabled = true;
                    Fx.Circle(v.ring, rx, ry, r, 2.2f, new Color(.09f, .086f, .1f, al * .9f), st + .2f, st + 5.8f);
                    Fx.Circle(v.thread, rx, ry, Mathf.Max(1, r - 1.4f), .7f, new Color(.76f, .09f, .11f, al), st + .5f, st + 5.9f);
                }
                float dd = 2 * (on ? Mathf.Max(1.8f, 2.8f - u) : 1.4f) / World.T;   // and the point it closes to
                v.dot.transform.localPosition = World.ToUnity(rx, ry, -1); v.dot.transform.localScale = new Vector3(dd, dd, 1); v.dot.color = new Color(.76f, .09f, .11f, on ? 1 : .5f);
            }

            // shots: a dark ball with a hot core and a short tail — vermilion coming, indigo once turned back
            while (shotViews.Count < sim.shots.Count)
            {
                var s = new ShotV { tail = Sprite("ShotTail", transform, 12), ball = Sprite("Shot", transform, 13), core = Sprite("ShotCore", transform, 14) };
                s.tail.sprite = s.ball.sprite = s.core.sprite = Fx.Dot(); shotViews.Add(s);
            }
            for (int i = 0; i < shotViews.Count; i++)
            {
                var s = shotViews[i]; bool live = i < sim.shots.Count; s.tail.enabled = s.ball.enabled = s.core.enabled = live; if (!live) continue;
                var b = sim.shots[i]; float sp = Mathf.Max(1, Mathf.Sqrt(b.vx * b.vx + b.vy * b.vy)); const float tl = 18;
                s.tail.transform.localPosition = World.ToUnity(b.x - b.vx / sp * tl / 2, b.y - b.vy / sp * tl / 2, -.3f); s.tail.transform.localRotation = Quaternion.Euler(0, 0, -Mathf.Atan2(b.vy, b.vx) * Mathf.Rad2Deg);
                s.tail.transform.localScale = new Vector3(tl / World.T, 3 / World.T, 1); s.tail.color = b.friendly ? new Color(.15f, .27f, .42f, .6f) : new Color(.76f, .09f, .11f, .55f);
                s.ball.transform.localPosition = World.ToUnity(b.x, b.y, -.4f); s.ball.transform.localScale = new Vector3(6 / World.T, 6 / World.T, 1); s.ball.color = new Color(.08f, .075f, .09f, 1);
                s.core.transform.localPosition = World.ToUnity(b.x, b.y, -.5f); s.core.transform.localScale = new Vector3(2.4f / World.T, 2.4f / World.T, 1); s.core.color = b.friendly ? new Color(.37f, .53f, .71f, 1) : new Color(1, .42f, .24f, 1);
            }
        }
    }
}
