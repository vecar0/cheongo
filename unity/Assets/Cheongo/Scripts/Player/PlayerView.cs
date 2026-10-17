// 무명 drawn as the web game's drawPlayer does: the hero3 sheet for moving (idle, the six-step run, rise / turn / fall, the wall,
// the dash, the landing), the lunge poses and the ink crescent for a cut, the blink of being struck, the 날 notches over the head.
using UnityEngine;

namespace Cheongo
{
    public class PlayerView : MonoBehaviour
    {
        const int SF_FWD = 0, SF_UP = 1, SF_DOWN = 2, SF_ARC = 3, SF_ARC_RED = 4; const float SLASH_K = 1.18f;   // the lunge reads at ~80% of standing height
        static readonly float[] SF_AX = { .44f, .55f, .6f };

        Sim sim; SpriteRenderer sr, arc, arcBack, aimLine, reticle, dim; Sheet sheet, slash, run8; float k;
        // the redrawn run (mvrun, eight steps, the legs alternating): its anchor is the hat, so the head rides level (js/game.js MV_AX.mvrun)
        static readonly float[] RUN8_AX = { .794f, .783f, .792f, .789f, .8f, .797f, .792f, .803f };
        HeroFrames H; float[] AX; readonly SpriteRenderer[] notch = new SpriteRenderer[8];

        public static PlayerView Create(Sim sim, Transform parent)
        {
            var go = new GameObject("Mumyeong"); go.transform.SetParent(parent, false);
            var v = go.AddComponent<PlayerView>(); v.sim = sim; v.sr = go.AddComponent<SpriteRenderer>(); v.sr.sortingOrder = 10;
            v.sheet = Sheet.Get("hero3"); v.slash = Sheet.Get("slashfx"); v.run8 = Sheet.Get("mvrun"); v.H = DB.Tables.H3; v.AX = DB.Tables.H3_AX;
            if (v.sheet != null) v.k = World.ScaleFor(DB.Tables.HERO_H * 1.08f, v.sheet.FrameH(v.H.idle));
            v.arc = Child("Cut", parent, 12); v.arcBack = Child("CutBehind", parent, 11);
            for (int i = 0; i < v.notch.Length; i++) { v.notch[i] = Child("Edge", parent, 30); v.notch[i].sprite = Fx.Dot(); }
            v.aimLine = Child("AimLine", parent, 24); v.reticle = Child("Reticle", parent, 25); v.dim = Child("Hush", parent, 6); v.dim.sprite = FightView.Box();
            return v;
        }
        static SpriteRenderer Child(string name, Transform parent, int order) { var go = new GameObject(name); go.transform.SetParent(parent, false); var s = go.AddComponent<SpriteRenderer>(); s.sortingOrder = order; s.enabled = false; return s; }

        static readonly float[] G1_AX = { .5f, .3f, .25f, .45f, .28f, .5f, .5f, .38f, .3f }, G2_AX = { .42f, .24f, .45f, .45f, .25f, .5f, .45f, .25f, .5f };
        static readonly float[] GRUN_AX = { .544f, .551f, .522f, .510f, .553f, .573f, .536f, .522f, .606f, .629f, .612f, .609f, .576f, .623f, .618f, .605f, .620f, .603f, .590f, .591f, .595f, .601f, .591f, .591f, .575f, .567f, .565f, .583f, .542f, .559f, .578f, .577f };
        // 무명 with a gun: aim, fire, recoil, thrust, reload — and an eight-step run for each gun
        bool GunPose(Player p, out Sheet sh, out int fr, out float ax)
        {
            string w = sim.W.key; bool j = w == "jochong"; int b = w == "singi" ? 3 : w == "cheonja" ? 6 : 0; var g1 = Sheet.Get("gun1"); var g2 = Sheet.Get("gun2"); var gr = Sheet.Get("grun2");
            sh = j ? g1 : g2; fr = j ? 0 : b; ax = .5f; if (g1 == null || g2 == null) return false; var a = sim.aimNow;
            if (p.fireT > 0) fr = j ? 2 : b + 1;
            else if (p.focus && p.focusT > DB.Tuning.TAP_T) fr = j ? (a.y > .6f ? 5 : !p.onGround ? 8 : 1) : w == "singi" && a.y < -.5f ? 5 : w == "cheonja" && a.y > .5f ? 8 : b;
            else if (p.slashT > 0) fr = j ? 4 : b;
            else if (!p.onGround && sim.songPos - p.lastShotAt < .6f) fr = j ? 3 : w == "seungja" ? 2 : b;
            else if (p.reloadT > 0 && p.onGround && j) fr = 6;
            else if (!p.onGround) fr = j ? 8 : b;
            else if (Mathf.Abs(p.vx) > 40 && gr != null) { sh = gr; fr = (w == "seungja" ? 8 : w == "singi" ? 16 : w == "cheonja" ? 24 : 0) + Mathf.FloorToInt(p.run / 1.05f) % 8; ax = GRUN_AX[fr]; return true; }
            ax = (j ? G1_AX : G2_AX)[fr]; return true;
        }

