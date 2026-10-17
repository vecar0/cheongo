// 부스판: a club-booth build where a passer-by plays one short journey (~5 minutes) and leaves a name on today's board.
// Three 관문, each a different 마당, then one guardian at 천고대. A 비급 after each of the first two gates; before 천고대 the
// player picks one of the sword's three 오의, so everyone sees one. One second chance (the gate starts over with three 숨),
// a seven-minute limit, and an idle screen that goes back to the title on its own so the next person finds it ready.
// Turned on with the command-line flag -booth, or F9 on the title (kept between launches). See unity/BOOTH.md.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cheongo
{
    public static class Booth
    {
        public static bool On;
        public const int GATES = 3;            // 관문 before 천고대
        public const float LIMIT = 420;        // seconds for the whole journey
        public const float IDLE_MENU = 45, IDLE_PLAY = 60;   // no hands on the controls this long → back to the title
        public const int START_BREATH = 5, REVIVE_BREATH = 3, DIFF = 0;   // 수월
        public static void Init()
        {
            On = PlayerPrefs.GetInt("cheongo.booth", 0) == 1;
            foreach (var a in Environment.GetCommandLineArgs()) if (a == "-booth") On = true;
        }
        public static void Toggle() { On = !On; PlayerPrefs.SetInt("cheongo.booth", On ? 1 : 0); PlayerPrefs.Save(); }
    }

    [Serializable] public class BoothEntry { public string n, d; public int s; public string g; public float t; public bool won; }
    [Serializable] class BoothBoard { public List<BoothEntry> list = new List<BoothEntry>(); }

    public partial class GameRoot
    {
        bool booth => Booth.On;
        float boothT0, lastInputT; Vector3 lastMousePos; bool revived, boothWon; string boothEnd;
        bool naming; readonly char[] initials = { 'A', 'A', 'A' }; int nameSlot; BoothEntry lastEntry; float boardT;
        const string LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        // ---------- the board ----------
        static string Today => DateTime.Now.ToString("yyyy-MM-dd");
        static BoothBoard LoadBoard() { try { var b = JsonUtility.FromJson<BoothBoard>(PlayerPrefs.GetString("cheongo.boothBoard", "")); if (b != null && b.list != null) return b; } catch { } return new BoothBoard(); }
        static void SaveBoard(BoothBoard b) { PlayerPrefs.SetString("cheongo.boothBoard", JsonUtility.ToJson(b)); PlayerPrefs.Save(); }
        static List<BoothEntry> TodayTop(int n) { var l = LoadBoard().list.FindAll(e => e.d == Today); l.Sort((a, b) => b.s.CompareTo(a.s)); return l.GetRange(0, Mathf.Min(n, l.Count)); }

        // ---------- the title ----------
        void ShowBoothTitle()
        {
            ClearWorld(); music.StopSong(); cam.backgroundColor = DB.Hex("#e6e2d7"); sim = null; naming = false; boardT = 0; boothEnd = null; lastInputT = Time.unscaledTime;
            var top = TodayTop(3); string board = top.Count == 0 ? "오늘의 첫 이름이 되어 보세요" : "오늘의 순위  " + string.Join("   ", top.ConvertAll(e => $"{top.IndexOf(e) + 1}. {e.n} {e.s}"));
            var s = new Screen { title = "천고", sub = "天鼓 · 5분 체험 — 관문 셋을 넘고 우두머리를 베라", art = Sheet.Image("title"), note = board };
            s.items.Add(new Item { label = "시작하기", sub = "아무 버튼이나 누르면 시작", act = BoothStart });
            s.items.Add(new Item { label = "조작 보기", sub = "키보드 · 게임패드", act = BoothKeys });
            s.items.Add(new Item { label = "오늘의 순위", sub = top.Count > 0 ? $"1위 {top[0].n} · {top[0].s}점" : "아직 없음", act = () => ShowBoothBoard(null) });
            Show(s);
        }
        void BoothKeys()
        {
            var s = new Screen { title = "조작", sub = "게임패드를 권합니다", note = "이동 ←→ / 왼쪽 스틱  ·  점프 Space / A  ·  베기 J / X\n대시 K / B — 누르고 있으면 무아경(시간이 느려지고 겨눈다), 놓으면 일섬\n적의 원이 점으로 닫히는 순간 베면 간파 — 무엇이든 한 번에 쓰러진다\n북이 다 차면 천고난무 Q / Y" };
            s.items.Add(new Item { label = "시작하기", act = BoothStart }); s.items.Add(new Item { label = "돌아가기", act = ShowBoothTitle }); s.back = ShowBoothTitle; Show(s);
        }

        // ---------- the journey ----------
        void BoothStart()
        {
            run = Run.Fresh(Booth.DIFF, "hwando"); run.breath = Booth.START_BREATH; earned = 0; meta.runs++;
            revived = false; boothWon = false; boothEnd = null; boothT0 = Time.unscaledTime; lastInputT = Time.unscaledTime;
            LoadGate();
        }
        // after a gate: a 비급 after the first ones, one of the three 오의 before 천고대; the guardian cut ends the journey
        bool BoothGateCleared()
        {
            if (run.Arena) { music.Sfx("strike"); boothWon = true; BoothResult("천고를 베었다"); return true; }
            music.Sfx("strike"); run.m++; run.node = "gate"; if (run.breath < run.BreathCap) run.breath++;
            if (run.m >= Booth.GATES) { run.m = Run.LAST_M; ShowBoothOugi(); return true; }
            ShowChoice($"관문을 넘었다 · {run.m} / {Booth.GATES}", "비급 하나를 고른다 · 숨 하나를 되찾았다");
            return true;
        }
        void ShowBoothOugi()
        {
            music.StopSong(); ClearWorld(); sim = null;
            var t = Content.Tree(run.weapon); var s = new Screen { title = "오의를 깨친다", sub = "천고대 앞 — 북이 다 차면 천고난무가 이 오의로 펼쳐진다", cards = true, note = "← → 고르기 · Enter" };
            if (t != null) foreach (var b in t.br)
                {
                    if (b.nodes == null || b.nodes.Length < 3) continue; var og = b.nodes[2]; var br = b;
                    s.items.Add(new Item { label = og.name, tag = $"{og.han} · {b.name} 갈래", sub = og.desc + "\n\n" + b.nodes[0].name + " · " + b.nodes[1].name + "도 함께 익힌다",
                        act = () => { for (int i = 0; i < 3; i++) run.Train(br.nodes[i].id); music.Sfx("lantern"); run.node = "gate"; LoadGate(); } });
                }
            if (s.items.Count == 0) { LoadGate(); return; }
            Show(s);
        }
        void BoothOver()
        {
            if (!revived)   // one second chance: this gate again, three 숨
            {
                revived = true; run.breath = Booth.REVIVE_BREATH; LoadGate(); sim.Toast("다시 한 번 — 숨 셋으로 이 관문을 처음부터"); return;
            }
            BoothResult("숨이 다했다");
        }
        // called every frame before anything else: the time limit and the idle return
        bool BoothTick()
        {
            if (Input.anyKey || Mathf.Abs(Input.GetAxisRaw("Horizontal")) > .3f || Mathf.Abs(Input.GetAxisRaw("Vertical")) > .3f || (Input.mousePosition - lastMousePos).sqrMagnitude > 4) lastInputT = Time.unscaledTime;
            lastMousePos = Input.mousePosition;
            bool title = screen != null && screen.title == "천고" && sim == null;
            if (title) { if (screen.sel == 0 && Input.anyKeyDown && !Input.GetMouseButtonDown(0) && !IsMenuKey()) { BoothStart(); return true; } return false; }   // on 시작하기, any button starts
            float idle = Time.unscaledTime - lastInputT;
            if (idle > (sim != null && screen == null || naming ? Booth.IDLE_PLAY : Booth.IDLE_MENU)) { ShowBoothTitle(); return true; }   // walked away (even mid-name): ready for the next person
            if (sim != null && screen == null && boothEnd == null && Time.unscaledTime - boothT0 > Booth.LIMIT) { BoothResult("시간이 다 됐다"); return true; }
            if (boardT > 0 && screen != null && !naming) { boardT -= Time.unscaledDeltaTime; if (boardT <= 0) { ShowBoothTitle(); return true; } }
            return false;
        }
        static bool IsMenuKey() => Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.F9) || Input.GetKeyDown(KeyCode.F11) || Input.GetKeyDown(KeyCode.Escape);

        // ---------- the end: a score, a grade, three letters ----------
        int BoothScore() => run.kills * 10 + run.kanpa * 25 + run.perfectN * 40 + (run.m >= Run.LAST_M ? 300 : run.m * 120) + (boothWon ? 1000 + Mathf.Max(0, Mathf.RoundToInt((Booth.LIMIT - run.time) * 3)) : 0);
        static string Grade(int s) => s >= 2600 ? "甲" : s >= 1700 ? "乙" : s >= 900 ? "丙" : "丁";
        void BoothResult(string why)
        {
            boothEnd = why; if (sim != null) { run.kills = Mathf.Max(run.kills, sim.kills); }
            music.StopSong(); ClearWorld(); sim = null;
            int sc = BoothScore(); int tm = Mathf.FloorToInt(run.time / 60);
            var s = new Screen { title = why, sub = $"점수 {sc} · 등급 {Grade(sc)}", dark = !boothWon, art = boothWon ? Sheet.Image("title") : null,
                note = $"벤 적 {run.kills} · 간파 {run.kanpa} (완벽 {run.perfectN}) · 넘은 관문 {Mathf.Min(run.m, Booth.GATES)} / {Booth.GATES}{(boothWon ? " · 우두머리를 베었다" : "")} · 걸린 시간 {tm}:{run.time - tm * 60:00}" };
            Show(s); naming = true; nameSlot = 0; initials[0] = initials[1] = initials[2] = 'A'; lastInputT = Time.unscaledTime;
        }
        void NameInput()
        {
            navCd -= Time.unscaledDeltaTime; float jx = Input.GetAxisRaw("Horizontal"), jy = Input.GetAxisRaw("Vertical"); bool stick = navCd <= 0 && (Mathf.Abs(jx) > .6f || Mathf.Abs(jy) > .6f);
            int up = Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W) || (stick && jy > .6f) ? 1 : 0, down = Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S) || (stick && jy < -.6f) ? 1 : 0;
            int left = Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A) || (stick && jx < -.6f) ? 1 : 0, right = Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D) || (stick && jx > .6f) ? 1 : 0;
            if (stick) navCd = .2f;
            if (up + down != 0) { int i = LETTERS.IndexOf(initials[nameSlot]); initials[nameSlot] = LETTERS[(i + down - up + LETTERS.Length) % LETTERS.Length]; music.Sfx("jump"); }
            if (left + right != 0) { nameSlot = Mathf.Clamp(nameSlot + right - left, 0, 2); music.Sfx("clang"); }
            // a typed letter goes straight in
            foreach (char c in Input.inputString) { char u = char.ToUpperInvariant(c); if (LETTERS.IndexOf(u) >= 0) { initials[nameSlot] = u; nameSlot = Mathf.Min(2, nameSlot + 1); music.Sfx("jump"); } }
            bool ok = Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter) || Input.GetKeyDown(KeyCode.J) || PadDown(0);
            if (ok) { if (nameSlot < 2 && !Input.GetKeyDown(KeyCode.Return) && !Input.GetKeyDown(KeyCode.KeypadEnter)) { nameSlot++; music.Sfx("clang"); return; } SaveName(); }
            if (Input.GetKeyDown(KeyCode.Escape) || PadDown(1)) { naming = false; ShowBoothBoard(null); }
        }
        void SaveName()
        {
            int sc = BoothScore(); var b = LoadBoard(); lastEntry = new BoothEntry { n = new string(initials), d = Today, s = sc, g = Grade(sc), t = run.time, won = boothWon }; b.list.Add(lastEntry);
            if (b.list.Count > 500) { b.list.Sort((x, y) => y.s.CompareTo(x.s)); b.list.RemoveRange(500, b.list.Count - 500); }
            SaveBoard(b); naming = false; music.Sfx("lantern"); ShowBoothBoard(lastEntry);
        }
        void ShowBoothBoard(BoothEntry mine)
        {
            ClearWorld(); sim = null; var top = TodayTop(7);
            var s = new Screen { title = "오늘의 순위", sub = Today, dark = false, note = "다음 분을 위해 잠시 뒤 처음 화면으로 돌아갑니다" };
            for (int i = 0; i < top.Count; i++) { var e = top[i]; bool me = mine != null && ReferenceEquals(e, mine) || (mine != null && e.n == mine.n && e.s == mine.s && e.t == mine.t);
                int tm = Mathf.FloorToInt(e.t / 60); s.items.Add(new Item { label = $"{i + 1}. {e.n}{(me ? "  ← 나" : "")}", sub = $"{e.s}점 · {e.g}{(e.won ? " · 북을 벴다" : "")} · {tm}:{e.t - tm * 60:00}", enabled = false }); }
            if (top.Count == 0) s.items.Add(new Item { label = "아직 아무도 없다", enabled = false });
            s.items.Add(new Item { label = "처음으로", act = ShowBoothTitle }); s.sel = s.items.Count - 1; s.back = ShowBoothTitle; Show(s); boardT = 20;
        }

        // ---------- drawn over everything in booth mode ----------
        void DrawBooth()
        {
            if (sim != null && lv != null && screen == null)
            {
                float left = Mathf.Max(0, Booth.LIMIT - (Time.unscaledTime - boothT0)); int lm = Mathf.FloorToInt(left / 60);
                Txt(new Rect(VW - 232, 42, 220, 22), $"남은 시간 {lm}:{left - lm * 60:00}", 14, left < 60 ? SEAL : new Color(INK.r, INK.g, INK.b, .8f), TextAnchor.MiddleRight);
                if (run.m == 0 && stageCardT < 28 && stageCardT > 2.2f)   // the first gate: how the hands go, laid over the ground until the player has it
                {
                    float a = Mathf.Clamp01((28 - stageCardT) / 2); var r = new Rect(VW / 2 - 330, 548, 660, 66);
                    Fill(r, new Color(.93f, .9f, .85f, .88f * a)); Fill(new Rect(r.x, r.y, 4, r.height), new Color(SEAL.r, SEAL.g, SEAL.b, a));
                    Txt(new Rect(r.x + 16, r.y + 6, r.width - 24, 26), "이동 ←→ · 점프 Space/A · 베기 J/X · 대시 K/B (누르고 있으면 무아경, 놓으면 일섬)", 15, new Color(INK.r, INK.g, INK.b, a), TextAnchor.MiddleLeft);
                    Txt(new Rect(r.x + 16, r.y + 34, r.width - 24, 26), "적의 원이 점으로 닫히는 순간 베면 간파 — 무엇이든 한 번에 쓰러진다", 15, new Color(SEAL.r, SEAL.g, SEAL.b, a), TextAnchor.MiddleLeft);
                }
            }
            if (naming)
            {
                var r = new Rect(VW / 2 - 260, 330, 520, 230); Fill(r, new Color(.93f, .9f, .85f, .96f)); Fill(new Rect(r.x, r.y, r.width, 3), SEAL);
                Txt(new Rect(r.x, r.y + 14, r.width, 30), "이름 세 글자를 남긴다", 22, INK, TextAnchor.MiddleCenter, true);
                for (int i = 0; i < 3; i++)
                {
                    var c = new Rect(VW / 2 - 135 + i * 95, r.y + 62, 80, 96); bool on = i == nameSlot;
                    Fill(c, on ? new Color(.09f, .086f, .1f, .92f) : new Color(.09f, .086f, .1f, .12f));
                    Txt(c, initials[i].ToString(), 58, on ? PAPER : INK, TextAnchor.MiddleCenter, true);
                    if (on) { Txt(new Rect(c.x, c.y - 20, c.width, 18), "▲", 13, SEAL); Txt(new Rect(c.x, c.yMax + 2, c.width, 18), "▼", 13, SEAL); }
                }
                Txt(new Rect(r.x, r.yMax - 34, r.width, 24), "↑↓ 글자 · ←→ 칸 · Enter 남기기 · Esc 건너뛰기", 13, new Color(INK.r, INK.g, INK.b, .75f));
            }
        }
    }
}
