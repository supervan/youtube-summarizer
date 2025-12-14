import os
from PIL import Image

image_paths = [
    "/home/lyndon/.gemini/antigravity/brain/7934c526-168d-49f4-a90d-70f5e96b8a5b/uploaded_image_0_1764524796168.png",
    "/home/lyndon/.gemini/antigravity/brain/7934c526-168d-49f4-a90d-70f5e96b8a5b/uploaded_image_1_1764524796168.png"
]

for path in image_paths:
    try:
        with Image.open(path) as img:
            print(f"Image: {os.path.basename(path)}")
            print(f"  Format: {img.format}")
            print(f"  Size: {img.size}")
            print(f"  Mode: {img.mode}")
            # Check for transparency
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                print("  Has transparency: Yes")
            else:
                print("  Has transparency: No")
            
            # Get average color to guess if it's dark or light
            # Resize to 1x1 to get average
            avg_color = img.resize((1, 1)).getpixel((0, 0))
            print(f"  Average Color: {avg_color}")
            print("-" * 20)
    except Exception as e:
        print(f"Error processing {path}: {e}")
