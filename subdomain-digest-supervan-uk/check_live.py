import yt_dlp
import json

url = "https://www.youtube.com/live/LvGteP3jSVY?si=RmZtB3-NW_VH-jn0"

ydl_opts = {
    'skip_download': True,
    'quiet': True,
    'no_warnings': True,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        info = ydl.extract_info(url, download=False)
        print(json.dumps({
            'is_live': info.get('is_live'),
            'was_live': info.get('was_live'),
            'title': info.get('title'),
            'duration': info.get('duration'),
            'live_status': info.get('live_status') # sometimes present
        }, indent=2))
    except Exception as e:
        print(f"Error: {e}")
