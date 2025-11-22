import os
import time
import random
import requests
import re
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
import tempfile

# Mock Proxy Manager for standalone testing
class MockProxyManager:
    def __init__(self):
        self.proxies = []
        self._refresh_proxies()

    def _refresh_proxies(self):
        print("🔄 Refreshing free proxy list (SOCKS5)...")
        # Fetch SOCKS5 proxies
        try:
            resp = requests.get("https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt", timeout=5)
            matches = re.findall(r'(\d+\.\d+\.\d+\.\d+:\d+)', resp.text)
            self.proxies = [f"socks5://{p}" for p in matches[:50]] # Take top 50
            print(f"   Found {len(self.proxies)} SOCKS5 proxies")
        except Exception as e:
            print(f"   Failed to fetch proxies: {e}")

    def get_proxy(self):
        if not self.proxies:
            return None
        p = random.choice(self.proxies)
        return {'http': p, 'https': p}

proxy_manager = MockProxyManager()

def test_youtube_transcript_api(video_id):
    print(f"\n--- Testing YouTubeTranscriptApi for {video_id} ---")
    
    # 1. Direct
    try:
        print("Attempting DIRECT connection...")
        YouTubeTranscriptApi.get_transcript(video_id)
        print("✅ DIRECT SUCCESS")
        return
    except Exception as e:
        print(f"❌ DIRECT FAILED: {e}")

    # 2. With Proxies
    print("Attempting PROXY connections...")
    for i in range(5):
        proxy = proxy_manager.get_proxy()
        if not proxy:
            print("No proxies available")
            break
        print(f"   Trying proxy {proxy['http']}...")
        try:
            YouTubeTranscriptApi.get_transcript(video_id, proxies=proxy)
            print("   ✅ PROXY SUCCESS")
            return
        except Exception as e:
            print(f"   ❌ PROXY FAILED: {e}")

def test_yt_dlp(video_id):
    print(f"\n--- Testing yt-dlp for {video_id} ---")
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
            'subtitlesformat': 'vtt',
            'outtmpl': os.path.join(temp_dir, '%(id)s'),
            'quiet': False,
            'no_warnings': False,
            'format': 'worst',
            'ignore_no_formats_error': True,
            'allow_unplayable_formats': True,
            'force_ipv4': True,
        }

        # 1. Direct
        try:
            print("Attempting DIRECT connection...")
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.extract_info(video_url, download=True)
                if os.listdir(temp_dir):
                    print("✅ DIRECT SUCCESS")
                    return
                else:
                    print("❌ DIRECT FAILED: No files downloaded")
        except Exception as e:
            print(f"❌ DIRECT FAILED: {e}")

        # 2. With Proxies
        print("Attempting PROXY connections...")
        for i in range(3):
            proxy = proxy_manager.get_proxy()
            if not proxy:
                break
            print(f"   Trying proxy {proxy['http']}...")
            ydl_opts['proxy'] = proxy['http']
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.extract_info(video_url, download=True)
                    if os.listdir(temp_dir):
                        print("   ✅ PROXY SUCCESS")
                        return
                    else:
                        print("   ❌ PROXY FAILED: No files downloaded")
            except Exception as e:
                print(f"   ❌ PROXY FAILED: {e}")

if __name__ == "__main__":
    # Test with a video that definitely has captions
    VIDEO_ID = "M7fi_IBeaSM" # Google Developers
    test_youtube_transcript_api(VIDEO_ID)
    test_yt_dlp(VIDEO_ID)
