from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import yt_dlp
import google.generativeai as genai
import re
import os
import tempfile
import requests
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

def _parse_vtt(vtt_content):
    """Parse VTT subtitle content to extract plain text"""
    lines = vtt_content.splitlines()
    text_lines = []
    
    # Simple VTT parser: skip headers, timestamps, and empty lines
    # VTT timestamps look like: 00:00:00.000 --> 00:00:00.000
    timestamp_pattern = re.compile(r'\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}')
    
    seen_lines = set() # Deduplicate lines
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
            continue
        if timestamp_pattern.match(line):
            continue
        if line.startswith('<c>'): # Skip color tags if any, though usually they are inside text
            pass
            
        # Remove HTML-like tags (e.g. <c.colorE5E5E5>)
        clean_line = re.sub(r'<[^>]+>', '', line)
        clean_line = clean_line.strip()
        
        if clean_line and clean_line not in seen_lines:
            text_lines.append(clean_line)
            seen_lines.add(clean_line)
            
    return " ".join(text_lines)

def _get_youtube_transcript_with_cookies(video_id):
    """Extract transcript from YouTube video using yt-dlp, with optional cookies."""
    cookies_content = os.getenv('YOUTUBE_COOKIES')
    cookies_file = None
    loaded_cookie_count = 0
    
    try:
        if cookies_content:
            # Ensure it has the Netscape header
            if not cookies_content.startswith('# Netscape HTTP Cookie File'):
                cookies_content = '# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie.html\n\n' + cookies_content
            
            loaded_cookie_count = len(cookies_content.splitlines())

            # Create a temporary file for cookies
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
                f.write(cookies_content)
                cookies_file = f.name
                print(f"🍪 Using cookies for authentication (file: {cookies_file})")
        
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
            'quiet': True,
            'cookiefile': cookies_file if cookies_file else None,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.youtube.com/',
            }
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Check for requested subtitles
            if 'requested_subtitles' in info and 'en' in info['requested_subtitles']:
                sub_info = info['requested_subtitles']['en']
                sub_url = sub_info.get('url')
                
                if sub_url:
                    print(f"⬇️ Fetching subtitles from: {sub_url}")
                    response = requests.get(sub_url)
                    response.raise_for_status()
                    full_text = _parse_vtt(response.text)
                    return full_text, loaded_cookie_count
            
            # Fallback: check automatic captions if manual not found/requested
            # (yt-dlp puts auto caps in requested_subtitles if writeautomaticsub is True and no manual subs exist)
            
            raise Exception("No English subtitles found for this video.")

    except Exception as e:
        raise Exception(f"{str(e)} [Cookies Configured: {'Yes' if cookies_file else 'No'}]")
            
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
            
        except Exception as e:
            return jsonify({'error': f'Error fetching transcript: {str(e)}'}), 500
            
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
