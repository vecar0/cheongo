// Draws a gate: the rock as one textured mesh (painted stone, tiled), a dark eave along every exposed top,
// ledges as painted planks, thorns, the way out, and the far and middle ink panoramas behind.
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class LevelView : MonoBehaviour
    {
        Level lv; Transform far, mid;

        public static LevelView Create(Level lv, Transform parent)
        {
            var go = new GameObject("Level"); go.transform.SetParent(parent, false);
            var v = go.AddComponent<LevelView>(); v.lv = lv; v.Build(); return v;
        }

        static Material Mat(Texture tex, Color c)
        {
            var m = new Material(Shader.Find("Sprites/Default")); m.mainTexture = tex; m.color = c; return m;
        }

        void Build()
        {
            Color tile = DB.Hex(lv.pal.tile);
            // rock: one quad per solid tile, uv in world space so the painted stone runs on across tiles
            var stone = Sheet.Image("tex-stone"); if (stone) stone.wrapMode = TextureWrapMode.Repeat;
            var verts = new List<Vector3>(); var uvs = new List<Vector2>(); var tris = new List<int>();
            var eV = new List<Vector3>(); var eT = new List<int>(); var thV = new List<Vector3>(); var thT = new List<int>();
            const float uvTile = 256f;   // world pixels per repeat of the stone painting
            for (int ty = 0; ty < lv.h; ty++) for (int tx = 0; tx < lv.w; tx++)
            {
                int v = lv.grid[ty * lv.w + tx]; float px = tx * World.T, py = ty * World.T;
                if (v == 1)
                {
                    Quad(verts, tris, px, py, World.T, World.T);
                    uvs.Add(new Vector2(px / uvTile, -py / uvTile)); uvs.Add(new Vector2((px + World.T) / uvTile, -py / uvTile)); uvs.Add(new Vector2((px + World.T) / uvTile, -(py + World.T) / uvTile)); uvs.Add(new Vector2(px / uvTile, -(py + World.T) / uvTile));
                    if (lv.TileAt(tx, ty - 1) != 1) Quad(eV, eT, px - 1, py - 4, World.T + 2, 10);   // the eave on an exposed top
                }
                else if (v == 2) { for (int i = 0; i < 4; i++) Tri(thV, thT, px + i * 8, py + World.T, px + i * 8 + 4, py + 11, px + i * 8 + 8, py + World.T); }
            }
            Mesh("Rock", verts, uvs, tris, Mat(stone, new Color(.82f, .8f, .78f)), 0);
            Mesh("Eaves", eV, null, eT, Mat(Texture2D.whiteTexture, tile), 1);
            Mesh("Thorns", thV, null, thT, Mat(Texture2D.whiteTexture, tile), 1);

            // ledges: one painted plank per run of '='
            var p2 = Sheet.Get("props2");
            for (int ty = 0; ty < lv.h; ty++) for (int tx = 0; tx < lv.w; tx++)
            {
                if (lv.grid[ty * lv.w + tx] != 3 || lv.TileAt(tx - 1, ty) == 3) continue;
                int n = 1; while (lv.TileAt(tx + n, ty) == 3) n++;
                if (p2 == null) continue;
                int segN = Mathf.Max(1, Mathf.RoundToInt(n / 4f)); float segW = n * World.T / segN; var f = p2.Frames[0];
                for (int k = 0; k < segN; k++)
                {
                    var go = new GameObject("Ledge"); go.transform.SetParent(transform, false);
                    var sr = go.AddComponent<SpriteRenderer>(); sr.sprite = p2.Frame(0, 0, 0); sr.sortingOrder = 2;
                    go.transform.localPosition = World.ToUnity(tx * World.T + k * segW - 2, ty * World.T - 3);
                    float hh = Mathf.Min(segW * f.h / f.w, 26);
                    go.transform.localScale = new Vector3((segW + 4) / World.T / (f.w / World.PPU), hh / World.T / (f.h / World.PPU), 1);
                }
            }
            // the way out: a gate of red ink
            var ex = new GameObject("Exit"); ex.transform.SetParent(transform, false);
            var esr = ex.AddComponent<SpriteRenderer>(); esr.sprite = Sprite.Create(Texture2D.whiteTexture, new Rect(0, 0, 4, 4), new Vector2(0, 1), 4); esr.color = new Color(.76f, .09f, .11f, .55f); esr.sortingOrder = 1;
            ex.transform.localPosition = World.ToUnity(lv.exit.x, lv.exit.y); ex.transform.localScale = new Vector3(lv.exit.width / World.T, lv.exit.height / World.T, 1);

            // the panoramas: far and middle ink, drifting slower than the ground
            far = Panorama("far", -100, lv.pal.farA); mid = Panorama("mid", -90, lv.pal.midA);
        }

        Transform Panorama(string name, int order, float alpha)
        {
            var tex = Sheet.Image(name); if (tex == null) return null;
            var go = new GameObject(name); go.transform.SetParent(transform, false);
            var sr = go.AddComponent<SpriteRenderer>(); sr.sprite = Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height), new Vector2(.5f, .5f), World.PPU); sr.sortingOrder = order; sr.color = new Color(1, 1, 1, Mathf.Clamp01(alpha * 1.8f));
            return go.transform;
        }

        public void Follow(Camera cam)
        {
            Place(far, .1f, cam); Place(mid, .25f, cam);
        }
        static void Place(Transform t, float k, Camera cam)   // a panorama fills the view's height and drifts at k of the camera's pace
        {
            if (t == null) return; float viewH = cam.orthographicSize * 2; var sr = t.GetComponent<SpriteRenderer>(); float s = viewH * 1.25f / (sr.sprite.rect.height / World.PPU);
            t.localScale = new Vector3(s, s, 1); t.position = new Vector3(cam.transform.position.x * (1 - k), cam.transform.position.y + viewH * .05f, 5);
        }

        void Mesh(string name, List<Vector3> v, List<Vector2> uv, List<int> t, Material mat, int order)
        {
            var go = new GameObject(name); go.transform.SetParent(transform, false);
            var m = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }; m.SetVertices(v); if (uv != null) m.SetUVs(0, uv); else { var z = new List<Vector2>(); for (int i = 0; i < v.Count; i++) z.Add(Vector2.zero); m.SetUVs(0, z); }
            m.SetTriangles(t, 0); m.RecalculateBounds();
            go.AddComponent<MeshFilter>().sharedMesh = m; var r = go.AddComponent<MeshRenderer>(); r.sharedMaterial = mat; r.sortingOrder = order;
        }
        static void Quad(List<Vector3> v, List<int> t, float x, float y, float w, float h)
        {
            int i = v.Count; v.Add(World.ToUnity(x, y)); v.Add(World.ToUnity(x + w, y)); v.Add(World.ToUnity(x + w, y + h)); v.Add(World.ToUnity(x, y + h));
            t.Add(i); t.Add(i + 1); t.Add(i + 2); t.Add(i); t.Add(i + 2); t.Add(i + 3);
        }
        static void Tri(List<Vector3> v, List<int> t, float ax, float ay, float bx, float by, float cx, float cy)
        {
            int i = v.Count; v.Add(World.ToUnity(ax, ay)); v.Add(World.ToUnity(bx, by)); v.Add(World.ToUnity(cx, cy)); t.Add(i); t.Add(i + 2); t.Add(i + 1);
        }
    }
}
