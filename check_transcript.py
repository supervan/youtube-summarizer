from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
import json

video_id = "LvGteP3jSVY"

print("--- Checking YouTubeTranscriptApi ---")
try:
    transcript = YouTubeTranscriptApi.get_transcript(video_id)
    print(f"YouTubeTranscriptApi Success! Length: {len(transcript)}")
except Exception as e:
    print(f"YouTubeTranscriptApi Failed: {e}")

print("\n--- Checking yt-dlp subtitles ---")
url = f"https://www.youtube.com/watch?v={video_id}"
ydl_opts = {
    'skip_download': True,
    'writesubtitles': True,
    'writeautomaticsub': True,
    'subtitleslangs': ['en'],
    'quiet': True,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        info = ydl.extract_info(url, download=False)
        subtitles = info.get('subtitles')
        automatic_captions = info.get('automatic_captions')
        
        print(f"Subtitles available: {list(subtitles.keys()) if subtitles else 'None'}")
        print(f"Auto-captions available: {list(automatic_captions.keys()) if automatic_captions else 'None'}")
    except Exception as e:
        print(f"yt-dlp Failed: {e}")
