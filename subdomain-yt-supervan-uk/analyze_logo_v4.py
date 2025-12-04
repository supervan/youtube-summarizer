import os
from PIL import Image
from collections import Counter

path = "/home/lyndon/.gemini/antigravity/brain/7934c526-168d-49f4-a90d-70f5e96b8a5b/uploaded_image_1764533339623.jpg"

try:
    with Image.open(path) as img:
        print(f"Image: {os.path.basename(path)}")
        print(f"  Format: {img.format}")
        print(f"  Size: {img.size}")
        print(f"  Mode: {img.mode}")
        
        # Sample colors
        img = img.convert("RGBA")
        pixels = list(img.getdata())
        common = Counter(pixels).most_common(20)
        print("Most common colors:")
        for color, count in common:
            print(f"  {color}: {count}")
            
except Exception as e:
    print(f"Error processing {path}: {e}")
