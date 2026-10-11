// The whole game is put together in code, so any scene works: press Play in an empty scene and 천고 starts.
// Keys as on the web: ← → / A D move, ↑ ↓ aim, Space / Z jump, K / C / Shift dash, ↓ + jump drops through a ledge.
// R lays the gate out again, N goes on to the next 마당 (until the gate flow is ported).
using UnityEngine;

namespace Cheongo
{
    public class GameRoot : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (FindFirstObjectByType<GameRoot>() != null) return;
            new GameObject("천고").AddComponent<GameRoot>();
        }

        Camera cam; Level lv; Player p; PlayerView view; LevelView lview; Fx fx; Transform worldRoot;
        readonly PlayerInput inp = new PlayerInput();
        int madang, seed = 7;

        void Start()
        {
            Application.targetFrameRate = 60;
            cam = Camera.main;
            if (cam == null) { var go = new GameObject("Main Camera") { tag = "MainCamera" }; cam = go.AddComponent<Camera>(); }
            cam.orthographic = true; cam.clearFlags = CameraClearFlags.SolidColor; cam.transform.position = new Vector3(0, 0, -10);
            if (DB.Tables == null) { enabled = false; return; }
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
            p = new Player(lv, lv.start.x, lv.start.y);
            view = PlayerView.Create(p, worldRoot);
            fx = new GameObject("Fx").AddComponent<Fx>(); fx.transform.SetParent(worldRoot, false);
            p.Fx = fx.Hero;
            camX = p.b.x; camY = p.b.y;
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
            if (Input.GetKeyDown(KeyCode.R)) { seed++; Load(madang); return; }
            if (Input.GetKeyDown(KeyCode.N)) { Load(madang + 1); return; }
            ReadInput();
            float dt = Mathf.Min(Time.deltaTime, 1 / 30f);
            p.Step(dt, inp); inp.jumpPressed = inp.dashPressed = inp.slashPressed = false;
            if (p.b.y > lv.h * World.T + 80) { var s = lv.start; p.b.x = s.x; p.b.y = s.y; p.vx = p.vy = 0; }   // a fall: back to the start (the 숨 and 낙법 rules come later)
            if (lv.exit.Overlaps(new Rect(p.b.x, p.b.y, p.b.w, p.b.h))) { Load(madang + 1); return; }
            view.Sync();

            // camera: the web game shows about 13 tiles across or 11 down, whichever fits; it leads a little where you face
            float aspect = (float)Screen.width / Mathf.Max(1, Screen.height);
            cam.orthographicSize = Mathf.Max(11f / 2, 13f / 2 / aspect);
            float halfW = cam.orthographicSize * aspect * World.T, halfH = cam.orthographicSize * World.T;
            float tx = p.b.x + p.b.w / 2 + p.face * 40, ty = p.b.y - 20;
            camX += (tx - camX) * Mathf.Min(1, dt * 6); camY += (ty - camY) * Mathf.Min(1, dt * 4);
            float cx = Mathf.Clamp(camX, halfW, Mathf.Max(halfW, lv.w * World.T - halfW)), cy = Mathf.Min(camY, lv.h * World.T - halfH);
            cam.transform.position = World.ToUnity(cx, cy, -10);
            lview.Follow(cam);
        }

        void OnGUI()
        {
            var st = new GUIStyle(GUI.skin.label) { fontSize = 14 }; st.normal.textColor = new Color(.1f, .1f, .12f);
            GUI.Label(new Rect(14, 10, 900, 22), $"천고 · {madang + 1}번째 마당 ({DB.Tables?.MADANG[madang].jd})  —  ←→ 이동 · Space 점프 · K 대시 · ↓+Space 발판 아래로 · R 다시 · N 다음", st);
        }
    }
}