        // [the lunge sheet?, frame]
        (bool cut, int f) Pose(Player p)
        {
            if (p.slashT > 0 && slash != null) return (true, p.slashDir.y < -.5f ? SF_UP : p.slashDir.y > .5f && !p.onGround ? SF_DOWN : SF_FWD);
            if (p.dashT > 0 || p.kanLungeT > 0) return (false, H.dash);
            if (!p.onGround) return (false, p.wall != 0 ? H.wall : p.vy < -150 ? H.rise : Mathf.Abs(p.vy) < 150 ? H.flip : H.fall);
            if (p.landT > 0) return (false, H.land);
            if (Mathf.Abs(p.vx) > 40) return (false, H.run[Mathf.FloorToInt(p.run / 1.05f) % H.run.Length]);
            return (false, H.idle);
        }

        public void Sync()
        {
            if (sheet == null) return;
            var p = sim.P; var (cut, f) = Pose(p); float cx = p.b.cx;
            bool onWall = !cut && f == H.wall; int face = onWall ? p.wall : p.face;
            sr.sprite = cut ? slash.Frame(f, SF_AX[f], 1f) : sheet.Frame(f, f < AX.Length ? AX[f] : .5f, 1f); sr.flipX = face < 0;
            float breathe = !cut && f == H.idle ? 1 + Mathf.Sin(Time.time / .38f) * .012f : 1, s = cut ? k * SLASH_K : k;
            if (!cut && run8 != null && System.Array.IndexOf(H.run, f) >= 0)   // on the ground and running: the eight-step run, sized to hero3's first run frame as on the web
            { int rf = Mathf.FloorToInt(p.run / 1.05f) % 8; sr.sprite = run8.Frame(rf, RUN8_AX[rf], 1f); s = k * sheet.FrameH(H.run[0]) / run8.FrameH(rf); }
            Sheet gs = null; int gf = 0; float gax = .5f; bool gun = sim.IsGun && sim.state != "dead" && GunPose(p, out gs, out gf, out gax);
            if (gun) { sr.sprite = gs.Frame(gf, gax, 1f); sr.flipX = p.face < 0; s = k * SLASH_K * .75f / .8f; breathe = 1; cut = true; }
            transform.localPosition = World.ToUnity(cx, p.b.y + p.b.h + 1, 0); transform.localScale = new Vector3(s, s * breathe, 1);
            float al = sim.state == "dead" ? Mathf.Max(0, 1 - sim.deathT / .75f) : sim.state == "over" ? 0 : p.invT > 0 ? (Mathf.FloorToInt(p.invT * 14) % 2 != 0 ? .35f : 1) : 1;
            sr.color = new Color(1, 1, 1, al);

            // one clean crescent of black ink, an afterimage of the swing a beat behind it
            bool cutting = p.slashT > 0 && sim.state == "play" && slash != null && !gun; arc.enabled = arcBack.enabled = cutting;
            if (cutting)
            {
                var d = p.slashDir; float prog = 1 - Mathf.Min(1, p.slashT / p.slashDur); int i = p.strike ? SF_ARC_RED : SF_ARC;
                bool left = d.x < -.2f; float ang = Mathf.Atan2(d.y, Mathf.Abs(d.x) < .2f ? .001f : Mathf.Abs(d.x)), hh = (p.strike ? 78 : 68) * (.9f + prog * .15f), sw = left ? -1 : 1;
                float ox = cx + d.x * 26, oy = p.b.cy - 2 + d.y * 24, rot = left ? -ang : ang, a0 = prog < .2f ? prog / .2f : Mathf.Min(1, (1 - prog) * 2.2f);
                Place(arc, i, ox, oy, rot, hh, left, a0);
                float r2 = rot - .42f * sw; Place(arcBack, i, ox - 6 * sw * Mathf.Cos(r2), oy - 6 * sw * Mathf.Sin(r2), r2, hh * .86f, left, a0 * .32f);
            }

            // 날: short strokes over the head, dark while sharp — shown only once the edge has been used
            int max = Mathf.Min(notch.Length, sim.EdgeNotches); bool show = sim.state == "play" && p.edge >= 0 && p.edge < max;
            for (int n = 0; n < notch.Length; n++)
            {
                notch[n].enabled = show && n < max; if (!notch[n].enabled) continue;
                notch[n].transform.localPosition = World.ToUnity(cx - (max - 1) * 4 + n * 8, p.b.y - 12, -1); notch[n].transform.localRotation = Quaternion.Euler(0, 0, 28);
                notch[n].transform.localScale = new Vector3(2.6f / World.T, 9f / World.T, 1); notch[n].color = n < p.edge ? new Color(.09f, .086f, .1f, 1) : p.edge < 1 ? new Color(.76f, .09f, .11f, .45f) : new Color(.09f, .086f, .1f, .2f);
            }
        }

