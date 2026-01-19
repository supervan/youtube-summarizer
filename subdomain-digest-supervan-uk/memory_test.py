import yt_dlp
import os
import resource
import time
import sys

# Limit memory to simulate a small server (e.g. 512MB) to see if it crashes
# This is a soft limit, might not be exact but helpful.
# 512MB = 512 * 1024 * 1024
MEMORY_LIMIT = 512 * 1024 * 1024 

def limit_memory():
    try:
        resource.setrlimit(resource.RLIMIT_AS, (MEMORY_LIMIT, MEMORY_LIMIT))
        print(f"Memory limited to {MEMORY_LIMIT/1024/1024} MB")
    except ValueError:
        print("Failed to limit memory (platform specific?)")

VIDEO_ID = "ZJ_xq1_fqVQ"
VIDEO_URL = f"https://www.youtube.com/watch?v={VIDEO_ID}"

def test_extraction_memory():
    # limit_memory() 
    # Commented out limit for now to just measure usage first
    
    print(f"Testing extraction for {VIDEO_URL}")
    print(f"Process ID: {os.getpid()}")
    
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'subtitlesformat': 'vtt',
        'outtmpl': 'test_download/%(id)s',
        'quiet': False,
        'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
    }
    
    start_time = time.time()
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(VIDEO_URL, download=True)
            
        print(f"✅ Success in {time.time() - start_time:.2f}s")
        
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    test_extraction_memory()
