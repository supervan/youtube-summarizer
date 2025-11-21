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
        
        # Source 1: GitHub Proxy Lists (Raw Text) - HTTP + SOCKS
        github_sources = [
            "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",
            "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt",
            "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks4.txt",
            "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
            "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt",
            "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks4.txt",
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
                    
                    # Determine protocol based on URL
                    protocol = "http"
                    if "socks5" in url:
                        protocol = "socks5"
                    elif "socks4" in url:
                        protocol = "socks4"
                        
                    # Add valid looking proxies
                    for proxy in matches:
                        self.proxies.append(f"{protocol}://{proxy}")
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
        
        # Shuffle and take top 100 to test (we need to find at least a few good ones)
        test_batch = self.proxies[:]
        random.shuffle(test_batch)
        test_batch = test_batch[:100]
        
        for i, proxy_url in enumerate(test_batch):
            if self._check_proxy(proxy_url):
                self.verified_proxies.append(proxy_url)
                print(f"   ✅ Working proxy found: {proxy_url}")
                if len(self.verified_proxies) >= 5: # Stop after finding 5 good ones
                    break
            
            if i % 10 == 0:
                print(f"   Checked {i} proxies...")
        
        print(f"🎉 Found {len(self.verified_proxies)} verified working proxies")

    def _check_proxy(self, proxy_url):
        """Check if a proxy actually works with YouTube"""
        try:
            proxies = {'http': proxy_url, 'https': proxy_url}
            # Try to fetch a lightweight YouTube page with short timeout
            resp = requests.get('https://www.youtube.com/favicon.ico', proxies=proxies, timeout=2)
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
    """Extract transcript from YouTube video using yt-dlp with free proxy rotation."""
    
    # Try up to 10 times with different proxies (reduced from 20 to avoid timeout)
    max_retries = 10
    last_error = None
    
    # Global timeout safety - stop trying if we've spent more than 25 seconds
    start_time = time.time()
    
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    # Handle cookies if provided in environment
    cookies_content = os.getenv('YOUTUBE_COOKIES')
    cookies_file = None
    
    # Create a temporary cookies file if content exists
    if cookies_content:
        try:
            fd, cookies_file = tempfile.mkstemp(suffix='.txt', text=True)
            with os.fdopen(fd, 'w') as f:
                f.write(cookies_content)
            print(f"🍪 Loaded cookies from environment ({len(cookies_content)} chars)")
        except Exception as e:
            print(f"⚠️ Failed to create cookies file: {e}")
            cookies_file = None
            
    try:
        for attempt in range(max_retries):
            # Check global timeout
            if time.time() - start_time > 25:
                print("⚠️ Global timeout reached (25s), stopping retries")
                break
                
            # Get a proxy (first attempt can be direct if no working proxy known)
            proxies = proxy_manager.get_proxy() if attempt > 0 else None
            
            proxy_url = proxies['http'] if proxies else None
            proxy_msg = f"via proxy {proxy_url}" if proxy_url else "direct connection"
            print(f"🚀 Attempt {attempt+1}/{max_retries}: Fetching transcript {proxy_msg}")
            
            # Create a temporary directory for this attempt
            with tempfile.TemporaryDirectory() as temp_dir:
                try:
                    # Configure yt-dlp options
                    ydl_opts = {
                        'skip_download': True,
                        'writesubtitles': True,
                        'writeautomaticsub': True,
                        'subtitleslangs': ['en'],
                        'subtitlesformat': 'vtt',
                        'outtmpl': os.path.join(temp_dir, '%(id)s'),
                        'quiet': True,
                        'no_warnings': True,
                        # Optimization settings to fail fast on bad proxies
                        'socket_timeout': 5, # 5 seconds timeout
                        'retries': 1,        # Retry only once internally
                        'fragment_retries': 1,
                    }
                    
                    # Add proxy if available
                    if proxy_url:
                        ydl_opts['proxy'] = proxy_url
                        
                    # Add cookies if available
                    if cookies_file:
                        ydl_opts['cookiefile'] = cookies_file
                    
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        # Download subtitles
                        ydl.extract_info(video_url, download=True)
                        
                        # Look for the downloaded VTT file
                        vtt_file = None
                        for filename in os.listdir(temp_dir):
                            if filename.endswith('.vtt'):
                                vtt_file = os.path.join(temp_dir, filename)
                                break
                        
                        if vtt_file:
                            print(f"✅ Success! Downloaded VTT file {proxy_msg}")
                            
                            # Read and parse the VTT file
                            with open(vtt_file, 'r', encoding='utf-8') as f:
                                vtt_content = f.read()
                                
                            full_text = _parse_vtt(vtt_content)
                            
                            if not full_text:
                                raise Exception("Parsed transcript is empty")
                                
                            print(f"   Extracted {len(full_text)} chars")
                            
                            # Remember this working proxy for next time
                            if proxies:
                                proxy_manager.working_proxy = proxies
                                
                            return full_text, 0
                        else:
                            raise Exception("No subtitle file downloaded")
                    
                except Exception as e:
                    print(f"❌ Attempt {attempt+1} failed: {str(e)}")
                    last_error = e
                    # If proxy failed, mark it
                    if proxies:
                        proxy_manager.mark_failed(proxies)
                    # If direct connection failed, force proxy next time
                    elif attempt == 0:
                        print("⚠️ Direct connection failed, switching to proxies...")
                        proxy_manager._refresh_proxies()
        
        # Final fallback attempt: Direct connection if we haven't tried it recently and have time
        if time.time() - start_time < 28:
            print("⚠️ All proxy attempts failed. Trying one last direct connection...")
            try:
                 with tempfile.TemporaryDirectory() as temp_dir:
                    ydl_opts = {
                        'skip_download': True,
                        'writesubtitles': True,
                        'writeautomaticsub': True,
                        'subtitleslangs': ['en'],
                        'subtitlesformat': 'vtt',
                        'outtmpl': os.path.join(temp_dir, '%(id)s'),
                        'quiet': True,
                        'no_warnings': True,
                        'socket_timeout': 5,
                    }
                    if cookies_file:
                        ydl_opts['cookiefile'] = cookies_file
                        
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.extract_info(video_url, download=True)
                        vtt_file = None
                        for filename in os.listdir(temp_dir):
                            if filename.endswith('.vtt'):
                                vtt_file = os.path.join(temp_dir, filename)
                                break
                        if vtt_file:
                            with open(vtt_file, 'r', encoding='utf-8') as f:
                                return _parse_vtt(f.read()), 0
            except Exception as e:
                print(f"❌ Final fallback failed: {e}")

        raise Exception(f"Failed after {max_retries} attempts. Last error: {last_error}")
        
    finally:
        # Clean up cookies file
        if cookies_file and os.path.exists(cookies_file):
            try:
                os.unlink(cookies_file)
            except:
                pass

@app.route('/api/extract-transcript', methods=['POST'])
def extract_transcript():
    """Extract transcript from YouTube video"""
    DEPLOYMENT_ID = "v2025.11.21.16"
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
        'deployment_id': 'v2025.11.21.16',
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
