import yt_dlp
import os
import tempfile

def test_fetch(video_id):
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"Testing fetch for {video_url}")

    with tempfile.TemporaryDirectory() as temp_dir:
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en.*', 'auto'], # Try more language patterns
            'subtitlesformat': 'vtt',
            'outtmpl': os.path.join(temp_dir, '%(id)s'),
            'quiet': False,
            'no_warnings': False,
            'socket_timeout': 10,
            'format': 'worst',
            'ignore_no_formats_error': True,
            'allow_unplayable_formats': True,
            'force_ipv4': True,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=True)
                print(f"Title: {info.get('title')}")
                
                files = os.listdir(temp_dir)
                print(f"Files in temp dir: {files}")
                
                if not files:
                    print("❌ FAILURE: No files downloaded")
                else:
                    print("✅ SUCCESS: Files found")
        except Exception as e:
            print(f"❌ EXCEPTION: {e}")

if __name__ == "__main__":
    # Try a TED talk, they always have subs
    test_fetch("1e8ylq4j_EY") 
