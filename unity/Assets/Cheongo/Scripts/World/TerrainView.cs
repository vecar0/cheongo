// The living ground drawn as the web game's drawTerrain does, from the mapobj sheet: a painted board per run of 장단 발판
// (faint while off, blinking half a beat before it turns), a giwa tile per 기와 (it shivers once stood on and is gone until it
// returns), cracked rock with its red seam, chests, the wind's pole (its streamer turning with the wind), the 결진's gates while
// they are shut, and the exit's 결계 while too few guards are cut.
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class TerrainView : MonoBehaviour
    {
        const float T = World.T; const int MO_PLANK = 0, MO_GIWA = 1, MO_CRACK = 2, MO_CHEST = 3, MO_CHEST_OPEN = 4, MO_POLE = 5, MO_GATE = 7;
        Sim sim; Level lv; Sheet mo;
        class Plank { public SpriteRenderer r; public int v; }
        class Giwa { public SpriteRenderer r; public int i; public Vector3 home; }
        readonly List<Plank> planks = new List<Plank>(); readonly List<Giwa> giwas = new List<Giwa>();
        readonly Dictionary<int, SpriteRenderer> cracks = new Dictionary<int, SpriteRenderer>(); readonly List<(Chest c, SpriteRenderer r)> chests = new List<(Chest, SpriteRenderer)>();
        readonly List<(Wind z, SpriteRenderer r)> poles = new List<(Wind, SpriteRenderer)>(); readonly List<(ArenaZone a, SpriteRenderer l, SpriteRenderer r)> gates = new List<(ArenaZone, SpriteRenderer, SpriteRenderer)>();
        SpriteRenderer seal; readonly Sprite[] giwaSeg = new Sprite[4];

        public static TerrainView Create(Sim sim, Transform parent)
        {
            var go = new GameObject("Terrain"); go.transform.SetParent(parent, false);
            var v = go.AddComponent<TerrainView>(); v.sim = sim; v.lv = sim.lv; v.mo = Sheet.Get("mapobj"); v.Build(); return v;
        }
        SpriteRenderer Sr(string name, int order) { var go = new GameObject(name); go.transform.SetParent(transform, false); var r = go.AddComponent<SpriteRenderer>(); r.sortingOrder = order; return r; }
        // place a sprite so its frame (fw × fh art pixels) covers w × h world pixels with its pivot at (x, y)
        static void Fit(SpriteRenderer r, float x, float y, float w, float h, float fw, float fh) { r.transform.localPosition = World.ToUnity(x, y); r.transform.localScale = new Vector3(w / T / (fw / World.PPU), h / T / (fh / World.PPU), 1); }

        void Build()
        {
            if (mo == null) return;
            // 장단 발판: one painted board per run (top-left pivot, 3px over each end, 22 tall from 4 above the tile top)
            for (int ty = 0; ty < lv.h; ty++) for (int tx = 0; tx < lv.w; tx++)
            {
                int v = lv.grid[ty * lv.w + tx]; if ((v != 4 && v != 5) || (tx > 0 && lv.grid[ty * lv.w + tx - 1] == v)) continue;
                int n = 1; while (tx + n < lv.w && lv.grid[ty * lv.w + tx + n] == v) n++;
                var f = mo.Frames[MO_PLANK]; var r = Sr("Plank", -4); r.sprite = mo.Frame(MO_PLANK, 0, 0); Fit(r, tx * T - 3, ty * T - 4, n * T + 6, 22, f.w, f.h);
                planks.Add(new Plank { r = r, v = v });
            }
            // 기와: a quarter of the giwa painting per tile, in turn along the row
            { var f = mo.Frames[MO_GIWA]; float seg = f.w / 4f;
              for (int k = 0; k < 4; k++) giwaSeg[k] = Sprite.Create(mo.Tex, new Rect(f.x + k * seg, mo.Tex.height - f.y - f.h, seg, f.h), new Vector2(0, 1), World.PPU, 0, SpriteMeshType.FullRect);
              for (int ty = 0; ty < lv.h; ty++) for (int tx = 0; tx < lv.w; tx++) if (lv.grid[ty * lv.w + tx] == 6)
                  { var r = Sr("Giwa", -4); r.sprite = giwaSeg[tx % 4]; Fit(r, tx * T - 1, ty * T - 4, T + 2, 20, seg, f.h); giwas.Add(new Giwa { r = r, i = ty * lv.w + tx, home = r.transform.localPosition }); } }
            foreach (int i in lv.cracks)
            {
                var f = mo.Frames[MO_CRACK]; var r = Sr("Crack", -3); r.sprite = mo.Frame(MO_CRACK, 0, 0); r.color = new Color(1, 1, 1, .92f);
                Fit(r, (i % lv.w) * T - 2, (i / lv.w) * T - 2, T + 4, T + 4, f.w, f.h); cracks[i] = r;
            }
            foreach (var c in lv.chests) { var r = Sr("Chest", 3); chests.Add((c, r)); }
            foreach (var z in lv.winds)
            {
                int tx = Mathf.FloorToInt(z.x0 / T) + 1, y = 1; while (y < lv.h && lv.TileAt(tx, y) == 0) y++; z.py = y * T;
                var r = Sr("WindPole", 2); r.sprite = mo.Frame(MO_POLE, .5f, 1); float k = World.ScaleFor(110, mo.FrameH(MO_POLE)); r.transform.localPosition = World.ToUnity(z.x0 + T * 1.5f, z.py + 2); r.transform.localScale = new Vector3(k, k, 1); poles.Add((z, r));
            }
            foreach (var a in lv.arenas)
            {
                SpriteRenderer G(int x, bool flip) { var r = Sr("ArenaGate", 4); r.sprite = mo.Frame(MO_GATE, .5f, 1); r.flipX = flip; float k = World.ScaleFor(104, mo.FrameH(MO_GATE)); r.transform.localPosition = World.ToUnity(x * T + 16, (a.y1 + 1) * T + 2); r.transform.localScale = new Vector3(k, k, 1); r.enabled = false; return r; }
                gates.Add((a, G(a.x0, false), G(a.x1, true)));
            }
            if (lv.exit.width > 0 && !lv.hasDrum) { seal = Sr("ExitSeal", 5); var bcal = Sheet.Get("bcal"); if (bcal != null) { var f = bcal.Frames[7]; seal.sprite = bcal.Frame(7, .5f, 0); seal.drawMode = SpriteDrawMode.Tiled; float w = lv.exit.width + 8, k = w / T / (f.w / World.PPU), top = lv.exit.y - 2.5f * T, hh = lv.exit.height + 2.5f * T; seal.transform.localPosition = World.ToUnity(lv.exit.x + lv.exit.width / 2, top); seal.transform.localScale = new Vector3(k, k, 1); seal.size = new Vector2(f.w / World.PPU, hh / T / k); } }   // painted talismans (bcal 7)
        }

        public void Sync()
        {
            if (mo == null) return; float now = Time.time; bool blink = Mathf.FloorToInt(now / .07f) % 2 == 1;
            foreach (var p in planks)
            {
                bool on = lv.PlankOn(p.v); int nx = lv.PlankNext(p.v);
                float a = on ? (nx < 0 && blink ? .45f : 1) : nx > 0 ? (blink ? .7f : .35f) : .16f; p.r.color = new Color(1, 1, 1, a);
            }
            foreach (var g in giwas)
            {
                lv.crumb.TryGetValue(g.i, out var c); bool gone = c != null && c.gone, soon = gone && c.back - lv.songPos < lv.beatLen;
                g.r.enabled = !gone || soon; g.r.color = new Color(1, 1, 1, soon ? .25f : 1);
                float sh = c != null && !c.gone ? Mathf.Sin(now * 60 + g.i) * 1.5f : 0; g.r.transform.localPosition = g.home + new Vector3(sh / T, 0, 0);
            }
            var drop = new List<int>(); foreach (var kv in cracks) if (!lv.cracks.Contains(kv.Key)) drop.Add(kv.Key);
            foreach (int i in drop) { Destroy(cracks[i].gameObject); cracks.Remove(i); }
            foreach (var (c, r) in chests) { int fr = c.open ? MO_CHEST_OPEN : MO_CHEST; r.sprite = mo.Frame(fr, .5f, 1); float k = World.ScaleFor(30, mo.FrameH(MO_CHEST)); r.transform.localPosition = World.ToUnity(c.x, c.y + 2); r.transform.localScale = new Vector3(k, k, 1); }
            foreach (var (z, r) in poles) r.flipX = sim.WindDir(z) < 0;
            foreach (var (a, l, r) in gates) l.enabled = r.enabled = a.st == 1;
            if (seal != null) { bool shut = !sim.ExitOpen; seal.enabled = shut; if (shut) seal.color = new Color(1, 1, 1, .55f + .15f * Mathf.Sin(now * 4)); }
        }
    }
}
