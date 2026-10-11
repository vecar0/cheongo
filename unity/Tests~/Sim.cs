using System; using UnityEngine; using Cheongo;
class Sim {
  static Level Lv(string[] rows) { return Level.FromRows(rows, 0); }
  static void Main() {
    var t = new Tuning();
      t.CLIMBV = 270f;
      t.CLIMB_T = 0.5f;
      t.GRAV = 1900f;
      t.JUMPV = 640f;
      t.MAXV = 300f;
      t.DASHV = 1000f;
    var g = new GameTables { T = 32, PAL = new[] { new Palette { bg = "#e6e2d7", tile = "#1c1b1f" } } };
    DB.Use(t, g, new Chunk[0]);
    var flat = new string[16]; for (int y = 0; y < 16; y++) flat[y] = y >= 12 ? new string('#', 40) : y == 11 ? "  P" + new string(' ', 37) : new string(' ', 40);
    // 1: run right one second
    var lv = Lv(flat); var p = new Player(lv, lv.start.x, lv.start.y); var i = new PlayerInput();
    for (int f = 0; f < 10; f++) p.Step(1/60f, i);
    float x0 = p.b.x; i.x = 1; for (int f = 0; f < 60; f++) p.Step(1/60f, i);
    Console.WriteLine($"run 1s: {p.b.x - x0:F1}px  vx={p.vx:F0} onGround={p.onGround}");
    // 2: full jump apex
    i.x = 0; float y0 = p.b.y, top = y0; i.jumpPressed = true; i.jumpHeld = true;
    for (int f = 0; f < 90; f++) { p.Step(1/60f, i); i.jumpPressed = false; top = Math.Min(top, p.b.y); }
    Console.WriteLine($"full jump height: {y0 - top:F1}px (≈{(y0-top)/32:F2} tiles) landed={p.onGround}");
    // 3: tap jump (release at once)
    y0 = p.b.y; top = y0; i.jumpPressed = true; i.jumpHeld = false;
    for (int f = 0; f < 90; f++) { p.Step(1/60f, i); i.jumpPressed = false; top = Math.Min(top, p.b.y); }
    Console.WriteLine($"short hop height: {y0 - top:F1}px");
    // 4: ground dash
    x0 = p.b.x; i.dashPressed = true; for (int f = 0; f < 30; f++) { p.Step(1/60f, i); i.dashPressed = false; }
    Console.WriteLine($"ground dash: {p.b.x - x0:F1}px");
    // 5: wall: a tall wall at x=20; jump into it holding right, then wall-kick
    var wallMap = new string[16]; for (int y = 0; y < 16; y++) wallMap[y] = y >= 12 ? new string('#', 40) : (y == 11 ? "  P" + new string(' ', 17) : new string(' ', 20)) + "##" + new string(' ', 18);
    lv = Lv(wallMap); p = new Player(lv, lv.start.x, lv.start.y); i = new PlayerInput(); i.x = 1;
    for (int f = 0; f < 130; f++) p.Step(1/60f, i);
    i.jumpPressed = true; i.jumpHeld = true; float hi = p.b.y; bool walled = false;
    for (int f = 0; f < 50; f++) { p.Step(1/60f, i); i.jumpPressed = false; hi = Math.Min(hi, p.b.y); walled |= p.wall != 0; }
    Console.WriteLine($"wall: touched={walled} climbed to {(lv.start.y - hi)/32:F2} tiles, wall={p.wall}");
    float bx = p.b.x; i.jumpPressed = true; for (int f = 0; f < 12; f++) { p.Step(1/60f, i); i.jumpPressed = false; }
    Console.WriteLine($"wall kick: moved {p.b.x - bx:F1}px away, vy={p.vy:F0}, bonus jump={p.wallBonus}");
    // 6: ledge: stand under a '=' row at y=8, jump through it and land on top; then drop through
    var led = (string[])flat.Clone(); led[9] = "  " + new string('=', 10) + new string(' ', 28);
    lv = Lv(led); p = new Player(lv, lv.start.x + 32, lv.start.y); i = new PlayerInput();
    for (int f = 0; f < 10; f++) p.Step(1/60f, i);
    i.jumpPressed = true; i.jumpHeld = true; for (int f = 0; f < 80; f++) { p.Step(1/60f, i); i.jumpPressed = false; }
    Console.WriteLine($"ledge: feet at {(p.b.y + p.b.h)/32:F2} tiles (9 = on the ledge) onGround={p.onGround}");
    i.y = 1; i.jumpPressed = true; for (int f = 0; f < 60; f++) { p.Step(1/60f, i); i.jumpPressed = false; }
    Console.WriteLine($"drop-through: feet at {(p.b.y + p.b.h)/32:F2} tiles (12 = floor)");
  }
}