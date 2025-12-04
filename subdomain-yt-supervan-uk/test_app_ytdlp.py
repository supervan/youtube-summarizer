import sys
import os
import logging

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app import _get_youtube_transcript_with_cookies

# Configure logging
logging.basicConfig(level=logging.INFO)

def test_app_transcript():
    print("🚀 Testing app.py transcript extraction (yt-dlp)...")
    
    video_id = "jDG1m_b5Ih0" # The video user was trying
    
    try:
        transcript, cookie_count = _get_youtube_transcript_with_cookies(video_id)
        print(f"\n✅ Success!")
        print(f"Transcript length: {len(transcript)}")
        print(f"First 200 chars extracted:\n{transcript[:200]}")
    except Exception as e:
        print(f"\n❌ Failed: {e}")

if __name__ == "__main__":
    test_app_transcript()
