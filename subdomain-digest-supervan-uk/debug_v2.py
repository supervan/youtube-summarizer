import yt_dlp
import os
import sys

VIDEO_ID = "ZJ_xq1_fqVQ"
VIDEO_URL = f"https://www.youtube.com/watch?v={VIDEO_ID}"

def test_method_1_5():
    print("🚀 Testing Method 1.5 (Direct with Android Client)...")
    try:
        ydl_opts = {
            'skip_download': True,
            'quiet': False,
            'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(VIDEO_URL, download=False) # Just info first
        print("✅ Method 1.5 Info Extraction Success!")
    except Exception as e:
        print(f"❌ Method 1.5 Failed: {e}")

if __name__ == "__main__":
    try:
        import curl_cffi
        print(f"✅ curl_cffi is importable (Version: {curl_cffi.__version__})")
    except ImportError:
        print("❌ curl_cffi is NOT installed!")

    test_method_1_5()
