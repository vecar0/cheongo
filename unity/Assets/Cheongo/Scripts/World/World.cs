// The world in the web game's own terms: pixels, 32 to a tile, y growing downward.
// Everything that moves keeps its box in these units; only drawing turns them into Unity units (1 tile = 1 unit, y up).
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class Box { public float x, y, w, h; }

    public static class World
    {
        public const float T = 32f;          // one tile, in world pixels
        public const float PPU = 100f;       // pixels per unit used when slicing art; drawing scales from it
        public static Vector3 ToUnity(float x, float y, float z = 0) => new Vector3(x / T, -y / T, z);

        // scale a renderer so its frame (frameH art pixels tall) stands worldH world pixels tall
        public static float ScaleFor(float worldH, float frameH) => (worldH / T) / (frameH / PPU);
    }

    public class Foe { public char type; public int tx, ty, id; }

    public class Level
    {
        public int w, h; public byte[] grid;   // 0 air, 1 rock, 2 thorns, 3 ledge
        public Vector2 start; public Rect exit; public readonly List<Foe> foes = new List<Foe>();
        public Palette pal; public int madang;

        public int TileAt(int tx, int ty) { if (tx < 0 || tx >= w) return 1; if (ty < 0 || ty >= h) return 0; return grid[ty * w + tx]; }

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

        // a gate laid out as on the web: the start piece, then hand-made pieces drawn from this 마당's tier list, then the way out
        public static Level Build(int m, int seed)
        {
            var tb = DB.Tables; var rng = new System.Random(seed);
            var rows = new List<string>(tb.START_PIECE);
            var tiers = new List<string>(tb.MADANG[m].tiers);
            for (int i = tiers.Count - 1; i > 0; i--) { int j = rng.Next(i + 1); (tiers[i], tiers[j]) = (tiers[j], tiers[i]); }
            var used = new HashSet<int>();
            foreach (var tier in tiers.GetRange(0, Mathf.Min(5, tiers.Count)))
            {
                char kind = char.IsLetter(tier[0]) ? tier[0] : ' '; int t = int.Parse(kind == ' ' ? tier : tier.Substring(1));
                var pool = new List<int>();
                for (int i = 0; i < DB.Chunks.Length; i++) { var c = DB.Chunks[i]; bool fits = kind == 'w' ? c.wall && c.tier <= t : kind == 'm' ? c.multi && c.tier <= t : c.tier == t && !c.multi; if (fits && !used.Contains(i)) pool.Add(i); }
                if (pool.Count == 0) for (int i = 0; i < DB.Chunks.Length; i++) { var c = DB.Chunks[i]; if (kind == 'w' ? c.wall && c.tier <= t : kind == 'm' ? c.multi && c.tier <= t : c.tier == t && !c.multi) pool.Add(i); }
                int ci = pool[rng.Next(pool.Count)]; used.Add(ci);
                var map = (string[])DB.Chunks[ci].map.Clone(); bool flip = rng.NextDouble() < .5;
                for (int y = 0; y < 16; y++)
                {
                    var row = map[y].ToCharArray(); if (flip) System.Array.Reverse(row);
                    for (int x = 0; x < row.Length; x++)
                    {
                        if (row[x] == '?') { double r = rng.NextDouble(); row[x] = m == 0 ? (r < .55 ? 'p' : 'g') : m == 1 ? (r < .35 ? 'p' : r < .62 ? 'g' : r < .82 ? 's' : 'a') : (r < .2 ? 'p' : r < .36 ? 'g' : r < .52 ? 'h' : r < .66 ? 's' : r < .84 ? 'a' : 'k'); }
                        else if (row[x] == '*') row[x] = rng.NextDouble() < .5 + .12 * m ? 'd' : ' ';
                        else if (row[x] == 'L' || row[x] == 'M') row[x] = ' ';   // light beams: a later step
                    }
                    rows[y] += new string(row);
                }
            }
            for (int y = 0; y < 16; y++) rows[y] += y >= 12 ? "##########" : y == 11 ? "      E   " : "          ";
            return FromRows(rows.ToArray(), m);
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
                else if (ch == 'P') lv.start = new Vector2(x * World.T + 7, (y + 1) * World.T - 30);
                else if (ch == 'E') lv.exit = new Rect(x * World.T + 1, (y - 1) * World.T + 6, World.T - 2, 2 * World.T - 6);
                else if ("gsdhmrbpak".IndexOf(ch) >= 0) lv.foes.Add(new Foe { type = ch, tx = x, ty = y, id = id++ });
            }
            return lv;
        }
    }
}
