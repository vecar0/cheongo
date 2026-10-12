// Draws a gate the way the web game's render() does, in the same order:
//   paper (the gate's colour with the paper grain laid in) → far and middle ink panoramas, blurred and tiled, drifting slower than the ground
//   → mist → far pines → painted slabs under floating blocks → rock pillars → the rock itself (painted rock columns clipped to the tiles,
//   a giwa eave along every exposed top, a dark ink edge where the face turns away) → shading that deepens toward the bottom of the view
//   → pines on cliff edges → the gate at the way out and the set dressing (솟대, 해태, 석등, 깃발 …).
// World pixels throughout (32 to a tile, y down); see js/game.js drawBackdrop, buildScenery, drawGround, drawPillar.
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class LevelView : MonoBehaviour
    {
        const float T = World.T; const int PINE_N = 5, P2_GATE = 5, P2_HAETAE = 4, P2_RACK = 3, P2_BRAZIER = 6, P2_SACKS = 8, PROP_SOTDAE = 7, PROP_LANTERN = 4, PROP_JARS = 5, PROP_BANNER = 6, PROP_PALISADE = 8, OBJ_THORNS = 3;
        Level lv; Color tile;
        readonly HashSet<int> slabTiles = new HashSet<int>();   // blocks drawn as a painted slab or pillar instead of plain rock

        public static LevelView Create(Level lv, Transform parent)
        {
            var go = new GameObject("Level"); go.transform.SetParent(parent, false);
            var v = go.AddComponent<LevelView>(); v.lv = lv; v.Build(); return v;
        }

        // ---------- small mesh builder: quads in world pixels, drawn in the order they are added ----------
        class MB
        {
            public readonly List<Vector3> v = new List<Vector3>(); public readonly List<Vector2> uv = new List<Vector2>(); public readonly List<Color32> c = new List<Color32>(); public readonly List<int> t = new List<int>();
            public void Quad(float x, float y, float w, float h, Color32 col) => Quad(x, y, w, h, 0, 0, 0, 0, col, col);
            // u,v: the texture's own 0..1 with v measured down from the top, as the web reads images
            public void Quad(float x, float y, float w, float h, float u0, float v0, float u1, float v1, Color32 top, Color32 bottom, bool sideGrad = false)
            {
                int i = v.Count; v.Add(World.ToUnity(x, y)); v.Add(World.ToUnity(x + w, y)); v.Add(World.ToUnity(x + w, y + h)); v.Add(World.ToUnity(x, y + h));
                uv.Add(new Vector2(u0, 1 - v0)); uv.Add(new Vector2(u1, 1 - v0)); uv.Add(new Vector2(u1, 1 - v1)); uv.Add(new Vector2(u0, 1 - v1));
                if (sideGrad) { c.Add(top); c.Add(bottom); c.Add(bottom); c.Add(top); } else { c.Add(top); c.Add(top); c.Add(bottom); c.Add(bottom); }
                t.Add(i); t.Add(i + 1); t.Add(i + 2); t.Add(i); t.Add(i + 2); t.Add(i + 3);
            }
            public Mesh Make() { var m = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }; m.SetVertices(v); m.SetUVs(0, uv); m.SetColors(c); m.SetTriangles(t, 0); m.RecalculateBounds(); return m; }
        }
        static Material Mat(Texture tex) { var m = new Material(Shader.Find("Sprites/Default")); m.mainTexture = tex != null ? tex : Texture2D.whiteTexture; return m; }
        MeshFilter Put(string name, MB mb, Texture tex, int order, Transform parent = null)
        {
            var go = new GameObject(name); go.transform.SetParent(parent != null ? parent : transform, false);
            var mf = go.AddComponent<MeshFilter>(); mf.sharedMesh = mb.Make(); var r = go.AddComponent<MeshRenderer>(); r.sharedMaterial = Mat(tex); r.sortingOrder = order; return mf;
        }
        SpriteRenderer Spr(string name, Sheet sh, int frame, float x, float y, float h, int order, bool flip = false, float ay = 1, float a = 1)
        {
            if (sh == null || frame >= sh.Frames.Length) return null;
            var go = new GameObject(name); go.transform.SetParent(transform, false); var sr = go.AddComponent<SpriteRenderer>(); sr.sprite = sh.Frame(frame, .5f, ay); sr.flipX = flip; sr.sortingOrder = order; sr.color = new Color(1, 1, 1, a);
            float k = World.ScaleFor(h, sh.FrameH(frame)); go.transform.localPosition = World.ToUnity(x, y); go.transform.localScale = new Vector3(k, k, 1); return sr;
        }

        // ---------- pictures prepared once, as the web prepares them at load ----------
        static readonly Dictionary<string, Texture2D> made = new Dictionary<string, Texture2D>();
        static Color32[] Pixels(Texture2D t) { try { return t.GetPixels32(); } catch { return null; } }   // null when the import is not readable yet
        // brightness and contrast laid into a copy (bake): v' = ((v·br) − ½)·ct + ½
        static Texture2D Baked(string name, float br, float ct)
        {
            string key = name + br + "/" + ct; if (made.TryGetValue(key, out var o) && o != null) return o;
            var src = Sheet.Image(name); if (src == null) return null; var px = Pixels(src); if (px == null) return src;
            for (int i = 0; i < px.Length; i++) { var p = px[i]; px[i] = new Color32(B(p.r), B(p.g), B(p.b), p.a); }
            byte B(byte v) => (byte)Mathf.Clamp((v * br / 255f - .5f) * ct * 255 + 127.5f, 0, 255);
            var t = new Texture2D(src.width, src.height, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear }; t.SetPixels32(px); t.Apply(); return made[key] = t;
        }
        // the gate's colour with the paper grain multiplied in once (bgPaper)
        static Texture2D PaperBg(Color bg, float alpha)
        {
            string key = "bgp" + ColorUtility.ToHtmlStringRGB(bg) + alpha; if (made.TryGetValue(key, out var o) && o != null) return o;
            var src = Sheet.Image("tex-paper"); var px = src != null ? Pixels(src) : null; if (px == null) return null;
            for (int i = 0; i < px.Length; i++) { var p = px[i]; px[i] = new Color(bg.r * (1 - alpha + alpha * p.r / 255f), bg.g * (1 - alpha + alpha * p.g / 255f), bg.b * (1 - alpha + alpha * p.b / 255f), 1); }
            var t = new Texture2D(src.width, src.height, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear }; t.SetPixels32(px); t.Apply(); return made[key] = t;
        }
        // a panorama made to wrap (its last 22% cross-faded into its start), blurred so it recedes, with the paper grain multiplied in
        static Texture2D Panorama(string name, int blur)
        {
            if (made.TryGetValue("pan" + name, out var o) && o != null) return o;
            var src = Sheet.Image(name); if (src == null) return null; var px = Pixels(src); if (px == null) return src;
            int w = src.width, h = src.height, ov = Mathf.RoundToInt(w * .22f), P = w - ov; var a = new float[P * h * 4];
            for (int y = 0; y < h; y++) for (int x = 0; x < P; x++)
            {
                var p = px[y * w + x]; float k = x < ov ? (float)x / ov : 1, al = p.a / 255f * k, r = p.r * al, g = p.g * al, b = p.b * al;   // premultiplied
                if (x < ov) { var q = px[y * w + P + x]; float qa = q.a / 255f * (1 - (float)x / ov); r = q.r * qa + r * (1 - qa); g = q.g * qa + g * (1 - qa); b = q.b * qa + b * (1 - qa); al = qa + al * (1 - qa); }
                int i = (y * P + x) * 4; a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = al;
            }
            var tmp = new float[a.Length];
            for (int pass = 0; pass < 2; pass++)   // two box passes stand in for the web's gaussian
            {
                for (int y = 0; y < h; y++) for (int x = 0; x < P; x++) for (int ch = 0; ch < 4; ch++) { float s = 0; for (int d = -blur; d <= blur; d++) s += a[(y * P + ((x + d) % P + P) % P) * 4 + ch]; tmp[(y * P + x) * 4 + ch] = s / (2 * blur + 1); }
                for (int y = 0; y < h; y++) for (int x = 0; x < P; x++) for (int ch = 0; ch < 4; ch++) { float s = 0; for (int d = -blur; d <= blur; d++) s += tmp[(Mathf.Clamp(y + d, 0, h - 1) * P + x) * 4 + ch]; a[(y * P + x) * 4 + ch] = s / (2 * blur + 1); }
            }
            var paper = Sheet.Image("tex-paper"); var pp = paper != null ? Pixels(paper) : null; float ps = 600f / h; var outPx = new Color32[P * h];
            for (int y = 0; y < h; y++) for (int x = 0; x < P; x++)
            {
                int i = (y * P + x) * 4; float al = a[i + 3]; if (al < .002f) { outPx[y * P + x] = new Color32(0, 0, 0, 0); continue; }
                float r = a[i] / al, g = a[i + 1] / al, b = a[i + 2] / al;
                if (pp != null) { var q = pp[((int)((h - 1 - y) * ps) % paper.height) * paper.width + (int)(x * ps) % paper.width]; r *= .1f + .9f * q.r / 255f; g *= .1f + .9f * q.g / 255f; b *= .1f + .9f * q.b / 255f; }
                outPx[y * P + x] = new Color32((byte)r, (byte)g, (byte)b, (byte)(al * 255));
            }
            var t = new Texture2D(P, h, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear }; t.SetPixels32(outPx); t.Apply(); return made["pan" + name] = t;
        }

        // ---------- the backdrop: laid out on the screen, not in the world ----------
        Transform back; MeshFilter paperM, farM, midM, washM, fogM, shadeM; Texture2D farT, midT; readonly List<Vector4> rockRects = new List<Vector4>();

        void BuildBackdrop()
        {
            back = new GameObject("Backdrop").transform; back.SetParent(transform, false);
            var bg = DB.Hex(lv.pal.bg); var ptex = PaperBg(bg, .9f); var one = new MB(); one.Quad(0, 0, 1, 1, Color.white);
            paperM = Put("Paper", one, ptex, -110, back); if (ptex == null) paperM.GetComponent<MeshRenderer>().sharedMaterial.color = bg;
            farT = Panorama("far", 3); midT = Panorama("mid", 2);
            washM = Put("Wash", one, null, -105, back); farM = Put("Far", one, farT, -100, back); midM = Put("Mid", one, midT, -95, back); fogM = Put("Mist", one, null, -90, back);
        }

        // screen pixels (y down from the top of the view) → the camera's world
        public void Follow(Camera cam)
        {
            float H = Screen.height, W = Screen.width, upp = cam.orthographicSize * 2 / H, SCALE = 1 / (upp * T);   // units per screen pixel · screen pixels per world pixel
            Vector3 c = cam.transform.position; float left = c.x - W / 2 * upp, top = c.y + H / 2 * upp, camX = c.x * T, camY = -c.y * T, lh = lv.h * T;
            Vector3 S(float sx, float sy) => new Vector3(left + sx * upp, top - sy * upp, 0);
            var wash = ParseWash(lv.pal.wash);

            // paper: the grain is screen-anchored, one repeat every 512 × 0.9 pixels
            { var m = paperM.sharedMesh; m.SetVertices(new List<Vector3> { S(0, 0), S(W, 0), S(W, H), S(0, H) }); float k = 512 * .9f; m.SetUVs(0, new List<Vector2> { new Vector2(0, 0), new Vector2(W / k, 0), new Vector2(W / k, -H / k), new Vector2(0, -H / k) }); m.RecalculateBounds(); }
            // under the far hills: mist thickening toward the gorge, never bare paper
            { float by = H * .8f + (lh - camY) * .22f * .5f * SCALE, y0 = Mathf.Min(H * .55f, by - H * .25f), ym = y0 + (H - y0) * .55f; Grad(washM, S, W, new[] { y0, ym, H }, new[] { C(wash, 0), C(wash, .1f), C(wash, .26f) }); }
            Layer(farM, farT, S, W, H, camX, camY, lh, SCALE, .08f, lv.pal.farA, .58f, .66f);
            Layer(midM, midT, S, W, H, camX, camY, lh, SCALE, .22f, lv.pal.midA, .8f, .78f);
            // a mist band in front of the city
            { float my = H * .8f + (lh - camY) * .11f * SCALE; Color fog = new Color(236 / 255f, 232 / 255f, 223 / 255f); Grad(fogM, S, W, new[] { my - 90, my - 90 + 160 * .55f, my + 70 }, new[] { C(fog, 0), C(fog, .7f), C(fog, 0) }); }

            // depth shading over the rock, following the view: clear at its top, darker toward its bottom
            if (shadeM != null)
            {
                float vy0 = camY - H / 2 / SCALE, vh = H / SCALE; var cols = new List<Color32>(rockRects.Count * 4);
                foreach (var r in rockRects) { byte a0 = (byte)(255 * .3f * Mathf.Clamp01((r.y - vy0) / vh)), a1 = (byte)(255 * .3f * Mathf.Clamp01((r.y + r.w - vy0) / vh)); var c0 = new Color32(20, 18, 16, a0); var c1 = new Color32(20, 18, 16, a1); cols.Add(c0); cols.Add(c0); cols.Add(c1); cols.Add(c1); }
                shadeM.sharedMesh.SetColors(cols);
            }
        }
        static Color ParseWash(string s) { var p = (s ?? "23,22,26").Split(','); return p.Length == 3 ? new Color(float.Parse(p[0]) / 255f, float.Parse(p[1]) / 255f, float.Parse(p[2]) / 255f) : Color.black; }
        static Color32 C(Color c, float a) => new Color(c.r, c.g, c.b, a);
        static void Grad(MeshFilter mf, System.Func<float, float, Vector3> S, float W, float[] ys, Color32[] cs)
        {
            var v = new List<Vector3>(); var col = new List<Color32>(); var uv = new List<Vector2>(); var t = new List<int>();
            for (int i = 0; i < ys.Length; i++) { v.Add(S(0, ys[i])); v.Add(S(W, ys[i])); col.Add(cs[i]); col.Add(cs[i]); uv.Add(Vector2.zero); uv.Add(Vector2.zero); if (i > 0) { int k = i * 2; t.Add(k - 2); t.Add(k - 1); t.Add(k + 1); t.Add(k - 2); t.Add(k + 1); t.Add(k); } }
            var m = mf.sharedMesh; m.Clear(); m.SetVertices(v); m.SetUVs(0, uv); m.SetColors(col); m.SetTriangles(t, 0); m.RecalculateBounds();
        }
        // one panorama: a strip a fraction of the screen tall, its foot on a line a fraction down, tiled across and drifting at f of the camera's pace
        static void Layer(MeshFilter mf, Texture2D tex, System.Func<float, float, Vector3> S, float W, float H, float camX, float camY, float lh, float SCALE, float f, float alpha, float bottom, float hFrac)
        {
            if (tex == null) return; float by = H * bottom + (lh - camY) * f * .5f * SCALE, h = H * hFrac, w = h * tex.width / tex.height, off = ((camX * f * SCALE) % w + w) % w;
            var m = mf.sharedMesh; var col = (Color32)new Color(1, 1, 1, alpha); m.Clear();
            m.SetVertices(new List<Vector3> { S(0, by - h), S(W, by - h), S(W, by), S(0, by) }); m.SetUVs(0, new List<Vector2> { new Vector2(off / w, 1), new Vector2((off + W) / w, 1), new Vector2((off + W) / w, 0), new Vector2(off / w, 0) });
            m.SetColors(new List<Color32> { col, col, col, col }); m.SetTriangles(new List<int> { 0, 1, 2, 0, 2, 3 }, 0); m.RecalculateBounds();
        }

        // ---------- the ground ----------
        bool Rock(int tx, int ty) => lv.TileAt(tx, ty) == 1;
        void Build()
        {
            tile = DB.Hex(lv.pal.tile); var rnd = new System.Random(lv.w * 7919 + lv.grid.Length);
            BuildBackdrop();
            var pinesS = Sheet.Get("pines"); var slabsS = Sheet.Get("slabs"); var pillarsS = Sheet.Get("pillars"); var props = Sheet.Get("props"); var props2 = Sheet.Get("props2"); var objects = Sheet.Get("objects");

            // exposed runs of rock top: (x, y, n tiles, depth)
            var runs = new List<(int x, int y, int n, int d)>();
            for (int y = 1; y < lv.h; y++) for (int x = 0; x < lv.w; x++)
            {
                if (!Rock(x, y) || Rock(x, y - 1) || (x > 0 && Rock(x - 1, y) && !Rock(x - 1, y - 1))) continue;
                int n = 0; while (x + n < lv.w && Rock(x + n, y) && !Rock(x + n, y - 1)) n++;
                int d = 0, mid = x + (n >> 1); while (y + d < lv.h && Rock(mid, y + d)) d++;
                runs.Add((x, y, n, d)); x += n - 1;
            }
            // upper floors: runs whose block has open air below get a painted slab with a jagged underside
            if (slabsS != null) foreach (var (x, y, n, d) in runs)
            {
                if (!(y < lv.h - 1 && y + d < lv.h && d <= 3)) continue;
                for (int yy = y; yy < y + d; yy++) for (int xx = x; xx < x + n; xx++) slabTiles.Add(yy * lv.w + xx);
                int segs = Mathf.Max(1, Mathf.RoundToInt(n / 6f)); float w = n * T / segs;
                for (int k = 0; k < segs; k++)
                {
                    int i = rnd.Next(slabsS.Frames.Length); var f = slabsS.Frames[i]; float sw = w + (segs > 1 ? 6 : 0), minH = d * T + 10, h = Mathf.Max(minH + 14, Mathf.Min(sw * f.h / f.w, minH * 2.2f));
                    var go = new GameObject("Slab"); go.transform.SetParent(transform, false); var sr = go.AddComponent<SpriteRenderer>(); sr.sprite = slabsS.Frame(i, .5f, 0); sr.flipX = rnd.NextDouble() < .5; sr.sortingOrder = -15;
                    go.transform.localPosition = World.ToUnity(x * T + w * (k + .5f), y * T - 2); go.transform.localScale = new Vector3(sw / T / (f.w / World.PPU), h / T / (f.h / World.PPU), 1);
                }
            }
            // thin columns of rock, three tiles tall or more, are painted as pillars; a grounded one fades into the ground over its last 56px
            var floatP = new MB(); var groundP = new MB(); var pillarTex = Baked("pillars", .72f, 1.15f); var pillarXs = new List<float>();
            if (pillarsS != null)
            {
                var spans = new Dictionary<(int, int), List<int>>();
                for (int y = 0; y < lv.h; y++) for (int x = 0; x < lv.w; x++)
                {
                    if (!Rock(x, y) || (x > 0 && Rock(x - 1, y))) continue;
                    int n = 0; while (x + n < lv.w && Rock(x + n, y)) n++;
                    if (n <= 3 && x > 0 && x + n < lv.w) { if (!spans.TryGetValue((x, n), out var l)) spans[(x, n)] = l = new List<int>(); l.Add(y); }
                    x += n - 1;
                }
                foreach (var kv in spans)
                {
                    int x = kv.Key.Item1, n = kv.Key.Item2; var ys = kv.Value;
                    for (int a = 0; a < ys.Count;)
                    {
                        int b = a; while (b + 1 < ys.Count && ys[b + 1] == ys[b] + 1) b++;
                        bool grounded = ys[b] + 1 >= lv.h || Rock(x - 1, ys[b] + 1) || Rock(x + n, ys[b] + 1); for (int k = 0; k < n && !grounded; k++) if (Rock(x + k, ys[b] + 1)) grounded = true;
                        if (b - a + 1 >= 3)
                        {
                            for (int y = ys[a]; y <= ys[b]; y++) for (int xx = x; xx < x + n; xx++) slabTiles.Add(y * lv.w + xx);
                            float cx = x * T + n * T / 2f, y0 = ys[a] * T - 2, y1 = ys[b] + 1 >= lv.h ? lv.h * T + 200 : (ys[b] + 1) * T, g = grounded && ys[b] + 1 < lv.h ? (ys[b] + 1) * T : 0;
                            Pillar(g > 0 ? groundP : floatP, pillarsS, rnd.Next(3), cx, y0, y1, g, n * T + 10, rnd.NextDouble() < .5); pillarXs.Add(cx);
                        }
                        a = b + 1;
                    }
                }
            }

            // the rock: tile colour underneath, then the painted rock columns clipped to the tiles
            var fill = new MB(); var art = new MB(); var shade = new MB(); var rockTex = Baked("pillars", .8f, 1.15f); Color32 tc = tile;
            for (int ty = 0; ty < lv.h; ty++) for (int tx = 0; tx < lv.w; tx++)
            {
                if (lv.grid[ty * lv.w + tx] != 1 || slabTiles.Contains(ty * lv.w + tx)) continue;
                int n = 1; while (tx + n < lv.w && lv.grid[ty * lv.w + tx + n] == 1 && !slabTiles.Contains(ty * lv.w + tx + n)) n++;   // a row of rock at a time
                float x0 = tx * T - .3f, y0 = ty * T - .3f, x1 = (tx + n) * T + .3f, y1 = (ty + 1) * T + .3f;
                fill.Quad(x0, y0, x1 - x0, y1 - y0, tc); shade.Quad(x0, y0, x1 - x0, y1 - y0, new Color32(20, 18, 16, 0)); rockRects.Add(new Vector4(x0, y0, x1 - x0, y1 - y0));
                if (pillarsS != null) Columns(art, pillarsS, x0, y0, x1, y1);
                tx += n - 1;
            }
            Put("RockFill", fill, null, -12); if (pillarsS != null) Put("Rock", art, rockTex, -11);
            if (pillarsS != null) { Put("PillarsBehind", floatP, pillarTex, -14); Put("PillarsGrounded", groundP, pillarTex, -10); }

            // a giwa eave along every exposed top, overhanging open ends a little; a dark ink edge where the rock face turns away
            var eave = new MB(); var giwa = new MB(); var over = new MB(); var giwaTex = Sheet.Image("tex-giwa"); if (giwaTex) giwaTex.wrapMode = TextureWrapMode.Repeat; const float GS = 512 * .094f;
            Color32 edge = new Color32(15, 14, 16, 191), edge0 = new Color32(15, 14, 16, 0);
            for (int ty = 0; ty < lv.h; ty++) for (int tx = 0; tx < lv.w; tx++)
            {
                if (lv.grid[ty * lv.w + tx] != 1) continue; float px = tx * T, py = ty * T;
                if (!Rock(tx, ty - 1))
                {
                    float l = !Rock(tx - 1, ty) || Rock(tx - 1, ty - 1) ? 3 : 0, r = !Rock(tx + 1, ty) || Rock(tx + 1, ty - 1) ? 3 : 0, x = px - l, w = T + l + r;
                    eave.Quad(x, py - 4, w, 12, tc);
                    giwa.Quad(x, py - 4, w, 9, x / GS, -3.2f / GS, (x + w) / GS, 5.8f / GS, Color.white, Color.white);   // a cap row aligned to the eave
                    over.Quad(x, py + 5, w, 2.5f, tc);
                }
                if (slabTiles.Contains(ty * lv.w + tx)) continue;
                if (!Rock(tx - 1, ty)) over.Quad(px, py, 7, T, 0, 0, 0, 0, edge, edge0, true);
                if (!Rock(tx + 1, ty)) over.Quad(px + T - 7, py, 7, T, 0, 0, 0, 0, edge0, edge, true);
            }
            Put("EaveBase", eave, null, -9); Put("Giwa", giwa, giwaTex, -8); Put("EaveLine", over, null, -7);
            shadeM = Put("Shade", shade, null, -6);

            // ledges: one painted plank per run of '='; thorns
            for (int ty = 0; ty < lv.h; ty++) for (int tx = 0; tx < lv.w; tx++)
            {
                int v = lv.grid[ty * lv.w + tx];
                if (v == 2 && objects != null) { var f = objects.Frames[OBJ_THORNS]; Spr("Thorns", objects, OBJ_THORNS, tx * T + T / 2 + (tx * 7 % 5) - 2, ty * T + T + 3, (T + 10) * f.h / f.w, -5, tx % 2 == 1); continue; }
                if (v != 3 || lv.TileAt(tx - 1, ty) == 3 || props2 == null) continue;
                int n = 1; while (lv.TileAt(tx + n, ty) == 3) n++;
                int segN = Mathf.Max(1, Mathf.RoundToInt(n / 4f)); float segW = n * T / segN; var pf = props2.Frames[0];
                for (int k = 0; k < segN; k++)
                {
                    var go = new GameObject("Ledge"); go.transform.SetParent(transform, false);
                    var sr = go.AddComponent<SpriteRenderer>(); sr.sprite = props2.Frame(0, 0, 0); sr.sortingOrder = -5;
                    go.transform.localPosition = World.ToUnity(tx * T + k * segW - 2, ty * T - 3);
                    float hh = Mathf.Min(segW * pf.h / pf.w, 26);
                    go.transform.localScale = new Vector3((segW + 4) / T / (pf.w / World.PPU), hh / T / (pf.h / World.PPU), 1);
                }
            }

            // pines: far ones rooted behind the ground edge where the air above is clear, big ones on cliff edges
            if (pinesS != null)
            {
                int pn = Mathf.Min(PINE_N, pinesS.Frames.Length);
                for (int x = 4, last = -99; x < lv.w - 4; x++)
                {
                    if (x - last < 14 || rnd.NextDouble() > .35) continue;
                    int y = 1; while (y < lv.h && lv.TileAt(x, y) == 0) y++;
                    if (y >= lv.h || !Rock(x, y) || y < 8) continue;
                    float h = 220 + (float)rnd.NextDouble() * 110; int rows = Mathf.CeilToInt(h / T * .85f); bool clear = true;
                    for (int dx = -3; dx <= 3 && clear; dx++) for (int dy = 1; dy <= rows; dy++) if (lv.TileAt(x + dx, y - dy) != 0) { clear = false; break; }
                    if (!clear) continue;
                    Spr("Pine", pinesS, rnd.Next(pn), x * T + 16, y * T + 14, h, -20, rnd.NextDouble() < .5, 1, .8f); last = x;
                }
                foreach (var (x, y, n, d) in runs)
                {
                    float W0 = n * T, h = Mathf.Min(d * T, (lv.h - y) * T) + 24; int segs = Mathf.Max(1, Mathf.RoundToInt(W0 / Mathf.Min(8 * T, Mathf.Max(3 * T, h * 1.3f))));
                    for (int k = 0; k < segs; k++)
                    {
                        float w = W0 / segs, cx = x * T + w * (k + .5f); if (!(w >= 3 * T && rnd.NextDouble() < .2)) continue;
                        bool near = false; foreach (float qx in pillarXs) if (Mathf.Abs(qx - cx) < w / 2 + 160) near = true; if (near) continue;
                        bool right = rnd.NextDouble() < .5; Spr("EdgePine", pinesS, rnd.Next(pn), cx + (right ? 1 : -1) * (w / 2 - 14), y * T - 6 + 6, 150 + (float)rnd.NextDouble() * 70, -4, right, 1, .8f);
                    }
                }
            }

            // set dressing placed where it means something (decor only, never collides); the gate at the way out
            var used = new HashSet<(int, int)>();
            int Tile(int x, int y) => x < 0 || x >= lv.w || y < 0 || y >= lv.h ? 0 : lv.grid[y * lv.w + x];
            bool PutProp(Sheet sh, int i, int tx, int ty, float hh, bool flip = false)
            {
                if (sh == null || tx < 1 || tx >= lv.w - 1 || ty < 1 || used.Contains((tx, ty)) || Tile(tx, ty) != 1) return false;
                for (int k = 1; k <= Mathf.CeilToInt(hh / T); k++) if (Tile(tx, ty - k) != 0) return false;
                used.Add((tx, ty)); float x = tx * T + 16, y = ty * T + 2; var f = sh.Frames[i];
                float rw = Mathf.Min(f.w * hh / f.h * .42f, 90);   // a wash of shadow seats them on the ground
                var sgo = new GameObject("Shadow"); sgo.transform.SetParent(transform, false); var ss = sgo.AddComponent<SpriteRenderer>(); ss.sprite = Fx.Dot(); ss.color = new Color(40 / 255f, 34 / 255f, 30 / 255f, .16f); ss.sortingOrder = 2;
                sgo.transform.localPosition = World.ToUnity(x, y - 1); sgo.transform.localScale = new Vector3(rw * 2 / T, Mathf.Max(3, rw * .12f) * 2 / T, 1);
                Spr("Prop", sh, i, x, y, hh, 3, flip); return true;
            }
            { int sx = Mathf.FloorToInt(lv.start.x / T), sy = Mathf.FloorToInt((lv.start.y + 31) / T); PutProp(props, PROP_SOTDAE, sx - 1, sy, 84); PutProp(props2, P2_HAETAE, sx + 3, sy, 34); }
            if (lv.exit.width > 0)
            {
                int ex = Mathf.FloorToInt(lv.exit.x / T), ey = Mathf.FloorToInt((lv.exit.y + lv.exit.height) / T);
                Spr("Gate", props2, P2_GATE, ex * T + 16, ey * T + 2, 78, 2); PutProp(props, PROP_LANTERN, ex - 2, ey, 36); PutProp(props, PROP_LANTERN, ex + 2, ey, 36, true);
            }
            foreach (var d in lv.foes)
            {
                int y = d.ty + 1; if (Tile(d.tx, y) != 1) continue;
                if (d.type == 'h') { if (rnd.NextDouble() < .6) PutProp(props2, P2_RACK, d.tx - 2, y, 46); if (rnd.NextDouble() < .5) PutProp(props, PROP_BANNER, d.tx + 1, y, 82); }
                else if (d.type == 'g') { if (rnd.NextDouble() < .55) PutProp(props, PROP_BANNER, d.tx + 1, y, 82); if (rnd.NextDouble() < .45) PutProp(props, PROP_PALISADE, d.tx - 2, y, 28); }
                else if (d.type == 's') { if (rnd.NextDouble() < .5) PutProp(props2, P2_BRAZIER, d.tx + 1, y, 34); }
            }
            foreach (var c in lv.cps) { int cx = Mathf.FloorToInt(c.x / T), cy = Mathf.FloorToInt(c.y / T); if (rnd.NextDouble() < .7) { bool two = rnd.NextDouble() < .5; PutProp(two ? props2 : props, two ? P2_SACKS : PROP_JARS, cx + 1, cy, two ? 30 : 26); } }
            for (int x = 2; x < lv.w - 2; x++)
            {
                int y = -1; for (int yy = 1; yy < lv.h; yy++) if (Tile(x, yy) == 1 && Tile(x, yy - 1) == 0) { y = yy; break; }
                if (y < 0) continue; bool edgeT = (Tile(x + 1, y) == 0 && Tile(x + 1, y + 1) == 0) || (Tile(x - 1, y) == 0 && Tile(x - 1, y + 1) == 0);
                if (!edgeT && y <= 7 && rnd.NextDouble() < .18) PutProp(props2, P2_BRAZIER, x, y, 34);
            }
        }

        // painted rock columns over one rectangle of rock: columns 70 wide (drawn 94.5 wide, so neighbours overlap), rows of segments overlapping by 10,
        // each column with its own picture, mirror and vertical start — fixed in the world, so the face never slides
        static void Columns(MB mb, Sheet sh, float x0, float y0, float x1, float y1)
        {
            const float colW = 70, w = colW * 1.35f, pad = (w - colW) / 2; float tw = sh.Tex.width, th = sh.Tex.height;
            for (int c = Mathf.CeilToInt((x0 - colW - pad) / colW); c * colW - pad < x1; c++)
            {
                uint hsh = unchecked((uint)((long)c * 2654435761L)); var f = sh.Frames[hsh % 3]; float segH = w * f.h / f.w, off = (hsh >> 8) % 97, rowH = segH - 10, cx0 = c * colW - pad; bool flip = ((hsh >> 3) & 1) == 1;
                float ax0 = Mathf.Max(x0, cx0), ax1 = Mathf.Min(x1, cx0 + w); if (ax1 <= ax0) continue;
                float u0 = (ax0 - cx0) / w, u1 = (ax1 - cx0) / w; if (flip) { u0 = 1 - u0; u1 = 1 - u1; }
                for (int k = Mathf.FloorToInt((y0 - segH - off) / rowH); off + k * rowH < y1; k++)
                {
                    float yk = off + k * rowH, ay0 = Mathf.Max(y0, yk), ay1 = Mathf.Min(y1, yk + segH); if (ay1 <= ay0) continue;
                    mb.Quad(ax0, ay0, ax1 - ax0, ay1 - ay0, (f.x + u0 * f.w) / tw, (f.y + (ay0 - yk) / segH * f.h) / th, (f.x + u1 * f.w) / tw, (f.y + (ay1 - yk) / segH * f.h) / th, Color.white, Color.white);
                }
            }
        }
        // stacked rock segments from y0 down to y1; grounded (g > 0), nested translucent layers below g sum to a smooth fade
        static void Pillar(MB mb, Sheet sh, int i, float x, float y0, float y1, float g, float w, bool flip)
        {
            var f = sh.Frames[i]; float segH = w * f.h / f.w, tw = sh.Tex.width, th = sh.Tex.height, solidEnd = g > 0 ? g : y1 + 4;
            void Band(float a, float b, float alpha)
            {
                int k = 0; for (float y = y0; y < b; y += segH - 10, k++)
                {
                    float ay0 = Mathf.Max(a, y), ay1 = Mathf.Min(b, y + segH); if (ay1 <= ay0) continue; bool fl = (k + (flip ? 1 : 0)) % 2 == 1; var col = (Color32)new Color(1, 1, 1, alpha);
                    mb.Quad(x - w / 2, ay0, w, ay1 - ay0, (f.x + (fl ? f.w : 0)) / tw, (f.y + (ay0 - y) / segH * f.h) / th, (f.x + (fl ? 0 : f.w)) / tw, (f.y + (ay1 - y) / segH * f.h) / th, col, col);
                }
            }
            Band(y0, solidEnd, .88f);
            if (g > 0) for (int k = 0; k < 7; k++) Band(g + k * 8, g + (k + 1) * 8, 1 - Mathf.Pow(.74f, 7 - k));
        }
    }
}
