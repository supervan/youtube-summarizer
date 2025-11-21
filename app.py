from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import yt_dlp
import google.generativeai as genai
import re
import os
import tempfile
import requests
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__, static_folder='.')
CORS(app)

def extract_video_id(url):
    """Extract YouTube video ID from various URL formats"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

@app.route('/')
def index():
    """Serve the main HTML file"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('.', path)

def _parse_vtt(vtt_content):
    """Parse VTT subtitle content to extract plain text"""
    lines = vtt_content.splitlines()
    text_lines = []
    seen_lines = set() # Deduplicate lines
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Skip headers
        if line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
            continue
            
        # Skip timestamps (lines containing -->)
        if '-->' in line:
            continue
            
        # Skip sequence numbers (lines that are just digits)
        if line.isdigit():
            continue
            
        # Remove HTML-like tags (e.g. <c.colorE5E5E5>, <b>, etc.)
        clean_line = re.sub(r'<[^>]+>', '', line)
        clean_line = clean_line.strip()
        
        # Skip empty lines after cleaning
        if not clean_line:
            continue
            
        # Add to text if not duplicate (VTT often repeats lines for karaoke effect)
        if clean_line not in seen_lines:
            text_lines.append(clean_line)
            seen_lines.add(clean_line)
            
    return " ".join(text_lines)

def _parse_xml(xml_content):
    """Parse XML transcript content to extract plain text"""
    import html
    # Extract text from <text> tags
    text_parts = re.findall(r'<text[^>]*>(.+?)</text>', xml_content, re.DOTALL)
    # Decode HTML entities and clean whitespace
    decoded_parts = [html.unescape(t).strip() for t in text_parts if t.strip()]
    return " ".join(decoded_parts)

