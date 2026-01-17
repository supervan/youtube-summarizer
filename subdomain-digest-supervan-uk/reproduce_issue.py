import yt_dlp
import os
from dotenv import load_dotenv

load_dotenv()

def test_vimeo_fetch(video_url, use_cookies=False):
    print(f"\n--- Testing fetch for {video_url} (Cookies: {use_cookies}) ---")
    
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'quiet': False, # Verbose to see errors
    }
    
    if use_cookies:
        # Load cookies from env and write to file
        cookies_content = os.getenv('VIMEO_COOKIES')
        if cookies_content:
            print("Found VIMEO_COOKIES in env.")
            with open('vimeo_cookies.txt', 'w') as f:
                f.write(cookies_content)
            ydl_opts['cookiefile'] = 'vimeo_cookies.txt'
        else:
            print("WARNING: VIMEO_COOKIES not found in env.")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            print("Success! Title:", info.get('title'))
    except Exception as e:
        print(f"Error caught: {e}")
    finally:
        if use_cookies and os.path.exists('vimeo_cookies.txt'):
            os.remove('vimeo_cookies.txt')

if __name__ == "__main__":
    # Test with a Vimeo URL. Use a generic one or one from the env if possible.
    # The one in env log was: https://vimeo.com/solutions/education-solutions (might not be a video)
    # Let's try a normally public video to check basic connectivity
    # And then maybe we can simulate the "requires authentication" if I had a private URL.
    
    # Generic public video
    public_video = "https://vimeo.com/76979871" 
    
    print("Testing PUBLIC video without cookies:")
    test_vimeo_fetch(public_video, use_cookies=False)
    
    print("\nTesting PUBLIC video WITH cookies:")
    test_vimeo_fetch(public_video, use_cookies=True)
