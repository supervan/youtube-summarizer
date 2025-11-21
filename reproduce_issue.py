import yt_dlp
import os
import tempfile

def reproduce():
    video_id = "jDG1m_b5Ih0"
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    print(f"Testing {video_url}...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
            'subtitlesformat': 'vtt',
            'outtmpl': os.path.join(temp_dir, '%(id)s'),
            'quiet': False, # Enable output to see details
            'no_warnings': False,
            'socket_timeout': 5,
            'retries': 1,
            'fragment_retries': 1,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.extract_info(video_url, download=True)
                print("✅ Success")
        except Exception as e:
            print(f"❌ Failed: {e}")

if __name__ == "__main__":
    reproduce()
