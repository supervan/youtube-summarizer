import os
from PIL import Image

path = "/home/lyndon/.gemini/antigravity/brain/7934c526-168d-49f4-a90d-70f5e96b8a5b/uploaded_image_1764529083063.png"

try:
    with Image.open(path) as img:
        print(f"Image: {os.path.basename(path)}")
        print(f"  Format: {img.format}")
        print(f"  Size: {img.size}")
        print(f"  Mode: {img.mode}")
        
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            print("  Has transparency channel: Yes")
            if img.mode == 'RGBA':
                extrema = img.getextrema()
                print(f"  Alpha channel extrema: {extrema[3]}")
                # Check if alpha is all 255 (fully opaque)
                if extrema[3][0] == 255 and extrema[3][1] == 255:
                     print("  WARNING: Alpha channel exists but is fully opaque (255).")
                else:
                     print("  Alpha channel has varying values (actual transparency).")
        else:
            print("  Has transparency channel: No")
            
        # Sample corners again
        print(f"  Top-left pixel: {img.getpixel((0, 0))}")
        
except Exception as e:
    print(f"Error processing {path}: {e}")
