// 총 네 자루 (js/game.js gunShot, hipShot, aimRay, blast): with a gun in hand the aimed release out of 무아경 is a shot, and the recoil is the dash.
//   조총 one ball through a line (held long, it pierces as an 일격) · 승자총통 a short cone of pellets · 신기전 two bursting rocket arrows, heat instead of rounds
//   천자총통 a ball on an arc that bursts large. A tap fires from the hip. The cut is a thrust of the barrel; a thrust that bites reloads a round, a read blow fills the gun.
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class Weapon
    {
        public string key, name, han, desc; public bool gun, heat; public int mag = 1, cost; public float R = 1, reach, cd = .2f, dur = .14f, muz = 32;
        public static readonly Dictionary<string, Weapon> ALL = new Dictionary<string, Weapon>
        {
            ["hwando"] = new Weapon { name = "환도", han = "環刀", desc = "받아치기 — 보통 베기로 간파하면 적의 등 뒤로 넘어가며 벤다. 탄 튕기기가 쉽다" },
            ["jochong"] = new Weapon { gun = true, mag = 3, name = "조총", han = "鳥銃", desc = "정밀 — 무아경에서 오래 겨눌수록 관통 일격. 탄 셋, 총검으로 찌르거나 간파하면 장전", R = .8f, reach = 22, dur = .13f, muz = 40 },
            ["seungja"] = new Weapon { gun = true, mag = 2, name = "승자총통", han = "勝字銃筒", desc = "산탄 — 가까이 부채꼴로 퍼져 여럿을 한 번씩 친다. 반동이 크다. 탄 둘", R = .8f, reach = 18, dur = .13f, muz = 30, cost = 120 },
            ["singi"] = new Weapon { gun = true, heat = true, name = "신기전", han = "神機箭", desc = "연발 — 터지는 화살 둘을 쏜다. 탄 대신 열이 오르고, 과열되면 잠깐 못 쏜다", R = .8f, reach = 18, dur = .13f, muz = 30, cost = 200 },
            ["cheonja"] = new Weapon { gun = true, mag = 1, name = "천자총통", han = "天字銃筒", desc = "중포 — 포물선으로 날아가 터지는 포탄. 한가운데만 일격. 반동이 아주 크다. 탄 하나", R = .8f, reach = 18, cd = .25f, muz = 40, cost = 280 }
        };
        static Weapon() { foreach (var kv in ALL) kv.Value.key = kv.Key; }
        public static Weapon Of(string k) => k != null && ALL.TryGetValue(k, out var w) ? w : ALL["hwando"];
    }

    public partial class Sim
    {
        public Weapon W => Weapon.Of(run.weapon);
        public bool IsGun => W.gun;
        public int GunMag => W.mag + run.Stat("mag");
        bool GunReady => IsGun && (W.heat ? !(P.overheat > 0) : P.ammo > 0);

        void GunReload(int n, bool slow = false)   // a round goes back in (a thrust that bit, a read blow, the slow match)
        {
            if (!IsGun) return;
            if (W.heat) { P.heat = Mathf.Max(0, P.heat - 34 * n); if (P.overheat > 0 && n >= 3) P.overheat = 0; return; }
            int before = P.ammo; P.ammo = Mathf.Min(GunMag, before + n); if (P.ammo > before) { P.reloadT = .25f; if (!slow) mu?.Sfx("lantern"); }
        }
        void StepGun(float dt)   // the slow match: an empty gun refills by itself, a hot box cools
        {
            if (!IsGun) return; if (P.ammo < 0) P.ammo = GunMag;
            P.fireT = Mathf.Max(0, P.fireT - dt); P.reloadT = Mathf.Max(0, P.reloadT - dt);
            if (W.heat) { P.heat = Mathf.Max(0, P.heat - dt * 30 * (1 + run.StatF("heat"))); if (P.overheat > 0) P.overheat -= dt; return; }
            if (P.ammo < GunMag) { P.slowRe += dt; if (P.slowRe > 2.4f / (1 + run.StatF("reload"))) { P.slowRe = 0; GunReload(1, true); } } else P.slowRe = 0;
        }

        // a gun's explosion: ink and fire, everyone inside cut (a cannon's heart kills; its edge only wounds)
        void Blast(float x, float y, float r, bool strike, bool core = false)
        {
            r *= 1 + run.StatF("blast"); fx?.Add("gfx", 3, x, y, r * 2.1f, life: .45f, grow: .25f, rot: Random.value * 6.28f);
            shake = Mathf.Max(shake, Mathf.Min(14, 4 + r / 12)); hitstop = Mathf.Max(hitstop, .04f); mu?.Sfx("shoot");
            foreach (var e in new List<Enemy>(foes))
            {
                if (!e.alive || Ghostly(e)) continue; float dd = Hyp(e.cx - x, e.cy - y), rr = Mathf.Max(e.w, e.h) / 2; if (dd >= r + rr) continue;
                bool st = strike && (!core || dd < r * .45f + rr); if (st && e.type == 'b') HurtEnemy(e, true, "il", true); else HurtEnemy(e, st, "il");
            }
        }

        // one aimed shot: a line that stops at walls; whoever stands on it is struck, nearest first
        void AimRay(Vector2 d, float L0, float wide, float ox, float oy, bool str, bool pellet = false, HashSet<Enemy> once = null)
        {
            float L = L0; for (float t = 10; t < L0; t += 8) if (lv.SolidPt(ox + d.x * t, oy + d.y * t)) { L = t; break; }
            var hit = new List<Enemy>(); foreach (var e in foes) { if (!e.alive || Ghostly(e)) continue; float ex = e.cx - ox, ey = e.cy - oy, t = ex * d.x + ey * d.y; if (t > 0 && t < L && Mathf.Abs(ex * d.y - ey * d.x) < Mathf.Max(e.w, e.h) / 2 + wide) hit.Add(e); }
            hit.Sort((a, b) => ((a.cx - ox) * d.x + (a.cy - oy) * d.y).CompareTo((b.cx - ox) * d.x + (b.cy - oy) * d.y));
            if (pellet && hit.Count > 0) { var e = hit[0]; L = (e.cx - ox) * d.x + (e.cy - oy) * d.y; hit.RemoveRange(1, hit.Count - 1); }   // each pellet stops in the first body
            foreach (var g in lv.targets) { float ex = g.x - ox, ey = g.y - oy, t = ex * d.x + ey * d.y; if (g.t <= 0 && t > 0 && t < L && Mathf.Abs(ex * d.y - ey * d.x) < wide + 14) BreakTarget(g); }
            foreach (var e in hit) { if (once != null && !once.Add(e)) continue; HurtEnemy(e, str, "il"); fx?.Add("perkfx", Fx.PF_SPLASH, e.cx, e.cy, 36, life: .22f); }
            fx?.Trail(ox, oy, ox + d.x * L, oy + d.y * L, wide > 12 ? 2.4f : 1.2f, .28f, Fx.WF_STREAK);
        }
        static Vector2 Rot(Vector2 d, float t) => new Vector2(d.x * Mathf.Cos(t) - d.y * Mathf.Sin(t), d.x * Mathf.Sin(t) + d.y * Mathf.Cos(t));
        Vector2 MuzzleAt(Vector2 d) => new Vector2(P.b.cx + d.x * W.muz, P.b.cy - 7 + d.y * W.muz * .8f);
        void MuzzleFx(float x, float y, Vector2 d)   // fire and smoke out of the gun's own mouth
        {
            float rot = Mathf.Atan2(d.y, d.x); bool fl = d.x < 0, big = W.key == "cheonja"; float r = fl ? rot - Mathf.PI : rot;
            if (W.key == "jochong") fx?.Add("muz", 0, x, y, 34, life: .13f, grow: .25f, ax: 0, rot: r, flip: fl);
            fx?.Add("muz", big ? 5 : 3, x + d.x * (big ? 26 : 12), y + d.y * 10, big ? 70 : 30, life: .55f, grow: .6f, a: .7f, rot: Random.value * .4f - .2f, flip: fl);
            if (fx != null) for (int i = 0; i < 10; i++) fx.Part(x, y, d.x * 60 + (Random.value - .5f) * 90, d.y * 60 - 30 - Random.value * 60, .7f, "#5a565e", 4 + Random.value * 5);
        }

        // the aimed release is a shot, and the recoil is the dash; a tap fires from the hip. False when the gun cannot fire (then the body dashes instead).
        bool GunShot(bool hip, Vector2 d)
        {
            if (!GunReady) return false; string w = W.key;
            if (hip)   // short, one wound, one round, barely a kick
            {
                var m0 = MuzzleAt(d);
                if (W.heat) { P.heat += 20; if (P.heat >= 100) { P.heat = 100; P.overheat = 1.6f; } } else P.ammo--;
                if (w == "seungja") { var once = new HashSet<Enemy>(); foreach (float t in new[] { -.2f, 0, .2f }) AimRay(Rot(d, t), 150, 8, m0.x, m0.y, false, true, once); }
                else if (w == "singi") shots.Add(new Shot { x = m0.x, y = m0.y, vx = d.x * 520, vy = d.y * 520, friendly = true, look = "rocket", seek = 2.2f, blast = 26, life = 1.2f, r = 6 });
                else if (w == "cheonja") shots.Add(new Shot { x = m0.x, y = m0.y, vx = d.x * 520, vy = d.y * 520 - 40, g = 900, friendly = true, look = "cannon", blast = 40, life = 2, r = 8 });
                else AimRay(d, 300, 8, m0.x, m0.y, false);
                MuzzleFx(m0.x, m0.y, d); shake = Mathf.Max(shake, 3); mu?.Sfx("shoot"); P.fireT = .16f; P.lastShotAt = songPos; P.vx -= d.x * 120; if (Mathf.Abs(d.x) > .2f) P.face = Sgn(d.x);
                return true;
            }
            {   // a marksman's eye: a foe within a hair of the aim draws the barrel onto it
                float ax = P.b.cx, ay = P.b.cy - 4, bs = .9f; foreach (var e in foes) { if (!e.alive || Ghostly(e)) continue; float dx = e.cx - ax, dy = e.cy - ay, L = Hyp(dx, dy); if (L > 560 || L < 10) continue; float c = (dx * d.x + dy * d.y) / L; if (c > bs) { bs = c; d = new Vector2(dx / L, dy / L); } }
            }
            float aimT = P.focusT; bool air = !P.onGround, noKick = air && P.airDash <= 0; var mz = MuzzleAt(d); float k = 1;
            if (W.heat) { P.heat += 38; if (P.heat >= 100) { P.overheat = 1.6f; P.heat = 100; } } else P.ammo--;
            if (w == "jochong") { bool full = aimT >= .45f; AimRay(d, 600, full ? 14 : 9, P.b.cx + d.x * 20, P.b.cy - 4 + d.y * 18, full); }   // 정밀: held long enough, the ball goes through and every body it meets falls
            else if (w == "seungja") { var once = new HashSet<Enemy>(); for (int i = 0; i < 4; i++) AimRay(Rot(d, -.32f + .64f * i / 3), 180, 8, mz.x, mz.y, false, true, once); k = 1.25f; }   // 산탄: a cone, short
            else if (w == "singi") { foreach (float t in new[] { -.09f, .09f }) { var v = Rot(d, t); shots.Add(new Shot { x = mz.x, y = mz.y, vx = v.x * 560, vy = v.y * 560, friendly = true, look = "rocket", seek = 2.2f, blast = 34, life = 1.6f, r = 8 }); } k = .45f; }   // 신기전
            else { shots.Add(new Shot { x = mz.x, y = mz.y, vx = d.x * 640, vy = d.y * 640 - 60, g = 900, friendly = true, look = "cannon", blast = 70, strike = true, core = true, life = 2.6f, r = 10 }); k = 1.5f; }   // 천자총통
            MuzzleFx(mz.x, mz.y, d); shake = Mathf.Max(shake, w == "cheonja" ? 10 : 6); mu?.Sfx("shoot"); P.fireT = .22f; P.lastShotAt = songPos;
            if (!P.onGround) P.airDash = Mathf.Max(0, P.airDash - 1);
            if (noKick) { P.vx -= d.x * 90; P.vy = Mathf.Min(P.vy, 40); }   // out of air: the shot still goes, the body only checks its fall
            else { float v = tu.RECOIL_V * k, gx = P.onGround ? tu.RECOIL_GROUND_X : 1; P.vx = -d.x * v * gx; P.vy = -d.y * v - 90 * k; }   // the kick: lighter on the ground, still a lift when you fire downward in the air
            P.onGround = false; P.coyote = 0; if (Mathf.Abs(d.x) > .2f) P.face = Sgn(d.x);
            return true;
        }
    }
}
