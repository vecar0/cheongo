// The whole game is put together in code, so any scene works: press Play in an empty scene and 천고 starts.
// Keys as on the web: ← → / A D move, ↑ ↓ aim, Space / Z jump, J / X cut, K / C / Shift dash, ↓ + jump drops through a ledge.
// R lays the gate out again, N goes on to the next 마당 (until the gate flow is ported).
using UnityEngine;

namespace Cheongo
{
    public class GameRoot : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (FindAnyObjectByType<GameRoot>() != null) return;
            new GameObject("천고").AddComponent<GameRoot>();
        }

        Camera cam; Level lv; Sim sim; PlayerView view; FightView fight; LevelView lview; Fx fx; Transform worldRoot; Music music;
        readonly PlayerInput inp = new PlayerInput();
        int madang, seed = 7, breath;

        void Start()
        {
            Application.targetFrameRate = 60;
            cam = Camera.main;
            if (cam == null) { var go = new GameObject("Main Camera") { tag = "MainCamera" }; cam = go.AddComponent<Camera>(); go.AddComponent<AudioListener>(); }
            cam.orthographic = true; cam.clearFlags = CameraClearFlags.SolidColor; cam.transform.position = new Vector3(0, 0, -10);
            if (DB.Tables == null) { enabled = false; return; }
            music = Music.I; breath = DB.Tuning.START_BREATH;
            Load(0);
        }

        void Load(int m)
        {
            madang = ((m % DB.Tables.MADANG.Length) + DB.Tables.MADANG.Length) % DB.Tables.MADANG.Length;
            if (worldRoot) Destroy(worldRoot.gameObject);
            worldRoot = new GameObject("World").transform;
            lv = Level.Build(madang, seed + madang * 131);
            cam.backgroundColor = DB.Hex(lv.pal.bg);
            lview = LevelView.Create(lv, worldRoot);
            fx = new GameObject("Fx").AddComponent<Fx>(); fx.transform.SetParent(worldRoot, false);
            music.StartSong(DB.Tables.MADANG[madang].jd, seed + madang * 31); music.Tick();
            sim = new Sim(lv, breath, fx, music); sim.P.Fx = fx.Hero;
            fight = FightView.Create(sim, worldRoot); view = PlayerView.Create(sim, worldRoot);
            camX = sim.P.b.x; camY = sim.P.b.y;
        }

        void ReadInput()
        {
            float x = 0, y = 0;
            if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) x -= 1;
            if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) x += 1;
            if (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W)) y -= 1;
            if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S)) y += 1;
            inp.x = x; inp.y = y;
            inp.jumpPressed |= Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Z);
            inp.jumpHeld = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.Z);
            inp.dashPressed |= Input.GetKeyDown(KeyCode.K) || Input.GetKeyDown(KeyCode.C) || Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.RightShift);
            inp.slashPressed |= Input.GetKeyDown(KeyCode.J) || Input.GetKeyDown(KeyCode.X);
        }

        float camX, camY;
        void Update()
        {
            if (lv == null) return;
            if (Input.GetKeyDown(KeyCode.R)) { if (sim.state == "over") { breath = DB.Tuning.START_BREATH; seed++; Load(0); } else { breath = Mathf.Max(sim.breath, 1); seed++; Load(madang); } return; }
            if (Input.GetKeyDown(KeyCode.N)) { breath = Mathf.Max(sim.breath, 1); Load(madang + 1); return; }
            ReadInput();
            float rdt = Mathf.Min(Time.unscaledDeltaTime, .05f);
            music.Tick(); sim.Frame(rdt, inp);
            if (sim.cleared) { breath = sim.breath < DB.Tuning.GATE_HEAL_TO ? sim.breath + 1 : sim.breath; music.Jing(); Load(madang + 1); return; }   // a cleared gate gives one 숨 back while below four
            var p = sim.P; view.Sync(); fight.Sync();

            // camera: the web game shows about 13 tiles across or 11 down, whichever fits; it leads a little where you face
            float aspect = (float)Screen.width / Mathf.Max(1, Screen.height);
            cam.orthographicSize = Mathf.Max(11f / 2, 13f / 2 / aspect);
            float halfW = cam.orthographicSize * aspect * World.T, halfH = cam.orthographicSize * World.T;
            float tx = p.b.x + p.b.w / 2 + p.face * 40, ty = p.b.y - 20;
            camX += (tx - camX) * Mathf.Min(1, rdt * 6); camY += (ty - camY) * Mathf.Min(1, rdt * 4);
            float cx = Mathf.Clamp(camX, halfW, Mathf.Max(halfW, lv.w * World.T - halfW)), cy = Mathf.Min(camY, lv.h * World.T - halfH);
            cam.transform.position = World.ToUnity(cx + (Random.value - .5f) * sim.shake, cy + (Random.value - .5f) * sim.shake, -10);   // a blow shakes the paper
            lview.Follow(cam);
        }

        // ---------- HUD (plain for now; the painted one comes with the UI step) ----------
        GUIStyle label, word; Texture2D white;
        void OnGUI()
        {
            if (sim == null || fx == null) return;
            if (label == null) { label = new GUIStyle(GUI.skin.label) { fontSize = 14 }; word = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold }; white = Texture2D.whiteTexture; }
            Color ink = new Color(.1f, .1f, .12f), seal = new Color(.76f, .09f, .11f);
            var md = DB.Tables.MADANG[madang]; label.normal.textColor = ink; label.fontSize = 14;
            GUI.Label(new Rect(14, 8, 900, 22), $"천고 · {madang + 1}번째 마당 · {Music.JANGDAN[md.jd].name}", label);
            label.fontSize = 12; label.normal.textColor = new Color(.93f, .9f, .85f, .7f); GUI.Label(new Rect(14, Screen.height - 26, 900, 22), "←→ 이동 · Space 점프 · J 베기 · K 대시 · R 다시 · N 다음", label);

            // 숨: one drop for each breath left
            var dot = Fx.Dot().texture; int cap = Mathf.Max(5, sim.breath);
            for (int i = 0; i < cap; i++) { GUI.color = i < sim.breath ? seal : new Color(.1f, .1f, .12f, .18f); GUI.DrawTexture(new Rect(16 + i * 22, 36, 16, 16), dot); }
            GUI.color = Color.white;
            if (sim.P.chain >= 1) { label.fontSize = Mathf.RoundToInt(18 * (1 + sim.P.chainPop * 1.6f)); label.normal.textColor = sim.P.chain >= 5 ? seal : ink; GUI.Label(new Rect(Screen.width - 120, 40, 110, 40), $"{sim.P.chain} 연속", label); }

            // the 장단: a drum that nods on every beat
            var vis = Sheet.Get("vis"); float bl = music.BeatLen, ph = ((music.Pos / bl) % 1 + 1) % 1, beatK = Mathf.Max(0, .2f - Mathf.Min(ph, 1 - ph)) * 1.2f;
            if (vis != null)
            {
                var f = vis.Frames[3]; float sz = 34 * (1 + beatK * 1.5f), w = sz * f.w / f.h; GUI.color = new Color(1, 1, 1, .55f + beatK * 2);
                GUI.DrawTextureWithTexCoords(new Rect(Screen.width / 2 - w / 2, Screen.height - 40 - sz / 2, w, sz), vis.Tex, new Rect((float)f.x / vis.Tex.width, 1 - (float)(f.y + f.h) / vis.Tex.height, (float)f.w / vis.Tex.width, (float)f.h / vis.Tex.height));
                GUI.color = Color.white;
            }

            // small floating words and the stamp's character, pinned to the world
            foreach (var q in fx.words)
            {
                float life = q.stamp ? 1.1f : .9f; var sp = cam.WorldToScreenPoint(World.ToUnity(q.x, q.y - (q.stamp ? 0 : q.t * 30)));
                float px = Screen.height / (cam.orthographicSize * 2 * World.T); word.fontSize = Mathf.RoundToInt((q.stamp ? 28 : 14) * px);
                var c = q.col; c.a = q.stamp ? Mathf.Clamp01((life - q.t) / .4f) : Mathf.Max(0, 1 - q.t / life); word.normal.textColor = c;
                GUI.Label(new Rect(sp.x - 150, Screen.height - sp.y - 30, 300, 60), q.txt, word);
            }
            if (sim.toastT > 0) { word.fontSize = 18; word.normal.textColor = ink; GUI.Label(new Rect(Screen.width / 2 - 300, 70, 600, 30), sim.toast, word); }

            if (sim.flashDim > 0) { GUI.color = new Color(.08f, .04f, .05f, Mathf.Min(.5f, sim.flashDim * 3)); GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), white); }   // the screen draws a breath as a glint opens
            if (sim.flash > 0) { GUI.color = new Color(1, 1, 1, Mathf.Min(.8f, sim.flash * 2)); GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), white); }
            GUI.color = Color.white;
            if (sim.state == "over")
            {
                GUI.color = new Color(.05f, .04f, .05f, .6f); GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), white); GUI.color = Color.white;
                word.fontSize = 40; word.normal.textColor = new Color(.93f, .9f, .85f); GUI.Label(new Rect(0, Screen.height / 2 - 60, Screen.width, 60), "숨이 다했다", word);
                word.fontSize = 18; GUI.Label(new Rect(0, Screen.height / 2 + 10, Screen.width, 30), $"벤 적 {sim.kills} · 간파 {sim.kanpaN} — R 처음부터", word);
            }
        }
    }
}
