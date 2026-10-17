// The 마당's own ground, as on the web (js/game.js stepTerrain, stepChase, cutCount): 기와 that gives way a beat after it is stood on
// and comes back four beats later, wind that turns each bar, the walled 결진 that shuts until its guards are cut, cracked rock that
// falls to a cut with a chest behind it, and the exit's 결계 that stays shut until enough of the gate's guards are down — those left
// far behind seep after you through the ink.
using UnityEngine;

namespace Cheongo
{
    public partial class Sim
    {
        public static float CutRatio = .6f;            // share of the gate's guards that opens the exit (부스판 lowers it)
        const float CHASE_EVERY = 3, CHASE_GAP = 18;    // a guard this many tiles behind is brought after you, one every few seconds
        float chaseT = CHASE_EVERY; int foeN = -1; bool sealTold;

        // the gate's own guards (not the guardian), how many are down, how many must be
        public int CutN { get { if (foeN < 0) { foeN = 0; foreach (var d in lv.foes) if (d.type != 'b') foeN++; } return foeN; } }
        public int CutK { get { int k = 0; foreach (var d in lv.foes) if (d.type != 'b' && deadIds.Contains(d.id)) k++; return k; } }
        public int CutNeed => Mathf.CeilToInt(CutN * CutRatio);
        public bool ExitOpen => lv.hasDrum || CutN == 0 || lv.sealOpen;

