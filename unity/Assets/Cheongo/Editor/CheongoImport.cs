// Pictures under Cheongo/Resources/Sprites keep their exact pixel size (frame rectangles depend on it),
// stay uncompressed and unfiltered by mipmaps; the stone and paper textures tile.
using UnityEditor;

namespace Cheongo.EditorTools
{
    public class CheongoImport : AssetPostprocessor
    {
        void OnPreprocessTexture()
        {
            if (!assetPath.Contains("Cheongo/Resources/Sprites")) return;
            var ti = (TextureImporter)assetImporter;
            ti.textureType = TextureImporterType.Default;
            ti.npotScale = TextureImporterNPOTScale.None;
            ti.mipmapEnabled = false;
            // the paper, the panoramas and the rock columns are reworked in code at load (grain, blur, brightness), so their pixels must be readable
            string n = System.IO.Path.GetFileNameWithoutExtension(assetPath); ti.isReadable = n == "tex-paper" || n == "far" || n == "mid" || n == "pillars";
            ti.alphaIsTransparency = true;
            ti.maxTextureSize = 16384;   // the widest sheets (bwalk: 8150px) must keep every pixel, or their frame rectangles miss
            ti.textureCompression = TextureImporterCompression.Uncompressed;
            ti.wrapMode = assetPath.Contains("/tex-") ? UnityEngine.TextureWrapMode.Repeat : UnityEngine.TextureWrapMode.Clamp;
        }
    }
}
