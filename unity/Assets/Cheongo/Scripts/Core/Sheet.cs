// A painted sprite sheet: the png plus its frame rectangles (top-left origin, as the web game stores them).
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    [Serializable] public class FrameRect { public int x, y, w, h; }
    [Serializable] class FrameList { public FrameRect[] f; }

    public class Sheet
    {
        public Texture2D Tex; public FrameRect[] Frames;
        readonly Dictionary<(int, int, int), Sprite> cache = new Dictionary<(int, int, int), Sprite>();
        static readonly Dictionary<string, Sheet> loaded = new Dictionary<string, Sheet>();

        public static Sheet Get(string name)
        {
            if (loaded.TryGetValue(name, out var s)) return s;
            var tex = Resources.Load<Texture2D>("Sprites/" + name);
            var js = Resources.Load<TextAsset>("Sprites/" + name);
            if (tex == null || js == null) { Debug.LogWarning($"천고: sheet '{name}' missing"); loaded[name] = null; return null; }
            s = new Sheet { Tex = tex, Frames = JsonUtility.FromJson<FrameList>(js.text).f };
            loaded[name] = s; return s;
        }

        public static Texture2D Image(string name) => Resources.Load<Texture2D>("Sprites/" + name);

        // pivot in the web game's terms: ax across, ay down from the top (1 = the feet)
        public Sprite Frame(int i, float ax = .5f, float ay = 1f)
        {
            if (Frames == null || i < 0 || i >= Frames.Length) return null;
            var key = (i, Mathf.RoundToInt(ax * 1000), Mathf.RoundToInt(ay * 1000));
            if (cache.TryGetValue(key, out var sp)) return sp;
            var f = Frames[i];
            var rect = new Rect(f.x, Tex.height - f.y - f.h, f.w, f.h);   // Unity counts rows from the bottom
            sp = Sprite.Create(Tex, rect, new Vector2(ax, 1f - ay), World.PPU, 0, SpriteMeshType.FullRect);
            cache[key] = sp; return sp;
        }
        public float FrameH(int i) => Frames != null && i >= 0 && i < Frames.Length ? Frames[i].h : 1;
    }
}
