from PIL import Image

path = "/home/lyndon/git/ai/youtube summary/logo.png"

try:
    with Image.open(path) as img:
        print(f"Current logo size: {img.size}")
        img = img.convert("RGBA")
        bbox = img.getbbox()
        if bbox:
            print(f"Content bounding box: {bbox}")
            cropped = img.crop(bbox)
            print(f"Cropped size: {cropped.size}")
            cropped.save(path)
            print("Logo cropped and saved.")
        else:
            print("Logo appears to be empty (fully transparent)!")
            
except Exception as e:
    print(f"Error: {e}")
