// The world in the web game's own terms: pixels, 32 to a tile, y growing downward.
// Everything that moves keeps its box in these units; only drawing turns them into Unity units (1 tile = 1 unit, y up).
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class Box
    {
        public float x, y, w, h;
        public float cx => x + w / 2; public float cy => y + h / 2;
        public bool Overlaps(Box o) => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y;
        public bool Overlaps(float ox, float oy, float ow, float oh) => x < ox + ow && x + w > ox && y < oy + oh && y + h > oy;
    }

    public static class World
    {
        public const float T = 32f;          // one tile, in world pixels
        public const float PPU = 100f;       // pixels per unit used when slicing art; drawing scales from it
        public static Vector3 ToUnity(float x, float y, float z = 0) => new Vector3(x / T, -y / T, z);

        // scale a renderer so its frame (frameH art pixels tall) stands worldH world pixels tall
        public static float ScaleFor(float worldH, float frameH) => (worldH / T) / (frameH / PPU);
    }

    public class Foe { public char type; public int tx, ty, id; }
    // the 마당's own ground (js/game.js): 기와 that gives way, chests behind cracked rock, wind, the walled 결진
    public class Crumb { public float at, back; public bool gone; }
    public class Chest { public float x, y; public bool open; }
    public class Wind { public float x0, x1; public int ph; public float py = -1; }
    public class ArenaZone { public int x0, x1, y0, y1, st; public List<int> set; }

    public class Level
    {
        public int w, h; public byte[] grid;   // 0 air, 1 rock, 2 thorns, 3 ledge, 4/5 장단 발판 (on two beats of four, opposite phases), 6 기와 (gives way), 7 cracked rock (solid until cut)
        public float songPos, beatLen = .6f;   // the living ground keeps the 장단: set by Sim every frame
        public readonly Dictionary<int, Crumb> crumb = new Dictionary<int, Crumb>(); public readonly HashSet<int> cracks = new HashSet<int>();
        public readonly List<Chest> chests = new List<Chest>(); public readonly List<Wind> winds = new List<Wind>(); public readonly List<ArenaZone> arenas = new List<ArenaZone>();
        public bool sealOpen; public int gridVer;   // the exit's 결계 · bumped whenever a tile changes (arena walls, a crack falling)
        public Vector2 start; public Rect exit; public readonly List<Foe> foes = new List<Foe>();
        public Palette pal; public int madang;
        public readonly List<Target> targets = new List<Target>(); public readonly List<Vector2> cps = new List<Vector2>();   // 과녁 · lanterns (checkpoints)
        public readonly List<Vector2> points = new List<Vector2>();   // 연: the kites the line can catch
        public bool hasDrum, sealOn; public Vector2 drum; public int sealX0, sealX1, sealY1;   // 천고 itself · the talisman barrier around a guardian

        public int TileAt(int tx, int ty)
        {
            if (tx < 0 || tx >= w) return 1; if (ty < 0 || ty >= h) return 0; int i = ty * w + tx, v = grid[i];
            if (v < 4) return v; if (v == 7) return 1;
            if (v == 6) return crumb.TryGetValue(i, out var c) && c.gone ? 0 : 3;
            return PlankOn(v) ? 3 : 0;
        }
        public bool PlankOn(int v) { int b = Mathf.FloorToInt(songPos / beatLen) + (v == 5 ? 2 : 0); return ((b % 4) + 4) % 4 < 2; }
        // +1 about to appear, −1 about to go (the board blinks a half beat ahead)
        public int PlankNext(int v) { float bp = songPos / beatLen; int b = Mathf.FloorToInt(bp); float f = bp - b; int n = (((b + 1 + (v == 5 ? 2 : 0)) % 4) + 4) % 4; return f > .45f ? (n == 0 ? 1 : n == 2 ? -1 : 0) : 0; }

        public bool RectSolid(float x, float y, float bw, float bh)
        {
            int x0 = Mathf.FloorToInt(x / World.T), x1 = Mathf.FloorToInt((x + bw - .01f) / World.T), y0 = Mathf.FloorToInt(y / World.T), y1 = Mathf.FloorToInt((y + bh - .01f) / World.T);
            for (int ty = y0; ty <= y1; ty++) for (int tx = x0; tx <= x1; tx++) if (TileAt(tx, ty) == 1) return true;
            return false;
        }

        // moves step at most half a tile at a time, so a big shove can never carry a body through a wall
        public bool MoveX(Box o, float dx)
        {
            int n = Mathf.Max(1, Mathf.CeilToInt(Mathf.Abs(dx) / (World.T / 2))); float st = dx / n;
            for (int i = 0; i < n; i++) { o.x += st; if (RectSolid(o.x, o.y, o.w, o.h)) { o.x = st > 0 ? Mathf.Floor((o.x + o.w) / World.T) * World.T - o.w - .001f : (Mathf.Floor(o.x / World.T) + 1) * World.T + .001f; return true; } }
            return false;
        }
        public bool MoveY(Box o, float dy)
        {
            int n = Mathf.Max(1, Mathf.CeilToInt(Mathf.Abs(dy) / (World.T / 2))); float st = dy / n;
            for (int i = 0; i < n; i++) { o.y += st; if (RectSolid(o.x, o.y, o.w, o.h)) { o.y = st > 0 ? Mathf.Floor((o.y + o.h) / World.T) * World.T - o.h - .001f : (Mathf.Floor(o.y / World.T) + 1) * World.T + .001f; return true; } }
            return false;
        }
        public bool SolidPt(float x, float y) => TileAt(Mathf.FloorToInt(x / World.T), Mathf.FloorToInt(y / World.T)) == 1;
        public bool GroundPt(float x, float y) { int v = TileAt(Mathf.FloorToInt(x / World.T), Mathf.FloorToInt(y / World.T)); return v == 1 || v == 3; }
        // a clear line between two points, sampled every 10px
        public bool Los(float x0, float y0, float x1, float y1)
        {
            float dx = x1 - x0, dy = y1 - y0; int n = Mathf.CeilToInt((float)System.Math.Sqrt(dx * dx + dy * dy) / 10);
            for (int i = 1; i < n; i++) { float t = (float)i / n; if (SolidPt(x0 + dx * t, y0 + dy * t)) return false; }
            return true;
        }
        static readonly int[,] UNSTICK = { { 0, -1 }, { -1, 0 }, { 1, 0 }, { -1, -1 }, { 1, -1 } };
        // a body found inside the rock is lifted or slid to the nearest open air
        public void Unstick(Box o)
        {
            if (!RectSolid(o.x, o.y, o.w, o.h)) return;
            for (int k = 1; k <= 24; k++) { int d = k * 4; for (int i = 0; i < 5; i++) { float ox = UNSTICK[i, 0] * d, oy = UNSTICK[i, 1] * d; if (!RectSolid(o.x + ox, o.y + oy, o.w, o.h)) { o.x += ox; o.y += oy; return; } } }
        }
        public float? FindFloor(float x, float y) { int tx = Mathf.FloorToInt(x / World.T), ty = Mathf.FloorToInt(y / World.T); while (ty < h && TileAt(tx, ty) != 1) ty++; return ty < h ? ty * World.T : (float?)null; }
        // a ledge ('=') catches you only when you fall onto its top from above
        public float? LedgeBelow(Box o, float prevBottom)
        {
            float bottom = o.y + o.h; int x0 = Mathf.FloorToInt(o.x / World.T), x1 = Mathf.FloorToInt((o.x + o.w - .01f) / World.T);
            for (int r = Mathf.FloorToInt(prevBottom / World.T); r <= Mathf.FloorToInt(bottom / World.T); r++)
            {
                float top = r * World.T; if (top < prevBottom - .5f || top > bottom) continue;
                for (int tx = x0; tx <= x1; tx++) if (TileAt(tx, r) == 3) return top;
            }
            return null;
        }
        public bool OnLedge(Box o)
        {
            float b = o.y + o.h; int r = Mathf.RoundToInt(b / World.T); if (Mathf.Abs(b - r * World.T) > 1.5f) return false;
            for (int tx = Mathf.FloorToInt(o.x / World.T); tx <= Mathf.FloorToInt((o.x + o.w - .01f) / World.T); tx++) if (TileAt(tx, r) == 3) return true;
            return false;
        }

        // a gate laid out as on the web: the start piece, then hand-made pieces drawn from the tier list of this 마당, then the way out.
        // md: which of the five 마당 (장단) it draws on · arena: 천고대, where the guardian and the drum wait · cycle: how many times 천고 has been cut · crowd: extra guards (험로)
        public static Level Build(int md, int seed, bool arena = false, int cycle = 0, int crowd = 0, int len = 5)
        {
            var tb = DB.Tables; var rng = new System.Random(seed ^ ((md + 1) * 0x9E3779) ^ (cycle * 0x85EBCA));   // each turn of the tower lays out fresh
            var rows = new List<string>(tb.START_PIECE);
            var tiers = new List<string>(tb.MADANG[md].tiers);
            for (int i = tiers.Count - 1; i > 0; i--) { int j = rng.Next(i + 1); (tiers[i], tiers[j]) = (tiers[j], tiers[i]); }
            var used = new HashSet<int>();
            foreach (var tier in tiers.GetRange(0, Mathf.Min(arena ? 2 : len, tiers.Count)))
            {
                char kind = char.IsLetter(tier[0]) ? tier[0] : ' '; int t = int.Parse(kind == ' ' ? tier : tier.Substring(1));
                var pool = new List<int>();
                for (int i = 0; i < DB.Chunks.Length; i++) { var c = DB.Chunks[i]; bool fits = kind == 'w' ? c.wall && c.tier <= t : kind == 'm' ? c.multi && c.tier <= t : c.tier == t && !c.multi; if (fits && !used.Contains(i)) pool.Add(i); }
                if (pool.Count == 0) for (int i = 0; i < DB.Chunks.Length; i++) { var c = DB.Chunks[i]; if (kind == 'w' ? c.wall && c.tier <= t : kind == 'm' ? c.multi && c.tier <= t : c.tier == t && !c.multi) pool.Add(i); }
                int ci = pool[rng.Next(pool.Count)]; used.Add(ci);
                var map = DB.Chunks[ci].map; bool flip = rng.NextDouble() < .5; var piece = new char[16][];
                for (int y = 0; y < 16; y++)
                {
                    var row = map[y].ToCharArray(); if (flip) System.Array.Reverse(row);
                    for (int x = 0; x < row.Length; x++)
                    {
                        if (row[x] == '?')
                        {
                            double r = rng.NextDouble(); row[x] = md == 0 ? (r < .55 ? 'p' : 'g') : md == 1 ? (r < .35 ? 'p' : r < .62 ? 'g' : r < .82 ? 's' : 'a') : (r < .2 ? 'p' : r < .36 ? 'g' : r < .52 ? 'h' : r < .66 ? 's' : r < .84 ? 'a' : 'k');   // 순라 in front, then 포수·저격수, 등패수, 자객, 북잡이
                            if (cycle >= 1) { double r2 = rng.NextDouble(); if (r2 < .14) row[x] = 'm'; else if (cycle >= 2 && r2 < .28) row[x] = 'r'; }   // 무당 from the second turn, 저승사자 from the third
                        }
                        else if (row[x] == '*') row[x] = rng.NextDouble() < .5 + .12 * md ? 'd' : ' ';
                        else if (row[x] == 'L' || row[x] == 'M' || row[x] == 'o') row[x] = ' ';   // 금줄 and 연: not ported
                    }
                    piece[y] = row;
                }
                if (piece[11].Length > 1 && piece[11][1] == ' ') piece[11][1] = 'C';
                // extra guards on open ground; each turn of 천고 brings more
                for (int extra = 1 + crowd + Mathf.Min(4, cycle); extra > 0; extra--) if (rng.NextDouble() < .45 + .08 * md + .35 * Mathf.Min(1, crowd) + .1 * Mathf.Min(3, cycle)) for (int tries = 0; tries < 8; tries++)
                {
                    int x = 3 + rng.Next(Mathf.Max(1, piece[0].Length - 6)), y = 2; while (y < 15 && piece[y][x] == ' ') y++;
                    bool near = false; for (int k = Mathf.Max(0, x - 2); k < Mathf.Min(piece[y - 1].Length, x + 3); k++) if ("gshdmrpak".IndexOf(piece[y - 1][k]) >= 0) near = true;
                    if (y < 15 && piece[y][x] == '#' && piece[y - 1][x] == ' ' && piece[y - 2][x] == ' ' && !near) { piece[y - 1][x] = md >= 2 && rng.NextDouble() < .35 ? 'h' : rng.NextDouble() < .5 ? 'p' : 'g'; break; }
                }
                for (int y = 0; y < 16; y++) rows[y] += new string(piece[y]);
            }
            if (arena) for (int y = 0; y < 16; y++) rows[y] += tb.ARENA_PIECE[y];   // only 天鼓臺 has a guardian, 천고 right behind it
            for (int y = 0; y < 16; y++) rows[y] += y >= 12 ? "########" : y == 11 ? (arena ? "     D  " : "     E  ") : "        ";
            return FromRows(rows.ToArray(), md);
        }

        // a gate laid out by the web game's own generator (tools/unity-export/maps.js → Resources/Data/maps.json)
        public static Level FromWeb(WebMap m)
        {
            var lv = FromRows(m.rows, m.md);
            if (m.wind != null) for (int i = 0; i + 1 < m.wind.Length; i += 2) lv.winds.Add(new Wind { x0 = m.wind[i] * World.T, x1 = m.wind[i + 1] * World.T, ph = (m.wind[i] * 7) % 2 });
            if (m.arenas != null) for (int i = 0; i + 3 < m.arenas.Length; i += 4) lv.arenas.Add(new ArenaZone { x0 = m.arenas[i], x1 = m.arenas[i + 1], y0 = m.arenas[i + 2], y1 = m.arenas[i + 3] });
            return lv;
        }

        public static Level FromRows(string[] map, int m)
        {
            var lv = new Level { h = map.Length, madang = m, pal = DB.Tables.PAL[Mathf.Clamp(m, 0, DB.Tables.PAL.Length - 1)] };
            foreach (var r in map) lv.w = Mathf.Max(lv.w, r.Length);
            lv.grid = new byte[lv.w * lv.h]; int id = 0;
            for (int y = 0; y < lv.h; y++) for (int x = 0; x < lv.w; x++)
            {
                char ch = x < map[y].Length ? map[y][x] : ' ';
                if (ch == '#') lv.grid[y * lv.w + x] = 1;
                else if (ch == '^') lv.grid[y * lv.w + x] = 2;
                else if (ch == '=') lv.grid[y * lv.w + x] = 3;
                else if (ch == '1' || ch == '2') lv.grid[y * lv.w + x] = (byte)(ch == '1' ? 4 : 5);
                else if (ch == 'x') lv.grid[y * lv.w + x] = 6;
                else if (ch == '%') { lv.grid[y * lv.w + x] = 7; lv.cracks.Add(y * lv.w + x); }
                else if (ch == '$') lv.chests.Add(new Chest { x = x * World.T + 16, y = (y + 1) * World.T });
                else if (ch == 'P') lv.start = new Vector2(x * World.T + 7, (y + 1) * World.T - 30);
                else if (ch == 'E') lv.exit = new Rect(x * World.T + 1, (y - 1) * World.T + 6, World.T - 2, 2 * World.T - 6);
                else if (ch == 'D') { lv.hasDrum = true; lv.drum = new Vector2(x * World.T + 16, (y + 1) * World.T); }
                else if (ch == 'T') lv.targets.Add(new Target { x = x * World.T + 16, y = y * World.T + 16 });
                else if (ch == 'o') lv.points.Add(new Vector2(x * World.T + 16, y * World.T + 16));
                else if (ch == 'C') lv.cps.Add(new Vector2(x * World.T + 16, (y + 1) * World.T));
                else if ("gsdhmrbpak".IndexOf(ch) >= 0) lv.foes.Add(new Foe { type = ch, tx = x, ty = y, id = id++ });
            }
            return lv;
        }
    }

    [System.Serializable] public class WebMap { public int md; public bool arena; public string[] rows; public int[] wind, arenas; }
    [System.Serializable] class WebMaps { public WebMap[] maps; }
    public static class Maps
    {
        static WebMap[] all;
        public static int Count => All.Length;
        static WebMap[] All { get { if (all == null) { var ta = Resources.Load<TextAsset>("Data/maps"); all = ta != null ? JsonUtility.FromJson<WebMaps>(ta.text).maps : new WebMap[0]; } return all; } }
        // one of the web-made gates for this 마당 (or 천고대), chosen by the seed; null if none were exported
        public static Level Pick(int md, bool arena, int seed)
        {
            var l = new List<WebMap>(); foreach (var m in All) if (m.arena == arena && (arena || m.md == md)) l.Add(m);
            if (l.Count == 0) return null; var w = l[(int)((uint)seed % (uint)l.Count)]; var lv = Level.FromWeb(w); if (arena) lv.madang = 4; return lv;
        }
    }
}
