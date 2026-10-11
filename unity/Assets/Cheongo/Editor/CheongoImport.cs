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
            ti.alphaIsTransparency = true;
            ti.maxTextureSize = 4096;
            ti.textureCompression = TextureImporterCompression.Uncompressed;
            ti.wrapMode = assetPath.Contains("/tex-") ? UnityEngine.TextureWrapMode.Repeat : UnityEngine.TextureWrapMode.Clamp;
        }
    }
}
