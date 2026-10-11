// 무명's body: the web game's stepPlayer movement, ported line for line (run, jump with buffer and coyote time,
// variable height, ledges you drop through, wall slide, wall run, wall kick and the jump it buys, the dash and its air count).
// Combat (cuts, 간파, guns, 무아경 aiming) comes in the next steps.
using UnityEngine;

namespace Cheongo
{
    public class Player
    {
        public readonly Box b = new Box { w = 18, h = 30 };
        public float vx, vy; public int face = 1; public bool onGround;
        public float coyote, jumpBuf, wallLock, wallT, climbT = .5f, dashT, dashCd, dropT, landT, run;
        public int wall, wallMem, airDash = 1, wallBonus, djN; public bool climbing;
        public Vector2 dashDir = new Vector2(1, 0);
        public System.Action<string, float, float, int> Fx;   // effect hooks: "jump", "land", "dash", "wall", "air"
        readonly Level lv; readonly Tuning tu;
        public int AirJumps = 0;   // 2단 점프 (비급 · 무녀): extra jumps in the air

        public Player(Level level, float x, float y) { lv = level; tu = DB.Tuning; b.x = x; b.y = y; }
        int BaseAir => 1;
        float MaxV => tu.MAXV;
        static float Approach(float v, float t, float a) => v < t ? Mathf.Min(t, v + a) : Mathf.Max(t, v - a);

