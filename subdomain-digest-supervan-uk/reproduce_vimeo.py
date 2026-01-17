import yt_dlp
import os
import tempfile
from dotenv import load_dotenv

load_dotenv()

def test_vimeo_fetch(video_url):
    print(f"\n--- Testing fetch for {video_url} ---")
    
    cookies_content = os.getenv('VIMEO_COOKIES')
    if not cookies_content:
        print("❌ Error: VIMEO_COOKIES not found in .env")
        return

    print("✅ VIMEO_COOKIES found in env.")
    
    # Create temp cookie file
    fd, cookies_file = tempfile.mkstemp(suffix='.txt', text=True)
    with os.fdopen(fd, 'w') as f:
        f.write(cookies_content)
    
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'quiet': False,
        'cookiefile': cookies_file,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print("Running yt-dlp...")
            info = ydl.extract_info(video_url, download=False)
            print("✅ Success!")
            print(f"Title: {info.get('title')}")
            
    except Exception as e:
        print(f"❌ Error caught: {e}")
    finally:
        if os.path.exists(cookies_file):
            os.remove(cookies_file)

if __name__ == "__main__":
    # Test with a Vimeo URL (Public one to test basic auth/bot bypass)
    # This video ID was seen in the logs/env: https://vimeo.com/76979871
    vimeo_url = "https://vimeo.com/76979871" 
    test_vimeo_fetch(vimeo_url)
