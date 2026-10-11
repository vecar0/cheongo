// 무명 drawn from the hero3 sheet: idle, the six-step run, rise / turn / fall, the wall, the dash, the landing.
using UnityEngine;

namespace Cheongo
{
    public class PlayerView : MonoBehaviour
    {
        Player p; SpriteRenderer sr; Sheet sheet; float k;
        HeroFrames H; float[] AX;

        public static PlayerView Create(Player p, Transform parent)
        {
            var go = new GameObject("Mumyeong"); go.transform.SetParent(parent, false);
            var v = go.AddComponent<PlayerView>(); v.p = p; v.sr = go.AddComponent<SpriteRenderer>(); v.sr.sortingOrder = 10;
            v.sheet = Sheet.Get("hero3"); v.H = DB.Tables.H3; v.AX = DB.Tables.H3_AX;
            if (v.sheet != null) v.k = World.ScaleFor(DB.Tables.HERO_H, v.sheet.FrameH(v.H.idle));
            return v;
        }

        int Pick()
        {
            if (p.dashT > 0) return H.dash;
            if (!p.onGround)
            {
                if (p.wall != 0) return H.wall;
                return p.vy < -60 ? H.rise : p.vy > 60 ? H.fall : H.flip;
            }
            if (p.landT > 0) return H.land;
            if (Mathf.Abs(p.vx) > 20) return H.run[Mathf.FloorToInt(p.run) % H.run.Length];
            return H.idle;
        }

        public void Sync()
        {
            if (sheet == null) return;
            int f = Pick(); int face = p.wall != 0 && !p.onGround ? -p.wall : p.face;   // on a wall he faces away from it, ready to kick
            sr.sprite = sheet.Frame(f, f < AX.Length ? AX[f] : .5f, 1f); sr.flipX = face < 0;
            transform.localPosition = World.ToUnity(p.b.x + p.b.w / 2, p.b.y + p.b.h, 0);
            transform.localScale = new Vector3(k, k, 1);
        }
    }
}