def _get_youtube_transcript_with_cookies(video_id):
    """Extract transcript from YouTube video using manual HTML parsing."""
    cookies_content = os.getenv('YOUTUBE_COOKIES')
    cookies_file = None
    loaded_cookie_count = 0
    
    # 1. Setup Cookies
    try:
        if cookies_content:
            if not cookies_content.startswith('# Netscape HTTP Cookie File'):
                cookies_content = '# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie.html\n\n' + cookies_content
            
            loaded_cookie_count = len(cookies_content.splitlines())

            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
                f.write(cookies_content)
                cookies_file = f.name
                print(f"🍪 Using cookies for authentication (file: {cookies_file})")
    except Exception as e:
        print(f"⚠️ Cookie setup failed: {e}")

    # 2. Setup Session
    import requests
    import http.cookiejar
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.youtube.com/',
    })
    
    if cookies_file:
        session.cookies = http.cookiejar.MozillaCookieJar(cookies_file)
        try:
            session.cookies.load(ignore_discard=True, ignore_expires=True)
        except Exception as e:
            print(f"⚠️ Failed to load cookies into session: {e}")

    # 3. Fetch and parse video page
    url = f"https://www.youtube.com/watch?v={video_id}"
    
    try:
        print(f"🔍 Fetching video page: {url}")
        page_response = session.get(url)
        page_response.raise_for_status()
        page_content = page_response.text
        
        # Extract title for diagnostics
        page_title_match = re.search(r'<title>(.*?)</title>', page_content)
        page_title = page_title_match.group(1) if page_title_match else "Unknown Title"
        print(f"📄 Page Title: {page_title}")
        
        # Check for blocks
        if "Sign in to confirm you're not a bot" in page_content:
            raise Exception("YouTube is requesting bot verification")
        elif "Google Account" in page_title and "Sign in" in page_content:
            raise Exception("YouTube is requesting sign-in")
                
    except Exception as e:
        raise Exception(f"Failed to fetch video page: {e}")

    # 4. Extract ytInitialPlayerResponse
    try:
        import json
        
        json_match = re.search(r'var ytInitialPlayerResponse\s*=\s*({.+?});', page_content)
        
        if not json_match:
            raise Exception("ytInitialPlayerResponse not found in HTML")
            
        player_response = json.loads(json_match.group(1))
        
        # Navigate to captions
        captions = player_response.get('captions', {})
        pctr = captions.get('playerCaptionsTracklistRenderer', {})
        tracks = pctr.get('captionTracks', [])
        
        if not tracks:
            raise Exception("No caption tracks found in player response")
        
        # Find English track
        caption_url = None
        for track in tracks:
            if track.get('languageCode') == 'en':
                caption_url = track.get('baseUrl')
                break
        
        # Fallback to first track
        if not caption_url and tracks:
            caption_url = tracks[0].get('baseUrl')
            print("⚠️ No English track found, using first available track")

        if not caption_url:
            raise Exception("No caption URL found in tracks")
            
    except json.JSONDecodeError as je:
        raise Exception(f"Failed to parse ytInitialPlayerResponse JSON: {je}")
    except Exception as e:
        raise Exception(f"Failed to extract caption URL: {e}")

    # 5. Fetch captions (try XML first, then VTT)
    try:
        # Debug: Show cookies being used
        print(f"🍪 Session cookies: {len(session.cookies)} cookies")
        for cookie in session.cookies:
            print(f"  - {cookie.name}: {cookie.value[:20]}...")
        
        # Try XML format (default)
        print(f"⬇️ Fetching XML captions from: {caption_url[:100]}...")
        
        # Add headers that might be required for caption API
        caption_headers = {
            'Referer': url,  # Important: Tell YouTube where we came from
            'Accept': '*/*',
        }
        
        xml_response = session.get(caption_url, headers=caption_headers)
        print(f"📡 XML Status: {xml_response.status_code}")
        print(f"📡 XML Response headers: {dict(xml_response.headers)}")
        xml_response.raise_for_status()
        xml_content = xml_response.text
        
        print(f"📄 XML content length: {len(xml_content)}")
        print(f"📄 XML content preview: {xml_content[:200]}")
        
        if len(xml_content) > 50:
            full_text = _parse_xml(xml_content)
            if full_text and len(full_text) > 10:
                print(f"✅ Successfully extracted {len(full_text)} characters from XML")
                return full_text, loaded_cookie_count
            else:
                print(f"⚠️ Parsed XML was too short: {len(full_text) if full_text else 0} chars")
        
        # Try VTT format as fallback
        print("⚠️ XML failed, trying VTT format...")
        vtt_url = caption_url + '&fmt=vtt' if '&fmt=' not in caption_url else caption_url
        vtt_response = session.get(vtt_url, headers=caption_headers)
        vtt_response.raise_for_status()
        vtt_content = vtt_response.text
        
        print(f"📄 VTT content length: {len(vtt_content)}")
        
        if len(vtt_content) > 50:
            full_text = _parse_vtt(vtt_content)
            if full_text and len(full_text) > 10:
                print(f"✅ Successfully extracted {len(full_text)} characters from VTT")
                return full_text, loaded_cookie_count
                
        raise Exception(f"Both XML and VTT formats returned insufficient content (XML: {len(xml_content)} bytes, VTT: {len(vtt_content)} bytes)")
        
    except Exception as e:
        raise Exception(f"Failed to fetch/parse captions: {e}")
    finally:
        # Cleanup cookie file
        if cookies_file and os.path.exists(cookies_file):
            os.unlink(cookies_file)
            
    # Cleanup is handled by tempfile context managers, but we need to clean up cookies
    if cookies_file and os.path.exists(cookies_file):
        os.unlink(cookies_file)

@app.route('/api/extract-transcript', methods=['POST'])
def extract_transcript():
    """Extract transcript from YouTube video"""
    DEPLOYMENT_ID = "v2025.11.21.07"
    try:
        data = request.json
        youtube_url = data.get('url', '')
        
        if not youtube_url:
            return jsonify({'error': 'YouTube URL is required'}), 400
        
        # Extract video ID
        video_id = extract_video_id(youtube_url)
        if not video_id:
            return jsonify({'error': 'Invalid YouTube URL'}), 400
        
        # Get transcript
        try:
            full_transcript, cookie_count = _get_youtube_transcript_with_cookies(video_id)
            
            return jsonify({
                'success': True,
                'video_id': video_id,
                'transcript': full_transcript,
                'length': len(full_transcript),
                'deployment_id': DEPLOYMENT_ID
            })
            
        except Exception as e:
            return jsonify({'error': f'Error fetching transcript: {str(e)} [Deployment ID: {DEPLOYMENT_ID}]'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)} [Deployment ID: {DEPLOYMENT_ID}]'}), 500

