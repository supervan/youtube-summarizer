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

def _get_youtube_transcript_with_cookies(video_id):
    """Extract transcript from YouTube video using youtube-transcript-api with optional proxy."""
    
    # Log library version for debugging
    try:
        import youtube_transcript_api
        version = getattr(youtube_transcript_api, '__version__', 'unknown')
        print(f"📦 youtube-transcript-api version: {version}")
        print(f"📦 Available methods: {[m for m in dir(YouTubeTranscriptApi) if not m.startswith('_')]}")
    except Exception as e:
        print(f"⚠️ Could not check library version: {e}")
    
    # Check if we should use a proxy
    scraperapi_key = os.getenv('SCRAPERAPI_KEY')
    
    # Setup proxy if available
    proxies = None
    if scraperapi_key:
        print(f"🔄 Using ScraperAPI proxy to bypass IP blocking")
        proxy_url = f"http://scraperapi:{scraperapi_key}@proxy-server.scraperapi.com:8001"
        proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
    else:
        print(f"⚠️ No proxy configured - attempting direct connection")
    
    try:
        # Use youtube-transcript-api (simple and reliable)
        print(f"🚀 Fetching transcript with youtube-transcript-api for video: {video_id}")
        
        # Try to get transcript list first (supports language selection)
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id, proxies=proxies)
            
            # Try to find English transcript (manual or auto-generated)
            transcript = None
            try:
                # Prefer manually created transcripts
                transcript = transcript_list.find_manually_created_transcript(['en'])
                print("✅ Found manually created English transcript")
            except:
                try:
                    # Fall back to auto-generated
                    transcript = transcript_list.find_generated_transcript(['en'])
                    print("✅ Found auto-generated English transcript")
                except:
                    # Try any available transcript
                    for t in transcript_list:
                        transcript = t
                        print(f"✅ Using available transcript: {t.language}")
                        break
            
            if transcript:
                fetched_transcript = transcript.fetch()
                full_text = " ".join([entry['text'] for entry in fetched_transcript])
                full_text = " ".join(full_text.split())  # Clean whitespace
                
                print(f"✅ Successfully extracted {len(full_text)} characters")
                return full_text, 0
            else:
                raise Exception("No transcripts available for this video")
                
        except Exception as list_error:
            # Fallback to simple get_transcript (older API)
            print(f"⚠️ list_transcripts failed ({list_error}), trying get_transcript...")
            fetched_transcript = YouTubeTranscriptApi.get_transcript(video_id, proxies=proxies)
            full_text = " ".join([entry['text'] for entry in fetched_transcript])
            full_text = " ".join(full_text.split())
            
            print(f"✅ Successfully extracted {len(full_text)} characters (via get_transcript)")
            return full_text, 0
            
    except Exception as e:
        error_msg = f"Failed to fetch transcript: {str(e)}"
        if not scraperapi_key and "blocked" in str(e).lower():
            error_msg += " - Consider setting SCRAPERAPI_KEY to bypass IP blocking"
        raise Exception(error_msg)
            
    # Cleanup is handled by tempfile context managers, but we need to clean up cookies
    if cookies_file and os.path.exists(cookies_file):
        os.unlink(cookies_file)

@app.route('/api/extract-transcript', methods=['POST'])
def extract_transcript():
    """Extract transcript from YouTube video"""
    DEPLOYMENT_ID = "v2025.11.21.10"
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
    scraperapi_key = os.getenv('SCRAPERAPI_KEY', '')
    
    diagnostics_info = {
        'deployment_id': 'v2025.11.21.09',
        'cookies_configured': bool(cookies_content),
        'cookies_line_count': len(cookies_content.splitlines()) if cookies_content else 0,
        'cookies_has_header': cookies_content.startswith('# Netscape') if cookies_content else False,
        'gemini_api_configured': bool(os.getenv('GEMINI_API_KEY')),
        'proxy_configured': bool(scraperapi_key),
        'proxy_key_length': len(scraperapi_key) if scraperapi_key else 0,
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
