// The whole game is put together in code, so any scene works: press Play in an empty scene and 천고 starts.
// This is the journey around the fight: the title, the gates of a turn (five 관문, then 천고대 and its guardian), the 비급 offered
// after each gate, the road chosen between them, 수련 after the drum is cut, pausing, settings, and the lasting record.
// Made for a computer: keyboard and mouse (the mouse aims the cut and 무아경), or a gamepad; everything in the menus answers to any of the three.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public partial class GameRoot : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (FindAnyObjectByType<GameRoot>() != null) return;
            new GameObject("천고").AddComponent<GameRoot>();
        }

        Camera cam; Level lv; Sim sim; PlayerView view; FightView fight; LevelView lview; TerrainView terrain; Fx fx; Transform worldRoot; Music music; Run run; Meta meta;
        readonly PlayerInput inp = new PlayerInput();
        float camX, camY, stageCardT = 9, fade = 1; int earned;

        // ---------- menus: one list of choices at a time, drawn as a column or as cards ----------
        class Item { public string label, sub, tag; public int icon = -1; public Action act; public Action<int> adjust; public Func<string> value; public bool enabled = true; }
        class Screen { public string title, sub, note; public List<Item> items = new List<Item>(); public bool cards, dark; public Action back; public int sel; public Texture2D art; }
        Screen screen; int clicked = -1; Vector2 lastMouse; float navCd;

        void Start()
        {
            Application.targetFrameRate = 120; QualitySettings.vSyncCount = 1;
            cam = Camera.main;
            if (cam == null) { var go = new GameObject("Main Camera") { tag = "MainCamera" }; cam = go.AddComponent<Camera>(); go.AddComponent<AudioListener>(); }
            cam.orthographic = true; cam.clearFlags = CameraClearFlags.SolidColor; cam.transform.position = new Vector3(0, 0, -10);
            if (DB.Tables == null) { enabled = false; return; }
            music = Music.I; meta = Meta.I; ApplySettings(); Booth.Init();
            ShowTitle();
        }
        void ApplySettings()
        {
            music.MusVol = meta.mus; music.SfxVol = meta.sfx;
            if (!Application.isEditor) { if (meta.resW > 0) UnityEngine.Screen.SetResolution(meta.resW, meta.resH, meta.fullscreen ? FullScreenMode.FullScreenWindow : FullScreenMode.Windowed); else UnityEngine.Screen.fullScreenMode = meta.fullscreen ? FullScreenMode.FullScreenWindow : FullScreenMode.Windowed; }
        }

        // ---------- the journey ----------
        void ShowTitle()
        {
            if (booth) { ShowBoothTitle(); return; }   // 부스판: its own title, board and short journey (GameRoot.Booth.cs)
            ClearWorld(); music.StopSong(); cam.backgroundColor = DB.Hex("#e6e2d7"); sim = null;
            var s = new Screen { title = "천고", sub = "天鼓 · 북을 베러 가는 길", art = Sheet.Image("title"), note = "방향키·마우스로 고르고 Enter · 클릭" };
            var saved = meta.LoadRun();
            if (saved != null) s.items.Add(new Item { label = "이어 가기", sub = $"{saved.cycle + 1}번째 바퀴 · {Content.STAGE[Mathf.Min(saved.m, Run.LAST_M)]} · 숨 {saved.breath}", act = () => { run = saved; earned = 0; LoadGate(); } });
            s.items.Add(new Item { label = "길을 떠나다", sub = saved != null ? "새로 떠난다 (이어 가던 길은 지워진다)" : "새 길", act = ShowWeapons });
            s.items.Add(new Item { label = "사당", sub = $"혼 {meta.hon} · 남는 것들", act = ShowShrine });
            s.items.Add(new Item { label = "설정", act = () => ShowSettings(ShowTitle) });
            s.items.Add(new Item { label = "끝내기", act = () => Application.Quit() });
            Show(s);
        }
        // what to carry: the sword, or one of the guns the 사당 has opened
        void ShowWeapons()
        {
            sim = null; var s = new Screen { title = "무엇을 들고 떠나는가", sub = "무기마다 싸우는 법이 다르다", cards = true, note = "← → 고르기 · Enter 떠나기 · Esc 돌아가기", back = ShowTitle };
            foreach (var kv in Weapon.ALL) { var w = kv.Value; bool have = meta.weapons.Contains(w.key); s.items.Add(new Item { label = w.name, tag = w.han + (have ? "" : $" · 사당에서 혼 {w.cost}"), sub = w.desc, enabled = have, act = () => { meta.lastWeapon = w.key; run = Run.Fresh(meta.diff, w.key); earned = 0; meta.runs++; LoadGate(); } }); if (have && w.key == meta.lastWeapon) s.sel = s.items.Count - 1; }
            Show(s);
        }
        void Show(Screen s) { screen = s; clicked = -1; fade = 0; while (s.sel < s.items.Count && !s.items[s.sel].enabled) s.sel++; if (s.sel >= s.items.Count) s.sel = 0; }

        void ClearWorld() { if (worldRoot) Destroy(worldRoot.gameObject); worldRoot = null; lv = null; }
        void LoadGate()
        {
            screen = null; ClearWorld(); fade = 0;
            if (run.node == "rest") { ShowRest(); return; }
            int md = Run.MD(run.m);
            worldRoot = new GameObject("World").transform;
            if (booth && !run.Arena) md = BoothMd(run.m);   // 부스판: each gate a different 마당
            lv = Maps.Pick(md, run.Arena, run.seed + run.m * 131) ?? Level.Build(md, run.seed + run.m * 131, run.Arena, run.cycle, run.node == "elite" ? 2 : 0);   // the web game's own gates (maps.json), else the hand-made pieces
            cam.backgroundColor = DB.Hex(lv.pal.bg);
            lview = LevelView.Create(lv, worldRoot);
            fx = new GameObject("Fx").AddComponent<Fx>(); fx.transform.SetParent(worldRoot, false);
            music.StartSong(DB.Tables.MADANG[md].jd, run.seed + run.m * 31 + run.cycle); music.Tick();
            run.gateHits = 0; run.janUsed = false; run.cp.Clear();
            sim = new Sim(lv, run, fx, music); sim.P.Fx = fx.Hero;
            fight = FightView.Create(sim, worldRoot); view = PlayerView.Create(sim, worldRoot); terrain = TerrainView.Create(sim, worldRoot);
            camX = sim.P.b.cx + 24; camY = sim.P.b.cy - 24; stageCardT = 0;
            if (!booth) meta.SaveRun(run);   // a booth journey is never continued
        }
        string StageName => run.Arena ? $"천고대 天鼓臺 · {Boss.For(run.seed, run.cycle).name}" : (run.node == "elite" ? "험로 · " : "") + Content.STAGE[Mathf.Min(run.m, Run.LAST_M)];

        void GateCleared()
        {
            if (booth && BoothGateCleared()) return;
            music.Sfx("strike"); int hon;
            if (run.Arena)   // the drum is cut: a turn of the road is done, and the next begins harder
            {
                hon = Mathf.RoundToInt((DB.Tuning.HON_PER_FLOOR + run.honBonus) * run.Diff.hon); run.honBonus = 0; run.cycle++; run.m = 0; run.node = "gate"; run.sp += 2; meta.drums++; meta.bestCycle = Mathf.Max(meta.bestCycle, run.cycle);
                earned += hon; meta.hon += hon; if (run.breath < run.BreathCap) run.breath++;
                meta.SaveRun(run); ShowTree($"천고를 베었다 · {run.cycle}번째 북", $"혼 +{hon} · 수련점 +2 · 길은 다시 처음부터, 더 험하게 이어진다");
                return;
            }
            hon = Mathf.RoundToInt((DB.Tuning.HON_PER_GATE + run.honBonus + (run.node == "elite" ? 20 : 0)) * run.Diff.hon); run.honBonus = 0; earned += hon; meta.hon += hon;
            string grade = run.gateHits == 0 ? "甲" : run.gateHits <= 1 ? "乙" : "丙"; if (grade == "甲") run.sp++;   // 관문 등급: untouched earns a 수련점
            bool healed = run.breath < DB.Tuning.GATE_HEAL_TO; if (healed) run.breath++;   // each gate passed lets you catch one breath back
            if (run.node == "elite") run.qi = Mathf.Min(100, run.qi + 40);
            run.m++; run.node = "gate"; run.sp++; meta.SaveRun(run);
            ShowChoice($"관문을 넘었다 · 등급 {grade}", $"혼 +{hon}{(healed ? " · 숨을 골랐다" : "")}{(grade == "甲" ? " · 수련점 +1" : "")} — 비급 하나를 고른다");
        }

        // 비급: three offered after every gate, one kept
        void ShowChoice(string title, string sub)
        {
            music.StopSong(); ClearWorld(); sim = null;
            var s = new Screen { title = title, sub = sub, cards = true, note = "← → 고르기 · Enter 익히기" };
            var pool = new List<Chosik>(); foreach (var c in Content.All) if (Content.READY.Contains(c.id) && (c.repeat || !run.perks.Contains(c.id)) && !(c.id == "sum" && run.breath >= run.BreathCap)) pool.Add(c);
            var rnd = new System.Random(run.seed + run.m * 7919 + run.cycle * 104729 + run.perks.Count);
            for (int i = pool.Count - 1; i > 0; i--) { int j = rnd.Next(i + 1); (pool[i], pool[j]) = (pool[j], pool[i]); }
            for (int i = 0; i < Mathf.Min(3, pool.Count); i++) { var c = pool[i]; s.items.Add(new Item { label = c.name, tag = $"{c.han} · {c.kind}", sub = c.desc, icon = c.icon, act = () => { run.Learn(c.id); meta.SaveRun(run); ShowRoute(); } }); }
            if (s.items.Count == 0) { ShowRoute(); return; }
            Show(s);
        }

        // 길 고르기: which road to the next gate
        void ShowRoute()
        {
            if (booth) { run.node = "gate"; LoadGate(); return; }   // 부스판: straight on to the next gate
            if (run.Arena) { ShowTree("천고대 앞", "우두머리가 기다린다 — 들어서기 전에 닦은 것을 가다듬는다", true); return; }
            var s = new Screen { title = "길을 고른다", sub = $"{run.cycle + 1}번째 바퀴 · 다음은 {Content.STAGE[run.m]}", cards = true, note = $"숨 {run.breath} · 수련점 {run.sp} · 혼 {meta.hon}" };
            s.items.Add(new Item { label = "관문", tag = "關門", sub = "늘 가던 길. 지키는 이들을 넘어 문을 지난다.", act = () => { run.node = "gate"; LoadGate(); } });
            s.items.Add(new Item { label = "험로", tag = "險路", sub = "지키는 이가 많고 정예가 섞여 있다. 넘으면 혼 +20, 천고 기운이 크게 찬다.", act = () => { run.node = "elite"; LoadGate(); } });
            if (run.m % 2 == 0) s.items.Add(new Item { label = "쉼터", tag = "酒幕", sub = $"주막에서 숨을 고른다. 숨 +{DB.Tuning.REST_BREATH}. 관문 하나를 건너뛰지만 비급은 얻지 못한다.", enabled = run.breath < run.BreathCap, act = () => { run.node = "rest"; LoadGate(); } });
            s.items.Add(new Item { label = "수련", tag = "修鍊", sub = $"수련점 {run.sp}점으로 {Weapon.Of(run.weapon).name}의 갈래를 닦는다.", enabled = run.sp > 0, act = () => ShowTree("수련", "한 걸음에 한 점. 한 갈래의 셋째 걸음이 오의다.", true) });
            Show(s);
        }
        void ShowRest()
        {
            music.StopSong(); int n = Mathf.Min(DB.Tuning.REST_BREATH, run.BreathCap - run.breath); run.breath += n; run.m++; run.node = "gate"; meta.SaveRun(run);
            var s = new Screen { title = "쉼터 · 주막", sub = $"국밥 한 그릇에 숨을 골랐다 · 숨 +{n}", art = Sheet.Image("hubscene") };
            s.items.Add(new Item { label = "다시 길로", act = ShowRoute });
            Show(s);
        }

        // 수련: the weapon's three branches, each step opening the next
        void ShowTree(string title, string sub, bool fromRoute = false)
        {
            music.StopSong(); ClearWorld(); sim = null;
            var t = Content.Tree(run.weapon); var s = new Screen { title = title, sub = sub, cards = true, note = $"수련점 {run.sp} · Esc 넘어가기" };
            Action next = fromRoute ? (Action)(() => { if (run.Arena) { run.node = "gate"; LoadGate(); } else ShowRoute(); }) : ShowRoute;
            if (t != null)
            {
                if (t.root != null && !run.tree.Contains(t.root.id)) s.items.Add(NodeItem(t.root, "단련", title, sub, fromRoute));
                foreach (var b in t.br) foreach (var n in b.nodes) { if (run.tree.Contains(n.id)) continue; if (!Content.NodeReady(n)) { if (run.weapon == "hwando") break; continue; } s.items.Add(NodeItem(n, $"{b.name} {b.han}", title, sub, fromRoute)); break; }   // a gun: only its plain strengthenings (its arts are not ported yet)
            }
            s.items.Add(new Item { label = fromRoute && run.Arena ? "천고대로" : "넘어간다", tag = "", sub = fromRoute && run.Arena ? "우두머리 앞으로 나아간다." : "수련점은 남겨 둔다.", act = next }); s.back = next;
            Show(s);
        }
        Item NodeItem(TreeNode n, string branch, string title, string sub, bool fromRoute) => new Item { label = n.name, tag = $"{n.han} · {branch}", sub = n.desc + "\n\n수련점 1", enabled = run.sp > 0, act = () => { run.sp--; run.Train(n.id); meta.SaveRun(run); music.Sfx("lantern"); ShowTree(title, sub, fromRoute); } };

        void ShowOver()
        {
            music.StopSong(); meta.bestKills = Mathf.Max(meta.bestKills, run.kills); meta.SaveRun(null);
            var s = new Screen { title = "숨이 다했다", sub = $"{run.cycle + 1}번째 바퀴 {Content.STAGE[Mathf.Min(run.m, Run.LAST_M)]}에서 · {sim?.lastCause ?? "함정"}에게", dark = true,
                note = $"벤 적 {run.kills} · 간파 {run.kanpa} (완벽 {run.perfectN}) · 벤 북 {run.cycle} · 얻은 혼 {earned}" };
            s.items.Add(new Item { label = "다시 떠나다", act = ShowWeapons });
            s.items.Add(new Item { label = "처음으로", act = ShowTitle });
            Show(s);
        }

        void ShowPause()
        {
            var s = new Screen { title = "잠시 멈춤", sub = StageName, dark = true, note = "Esc 이어 하기" };
            s.items.Add(new Item { label = "이어 하기", act = () => screen = null });
            s.items.Add(new Item { label = "설정", act = () => ShowSettings(ShowPause) });
            s.items.Add(new Item { label = "조작", act = ShowKeys });
            s.items.Add(new Item { label = "그만두고 처음으로", sub = "이 관문은 처음부터 다시 이어 갈 수 있다", act = ShowTitle });
            s.back = () => screen = null; Show(s);
        }
        void ShowKeys()
        {
            var s = new Screen { title = "조작", dark = sim != null, sub = "키보드 · 마우스 · 게임패드",
                note = "이동 ←→ / A D  ·  점프 Space / Z (짧게 누르면 낮게)  ·  베기 J / X / 마우스 왼쪽\n대시 K / C / Shift / 마우스 오른쪽 — 짧게 누르면 대시, 누르고 있으면 무아경(조준), 놓으면 일섬\n천고난무 Q (북이 다 찼을 때)  ·  발판 아래로 ↓ + 점프  ·  멈춤 Esc  ·  전체 화면 F11\n게임패드: A 점프 · X 베기 · B / RB 대시·무아경 · Y 천고난무 · Start 멈춤" };
            s.items.Add(new Item { label = "돌아간다", act = () => { if (sim != null) ShowPause(); else ShowTitle(); } }); s.back = s.items[0].act; Show(s);
        }

        void ShowSettings(Action back)
        {
            var s = new Screen { title = "설정", dark = sim != null, note = "← → 바꾸기" };
            string Pct(float v) => Mathf.RoundToInt(v * 100) + "%";
            s.items.Add(new Item { label = "음악", value = () => Pct(meta.mus), adjust = d => { meta.mus = Mathf.Clamp01(meta.mus + d * .1f); ApplySettings(); } });
            s.items.Add(new Item { label = "효과음", value = () => Pct(meta.sfx), adjust = d => { meta.sfx = Mathf.Clamp01(meta.sfx + d * .1f); ApplySettings(); music.Sfx("slash"); } });
            s.items.Add(new Item { label = "전체 화면", value = () => meta.fullscreen ? "켬" : "끔", adjust = d => { meta.fullscreen = !meta.fullscreen; ApplySettings(); } });
            s.items.Add(new Item { label = "해상도", value = () => meta.resW > 0 ? $"{meta.resW} × {meta.resH}" : "모니터 그대로", adjust = d => { var rs = new[] { (0, 0), (1280, 720), (1600, 900), (1920, 1080), (2560, 1440), (3840, 2160) }; int i = Array.FindIndex(rs, r => r.Item1 == meta.resW); i = ((i < 0 ? 0 : i) + d + rs.Length) % rs.Length; meta.resW = rs[i].Item1; meta.resH = rs[i].Item2; ApplySettings(); } });
            s.items.Add(new Item { label = "화면 흔들림", value = () => meta.shake ? "켬" : "끔", adjust = d => meta.shake = !meta.shake });
            s.items.Add(new Item { label = "마우스 조준", value = () => meta.mouseAim ? "켬" : "끔", sub = "켜면 베기와 무아경이 마우스 쪽을 향한다", adjust = d => meta.mouseAim = !meta.mouseAim });
            s.items.Add(new Item { label = "난이도", value = () => DB.Tuning.DIFF != null ? DB.Tuning.DIFF[meta.diff].name + " · " + DB.Tuning.DIFF[meta.diff].desc : "보통", sub = "다음에 떠나는 길부터", adjust = d => meta.diff = (meta.diff + d + 3) % 3 });
            s.items.Add(new Item { label = "돌아간다", act = () => { meta.Save(); back(); } }); s.back = s.items[s.items.Count - 1].act; Show(s);
        }

        // 사당: what 혼 buys stays for every journey after
        void ShowShrine()
        {
            var s = new Screen { title = "사당", sub = $"혼 {meta.hon}", art = Sheet.Image("hubscene"), note = $"떠난 길 {meta.runs} · 벤 북 {meta.drums} · 가장 멀리 {meta.bestCycle}번째 북 · 한 길에 벤 적 {meta.bestKills}" };
            if (meta.sadang < Meta.SADANG_MAX) { int cost = Meta.SadangCost(meta.sadang); s.items.Add(new Item { label = "향을 올린다", sub = $"처음 숨 +1 (지금 +{meta.sadang}) · 혼 {cost}", enabled = meta.hon >= cost, act = () => { meta.hon -= cost; meta.sadang++; meta.Save(); music.Sfx("lantern"); ShowShrine(); } }); }
            if (!meta.well) s.items.Add(new Item { label = "약수를 긷는다", sub = $"숨을 여섯까지 담는다 · 혼 {Meta.WELL_COST}", enabled = meta.hon >= Meta.WELL_COST, act = () => { meta.hon -= Meta.WELL_COST; meta.well = true; meta.Save(); music.Sfx("lantern"); ShowShrine(); } });
            foreach (var kv in Weapon.ALL) { var w = kv.Value; if (meta.weapons.Contains(w.key)) continue; s.items.Add(new Item { label = w.name, sub = $"{w.han} · 들고 떠날 수 있게 된다 · 혼 {w.cost}", enabled = meta.hon >= w.cost, act = () => { meta.hon -= w.cost; meta.weapons.Add(w.key); meta.Save(); music.Sfx("lantern"); ShowShrine(); } }); }
            s.items.Add(new Item { label = "돌아간다", act = ShowTitle }); s.back = ShowTitle; Show(s);
        }

        // ---------- the hands ----------
        static bool Pad(int b) => Input.GetKey(KeyCode.JoystickButton0 + b);
        static bool PadDown(int b) => Input.GetKeyDown(KeyCode.JoystickButton0 + b);
        void ReadInput()
        {
            float x = 0, y = 0;
            if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) x -= 1;
            if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) x += 1;
            if (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W)) y -= 1;
            if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S)) y += 1;
            float kx = x, ky = y; float jx = Input.GetAxisRaw("Horizontal"), jy = -Input.GetAxisRaw("Vertical"); if (x == 0 && Mathf.Abs(jx) > .3f) x = jx; if (y == 0 && Mathf.Abs(jy) > .3f) y = jy;
            inp.x = x; inp.y = y;
            bool lmb = meta.mouseAim && Input.GetMouseButtonDown(0), rmb = meta.mouseAim && Input.GetMouseButton(1);
            inp.jumpPressed |= Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Z) || PadDown(0);
            inp.jumpHeld = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.Z) || Pad(0);
            inp.hookPressed |= Input.GetKeyDown(KeyCode.L) || Input.GetKeyDown(KeyCode.E) || Input.GetKeyDown(KeyCode.V) || PadDown(4);   // 연
            inp.dashPressed |= Input.GetKeyDown(KeyCode.K) || Input.GetKeyDown(KeyCode.C) || Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.RightShift) || PadDown(1) || PadDown(5) || (meta.mouseAim && Input.GetMouseButtonDown(1));
            inp.dashHeld = Input.GetKey(KeyCode.K) || Input.GetKey(KeyCode.C) || Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift) || Pad(1) || Pad(5) || rmb;
            inp.slashPressed |= Input.GetKeyDown(KeyCode.J) || Input.GetKeyDown(KeyCode.X) || PadDown(2) || lmb;
            inp.drumPressed |= Input.GetKeyDown(KeyCode.Q) || PadDown(3);
            // the mouse aims while one of its buttons is the one in use
            // 무아경 held past a tap: the mouse picks the way (unless a pad stick is pushed); a quick tap still goes the way the keys hold
            bool padStick = Input.GetJoystickNames().Length > 0 && kx == 0 && ky == 0 && (Mathf.Abs(jx) > .3f || Mathf.Abs(jy) > .3f);
            bool focusAim = (meta.mouseAim || booth) && sim != null && sim.P.focus && sim.P.focusT >= DB.Tuning.TAP_T && !padStick;
            inp.hasAim = lmb || rmb || focusAim;
            if (inp.hasAim && sim != null) { var w = cam.ScreenToWorldPoint(Input.mousePosition); inp.aim = new Vector2(w.x * World.T - sim.P.b.cx, -w.y * World.T - sim.P.b.cy); }
        }

        void MenuInput()
        {
            var s = screen; int n = s.items.Count; if (n == 0) return;
            navCd -= Time.unscaledDeltaTime; float jx = Input.GetAxisRaw("Horizontal"), jy = Input.GetAxisRaw("Vertical"); bool stick = navCd <= 0 && (Mathf.Abs(jx) > .6f || Mathf.Abs(jy) > .6f);
            bool keyL = Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A), keyR = Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D), keyU = Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W), keyD = Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S);
            int left = keyL || (stick && jx < -.6f && !keyL && !Input.GetKey(KeyCode.LeftArrow) && !Input.GetKey(KeyCode.A)) ? 1 : 0, right = keyR || (stick && jx > .6f && !Input.GetKey(KeyCode.RightArrow) && !Input.GetKey(KeyCode.D)) ? 1 : 0;
            int up = keyU || (stick && jy > .6f && !Input.GetKey(KeyCode.UpArrow) && !Input.GetKey(KeyCode.W)) ? 1 : 0, down = keyD || (stick && jy < -.6f && !Input.GetKey(KeyCode.DownArrow) && !Input.GetKey(KeyCode.S)) ? 1 : 0;
            if (stick) navCd = .22f;
            int move = s.cards ? right - left : down - up;
            if (move != 0) { int k = s.sel; for (int i = 0; i < n; i++) { k = (k + move + n) % n; if (s.items[k].enabled) break; } if (k != s.sel) { s.sel = k; music.Sfx("jump"); } }
            var it = s.items[s.sel];
            if (!s.cards && it.adjust != null && right - left != 0) { it.adjust(right - left); music.Sfx("clang"); }
            bool ok = Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter) || Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.J) || Input.GetKeyDown(KeyCode.Z) || PadDown(0);
            if (clicked >= 0 && clicked < n) { s.sel = clicked; it = s.items[clicked]; ok = true; }
            clicked = -1;
            if (ok && it.enabled) { music.Sfx("lantern"); if (it.act != null) it.act(); else it.adjust?.Invoke(1); return; }
            if ((Input.GetKeyDown(KeyCode.Escape) || PadDown(1) || PadDown(7)) && s.back != null) s.back();
        }

        void Update()
        {
            fade = Mathf.Min(1, fade + Time.unscaledDeltaTime * 3);
            if (Input.GetKeyDown(KeyCode.F11)) { meta.fullscreen = !meta.fullscreen; ApplySettings(); meta.Save(); }
            if (Input.GetKeyDown(KeyCode.F9) && sim == null && screen != null && screen.title == "천고") { Booth.Toggle(); ShowTitle(); return; }   // staff: booth mode on/off on the title
            if (booth && BoothTick()) return;
            if (booth && naming) { NameInput(); return; }
            if (screen != null) { MenuInput(); if (sim != null && screen != null) return; }   // a menu over the fight holds it still
            if (sim == null || lv == null) return;
            if (screen != null) return;
            if (Input.GetKeyDown(KeyCode.Escape) || PadDown(7)) { ShowPause(); return; }
            ReadInput();
            float rdt = Mathf.Min(Time.unscaledDeltaTime, .05f); stageCardT += rdt;
            music.Tick(); sim.Frame(rdt, inp);
            if (sim.state == "over") { if (booth) BoothOver(); else ShowOver(); return; }
            if (sim.cleared && sim.killCam <= 0) { GateCleared(); return; }
            var p = sim.P; view.Sync(); fight.Sync(); terrain.Sync();

            // camera: the web game shows about 13 tiles across or 11 down, whichever fits; on a wide screen that is the 11 down. It leads a little where you face.
            float aspect = (float)UnityEngine.Screen.width / Mathf.Max(1, UnityEngine.Screen.height);
            cam.orthographicSize = Mathf.Max(11f / 2, 13f / 2 / aspect);
            float halfW = cam.orthographicSize * aspect * World.T, halfH = cam.orthographicSize * World.T;
            // it looks a little ahead of the run and the way he faces, and never shows below the floor of the gate (js/game.js render)
            float tx = p.b.cx + Mathf.Clamp(p.vx * .22f, -110, 110) + p.face * 24, ty = p.b.cy - 24, f = Mathf.Min(1, rdt * 7);
            camX += (tx - camX) * f; camY += (ty - camY) * f;
            float lw = lv.w * World.T, lh = lv.h * World.T, vw = halfW * 2, vh = halfH * 2, maxY = lh - vh / 2 + 8;
            camX = lw <= vw ? lw / 2 : Mathf.Clamp(camX, vw / 2, lw - vw / 2); camY = Mathf.Min(maxY, Mathf.Max(Mathf.Min(maxY, vh / 2 - 96), camY));
            float cx = camX, cy = camY, sh = meta.shake ? sim.shake : 0;
            cam.transform.position = World.ToUnity(cx + (UnityEngine.Random.value - .5f) * sh, cy + (UnityEngine.Random.value - .5f) * sh, -10);   // a blow shakes the paper
            lview.Follow(cam); view.SyncAim(cam);
        }

        // ---------- drawing: the HUD over a fight, and the menus ----------
        // Everything is laid out on a 720-high sheet and scaled to the screen. Headings are brushed (궁서), the rest set in 바탕.
        Font brush, body; GUIStyle st; Texture2D white, paper; float VW;
        static readonly Color INK = new Color(.09f, .086f, .1f), SEAL = new Color(.76f, .09f, .11f), PAPER = new Color(.93f, .9f, .85f), GOLD = new Color(.91f, .72f, .29f);
        void Txt(Rect r, string s, float size, Color c, TextAnchor a = TextAnchor.MiddleCenter, bool brushed = false, bool wrap = false)
        {
            st.font = brushed ? brush : body; st.fontSize = Mathf.RoundToInt(size); st.alignment = a; st.wordWrap = wrap; st.normal.textColor = c; GUI.Label(r, s, st);
        }
        void Shadowed(Rect r, string s, float size, Color c, Color shadow, TextAnchor a = TextAnchor.MiddleCenter, bool brushed = false) { Txt(new Rect(r.x + 1.5f, r.y + 1.5f, r.width, r.height), s, size, shadow, a, brushed); Txt(r, s, size, c, a, brushed); }
        void Fill(Rect r, Color c) { GUI.color = c; GUI.DrawTexture(r, white); GUI.color = Color.white; }
        // the hanji plate, nine-sliced: corners kept, edges and paper stretched (assets/ui-plate, as the web's HUD chips)
        Texture2D plateTex;
        void Plate(Rect r, float a = 1)
        {
            if (plateTex == null) plateTex = Sheet.Image("ui-plate"); if (plateTex == null) { Fill(r, new Color(.9f, .885f, .84f, .85f * a)); return; }
            float tw = plateTex.width, th = plateTex.height, s = 12, b = 6; float[] sx = { 0, s, tw - s, tw }, sy = { 0, s, th - s, th }, dx = { r.x, r.x + b, r.xMax - b, r.xMax }, dy = { r.y, r.y + b, r.yMax - b, r.yMax };
            GUI.color = new Color(1, 1, 1, a);
            for (int i = 0; i < 3; i++) for (int j = 0; j < 3; j++) GUI.DrawTextureWithTexCoords(new Rect(dx[i], dy[j], dx[i + 1] - dx[i], dy[j + 1] - dy[j]), plateTex, new Rect(sx[i] / tw, 1 - sy[j + 1] / th, (sx[i + 1] - sx[i]) / tw, (sy[j + 1] - sy[j]) / th));
            GUI.color = Color.white;
        }
        void Frame(Sheet sh, int i, Rect r, float a = 1) { if (sh == null) return; var f = sh.Frames[i]; GUI.color = new Color(1, 1, 1, a); GUI.DrawTextureWithTexCoords(r, sh.Tex, new Rect((float)f.x / sh.Tex.width, 1 - (float)(f.y + f.h) / sh.Tex.height, (float)f.w / sh.Tex.width, (float)f.h / sh.Tex.height)); GUI.color = Color.white; }

        void OnGUI()
        {
            if (st == null)
            {
                brush = Font.CreateDynamicFontFromOSFont(new[] { "Gungsuh", "궁서", "GungsuhChe", "Batang", "바탕", "Malgun Gothic" }, 48);
                body = Font.CreateDynamicFontFromOSFont(new[] { "Batang", "바탕", "HCR Batang", "Malgun Gothic" }, 24);
                st = new GUIStyle { richText = false, clipping = TextClipping.Overflow }; white = Texture2D.whiteTexture; paper = Sheet.Image("tex-paper");
            }
            float sc = UnityEngine.Screen.height / 720f; VW = UnityEngine.Screen.width / sc; GUI.matrix = Matrix4x4.Scale(new Vector3(sc, sc, 1));
            if (sim != null && lv != null) DrawHud(sc);
            if (screen != null) DrawScreen();
            if (booth) DrawBooth();
            if (fade < 1) Fill(new Rect(0, 0, VW, 720), new Color(.05f, .045f, .06f, (1 - fade) * (sim != null && screen == null ? .9f : .5f)));
        }

        void DrawHud(float sc)
        {
            var p = sim.P; Color ink = DB.Hex(lv.pal.text); bool hush = p.focus || screen != null; if (hush) ink = PAPER;
            // the top row, as the web lays it out: a washed plaque with the gate's name and its 장단, the 숨 as drops of ink, and at the right the dash pip, the time and the pause mark
            var ui = Sheet.Get("ui"); string jd = Music.JANGDAN[DB.Tables.MADANG[Mathf.Clamp(lv.madang, 0, DB.Tables.MADANG.Length - 1)].jd].name; Color plate = hush ? new Color(1, 1, 1, .35f) : new Color(1, 1, 1, .9f);
            st.font = brush; st.fontSize = 15; float nw = st.CalcSize(new GUIContent(StageName)).x; st.font = body; st.fontSize = 11; float jw = st.CalcSize(new GUIContent(jd)).x;
            Plate(new Rect(14, 8, nw + jw + 28, 30), plate.a); Txt(new Rect(24, 8, nw + 4, 30), StageName, 15, INK, TextAnchor.MiddleLeft, true); Txt(new Rect(32 + nw, 10, jw + 4, 30), jd, 11, new Color(INK.r, INK.g, INK.b, .7f), TextAnchor.MiddleLeft);   // the hanji plate (assets/ui-plate), ink on paper whatever the ground
            float bx0 = 14 + nw + jw + 28 + 12; int cap = Mathf.Max(run.BreathCap, run.breath); Frame(ui, 5, new Rect(bx0, 8, cap * 15 + 15, 30), plate.a);
            for (int i = 0; i < cap; i++) { if (ui != null) { GUI.color = hush ? PAPER : Color.white; Frame(ui, i < run.breath ? 3 : 4, new Rect(bx0 + 10 + i * 15, 16, 10, 14), i < run.breath ? 1 : .55f); } }
            GUI.color = Color.white; var dot = Fx.Dot().texture;
            { int tm = Mathf.FloorToInt(run.time / 60); string ts = $"{tm}:{run.time - tm * 60:00.00}"; st.font = body; st.fontSize = 17; float tw = st.CalcSize(new GUIContent(ts)).x; float rx = VW - 12 - 40;
              Frame(ui, 5, new Rect(rx, 8, 40, 30), plate.a); Fill(new Rect(rx + 14, 16, 4, 14), ink); Fill(new Rect(rx + 22, 16, 4, 14), ink);   // the pause mark (Esc)
              rx -= tw + 32; Frame(ui, 5, new Rect(rx, 8, tw + 20, 30), plate.a); Txt(new Rect(rx + 10, 8, tw + 4, 30), ts, 17, ink, TextAnchor.MiddleLeft);
              bool pip = (p.onGround || p.airDash > 0) && p.dashCd <= 0; var jj = new Color(.153f, .275f, .416f); var m0 = GUI.matrix; GUIUtility.RotateAroundPivot(45, new Vector2(rx - 16, 23) * sc);   // the dash, ready or not: a small indigo diamond
              Fill(new Rect(rx - 21, 18, 10, 10), jj); if (!pip) Fill(new Rect(rx - 19, 20, 6, 6), hush ? new Color(.15f, .14f, .13f) : DB.Hex(lv.pal.bg)); GUI.matrix = m0; }
            // 기력 under the 숨: what 무아경 spends
            Plate(new Rect(8, 44, 150, 52), plate.a); ink = INK;   // 기력 · 기세 on their own plate, the two rows in its middle (label 26 + gap 4 + bar 100)
            Txt(new Rect(18, 55, 40, 12), "기력", 11, new Color(ink.r, ink.g, ink.b, .8f), TextAnchor.MiddleLeft);
            { var mech = Sheet.Get("mech"); float ki = Mathf.Clamp01(p.ki); bool low = p.ki < .25f && Mathf.Sin(Time.unscaledTime * 11) > 0;
              if (mech != null) { var mf = mech.Frames[11]; var src = new Rect((float)mf.x / mech.Tex.width, 1 - (float)(mf.y + mf.h) / mech.Tex.height, (float)mf.w / mech.Tex.width, (float)mf.h / mech.Tex.height);
                GUI.color = new Color(1, 1, 1, .2f); GUI.DrawTextureWithTexCoords(new Rect(48, 55, 100, 10), mech.Tex, src); GUI.color = new Color(1, 1, 1, low ? .5f : 1); GUI.DrawTextureWithTexCoords(new Rect(48, 55, 100 * ki, 10), mech.Tex, new Rect(src.x, src.y, src.width * ki, src.height)); GUI.color = Color.white; }   // the painted gauge stroke, revealed as far as 기력 reaches
              else { Fill(new Rect(48, 55, 100, 10), new Color(ink.r, ink.g, ink.b, .2f)); Fill(new Rect(48, 55, 100 * ki, 10), ink); }
              if (p.focus) Fill(new Rect(48, 59, 100 * ki, 2), new Color(.153f, .275f, .416f, .5f)); }
            // 기세: five brush cells, the tier's numeral beside them
            int tier = sim.MomTier; bool tr = run.trance > 0;
            Txt(new Rect(18, 71, 40, 16), tier > 0 ? $"{tier}단" : "기세", tier > 0 ? 13 : 11, tr ? SEAL : new Color(ink.r, ink.g, ink.b, .85f), TextAnchor.MiddleLeft, true);
            for (int i = 0; i < 5; i++) { float fl = Mathf.Clamp01((run.mom - i * 100) / 100); var r = new Rect(48 + i * 20.5f, 75, 18, 8); Fill(r, new Color(ink.r, ink.g, ink.b, .18f)); if (fl > 0) Fill(new Rect(r.x, r.y, r.width * fl, r.height), tr ? (Mathf.FloorToInt(Time.unscaledTime * 12) % 2 == 0 ? SEAL : GOLD) : i >= 3 ? SEAL : ink); }
            if (sim.IsGun)   // 탄 · 열
            {
                Txt(new Rect(18, 88, 40, 16), sim.W.heat ? "열" : "탄", 11, new Color(ink.r, ink.g, ink.b, .8f), TextAnchor.MiddleLeft);
                if (sim.W.heat) { Fill(new Rect(48, 92, 104, 8), new Color(ink.r, ink.g, ink.b, .2f)); Fill(new Rect(48, 92, 104 * Mathf.Clamp01(p.heat / 100), 8), p.overheat > 0 ? SEAL : p.heat > 70 ? GOLD : ink); }
                else for (int i = 0; i < sim.GunMag; i++) { Frame(ui, i < p.ammo ? 3 : 4, new Rect(48 + i * 14, 88, 10, 14), i < p.ammo ? 1 : .55f); }
                GUI.color = Color.white;
            }
            // 결계: how many of the gate's guards are cut, and how many open the way out
            if (sim.CutN > 0 && !lv.hasDrum) { string cs = sim.ExitOpen ? $"벤 적 {sim.CutK} / {sim.CutN} · 결계 열림" : $"벤 적 {sim.CutK} / {sim.CutN} · 결계 {sim.CutNeed}"; Plate(new Rect(VW - 232, 64, 220, 26), plate.a); Txt(new Rect(VW - 226, 64, 208, 26), cs, 13, sim.ExitOpen ? INK : SEAL, TextAnchor.MiddleCenter); }
            // 연속 처치
            if (p.chain >= 1) { float k = 1 + p.chainPop * 1.6f; Txt(new Rect(VW - 114, 64, 120, 44), "一二三四五"[Mathf.Min(5, p.chain) - 1].ToString(), 34 * k, ink, TextAnchor.MiddleCenter, true); Txt(new Rect(VW - 114, 102, 120, 18), $"{p.chain} 연속", 12, p.chain >= 5 ? SEAL : ink); }

            // the 장단 board: drums on a lacquered board at the foot of the screen. They fill with 천고 기운 as the fight is won well and nod to the music; all five lit, the great drum calls for 천고난무
            var vis = Sheet.Get("vis"); var props2 = Sheet.Get("props2"); float bl = music.BeatLen, ph = ((music.Pos / bl) % 1 + 1) % 1, beatK = Mathf.Max(0, .2f - Mathf.Min(ph, 1 - ph)) * 1.2f; bool full = run.qi >= 100;
            const int ahead = 4; float gap = Mathf.Clamp((VW - 40 - 104) / ahead, 44, 64), mx = VW / 2 - 96, by0 = 720 - 30;
            if (props2 != null)   // end caps keep their proportions, only the plain middle stretches
            {
                var bf = props2.Frames[2]; float bw = gap * ahead + 104, bh = 62, capS = bf.w * .16f, capW = capS * bh / bf.h, bx = mx - 52; var tex = props2.Tex;
                Rect Src(float x, float w) => new Rect((bf.x + x) / tex.width, 1 - (float)(bf.y + bf.h) / tex.height, w / tex.width, (float)bf.h / tex.height);
                GUI.DrawTextureWithTexCoords(new Rect(bx, by0 - 30, capW, bh), tex, Src(0, capS)); GUI.DrawTextureWithTexCoords(new Rect(bx + capW - .5f, by0 - 30, bw - capW * 2 + 1, bh), tex, Src(capS, bf.w - capS * 2)); GUI.DrawTextureWithTexCoords(new Rect(bx + bw - capW, by0 - 30, capW, bh), tex, Src(bf.w - capS, capS));
            }
            for (int i = 0; i <= ahead; i++)
            {
                bool big = i == ahead; float lit = Mathf.Clamp01((run.qi - i * 20) / 20), sz = (big ? 42 : 30) * (1 + (lit >= 1 ? beatK : 0) + (full && big ? .12f + beatK : 0)), x = mx + i * gap;
                Frame(vis, big ? 4 : 3, new Rect(x - sz / 2, by0 - sz / 2, sz, sz), .22f + .78f * lit);
            }
            if (full) Shadowed(new Rect(VW / 2 - 200, 720 - 92, 400, 22), "Q · 천고난무", 15, GOLD, new Color(0, 0, 0, .6f), TextAnchor.MiddleCenter, true);

            // the guardian: its name and what is left of it
            var boss = sim.TheBoss;
            if (boss != null && boss.awake && boss.alive)
            {
                float w = Mathf.Min(520, VW * .5f), x = VW / 2 - w / 2; Txt(new Rect(x, 22, w, 26), $"{boss.B.name}  {boss.B.han}", 20, boss.raged ? SEAL : ink, TextAnchor.MiddleCenter, true);
                Fill(new Rect(x, 52, w, 9), new Color(ink.r, ink.g, ink.b, .22f)); Fill(new Rect(x, 52, w * Mathf.Clamp01((float)boss.hp / boss.maxHp), 9), boss.raged ? SEAL : ink); Fill(new Rect(x + w / 2 - 1, 49, 2, 15), new Color(ink.r, ink.g, ink.b, .5f));
            }

            // small floating words and the stamp's character, pinned to the world
            foreach (var q in fx.words)
            {
                float life = q.stamp ? 1.1f : .9f; var sp = cam.WorldToScreenPoint(World.ToUnity(q.x, q.y - (q.stamp ? 0 : q.t * 30)));
                float px = UnityEngine.Screen.height / (cam.orthographicSize * 2 * World.T) / sc; var c = q.col; c.a = q.stamp ? Mathf.Clamp01((life - q.t) / .4f) : Mathf.Max(0, 1 - q.t / life);
                Txt(new Rect(sp.x / sc - 150, (UnityEngine.Screen.height - sp.y) / sc - 30, 300, 60), q.txt, (q.stamp ? 26 : 15) * px, c, TextAnchor.MiddleCenter, true);
            }
            if (sim.toastT > 0) { float a = Mathf.Clamp01(sim.toastT * 2); Fill(new Rect(VW / 2 - 260, 118, 520, 34), new Color(.09f, .086f, .1f, .72f * a)); Txt(new Rect(VW / 2 - 260, 118, 520, 34), sim.toast, 16, new Color(PAPER.r, PAPER.g, PAPER.b, a)); }

            if (sim.flashDim > 0) Fill(new Rect(0, 0, VW, 720), new Color(.08f, .04f, .05f, Mathf.Min(.5f, sim.flashDim * 3)));   // the screen draws a breath as a glint opens
            if (p.focus) Fill(new Rect(0, 0, VW, 720), new Color(.153f, .275f, .416f, .14f)); else if (sim.killCam > 0) Fill(new Rect(0, 0, VW, 720), new Color(.47f, .04f, .06f, .12f * Mathf.Min(1, sim.killCam * 3)));   // an indigo hush over 무아경, a faint red breath over the held moment
            if (sim.flash > 0) { var fc = new Color(.76f, .09f, .11f, Mathf.Min(1, sim.flash * 3)); Fill(new Rect(0, 0, VW, 5), fc); Fill(new Rect(0, 715, VW, 5), fc); Fill(new Rect(0, 0, 5, 720), fc); Fill(new Rect(VW - 5, 0, 5, 720), fc); }   // a blow rings the screen in vermilion
            if (tier >= 4 || tr) { float a = tr ? .22f : .1f; Fill(new Rect(0, 0, VW, 14), new Color(SEAL.r, SEAL.g, SEAL.b, a)); Fill(new Rect(0, 706, VW, 14), new Color(SEAL.r, SEAL.g, SEAL.b, a)); }   // 四 and up: red ink at the edges

            if (sim.state == "dead") { float a = Mathf.Max(0, 1 - sim.deathT / .75f); Fill(new Rect(0, 0, VW, 720), new Color(.08f, .07f, .08f, .55f * a)); Txt(new Rect(0, 300, VW, 90), "절명", 72, new Color(.76f, .09f, .11f, Mathf.Min(1, a * 2)), TextAnchor.MiddleCenter, true); Txt(new Rect(0, 628, VW, 24), run.breath > 0 ? $"남은 숨 {run.breath}" : "숨이 다했다", 13, new Color(.95f, .93f, .9f, Mathf.Min(1, a * 2))); }
            // a name brushed across the screen: the stage as you walk in, a guardian's entrance, an 오의
            if (stageCardT < 2.2f && screen == null) Banner(StageName, run.Arena ? Boss.For(run.seed, run.cycle).line : $"{run.cycle + 1}번째 바퀴", stageCardT, 2.2f, 200);
            if (sim.bossIntro > 0 && sim.introBoss != null) { Fill(new Rect(0, 0, VW, 720), new Color(.05f, .045f, .06f, .45f)); Banner($"{sim.introBoss.B.name}  {sim.introBoss.B.han}", sim.introBoss.B.line, 1.7f - sim.bossIntro, 1.7f, 300); }
            if (fx.bannerT < 1.3f && fx.banner != null) Banner(fx.banner, fx.bannerSub, fx.bannerT, 1.3f, 220);
        }
        void Banner(string name, string sub, float t, float life, float y)
        {
            float a = Mathf.Clamp01(t * 6) * Mathf.Clamp01((life - t) * 3); Fill(new Rect(0, y - 46, VW, 96), new Color(.055f, .04f, .047f, .6f * a));
            Txt(new Rect((1 - Mathf.Min(1, t * 4)) * 40, y - 40, VW, 60), name, 46, new Color(PAPER.r, PAPER.g, PAPER.b, a), TextAnchor.MiddleCenter, true);
            if (!string.IsNullOrEmpty(sub)) Txt(new Rect(0, y + 18, VW, 24), sub, 15, new Color(.9f, .35f, .33f, a));
        }

        void DrawScreen()
        {
            var s = screen; var ev = Event.current; bool moved = (ev.mousePosition - lastMouse).sqrMagnitude > 4; if (ev.type == EventType.Repaint) lastMouse = ev.mousePosition;
            // the ground: a painting if the screen has one, else paper; a wash of ink when it lies over the fight
            if (s.dark) Fill(new Rect(0, 0, VW, 720), new Color(.05f, .045f, .06f, .78f));
            else
            {
                Fill(new Rect(0, 0, VW, 720), new Color(.9f, .885f, .84f)); if (paper != null) { GUI.color = new Color(1, 1, 1, .8f); GUI.DrawTextureWithTexCoords(new Rect(0, 0, VW, 720), paper, new Rect(0, 0, VW / 512f, 720 / 512f)); GUI.color = Color.white; }
                if (s.art != null) { float k = Mathf.Max(VW / s.art.width, 720f / s.art.height), w = s.art.width * k, h = s.art.height * k; GUI.color = new Color(1, 1, 1, s.cards ? .25f : 1); GUI.DrawTexture(new Rect((VW - w) / 2, (720 - h) / 2, w, h), s.art); GUI.color = Color.white; }
            }
            Color ink = s.dark ? PAPER : INK; bool title = s.title == "천고";
            if (s.cards)
            {
                Txt(new Rect(0, 56, VW, 56), s.title, 40, ink, TextAnchor.MiddleCenter, true); if (!string.IsNullOrEmpty(s.sub)) Txt(new Rect(0, 112, VW, 26), s.sub, 16, new Color(ink.r, ink.g, ink.b, .8f));
                int n = s.items.Count; float cw = Mathf.Min(270, (VW - 80) / n - 20), gap = 20, total = n * cw + (n - 1) * gap, x0 = (VW - total) / 2;
                for (int i = 0; i < n; i++)
                {
                    var it = s.items[i]; bool sel = i == s.sel; var r = new Rect(x0 + i * (cw + gap), 180 - (sel ? 10 : 0), cw, 380);
                    if (ev.type == EventType.Repaint && moved && r.Contains(ev.mousePosition) && it.enabled) s.sel = i;
                    if (ev.type == EventType.MouseDown && ev.button == 0 && r.Contains(ev.mousePosition) && it.enabled) { clicked = i; ev.Use(); }
                    Fill(new Rect(r.x + 5, r.y + 6, r.width, r.height), new Color(0, 0, 0, .18f)); Fill(r, sel ? new Color(.96f, .94f, .89f) : new Color(.88f, .86f, .8f, it.enabled ? 1 : .55f));
                    Color edge = sel ? SEAL : new Color(.09f, .086f, .1f, .55f); float t = sel ? 3 : 1.5f; Fill(new Rect(r.x, r.y, r.width, t), edge); Fill(new Rect(r.x, r.yMax - t, r.width, t), edge); Fill(new Rect(r.x, r.y, t, r.height), edge); Fill(new Rect(r.xMax - t, r.y, t, r.height), edge);
                    Color c = it.enabled ? INK : new Color(.09f, .086f, .1f, .4f);
                    float dy = 0; if (it.icon >= 0 && Icons.Get(it.icon, out var ish, out int ifr)) { var f = ish.Frames[ifr]; float ih = 64, iw = ih * f.w / f.h; Frame(ish, ifr, new Rect(r.x + r.width / 2 - iw / 2, r.y + 18, iw, ih), it.enabled ? 1 : .45f); dy = 64; }   // the 비급's painted icon, as on the web's cards
                    Txt(new Rect(r.x, r.y + 34 + dy, r.width, 54), it.label, it.label.Length > 5 ? 30 : 38, c, TextAnchor.MiddleCenter, true);
                    if (!string.IsNullOrEmpty(it.tag)) Txt(new Rect(r.x, r.y + 92 + dy, r.width, 22), it.tag, 13, it.enabled ? SEAL : c);
                    Fill(new Rect(r.x + 40, r.y + 126 + dy, r.width - 80, 1), new Color(.09f, .086f, .1f, .3f));
                    if (!string.IsNullOrEmpty(it.sub)) Txt(new Rect(r.x + 22, r.y + 140 + dy, r.width - 44, 220 - dy), it.sub, 15, c, TextAnchor.UpperCenter, false, true);
                }
            }
            else
            {
                float lx = title ? Mathf.Max(60, VW * .08f) : VW / 2 - 230, lw = 460, y = title ? 300 : 250;
                if (title)
                {
                    Shadowed(new Rect(lx - 8, 70, 600, 170), s.title, 150, INK, new Color(.93f, .9f, .85f, .7f), TextAnchor.MiddleLeft, true);
                    Txt(new Rect(lx, 232, 600, 26), s.sub, 17, SEAL, TextAnchor.MiddleLeft, true);
                    if (s.items.Count > 0) { Fill(new Rect(lx - 26, y - 20, lw + 40, s.items.Count * 52 + 34), new Color(.93f, .9f, .85f, .82f)); }
                }
                else { Txt(new Rect(0, 96, VW, 70), s.title, 54, ink, TextAnchor.MiddleCenter, true); if (!string.IsNullOrEmpty(s.sub)) Txt(new Rect(0, 172, VW, 26), s.sub, 17, new Color(ink.r, ink.g, ink.b, .8f)); if (s.items.Count > 0) { if (s.art != null && !s.dark) Fill(new Rect(lx - 26, y - 20, lw + 52, s.items.Count * 52 + 34), new Color(.93f, .9f, .85f, .85f)); } }
                Color li = title || (s.art != null && !s.dark) ? INK : ink;
                for (int i = 0; i < s.items.Count; i++)
                {
                    var it = s.items[i]; bool sel = i == s.sel; var r = new Rect(lx, y + i * 52, lw, 46);
                    if (ev.type == EventType.Repaint && moved && r.Contains(ev.mousePosition) && it.enabled) s.sel = i;
                    if (ev.type == EventType.MouseDown && ev.button == 0 && r.Contains(ev.mousePosition) && it.enabled) { clicked = i; ev.Use(); }
                    if (sel) { Fill(new Rect(r.x - 14, r.y, r.width + 14, r.height), new Color(.09f, .086f, .1f, s.dark ? .0f : .92f)); if (s.dark) Fill(new Rect(r.x - 14, r.y, r.width + 14, r.height), new Color(.93f, .9f, .85f, .14f)); Fill(new Rect(r.x - 14, r.y, 5, r.height), SEAL); }
                    Color c = !it.enabled ? new Color(li.r, li.g, li.b, .35f) : sel ? PAPER : li;
                    Txt(new Rect(r.x + 6, r.y, 240, r.height), it.label, 24, c, TextAnchor.MiddleLeft, true);
                    string right = it.value != null ? "‹ " + it.value() + " ›" : it.sub; if (!string.IsNullOrEmpty(right)) Txt(new Rect(r.x + 150, r.y, lw - 160, r.height), right, 13, new Color(c.r, c.g, c.b, it.value != null ? 1 : .75f), TextAnchor.MiddleRight);
                }
                var cur = s.items.Count > 0 ? s.items[Mathf.Clamp(s.sel, 0, s.items.Count - 1)] : null; if (cur != null && cur.value != null && !string.IsNullOrEmpty(cur.sub)) Txt(new Rect(lx, y + s.items.Count * 52 + 4, lw, 22), cur.sub, 13, new Color(li.r, li.g, li.b, .7f), TextAnchor.MiddleLeft);
            }
            if (!string.IsNullOrEmpty(s.note)) { bool many = s.note.Contains("\n"); var r = many ? new Rect(VW / 2 - 420, 250 + s.items.Count * 52 + 30, 840, 130) : new Rect(0, 660, VW, 26); if (title) { Fill(new Rect(0, 656, VW, 34), new Color(.93f, .9f, .85f, .7f)); } Txt(r, s.note, many ? 15 : 13, title ? INK : new Color(ink.r, ink.g, ink.b, .75f), many ? TextAnchor.UpperCenter : TextAnchor.MiddleCenter); }
        }
    }
}
