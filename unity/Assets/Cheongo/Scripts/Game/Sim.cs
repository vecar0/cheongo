// The fight, in the web game's own terms (js/game.js): the cut and what it strikes, 간파 (the glint before a blow lands),
// 숨 and being struck, 낙법, shots and turning them back, and the first two foes — 순라 (saber) and 포수 (musket).
// Everything is timed on the song position, as on the web, so blows fall on the 장단.
// Still to come: 무아경 aiming and 일섬, 기세, the other foes, guardians, 비급.
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class Enemy : Box
    {
        public char type; public int id, hp, maxHp, face = -1; public bool alive = true, sleepy, kanpa, flashOn, rush;
        public float hitT, stunT, fvy, vx, swingT, openT, tx, ty, aimFrom, readyAt, nextSwing, nextRush;
        public float? fireAt, swingAt, lastBlow;
    }
    public class Shot { public float x, y, vx, vy, life, t; public bool friendly, pierce, strike; public Enemy owner; public HashSet<int> hits; }

    public class Sim
    {
        // 환도 (the only weapon until 비급 and weapons are ported): js/content.js WEAPONS.hwando, js/tuning.js EDGE.hwando and TYPE_HP
        const float W_R = 1, W_REACH = 0, W_CD = .2f, W_DUR = .14f, EDGE_T = .55f; const int EDGE_MAX = 4;
        static int TypeHp(char t) => t == 'p' || t == 'm' || t == 'r' ? 2 : t == 'h' || t == 'k' ? 3 : 1;
        const float CLOSE = .35f, KAN_REACH = 300;   // the ring's approach before the glint opens · how far a 간파 돌진 reaches
        public const string SEAL = "#c3161c", JJOK = "#27466a";

        public readonly Level lv; public Player P; public readonly List<Enemy> foes = new List<Enemy>(); public readonly List<Shot> shots = new List<Shot>();
        public readonly HashSet<int> deadIds = new HashSet<int>();
        public string state = "play";   // play · dead · over (the last 숨 is gone)
        public float songPos, hitstop, shake, flash, flashDim, deathT, FLASH, time;
        public int breath, nakN, kills, kanpaN, perfectN, deaths; public string toast; public float toastT;
        public bool cleared; Vector2? lastHitDir;
        readonly Tuning tu = DB.Tuning; readonly Fx fx; readonly Music mu;
        public float BeatLen => mu != null ? mu.BeatLen : .6f;

        public Sim(Level level, int breathNow, Fx effects, Music music)
        {
            lv = level; breath = breathNow; fx = effects; mu = music; FLASH = tu.FLASH_BASE;
            P = new Player(lv, lv.start.x, lv.start.y) { DashHook = d => KanLunge(d, true) };
            SpawnEnemies();
        }

        void SpawnEnemies()
        {
            foes.Clear();
            foreach (var d in lv.foes)
            {
                if (deadIds.Contains(d.id) || (d.type != 'p' && d.type != 'g')) continue;   // the other kinds come with the next step
                int hp = TypeHp(d.type);
                var e = d.type == 'p' ? new Enemy { x = d.tx * World.T + 5, y = (d.ty + 1) * World.T - 44, w = 22, h = 44 }   // 순라: a patrol saber
                    : new Enemy { x = d.tx * World.T + 5, y = (d.ty + 1) * World.T - 42, w = 22, h = 42, readyAt = songPos + tu.ENTRY_FIRE_DELAY + Random.value * .8f };
                e.type = d.type; e.id = d.id; e.hp = e.maxHp = hp;
                if (Mathf.Sqrt((e.x - lv.start.x) * (e.x - lv.start.x) + (e.y - lv.start.y) * (e.y - lv.start.y)) < tu.START_SLEEP_R) e.sleepy = true;   // foes near where you walk in hold until you make the first move
                foes.Add(e);
            }
        }

        // ---------- one frame (the web game's frameBody) ----------
        public void Frame(float rdt, PlayerInput inp)
        {
            if (state == "over") return;
            songPos = mu != null ? mu.Pos : songPos + rdt;
            if (state == "play") { if (inp.slashPressed) DoSlash(inp); time += rdt; }
            float ts = 1;
            if (hitstop > 0) { hitstop -= rdt; ts = .06f; }
            if (state == "dead") ts = .3f;
            float wdt = rdt * ts; int n = Mathf.Max(1, Mathf.CeilToInt(wdt / (1f / 120))); float sdt = wdt / n;
            for (int i = 0; i < n; i++)
            {
                if (state == "play")
                {
                    StepEdge(sdt); P.Step(sdt, inp); inp.jumpPressed = inp.dashPressed = inp.slashPressed = false;
                    P.b.x = Mathf.Clamp(P.b.x, 0, lv.w * World.T - P.b.w);
                    DashCuts(); P.slashT = Mathf.Max(0, P.slashT - sdt); SlashHits(); PlayerHazards();
                }
                if (state == "play" || state == "dead") { StepEnemies(sdt); StepShots(sdt); }
                if (state != "play" && state != "dead") break;
            }
            inp.jumpPressed = inp.dashPressed = inp.slashPressed = false;
            if (state == "dead") { deathT += rdt; if (deathT > .75f) AfterDeath(); }
            shake = Mathf.Max(0, shake - rdt * 40); flash = Mathf.Max(0, flash - rdt); flashDim = Mathf.Max(0, flashDim - rdt); P.chainPop = Mathf.Max(0, P.chainPop - rdt);
            if (toastT > 0) toastT -= rdt;
        }
        void Toast(string s) { toast = s; toastT = 2.4f; }

        // ---------- 날: the edge dulls with wild swinging and comes back with a moment's rest ----------
        void StepEdge(float dt)
        {
            if (P.edge < 0) P.edge = EDGE_MAX;
            P.edgeIdle += dt; if (P.edge < EDGE_MAX && P.edgeIdle > .35f) { P.edgeT += dt; if (P.edgeT >= EDGE_T) { P.edgeT = 0; P.edge++; } }
        }
        void Whet() { P.edge = EDGE_MAX; }
        void ChainAdd(int n) { int g0 = Mathf.Min(5, P.chain); P.chain += n; P.chainPop = .25f; if (Mathf.Min(5, P.chain) > g0) mu?.Sfx("lantern"); }

        // ---------- the cut ----------
        void DoSlash(PlayerInput inp)
        {
            if (P.slashCd > 0 || P.offBal > 0) return;
            if (P.edge < 0) P.edge = EDGE_MAX;
            if (P.edge < 1) { P.slashCd = .45f; P.edgeIdle = 0; fx?.Add("hud", Fx.HUD_SPARK, P.b.cx + P.face * 22, P.b.cy, 26, life: .2f); mu?.Sfx("clang"); return; }   // 날이 무뎌졌다
            P.edge--; P.edgeIdle = 0; P.edgeT = 0;
            var d = new Vector2(inp.x, inp.y); float m = d.magnitude; d = m > .5f ? new Vector2(d.x / m, d.y / m) : new Vector2(P.face, 0);
            // the drum no longer judges the hand: an 일격 comes from a read blow (간파), not from the beat
            P.slashDir = d; P.slashT = P.slashDur = W_DUR; P.slashCd = W_CD; P.strike = false; P.hitSet.Clear(); P.countered = false;
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
            float R = (P.strike ? 54 : 40) * W_R, reach = (P.strike ? 30 : 26) + W_REACH;
            float cx = P.b.cx + P.slashDir.x * reach, cy = P.b.cy + P.slashDir.y * reach;
            foreach (var e in foes)
            {
                if (!e.alive) continue;
                float ex = Mathf.Max(e.x, Mathf.Min(cx, e.x + e.w)), ey = Mathf.Max(e.y, Mathf.Min(cy, e.y + e.h));
                if (Hyp(ex - cx, ey - cy) >= R) continue;
                if (!P.hitSet.Add(e.id)) continue;   // one hit per swing
                fx?.Add("perkfx", P.strike ? Fx.PF_SPARK : Fx.PF_SPLASH, e.cx, e.cy, P.strike ? 46 : 34, life: .22f, rot: Random.value * 6.28f, grow: .5f);
                bool kan0 = IsFlashing(e); HurtEnemy(e, P.strike);
                if (kan0 && !P.countered) CounterCut(e);   // 받아치기
                if (!P.onGround && !P.airCutUsed) { P.airCutUsed = true; P.RegainAir(); }   // 연격: once in each flight a plain cut in the air wins the air back
            }
            foreach (var b in shots)
            {
                if (b.friendly || b.life <= 0 || Hyp(b.x - cx, b.y - cy) >= R + 8) continue;
                float tti = Hyp(b.x - P.b.cx, b.y - P.b.cy) / Mathf.Max(1, Hyp(b.vx, b.vy));   // 정밀 튕기기: only a cut in the last instant turns it back
                if (!(tti < .15f * 1.5f || P.strike)) { b.life = 0; fx?.Add("hud", Fx.HUD_SPARK, b.x, b.y, 18, life: .2f); continue; }
                fx?.Add("mech", Fx.MECH_DEFLECT, b.x, b.y, 54, life: .25f, grow: .3f);
                b.friendly = true; b.pierce = P.strike; b.life = 3;
                float sp = Mathf.Max(700, Hyp(b.vx, b.vy) * 1.1f); var o = b.owner;
                if (o != null && o.alive) { float dx = o.cx - b.x, dy = o.cy - b.y, dd = Mathf.Max(1, Hyp(dx, dy)); b.vx = dx / dd * sp; b.vy = dy / dd * sp; }
                else { b.vx = P.slashDir.x * sp; b.vy = P.slashDir.y * sp; }
                mu?.Sfx("reflect"); hitstop = Mathf.Max(hitstop, .04f);
                if (fx != null) for (int i = 0; i < 6; i++) fx.Part(b.x, b.y, (Random.value - .5f) * 300, (Random.value - .5f) * 300, .25f, JJOK, 2);
            }
        }

        // 환도 받아치기: a read blow answered by stepping through to the foe's back
        void CounterCut(Enemy e)
        {
            P.countered = true; P.counterT = .28f; float x0 = P.b.cx, y0 = P.b.cy, ex = e.cx; int side = ex - x0 >= 0 ? 1 : -1; if (ex == x0) side = P.face;
            lv.MoveX(P.b, ex + side * (e.w / 2 + 20) - P.b.w / 2 - P.b.x); P.face = -side; P.vx = 0; P.invT = Mathf.Max(P.invT, .45f); P.RegainAir();
            fx?.Trail(x0, y0, P.b.cx, P.b.cy, 6, .4f, Fx.WF_SMEAR); fx?.Add("wfx", Fx.WF_XCUT, ex, e.cy, 70, life: .35f, grow: .2f, rot: side * .3f);
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
                if (!e.alive || !IsFlashing(e)) continue; float dx = e.cx - cx, dy = e.cy - cy, L = Hyp(dx, dy);
                if (L > KAN_REACH + e.w / 2 || L < 1) continue;
                float c = (dx * d.x + dy * d.y) / L; bool sd = Mathf.Abs(d.y) < .5f && (dx >= 0 ? 1 : -1) == (d.x != 0 ? (d.x > 0 ? 1 : -1) : P.face);   // aimed at it, or at least toward its side on the level
                float sc = c + (sd ? .4f : 0); if ((c > .55f || sd) && sc > bs && lv.Los(cx, cy, e.cx, e.cy)) { bs = sc; t = e; }
            }
            if (t == null) return false;
            if (own && !P.onGround) P.airDash--;
            int side = t.cx - cx >= 0 ? 1 : -1; float nx = t.cx - side * (t.w / 2 + 12) - P.b.w / 2, ny = Mathf.Min(P.b.y, t.y + t.h - P.b.h - .01f);
            if (!lv.RectSolid(nx, ny, P.b.w, P.b.h)) { P.b.x = nx; P.b.y = ny; }
            P.face = side; P.vx = side * 260; P.vy = Mathf.Min(P.vy, -120); P.invT = Mathf.Max(P.invT, .35f); P.dashHit.Clear(); P.dashHit.Add(t.id);
            fx?.Trail(cx, cy, P.b.cx, P.b.cy, 8, .35f, Fx.WF_STREAK); P.kanLungeT = .18f;
            HurtEnemy(t, false); mu?.Sfx("dash"); P.dashCd = Mathf.Max(P.dashCd, .2f); return true;
        }

        // ---------- 간파: the glint before a blow lands ----------
        float? BlowAt(Enemy e) => e == null || !e.alive ? null : e.fireAt ?? e.swingAt;   // when this foe's blow lands (null when nothing is coming)
        public bool IsFlashing(Enemy e) { if (e != null && e.alive && e.openT > songPos) return true; var t = BlowAt(e); return t != null && songPos >= t - FLASH && songPos < t + .06f; }
        public float PreFlash(Enemy e) { var t = BlowAt(e); return t != null && songPos >= t - FLASH - CLOSE && songPos < t - FLASH ? (songPos - (t.Value - FLASH - CLOSE)) / CLOSE : 0; }
        // 0 → 1 over the ring's whole approach (-1 when there is nothing to show)
        public float KanRing(Enemy e)
        {
            var t = BlowAt(e); if (t == null || (PreFlash(e) <= 0 && !IsFlashing(e))) return -1;
            return Mathf.Clamp01((songPos - (t.Value - FLASH - CLOSE)) / (CLOSE + FLASH));
        }
        void KanEdges(Enemy e)   // the glint opening and closing: a struck note as it opens, and the moment it shut is remembered (a cut just after fizzles)
        {
            bool on = IsFlashing(e);
            if (!on && e.flashOn) { e.flashOn = false; e.lastBlow = songPos; }
            if (on && !e.flashOn) { e.flashOn = true; if (Hyp(e.x - P.b.x, e.y - P.b.y) < 520) { flashDim = .04f; mu?.Sfx("clang"); } }
        }

        // ---------- foes ----------
        void HurtEnemy(Enemy e, bool strike)
        {
            if (!e.alive) return;
            bool kan = IsFlashing(e);
            if (kan)
            {
                strike = true; e.kanpa = true; kanpaN++;
                float x = e.cx, y = e.cy; var bt = BlowAt(e); bool perfect = bt != null && songPos >= bt - .09f;   // 간파: the crossed cut, gold flakes, the world holds a beat
                mu?.Accent(perfect);
                if (perfect) { fx?.Pop(x, y - 46, "완벽 간파", SEAL); hitstop = Mathf.Max(hitstop, .16f); fx?.Seal(x, y - 10, (Random.value - .5f) * .3f, true); mu?.Sfx("strike"); mu?.Jing(); flashDim = .1f; perfectN++; }
                fx?.Add("kfx", Fx.KF_XCUT, x, y, 64, life: .4f, grow: .15f, rot: Random.value * .6f - .3f); fx?.Add("kfx", Fx.KF_FLAKES, x, y, 80, life: .5f, grow: .5f);
                hitstop = Mathf.Max(hitstop, .1f); shake = Mathf.Max(shake, 7);
            }
            else if (e.lastBlow != null && songPos - e.lastBlow < .3f) { fx?.Add("kfx", Fx.KF_FIZZLE, e.cx, e.y + e.h * .35f, 46, life: .45f, grow: .2f); fx?.Add("kring", Fx.KR_DRIP, e.cx, e.y + e.h * .42f, 30, life: .5f, grow: .1f, a: .6f); e.lastBlow = null; }   // just too late: a grey fizzle
            if (strike || e.hp <= 1) { KillEnemy(e); return; }
            e.hp--; e.hitT = .22f;
            fx?.Add("fx", Fx.FX_DROPS, e.cx, e.cy - 4, 22, life: .4f, rot: Random.value * 6.28f);
            lv.MoveX(e, (e.cx - P.b.cx >= 0 ? 1 : -1) * 10);
            hitstop = Mathf.Max(hitstop, .04f); mu?.Sfx("clang"); shake = Mathf.Max(shake, 3);
        }

        void KillEnemy(Enemy e)
        {
            if (!e.alive) return;
            e.alive = false; deadIds.Add(e.id); kills++;
            if (state == "play") ChainAdd(1);
            if (e.kanpa && state == "play")   // 간파: cut down on the glint — its shot dies with it
            {
                P.RegainAir(); Whet();
                foreach (var b in shots) if (b.owner == e && !b.friendly) b.life = 0;
                hitstop = Mathf.Max(hitstop, .06f);
            }
            float cx = e.cx, cy = e.cy;
            if (fx != null)
            {
                for (int i = 0; i < 20; i++) { float a = Random.value * Mathf.PI * 2, v = 60 + Random.value * 320; fx.Part(cx, cy, Mathf.Cos(a) * v, Mathf.Sin(a) * v - 60, .6f, i % 5 != 0 ? lv.pal.tile : SEAL, 2 + Random.value * 4); }
                fx.Bleed(lv, cx, cy, P.slashT > 0 ? P.slashDir : new Vector2(cx - P.b.cx >= 0 ? 1 : -1, -.2f), false);
            }
            hitstop = Mathf.Max(hitstop, .07f); shake = Mathf.Max(shake, 6); P.dashCd = 0;
            mu?.Sfx("kill");
        }

        bool SleepyWake() => Mathf.Abs(P.b.x - lv.start.x) > 48 || P.dashT > 0 || P.slashT > 0 || songPos > tu.START_SLEEP_T;   // the first move (or eight seconds) wakes the foes near the start
        float NextBeat() { float bl = BeatLen, t = (Mathf.Floor(songPos / bl) + 1) * bl; if (t - songPos < .5f) t += bl; return t; }
        public Vector2 Muzzle(Enemy e) => new Vector2(e.cx + e.face * 32, e.y + 6);

        void StepEnemies(float dt)
        {
            float pcx = P.b.cx, pcy = P.b.cy, bl = BeatLen; bool live = state == "play";
            foreach (var e in foes)
            {
                if (!e.alive) continue;
                lv.Unstick(e); KanEdges(e);
                if (e.hitT > 0) e.hitT -= dt;
                {   // walkers fall: a foe shoved off a ledge drops instead of hanging in the air
                    float f = e.y + e.h;
                    if (!lv.GroundPt(e.x + 3, f + 1) && !lv.GroundPt(e.x + e.w - 3, f + 1))
                    {
                        e.fvy = Mathf.Min(900, e.fvy + 1900 * dt);
                        if (lv.MoveY(e, e.fvy * dt)) e.fvy = 0; else { var l = lv.LedgeBelow(e, f); if (l != null) { e.y = l.Value - e.h - .001f; e.fvy = 0; } }
                        if (e.y > lv.h * World.T + 60) { KillEnemy(e); continue; }
                    }
                    else e.fvy = 0;
                }
                if (e.stunT > 0) { e.stunT -= dt; DashThrough(e); continue; }
                float ecx = e.cx, ecy = e.cy, dist = Hyp(pcx - ecx, pcy - ecy);
                if (e.type == 'p') { StepSunra(e, dt, pcx, pcy, dist, live, bl); continue; }
                // 포수: aims, and fires on the beat
                const float range = 560, lead = .45f, lockT = .15f;
                bool sees = live && dist < range && lv.Los(ecx, e.y + 8, pcx, pcy);
                if (sees) e.face = pcx - ecx >= 0 ? 1 : -1;
                if (e.fireAt != null)
                {
                    if (songPos < e.fireAt - lockT && sees) { e.tx = pcx; e.ty = pcy; }
                    if (!sees && songPos < e.fireAt - lockT) { e.fireAt = null; e.readyAt = songPos + .3f; }
                    else if (songPos >= e.fireAt)
                    {
                        var mz = Muzzle(e); float dx = e.tx - mz.x, dy = e.ty - mz.y, d = Mathf.Max(1, Hyp(dx, dy)); const float sp = 430;
                        shots.Add(new Shot { x = mz.x, y = mz.y, vx = dx / d * sp, vy = dy / d * sp, owner = e, life = 3 });
                        fx?.Add("hud", Fx.HUD_SMOKE, mz.x + e.face * 8, mz.y - 4, 30, life: .9f, grow: .9f, a: .8f, flip: e.face < 0);   // powder smoke
                        e.fireAt = null; e.readyAt = songPos + 2 * bl;
                        mu?.Sfx("shoot");
                    }
                }
                else if (sees && songPos >= e.readyAt && !(e.sleepy && (e.sleepy = !SleepyWake())))
                {
                    e.fireAt = Mathf.Ceil((songPos + lead) / bl) * bl; e.aimFrom = songPos; e.tx = pcx; e.ty = pcy;
                }
                DashThrough(e);
            }
        }

        // 순라: walks in and swings on the beat; from mid-range he comes in with the blow
        void StepSunra(Enemy e, float dt, float pcx, float pcy, float dist, bool live, float bl)
        {
            if (e.sleepy && (e.sleepy = !SleepyWake())) { e.face = pcx - e.cx >= 0 ? 1 : -1; return; }   // waiting: watching, not yet coming
            float ecx = e.cx; bool sees = live && dist < 400 && Mathf.Abs(pcy - e.cy) < 90 && lv.Los(ecx, e.y + 8, pcx, pcy);
            e.swingT = Mathf.Max(0, e.swingT - dt);
            if (sees && e.swingAt == null) e.face = pcx - ecx >= 0 ? 1 : -1;
            if (sees && e.swingAt == null && dist > 46) { float ahead = ecx + e.face * 14; if (lv.GroundPt(ahead, e.y + e.h + 4) && !lv.SolidPt(ahead, e.y + 10)) lv.MoveX(e, e.face * 70 * dt); }
            if (sees && e.swingAt == null && dist < 76 && songPos >= e.nextSwing) { e.swingAt = NextBeat(); e.rush = false; }
            else if (sees && e.swingAt == null && dist > 130 && dist < 270 && songPos >= e.nextSwing && songPos >= e.nextRush) { e.swingAt = NextBeat(); e.rush = true; e.nextRush = songPos + 5 * bl; }   // 돌진 베기: it glints from afar
            if (e.swingAt != null && songPos >= e.swingAt)
            {
                if (e.rush) { e.rush = false; float gap = Mathf.Min(Mathf.Max(0, Mathf.Abs(pcx - ecx) - 40), 200); fx?.Trail(ecx, e.cy, ecx + e.face * gap, e.cy, 5, .3f, Fx.WF_STREAK); lv.MoveX(e, e.face * gap); }
                float zx = e.cx;
                fx?.Add("fx", Fx.FX_SLASH_A, zx + e.face * 36, e.cy, 64, life: .25f, rot: e.face > 0 ? 0 : Mathf.PI); mu?.Sfx("slash"); e.swingT = .3f;
                if (live && P.b.Overlaps(e.face > 0 ? zx : zx - 70, e.y - 4, 70, e.h + 4)) { lastHitDir = new Vector2(e.face, -.3f); Die(); }
                e.swingAt = null; e.nextSwing = songPos + 2.5f * bl;
            }
            if (live && e.Overlaps(P.b) && !(P.dashT > 0)) P.vx = (pcx - ecx >= 0 ? 1 : -1) * 260;   // bodies shove
            DashThrough(e);
        }

        // the dash is a cut in itself: whatever stands within a blade's width of its line is struck once
        void DashCuts()
        {
            if (P.dashT <= 0) return; float cx = P.b.cx, cy = P.b.cy; const float wide = 30;
            foreach (var e in foes) if (e.alive && !P.dashHit.Contains(e.id) && Mathf.Abs(e.cx - cx) < wide + e.w / 2 && Mathf.Abs(e.cy - cy) < wide + e.h / 2) { P.dashHit.Add(e.id); HurtEnemy(e, false); }
        }

        // a dash cuts whatever it passes through — a plain cut, unless the foe is glinting
        void DashThrough(Enemy e) { if (state == "play" && P.dashT > 0 && e.alive && e.Overlaps(P.b) && P.dashHit.Add(e.id)) HurtEnemy(e, false); }

        // ---------- shots ----------
        void StepShots(float dt)
        {
            float px = P.b.x + 3, py = P.b.y + 3, pw = P.b.w - 6, ph = P.b.h - 6;
            foreach (var b in shots)
            {
                if (b.life <= 0) continue;
                b.t += dt; int n = Mathf.Max(1, Mathf.CeilToInt(Hyp(b.vx, b.vy) * dt / 8));
                for (int i = 0; i < n && b.life > 0; i++)
                {
                    b.x += b.vx * dt / n; b.y += b.vy * dt / n;
                    if (lv.SolidPt(b.x, b.y)) { b.life = 0; fx?.Add("hud", Fx.HUD_SPARK, b.x, b.y, 22, life: .25f, rot: Random.value * 6.28f); break; }
                    if (b.friendly)
                    {
                        foreach (var e in foes)
                        {
                            if (!e.alive || b.x <= e.x || b.x >= e.x + e.w || b.y <= e.y || b.y >= e.y + e.h) continue;
                            if (b.hits != null && b.hits.Contains(e.id)) continue;
                            (b.hits ??= new HashSet<int>()).Add(e.id); HurtEnemy(e, b.strike || b.pierce); if (!b.pierce) b.life = 0;
                            if (b.life <= 0) break;
                        }
                    }
                    else if (state == "play" && !(P.invT > 0) && b.x > px - 3 && b.x < px + pw + 3 && b.y > py - 3 && b.y < py + ph + 3)
                    {
                        float sp = Mathf.Max(1, Hyp(b.vx, b.vy)); lastHitDir = new Vector2(b.vx / sp, b.vy / sp); Die(); b.life = 0;
                    }
                }
                b.life -= dt;
            }
            shots.RemoveAll(b => b.life <= 0);
        }

        // ---------- 숨: being struck, falling, 낙법 ----------
        void PlayerHazards()
        {
            float x = P.b.x + 2, y = P.b.y + 2, w = P.b.w - 4, h = P.b.h - 4;
            int x0 = Mathf.FloorToInt(x / World.T), x1 = Mathf.FloorToInt((x + w) / World.T), y0 = Mathf.FloorToInt(y / World.T), y1 = Mathf.FloorToInt((y + h) / World.T);
            for (int ty = y0; ty <= y1; ty++) for (int tx = x0; tx <= x1; tx++)
                if (lv.TileAt(tx, ty) == 2 && x < tx * World.T + World.T - 4 && x + w > tx * World.T + 4 && y < ty * World.T + World.T && y + h > ty * World.T + 14) { Die("fall"); return; }   // thorns
            if (P.b.y > lv.h * World.T + 80) { Die("fall"); return; }
            if (lv.exit.Overlaps(new Rect(x, y, w, h))) cleared = true;
        }

        public void Die(string kind = null)
        {
            if (state != "play" || P.invT > 0) return;
            if (kind == "fall" && nakN < tu.FREE_FALLS && P.hasSafe)   // 낙법: the first fall of a gate only sends you back to where you stood
            {
                nakN++; P.b.x = P.safe.x; P.b.y = P.safe.y; P.vx = P.vy = 0;
                P.invT = 1.2f; P.dashT = 0; shake = Mathf.Max(shake, 7); flash = .15f; hitstop = Mathf.Max(hitstop, .06f); mu?.Sfx("clang");
                fx?.Ring(P.b.cx, P.b.cy, 110, new Color(.76f, .09f, .11f, .6f), .35f); Toast("낙법 · 딛던 땅으로"); lastHitDir = null; return;
            }
            if (kind != "fall" && breath - 1 > 0)
            {
                breath--; var d = lastHitDir ?? new Vector2(-P.face, -.3f); lastHitDir = null;
                P.invT = tu.HIT_INVULN; P.vx = (d.x != 0 ? Mathf.Sign(d.x) : -P.face) * 340; P.vy = -300; P.onGround = false; P.dashT = 0; P.chain = 0;
                fx?.Bleed(lv, P.b.cx, P.b.cy, d, false);
                shake = 9; flash = .3f; hitstop = Mathf.Max(hitstop, .08f); mu?.Sfx("die"); return;
            }
            state = "dead"; deathT = 0; deaths++; breath--;
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
            shots.Clear();   // back to where this gate began; the fallen stay fallen
            P = new Player(lv, lv.start.x, lv.start.y) { DashHook = d => KanLunge(d, true), Fx = P.Fx };
            SpawnEnemies(); state = "play";
        }

        static float Hyp(float x, float y) => Mathf.Sqrt(x * x + y * y);
    }
}
