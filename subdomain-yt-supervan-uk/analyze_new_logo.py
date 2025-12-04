import os
from PIL import Image

path = "/home/lyndon/.gemini/antigravity/brain/7934c526-168d-49f4-a90d-70f5e96b8a5b/uploaded_image_1764525720958.png"

try:
    with Image.open(path) as img:
        print(f"Image: {os.path.basename(path)}")
        print(f"  Format: {img.format}")
        print(f"  Size: {img.size}")
        print(f"  Mode: {img.mode}")
        
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            print("  Has transparency channel: Yes")
            # Check if it's actually transparent or just fully opaque alpha
            if img.mode == 'RGBA':
                extrema = img.getextrema()
                print(f"  Alpha channel extrema: {extrema[3]}")
        else:
            print("  Has transparency channel: No")
            
        # Sample some corner pixels to see what the background is
        print(f"  Top-left pixel: {img.getpixel((0, 0))}")
        print(f"  Top-right pixel: {img.getpixel((img.width-1, 0))}")
        print(f"  Bottom-left pixel: {img.getpixel((0, img.height-1))}")
        
except Exception as e:
    print(f"Error processing {path}: {e}")
