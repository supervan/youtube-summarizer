from PIL import Image
import shutil

source_path = "/home/lyndon/.gemini/antigravity/brain/7934c526-168d-49f4-a90d-70f5e96b8a5b/uploaded_image_1764525720958.png"
dest_logo = "/home/lyndon/git/ai/youtube summary/logo.png"
dest_favicon = "/home/lyndon/git/ai/youtube summary/favicon.png"

def remove_background(img, threshold=110):
    img = img.convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        # item is (r, g, b, a)
        # Check brightness
        if max(item[0], item[1], item[2]) > threshold:
            new_data.append(item)
        else:
            new_data.append((0, 0, 0, 0))
            
    img.putdata(new_data)
    return img

print(f"Processing {source_path}...")
try:
    with Image.open(source_path) as img:
        # Remove background
        clean_img = remove_background(img)
        
        # Save logo
        clean_img.save(dest_logo)
        print(f"Saved transparent logo to {dest_logo}")
        
        # Generate favicon
        # Resize to square 64x64
        w, h = clean_img.size
        size = max(w, h)
        new_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        x = (size - w) // 2
        y = (size - h) // 2
        new_img.paste(clean_img, (x, y))
        
        favicon = new_img.resize((64, 64), Image.Resampling.LANCZOS)
        favicon.save(dest_favicon)
        print(f"Saved favicon to {dest_favicon}")
        
except Exception as e:
    print(f"Error: {e}")
