import yt_dlp
import json
import sys

def get_transcript_ytdlp(video_url):
    print(f"Testing yt-dlp for {video_url}")
    
    try:
        # Update options to write VTT file
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
            'subtitlesformat': 'vtt',
            'outtmpl': 'test_sub',
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True) # download=True to write subs
            
            # Check if file exists
            import os
            if os.path.exists('test_sub.en.vtt'):
                print("✅ Successfully downloaded test_sub.en.vtt")
                with open('test_sub.en.vtt', 'r') as f:
                    content = f.read()
                    print(f"First 200 chars:\n{content[:200]}")
                os.remove('test_sub.en.vtt')
                return True
            else:
                print("❌ Failed to download VTT file")
                return False
                
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    url = "https://www.youtube.com/watch?v=jDG1m_b5Ih0"
    get_transcript_ytdlp(url)
