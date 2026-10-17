// The guardians of 천고대 (js/game.js BOSSES, stepBoss, bossChoose, bossPerform) and 천고난무.
// One guards the drum at the end of each turn. All act on the beat: an act is chosen, wound up (telegraphed) until
// the next beat, then performed. A plain cut takes 1, a read blow 3 and staggers the guardian out of its wind-up.
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class Boss
    {
        public string key, name, han, sheet, line; public int hp, idle, atk; public float w, h, draw, speed = 55; public bool still, fly, armored;
        public string[] pool0, pool1, pool2, rage; public string hurtSheet; public int hurtFrame = -1;
        public string[] Pool(int c) { var l = new List<string>(pool0); if (c >= 1 && pool1 != null) l.AddRange(pool1); else if (c < 1 && key == "imugi") l.Add("burst"); else if (c < 1 && key == "jangseung") l.Add("low"); if (c >= 2 && pool2 != null) l.AddRange(pool2); return l.ToArray(); }

        static string[] S(string s) => s.Split(' ');
        static Boss() { foreach (var kv in ALL) kv.Value.key = kv.Key; }
        public static readonly Dictionary<string, Boss> ALL = new Dictionary<string, Boss>
        {
            ["sumun"] = new Boss { name = "수문장", han = "守門將", hp = 8, w = 44, h = 84, draw = 124, sheet = "foes2", idle = 4, atk = 5, line = "천고를 지키는 장수가 길을 막는다.", pool0 = S("slam charge"), pool1 = S("volley"), pool2 = S("summon"), rage = S("volley summon") },
            ["gumiho"] = new Boss { name = "구미호", han = "九尾狐", hp = 8, w = 52, h = 44, draw = 84, sheet = "bossA", idle = 0, atk = 1, speed = 90, line = "아홉 꼬리가 달빛에 흔들린다.", pool0 = S("pounce foxfire pounce illusion"), pool1 = S("foxfire"), rage = S("illusion foxfire"), hurtSheet = "bossC", hurtFrame = 1 },
            ["dokkaebi"] = new Boss { name = "도깨비", han = "鬼", hp = 10, w = 46, h = 80, draw = 120, sheet = "bossA", idle = 2, atk = 3, speed = 60, line = "방망이 소리가 뚝딱 울린다.", pool0 = S("club coins gamtu"), pool1 = S("coins"), rage = S("coins gamtu"), hurtSheet = "bossC", hurtFrame = 3 },
            ["imugi"] = new Boss { name = "이무기", han = "螭", hp = 8, w = 46, h = 90, draw = 134, sheet = "bossA", idle = 4, atk = 5, still = true, line = "용이 되지 못한 뱀이 땅 밑에서 운다.", pool0 = S("burst spit"), pool1 = S("burst2"), rage = S("burst2"), hurtSheet = "bossC", hurtFrame = 5 },
            ["wongwi"] = new Boss { name = "원귀", han = "冤鬼", hp = 7, w = 34, h = 70, draw = 112, sheet = "bossA", idle = 6, atk = 7, fly = true, line = "흰 소복이 허공에 떠 있다.", pool0 = S("scream blink hair"), pool1 = S("scream"), rage = S("hair scream"), hurtSheet = "bossC", hurtFrame = 7 },
            ["jangseung"] = new Boss { name = "장승", han = "長丞", hp = 12, w = 64, h = 112, draw = 150, sheet = "bossA", idle = 8, atk = 8, still = true, line = "천하대장군과 지하여장군이 눈을 부릅뜬다.", pool0 = S("low high spirits"), pool1 = S("lowhigh highlow"), rage = S("lowhigh highlow"), hurtSheet = "bossD", hurtFrame = 0 },
            ["haetae"] = new Boss { name = "해태", han = "獬豸", hp = 9, w = 70, h = 56, draw = 98, sheet = "bossB", idle = 0, atk = 1, speed = 70, line = "불을 먹는 짐승이 앞을 막는다.", pool0 = S("breath charge leap"), pool1 = S("breath"), rage = S("breath leap"), hurtSheet = "bossD", hurtFrame = 2 },
            ["bulgasari"] = new Boss { name = "불가사리", han = "不可殺", hp = 9, w = 72, h = 64, draw = 110, sheet = "bossB", idle = 2, atk = 3, speed = 40, armored = true, line = "쇠를 먹는 괴물. 보통 칼은 먹혀 버린다. 일섬과 간파만이 통한다.", pool0 = S("stomp inhale scrap"), pool1 = S("stomp"), rage = S("scrap stomp"), hurtSheet = "bossD", hurtFrame = 4 },
            ["baekho"] = new Boss { name = "백호", han = "白虎", hp = 8, w = 66, h = 46, draw = 86, sheet = "bossB", idle = 4, atk = 5, speed = 110, line = "산군이 내려왔다.", pool0 = S("leap claw roar"), pool1 = S("leap"), rage = S("roar claw"), hurtSheet = "bossD", hurtFrame = 6 },
            ["talchum"] = new Boss { name = "탈춤꾼", han = "假面", hp = 8, w = 28, h = 60, draw = 98, sheet = "bossB", idle = 6, atk = 7, speed = 80, line = "탈을 바꿔 쓸 때마다 다른 사람이 된다.", pool0 = S("fan dance mask fan"), pool1 = S("fan2"), rage = S("fan2 dance"), hurtSheet = "bossD", hurtFrame = 8 }
        };
        static readonly string[] ORDER = S("gumiho dokkaebi imugi wongwi jangseung haetae bulgasari baekho talchum sumun");
        // one guardian per turn, in an order shuffled once for the run
        public static Boss For(int seed, int cycle)
        {
            var rnd = new System.Random(seed ^ 0xB055); var o = new List<string>(ORDER);
            for (int i = o.Count - 1; i > 0; i--) { int j = rnd.Next(i + 1); (o[i], o[j]) = (o[j], o[i]); }
            return ALL[o[cycle % o.Count]];
        }
        public static readonly string[] MASKS = { "양반탈", "각시탈", "말뚝이탈" };
        public static string Josa(string w, string a, string b) { int c = w[w.Length - 1] - 0xAC00; return w + (c >= 0 && c % 28 != 0 ? a : b); }
    }

    public class Chungo { public List<Vector2> pts = new List<Vector2>(); public List<Enemy> ts; public float t; public bool done, plain; }
    public class Clone { public float x, y, t, ward; public int face; }
    public class Target { public float x, y, t; }

    public partial class Sim
    {
        public float bossIntro; public Enemy introBoss; public Chungo chungo; public readonly List<Clone> clones = new List<Clone>();
        int ctrN; float ctrUntil;
        static readonly HashSet<string> MELEE = new HashSet<string>("slam club claw stomp inhale dance charge pounce".Split(' ')), CLOSER = new HashSet<string>("leap pounce charge blink burst burst2 dance".Split(' ')),
            DELAYABLE = new HashSet<string>("slam club claw stomp inhale low high breath".Split(' '));
        public bool BossAlive { get { foreach (var e in foes) if (e.alive && e.type == 'b') return true; return false; } }
        public Enemy TheBoss { get { foreach (var e in foes) if (e.type == 'b') return e; return null; } }

        Enemy NewBoss(Foe d)
        {
            var B = Boss.For(run.seed, run.cycle); float floor = (d.ty + 1) * World.T;
            int hp = Mathf.RoundToInt(B.hp * tu.BOSS_HP_MUL * run.Diff.bossHp * (Booth.On ? Booth.BOSS_HP : 1)) + Mathf.RoundToInt(tu.BOSS_HP_PER_CYCLE) * run.cycle;   // 부스판: a guardian a passer-by can fell
            return new Enemy { kind = B.key, B = B, hp = hp, x = d.tx * World.T + 16 - B.w / 2, y = B.fly ? floor - 95 - B.h / 2 : floor - B.h, w = B.w, h = B.h, floor = floor, tx = d.tx, rng = new System.Random(run.seed ^ B.key.GetHashCode() ^ run.cycle * 977) };
        }

        // a talisman barrier closes both sides of the arena while the guardian lives
        void SealArena(Enemy e, bool on)
        {
            if (!on) { if (lv.sealOn) { foreach (int x in new[] { lv.sealX0, lv.sealX1 }) for (int y = 0; y <= lv.sealY1; y++) lv.grid[y * lv.w + x] = 0; lv.sealOn = false; } return; }
            if (lv.sealOn) return; int tx = (int)e.tx, ty = Mathf.RoundToInt(e.floor / World.T) - 1, x0 = tx - 27, x1 = tx + 12, px = Mathf.FloorToInt(P.b.cx / World.T);
            if (x0 < 1 || x1 >= lv.w - 1 || px <= x0 || px >= x1) return;
            foreach (int x in new[] { x0, x1 }) for (int y = 0; y <= ty; y++) if (lv.grid[y * lv.w + x] != 0) return;   // only where the arena is open sky
            foreach (int x in new[] { x0, x1 }) for (int y = 0; y <= ty; y++) lv.grid[y * lv.w + x] = 1;
            lv.sealOn = true; lv.sealX0 = x0; lv.sealX1 = x1; lv.sealY1 = ty;
        }

        void Leap(Enemy e, float tx, float t) { e.vx = (tx - e.cx) / t; e.vy = -.5f * 1900 * t; e.air = true; e.face = Sgn(e.vx); }
        void SummonHawks(Enemy e, int n) { for (int i = 0; i < n; i++) { float dx = (i - (n - 1) / 2f) * 120; var h = new Enemy { type = 'd', id = spawnN++, hp = 1, maxHp = 1, x = e.cx + dx, y = e.y - 60, w = 28, h = 20, t = Random.value * 6 }; h.hx = h.x; h.hy = h.y; foes.Add(h); } mu?.Sfx("lantern"); }
        void Lob(Enemy e, float x, float y, float tx, float ty, float t, string look) { const float g = 900; shots.Add(new Shot { x = x, y = y, vx = (tx - x) / t, vy = (ty - y - .5f * g * t * t) / t, g = g, owner = e, life = 3, look = look, r = 5 }); }
        void Waves(Enemy e, float sp) { foreach (int dir in new[] { -1, 1 }) shots.Add(new Shot { x = e.cx + dir * (e.w / 2 + 8), y = e.floor - 12, vx = dir * sp, owner = e, life = 2.2f, look = "wave", noReflect = true, r = 8 }); }
        void SteerShot(Shot b, float dt)
        {
            if (b.home > 0 && !b.friendly && state == "play") Turn(b, P.b.cx, P.b.cy, b.home * dt);
            if (b.seek > 0 && b.friendly) { var t = Nearest(b.x, b.y, 1, 420); if (t.Count > 0) Turn(b, t[0].cx, t[0].cy, b.seek * dt); }
            if (b.boom > 0 && !b.friendly && b.t > b.boom && b.owner != null && b.owner.alive)   // the fan curves back to the dancer's hand
            { var o = b.owner; float dx = o.cx - b.x, dy = o.y + 20 - b.y, d = Mathf.Max(1, Hyp(dx, dy)), sp = Hyp(b.vx, b.vy); b.vx += (dx / d * sp - b.vx) * Mathf.Min(1, dt * 4); b.vy += (dy / d * sp - b.vy) * Mathf.Min(1, dt * 4); if (d < 24) b.life = 0; }
        }
        static void Turn(Shot b, float tx, float ty, float max) { float a = Mathf.Atan2(b.vy, b.vx), want = Mathf.Atan2(ty - b.y, tx - b.x), sp = Hyp(b.vx, b.vy), d = Mathf.DeltaAngle(a * Mathf.Rad2Deg, want * Mathf.Rad2Deg) * Mathf.Deg2Rad, na = a + Mathf.Clamp(d, -max, max); b.vx = Mathf.Cos(na) * sp; b.vy = Mathf.Sin(na) * sp; }

        // things decided the moment an act is chosen (so the telegraph can show where it will land)
        void BossChoose(Enemy e, string a, float pcx, float bl, int c)
        {
            float f = e.floor; const float W = 1200;
            if (a == "burst" || a == "burst2") { e.hidden = true; e.tx = pcx; AddHaz("pillar", pcx - 32, f - 160, 64, 160, e.hitAt, e.hitAt + .35f); if (a == "burst2") { float x2 = pcx + (Random.value < .5f ? -1 : 1) * 130; AddHaz("pillar", x2 - 32, f - 160, 64, 160, e.hitAt + bl, e.hitAt + bl + .35f); } fx?.Add("hud", Fx.HUD_SMOKE, e.cx, f - 10, 90, life: .8f, grow: .8f); }
            else if (a == "low" || a == "lowhigh") { AddHaz("beam", e.x - W, f - 30, W * 2, 30, e.hitAt, e.hitAt + .3f); if (a == "lowhigh") AddHaz("beam", e.x - W, f - 140, W * 2, 102, e.hitAt + bl, e.hitAt + bl + .3f); }
            else if (a == "high" || a == "highlow") { AddHaz("beam", e.x - W, f - 140, W * 2, 102, e.hitAt, e.hitAt + .3f); if (a == "highlow") AddHaz("beam", e.x - W, f - 30, W * 2, 30, e.hitAt + bl, e.hitAt + bl + .3f); }
            else if (a == "breath") AddHaz("fire", e.face > 0 ? e.x + e.w : e.x - 190, f - 64, 190, 64, e.hitAt, e.hitAt + bl);
            else if (a == "hair") { int n = 3 + Mathf.Min(2, c); for (int i = 0; i < n; i++) { float x = pcx + (i - (n - 1) / 2f) * 85; AddHaz("hair", x - 14, f - 120, 28, 120, e.hitAt + i * bl * .5f, e.hitAt + i * bl * .5f + .3f); } }
            else if (a == "coins") { int n = 5 + Mathf.Min(3, c); for (int i = 0; i < n; i++) { float x = pcx + (i - (n - 1) / 2f) * 64 + (Random.value - .5f) * 30, at = e.hitAt + bl * .5f + i * bl * .25f; AddHaz("coin", x - 16, f - 34, 32, 34, at, at + .14f); } }
            else if (a == "inhale") e.suck = true;
            else if (a == "gamtu") { e.invisT = 2 * bl; Toast("도깨비 감투 · 모습이 사라졌다"); }
            else if (a == "mask") { e.mask = (e.mask + 1) % 3; Toast($"탈을 바꿔 썼다 · {Boss.MASKS[e.mask]}"); }
        }

        // the moment an act lands; true when it turned into another act instead of ending
        bool BossPerform(Enemy e, string a, float pcx, float pcy, float bl, int c)
        {
            float ecx = e.cx, f = e.floor;
            fx?.Add("bfx3", a == "stomp" || a == "slam" || a == "club" ? 0 : 3, ecx + e.face * (e.w / 2 + 30), e.cy, e.h * .8f, life: .45f, grow: .3f, a: .7f, flip: e.face < 0);   // each blow is painted as it lands
            switch (a)
            {
                case "slam": case "club":
                    fx?.Add("bvfx", 1, ecx + e.face * 80, f - 18, 70, life: .5f, grow: .2f, ay: .8f); shake = 10; mu?.Sfx("kill"); fx?.Add("hud", Fx.HUD_DUST, ecx + e.face * 90, f, 90, life: .5f, ay: 1);
                    if (HurtsPlayer && P.b.Overlaps(e.face > 0 ? ecx : ecx - 150, f - 70, 150, 70)) Struck(e, e.face, -.5f, 2);
                    if (c >= 1) Waves(e, 360 + 30 * c); break;
                case "charge": e.chargeT = e.kind == "haetae" ? .6f : .5f; e.cv = e.kind == "haetae" ? 640 : 520 + 40 * c; mu?.Sfx("dash"); break;
                case "volley":
                    { int n = c >= 3 ? 5 : 3; float ang = Mathf.Atan2(pcy - (e.y + 30), pcx - ecx), sp = 420 * (1 + .1f * c); for (int i = 0; i < n; i++) { float t = ang + (i - (n - 1) / 2f) * .16f; shots.Add(new Shot { x = ecx + e.face * 30, y = e.y + 30, vx = Mathf.Cos(t) * sp, vy = Mathf.Sin(t) * sp, owner = e, life = 3 }); } mu?.Sfx("shoot"); break; }
                case "summon": case "spirits": SummonHawks(e, a == "spirits" && c >= 1 ? 3 : 2); break;
                case "pounce": Leap(e, pcx, .55f); mu?.Sfx("dash"); break;
                case "leap": Leap(e, pcx, .6f); mu?.Sfx("dash"); break;
                case "foxfire": { int n = 6 + 2 * Mathf.Min(2, c); for (int i = 0; i < n; i++) { float t = (float)i / n * Mathf.PI * 2; shots.Add(new Shot { x = ecx, y = e.y + 10, vx = Mathf.Cos(t) * 150, vy = Mathf.Sin(t) * 150, owner = e, life = 4, look = "orb", home = .9f, r = 4 }); } mu?.Sfx("lantern"); break; }
                case "illusion": foreach (int dx in new[] { -90, 90 }) foes.Add(new Enemy { type = 'i', kind = "gumiho", B = e.B, id = spawnN++, hp = 1, maxHp = 1, x = ecx + dx - 20, y = f - 36, w = 40, h = 36, face = Sgn(pcx - ecx - dx), t = 4 }); mu?.Sfx("lantern"); break;
                case "coins": mu?.Sfx("clang"); break;
                case "gamtu": e.act = "club"; e.hitAt = (Mathf.Floor(songPos / bl) + 2) * bl; return true;   // reappears swinging two beats later
                case "burst": case "burst2": e.hidden = false; e.emergeT = .6f; e.x = e.tx - e.w / 2; e.y = f - e.h; e.face = Sgn(pcx - e.tx); shake = 10; mu?.Sfx("kill"); fx?.Add("hud", Fx.HUD_DUST, e.tx, f, 110, life: .5f, ay: 1); fx?.Add("bfx3", 1, e.tx, f, 170, life: .6f, grow: .15f, ay: 1); break;
                case "spit": foreach (int dx in new[] { -70, 0, 70 }) Lob(e, ecx + e.face * 20, e.y + 16, pcx + dx, pcy, .9f, "water"); mu?.Sfx("shoot"); break;
                case "scream":
                    fx?.Add("bvfx", 8, ecx, e.cy, 140, life: .6f, grow: 1.4f, a: .8f); haz.Add(new Hazard { kind = "ring", x = ecx, y = e.cy, at = songPos, speed = 300, max = 560 });
                    if (c >= 2) haz.Add(new Hazard { kind = "ring", x = ecx, y = e.cy, at = songPos + bl * .5f, speed = 300, max = 560 }); shake = 6; mu?.Sfx("die"); break;
                case "blink":
                    { int side = Random.value < .5f ? -1 : 1; e.x = pcx + side * 190 - e.w / 2; e.y = f - 95 - e.h / 2; e.face = -side; fx?.Add("hud", Fx.HUD_SMOKE, e.cx, e.cy, 70, life: .6f);
                      float dx = pcx - e.cx, dy = pcy - e.cy, d = Mathf.Max(1, Hyp(dx, dy)); e.swoopT = .55f; e.svx = dx / d * 480; e.svy = dy / d * 480; mu?.Sfx("dash"); break; }
                case "low": case "high": case "lowhigh": case "highlow": case "hair": mu?.Sfx("strike"); shake = 5; break;
                case "breath": mu?.Sfx("shoot"); if (c >= 1) AddHaz("fire", e.face > 0 ? e.x + e.w + 150 : e.x - 230, f - 22, 80, 22, songPos + bl, songPos + bl * 3); break;
                case "stomp":
                    fx?.Add("bvfx", 1, ecx, f - 18, 80, life: .55f, grow: .25f, ay: .8f); shake = 12; mu?.Sfx("kill"); Waves(e, 340 + 30 * c);
                    if (HurtsPlayer && Mathf.Abs(pcx - ecx) < e.w / 2 + 50 && P.b.y + P.b.h > f - 40) Struck(e, Sgn(pcx - ecx), -.6f, 2); break;
                case "inhale": e.suck = false; mu?.Sfx("kill"); if (HurtsPlayer && P.b.Overlaps(e.face > 0 ? ecx : ecx - 110, f - 70, 110, 70)) Struck(e, e.face, -.3f, 2); break;
                case "scrap": for (int i = 0; i < 5; i++) Lob(e, ecx + e.face * 30, e.y + 10, pcx + (i - 2) * 55, f - 10, .8f + i * .05f, "scrap"); mu?.Sfx("shoot"); break;
                case "claw": fx?.Add("bvfx", 6, ecx + e.face * 60, f - 34, 90, life: .3f, flip: e.face < 0, grow: .2f); for (int i = 0; i < 3; i++) { float at = songPos + i * bl * .5f; AddHaz("claw", e.face > 0 ? ecx + 10 : ecx - 120, f - 64, 110, 64, at, at + .15f); } mu?.Sfx("slash"); break;
                case "roar": fx?.Add("bvfx", 8, ecx, e.cy, 140, life: .6f, grow: 1.4f, a: .8f); shake = 14; mu?.Sfx("die"); if (Mathf.Abs(pcx - ecx) < 360) { P.vx = Sgn(pcx - ecx) * 560; P.dashCd = Mathf.Max(P.dashCd, bl * 1.5f); } break;   // the roar only pushes you back — it does not wound
                case "fan": case "fan2":
                    { int n = a == "fan2" || e.mask == 2 ? 2 : 1; for (int i = 0; i < n; i++) { float ang = Mathf.Atan2(pcy - (e.y + 20), pcx - ecx) + (n > 1 ? (i - .5f) * .5f : 0); const float sp = 430; shots.Add(new Shot { x = ecx + e.face * 16, y = e.y + 20, vx = Mathf.Cos(ang) * sp, vy = Mathf.Sin(ang) * sp, owner = e, life = 3.5f, look = "fan", boom = .7f, r = 6 }); } mu?.Sfx("slash"); break; }
                case "dance": e.danceT = 2 * bl; mu?.Sfx("dash"); break;
            }
            return false;
        }

        string BossPick(Enemy e, string[] pool, float dist)   // weighted, read from the distance: close blows up close, reaching ones from afar, and no turtling at range
        {
            var ws = new float[pool.Length]; float sum = 0;
            for (int i = 0; i < pool.Length; i++) { string m = pool[i]; float w = MELEE.Contains(m) ? (dist < 230 ? 2.2f : .45f) : (dist > 260 ? 1.5f : .85f); if (e.farT > 2.2f && CLOSER.Contains(m)) w *= 4; if (m == e.lastAct) w *= .3f; if (m == e.lastAct && m == e.prevAct) w = 0; ws[i] = w; sum += w; }
            float r = (float)e.rng.NextDouble() * sum; string a = pool[0]; for (int i = 0; i < pool.Length; i++) { r -= ws[i]; if (r <= 0) { a = pool[i]; break; } }
            e.prevAct = e.lastAct; if (CLOSER.Contains(a)) e.farT = 0; return a;
        }

        void StepBoss(Enemy e, float dt, float pcx, float pcy, float dist, bool live)
        {
            e.farT = dist > 300 ? e.farT + dt : 0;
            var B = e.B; float bl = BeatLen; int c = run.cycle + 1;   // guardians fight one tier above the turn
            e.emergeT = Mathf.Max(0, e.emergeT - dt); e.stagT = Mathf.Max(0, e.stagT - dt); e.swingT = Mathf.Max(0, e.swingT - dt); e.walkT = Mathf.Max(0, e.walkT - dt); e.landT = Mathf.Max(0, e.landT - dt); e.turnT = Mathf.Max(0, e.turnT - dt); e.invisT = Mathf.Max(0, e.invisT - dt);
            if (!e.awake)
            {
                if (!(live && dist < 470)) return; e.awake = true; mu?.Jing(); SealArena(e, true);
                bool seen = Meta.I.seen.Contains(e.kind); if (!seen) { Meta.I.seen.Add(e.kind); Meta.I.Save(); bossIntro = 1.7f; introBoss = e; } else Toast(Boss.Josa(B.name, "이", "가") + " 길을 막는다");
                e.nextAt = (Mathf.Floor(songPos / bl) + 2) * bl + (bossIntro > 0 ? 1.7f : 0);
            }
            if (lv.sealOn) { float lo = (lv.sealX0 + 1) * World.T + 2, hi = lv.sealX1 * World.T - e.w - 2; if (e.x < lo) { e.x = lo; if (e.vx < 0) e.vx = 0; } if (e.x > hi) { e.x = hi; if (e.vx > 0) e.vx = 0; } }   // the guardian stays inside its barrier
            if (!B.fly && !e.hidden && lv.RectSolid(e.x, e.y, e.w, e.h)) lv.Unstick(e);   // never left inside the rock
            float ecx = e.cx;
            void Deadly() { if (live && HurtsPlayer && e.Overlaps(P.b)) Struck(e, Sgn(pcx - e.cx), -.3f, e.raged ? 2 : 1); }   // a charging guardian hits harder once enraged
            if (e.air)   // leaping: arc under gravity, deadly on contact, shake on landing
            {
                e.vy += 1900 * dt; lv.MoveX(e, e.vx * dt);
                if (lv.MoveY(e, e.vy * dt) && e.vy > 0)
                {
                    e.air = false; e.vx = e.vy = 0; e.landT = .22f; e.mv = 0; shake = 8; fx?.Add("bvfx", 1, e.cx, e.floor - 16, 60, life: .45f, grow: .2f, ay: .8f); fx?.Add("hud", Fx.HUD_DUST, e.cx, e.y + e.h, 80, life: .4f, ay: 1);
                    if (e.kind == "baekho") AddHaz("claw", e.x - 50, e.y + e.h - 60, e.w + 100, 60, songPos, songPos + .12f);
                    if (e.kind == "haetae") { AddHaz("fire", e.x - 40, e.floor - 22, e.w + 80, 22, songPos, songPos + bl * 1.5f); if (c >= 1) Waves(e, 330); }
                    if (e.kind == "gumiho" && c >= 1) for (int i = 0; i < 4; i++) { float t = -Mathf.PI * (i + .5f) / 4; shots.Add(new Shot { x = e.cx, y = e.y + 10, vx = Mathf.Cos(t) * 170, vy = Mathf.Sin(t) * 170, owner = e, life = 3, look = "orb", home = .6f, r = 4 }); }
                }
                if (e.y > lv.h * World.T) { e.y = e.floor - e.h; e.air = false; }
                Deadly();
            }
            else if (e.chargeT > 0)
            {
                e.chargeT -= dt; float ahead = ecx + e.face * (e.w / 2 + 4);
                if (!lv.GroundPt(ahead, e.y + e.h + 4) || lv.MoveX(e, e.face * e.cv * dt)) { if (e.kind == "haetae" && !e.bounced) { e.bounced = true; e.face = -e.face; } else e.chargeT = 0; }
                if (e.chargeT <= 0) e.bounced = false;
                Deadly();
            }
            else if (e.swoopT > 0) { e.swoopT -= dt; e.x += e.svx * dt; e.y = Mathf.Min(e.floor - e.h, e.y + e.svy * dt); Deadly(); }   // 원귀's dive
            else if (e.danceT > 0)   // 탈춤꾼 spins toward you, step by step
            {
                e.danceT -= dt; e.face = Sgn(pcx - ecx); float ahead = ecx + e.face * (e.w / 2 + 4);
                if (lv.GroundPt(ahead, e.y + e.h + 4)) lv.MoveX(e, e.face * (e.mask == 1 ? 300 : 220) * dt); Deadly();
            }
            else if (e.act == null)
            {
                if (e.stagT <= 0 && !e.hidden)   // it turns only once you have stayed behind it a moment, and the turn takes a beat
                {
                    int want = Sgn(pcx - ecx);
                    if (want != e.face && Mathf.Abs(pcx - ecx) > 24) { e.turnWait += dt; if (e.turnWait > .2f) { e.face = want; e.turnT = .16f; e.turnWait = 0; e.mv *= .3f; } } else e.turnWait = 0;
                }
                if (B.fly && !e.hidden)   // hover a little way off, bobbing — eased, never on rails
                {
                    float tx = pcx - e.face * 200, ty = e.floor - 95 - e.h / 2 + Mathf.Sin(songPos * 2) * 14, k = Mathf.Min(1, dt * 2.4f);
                    e.fvx += (Mathf.Clamp((tx - ecx) * 2, -160, 160) - e.fvx) * k; e.fvy += (Mathf.Clamp((ty - e.cy) * 2, -130, 130) - e.fvy) * k; e.x += e.fvx * dt; e.y += e.fvy * dt;
                }
                else if (!B.still)   // walking eases in and out instead of starting and stopping dead
                {
                    float sp = B.speed * 1.25f * (e.hp <= e.maxHp / 2f ? 1.3f : 1) * (e.invisT > 0 ? 2 : 1) * (e.mask == 1 ? 1.6f : 1) + 10 * c; bool go = dist > 110 && e.stagT <= 0 && !(e.turnT > 0) && !(e.landT > 0);
                    e.mv += Mathf.Clamp((go ? sp : 0) - e.mv, -sp * 4 * dt, sp * 4 * dt); float ahead = ecx + e.face * (e.w / 2 + 4);
                    if (e.mv > 4 && lv.GroundPt(ahead, e.y + e.h + 4) && !lv.SolidPt(ahead, e.y + e.h - 10)) { lv.MoveX(e, e.face * e.mv * dt); e.walkT = .12f; e.wph += e.mv * dt / Mathf.Max(22, e.w * .55f); } else if (!go) e.mv = Mathf.Max(0, e.mv - sp * 6 * dt); else e.mv = 0;
                }
                if (live && songPos >= e.nextAt && e.stagT <= 0)
                {
                    if (!e.raged && e.hp <= e.maxHp / 2f)   // 격노: at half strength it roars — no harm comes while it does
                    {
                        e.raged = true; fx?.Add("bfx3", 4, e.cx, e.cy, e.h * 1.8f, life: 1.1f, grow: .4f, a: .9f); fx?.Add("bfx3", 0, e.cx, e.floor, 160, life: .7f, grow: 1, ay: .7f);
                        P.focus = false; mu?.Muffle(false); P.dashT = 0; P.invT = Mathf.Max(P.invT, 2.2f); foreach (var b in shots) if (!b.friendly) b.life = 0; haz.RemoveAll(z => z.at <= songPos + 2); shake = 14; mu?.Sfx("die"); hitstop = Mathf.Max(hitstop, .5f);
                        fx?.Pop(e.cx, e.y - 20, "격노", SEAL); Toast(Boss.Josa(B.name, "이", "가") + " 격노했다");
                    }
                    var pool = new List<string>(B.Pool(c)); if ((e.raged || run.cycle >= 2) && B.rage != null) pool.AddRange(B.rage);   // from the third turn a guardian knows all its moves
                    string a = BossPick(e, pool.ToArray(), dist);
                    if ((a == "slam" || a == "club" || a == "inhale") && dist > 280) a = e.kind == "sumun" ? (c >= 1 ? "volley" : "charge") : e.kind == "dokkaebi" ? "coins" : "scrap";
                    if (a == "claw" && dist > 200) a = "leap";
                    e.act = a; e.hitAt = (Mathf.Floor(songPos / bl) + 1) * bl; if (e.hitAt - songPos < .45f) e.hitAt += bl; e.actFrom = songPos;
                    if (DELAYABLE.Contains(a) && e.rng.NextDouble() < (e.raged ? .45 : .25)) e.hitAt += bl * .5f;   // a held swing: the blow waits half a beat longer than the eye expects
                    BossChoose(e, a, pcx, bl, c);
                }
            }
            else
            {
                if (e.suck && live && P.dashT <= 0) P.vx += Sgn(ecx - pcx) * 1100 * dt;   // 불가사리 breathes in
                if (songPos >= e.hitAt)
                {
                    string a = e.act; e.act = null; e.swingT = .35f; e.lastAct = a;
                    bool rage = e.raged || e.hp <= e.maxHp / 2f; int gap = Mathf.Max(1, 2 - (c >> 1) - (e.mask == 1 ? 1 : 0) - (rage ? 1 : 0) + (e.kind == "jangseung" ? 1 : 0));
                    if (!BossPerform(e, a, pcx, pcy, bl, c))   // strings of blows, then an opening: a guardian is punished in its recovery, not mid-string
                    {
                        if (e.comboLeft > 0) { e.comboLeft--; e.nextAt = e.hitAt + bl * .5f; }
                        else { e.nextAt = e.hitAt + (gap + 1) * bl; e.recoverUntil = e.nextAt; double r1 = e.rng.NextDouble(); e.comboLeft = rage ? (r1 < .35 ? 3 : r1 < .7 ? 2 : 1) : (r1 < .3 ? 2 : r1 < .65 ? 1 : 0); }
                    }
                }
            }
            if (live && !e.hidden && !e.air && !(e.chargeT > 0) && !(e.swoopT > 0) && !(e.danceT > 0) && e.Overlaps(P.b) && P.dashT <= 0) { P.vx = Sgn(pcx - e.cx) * 320; if (!P.onGround) P.vy = Mathf.Min(P.vy, -120); }   // bulk shoves you back
            if (!e.hidden) DashThrough(e);
        }

        // a plain cut takes one, an 일섬 two, a read blow three and staggers it out of its wind-up
        void HurtBoss(Enemy e, bool strike, string kind, bool kan, bool heavy)
        {
            bool il = kind == "il";
            if (!strike && !il && (e.B.armored || (e.kind == "talchum" && e.mask == 0))) { e.hitT = .1f; mu?.Sfx("clang"); fx?.Add("hud", Fx.HUD_SPARK, e.cx, e.y + 20, 34, life: .25f); return; }
            if (!strike && !il && !(e.recoverUntil > songPos))   // a flurry of plain cuts: the guardian sets its guard for a moment (never in its recovery)
            {
                if (e.guardT > songPos) { e.hitT = .1f; mu?.Sfx("clang"); fx?.Add("hud", Fx.HUD_SPARK, e.cx, e.y + e.h * .4f, 40, life: .25f); return; }
                e.softN = songPos - e.softAt < 1.6f ? e.softN + 1 : 1; e.softAt = songPos;
                if (e.softN >= tu.BOSS_GUARD_HITS) { e.softN = 0; e.guardT = songPos + tu.BOSS_GUARD_T; Toast("막아 낸다 · 틈이나 간파를 노려라"); }
            }
            bool aimed = kan || heavy, mua = kan && e.kanMua; e.kanpa = false;
            e.hp -= kan ? 3 : heavy ? 3 : strike ? 2 : il ? 2 : e.recoverUntil > songPos ? 2 : 1; e.hitT = .22f;   // a cut in the opening bites twice
            fx?.Add("bvfx", 4, e.cx + (Random.value - .5f) * e.w * .4f, e.y + e.h * (.3f + Random.value * .3f), aimed ? 120 : strike ? 80 : 54, life: .28f, grow: .25f, rot: Random.value * 6.28f, a: .9f);
            if (il) AddQi(4);
            if (kan) { P.RegainAir(); Whet(); AddQi((run.Has("d_beat") ? 2 : 1) * (mua ? 2 : 1) * 15); P.ki = Mathf.Min(1, P.ki + .5f); ChainAdd(mua ? 2 : 1); KanPerks(e); if (mua) killCam = Mathf.Max(killCam, .3f); hitstop = Mathf.Max(hitstop, .12f); shake = Mathf.Max(shake, 9); haz.RemoveAll(z => z.kind != "ring"); }
            if (aimed) { e.stagT = kan ? .7f : .3f; e.act = null; e.suck = false; e.chargeT = 0; e.danceT = 0; e.swoopT = 0; e.nextAt = songPos + 2 * BeatLen; if (e.hidden) { e.hidden = false; e.x = e.tx - e.w / 2; } }
            fx?.Add("fx", Fx.FX_DROPS, e.cx, e.y + 30, 30, life: .4f, rot: Random.value * 6.28f);
            hitstop = Mathf.Max(hitstop, .05f); mu?.Sfx("clang"); shake = Mathf.Max(shake, 4);
            if (e.hp <= 0) KillEnemy(e);
        }

        public bool bossFell;
        void BossFell(Enemy e)
        {
            float x = e.cx, y = e.cy; bossFell = true; run.honBonus += 30;
            fx?.Add("bcal", 6, x, y, e.h * 2.2f, life: .7f, grow: .5f, rot: Random.value * 6.28f, a: .9f); fx?.Add("bcal", 5, x, y, e.h * 1.6f, life: .8f, grow: .45f, rot: Random.value * 6.28f, a: .85f);
            fx?.Add("bvfx", 7, x, e.y + e.h * .4f, e.h * 1.8f, life: 1.4f, grow: .3f, ay: .7f, a: .9f);
            killCam = Mathf.Max(killCam, .9f); SealArena(null, false); haz.Clear(); foreach (var o in foes) if (o.type == 'i') o.alive = false;
            Toast(Boss.Josa(e.B.name, "이", "가") + " 쓰러졌다 · 천고를 베어라"); mu?.Jing(); shake = 14;
            if (fx != null) for (int k = 0; k < 3; k++) fx.Bleed(lv, x + (k - 1) * 20, e.y + 20 + k * 18, new Vector2(k - 1, -.4f), true);
        }

        // ---------- 천고난무: the full drum, loosed when you choose ----------
        // plain and the same until a branch's end turns it into 일섬천격; plain, it does not wound a guardian
        bool Chungo()
        {
            bool open = run.OugiOpen; float cx = P.b.cx, cy = P.b.cy;
            var ts = Nearest(cx, cy, !open ? tu.DRUM_PLAIN_N : run.Has("d_giseom") ? 10 : 8, !open ? tu.DRUM_PLAIN_R : 480); ts.RemoveAll(e => e.hidden);
            if (ts.Count == 0) return false;
            chungo = new Chungo { ts = ts, plain = !open }; chungo.pts.Add(new Vector2(cx, cy)); foreach (var e in ts) chungo.pts.Add(new Vector2(e.cx, e.cy));
            run.qi = 0; P.invT = Mathf.Max(P.invT, 1.2f); P.vx = P.vy = 0;
            foreach (var e in ts) e.stunT = Mathf.Max(e.stunT, open ? 2 : .8f); mu?.Sfx("dash"); if (open) { flashDim = .14f; fx?.Banner("일섬천격", "오의"); }
            return true;
        }
        void StepChungo(float rdt)
        {
            var c = chungo; c.t += rdt; hitstop = Mathf.Max(hitstop, .05f); int n = c.pts.Count - 1; const float lay = .09f;
            if (c.t >= n * lay + .25f && !c.done)   // the held breath lets go
            {
                c.done = true; P.aimDash = true; P.aimedUntil = songPos + .6f;
                foreach (var e in c.ts) { if (c.plain && e.type == 'b') HurtEnemy(e, false); else HurtEnemy(e, true, null, true); if (!e.alive) fx?.Bleed(lv, e.cx, e.cy, new Vector2(Random.value * 2 - 1, -.5f), true); }
                P.aimDash = false;
                var last = c.ts[c.ts.Count - 1]; int side = Sgn(last.cx - c.pts[0].x); float nx = last.cx + side * (last.w / 2 + 16) - P.b.w / 2, ny = last.y + last.h - P.b.h - .01f;
                if (!lv.RectSolid(nx, ny, P.b.w, P.b.h)) { P.b.x = nx; P.b.y = ny; P.face = -side; }
                P.vy = -200; P.RegainAir();
                foreach (var e in c.ts) { if (c.plain) fx?.Add("wfx", 7, e.cx, e.cy, 40, life: .3f, grow: .4f); else { fx?.Add("ogA", 0, e.cx, e.cy, 110, life: .55f, rot: Random.value * .5f - .25f); fx?.Add("wfx", 8, e.cx, e.cy, 76, life: .4f, grow: .3f, rot: Random.value * 6.28f); } }
                if (c.plain) { shake = 6; mu?.Sfx("strike"); } else { shake = 18; flash = .35f; killCam = Mathf.Max(killCam, .7f); mu?.Jing(); mu?.Sfx("strike"); }
            }
            if (c.t > n * lay + .9f) chungo = null;
        }
        // 일섬천격 (역습 다섯 연쇄): every foe in sight is answered at once
        void IlseomCheon()
        {
            float cx = P.b.cx, cy = P.b.cy; flash = .3f; hitstop = Mathf.Max(hitstop, .15f); shake = 16; mu?.Jing(); fx?.Add("ogA", 0, cx, cy, 260, life: .6f); fx?.Banner("일섬천격", "오의");
            foreach (var o in new List<Enemy>(foes)) if (o.alive && !Ghostly(o) && Mathf.Abs(o.x - cx) < 520 && Mathf.Abs(o.y - cy) < 300) { fx?.Trail(cx, cy, o.cx, o.cy, 5, .5f, Fx.WF_STREAK); if (o.type != 'b') HurtEnemy(o, true); else HurtEnemy(o, true, null, true); }
        }

        // ---------- what stands in a gate besides foes: 과녁, lanterns to return to, the drum itself ----------
        public int cpIdx = -1; public bool drumCut;
        void BreakTarget(Target g)   // 과녁: the cut gives the air dash back, and the target hangs again a moment later
        {
            g.t = 2.5f; AddQi(5); P.ki = Mathf.Min(1, P.ki + .25f); P.RegainAir();
            fx?.Add("fx", 1, g.x, g.y, 46, life: .25f, rot: Random.value * 6.28f); fx?.Ring(g.x, g.y, 34, Fx.Rgb(SEAL, .85f), .3f); hitstop = Mathf.Max(hitstop, .04f); mu?.Sfx("lantern");
        }
        void StepWorld(float dt)
        {
            float cx = P.b.cx, cy = P.b.cy;
            foreach (var g in lv.targets)
            {
                if (g.t > 0) { g.t -= dt; continue; }
                if (P.dashT > 0 && Hyp(g.x - cx, g.y - cy) < 30) BreakTarget(g);
                else if (P.slashT > 0 && !P.onGround && Hyp(g.x - (cx + P.slashDir.x * 26), g.y - (cy + P.slashDir.y * 26)) < 50) BreakTarget(g);
            }
            for (int i = 0; i < lv.cps.Count; i++)   // a lantern passed: death brings you back here
            {
                var c = lv.cps[i]; if (i == cpIdx || !(Mathf.Abs(cx - c.x) < 26 && cy < c.y && cy > c.y - 3 * World.T)) continue;
                cpIdx = i; run.cp = new List<int>(deadIds); mu?.Sfx("lantern"); fx?.Ring(c.x, c.y - 30, 40, new Color(.85f, .65f, .12f, .8f), .5f);
            }
            if (lv.hasDrum && !drumCut && !BossAlive && ((P.slashT > 0 && Mathf.Abs(cx + P.slashDir.x * 26 - lv.drum.x) < 60 && cy > lv.drum.y - 90 && cy < lv.drum.y + 10) || (P.dashT > 0 && Mathf.Abs(cx - lv.drum.x) < 30 && cy > lv.drum.y - 80)))
            {
                drumCut = true; fx?.Add("hud", Fx.HUD_SPARK, lv.drum.x, lv.drum.y - 20, 70, life: .5f); fx?.Seal(lv.drum.x, lv.drum.y - 30, -.1f, true); mu?.Sfx("strike"); mu?.Jing(); shake = 8; hitstop = .12f; cleared = true;
            }
            for (int i = clones.Count - 1; i >= 0; i--)   // 잔영: the shadow left behind strikes once, then is gone
            {
                var c = clones[i];
                if (c.ward > 0) { c.ward -= dt; foreach (var b in shots) if (!b.friendly && b.life > 0 && Hyp(b.x - c.x, b.y - (c.y - 20)) < 70) { b.life = 0; fx?.Add("hud", Fx.HUD_SPARK, b.x, b.y, 18, life: .2f); } }
                if (c.t > 0) { c.t -= dt; if (c.t <= 0) { foreach (var e in new List<Enemy>(foes)) if (e.alive && Hyp(e.cx - c.x, e.cy - (c.y - 20)) < 85) HurtEnemy(e, false); fx?.Add("slashfx", 3, c.x + c.face * 20, c.y - 22, 70, life: .25f, flip: c.face < 0); } }
                if (c.t <= 0 && c.ward <= 0) clones.RemoveAt(i);
            }
        }
    }
}
