import os
from PIL import Image
import shutil

# Paths
source_image = "/home/lyndon/.gemini/antigravity/brain/7934c526-168d-49f4-a90d-70f5e96b8a5b/uploaded_image_1764525420005.png"
dest_logo = "/home/lyndon/git/ai/youtube summary/logo.png"
dest_favicon = "/home/lyndon/git/ai/youtube summary/favicon.png"

# 1. Copy logo
print(f"Copying {source_image} to {dest_logo}")
shutil.copy2(source_image, dest_logo)

# 2. Generate favicon
print(f"Generating favicon at {dest_favicon}")
try:
    with Image.open(dest_logo) as img:
        # Resize to 64x64 for favicon (standard size, or 32x32)
        # The logo is likely rectangular (text), so we might want to fit it in a square or just resize.
        # Given "TL;DR" text, it might be wide.
        # Let's check aspect ratio.
        w, h = img.size
        print(f"Original size: {w}x{h}")
        
        # Create a square canvas
        size = max(w, h)
        new_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        
        # Center the image
        x = (size - w) // 2
        y = (size - h) // 2
        new_img.paste(img, (x, y))
        
        # Resize to 64x64
        favicon = new_img.resize((64, 64), Image.Resampling.LANCZOS)
        favicon.save(dest_favicon)
        print("Favicon generated successfully.")
except Exception as e:
    print(f"Error generating favicon: {e}")
