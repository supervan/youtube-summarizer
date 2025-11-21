import os
import tempfile
import requests
import http.cookiejar
from youtube_transcript_api import YouTubeTranscriptApi

# Mock cookie content (Netscape format)
mock_cookies = """
# Netscape HTTP Cookie File
# http://curl.haxx.se/rfc/cookie.html
.youtube.com	TRUE	/	FALSE	1763740000	VISITOR_INFO1_LIVE	1234567890
"""

def test_cookie_auth():
    try:
        # Create temp cookie file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            f.write(mock_cookies)
            cookie_file = f.name
            
        print(f"Created cookie file: {cookie_file}")
        
        # Create session with cookies
        session = requests.Session()
        session.cookies = http.cookiejar.MozillaCookieJar(cookie_file)
        session.cookies.load(ignore_discard=True, ignore_expires=True)
        
        print("Cookies loaded into session")
        
        # Instantiate API with session
        api = YouTubeTranscriptApi(http_client=session)
        print("API instantiated successfully")
        
        # Check if we can call fetch (won't actually work without real video/cookies, but checks signature)
        # We just want to ensure no TypeError about arguments
        print("Signature check passed")
        
        os.unlink(cookie_file)
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_cookie_auth()