        void StepTerrain(float dt)
        {
            float T = World.T, cx = P.b.cx, cy = P.b.cy, feet = P.b.y + P.b.h, bl = BeatLen;
            // 기와: stood on, the whole run gives way a beat later
            if (P.onGround) { int r = Mathf.RoundToInt(feet / T); if (Mathf.Abs(feet - r * T) < 2) for (int tx = Mathf.FloorToInt(P.b.x / T); tx <= Mathf.FloorToInt((P.b.x + P.b.w - .01f) / T); tx++) { int i = r * lv.w + tx; if (tx >= 0 && tx < lv.w && r < lv.h && lv.grid[i] == 6 && !lv.crumb.ContainsKey(i)) CrumbleRun(r, tx); } }
            var back = new System.Collections.Generic.List<int>();
            foreach (var kv in lv.crumb)
            {
                var c = kv.Value;
                if (!c.gone && songPos >= c.at) { c.gone = true; c.back = songPos + bl * 4; float x = (kv.Key % lv.w) * T + 16, y = (kv.Key / lv.w) * T; for (int k = 0; k < 2; k++) fx?.Part(x + (Random.value - .5f) * 20, y, (Random.value - .5f) * 60, 30 + Random.value * 60, .8f, lv.pal.tile, 4 + Random.value * 3); }
                else if (c.gone && songPos >= c.back) { int tx = kv.Key % lv.w, ty = kv.Key / lv.w; if (!P.b.Overlaps(tx * T, ty * T - 2, T, 12)) back.Add(kv.Key); }
            }
            foreach (int i in back) lv.crumb.Remove(i);
            // 바람: it turns each bar, the last beat of the bar is a lull; it pushes harder in the air
            foreach (var z in lv.winds) if (cx > z.x0 && cx < z.x1) { int d = WindDir(z); if (d != 0 && P.dashT <= 0) lv.MoveX(P.b, d * (P.onGround ? 40 : 95) * dt); }
            // 결진: the gates shut once you are inside with guards, open when they are all cut
            foreach (var a in lv.arenas)
            {
                if (a.st == 1 && (cx < a.x0 * T || cx > (a.x1 + 1) * T)) { a.st = 0; ArenaWalls(a, false); }
                if (a.st == 0 && cx > (a.x0 + 2) * T && cx < (a.x1 - 1) * T)
                {
                    if (!ArenaHasFoes(a)) { a.st = 2; continue; }
                    a.st = 1; ArenaWalls(a, true); shake = Mathf.Max(shake, 6); mu?.Sfx("strike"); Toast("결진 · 이 안의 적을 모두 베어야 문이 열린다");
                }
                else if (a.st == 1 && !ArenaHasFoes(a)) { a.st = 2; ArenaWalls(a, false); AddQi(25); Toast("결진을 뚫었다"); mu?.Sfx("lantern"); }
            }
            // cracked rock: a cut or a dash brings it down
            if (lv.cracks.Count > 0)
            {
                if (P.slashT > 0) HitCrack(cx + P.slashDir.x * 30, cy + P.slashDir.y * 30, 40);
                if (P.dashT > 0) HitCrack(cx + P.face * 18, cy, 30);
            }
            foreach (var c in lv.chests) if (!c.open && Mathf.Abs(cx - c.x) < 22 && feet > c.y - 40 && feet < c.y + 4) OpenChest(c);
            StepChase(dt);
        }
        public int WindDir(Wind z) { int b = Mathf.FloorToInt(songPos / BeatLen), bar = Mathf.FloorToInt(b / 4f) + z.ph; if (((b % 4) + 4) % 4 == 3) return 0; return bar % 2 != 0 ? 1 : -1; }
        void CrumbleRun(int r, int tx)
        {
            int a = tx, b = tx; while (a > 0 && lv.grid[r * lv.w + a - 1] == 6) a--; while (b < lv.w - 1 && lv.grid[r * lv.w + b + 1] == 6) b++;
            for (int x = a; x <= b; x++) if (!lv.crumb.ContainsKey(r * lv.w + x)) lv.crumb[r * lv.w + x] = new Crumb { at = songPos + BeatLen };
        }
        bool ArenaHasFoes(ArenaZone a) { foreach (var e in foes) if (e.alive && e.type != 'b' && e.cx > a.x0 * World.T && e.cx < (a.x1 + 1) * World.T) return true; return false; }
        void ArenaWalls(ArenaZone a, bool on)
        {
            if (on) { a.set = new System.Collections.Generic.List<int>(); foreach (int x in new[] { a.x0, a.x1 }) for (int y = a.y0; y <= a.y1; y++) { int i = y * lv.w + x; if (i >= 0 && i < lv.grid.Length && lv.grid[i] == 0) { lv.grid[i] = 1; a.set.Add(i); } } }
            else if (a.set != null) { foreach (int i in a.set) lv.grid[i] = 0; a.set = null; }
            lv.gridVer++;
        }
        void HitCrack(float hx, float hy, float r)
        {
            foreach (int i in lv.cracks) { float tx = (i % lv.w) * World.T + 16, ty = (i / lv.w) * World.T + 16; if (Mathf.Abs(tx - hx) < r && Mathf.Abs(ty - hy) < r) { BreakCrack(i); return; } }
        }
        void BreakCrack(int i)
        {
            int x = i % lv.w, y = i / lv.w; var gone = new System.Collections.Generic.List<int>();
            foreach (int j in lv.cracks) if (j % lv.w == x && Mathf.Abs(j / lv.w - y) <= 3) gone.Add(j);
            foreach (int j in gone)
            {
                lv.cracks.Remove(j); lv.grid[j] = 0; float jx = (j % lv.w) * World.T + 16, jy = (j / lv.w) * World.T + 16;
                for (int k = 0; k < 5; k++) fx?.Part(jx + (Random.value - .5f) * 24, jy, (Random.value - .5f) * 220, -80 - Random.value * 160, .8f, lv.pal.tile, 3 + Random.value * 4);
            }
            lv.gridVer++; shake = Mathf.Max(shake, 5); mu?.Sfx("strike"); Toast("금 간 바위가 무너졌다 · 안에 상자가 있다");
        }
        void OpenChest(Chest c)
        {
            c.open = true; mu?.Sfx("lantern"); fx?.Seal(c.x, c.y - 10, 0, false);
            if (breath < run.BreathCap) { breath++; Toast($"상자 · 숨 {breath}"); } else { AddQiRaw(30); Toast("상자 · 천고 기운이 차오른다"); }
        }
        // 결계: the exit opens once enough guards are cut; those left far behind come after you
        void StepChase(float dt)
        {
            if (lv.hasDrum || CutN == 0) return;
            if (!lv.sealOpen && CutK >= CutNeed) { lv.sealOpen = true; mu?.Sfx("lantern"); Toast(CutK >= CutN ? "결계가 풀렸다 · 일소" : $"결계가 풀렸다 · 출구로 · 남은 적 {CutN - CutK}"); }
            if (lv.sealOpen) return;
            if ((chaseT -= dt) > 0) return; chaseT = CHASE_EVERY;
            foreach (var a in lv.arenas) if (a.st == 1) return;
            Enemy e = null; foreach (var o in foes) if (o.alive && o.type != 'd' && o.type != 'b' && o.x < P.b.x - CHASE_GAP * World.T && !chased.Contains(o.id)) { e = o; break; }
            if (e == null) return;
            float tx = P.b.x - 8 * World.T; var fy = lv.FindFloor(tx, P.b.y - 2 * World.T); if (fy == null || Mathf.Abs(fy.Value - (P.b.y + P.b.h)) > 4 * World.T) return;
            float ny = fy.Value - e.h; if (lv.RectSolid(tx, ny, e.w, e.h)) return;
            fx?.Add("gfx", 8, e.cx, e.y + e.h, 40, life: .4f, grow: .3f, ay: 1, a: .8f);
            e.x = tx; e.y = ny; e.vx = 0; e.face = 1; e.sleepy = false; chased.Add(e.id);
            fx?.Add("gfx", 8, tx + e.w / 2, fy.Value, 52, life: .5f, grow: .4f, ay: 1, a: .9f);
            if (!sealTold) { sealTold = true; Toast("베지 않고 지나친 적은 먹을 타고 뒤따라온다"); }
        }
        readonly System.Collections.Generic.HashSet<int> chased = new System.Collections.Generic.HashSet<int>();
        // touching a shut exit: say why
        float sealSaid;
        void ExitShut() { if (time - sealSaid > 2.5f) { sealSaid = time; Toast($"결계 · 적을 더 베어야 열린다 ({CutK} / {CutNeed})"); mu?.Sfx("clang"); } }
    }
}
