// 천고 data, read from Resources/Data/*.json (written by tools/unity-export/export.js from the web game's js files).
using System;
using UnityEngine;

namespace Cheongo
{
    [Serializable]
    public class Tuning
    {
        public float CLIMBV, CLIMB_T, GRAV, JUMPV, MAXV, DASHV, HOOK_R, STRIKE_WIN, TAP_T;
        public float FLASH_BASE, FLASH_MAX, HIT_INVULN, RECOIL_V, RECOIL_GROUND_X;
        public int START_BREATH, GATE_HEAL_TO, REST_BREATH;
        public float START_SLEEP_R, START_SLEEP_T, ENTRY_FIRE_DELAY;
        public float BOSS_HP_MUL, BOSS_HP_PER_CYCLE, BOSS_GUARD_HITS, BOSS_GUARD_T;
        public float MOM_KILL, MOM_KILL_MOVING, MOM_KAN, MOM_PERFECT;
        public int HON_PER_GATE, HON_PER_FLOOR, START_SP, FREE_FALLS, DRUM_PLAIN_N;
        public float DRUM_PLAIN_R, HAWK_TELL, HAWK_DIVE_V, HAWK_REST_BEATS;
        public int[] TREE_OPEN_HON;
        public Diff[] DIFF;   // 난이도: 숨, 간파 판정(초), 적이 다시 공격하기까지 걸리는 배수, 우두머리 체력, 혼
    }
    [Serializable] public class Diff { public string name, desc; public int breath; public float kan, fire, bossHp, hon; }

    [Serializable] public class Madang { public string jd; public string line; public string[] tiers; }
    [Serializable] public class Palette { public string bg, tile, fig, foe, text, wash; public float farA, midA; }
    [Serializable] public class HeroFrames { public int idle; public int[] run; public int rise, flip, fall, wall, dash, slash, up, down, land; }

    [Serializable]
    public class GameTables
    {
        public int T;
        public Madang[] MADANG;
        public Palette[] PAL;
        public string[] START_PIECE, ARENA_PIECE;
        public HeroFrames H3;
        public float[] H3_AX;
        public float HERO_H;
    }

    [Serializable] public class Chunk { public int tier; public bool wall, multi; public string[] map; }
    [Serializable] public class ChunkList { public Chunk[] chunks; }

    public static class DB
    {
        static Tuning tuning; static GameTables tables; static ChunkList chunks;
        static T Load<T>(string name) where T : class
        {
            var ta = Resources.Load<TextAsset>("Data/" + name);
            if (ta == null) { Debug.LogError($"천고: Resources/Data/{name}.json is missing — run tools/unity-export/export.js"); return null; }
            return JsonUtility.FromJson<T>(ta.text);
        }
        public static Tuning Tuning { get { if (tuning == null) tuning = Load<Tuning>("tuning"); return tuning; } }
        public static GameTables Tables { get { if (tables == null) tables = Load<GameTables>("game"); return tables; } }
        public static Chunk[] Chunks { get { if (chunks == null) chunks = Load<ChunkList>("chunks"); return chunks != null ? chunks.chunks : new Chunk[0]; } }
        // tools and tests can hand the tables in directly instead of reading Resources
        public static void Use(Tuning t, GameTables g, Chunk[] c) { tuning = t; tables = g; chunks = new ChunkList { chunks = c }; }
        public static Color Hex(string hex) => ColorUtility.TryParseHtmlString(hex, out var c) ? c : Color.magenta;
    }
}
