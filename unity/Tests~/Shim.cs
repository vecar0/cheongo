using System;
namespace UnityEngine {
  public static class Mathf {
    public static float Min(float a, float b) => a < b ? a : b; public static int Min(int a, int b) => a < b ? a : b;
    public static float Max(float a, float b) => a > b ? a : b; public static int Max(int a, int b) => a > b ? a : b;
    public static float Abs(float a) => Math.Abs(a); public static float Sign(float a) => a >= 0 ? 1 : -1;
    public static float Floor(float a) => (float)Math.Floor(a); public static int FloorToInt(float a) => (int)Math.Floor(a);
    public static int CeilToInt(float a) => (int)Math.Ceiling(a); public static int RoundToInt(float a) => (int)Math.Round(a, MidpointRounding.ToEven);
    public static float Clamp(float v, float a, float b) => v < a ? a : v > b ? b : v; public static int Clamp(int v, int a, int b) => v < a ? a : v > b ? b : v;
    public static float Clamp01(float v) => Clamp(v, 0, 1);
  }
  public struct Vector2 { public float x, y; public Vector2(float x, float y) { this.x = x; this.y = y; } public float magnitude => (float)Math.Sqrt(x * x + y * y); public void Normalize() { var m = magnitude; if (m > 1e-5f) { x /= m; y /= m; } } }
  public struct Vector3 { public float x, y, z; public Vector3(float x, float y, float z = 0) { this.x = x; this.y = y; this.z = z; } }
  public struct Rect { public float x, y, width, height; public Rect(float x, float y, float w, float h) { this.x = x; this.y = y; width = w; height = h; } public bool Overlaps(Rect o) => o.x < x + width && o.x + o.width > x && o.y < y + height && o.y + o.height > y; }
  public struct Color { public float r, g, b, a; public static Color magenta => new Color(); }
  public static class ColorUtility { public static bool TryParseHtmlString(string s, out Color c) { c = new Color(); return true; } }
  public class Object { } public class TextAsset : Object { public string text; }
  public static class Resources { public static T Load<T>(string p) where T : class => null; }
  public static class JsonUtility { public static T FromJson<T>(string s) => default(T); }
  public static class Debug { public static void LogError(object o) => Console.WriteLine(o); }
}