@app.route('/api/diagnostics', methods=['GET'])
def diagnostics():
    """Diagnostic endpoint to check configuration"""
    cookies_content = os.getenv('YOUTUBE_COOKIES', '')
    
    diagnostics_info = {
        'deployment_id': 'v2025.11.21.07',
        'cookies_configured': bool(cookies_content),
        'cookies_line_count': len(cookies_content.splitlines()) if cookies_content else 0,
        'cookies_has_header': cookies_content.startswith('# Netscape') if cookies_content else False,
        'gemini_api_configured': bool(os.getenv('GEMINI_API_KEY')),
    }
    
    return jsonify(diagnostics_info)

@app.route('/api/summarize', methods=['POST'])
def summarize():
    """Summarize text using Gemini API with customizable length and tone"""
    try:
        data = request.json
        transcript = data.get('transcript', '')
        length = data.get('length', 'medium')  # short, medium, long
        tone = data.get('tone', 'conversational')  # conversational, professional, technical
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400
        
        # Get API key from environment variable
        api_key = os.getenv('GEMINI_API_KEY')
        
        if not api_key:
            return jsonify({'error': 'API key not configured. Please add GEMINI_API_KEY to .env file'}), 500
        
        # Configure Gemini API
        genai.configure(api_key=api_key)
        
        # Use Gemini 2.5 Flash model for summarization
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build prompt based on preferences
        prompt = build_summary_prompt(transcript, length, tone)

        # Generate summary
        response = model.generate_content(prompt)
        
        return jsonify({
            'success': True,
            'summary': response.text
        })
        
    except Exception as e:
        error_message = str(e)
        if 'API_KEY_INVALID' in error_message or 'invalid API key' in error_message.lower():
            return jsonify({'error': 'Invalid API key in .env file. Please check your GEMINI_API_KEY.'}), 401
        return jsonify({'error': f'Error generating summary: {error_message}'}), 500

def build_summary_prompt(transcript, length, tone):
    """Build a customized prompt based on user preferences"""
    
    # Length instructions
    length_instructions = {
        'short': 'Provide a brief, concise summary in 3-5 sentences focusing only on the most critical points.',
        'medium': 'Provide a balanced summary with an overview, key points (3-5 bullet points), and a brief conclusion.',
        'long': 'Provide a comprehensive, detailed summary covering all major topics, subtopics, important details, examples, and conclusions.'
    }
    
    # Tone instructions
    tone_instructions = {
        'conversational': 'Use a friendly, conversational tone that is easy to read and engaging. Use natural language and explain concepts clearly.',
        'professional': 'Use a formal, professional tone suitable for business or academic contexts. Be clear, objective, and well-structured.',
        'technical': 'Direct, technical, and dense tone. Omit all introductions, greetings, and conversational transition phrases. Verbosity is useless; reduce it to zero. The information will be presented directly to an audience of university students. Focus purely on facts, data, and technical details.'
    }
    
    # Build the prompt
    if tone == 'technical':
        # Special format for technical tone - no fluff
        prompt = f"""{tone_instructions[tone]}

{length_instructions[length]}

Transcript:
{transcript}"""
    else:
        # Standard format for conversational and professional tones
        prompt = f"""Please summarize the following YouTube video transcript.

**Length**: {length_instructions[length]}

**Tone**: {tone_instructions[tone]}

**Structure your summary appropriately based on the length:**
- Short: Single paragraph with key takeaways
- Medium: Overview + Key Points (bullet list) + Conclusion
- Long: Detailed sections with Overview, Main Topics, Key Points, Important Details, Examples, and Conclusion

Transcript:
{transcript}"""
    
    return prompt

if __name__ == '__main__':
    print("🚀 YouTube Summarizer Server Starting...")
    print("📍 Server running at: http://localhost:5000")
    print("🔑 API Key loaded from .env file")
    print("✨ Ready to summarize YouTube videos!")
    
    # Get port from environment variable (for deployment) or use 5000 for local
    port = int(os.getenv('PORT', 5000))
    
    # Run the Flask app
    # Use 0.0.0.0 to allow external connections (required for deployment)
    app.run(host='0.0.0.0', port=port, debug=True)
