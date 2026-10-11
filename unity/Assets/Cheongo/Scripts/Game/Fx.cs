// One-shot painted effects (the web game's addFx): a frame that grows a little and fades.
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public class Fx : MonoBehaviour
    {
        class One { public SpriteRenderer sr; public float t, life, grow, a, baseS; }
        readonly List<One> live = new List<One>(); readonly Stack<SpriteRenderer> pool = new Stack<SpriteRenderer>();

        // the hero's effects: [height, life, ay, alpha] as on the web
        static readonly Dictionary<string, (int i, float h, float life, float ay, float a)> HERO = new Dictionary<string, (int, float, float, float, float)>
        { ["dash"] = (0, 70, .32f, .5f, .9f), ["jump"] = (1, 46, .4f, 1, .85f), ["land"] = (2, 58, .4f, 1, .8f), ["air"] = (2, 50, .38f, .55f, .85f), ["wall"] = (1, 56, .4f, 1, .9f) };

        public void Hero(string kind, float x, float y, int dir)
        {
            if (!HERO.TryGetValue(kind, out var o)) return;
            float rot = kind == "wall" ? -dir * 90 : 0;   // the wall kick's splash points away from the wall
            Add("herofx", o.i, x, y, o.h, o.life, .5f, o.ay, o.a, dir < 0 && kind == "dash", rot);
        }

        public void Add(string sheetName, int i, float x, float y, float h, float life, float ax, float ay, float a, bool flip = false, float rot = 0, float grow = .35f)
        {
            var sh = Sheet.Get(sheetName); if (sh == null) return;
            var sr = pool.Count > 0 ? pool.Pop() : NewRenderer(); sr.gameObject.SetActive(true);
            sr.sprite = sh.Frame(i, ax, ay); sr.flipX = flip; sr.color = new Color(1, 1, 1, a);
            float s = World.ScaleFor(h, sh.FrameH(i));
            sr.transform.localPosition = World.ToUnity(x, y, -1); sr.transform.localRotation = Quaternion.Euler(0, 0, rot); sr.transform.localScale = new Vector3(s, s, 1);
            live.Add(new One { sr = sr, life = life, grow = grow, a = a, baseS = s });
        }

        SpriteRenderer NewRenderer() { var go = new GameObject("fx"); go.transform.SetParent(transform, false); var sr = go.AddComponent<SpriteRenderer>(); sr.sortingOrder = 20; return sr; }

        void Update()
        {
            for (int i = live.Count - 1; i >= 0; i--)
            {
                var o = live[i]; o.t += Time.deltaTime; float q = o.t / o.life;
                if (q >= 1) { o.sr.gameObject.SetActive(false); pool.Push(o.sr); live.RemoveAt(i); continue; }
                float s = o.baseS * (1 + o.grow * q); o.sr.transform.localScale = new Vector3(s, s, 1);
                var c = o.sr.color; c.a = o.a * (1 - q * q); o.sr.color = c;
            }
        }
    }
}