        // 무아경: the world hushes under a wash of ink and the aim is brushed out from the body, a reticle where the dash will end
        public void SyncAim(Camera cam)
        {
            var p = sim.P; bool on = sim.state == "play" && p.focus && p.focusT > DB.Tuning.TAP_T; float want = on || sim.killCam > 0 ? (on ? .42f : .2f) : 0;
            hush = Mathf.MoveTowards(hush, want, Time.unscaledDeltaTime * 3); dim.enabled = hush > .01f;
            if (dim.enabled) { float h = cam.orthographicSize * 2 + 2, w = h * cam.aspect + 2; dim.color = new Color(.05f, .045f, .06f, hush); dim.transform.position = new Vector3(cam.transform.position.x - w / 2, cam.transform.position.y + h / 2, 1); dim.transform.localScale = new Vector3(w, h, 1); }
            var solid = Sheet.Get("hudsolid"); aimLine.enabled = reticle.enabled = on && solid != null; if (!aimLine.enabled) return;
            var d = sim.aimNow; float L = DB.Tuning.DASHV * .15f * (sim.run.Has("d_far") ? 1.8f : 1), cx = p.b.cx, cy = p.b.cy; var f = solid.Frames[3];
            aimLine.sprite = solid.Frame(3, 0, .5f); aimLine.transform.localPosition = World.ToUnity(cx + d.x * 14, cy + d.y * 14, -.6f); aimLine.transform.localRotation = Quaternion.Euler(0, 0, -Mathf.Atan2(d.y, d.x) * Mathf.Rad2Deg);
            aimLine.transform.localScale = new Vector3((L - 14) / World.T / (f.w / World.PPU), 10 / World.T / (f.h / World.PPU), 1); aimLine.color = new Color(1, 1, 1, .85f);
            float k = World.ScaleFor(30, solid.FrameH(4)); reticle.sprite = solid.Frame(4, .5f, .5f); reticle.transform.localPosition = World.ToUnity(cx + d.x * L, cy + d.y * L, -.6f); reticle.transform.localScale = new Vector3(k, k, 1); reticle.transform.localRotation = Quaternion.Euler(0, 0, Time.unscaledTime * 60);
        }
        float hush;

        void Place(SpriteRenderer r, int frame, float x, float y, float rot, float h, bool flip, float a)
        {
            r.sprite = slash.Frame(frame, .5f, .5f); r.flipX = flip; r.color = new Color(1, 1, 1, a); float s = World.ScaleFor(h, slash.FrameH(frame));
            r.transform.localPosition = World.ToUnity(x, y, -.5f); r.transform.localRotation = Quaternion.Euler(0, 0, -rot * Mathf.Rad2Deg); r.transform.localScale = new Vector3(s, s, 1);
        }
    }
}
