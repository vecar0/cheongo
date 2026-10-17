// The built game wears the web app's icon (Assets/Cheongo/Icons/icon-512.png, copied by tools/unity-export/export.js) and its name.
// Set once when the project opens, only if no icon has been chosen yet.
using UnityEditor;
using UnityEngine;

namespace Cheongo.EditorTools
{
    [InitializeOnLoad]
    static class CheongoPlayer
    {
        static CheongoPlayer() { EditorApplication.delayCall += Apply; }
        static void Apply()
        {
            var tex = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Cheongo/Icons/icon-512.png"); if (tex == null) return;
            var cur = PlayerSettings.GetIcons(UnityEditor.Build.NamedBuildTarget.Unknown, IconKind.Any);
            if (cur == null || cur.Length == 0 || cur[0] == null) PlayerSettings.SetIcons(UnityEditor.Build.NamedBuildTarget.Unknown, new[] { tex }, IconKind.Any);
            if (PlayerSettings.productName != "천고") PlayerSettings.productName = "천고";
        }
    }
}
