from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
import google.generativeai as genai
import re
import os
import tempfile
from dotenv import load_dotenv

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

def _get_youtube_transcript_with_cookies(video_id):
    """Extract transcript from YouTube video using youtube_transcript_api, with optional cookies."""
    cookies_content = os.getenv('YOUTUBE_COOKIES')
    cookies_file = None
    
    try:
        if cookies_content:
            # Ensure it has the Netscape header (MozillaCookieJar is strict)
            if not cookies_content.startswith('# Netscape HTTP Cookie File'):
                cookies_content = '# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie.html\n\n' + cookies_content

            # Create a temporary file for cookies
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
                f.write(cookies_content)
                cookies_file = f.name
                print(f"🍪 Using cookies for authentication (file: {cookies_file})")
        
        # Create session with cookies if available
        import requests
        import http.cookiejar
        
        session = requests.Session()
        
        # Set a real browser User-Agent and other headers
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9"
        })

        loaded_cookie_count = 0
        if cookies_file:
            session.cookies = http.cookiejar.MozillaCookieJar(cookies_file)
            try:
                session.cookies.load(ignore_discard=True, ignore_expires=True)
                loaded_cookie_count = len(session.cookies)
                print(f"🍪 Cookies loaded successfully from {cookies_file}. Count: {loaded_cookie_count}")
            except Exception as e:
                print(f"⚠️ Failed to load cookies: {e}")
                # If loading fails, we still try with the session (it has the User-Agent at least)
        
        # Create transcript API instance with the session
        # v1.2.3 accepts http_client in constructor
        transcript_api = YouTubeTranscriptApi(http_client=session)
        
        # Fetch transcript
        # Use .fetch() method which is correct for v1.2.3+
        transcript_list = transcript_api.fetch(
            video_id, 
            languages=['en']
        )
        
        # Combine transcript text
        # fetch() returns FetchedTranscriptSnippet objects with .text attribute
        full_text = " ".join([item.text for item in transcript_list])
        return full_text, loaded_cookie_count
            
    finally:
        # Clean up temporary cookie file
        if cookies_file and os.path.exists(cookies_file):
            os.unlink(cookies_file)

@app.route('/api/extract-transcript', methods=['POST'])
def extract_transcript():
    """Extract transcript from YouTube video"""
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
                'length': len(full_transcript)
            })
            
        except TranscriptsDisabled:
            return jsonify({'error': 'Transcripts are disabled for this video'}), 400
        except NoTranscriptFound:
            return jsonify({'error': 'No transcript found for this video'}), 400
        except VideoUnavailable:
            return jsonify({'error': 'Video is unavailable'}), 400
        except Exception as e:
            # Check if it's the specific "Sign in to confirm you're not a bot" error
            error_msg = str(e)
            if "Sign in to confirm you're not a bot" in error_msg:
                error_msg = "YouTube is asking for a sign-in verification. Your cookies might be expired or invalid."
            
            # Add debug info about cookies
            cookies_content = os.getenv('YOUTUBE_COOKIES')
            cookie_status = "✅ Present" if cookies_content else "❌ Missing (Env var not set)"
            
            # Count loaded cookies if session exists (we can't easily access the local session variable here, 
            # so we'll infer from the content for now, or we could move the session creation out)
            # Actually, let's just check the content format
            cookie_lines = len(cookies_content.splitlines()) if cookies_content else 0
            
            # We can't access loaded_cookie_count here easily because it's inside the try block of _get_youtube_transcript_with_cookies
            # But we can try to re-parse or just rely on lines for now. 
            # Wait, I changed the return signature of _get_youtube_transcript_with_cookies to return a tuple!
            # So the exception handling needs to be aware of that? No, exception happens inside.
            
            debug_info = f"[Debug Info]\nCookies Configured: {cookie_status}\nCookie Content Lines: {cookie_lines}"
            
            if cookies_content and cookie_lines < 2:
                 debug_info += "\n⚠️ WARNING: Cookie content has very few lines. Newlines might be missing in the Environment Variable!"
            
            return jsonify({
                'error': f"{error_msg}\n\n{debug_info}"
            }), 500
            
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

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
