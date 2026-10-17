// 연, as on the web (js/game.js findHook and the 연 press): the kite nearest ahead within reach and in clear sight is the one the line
// would catch; the 연 button (or a jump in the air with no jump left) kicks 무명 toward it and up, the string snapping taut for a blink,
// and gives back the air dash.
using UnityEngine;

namespace Cheongo
{
    public partial class Sim
    {
        public Vector2? kite;                 // what the line would catch now
        public float kiteFlashT; public Vector2 kiteFrom, kiteTo;
        float hookCd;

        Vector2? FindKite()
        {
            float cx = P.b.cx, cy = P.b.cy, bs = 1e9f; Vector2? best = null;
            foreach (var p in lv.points)
            {
                float dx = p.x - cx, dy = p.y - cy, d = Mathf.Sqrt(dx * dx + dy * dy);
                if (d > tu.HOOK_R || d < 24 || !lv.Los(cx, cy, p.x, p.y)) continue;
                float s = d - (dx * P.face > 0 ? 70 : 0) - (dy < 0 ? 40 : 0);
                if (s < bs) { bs = s; best = p; }
            }
            return best;
        }

        // once a frame, before the other hands: true if the line was thrown (the press is spent)
        bool KiteInput(float rdt, PlayerInput inp)
        {
            hookCd = Mathf.Max(0, hookCd - rdt); if (kiteFlashT > 0) kiteFlashT -= rdt;
            kite = lv.points.Count > 0 ? FindKite() : null;
            if (kite == null || hookCd > 0) { inp.hookPressed = false; return false; }
            // a jump in the air with nothing left to jump from catches the kite too
            bool airJump = inp.jumpPressed && !P.onGround && P.coyote <= 0 && P.wall == 0 && P.wallT <= 0 && P.wallBonus == 0 && P.djN >= P.AirJumps;
            if (!inp.hookPressed && !airJump) return false;
            inp.hookPressed = false; inp.jumpPressed = false;
            var k = kite.Value; float cx = P.b.cx, cy = P.b.cy, dx = k.x - cx, dy = k.y - cy, d = Mathf.Max(1, Mathf.Sqrt(dx * dx + dy * dy));
            P.dashT = 0; P.focus = false; mu?.Muffle(false); mu?.Sfx("hook");
            P.vx = dx / d * 620; P.vy = Mathf.Min(dy / d * 620, 0) - 560; P.onGround = false; P.coyote = 0; P.jumpBuf = 0;
            P.airDash = 1 + P.ExtraAir; hookCd = .35f; if (Mathf.Abs(P.vx) > 40) P.face = (int)Mathf.Sign(P.vx);
            kiteFrom = new Vector2(cx, cy); kiteTo = k; kiteFlashT = .18f;
            for (int i = 0; i < 4; i++) fx?.Part(k.x, k.y, (Random.value - .5f) * 160, (Random.value - .5f) * 120, .4f, "#2d5a7b", 2 + Random.value * 2);
            return true;
        }
    }
}
