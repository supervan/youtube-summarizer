from PIL import Image, ImageChops
import os

INPUT_PATH = "/home/lyndon/git/ai/youtube summary/root-supervan-uk/public/logo-wide.png"
OUTPUT_PATH = "/home/lyndon/git/ai/youtube summary/root-supervan-uk/public/logo-wide.png"

def trim(im):
    bg = Image.new(im.mode, im.size, im.getpixel((0,0)))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

def process():
    try:
        print(f"Opening {INPUT_PATH}")
        img = Image.open(INPUT_PATH)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Aggressive crop with tolerance for compression artifacts
        # Convert to grayscale for thresholding
        gray = img.convert('L')
        # Threshold: anything lighter than 240 became 255 (white), else 0 (black)
        # This helps find the content vs background.
        bw = gray.point(lambda x: 0 if x < 250 else 255, '1')
        
        # Invert so content is white, bg is black
        # Wait, getbbox works on non-zero. 
        # If we want to find the content (darker stuff), we want content to be non-zero.
        # If background is white (255), we want to invert it.
        from PIL import ImageOps
        inverted = ImageOps.invert(img)
        
        # We can use the 'inverted' image to find the bbox of non-black pixels
        # But let's apply a threshold to the inverted image to kill noise
        inv_gray = inverted.convert('L')
        # Keep only pixels that were properly dark in original (now bright)
        # Original near-white (250+) -> Inverted near-black (0-5)
        # Filter anything significant
        thresh = inv_gray.point(lambda x: 0 if x < 10 else 255, '1')
        
        bbox = thresh.getbbox()
        
        if bbox:
            print(f"Found content bounding box: {bbox}")
            # Crop the original image
            img_cropped = img.crop(bbox)
        else:
            print("No content found? Using trim fallback.")
            img_cropped = trim(img)

        # Now resize to fit 5:1 optimally
        w, h = img_cropped.size
        print(f"Cropped size: {w}x{h}")
        
        target_ratio = 5.0
        
        # We want to fill the height mostly, as that's the constraint in the navbar (h-10)
        # So we pad the WIDTH to reach 5:1
        
        # Required width for current height
        req_w = int(h * target_ratio)
        
        if req_w < w:
            # The image is ALREADY wider than 5:1?
            # Then we pad height?
            # navbar usually constrains height. If image is super wide, it will look small vertically.
            # But the logo is text + icon, so it should be wide.
            print("Image is wider than 5:1.")
            # Pad height
            req_h = int(w / target_ratio)
            new_img = Image.new('RGB', (w, req_h), (255,255,255))
            new_img.paste(img_cropped, (0, (req_h - h)//2))
        else:
            # Pad width
            print("Image is narrower than 5:1. Padding width.")
            new_img = Image.new('RGB', (req_w, h), (255,255,255))
            # Paste in center-left? Or Center?
            # Logo usually starts left. But for a 'logo file' centering is safer unless specified.
            # Let's center it.
            new_img.paste(img_cropped, ((req_w - w)//2, 0))
            
        # Save
        new_img.save(OUTPUT_PATH)
        print(f"Saved to {OUTPUT_PATH}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    process()