        public void Step(float dt, PlayerInput inp)
        {
            int ix = inp.x > .3f ? 1 : inp.x < -.3f ? -1 : 0;
            dashCd = Mathf.Max(0, dashCd - dt); dropT = Mathf.Max(0, dropT - dt); landT = Mathf.Max(0, landT - dt);
            if (inp.jumpPressed && onGround && inp.y > .5f && lv.OnLedge(b)) { dropT = .25f; b.y += 3; onGround = false; inp.jumpPressed = false; }   // down + jump: drop through a ledge
            if (inp.jumpPressed) jumpBuf = .18f;
            if (inp.dashPressed) TryDash(inp);

            if (dashT > 0)
            {
                dashT -= dt; vx = dashDir.x * tu.DASHV; vy = dashDir.y * tu.DASHV;
                float pb = b.y + b.h; bool hx = lv.MoveX(b, vx * dt), hy = lv.MoveY(b, vy * dt);
                if (!hy && vy > 0 && !(dropT > 0)) { var top = lv.LedgeBelow(b, pb); if (top != null) { b.y = top.Value - b.h - .001f; hy = true; } }
                if (dashT <= 0 || hx || hy) { dashT = 0; vx = dashDir.x * MaxV * 1.35f; vy = dashDir.y * 380; }
            }
            else
            {
                if (wallLock > 0) wallLock -= dt;
                else
                {
                    if (onGround) vx = (ix != 0 && Mathf.Sign(vx) == ix && Mathf.Abs(vx) > MaxV) ? Approach(vx, ix * MaxV, 1400 * dt) : Approach(vx, ix * MaxV, (ix != 0 ? 2600 : 2400) * dt);
                    else if (ix != 0) vx = (Mathf.Sign(vx) == ix && Mathf.Abs(vx) > MaxV) ? Approach(vx, ix * MaxV, 450 * dt) : Approach(vx, ix * MaxV, 1800 * dt);
                    else vx = Approach(vx, 0, 320 * dt);
                    if (ix != 0) face = ix;
                }
                if (jumpBuf > 0)
                {
                    if (onGround || coyote > 0) { vy = -tu.JUMPV; Fx?.Invoke("jump", b.x + b.w / 2, b.y + b.h + 2, face); onGround = false; coyote = 0; jumpBuf = 0; }
                    else if (wall != 0 || wallT > 0) { int wd = wall != 0 ? wall : wallMem; wallT = 0; vy = -600; vx = -wd * 380; face = -wd; wallLock = .15f; jumpBuf = 0; wallBonus = 1; climbT = Mathf.Max(climbT, .35f); Fx?.Invoke("wall", wd > 0 ? b.x + b.w : b.x, b.y + b.h * .7f, wd); }
                    else if (wallBonus > 0) { wallBonus = 0; vy = -tu.JUMPV * .92f; jumpBuf = 0; Fx?.Invoke("air", b.x + b.w / 2, b.y + b.h, face); }   // a wall kick buys one more jump
                    else if (djN < AirJumps) { vy = -tu.JUMPV * .9f; djN++; jumpBuf = 0; Fx?.Invoke("air", b.x + b.w / 2, b.y + b.h, face); }
                }
                float g = tu.GRAV; if (vy < 0 && !inp.jumpHeld && wallLock <= 0 && !climbing) g *= 2.1f;   // let go early: a shorter jump
                vy = Mathf.Min(1000, vy + g * dt);
                if (wall != 0 && vy > 0 && ix == wall) vy = Mathf.Min(vy, 130);   // pressing into a wall slows the fall
                climbing = wall != 0 && ix == wall && climbT > 0 && wallLock <= 0;   // wall run: for a moment you carry on up it
                if (climbing) { vy = Mathf.Min(vy, -tu.CLIMBV); climbT -= dt; }
                lv.MoveX(b, vx * dt);
                float pb = b.y + b.h;
                if (lv.MoveY(b, vy * dt)) vy = 0;
                else if (vy > 0 && !(dropT > 0)) { var top = lv.LedgeBelow(b, pb); if (top != null) { b.y = top.Value - b.h - .001f; vy = 0; } }
            }

            bool was = onGround;
            onGround = vy >= 0 && (lv.RectSolid(b.x, b.y + b.h, b.w, 2) || (!(dropT > 0) && lv.OnLedge(b)));
            if (onGround && !was) { landT = .12f; Fx?.Invoke("land", b.x + b.w / 2, b.y + b.h, face); }
            if (onGround) { coyote = .14f; airDash = BaseAir; climbT = tu.CLIMB_T; if (Mathf.Abs(vx) > 20) run += dt * Mathf.Abs(vx) * .045f; }
            else coyote = Mathf.Max(0, coyote - dt);
            bool wl = lv.RectSolid(b.x - 3, b.y + 4, 3, b.h - 8), wr = lv.RectSolid(b.x + b.w, b.y + 4, 3, b.h - 8);
            wall = onGround ? 0 : wr ? 1 : wl ? -1 : 0;
            if (wall != 0) { wallMem = wall; wallT = .12f; } else wallT = Mathf.Max(0, wallT - dt);   // a wall kick still works a moment after slipping off
            if (onGround || wall != 0) djN = 0;
            if (onGround) wallBonus = 0;
            if (wall != 0) airDash = Mathf.Max(airDash, BaseAir);
            jumpBuf = Mathf.Max(0, jumpBuf - dt);
        }

        void TryDash(PlayerInput inp)
        {
            if (dashCd > 0 || dashT > 0) return;
            if (!onGround) { if (airDash <= 0) return; airDash--; }
            var d = new Vector2(inp.x, inp.y); if (d.magnitude < .5f) d = new Vector2(face, 0); d.Normalize();
            if (onGround && d.y > .2f) d = new Vector2(d.x == 0 ? face : Mathf.Sign(d.x), 0);
            Fx?.Invoke("dash", b.x + b.w / 2 - d.x * 26, b.y + b.h / 2 - d.y * 26, Mathf.Abs(d.x) > .2f ? (int)Mathf.Sign(d.x) : face);
            dashDir = d; bool fromGround = onGround; dashT = .15f;
            if (fromGround) dashCd = Mathf.Max(dashCd, .45f);   // on the ground the dash is free of the air count, so it cools a little longer
            if (Mathf.Abs(d.x) > .2f) face = (int)Mathf.Sign(d.x);
        }
    }

    // one frame of the hands: axes (-1..1, y down as in the world) and the buttons pressed this frame
    public class PlayerInput { public float x, y; public bool jumpPressed, jumpHeld, dashPressed, slashPressed; }
}
