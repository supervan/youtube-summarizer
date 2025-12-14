import yt_dlp
import json

def test_info():
    url = "https://www.youtube.com/watch?v=0F2Pg9XCEAg"
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        print("Keys available:", info.keys())
        print("\nSpecific fields of interest:")
        print(f"webpage_url: {info.get('webpage_url')}")
        print(f"short_url: {info.get('short_url')}") # Checking if this exists
        print(f"id: {info.get('id')}")
        print(f"title: {info.get('title')}")
        print(f"description (len): {len(info.get('description', ''))}")
        print(f"uploader: {info.get('uploader')}")
        print(f"upload_date: {info.get('upload_date')}")
        print(f"channel_follower_count: {info.get('channel_follower_count')}")
        print(f"uploader_url: {info.get('uploader_url')}")
        print(f"channel_url: {info.get('channel_url')}")
        
        # Check thumbnails for channel avatar?
        # usually thumbnails are for the video. Channel avatar might not be directly available in video info.
        # But let's check if there's anything looking like an avatar in the full keys.
        
        print(f"thumbnails: {len(info.get('thumbnails', []))} found")
        if info.get('thumbnails'):
            print(f"Sample thumbnail: {info.get('thumbnails')[0]}")

if __name__ == "__main__":
    test_info()
