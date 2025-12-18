from PIL import Image
import os

# Paths
INPUT_MONOGRAM = "/home/lyndon/.gemini/antigravity/brain/ed5b2b5c-e28a-49ee-81c7-3fa01d3b66d0/supervan_logo_monogram_1766018100134.png"
INPUT_WIDE = "/home/lyndon/.gemini/antigravity/brain/ed5b2b5c-e28a-49ee-81c7-3fa01d3b66d0/supervan_logo_wide_1766018293900.png"
OUTPUT_DIR = "/home/lyndon/git/ai/youtube summary/root-supervan-uk/public"

MAX_SIZE_KB = 150
TARGET_ASPECT_RATIO = 5.0 # 5:1

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def optimize_image(img, output_path, format, quality=90):
    # Save first pass
    img.save(output_path, format=format, quality=quality, optimize=True)
    
    # Check size
    file_size = os.path.getsize(output_path) / 1024
    
    # Reduce quality if too big
    while file_size > MAX_SIZE_KB and quality > 10:
        quality -= 5
        img.save(output_path, format=format, quality=quality, optimize=True)
        file_size = os.path.getsize(output_path) / 1024
        print(f"Refining {os.path.basename(output_path)}: Quality={quality}, Size={file_size:.2f}KB")

    print(f"Saved {os.path.basename(output_path)}: Size={file_size:.2f}KB")

def make_wide_logo():
    print("Processing Wide Logo...")
    try:
        img = Image.open(INPUT_WIDE)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Crop whitespace first (to get the actual content)
        # Using getbbox to find bounding box of non-white content
        # Invert first if background is white
        from PIL import ImageOps
        inverted = ImageOps.invert(img)
        bbox = inverted.getbbox()
        if bbox:
            img = img.crop(bbox)
        
        # Now resize/pad to 5:1
        w, h = img.size
        # We want width/height = 5
        # If w/h > 5, it is too wide -> pad height
        # If w/h < 5, it is too tall -> pad width
        
        current_ratio = w / h
        
        if current_ratio > TARGET_ASPECT_RATIO:
            # Too wide, need more height
            target_w = w
            target_h = int(w / TARGET_ASPECT_RATIO)
        else:
            # Too tall (most likely), need more width
            target_h = h
            target_w = int(h * TARGET_ASPECT_RATIO)
            
        new_img = Image.new('RGB', (target_w, target_h), (255, 255, 255))
        
        # Center the image
        paste_x = (target_w - w) // 2
        paste_y = (target_h - h) // 2
        
        new_img.paste(img, (paste_x, paste_y))
        
        # Resize to reasonable dimensions if huge (e.g. keep width <= 2000)
        # 2000x400 fits nicely
        if target_w > 2000:
            ratio = 2000.0 / target_w
            new_target_w = 2000
            new_target_h = int(target_h * ratio)
            new_img = new_img.resize((new_target_w, new_target_h), Image.Resampling.LANCZOS)

        # Save PNG
        optimize_image(new_img, os.path.join(OUTPUT_DIR, "logo-wide.png"), "PNG")
        
        # Save JPG
        optimize_image(new_img, os.path.join(OUTPUT_DIR, "logo-wide.jpg"), "JPEG")
        
    except Exception as e:
        print(f"Error processing wide logo: {e}")

def make_square_favicon():
    print("Processing Favicon...")
    try:
        img = Image.open(INPUT_MONOGRAM)
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Resize to standard sizes
        # Favicon (PNG)
        img_fav = img.resize((192, 192), Image.Resampling.LANCZOS)
        optimize_image(img_fav, os.path.join(OUTPUT_DIR, "favicon.png"), "PNG")
        
        # Logo Square (Higher Res)
        img_sq = img.resize((512, 512), Image.Resampling.LANCZOS)
        optimize_image(img_sq, os.path.join(OUTPUT_DIR, "logo-square.png"), "PNG")
        optimize_image(img_sq, os.path.join(OUTPUT_DIR, "logo-square.jpg"), "JPEG")
        
    except Exception as e:
        print(f"Error processing favicon: {e}")

def main():
    ensure_dir(OUTPUT_DIR)
    make_wide_logo()
    make_square_favicon()

if __name__ == "__main__":
    main()
