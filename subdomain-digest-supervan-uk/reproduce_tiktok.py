import yt_dlp
import json
import os

# Example TikTok URL (Trending/Viral video)
# Note: TikTok URLs can be tricky with redirects (vm.tiktok.com vs www.tiktok.com)
TEST_URL = "https://www.tiktok.com/@user/video/7595891987564301623" # Testing constructed URL pattern

def test_tiktok_fetch():
    print(f"--- Testing TikTok Fetch for {TEST_URL} ---")
    
    # Options using the same basic setup as app.py (minus specific cookies for now)
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True, # Try to get captions
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'quiet': False,
        'no_warnings': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print("1. Extracting info...")
            info = ydl.extract_info(TEST_URL, download=False) # First try without download to see metadata
            
            print("\n✅ Metadata success!")
            print(f"Title: {info.get('title')}")
            print(f"Uploader: {info.get('uploader')}")
            print(f"Duration: {info.get('duration')}")
            print(f"Description: {info.get('description')}")
            
            # Check for subtitles/captions
            subtitles = info.get('subtitles')
            auto_captions = info.get('automatic_captions')
            
            print(f"\nSubtitles available: {list(subtitles.keys()) if subtitles else 'None'}")
            print(f"Auto-captions available: {list(auto_captions.keys()) if auto_captions else 'None'}")
            
    except Exception as e:
        print(f"\n❌ Failed: {e}")

if __name__ == "__main__":
    test_tiktok_fetch()
