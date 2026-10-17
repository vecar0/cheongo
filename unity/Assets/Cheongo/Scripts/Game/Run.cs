// One journey up to 천고 and what outlasts it: the run (where you are, 숨, the 비급 and 수련 you hold, 기세 and 천고 기운),
// the lasting record (혼, the 사당, bests) and the settings. All of it is kept in PlayerPrefs as JSON.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    [Serializable] public class Chosik { public string id, name, han, kind, desc; public int icon; public bool repeat; }
    [Serializable] class ContentData { public Chosik[] CHOSIK; }
    [Serializable] public class StatKV { public string k; public float v; }
    [Serializable] public class TreeNode { public string id, name, han, desc, grant; public int icon; public StatKV[] stat; }
    [Serializable] public class TreeBranch { public string name, han; public TreeNode[] nodes; }
    [Serializable] public class WeaponTree { public string key, name; public TreeNode root; public TreeBranch[] br; }
    [Serializable] class TreeData { public WeaponTree[] weapons; }

    public static class Content
    {
        static Chosik[] chosik; static WeaponTree[] trees;
        public static Chosik[] All { get { if (chosik == null) { var ta = Resources.Load<TextAsset>("Data/content"); chosik = ta != null ? JsonUtility.FromJson<ContentData>(ta.text).CHOSIK : new Chosik[0]; } return chosik; } }
        public static WeaponTree Tree(string key) { if (trees == null) { var ta = Resources.Load<TextAsset>("Data/tree"); trees = ta != null ? JsonUtility.FromJson<TreeData>(ta.text).weapons : new WeaponTree[0]; } foreach (var t in trees) if (t.key == key) return t; return null; }
        // the 비급 whose rules are ported so far; only these are offered
        public static readonly HashSet<string> READY = new HashSet<string> { "sum", "d_far", "d_sunbo", "d_sun", "d_jeong", "d_pajuk", "d_giseom", "d_dangong", "d_chain", "d_reflect", "d_gihyeol", "d_gise", "d_nakbeop", "d_ganggi", "d_janmyeong",
            "d_myeong", "d_beat", "d_zanshin", "d_tan", "d_freeze", "d_ward", "d_breathe", "d_breath", "d_calm", "d_air", "d_jump", "d_hover", "d_wall", "d_bisang", "d_jilbo", "d_cheonbo", "d_glide" };
        public static readonly HashSet<string> TREE_READY = new HashSet<string> { "hw_a1", "hw_a2", "hw_a3", "hw_b1", "hw_b2", "hw_b3", "hw_c1", "hw_c2", "hw_c3" };
        static readonly HashSet<string> STATS = new HashSet<string> { "edge", "kanWin", "gise", "spd", "mag", "reload", "heat", "blast", "ki", "qi", "edgeRate" };
        // a step of 수련 whose rule is ported: one of the sword arts above, a 비급 it grants, or a plain strengthening
        public static bool NodeReady(TreeNode n) { if (TREE_READY.Contains(n.id)) return true; if (!string.IsNullOrEmpty(n.grant)) return READY.Contains(n.grant); if (n.stat == null || n.stat.Length == 0) return false; foreach (var k in n.stat) if (!STATS.Contains(k.k)) return false; return true; }
        public static Chosik Find(string id) { foreach (var c in All) if (c.id == id) return c; return null; }
        public static readonly string[] STAGE = { "제1관문 第一關", "제2관문 第二關", "제3관문 第三關", "제4관문 第四關", "제5관문 第五關", "천고대 天鼓臺" };
    }

    [Serializable]
    public class Run
    {
        public int seed = 7, cycle, m, breath = 4, sp, hon, honBonus, kills, kanpa, perfectN, deaths, slashes, aimK, maxTier, gateHits, diff = 1;
        public float qi, mom, momAt, trance, time; public bool janUsed; public string node = "gate", weapon = "hwando";   // gate · elite · rest
        public List<string> perks = new List<string>(), tree = new List<string>(); public List<int> cp = new List<int>();
        [NonSerialized] HashSet<string> set; [NonSerialized] Dictionary<string, float> stats;

        public const int LAST_M = 5;
        public static int MD(int m) => new[] { 0, 1, 2, 2, 3, 4 }[Mathf.Clamp(m, 0, LAST_M)];   // a turn: five short 관문 chosen along the way, then 천고대
        public bool Arena => m >= LAST_M;
        public Diff Diff => DB.Tuning.DIFF != null && diff >= 0 && diff < DB.Tuning.DIFF.Length ? DB.Tuning.DIFF[diff] : new Diff { name = "보통", fire = 1, bossHp = 1, hon = 1 };
        public int BreathCap => 5 + (Meta.I.well ? 1 : 0);

        void Index()
        {
            set = new HashSet<string>(perks); stats = new Dictionary<string, float>(); var t = Content.Tree(weapon); if (t == null) return;
            void Take(TreeNode n) { if (n == null || !tree.Contains(n.id)) return; set.Add(n.id); if (!string.IsNullOrEmpty(n.grant)) set.Add(n.grant); if (n.stat != null) foreach (var s in n.stat) { stats.TryGetValue(s.k, out var v); stats[s.k] = v + s.v; } }
            Take(t.root); foreach (var b in t.br) foreach (var n in b.nodes) Take(n);
        }
        public bool Has(string id) { if (set == null) Index(); return set.Contains(id); }
        public float StatF(string k) { if (stats == null) Index(); return stats.TryGetValue(k, out var v) ? v : 0; }
        public int Stat(string k) => Mathf.RoundToInt(StatF(k));
        public void Learn(string id) { if (id == "sum") breath = Mathf.Min(BreathCap, breath + 1); else if (!perks.Contains(id)) perks.Add(id); set = null; }
        public void Train(string id) { if (!tree.Contains(id)) tree.Add(id); set = null; stats = null; }
        // 오의: a branch walked to its third step turns the plain 천고난무 into the weapon's own art
        public bool OugiOpen => Has("hw_a3") || Has("hw_b3") || Has("hw_c3");

        public static Run Fresh(int diff, string weapon = "hwando")
        {
            var r = new Run { seed = UnityEngine.Random.Range(1, 1 << 30), diff = diff, sp = DB.Tuning.START_SP, weapon = weapon };
            r.breath = Mathf.Max(2, DB.Tuning.START_BREATH + r.Diff.breath) + Meta.I.sadang;
            return r;
        }
    }

    // what stays between journeys
    [Serializable]
    public class Meta
    {
        public int hon, sadang, runs, bestCycle, bestKills, drums; public bool well; public List<string> seen = new List<string>(), weapons = new List<string> { "hwando", "jochong" };
        public string lastWeapon = "hwando";
        // settings
        public float mus = .8f, sfx = 1; public bool fullscreen = true, shake = true, mouseAim = true; public int diff = 1, resW, resH;
        public string runJson = "";

        static Meta inst;
        public static Meta I { get { if (inst == null) { try { inst = JsonUtility.FromJson<Meta>(PlayerPrefs.GetString("cheongo.meta", "{}")); } catch { inst = null; } if (inst == null) inst = new Meta(); } return inst; } }
        public void Save() { PlayerPrefs.SetString("cheongo.meta", JsonUtility.ToJson(this)); PlayerPrefs.Save(); }
        public void SaveRun(Run r) { runJson = r == null ? "" : JsonUtility.ToJson(r); Save(); }
        public Run LoadRun() { if (string.IsNullOrEmpty(runJson)) return null; try { return JsonUtility.FromJson<Run>(runJson); } catch { return null; } }
        public const int SADANG_MAX = 2; public static int SadangCost(int lv) => 40 + 50 * lv; public const int WELL_COST = 120;
    }
}
