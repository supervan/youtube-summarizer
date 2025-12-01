from PIL import Image
from collections import Counter

path = "/home/lyndon/.gemini/antigravity/brain/7934c526-168d-49f4-a90d-70f5e96b8a5b/uploaded_image_1764525720958.png"

with Image.open(path) as img:
    img = img.convert("RGBA")
    pixels = list(img.getdata())
    common = Counter(pixels).most_common(20)
    
    print("Most common colors:")
    for color, count in common:
        print(f"  {color}: {count}")
