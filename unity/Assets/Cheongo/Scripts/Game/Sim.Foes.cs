// The nine foes (js/game.js stepEnemiesIn, stepFoe3, stepMudang, stepReaper): each acts on the 장단 — a blow is set for a coming beat,
// shown by its ring, and lands when the song reaches it.
//   순라 p saber · 포수 g musket · 저격수 s long shot · 등패수 h shield · 자객 a counter and lunge · 북잡이 k drum · 매 d hawk · 무당 m wards · 저승사자 r reaper
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public partial class Sim
    {
        static int TypeHp(char t) => t == 'p' || t == 'm' || t == 'r' ? 2 : t == 'h' || t == 'k' ? 3 : 1;   // js/tuning.js TYPE_HP
        public float bulletHold, wardT; float wardFx; int spawnN = 9000;

        void SpawnEnemies()
        {
            foes.Clear(); float T = World.T; bool elites = run.node == "elite" || run.cycle >= 1; float eliteP = run.node == "elite" ? .45f + .1f * Mathf.Min(3, run.cycle) : run.cycle >= 1 ? .18f + .07f * Mathf.Min(3, run.cycle) : 0;
            var rnd = new System.Random(run.seed % 997 + run.m * 31 + run.cycle * 17);
            foreach (var d in lv.foes)
            {
                if (deadIds.Contains(d.id)) continue;
                int hp = TypeHp(d.type); Enemy e;
                switch (d.type)
                {
                    case 'd': e = new Enemy { x = d.tx * T + 2, y = d.ty * T + 6, w = 28, h = 20, t = Random.value * 6 }; e.hx = e.x; e.hy = e.y; break;
                    case 'h': e = new Enemy { x = d.tx * T + 4, y = (d.ty + 1) * T - 42, w = 24, h = 42 }; break;
                    case 'm': e = new Enemy { x = d.tx * T + 5, y = (d.ty + 1) * T - 44, w = 22, h = 44, castAt = songPos + 1 + Random.value }; break;
                    case 'r': e = new Enemy { x = d.tx * T + 5, y = (d.ty + 1) * T - 46, w = 22, h = 46, nextAt = songPos + 1.5f + Random.value }; break;
                    case 'p': e = new Enemy { x = d.tx * T + 5, y = (d.ty + 1) * T - 44, w = 22, h = 44 }; break;
                    case 'a': e = new Enemy { x = d.tx * T + 5, y = (d.ty + 1) * T - 40, w = 22, h = 40, nextLunge = 1 }; break;
                    case 'k': e = new Enemy { x = d.tx * T + 1, y = (d.ty + 1) * T - 46, w = 30, h = 46, nextDrum = songPos + 2 + Random.value }; break;
                    case 'b': e = NewBoss(d); hp = e.hp; break;
                    default: e = new Enemy { x = d.tx * T + 5, y = (d.ty + 1) * T - 42, w = 22, h = 42, readyAt = songPos + (run.node == "elite" ? .6f : tu.ENTRY_FIRE_DELAY) + Random.value * .8f }; break;   // 포수 · 저격수
                }
                e.type = d.type; e.id = d.id; e.hp = e.maxHp = hp;
                if (e.type != 'b' && elites && rnd.NextDouble() < eliteP) { e.elite = true; e.hp++; e.maxHp++; }   // 정예: tougher, red-shot, worth more
                if ("gspak".IndexOf(e.type) >= 0 && Hyp(e.x - lv.start.x, e.y - lv.start.y) < tu.START_SLEEP_R) e.sleepy = true;   // foes near where you walk in hold until you make the first move
                foes.Add(e);
            }
        }

        bool SleepyWake() => Mathf.Abs(P.b.x - lv.start.x) > 48 || P.dashT > 0 || P.slashT > 0 || songPos > tu.START_SLEEP_T;   // the first move (or eight seconds) wakes the foes near the start
        float NextBeat() { float bl = BeatLen, t = (Mathf.Floor(songPos / bl) + 1) * bl; if (t - songPos < .5f) t += bl; return t; }
        public Vector2 Muzzle(Enemy e) => e.type == 's' ? new Vector2(e.cx + e.face * 34, e.y + 17) : new Vector2(e.cx + e.face * 32, e.y + 6);
        void Walk(Enemy e, float sp, float dt) { float ahead = e.cx + e.face * 14; if (lv.GroundPt(ahead, e.y + e.h + 4) && !lv.SolidPt(ahead, e.y + 10)) lv.MoveX(e, e.face * sp * dt); }
        void Struck(Enemy e, float fx0, float fy0, int dmg = 1) { lastHitDir = new Vector2(fx0, fy0); curFoe = e; Die(null, dmg); }

        void StepEnemies(float dt)
        {
            float pcx = P.b.cx, pcy = P.b.cy, bl = BeatLen; bool live = state == "play"; float fire = run.Diff.fire, fast = 1 + .08f * Mathf.Min(3, run.cycle);
            if (bulletHold > 0) bulletHold -= dt;
            if (wardT > 0)   // 검막: shots that come near are cut out of the air
            {
                wardT -= dt; foreach (var b in shots) if (!b.friendly && b.life > 0 && Hyp(b.x - pcx, b.y - pcy) < 95) { b.life = 0; fx?.Add("hud", Fx.HUD_SPARK, b.x, b.y, 18, life: .2f); }
                if ((wardFx -= dt) <= 0) { wardFx = .3f; fx?.Add("slashfx", 7, pcx, pcy, 120, life: .3f, grow: .2f, a: .55f); }
            }
            for (int k = 0; k < foes.Count; k++)
            {
                var e = foes[k]; if (!e.alive) continue; curFoe = e;   // whoever is acting now: if a blow lands, it is theirs
                if (e.type != 'b' && !e.hidden) lv.Unstick(e);
                KanEdges(e);
                if (e.hitT > 0) e.hitT -= dt;
                if ("dbri".IndexOf(e.type) < 0)   // walkers fall: a foe shoved off a ledge drops instead of hanging in the air
                {
                    float f = e.y + e.h;
                    if (!lv.GroundPt(e.x + 3, f + 1) && !lv.GroundPt(e.x + e.w - 3, f + 1))
                    {
                        e.fvy = Mathf.Min(900, e.fvy + 1900 * dt);
                        if (lv.MoveY(e, e.fvy * dt)) e.fvy = 0; else { var l = lv.LedgeBelow(e, f); if (l != null) { e.y = l.Value - e.h - .001f; e.fvy = 0; } }
                        if (e.y > lv.h * World.T + 60) { KillEnemy(e); continue; }
                    }
                    else e.fvy = 0;
                }
                if (e.stunT > 0) { e.stunT -= dt; DashThrough(e); continue; }   // frozen for a moment
                float ecx = e.cx, ecy = e.cy, dist = Hyp(pcx - ecx, pcy - ecy);
                switch (e.type)
                {
                    case 'd': StepHawk(e, dt, pcx, pcy, dist, live, bl); continue;
                    case 'm': StepMudang(e, dt, pcx, dist, live, bl); continue;
                    case 'r': StepReaper(e, dt, pcx, pcy, dist, live, bl, fast); continue;
                    case 'b': StepBoss(e, dt, pcx, pcy, dist, live); continue;
                    case 'i': StepIllusion(e, dt, pcx, live); continue;
                    case 'p': case 'a': case 'k': StepFoe3(e, dt, pcx, pcy, dist, live, bl, fire); continue;
                    case 'h':
                        {
                            bool seesH = live && dist < 380 && Mathf.Abs(pcy - ecy) < 80 && lv.Los(ecx, e.y + 8, pcx, pcy);
                            if (seesH) e.face = Sgn(pcx - ecx);
                            float ahead = e.cx + e.face * 16; bool ground = lv.GroundPt(ahead, e.y + e.h + 4) && !lv.SolidPt(ahead, e.y + 10);
                            e.vx = seesH && ground && dist > 24 && e.thrustAt == null ? e.face * 55 : 0; lv.MoveX(e, e.vx * dt);
                            if (live && seesH && e.thrustAt == null && dist < 90 && songPos >= e.nextThrust) e.thrustAt = NextBeat();   // 등패수: the shield drops for a thrust — the one opening
                            if (e.thrustAt != null && songPos >= e.thrustAt)
                            {
                                fx?.Add("fx", Fx.FX_SLASH_A, ecx + e.face * 34, e.cy, 54, life: .25f, rot: e.face > 0 ? 0 : Mathf.PI); mu?.Sfx("slash");
                                if (live && HurtsPlayer && P.b.Overlaps(e.face > 0 ? ecx : ecx - 64, e.y + 6, 64, e.h - 10)) Struck(e, e.face, -.3f);
                                e.thrustAt = null; e.nextThrust = songPos + 3 * bl * fire;
                            }
                            if (live && e.Overlaps(P.b)) { if (P.dashT > 0) Clang(e); else Struck(e, Sgn(pcx - ecx), -.3f); }
                            continue;
                        }
                }
                // 포수 · 저격수: aim, and fire on the beat
                bool sniper = e.type == 's'; float range = sniper ? 920 : 560, lead = (sniper ? 1f : .45f) / fast, lockT = (sniper ? .3f : .15f) / Mathf.Max(1, fast * .8f);
                bool sees = live && dist < range && lv.Los(ecx, e.y + 8, pcx, pcy);
                if (sees) e.face = Sgn(pcx - ecx);
                if (e.fireAt != null)
                {
                    if (songPos < e.fireAt - lockT && sees) { e.tx = pcx; e.ty = pcy; }
                    if (!sees && songPos < e.fireAt - lockT) { e.fireAt = null; e.readyAt = songPos + .3f; }
                    else if (songPos >= e.fireAt)
                    {
                        var mz = Muzzle(e); float dx = e.tx - mz.x, dy = e.ty - mz.y, d = Mathf.Max(1, Hyp(dx, dy)), sp = (sniper ? 1250 : 430) * (1 + .05f * Mathf.Min(3, run.cycle));
                        bool red = (sniper && run.cycle >= 1) || e.elite;   // 붉은 탄: it cannot be cut or turned — dodge it, or 간파 the hand before it fires
                        shots.Add(new Shot { x = mz.x, y = mz.y, vx = dx / d * sp, vy = dy / d * sp, owner = e, life = 3, sniper = sniper, red = red, noReflect = red });
                        fx?.Add("hud", Fx.HUD_SMOKE, mz.x + e.face * 8, mz.y - 4, 30, life: .9f, grow: .9f, a: .8f, flip: e.face < 0);   // powder smoke
                        e.fireAt = null; e.readyAt = songPos + Mathf.Max(1, Mathf.Round((sniper ? 4 : 2) / fast)) * bl * fire;
                        mu?.Sfx("shoot");
                    }
                }
                else if (sees && songPos >= e.readyAt && !(e.sleepy && (e.sleepy = !SleepyWake())))
                {
                    float kb = Mathf.Ceil((songPos + lead) / bl); if (sniper) { float m4 = Mathf.Max(1, Mathf.Round(4 / fast)); kb = Mathf.Ceil(kb / m4) * m4; }
                    e.fireAt = kb * bl; e.aimFrom = songPos; e.tx = pcx; e.ty = pcy;
                }
                DashThrough(e);
            }
            curFoe = null;
        }

        // 순라 · 자객 · 북잡이
        void StepFoe3(Enemy e, float dt, float pcx, float pcy, float dist, bool live, float bl, float fire)
        {
            if (e.sleepy && (e.sleepy = !SleepyWake())) { e.face = Sgn(pcx - e.cx); return; }   // waiting: watching, not yet coming
            float ecx = e.cx; bool sees = live && dist < 400 && Mathf.Abs(pcy - e.cy) < 90 && lv.Los(ecx, e.y + 8, pcx, pcy);
            e.swingT = Mathf.Max(0, e.swingT - dt);
            if (e.type == 'p')
            {
                if (sees && e.swingAt == null) e.face = Sgn(pcx - ecx);
                if (sees && e.swingAt == null && dist > 46) Walk(e, 70, dt);
                if (sees && e.swingAt == null && dist < 76 && songPos >= e.nextSwing) { e.swingAt = NextBeat(); e.rush = false; }
                else if (sees && e.swingAt == null && dist > 130 && dist < 270 && songPos >= e.nextSwing && songPos >= e.nextRush) { e.swingAt = NextBeat(); e.rush = true; e.nextRush = songPos + 5 * bl; }   // 돌진 베기: it glints from afar
                if (e.swingAt != null && songPos >= e.swingAt)
                {
                    if (e.rush) { e.rush = false; float gap = Mathf.Min(Mathf.Max(0, Mathf.Abs(pcx - ecx) - 40), 200); fx?.Trail(ecx, e.cy, ecx + e.face * gap, e.cy, 5, .3f, Fx.WF_STREAK); lv.MoveX(e, e.face * gap); }
                    float zx = e.cx;
                    fx?.Add("fx", Fx.FX_SLASH_A, zx + e.face * 36, e.cy, 64, life: .25f, rot: e.face > 0 ? 0 : Mathf.PI); mu?.Sfx("slash"); e.swingT = .3f;
                    if (live && HurtsPlayer && P.b.Overlaps(e.face > 0 ? zx : zx - 70, e.y - 4, 70, e.h + 4)) Struck(e, e.face, -.3f);
                    e.swingAt = null; e.nextSwing = songPos + 2.5f * bl * fire;
                }
            }
            else if (e.type == 'a')
            {
                e.counter = live && P.focus && dist < 320 && !(e.lungeT > 0) && !(e.stunT > 0);   // 자객: when you slip into 무아경, he settles into a counter stance
                if (e.counter) e.face = Sgn(pcx - ecx);
                if (live && P.tapDash && P.dashT > 0 && dist < 130 && e.counter) { e.counter = false; e.stunT = .7f; fx?.Add("hud", Fx.HUD_SPARK, ecx, e.y + 10, 40, life: .3f); }   // a feint: the quick dash breaks his stance
                if (e.lungeT > 0) { e.lungeT -= dt; if (lv.MoveX(e, e.face * 620 * dt)) e.lungeT = 0; if (live && HurtsPlayer && e.Overlaps(P.b)) Struck(e, e.face, -.3f); }
                else if (!e.counter)
                {
                    if (sees && e.dashAt == null) e.face = Sgn(pcx - ecx);
                    if (sees && e.dashAt == null && dist > 120) Walk(e, 120, dt);
                    if (sees && e.dashAt == null && dist < 230 && songPos >= e.nextLunge) e.dashAt = NextBeat();
                    if (e.dashAt != null && songPos >= e.dashAt) { e.dashAt = null; e.lungeT = .32f; e.nextLunge = songPos + 3 * bl; mu?.Sfx("dash"); }
                }
            }
            else   // 북잡이: his drum sets every soldier near him to strike together on the next beat
            {
                e.beatT = Mathf.Max(0, e.beatT - dt);
                if (sees) e.face = Sgn(pcx - ecx);
                if (live && dist < 560 && e.drumAt == null && songPos >= e.nextDrum) e.drumAt = NextBeat();
                if (e.drumAt != null && songPos >= e.drumAt)
                {
                    e.drumAt = null; e.nextDrum = songPos + 4 * bl; e.beatT = .3f; shake = Mathf.Max(shake, 4); mu?.Sfx("kill");
                    fx?.Ring(ecx, e.y + e.h * .6f, 120, Fx.Rgb(SEAL, .6f), .4f); haz.Add(new Hazard { kind = "ring", x = ecx, y = e.y + e.h * .6f, at = songPos, speed = 260, max = 110 });
                    float t = NextBeat();
                    foreach (var o in foes)
                    {
                        if (!o.alive || o == e || Hyp(o.x - e.x, o.y - e.y) > 320) continue;
                        if ((o.type == 'g' || o.type == 's') && o.fireAt == null) { o.fireAt = t; o.aimFrom = songPos; o.tx = pcx; o.ty = pcy; }
                        else if (o.type == 'p' && o.swingAt == null && Mathf.Abs(o.x - P.b.x) < 120) o.swingAt = t;
                        else if (o.type == 'h' && o.thrustAt == null && Mathf.Abs(o.x - P.b.x) < 120) o.thrustAt = t;
                    }
                }
            }
            if (live && e.Overlaps(P.b) && !(P.dashT > 0) && !(e.lungeT > 0)) P.vx = Sgn(pcx - ecx) * 260;   // bodies shove
            DashThrough(e);
        }

        // 매: circles, shows its dive, then comes down the line
        void StepHawk(Enemy e, float dt, float pcx, float pcy, float dist, bool live, float bl)
        {
            e.t += dt; float ecx = e.cx, ecy = e.cy; bool sees = live && dist < 430 && lv.Los(ecx, ecy, pcx, pcy);
            if (e.diveT > 0) { e.diveT -= dt; e.vx = e.dvx; e.vy = e.dvy; }
            else if (e.diveAt != null)
            {
                e.vx *= .85f; e.vy *= .85f;
                if (songPos >= e.diveAt) { float L = Mathf.Max(1, dist); e.dvx = (pcx - ecx) / L * tu.HAWK_DIVE_V; e.dvy = (pcy - ecy) / L * tu.HAWK_DIVE_V; e.diveT = .45f; e.diveAt = null; e.diveReady = songPos + tu.HAWK_REST_BEATS * bl; mu?.Sfx("dash"); }
            }
            else if (sees && dist < 300 && songPos >= Mathf.Max(1, e.diveReady)) { float t = (Mathf.Floor(songPos / bl) + 1) * bl; if (t - songPos < tu.HAWK_TELL) t += bl; e.diveAt = t; }
            else if (sees) { e.vx += (pcx - ecx) / dist * 520 * dt; e.vy += (pcy - ecy) / dist * 520 * dt; }
            else { e.vx += (e.hx - e.x) * 2 * dt; e.vy += (e.hy + Mathf.Sin(e.t * 2) * 10 - e.y) * 2 * dt; }
            float sp = Hyp(e.vx, e.vy), cap = e.diveT > 0 ? tu.HAWK_DIVE_V + 40 : sees ? 175 : 80; if (sp > cap) { e.vx *= cap / sp; e.vy *= cap / sp; }
            if (lv.MoveX(e, e.vx * dt)) e.vx *= -.5f;
            if (lv.MoveY(e, e.vy * dt)) e.vy *= -.5f;
            if (live && e.Overlaps(P.b))
            {
                if (P.dashT > 0) { if (P.dashHit.Add(e.id)) DashHurt(e); }
                else if (P.slashT > 0) { if (P.hitSet.Add(e.id)) HurtEnemy(e, P.strike); }
                else if (!(e.hitT > 0)) Struck(e, Sgn(pcx - ecx), -.3f);
            }
        }

        // 무당: every fourth beat she lays a talisman ward on the two nearest soldiers; it eats one plain cut
        void StepMudang(Enemy e, float dt, float pcx, float dist, bool live, float bl)
        {
            e.castT = Mathf.Max(0, e.castT - dt); bool sees = live && dist < 560; if (sees) e.face = Sgn(pcx - e.cx);
            if (sees && songPos >= e.castAt)
            {
                var near = new List<Enemy>(); foreach (var o in foes) if (o.alive && o != e && o.type != 'm' && o.type != 'b' && !o.ward && Hyp(o.x - e.x, o.y - e.y) < 280) near.Add(o);
                near.Sort((a, b) => Hyp(a.x - e.x, a.y - e.y).CompareTo(Hyp(b.x - e.x, b.y - e.y)));
                for (int i = 0; i < near.Count && i < 2; i++) { near[i].ward = true; near[i].wardBy = e.id; fx?.Add("hud", Fx.HUD_SPARK, near[i].cx, near[i].y + 4, 34, life: .4f); }
                e.castT = .6f; e.castAt = (Mathf.Floor(songPos / bl) + 4) * bl; if (near.Count > 0) mu?.Sfx("lantern");
            }
            DashThrough(e);
        }

        // 저승사자: sinks into ink, rises beside you one beat later and swings on the next beat
        void StepReaper(Enemy e, float dt, float pcx, float pcy, float dist, bool live, float bl, float fast)
        {
            e.fade = Mathf.MoveTowards(e.fade, e.ph == "gone" ? 0 : 1, dt * 5); e.swingT = Mathf.Max(0, e.swingT - dt);
            if (e.ph == "idle")
            {
                e.face = Sgn(pcx - e.cx);
                if (live && dist < 620 && songPos >= e.nextAt) { e.ph = "gone"; e.nextAt = (Mathf.Floor(songPos / bl) + 1) * bl; fx?.Add("hud", Fx.HUD_SMOKE, e.cx, e.y + e.h - 10, 60, life: .7f, grow: .8f); }
            }
            else if (e.ph == "gone" && songPos >= e.nextAt)
            {
                float foot = P.b.y + P.b.h; var offs = new List<float> { -140, 140, -175, 175, -105, 105 }; if (Random.value < .5f) offs.Reverse();
                foreach (var o in offs)   // stand on solid ground near the swordsman's feet, clear above
                {
                    float x = pcx + o; int tx = Mathf.FloorToInt(x / World.T), ty = Mathf.FloorToInt((foot - 4) / World.T);
                    while (ty < lv.h && lv.TileAt(tx, ty) != 1) ty++;
                    if (ty >= lv.h || Mathf.Abs(ty * World.T - foot) > 3 * World.T || lv.TileAt(tx, ty - 1) != 0 || lv.TileAt(tx, ty - 2) != 0 || !lv.Los(x, ty * World.T - 20, pcx, pcy)) continue;
                    e.x = x - e.w / 2; e.y = ty * World.T - e.h - .01f; break;
                }
                e.face = Sgn(pcx - e.cx); e.ph = "rise"; e.nextAt = (Mathf.Floor(songPos / bl) + 1) * bl + (bl < .5f ? bl : 0);
                fx?.Add("hud", Fx.HUD_SMOKE, e.cx, e.y + e.h - 10, 60, life: .7f, grow: .8f);
            }
            else if (e.ph == "rise" && songPos >= e.nextAt)
            {
                float ex = e.cx; fx?.Add("fx", 1, ex + e.face * 36, e.cy, 70, life: .3f, rot: e.face > 0 ? 0 : Mathf.PI); mu?.Sfx("slash"); e.swingT = .3f;
                if (live && HurtsPlayer && P.b.Overlaps(e.face > 0 ? ex : ex - 78, e.y - 6, 78, e.h + 6)) Struck(e, e.face, -.2f);
                e.ph = "idle"; e.nextAt = songPos + Mathf.Max(3, Mathf.Round(7 / fast)) * bl;
            }
            if (e.ph != "gone") DashThrough(e);
        }

        // 구미호's illusions: run at you, vanish after a few seconds or one cut
        void StepIllusion(Enemy e, float dt, float pcx, bool live)
        {
            e.t -= dt; if (e.t <= 0) { e.alive = false; fx?.Add("hud", Fx.HUD_SMOKE, e.cx, e.cy, 50, life: .5f); return; }
            e.face = Sgn(pcx - e.cx); float ahead = e.cx + e.face * 24;
            if (lv.GroundPt(ahead, e.y + e.h + 4)) lv.MoveX(e, e.face * 230 * dt);
            if (live && HurtsPlayer && e.Overlaps(P.b)) Struck(e, e.face, -.3f);
            DashThrough(e);
        }
    }
}
