from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import yt_dlp
import google.generativeai as genai
import os
import re
import tempfile
import shutil
import time
import random
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

class FreeProxyManager:
    """Manages a pool of free proxies from multiple sources with validation"""
    def __init__(self):
        self.proxies = []
        self.last_update = 0
        self.working_proxy = None
        self.verified_proxies = []
        
    def get_proxy(self):
        """Get a working proxy, refreshing pool if needed"""
        # If we have a known working proxy, try it first
        if self.working_proxy:
            return self.working_proxy
            
        # If we have verified proxies, return one
        if self.verified_proxies:
            proxy = random.choice(self.verified_proxies)
            return {'http': proxy, 'https': proxy}
            
        # Update pool if empty or old (older than 30 minutes)
        if not self.proxies or time.time() - self.last_update > 1800:
            self._refresh_proxies()
            
        # If we still have no verified proxies, try unverified ones as fallback
        if self.proxies:
            proxy = random.choice(self.proxies)
            return {'http': proxy, 'https': proxy}
        return None
        
    def _refresh_proxies(self):
        """Fetch fresh proxies from multiple free sources"""
        print("🔄 Refreshing free proxy list from multiple sources...")
        self.proxies = []
        self.verified_proxies = []
        
        # Source 1: GitHub Proxy Lists (Raw Text)
        github_sources = [
            "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",
            "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
            "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt"
        ]
        
        for url in github_sources:
            try:
                print(f"📥 Fetching from {url}...")
                resp = requests.get(url, timeout=5)
                if resp.status_code == 200:
                    # Extract IP:Port patterns
                    matches = re.findall(r'(\d+\.\d+\.\d+\.\d+:\d+)', resp.text)
                    print(f"   Found {len(matches)} proxies")
                    # Add valid looking proxies
                    for proxy in matches:
                        self.proxies.append(f"http://{proxy}")
            except Exception as e:
                print(f"⚠️ Failed to fetch from {url}: {e}")

        # Source 2: sslproxies.org (Backup)
        try:
            print("📥 Fetching from sslproxies.org...")
            resp = requests.get('https://www.sslproxies.org/', timeout=5)
            matches = re.findall(r'(\d+\.\d+\.\d+\.\d+):(\d+)', resp.text)
            for ip, port in matches[:50]:
                self.proxies.append(f"http://{ip}:{port}")
            print(f"   Found {len(matches)} proxies")
        except Exception as e:
            print(f"⚠️ Failed to fetch from sslproxies.org: {e}")
            
        # Deduplicate
        self.proxies = list(set(self.proxies))
        print(f"✅ Total unique proxies found: {len(self.proxies)}")
        
        # Validate a subset to find working ones immediately
        self._validate_initial_batch()
        
        self.last_update = time.time()

    def _validate_initial_batch(self):
        """Validate a batch of proxies to find some working ones quickly"""
        print("🕵️ Validating random subset of proxies...")
        
        # Shuffle and take top 20 to test
        test_batch = self.proxies[:]
        random.shuffle(test_batch)
        test_batch = test_batch[:20]
        
        for proxy_url in test_batch:
            if self._check_proxy(proxy_url):
                self.verified_proxies.append(proxy_url)
                print(f"   ✅ Working proxy found: {proxy_url}")
                if len(self.verified_proxies) >= 3: # Stop after finding 3 good ones to save time
                    break
        
        print(f"🎉 Found {len(self.verified_proxies)} verified working proxies")

    def _check_proxy(self, proxy_url):
        """Check if a proxy actually works with YouTube"""
        try:
            proxies = {'http': proxy_url, 'https': proxy_url}
            # Try to fetch a lightweight YouTube page
            resp = requests.get('https://www.youtube.com/favicon.ico', proxies=proxies, timeout=3)
            return resp.status_code == 200
        except:
            return False

    def mark_failed(self, proxy_dict):
        """Mark a proxy as failed"""
        if not proxy_dict:
            return
        proxy_url = proxy_dict.get('http')
        
        if proxy_url in self.verified_proxies:
            self.verified_proxies.remove(proxy_url)
            
        if proxy_url in self.proxies:
            self.proxies.remove(proxy_url)
            
        if self.working_proxy == proxy_dict:
            self.working_proxy = None

# Global proxy manager instance
proxy_manager = FreeProxyManager()

def _get_youtube_transcript_with_cookies(video_id):
    """Extract transcript from YouTube video using youtube-transcript-api with free proxy rotation."""
    
    # Log library version for debugging
    try:
        import youtube_transcript_api
        version = getattr(youtube_transcript_api, '__version__', 'unknown')
        print(f"📦 youtube-transcript-api version: {version}")
    except Exception as e:
        print(f"⚠️ Could not check library version: {e}")
    
    # Try up to 5 times with different proxies
    max_retries = 5
    last_error = None
    
    for attempt in range(max_retries):
        # Get a proxy (first attempt can be direct if no working proxy known)
        proxies = proxy_manager.get_proxy() if attempt > 0 else None
        
        proxy_msg = f"via proxy {proxies['http']}" if proxies else "direct connection"
        print(f"🚀 Attempt {attempt+1}/{max_retries}: Fetching transcript {proxy_msg}")
        
        try:
            # Try to get transcript list
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id, proxies=proxies)
            
            # Try to find English transcript
            transcript = None
            try:
                transcript = transcript_list.find_manually_created_transcript(['en'])
            except:
                try:
                    transcript = transcript_list.find_generated_transcript(['en'])
                except:
                    for t in transcript_list:
                        transcript = t
                        break
            
            if transcript:
                fetched_transcript = transcript.fetch()
                full_text = " ".join([entry['text'] for entry in fetched_transcript])
                full_text = " ".join(full_text.split())
                
                print(f"✅ Success! Extracted {len(full_text)} chars {proxy_msg}")
                
                # Remember this working proxy for next time
                if proxies:
                    proxy_manager.working_proxy = proxies
                    
                return full_text, 0
            else:
                raise Exception("No transcripts available")
                
        except Exception as e:
            print(f"❌ Attempt {attempt+1} failed: {str(e)}")
            last_error = e
            # If proxy failed, mark it
            if proxies:
                proxy_manager.mark_failed(proxies)
            # If direct connection failed (and it was a block), force proxy next time
            elif "Subtitles are disabled" in str(e) or "cookie" in str(e).lower():
                print("⚠️ Direct connection blocked, switching to proxies...")
                proxy_manager._refresh_proxies()
    
    raise Exception(f"Failed after {max_retries} attempts. Last error: {last_error}")
            
    # Cleanup is handled by tempfile context managers, but we need to clean up cookies
    if cookies_file and os.path.exists(cookies_file):
        os.unlink(cookies_file)

@app.route('/api/extract-transcript', methods=['POST'])
def extract_transcript():
    """Extract transcript from YouTube video"""
    DEPLOYMENT_ID = "v2025.11.21.12"
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
        'deployment_id': 'v2025.11.21.12',
        'cookies_configured': bool(cookies_content),
        'cookies_line_count': len(cookies_content.splitlines()) if cookies_content else 0,
        'cookies_has_header': cookies_content.startswith('# Netscape') if cookies_content else False,
        'gemini_api_configured': bool(os.getenv('GEMINI_API_KEY')),
        'proxy_mode': 'free_rotation',
        'cached_proxies': len(proxy_manager.proxies)
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
