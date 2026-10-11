// The fight, in the web game's own terms (js/game.js): the cut and what it strikes, 간파 (the glint before a blow lands),
// 무아경 (time held while the dash is aimed) and 일섬, 숨 and being struck, 낙법, shots and turning them back, 기력, 기세 and 천고 기운.
// Everything is timed on the song position, as on the web, so blows fall on the 장단.
// The foes are in Sim.Foes.cs, the guardians and 천고난무 in Sim.Boss.cs.
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class Enemy : Box
    {
        public char type; public int id, hp, maxHp, face = -1; public bool alive = true, sleepy, kanpa, kanMua, flashOn, rush, ward, counter, elite, hidden;
        public float hitT, stunT, fvy, vx, vy, swingT, openT, tx, ty, aimFrom, readyAt, nextSwing, nextRush, castAt, castT, nextAt, fade = 1, nextThrust, lungeT, nextLunge, nextDrum, beatT;
        public float diveT, diveReady, dvx, dvy, hx, hy, t; public int wardBy = -1; public string ph = "idle";
        public float? fireAt, swingAt, thrustAt, dashAt, drumAt, diveAt, lastBlow;
        // guardians
        public string kind, act, lastAct, prevAct; public Boss B; public System.Random rng; public float floor, hitAt, stagT, guardT, softAt = -9, recoverUntil, chargeT, cv, emergeT, walkT, landT, turnT, turnWait, invisT, mv, fvx, swoopT, svx, svy, danceT, farT, actFrom, wph; public int softN, mask, comboLeft; public bool raged, suck, awake, air, bounced;
    }
    public class Shot { public float x, y, vx, vy, life, t, g, r, home, boom, seek, blast; public bool friendly, pierce, strike, red, noReflect, sniper, moon, core, blown; public Enemy owner; public HashSet<int> hits; public string look; }
    public class Hazard { public string kind; public float x, y, w, h, at, end, speed, max, t0; public bool done; }

    public partial class Sim
    {
        // 환도 (the weapon everyone starts with): js/content.js WEAPONS.hwando, js/tuning.js EDGE.hwando
        const float W_R = 1, W_REACH = 0, W_CD = .2f, W_DUR = .14f, EDGE_T = .55f; const int EDGE_BASE = 4;
        const float CLOSE = .35f, KAN_REACH = 300, FOCUS_LEN = 1.2f;   // the ring's approach before the glint opens · how far a 간파 돌진 reaches · how long 무아경 holds
        public const string SEAL = "#c3161c", JJOK = "#27466a";

        public readonly Level lv; public Player P; public readonly List<Enemy> foes = new List<Enemy>(); public readonly List<Shot> shots = new List<Shot>(); public readonly List<Hazard> haz = new List<Hazard>();
        public readonly HashSet<int> deadIds = new HashSet<int>();
        public string state = "play";   // play · dead · over (the last 숨 is gone)
        public float songPos, hitstop, shake, flash, flashDim, deathT, FLASH, time, killCam;
        public int nakN, kills, kanpaN, perfectN, deaths, hits; public string toast; public float toastT;
        public bool cleared; Vector2? lastHitDir; Enemy curFoe;
        public readonly Run run;
        readonly Tuning tu = DB.Tuning; readonly Fx fx; readonly Music mu;
        public float BeatLen => mu != null ? mu.BeatLen : .6f;
        public int breath { get => run.breath; set => run.breath = value; }
        int EdgeMax => EDGE_BASE + run.Stat("edge");
        public int EdgeNotches => EdgeMax;
        public int Cyc => run.cycle;

        public Sim(Level level, Run r, Fx effects, Music music)
        {
            lv = level; run = r ?? new Run(); fx = effects; mu = music; FLASH = tu.FLASH_BASE;
            P = NewPlayer();
            SpawnEnemies();
        }
        Player NewPlayer(System.Action<string, float, float, int> hook = null) => new Player(lv, lv.start.x, lv.start.y) { Fx = hook, AirJumps = run.Has("d_jump") ? 1 : 0, ExtraAir = run.Has("d_air") ? 1 : 0, SpeedMul = 1 + run.StatF("spd"), ClimbMul = run.Has("d_wall") ? 2 : 1, Gun = IsGun, Glide = run.Has("d_glide"), Bisang = run.Has("d_bisang"), Hover = run.Has("d_hover"), SpeedNow = () => run.Has("d_jilbo") ? 1 + .08f * Mathf.Min(5, P != null ? P.chain : 0) : 1 };

        // ---------- one frame (the web game's frameBody) ----------
        public void Frame(float rdt, PlayerInput inp)
        {
            if (state == "over") return;
            songPos = mu != null ? mu.Pos : songPos + rdt;
            FlashSync();
            if (state == "play") { P.ExtraAir = (run.Has("d_air") ? 1 : 0) + (run.Has("d_cheonbo") && run.qi >= 50 ? 1 : 0); FrameInput(rdt, inp); time += rdt; run.time += rdt; }
            if (chungo != null) StepChungo(rdt);
            if (bossIntro > 0) bossIntro -= rdt;
            float ts = 1;
            if (state == "play" && bossIntro > 0) ts = .03f;
            else if (hitstop > 0) { hitstop -= rdt; ts = .06f; }
            else if (state == "play" && P.focus) ts = IsGun && P.focusT > tu.TAP_T ? (run.Has("d_jeong") ? .35f : .5f) : run.Has("d_jeong") ? .07f : .12f;   // a gun aims on the move (half speed); a sword stills the world
            else if (state == "play" && killCam > 0) ts = .32f;
            if (state == "dead") ts = .3f;
            float wdt = rdt * ts; int n = Mathf.Max(1, Mathf.CeilToInt(wdt / (1f / 120))); float sdt = wdt / n;
            for (int i = 0; i < n; i++)
            {
                if (state == "play")
                {
                    bool aimed = P.aimDash && !P.tapDash && P.dashT > 0;
                    StepEdge(sdt); StepGun(sdt); StepMom(sdt); P.Step(sdt, inp); inp.jumpPressed = false;
                    if (aimed && P.dashT <= 0) AimDashEnded();
                    P.b.x = Mathf.Clamp(P.b.x, 0, lv.w * World.T - P.b.w);
                    DashCuts(); P.slashT = Mathf.Max(0, P.slashT - sdt); SlashHits(); StepWorld(sdt); PlayerHazards();
                }
                if (state == "play" || state == "dead") { StepEnemies(sdt); StepShots(sdt); if (state == "play") StepHazards(); }
                if (state != "play" && state != "dead") break;
            }
            inp.jumpPressed = inp.dashPressed = inp.slashPressed = inp.drumPressed = false;
            if (state == "dead") { deathT += rdt; if (deathT > .75f) AfterDeath(); }
            shake = Mathf.Max(0, shake - rdt * 40); flash = Mathf.Max(0, flash - rdt); flashDim = Mathf.Max(0, flashDim - rdt); killCam = Mathf.Max(0, killCam - rdt); P.chainPop = Mathf.Max(0, P.chainPop - rdt);
            if (toastT > 0) toastT -= rdt;
            mu?.SetRate(state == "play" && (P.focus || killCam > 0) ? .45f : 1 + .025f * MomTier);   // 기세: the 장단 quickens tier by tier; 무아경 slows it
        }
        public void Toast(string s) { toast = s; toastT = 2.6f; }
        void FlashSync() { FLASH = Mathf.Min(tu.FLASH_MAX + Mathf.Max(0, run.Diff.kan), tu.FLASH_BASE + run.Diff.kan + (run.Has("d_myeong") ? .15f : 0) + run.StatF("kanWin")) * (run.Has("d_calm") && breath <= 1 ? 2 : 1); }

        // where the hands point: the mouse or right stick if it is in use, else the held direction, else the way he faces
        public Vector2 AimDir(PlayerInput inp)
        {
            if (inp.hasAim && inp.aim.magnitude > .01f) { var a = inp.aim; a.Normalize(); return a; }
            var d = new Vector2(inp.x, inp.y); float m = d.magnitude; return m < .35f ? new Vector2(P.face, 0) : new Vector2(d.x / m, d.y / m);
        }
        public Vector2 aimNow = new Vector2(1, 0);

        // the hands, once a frame in real time: the cut, 무아경 (hold the dash to still the world and aim; a tap is a plain quick dash), 천고난무
        void FrameInput(float rdt, PlayerInput inp)
        {
            aimNow = AimDir(inp);
            if (bossIntro > 0) { inp.jumpPressed = inp.dashPressed = inp.slashPressed = inp.drumPressed = false; return; }   // the entrance card holds the hands
            if (inp.drumPressed && run.qi >= 100 && chungo == null) { if (!Chungo()) Toast("벨 적이 가까이 없다"); }
            if (inp.slashPressed) DoSlash(inp);
            if (inp.dashPressed && !P.focus && (GunReady || (P.dashCd <= 0 && (P.onGround || P.airDash > 0) && P.ki > .06f))) { P.focus = true; P.focusT = 0; P.focusGround = P.onGround || P.wall != 0; mu?.Muffle(true); }
            if (!P.focus && P.onGround) P.ki = Mathf.Min(1, P.ki + rdt * .9f * (1 + run.StatF("ki")));   // 기력 comes back with the feet on the ground
            if (P.focus && P.focusT > tu.TAP_T) P.ki = Mathf.Max(0, P.ki - rdt / (run.Has("d_jeong") ? 2.4f : 1.6f) * (run.Has("hw_c3") ? 2 : 1));   // and drains while time is held
            if (!P.focus) return;
            P.focusT += rdt; bool grounded = P.onGround && !P.focusGround;
            if (!inp.dashHeld || P.focusT > FOCUS_LEN * (IsGun ? 1.6f : 1) || grounded || P.ki <= 0)
            {
                bool tap = P.focusT < tu.TAP_T;   // a tap is a plain quick dash: no slow, no 일섬
                P.focus = false; P.focusGround = false; mu?.Muffle(false); P.tapDash = tap; if (!tap) P.aimedUntil = songPos + .45f;
                if (!tap && !P.onGround) P.aimChain++;
                var d = aimNow;
                if (IsGun && GunShot(tap, d)) return;
                if (KanLunge(d, true)) return;
                if (!tap && run.Has("d_sunbo") && Sunbo(d)) return;
                P.aimDash = true; if (!P.StartDash(d, true)) { P.aimDash = false; return; }
                if (run.Has("d_far") && !tap) P.dashT *= 1.8f;   // 장섬: the aimed dash runs longer
                mu?.Sfx("dash");
            }
        }

        // ---------- 날 · 기력 · 기세 · 천고 기운 ----------
        void StepEdge(float dt)
        {
            if (P.edge < 0) P.edge = EdgeMax;
            P.edgeIdle += dt; if (P.edge < EdgeMax && P.edgeIdle > .35f) { P.edgeT += dt; if (P.edgeT >= EDGE_T / (MomTier >= 3 ? 2 : 1) / (1 + run.StatF("edgeRate"))) { P.edgeT = 0; P.edge++; } }
        }
        void Whet(int n = 99) { P.edge = Mathf.Min(EdgeMax, (P.edge < 0 ? EdgeMax : P.edge) + n); }
        void ChainAdd(int n) { int g0 = Mathf.Min(5, P.chain); P.chain += n; P.chainPop = .25f; if (Mathf.Min(5, P.chain) > g0) mu?.Sfx("lantern"); }

        // 기세: reading and cutting build it, five tiers 一~五; a hit knocks it down a tier, idling lets it drain.
        // At 五 comes 무아지경 — six seconds where every common foe falls to any cut — then it bursts into the drum.
        public int MomTier => Mathf.Min(5, Mathf.FloorToInt(run.mom / 100));
        void MomAdd(float n)
        {
            if (run.trance > 0) return; int before = MomTier; run.mom = Mathf.Min(500, run.mom + n * (1 + run.StatF("gise"))); run.momAt = songPos;
            int t = MomTier; mu?.SetTier(t);
            if (t > before)
            {
                run.maxTier = Mathf.Max(run.maxTier, t); fx?.Pop(P.b.cx, P.b.y - 34, $"기세 {t}단", t >= 4 ? SEAL : "#17161a"); mu?.Sfx(t >= 3 ? "strike" : "lantern");
                if (t >= 5) { run.trance = 6; flash = .35f; shake = 12; mu?.Jing(); Toast("무아지경"); fx?.Add("ogA", 11, P.b.cx, P.b.cy, 220, life: .7f); }
            }
        }
        void MomHit() { run.mom = Mathf.Max(0, Mathf.Floor(run.mom / 100) * 100 - 100); run.trance = 0; mu?.SetTier(MomTier); }
        void StepMom(float dt)
        {
            if (run.trance > 0)
            {
                run.trance -= dt; if (run.trance > 0) return;
                run.trance = 0; run.mom = 300; AddQiRaw(50);   // the trance breaks into the drum
                float cx = P.b.cx, cy = P.b.cy; fx?.Add("gfx", 8, cx, P.b.y + P.b.h, 150, life: .6f, ay: 1); fx?.Ring(cx, cy, 160, Fx.Rgb(SEAL, .8f), .5f); shake = 10;
                foreach (var e in Nearest(cx, cy, 9, 170)) HurtEnemy(e, e.type != 'b' && !e.elite, "il");
                return;
            }
            if (songPos - run.momAt > 2 && run.mom > 0) run.mom = Mathf.Max(0, run.mom - dt * 18);
        }
        // 천고 기운: won by fighting well — 일섬, 간파, 과녁
        void AddQi(float n) { AddQiRaw(n * .6f * (1 + run.StatF("qi")) * (1 + .15f * Mathf.Min(8, P.chain))); }
        void AddQiRaw(float n) { float before = run.qi; run.qi = Mathf.Min(100, before + n); if (before < 100 && run.qi >= 100) { Toast("천고 기운이 찼다 · Q → 천고난무"); mu?.Jing(); } }

        // ---------- the cut ----------
        void DoSlash(PlayerInput inp)
        {
            if (P.slashCd > 0 || P.offBal > 0) return;
            if (P.edge < 0) P.edge = EdgeMax;
            if (!IsGun && P.edge < 1) { P.slashCd = .45f; P.edgeIdle = 0; fx?.Add("hud", Fx.HUD_SPARK, P.b.cx + P.face * 22, P.b.cy, 26, life: .2f); mu?.Sfx("clang"); return; }   // 날이 무뎌졌다
            if (!IsGun) { P.edge--; P.edgeIdle = 0; P.edgeT = 0; }
            Vector2 d; if (inp.hasAim && inp.aim.magnitude > .01f) { d = inp.aim; d.Normalize(); } else { d = new Vector2(inp.x, inp.y); float m = d.magnitude; d = m > .5f ? new Vector2(d.x / m, d.y / m) : new Vector2(P.face, 0); }
            // the drum no longer judges the hand: an 일격 comes from a read blow (간파), not from the beat
            P.slashDir = d; P.slashT = P.slashDur = W.dur; P.slashCd = W.cd; P.strike = false; P.hitSet.Clear(); P.clanged.Clear(); P.countered = false; run.slashes++;
            if (Mathf.Abs(d.x) > .2f) P.face = (int)Mathf.Sign(d.x);
            if (!P.onGround && P.vy > 60) P.vy = 60;
            mu?.Sfx("slash");
            if (fx != null)   // ink thrown off the blade's path
            {
                float tx = P.b.cx + d.x * 40, ty = P.b.cy + d.y * 34;
                for (int i = 0; i < 8; i++) { float a = Mathf.Atan2(d.y, d.x) + (Random.value - .5f) * 1.6f, v = 120 + Random.value * 260; fx.Part(tx, ty, Mathf.Cos(a) * v, Mathf.Sin(a) * v - 40, .35f, i % 4 != 0 ? lv.pal.fig : "#6b6670", 1.5f + Random.value * 2.5f); }
            }
        }

        void SlashHits()
        {
            if (P.slashT <= 0) return;
            float R = (P.strike ? 54 : 40) * W.R, reach = (P.strike ? 30 : 26) + W.reach; bool sword = !IsGun;
            float cx = P.b.cx + P.slashDir.x * reach, cy = P.b.cy + P.slashDir.y * reach;
            foreach (var e in foes)
            {
                if (!e.alive || Ghostly(e)) continue;
                float ex = Mathf.Max(e.x, Mathf.Min(cx, e.x + e.w)), ey = Mathf.Max(e.y, Mathf.Min(cy, e.y + e.h));
                if (Hyp(ex - cx, ey - cy) >= R) continue;
                if (!P.strike && !IsFlashing(e) && ((e.type == 'h' && Sgn(P.b.cx - e.cx) == e.face) || (e.type == 'k' && sword))) { if (P.clanged.Add(e.id)) Clang(e); continue; }   // the shield only covers his front
                if (!P.hitSet.Add(e.id)) continue;   // one hit per swing
                fx?.Add("perkfx", P.strike ? Fx.PF_SPARK : Fx.PF_SPLASH, e.cx, e.cy, P.strike ? 46 : 34, life: .22f, rot: Random.value * 6.28f, grow: .5f);
                bool kan0 = IsFlashing(e); HurtEnemy(e, P.strike);
                if (!sword) GunReload(1);   // a thrust that bites reloads a round
                if (sword && kan0 && !P.countered) CounterCut(e);   // 받아치기
                if (sword && !P.onGround && !P.airCutUsed) { P.airCutUsed = true; P.RegainAir(); }   // 연격: once in each flight a plain cut in the air wins the air back
            }
            foreach (var b in shots)
            {
                if (b.friendly || b.noReflect || b.life <= 0 || Hyp(b.x - cx, b.y - cy) >= R + 8) continue;
                float tti = Hyp(b.x - P.b.cx, b.y - P.b.cy) / Mathf.Max(1, Hyp(b.vx, b.vy));   // 정밀 튕기기: only a cut in the last instant turns it back
                if (!(tti < .15f * (run.Has("d_reflect") ? 2 : 1) * (sword ? 1.5f : 1) || P.strike)) { b.life = 0; fx?.Add("hud", Fx.HUD_SPARK, b.x, b.y, 18, life: .2f); continue; }
                fx?.Add("mech", Fx.MECH_DEFLECT, b.x, b.y, 54, life: .25f, grow: .3f); AddQi(4);
                b.friendly = true; b.pierce = P.strike || run.Has("d_reflect"); if (run.Has("d_reflect")) b.strike = true; if (run.Has("hw_c1")) b.seek = 8; if (run.Has("hw_c2")) { b.blast = 52; b.pierce = false; } b.life = 3; b.g = 0; b.home = 0; b.boom = 0;
                float sp = Mathf.Max(700, Hyp(b.vx, b.vy) * 1.1f); var o = b.owner;
                if (o != null && o.alive) { float dx = o.cx - b.x, dy = o.cy - b.y, dd = Mathf.Max(1, Hyp(dx, dy)); b.vx = dx / dd * sp; b.vy = dy / dd * sp; }
                else { b.vx = P.slashDir.x * sp; b.vy = P.slashDir.y * sp; }
                mu?.Sfx("reflect"); hitstop = Mathf.Max(hitstop, .04f);
                if (fx != null) for (int i = 0; i < 6; i++) fx.Part(b.x, b.y, (Random.value - .5f) * 300, (Random.value - .5f) * 300, .25f, JJOK, 2);
            }
        }
        void Clang(Enemy e)
        {
            P.vx = -Sgn(e.cx - P.b.cx) * 300; P.dashT = 0; if (!P.onGround) P.vy = Mathf.Min(P.vy, -150);
            if (fx != null) for (int i = 0; i < 8; i++) fx.Part(e.cx + e.face * 10, e.y + 12, (Random.value - .5f) * 300, -Random.value * 200, .25f, "#ffffff", 2);
            mu?.Sfx("clang"); shake = Mathf.Max(shake, 3);
        }

        // 환도 받아치기: a read blow answered by stepping through to the foe's back
        void CounterCut(Enemy e)
        {
            P.countered = true; P.counterT = .28f; float x0 = P.b.cx, y0 = P.b.cy, ex = e.cx; int side = ex == x0 ? P.face : Sgn(ex - x0);
            int far = run.Has("hw_a2") && ctrN >= 3 ? 2 : 1;   // 연환반격: farther, and the landing cuts
            lv.MoveX(P.b, ex + side * (e.w / 2 + 20) * far + (far > 1 ? side * 30 : 0) - P.b.w / 2 - P.b.x); P.face = -side;
            if (far > 1) foreach (var o in new List<Enemy>(foes)) if (o != e && o.alive && Hyp(o.cx - P.b.x, o.cy - P.b.y) < 80) HurtEnemy(o, false); P.vx = 0; P.invT = Mathf.Max(P.invT, .45f); P.RegainAir();
            if (run.Has("hw_b1")) clones.Add(new Clone { x = x0, y = P.b.y + P.b.h, face = side, t = .4f, ward = run.Has("hw_b2") ? 1.5f : 0 });   // 잔영 (· 잔영진)
            fx?.Trail(x0, y0, P.b.cx, P.b.cy, 6, .4f, Fx.WF_SMEAR); fx?.Add("wfx", Fx.WF_XCUT, ex, e.cy, e.type == 'b' ? 120 : 70, life: .35f, grow: .2f, rot: side * .3f);
            hitstop = Mathf.Max(hitstop, .07f); shake = Mathf.Max(shake, 6); mu?.Sfx("strike");
        }

        // 간파 돌진: a blow read from afar — dash toward a foe while it glints and the dash closes the distance in a single stride and cuts on the glint
        bool KanLunge(Vector2 d, bool own)
        {
            if (state != "play") return false;
            if (own && !P.onGround && P.airDash <= 0) return false;
            float cx = P.b.cx, cy = P.b.cy; Enemy t = null; float bs = -1;
            foreach (var e in foes)
            {
                if (!e.alive || Ghostly(e) || !IsFlashing(e)) continue; float dx = e.cx - cx, dy = e.cy - cy, L = Hyp(dx, dy);
                if (L > KAN_REACH + e.w / 2 || L < 1) continue;
                float c = (dx * d.x + dy * d.y) / L; bool sd = Mathf.Abs(d.y) < .5f && Sgn(dx) == (d.x != 0 ? Sgn(d.x) : P.face);   // aimed at it, or at least toward its side on the level
                float sc = c + (sd ? .4f : 0); if ((c > .55f || sd) && sc > bs && lv.Los(cx, cy, e.cx, e.cy)) { bs = sc; t = e; }
            }
            if (t == null) return false;
            if (own && !P.onGround) P.airDash--;
            int side = Sgn(t.cx - cx); float nx = t.cx - side * (t.w / 2 + 12) - P.b.w / 2, ny = Mathf.Min(P.b.y, t.y + t.h - P.b.h - .01f);
            if (!lv.RectSolid(nx, ny, P.b.w, P.b.h)) { P.b.x = nx; P.b.y = ny; }
            P.face = side; P.vx = side * 260; P.vy = Mathf.Min(P.vy, -120); P.invT = Mathf.Max(P.invT, .35f); P.dashHit.Clear(); P.dashHit.Add(t.id);
            fx?.Trail(cx, cy, P.b.cx, P.b.cy, 8, .35f, Fx.WF_STREAK); P.kanLungeT = .18f;
            HurtEnemy(t, false, "il"); mu?.Sfx("dash"); P.dashCd = Mathf.Max(P.dashCd, .2f); return true;
        }

        // the dash is a cut in itself: whatever stands within a blade's width of its line is struck once (aimed out of 무아경, it is an 일섬)
        void DashCuts()
        {
            if (P.dashT <= 0 || !P.aimDash) return; float cx = P.b.cx, cy = P.b.cy, wide = 30 * (run.Has("d_far") ? 2 : 1) * (run.Has("d_pajuk") ? 1 + .2f * Mathf.Min(5, P.chain) : 1);
            foreach (var e in foes) if (e.alive && !Ghostly(e) && !P.dashHit.Contains(e.id) && Mathf.Abs(e.cx - cx) < wide + e.w / 2 && Mathf.Abs(e.cy - cy) < wide + e.h / 2) { P.dashHit.Add(e.id); DashHurt(e); }
            if (run.Has("d_dangong")) foreach (var b in shots) if (!b.friendly && b.life > 0 && Hyp(b.x - cx, b.y - cy) < 46) { b.life = 0; fx?.Add("hud", Fx.HUD_SPARK, b.x, b.y, 20, life: .2f); }   // 단공: the cut takes even the red shots
        }
        // 분신난무: every 일섬 leaves a mark where it ends; three marks, and everything between them is cut
        readonly List<Vector2> marks = new List<Vector2>();
        void AimDashEnded()
        {
            if (!run.Has("hw_b3")) return; marks.Add(new Vector2(P.b.cx, P.b.cy)); fx?.Add("wfx", 7, P.b.cx, P.b.cy, 26, life: 3, grow: 0);
            if (marks.Count < 3) return;
            for (int i = 0; i < 3; i++)
            {
                var a = marks[i]; var b = marks[(i + 1) % 3]; float dx = b.x - a.x, dy = b.y - a.y, L = Mathf.Max(1, Hyp(dx, dy)); fx?.Trail(a.x, a.y, b.x, b.y, 6, .5f, 4);
                foreach (var o in new List<Enemy>(foes)) { if (!o.alive || Ghostly(o)) continue; float ex = o.cx - a.x, ey = o.cy - a.y, t = (ex * dx + ey * dy) / L; if (t > 0 && t < L && Mathf.Abs(ex * dy - ey * dx) / L < Mathf.Max(o.w, o.h) / 2 + 8) { if (o.type != 'b') HurtEnemy(o, true); else HurtEnemy(o, true, null, true); } }
            }
            float mx = (marks[0].x + marks[1].x + marks[2].x) / 3, my = (marks[0].y + marks[1].y + marks[2].y) / 3; marks.Clear();
            flash = .2f; shake = 12; mu?.Sfx("strike"); fx?.Add("ogA", 1, mx, my, 220, life: .6f); fx?.Banner("분신난무", "오의");
        }
        // 순보: the aimed release steps through to the back of the foe it points at, and cuts
        bool Sunbo(Vector2 d)
        {
            float cx = P.b.cx, cy = P.b.cy; Enemy t = null; float bs = 1e9f;
            foreach (var e in foes)
            {
                if (!e.alive || Ghostly(e)) continue; float dx = e.cx - cx, dy = e.cy - cy, L = Hyp(dx, dy); if (L > 230 || L < 8) continue;
                if ((dx * d.x + dy * d.y) / L < .88f || !lv.Los(cx, cy, e.cx, e.cy)) continue; if (L < bs) { bs = L; t = e; }
            }
            if (t == null) return false;
            int side = Sgn(t.cx - cx); float nx = t.cx + side * (t.w / 2 + 16) - P.b.w / 2, ny = t.y + t.h - P.b.h - .01f;
            if (lv.RectSolid(nx, ny, P.b.w, P.b.h)) return false;
            fx?.Trail(cx, cy, nx + P.b.w / 2, ny + P.b.h / 2, 5, .25f, Fx.WF_SMEAR);
            P.b.x = nx; P.b.y = ny; P.vx = 0; P.vy = -120; P.face = -side; if (!P.onGround) P.airDash = Mathf.Max(0, P.airDash - 1);
            P.aimedUntil = songPos + .45f; P.aimDash = true; HurtEnemy(t, false, "il"); P.aimDash = false; P.dashCd = .55f;   // a bodily step: it lands a cut, not the full 일격
            mu?.Sfx("dash"); return true;
        }
        void DashHurt(Enemy e) => HurtEnemy(e, false, P.aimDash && !P.tapDash ? "il" : null);
        void DashThrough(Enemy e) { if (state == "play" && P.dashT > 0 && e.alive && e.Overlaps(P.b) && P.dashHit.Add(e.id)) DashHurt(e); }
        bool ViaMua => P.aimDash && !P.tapDash;

        // ---------- 간파: the glint before a blow lands ----------
        public bool Ghostly(Enemy e) => (e.type == 'r' && e.ph == "gone") || e.hidden;
        float? BlowAt(Enemy e)   // when this foe's blow lands (null when nothing is coming)
        {
            if (e == null || !e.alive) return null;
            if (e.type == 'b') return e.act != null && !e.hidden && e.act != "gamtu" && e.act != "mask" ? e.hitAt : (float?)null;
            var t = e.fireAt ?? e.thrustAt ?? e.swingAt ?? e.dashAt ?? e.drumAt ?? e.diveAt; if (t != null) return t;
            if (e.type == 'm') return e.castAt;
            if (e.type == 'r') return e.ph == "rise" ? e.nextAt : (float?)null;
            return null;
        }
        public bool IsFlashing(Enemy e) { if (e != null && e.alive && e.openT > songPos) return true; var t = BlowAt(e); return t != null && songPos >= t - FLASH && songPos < t + .06f; }
        public float PreFlash(Enemy e) { var t = BlowAt(e); return t != null && songPos >= t - FLASH - CLOSE && songPos < t - FLASH ? (songPos - (t.Value - FLASH - CLOSE)) / CLOSE : 0; }
        // 0 → 1 over the ring's whole approach (-1 when there is nothing to show)
        public float KanRing(Enemy e)
        {
            if (Ghostly(e)) return -1;
            if (e.openT > songPos) return .75f + .25f * (1 - (e.openT - songPos) / .7f);
            var t = BlowAt(e); if (t == null || (PreFlash(e) <= 0 && !IsFlashing(e))) return -1;
            return Mathf.Clamp01((songPos - (t.Value - FLASH - CLOSE)) / (CLOSE + FLASH));
        }
        void KanEdges(Enemy e)   // the glint opening and closing: a struck note as it opens, and the moment it shut is remembered (a cut just after fizzles)
        {
            bool on = IsFlashing(e);
            if (!on && e.flashOn) { e.flashOn = false; e.lastBlow = songPos; }
            if (on && !e.flashOn) { e.flashOn = true; if (Hyp(e.x - P.b.x, e.y - P.b.y) < 520) { flashDim = .04f; mu?.Sfx("clang"); } }
        }
        // what the held 간파 비급 give back for one read blow
        void KanPerks(Enemy e)
        {
            if (state != "play") return; float x = e.cx, y = e.cy;
            if (run.Has("d_beat")) P.airDash++;
            if (run.Has("d_breathe")) { P.ki = 1; ChainAdd(2); }
            if (run.Has("d_ward")) wardT = 1.5f;
            if (run.Has("d_freeze")) bulletHold = Mathf.Max(bulletHold, 1.2f);
            if (run.Has("hw_a1")) { ctrN = songPos < ctrUntil ? ctrN + 1 : 1; ctrUntil = songPos + .8f; AddQi(4 * ctrN); if (ctrN >= 2) { fx?.Pop(x, e.y - 16, $"연쇄 {ctrN}", SEAL); mu?.Sfx(ctrN >= 4 ? "strike" : "reflect"); } if (ctrN == 5 && run.Has("hw_a3")) IlseomCheon(); }   // 역습 · 일섬천격
            if (run.Has("d_tan")) { foreach (var b in shots) if (!b.friendly && b.life > 0 && Hyp(b.x - P.b.cx, b.y - P.b.cy) < 260) { b.life = 0; fx?.Add("hud", Fx.HUD_SPARK, b.x, b.y, 18, life: .2f); } }
            if (run.Has("d_zanshin")) { int n = 0; foreach (var o in foes) if (o.alive && o != e && Hyp(o.cx - x, o.cy - y) < 320) { o.openT = songPos + .7f; n++; } if (n > 0) fx?.Ring(x, y, 150, new Color(.09f, .086f, .1f, .65f), .35f); }
            if (run.Has("d_breath") && kanpaN % 5 == 0 && breath < run.BreathCap) { breath++; Toast("혈로 · 숨 하나를 되찾았다"); }
        }

        // ---------- striking a foe ----------
        void HurtEnemy(Enemy e, bool strike, string kind = null, bool heavy = false)
        {
            if (!e.alive || Ghostly(e)) return;
            bool kan = IsFlashing(e);
            if (e.type == 'b' && !e.hidden && (strike || kan)) fx?.Add("bvfx", 4, e.cx, e.cy, e.h * .9f, life: .35f, rot: Random.value * .6f - .3f);
            if (kan)
            {
                strike = true; e.kanpa = true; e.kanMua = ViaMua; kanpaN++; run.kanpa++;
                float x = e.cx, y = e.cy; bool big = e.type == 'b'; var bt = BlowAt(e); bool perfect = bt != null && songPos >= bt - .09f;   // 간파: the crossed cut, gold flakes, the world holds a beat
                MomAdd(perfect || IsGun ? tu.MOM_PERFECT : tu.MOM_KAN); mu?.Accent(perfect); if (IsGun) { GunReload(99); P.heat = 0; P.overheat = 0; }   // a read shot: the gun is full again
                if (perfect) { fx?.Pop(x, y - 46, "완벽 간파", SEAL); hitstop = Mathf.Max(hitstop, .16f); fx?.Seal(x, y - 10, (Random.value - .5f) * .3f, true); mu?.Sfx("strike"); mu?.Jing(); flashDim = .1f; perfectN++; run.perfectN++; }
                fx?.Add("kfx", Fx.KF_XCUT, x, y, big ? 120 : 64, life: .4f, grow: .15f, rot: Random.value * .6f - .3f); fx?.Add("kfx", Fx.KF_FLAKES, x, y, big ? 130 : 80, life: .5f, grow: .5f);
                hitstop = Mathf.Max(hitstop, .1f); shake = Mathf.Max(shake, 7);
            }
            else if (e.lastBlow != null && songPos - e.lastBlow < .3f) { fx?.Add("kfx", Fx.KF_FIZZLE, e.cx, e.y + e.h * .35f, 46, life: .45f, grow: .2f); fx?.Add("kring", Fx.KR_DRIP, e.cx, e.y + e.h * .42f, 30, life: .5f, grow: .1f, a: .6f); e.lastBlow = null; }   // just too late: a grey fizzle
            if (e.type == 'a' && e.counter && kind == "il" && !kan && Sgn(P.b.cx - e.cx) == e.face)   // 자객 받아치기: an 일섬 straight into his stance is turned on you
            { fx?.Add("mech", Fx.MECH_DEFLECT, e.cx + e.face * 14, e.y + 14, 60, life: .3f); mu?.Sfx("clang"); P.dashT = 0; lastHitDir = new Vector2(e.face, -.4f); curFoe = e; Die(); return; }
            if (e.ward && !strike) { e.ward = false; fx?.Add("hud", Fx.HUD_SPARK, e.cx, e.y + 6, 40, life: .3f); mu?.Sfx("clang"); return; }   // 무당's talisman takes the cut instead
            if (e.type == 'b') { HurtBoss(e, strike, kind, kan, heavy); return; }
            if (run.trance > 0) strike = true;   // 무아지경
            if (!strike && MomTier >= 4 && e.elite) e.hp--;   // 기세 四: elites give way
            if (strike || e.hp <= 1) { KillEnemy(e); return; }
            e.hp--; e.hitT = .22f;
            fx?.Add("fx", Fx.FX_DROPS, e.cx, e.cy - 4, 22, life: .4f, rot: Random.value * 6.28f);
            if (e.type != 'd') lv.MoveX(e, Sgn(e.cx - P.b.cx) * 10); else e.vx += Sgn(e.cx - P.b.cx) * 160;
            hitstop = Mathf.Max(hitstop, .04f); mu?.Sfx("clang"); shake = Mathf.Max(shake, 3);
        }

        void KillEnemy(Enemy e)
        {
            if (!e.alive) return;
            e.alive = false; deadIds.Add(e.id); kills++; run.kills++;
            MomAdd(P.dashT > 0 || P.aimDash ? tu.MOM_KILL_MOVING : tu.MOM_KILL); if (MomTier >= 2) run.honBonus += MomTier >= 4 ? 2 : 1;
            bool lastOne = e.type != 'b'; foreach (var o in foes) if (o.alive && o.type != 'i') lastOne = false;
            if (lastOne) { killCam = Mathf.Max(killCam, 1.1f); hitstop = Mathf.Max(hitstop, .18f); shake = Mathf.Max(shake, 8); mu?.Jing(); }   // the last of the gate falls slowly
            if (e.type == 'm') foreach (var o in foes) if (o.wardBy == e.id) o.ward = false;
            AddQi(3); if (state == "play") ChainAdd(1);
            if (e.elite && state == "play") { AddQi(12); P.ki = 1; fx?.Add("wfx", 8, e.cx, e.cy, 80, life: .4f, grow: .3f); }   // 정예: worth the trouble
            if (e.kanpa && e.type != 'b' && state == "play")   // 간파: cut down on the glint — its shot dies with it
            {
                bool mua = e.kanMua; AddQi((run.Has("d_beat") ? 2 : 1) * (mua ? 2 : 1) * 15); P.RegainAir(); Whet(); P.ki = Mathf.Min(1, P.ki + .5f); if (mua) ChainAdd(1); KanPerks(e);
                foreach (var b in shots) if (b.owner == e && !b.friendly) b.life = 0;
                if (e.type == 'k')   // the drum falls silent: everyone near falters
                {
                    foreach (var o in foes) if (o.alive && o != e && Hyp(o.x - e.x, o.y - e.y) < 320) { o.stunT = Mathf.Max(o.stunT, 1.2f); o.fireAt = o.swingAt = o.thrustAt = o.dashAt = null; }
                    fx?.Ring(e.cx, e.cy, 160, Fx.Rgb(JJOK, .7f), .45f); AddQi(15);
                }
                hitstop = Mathf.Max(hitstop, .06f); if (mua) killCam = Mathf.Max(killCam, .5f);
            }
            if ((ViaMua || P.aimedUntil > songPos) && state == "play")   // what an aimed-dash kill gives back
            {
                AddQi(run.Has("d_giseom") ? 18 : 9); run.aimK++; P.ki = Mathf.Min(1, P.ki + .3f); Whet(1);
                P.airDash = Mathf.Max(P.airDash, P.BaseAirDash + (run.Has("d_sun") ? 1 : 0)); P.dashCd = 0;   // only an aimed kill gives the air dash back (연환: one more)
                if (run.Has("d_chain") && !inChain) { var nx = Nearest(e.cx, e.cy, 2, 170).Find(o => o != e); if (nx != null) { inChain = true; fx?.Trail(e.cx, e.cy, nx.cx, nx.cy, 4, .3f, Fx.WF_STREAK); HurtEnemy(nx, nx.type != 'b'); inChain = false; } }   // 뇌인: one hop, never a chain of chains
            }
            if (run.Has("hyeol") && run.kills % 10 == 0 && breath < run.BreathCap) { breath++; Toast("혈로 · 숨 하나를 되찾았다"); }
            if (e.type == 'b') { BossFell(e); }
            float cx = e.cx, cy = e.cy;
            if (fx != null)
            {
                for (int i = 0; i < 20; i++) { float a = Random.value * Mathf.PI * 2, v = 60 + Random.value * 320; fx.Part(cx, cy, Mathf.Cos(a) * v, Mathf.Sin(a) * v - 60, .6f, i % 5 != 0 ? lv.pal.tile : SEAL, 2 + Random.value * 4); }
                fx.Bleed(lv, cx, cy, P.slashT > 0 ? P.slashDir : new Vector2(Sgn(cx - P.b.cx), -.2f), false);
            }
            hitstop = Mathf.Max(hitstop, .07f); shake = Mathf.Max(shake, 6); P.dashCd = 0;
            mu?.Sfx("kill", MomTier);
        }
        bool inChain;
        public List<Enemy> Nearest(float x, float y, int n, float r)
        {
            var l = new List<Enemy>(); foreach (var e in foes) if (e.alive && !Ghostly(e) && Hyp(e.cx - x, e.cy - y) < r) l.Add(e);
            l.Sort((a, b) => Hyp(a.cx - x, a.cy - y).CompareTo(Hyp(b.cx - x, b.cy - y))); if (l.Count > n) l.RemoveRange(n, l.Count - n); return l;
        }

        // ---------- shots ----------
        void StepShots(float dt)
        {
            float px = P.b.x + 3, py = P.b.y + 3, pw = P.b.w - 6, ph = P.b.h - 6;
            for (int k = 0; k < shots.Count; k++)
            {
                var b = shots[k]; if (b.life <= 0) continue;
                b.t += dt; if (b.g != 0) b.vy += b.g * dt; SteerShot(b, dt); int n = Mathf.Max(1, Mathf.CeilToInt(Hyp(b.vx, b.vy) * dt / 8));
                for (int i = 0; i < n && b.life > 0; i++)
                {
                    float bk = !b.friendly && bulletHold > 0 ? 0 : !b.friendly && P.focus ? 2.6f : 1;   // the aim slows the world, but shots still close in
                    b.x += b.vx * dt / n * bk; b.y += b.vy * dt / n * bk;
                    if (lv.SolidPt(b.x, b.y) && !b.moon && !(b.look == "fan" && !b.friendly)) { b.life = 0; fx?.Add("hud", Fx.HUD_SPARK, b.x, b.y, 22, life: .25f, rot: Random.value * 6.28f); break; }
                    if (b.friendly)
                    {
                        foreach (var e in foes)
                        {
                            if (!e.alive || Ghostly(e) || b.x <= e.x - b.r || b.x >= e.x + e.w + b.r || b.y <= e.y - b.r || b.y >= e.y + e.h + b.r) continue;
                            if (b.hits != null && b.hits.Contains(e.id)) continue;
                            if (e.type == 'h' && Sgn(b.vx) == -e.face && !b.pierce) { b.life = 0; mu?.Sfx("clang"); break; }
                            if (b.blast > 0) { b.life = 0; break; }   // rockets, balls and turned shots that carry powder burst on the first body
                            (b.hits ??= new HashSet<int>()).Add(e.id); HurtEnemy(e, b.strike || b.pierce); if (!b.pierce) b.life = 0;
                            if (b.life <= 0) break;
                        }
                    }
                    else if (state == "play" && !(P.invT > 0) && b.x > px - 3 - b.r && b.x < px + pw + 3 + b.r && b.y > py - 3 - b.r && b.y < py + ph + 3 + b.r)
                    {
                        if (run.Has("hw_c3") && P.focus && !b.noReflect)   // 역류: held in 무아경, the shot turns back on its shooter
                        {
                            var o = b.owner; float s2 = Hyp(b.vx, b.vy) * 1.3f; b.friendly = true; b.pierce = true; b.life = 3; b.home = 0; b.boom = 0;
                            if (o != null && o.alive) { float dx = o.cx - b.x, dy = o.cy - b.y, dd = Mathf.Max(1, Hyp(dx, dy)); b.vx = dx / dd * s2; b.vy = dy / dd * s2; } else { b.vx = -b.vx; b.vy = -b.vy; }
                            mu?.Sfx("reflect"); break;
                        }
                        float sp = Mathf.Max(1, Hyp(b.vx, b.vy)); lastHitDir = new Vector2(b.vx / sp, b.vy / sp); curFoe = b.owner; Die(); b.life = 0;
                    }
                }
                b.life -= dt;
            }
            for (int k = 0; k < shots.Count; k++) { var b = shots[k]; if (b.friendly && b.blast > 0 && b.life <= 0 && !b.blown) { b.blown = true; Blast(b.x, b.y, b.blast, b.strike, b.core); } }
            shots.RemoveAll(b => b.life <= 0);
        }

        // ---------- the ground's own dangers ----------
        bool HurtsPlayer => state == "play" && P.dashT <= 0 && !(P.invT > 0);
        void StepHazards()
        {
            foreach (var z in haz)
            {
                if (z.kind == "ring")
                {
                    float r = (songPos - z.at) * z.speed; if (r < 0) continue;
                    if (r > z.max) { z.done = true; continue; }
                    float d = Hyp(P.b.cx - z.x, P.b.cy - z.y);
                    if (HurtsPlayer && Mathf.Abs(d - r) < 14) { lastHitDir = new Vector2(Sgn(P.b.x - z.x), -.3f); Die(); }
                    continue;
                }
                if (songPos > z.end) { z.done = true; continue; }
                if (songPos >= z.at && HurtsPlayer && P.b.x + 3 < z.x + z.w && P.b.x + P.b.w - 3 > z.x && P.b.y + 3 < z.y + z.h && P.b.y + P.b.h - 3 > z.y) { lastHitDir = new Vector2(0, -1); Die(); }
            }
            haz.RemoveAll(z => z.done);
        }
        Hazard AddHaz(string kind, float x, float y, float w, float h, float at, float end) { var z = new Hazard { kind = kind, x = x, y = y, w = w, h = h, at = at, end = end, t0 = songPos }; haz.Add(z); return z; }

        void PlayerHazards()
        {
            float x = P.b.x + 2, y = P.b.y + 2, w = P.b.w - 4, h = P.b.h - 4;
            int x0 = Mathf.FloorToInt(x / World.T), x1 = Mathf.FloorToInt((x + w) / World.T), y0 = Mathf.FloorToInt(y / World.T), y1 = Mathf.FloorToInt((y + h) / World.T);
            for (int ty = y0; ty <= y1; ty++) for (int tx = x0; tx <= x1; tx++)
                if (lv.TileAt(tx, ty) == 2 && x < tx * World.T + World.T - 4 && x + w > tx * World.T + 4 && y < ty * World.T + World.T && y + h > ty * World.T + 14) { Die("fall"); return; }   // thorns
            if (P.b.y > lv.h * World.T + 80) { Die("fall"); return; }
            if (lv.exit.width > 0 && lv.exit.Overlaps(new Rect(x, y, w, h)) && !BossAlive) cleared = true;
        }

        // ---------- 숨: being struck, falling, 낙법 ----------
        public string lastCause;
        static readonly Dictionary<char, string> FOE_NAME = new Dictionary<char, string> { ['p'] = "순라", ['g'] = "포수", ['s'] = "저격수", ['h'] = "등패수", ['a'] = "자객", ['k'] = "북잡이", ['d'] = "매", ['m'] = "무당", ['r'] = "저승사자" };
        public static string NameOf(Enemy e) => e == null ? "함정" : e.type == 'b' ? e.B.name : FOE_NAME.TryGetValue(e.type, out var n) ? n : "적";
        bool Ward(float t, string msg)
        {
            P.invT = t; P.focus = false; mu?.Muffle(false); P.dashT = 0; shake = Mathf.Max(shake, 7); flash = .15f; hitstop = Mathf.Max(hitstop, .06f); mu?.Sfx("clang");
            fx?.Ring(P.b.cx, P.b.cy, 110, Fx.Rgb(SEAL, .6f), .35f); Toast(msg); lastHitDir = null; return true;
        }
        bool GuardBlow(string kind)   // 방어 비급: what takes the blow instead of a 숨
        {
            if (kind == "fall")
            {
                int free = (run.Has("d_nakbeop") ? 2 : 1) + tu.FREE_FALLS - 1;
                if (nakN < free && P.hasSafe) { nakN++; P.b.x = P.safe.x; P.b.y = P.safe.y; P.vx = P.vy = 0; return Ward(1.2f, nakN < free ? $"낙법 · 딛던 땅으로 ({free - nakN}번 남음)" : "낙법 · 딛던 땅으로"); }
                return false;
            }
            if (run.Has("d_gihyeol") && run.qi >= 50) { run.qi = 0; return Ward(1, "기혈 · 천고 기운이 대신 흩어졌다"); }
            if (run.Has("d_gise") && P.chain >= 3) { P.chain = 0; return Ward(.9f, "기세 · 연속 처치가 대신 끊겼다"); }
            return false;
        }
        public void Die(string kind = null, int dmg = 1)
        {
            if (state != "play" || P.invT > 0) return;
            lastCause = kind == "fall" ? "낭떠러지" : NameOf(curFoe);
            if (GuardBlow(kind)) return;
            if (kind != "fall") { MomHit(); hits++; run.gateHits++; }
            if (kind != "fall")
            {
                if (run.Has("d_janmyeong") && breath - dmg <= 0 && !run.janUsed) { run.janUsed = true; breath = dmg + 1; Toast("잔명 · 끊길 숨을 붙들었다"); }
                if (breath - dmg > 0)
                {
                    breath -= dmg; var d = lastHitDir ?? new Vector2(-P.face, -.3f); lastHitDir = null;
                    P.invT = tu.HIT_INVULN; P.vx = (d.x != 0 ? Mathf.Sign(d.x) : -P.face) * 340; P.vy = -300; P.onGround = false; P.dashT = 0; P.focus = false; mu?.Muffle(false); P.chain = 0;
                    fx?.Bleed(lv, P.b.cx, P.b.cy, d, false);
                    if (run.Has("d_ganggi")) { wardT = 1.5f; foreach (var b in shots) if (!b.friendly && Hyp(b.x - P.b.x, b.y - P.b.y) < 340) b.life = 0; fx?.Ring(P.b.cx, P.b.cy, 150, new Color(.09f, .086f, .1f, .7f), .4f); }   // 호신강기
                    shake = 9; flash = .3f; hitstop = Mathf.Max(hitstop, .08f); mu?.Sfx("die"); return;
                }
            }
            state = "dead"; deathT = 0; deaths++; run.deaths++; breath--; P.focus = false; mu?.Muffle(false);
            float cx = P.b.cx, cy = P.b.cy;
            if (fx != null)
            {
                for (int i = 0; i < 30; i++) { float a = Random.value * Mathf.PI * 2, v = 80 + Random.value * 340; fx.Part(cx, cy, Mathf.Cos(a) * v, Mathf.Sin(a) * v - 80, .8f, i % 4 != 0 ? lv.pal.fig : SEAL, 2 + Random.value * 4); }
                fx.Bleed(lv, cx, cy, lastHitDir ?? new Vector2(-P.face, -.3f), true);
            }
            lastHitDir = null; shake = 12; mu?.Sfx("die");
        }

        void AfterDeath()
        {
            if (breath <= 0) { state = "over"; return; }
            shots.Clear(); haz.Clear(); clones.Clear(); chungo = null; bossIntro = 0; SealArena(null, false);   // back to the last lantern passed (or the start of the gate); those cut down since then stand again
            deadIds.Clear(); if (cpIdx >= 0) foreach (int id in run.cp) deadIds.Add(id);
            var hook = P.Fx; P = NewPlayer(hook); if (cpIdx >= 0) { P.b.x = lv.cps[cpIdx].x - 9; P.b.y = lv.cps[cpIdx].y - 30.01f; }
            SpawnEnemies(); state = "play";
        }

        static float Hyp(float x, float y) => Mathf.Sqrt(x * x + y * y);
        static int Sgn(float v) => v >= 0 ? 1 : -1;
    }
}
