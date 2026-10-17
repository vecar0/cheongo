// The icon numbers the content uses (CHOSIK and tree nodes: icon), read as the web game reads them (js/game.js applyUiSprites):
// 2–8 roguea · 100–108 rogue2 · 200–208 rogue3 · 300–308 rogue4 · 505–508 slashfx · 600–606 perkfx · 700 + k·10 + i the ic0…ic16 sheets (later sheets win).
using System.Collections.Generic;

namespace Cheongo
{
    public static class Icons
    {
        static Dictionary<int, (string sheet, int frame)> map;
        static void Build()
        {
            map = new Dictionary<int, (string, int)>();
            for (int i = 2; i < 9; i++) map[i] = ("roguea", i);
            for (int i = 0; i < 9; i++) { map[100 + i] = ("rogue2", i); map[200 + i] = ("rogue3", i); map[300 + i] = ("rogue4", i); }
            for (int i = 5; i < 9; i++) map[500 + i] = ("slashfx", i);
            for (int i = 0; i < 7; i++) map[600 + i] = ("perkfx", i);
            for (int k = 0; k < 17; k++) { var sh = Sheet.Get("ic" + k); if (sh == null || sh.Frames == null) continue; for (int i = 0; i < sh.Frames.Length; i++) map[700 + k * 10 + i] = ("ic" + k, i); }
        }
        // the sheet and frame of an icon number, or false
        public static bool Get(int n, out Sheet sheet, out int frame)
        {
            if (map == null) Build(); sheet = null; frame = 0;
            if (!map.TryGetValue(n, out var v)) return false; sheet = Sheet.Get(v.sheet); frame = v.frame; return sheet != null && frame < sheet.Frames.Length;
        }
    }
}
