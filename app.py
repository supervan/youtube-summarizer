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
import json
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
    """Parse VTT subtitle content to extract text with timestamps"""
    lines = vtt_content.splitlines()
    text_lines = []
    seen_lines = set()
    
    current_timestamp = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Skip headers
        if line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
            continue
            
        # Extract timestamp (lines containing -->)
        if '-->' in line:
            # Format: 00:00:00.000 --> 00:00:05.000
            try:
                start_time = line.split('-->')[0].strip()
                # Convert 00:00:00.000 to 00:00 format
                parts = start_time.split(':')
                if len(parts) >= 2:
                    # Take minutes and seconds, ignore milliseconds
                    minutes = parts[-2]
                    seconds = parts[-1].split('.')[0]
                    current_timestamp = f"[{minutes}:{seconds}]"
            except:
                pass
            continue
            
        # Skip sequence numbers
        if line.isdigit():
            continue
            
        # Remove HTML-like tags
        clean_line = re.sub(r'<[^>]+>', '', line)
        clean_line = clean_line.strip()
        
        if not clean_line:
            continue
            
        # Add to text if not duplicate
        if clean_line not in seen_lines:
            if current_timestamp:
                text_lines.append(f"{current_timestamp} {clean_line}")
                # Only use timestamp for the first line of a block to avoid clutter
                current_timestamp = None 
            else:
                text_lines.append(clean_line)
            seen_lines.add(clean_line)
            
    return " ".join(text_lines)

class FreeProxyManager:
    """
    Manages a pool of free proxies from multiple sources with validation.
    
    This class is responsible for:
    1. Fetching free proxies from various GitHub repositories and websites.
    2. Validating these proxies to ensure they work with YouTube.
    3. maintaining a list of verified working proxies.
    4. Rotating through proxies to avoid IP bans.
    """
    def __init__(self):
        self.proxies = []
        self.last_update = 0
        self.working_proxy = None
        self.verified_proxies = []
        
    def get_proxy(self):
        """
        Get a working proxy, refreshing pool if needed.
        
        Returns:
            dict: A dictionary containing 'http' and 'https' keys with the proxy URL.
            None: If no proxy is available.
        """
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
        """
        Fetch fresh proxies from multiple free sources.
        
        Sources include various GitHub repositories that maintain lists of free HTTP, SOCKS4, and SOCKS5 proxies.
        """
        print("🔄 Refreshing free proxy list from multiple sources...")
        self.proxies = []
        self.verified_proxies = []
        
        # Source 1: GitHub Proxy Lists (Prioritize SOCKS)
        github_sources = [
            "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt",
            "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks4.txt",
            "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt",
            "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks4.txt",
            "https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5_RAW.txt",
            "https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS4_RAW.txt",
            # HTTP proxies are often unreliable for HTTPS, put them last
            "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt", 
            "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
        ]
        
        for url in github_sources:
            # Stop if we have enough proxies
            if len(self.proxies) > 2000:
                break

            try:
                print(f"📥 Fetching from {url}...")
                resp = requests.get(url, timeout=2)
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
                continue

        # Deduplicate
        self.proxies = list(set(self.proxies))
        
        # Sort to put SOCKS proxies first
        self.proxies.sort(key=lambda x: 0 if x.startswith('socks') else 1)
        
        print(f"✅ Total unique proxies found: {len(self.proxies)}")
        
        # Validate a subset to find working ones immediately
        self._validate_initial_batch()
        
        self.last_update = time.time()

    def _validate_initial_batch(self):
        """
        Validate a batch of proxies to find some working ones quickly.
        """
        print("🕵️ Validating random subset of proxies...")
        
        # Take top 50 (mostly SOCKS due to sort) and some random ones
        top_proxies = self.proxies[:50]
        random_proxies = random.sample(self.proxies[50:], min(50, len(self.proxies[50:]))) if len(self.proxies) > 50 else []
        
        test_batch = top_proxies + random_proxies
        random.shuffle(test_batch)
        
        # Limit the number of checks to avoid hanging for too long
        max_checks = 15 
        
        for i, proxy_url in enumerate(test_batch):
            if i >= max_checks:
                print(f"⚠️ Reached maximum validation checks ({max_checks}). Stopping validation.")
                break

            if self._check_proxy(proxy_url):
                self.verified_proxies.append(proxy_url)
                print(f"   ✅ Working proxy found: {proxy_url}")
                if len(self.verified_proxies) >= 3: # Stop after finding 3 good ones (reduced from 5)
                    break
            
            if i % 5 == 0:
                print(f"   Checked {i} proxies...")
        
        print(f"🎉 Found {len(self.verified_proxies)} verified working proxies")

    def _check_proxy(self, proxy_url):
        """
        Check if a proxy actually works with YouTube.
        """
        try:
            proxies = {'http': proxy_url, 'https': proxy_url}
            # Reduced timeout from 5s to 3s to fail faster
            resp = requests.get('https://www.youtube.com/results?search_query=test', proxies=proxies, timeout=3)
            return resp.status_code == 200
        except:
            return False

    def mark_failed(self, proxy_dict):
        """
        Mark a proxy as failed so it isn't used again immediately.
        
        Args:
            proxy_dict (dict): The proxy dictionary that failed.
        """
        if not proxy_dict:
            return
        proxy_url = proxy_dict.get('http')
        
        if proxy_url in self.verified_proxies:
            self.verified_proxies.remove(proxy_url)
            
        if proxy_url in self.proxies:
            self.proxies.remove(proxy_url)
            
        if self.working_proxy == proxy_dict:
            self.working_proxy = None

    def report_success(self, proxy_url):
        """
        Report a proxy as working so it's preferred next time.
        """
        if not proxy_url:
            return
            
        # Add to verified list if not already there
        if proxy_url not in self.verified_proxies:
            self.verified_proxies.append(proxy_url)
            
        # Set as current working proxy
        self.working_proxy = {'http': proxy_url, 'https': proxy_url}

# Global proxy manager instance
proxy_manager = FreeProxyManager()

def _get_youtube_transcript_with_cookies(video_id):
    """
    Extract transcript from YouTube video using a multi-method approach.
    
    Strategy:
    1. Try `YouTubeTranscriptApi` first (fastest, often works without proxies).
    2. Fallback to `yt-dlp` with proxy rotation if Method 1 fails.
    3. Use a pool of free proxies to bypass IP blocks.
    4. Support cookies for age-restricted content (if provided in env).
    
    Args:
        video_id (str): The YouTube video ID.
        
    Returns:
        tuple: (transcript_text, video_title, cookie_count)
    """
    """Extract transcript from YouTube video using yt-dlp with free proxy rotation."""
    
    # Try up to 5 times with different proxies (reduced from 10)
    max_retries = 5
    last_error = None
    
    # Global timeout safety - stop trying if we've spent more than 30 seconds (reduced from 50)
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
            
    # METHOD 1: Try YouTubeTranscriptApi (Fastest & often bypasses blocks)
    # We'll try direct first, then with proxies if needed
    try:
        print(f"🚀 Attempting Method 1: YouTubeTranscriptApi for {video_id}...")
        
        # Try direct connection first
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, cookies=cookies_file)
        except Exception as e:
            print(f"⚠️ Direct YouTubeTranscriptApi failed: {e}")
            
            # METHOD 1.5: Try yt-dlp Direct Connection (Often works when API is blocked)
            # We try this BEFORE proxies to avoid the heavy proxy refresh cost
            print("🚀 Attempting Method 1.5: yt-dlp Direct Connection...")
            try:
                 with tempfile.TemporaryDirectory() as temp_dir:
                    ydl_opts = {
                        'skip_download': True,
                        'writesubtitles': True,
                        'writeautomaticsub': True,
                        'subtitleslangs': ['en'],
                        'subtitlesformat': 'vtt',
                        'outtmpl': os.path.join(temp_dir, '%(id)s'),
                        'quiet': False, # Enable logs
                        'no_warnings': False,
                        'socket_timeout': 10,
                        'format': 'worst',
                        'ignore_no_formats_error': True,
                        'allow_unplayable_formats': True,
                        'force_ipv4': True,
                    }
                    if cookies_file:
                        ydl_opts['cookiefile'] = cookies_file
                            
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(video_url, download=True)
                        video_title = info.get('title', 'Unknown Title')
                        
                        vtt_file = None
                        files_in_dir = os.listdir(temp_dir)
                        for filename in files_in_dir:
                            if filename.endswith('.vtt'):
                                vtt_file = os.path.join(temp_dir, filename)
                                break
                        if vtt_file:
                            with open(vtt_file, 'r', encoding='utf-8') as f:
                                print("✅ Method 1.5 Success! yt-dlp direct worked.")
                                return _parse_vtt(f.read()), video_title, 0
            except Exception as ydl_e:
                print(f"⚠️ Method 1.5 failed: {ydl_e}")
                print("🔄 Falling back to proxies...")

            # Try with proxies
            transcript_list = None
            for attempt in range(3): # Try 3 proxies (reduced from 5)
                proxy = proxy_manager.get_proxy()
                if not proxy:
                    break
                print(f"   Retrying YouTubeTranscriptApi with proxy {proxy['http']}...")
                try:
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id, cookies=cookies_file, proxies=proxy)
                    proxy_manager.report_success(proxy['http']) # Mark as working
                    print("   ✅ Proxy success!")
                    break
                except Exception as pe:
                    print(f"   ❌ Proxy failed: {pe}")
                    proxy_manager.mark_failed(proxy)
            
            if not transcript_list:
                raise Exception("All YouTubeTranscriptApi attempts failed")

        # Parse transcript with timestamps
        formatted_lines = []
        for item in transcript_list:
            start = item['start']
            # Format seconds to MM:SS
            minutes = int(start // 60)
            seconds = int(start % 60)
            timestamp = f"[{minutes:02d}:{seconds:02d}]"
            formatted_lines.append(f"{timestamp} {item['text']}")
            
        full_text = " ".join(formatted_lines)
        print(f"✅ Method 1 Success! Extracted {len(full_text)} chars")
        
        # We need the title too. Since this API doesn't give it, we'll do a quick fetch
        # or just return a placeholder if we want to be super fast. 
        # Let's try a quick lightweight fetch for title using yt-dlp but WITHOUT downloading subs
        try:
            with yt_dlp.YoutubeDL({'quiet': True, 'skip_download': True}) as ydl:
                info = ydl.extract_info(video_url, download=False)
                video_title = info.get('title', 'Unknown Title')
        except:
            video_title = "YouTube Video (Title Unavailable)"
            
        return full_text, video_title, len(cookies_content) if cookies_content else 0
        
    except Exception as e:
        print(f"⚠️ Method 1 failed: {e}")
        
    # METHOD 2: yt-dlp with Proxy Rotation (Fallback)
    try:
        for attempt in range(max_retries):
            # Check global timeout
            if time.time() - start_time > 30:
                print("⚠️ Global timeout reached (30s), stopping retries")
                break
                
            # Get a proxy (first attempt can be direct if no working proxy known)
            # Since we already tried direct, we MUST use a proxy here
            proxies = proxy_manager.get_proxy()
            
            if not proxies:
                 print("⚠️ No proxies available, skipping proxy attempt")
                 continue

            proxy_url = proxies['http']
            print(f"🚀 Attempt {attempt+1}/{max_retries}: Fetching transcript via proxy {proxy_url}")
            
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
                        'quiet': False,      # ENABLE LOGS to see what's happening
                        'no_warnings': False,
                        # Optimization settings to fail fast on bad proxies
                        'socket_timeout': 5, # Reduced from 10s to 5s
                        'retries': 1,        # Retry only once internally
                        'fragment_retries': 1,
                        'force_ipv4': True,  # Avoid IPv6 issues
                        # Fix for "Requested format is not available"
                        'format': 'worst',   # We don't need video, so any format works. 'worst' is safest.
                        'extractor_args': {'youtube': {'player_client': ['web', 'android']}},
                        'ignore_no_formats_error': True,
                        'allow_unplayable_formats': True,
                    }
                    
                    # Add proxy
                    ydl_opts['proxy'] = proxy_url
                        
                    # Add cookies if available
                    if cookies_file:
                        ydl_opts['cookiefile'] = cookies_file
                    
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        # Download subtitles and metadata
                        info = ydl.extract_info(video_url, download=True)
                        video_title = info.get('title', 'Unknown Title')
                        
                        # Look for the downloaded VTT file
                        vtt_file = None
                        files_in_dir = os.listdir(temp_dir) # Debug: See what was downloaded
                        for filename in files_in_dir:
                            if filename.endswith('.vtt'):
                                vtt_file = os.path.join(temp_dir, filename)
                                break
                        
                        if vtt_file:
                            print(f"✅ Success! Downloaded VTT file via proxy")
                            
                            # Read and parse the VTT file
                            with open(vtt_file, 'r', encoding='utf-8') as f:
                                vtt_content = f.read()
                                
                            full_text = _parse_vtt(vtt_content)
                            
                            if not full_text:
                                raise Exception("Parsed transcript is empty")
                                
                            print(f"   Extracted {len(full_text)} chars")
                            
                            # Remember this working proxy for next time
                            proxy_manager.report_success(proxy_url)
                                
                            return full_text, video_title, len(cookies_content) if cookies_content else 0
                        else:
                            print(f"⚠️ No VTT file found. Files in temp dir: {files_in_dir}")
                            raise Exception(f"No subtitle file downloaded. Dir contents: {files_in_dir}")
                    
                except Exception as e:
                    print(f"❌ Attempt {attempt+1} failed: {str(e)}")
                    last_error = e
                    proxy_manager.mark_failed(proxies)
        
        # We already tried direct connection in Method 1.5, so if we fail here, we are done.
        raise Exception(f"Failed after {max_retries} attempts. {last_error}")
        
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
    DEPLOYMENT_ID = "v2025.11.21.30"
    try:
        data = request.json
        youtube_url = data.get('url', '')
        
        if not youtube_url:
            return jsonify({'error': 'YouTube URL is required'}), 400
        
        # Extract video ID
        video_id = extract_video_id(youtube_url)
        if not video_id:
            return jsonify({'error': 'Invalid YouTube URL'}), 400
        
        # Get transcript and title
        try:
            full_transcript, video_title, cookie_count = _get_youtube_transcript_with_cookies(video_id)
            
            return jsonify({
                'success': True,
                'video_id': video_id,
                'title': video_title,
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
        'deployment_id': 'v2025.11.21.30',
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
        'short': 'Provide a single short paragraph summary using simple language suitable for a 13-year-old.',
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

IMPORTANT: Include timestamps [MM:SS] for key points where possible, referencing the transcript.

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

**IMPORTANT**: You MUST include timestamps [MM:SS] from the transcript for every key point or major topic change. This allows the user to jump to that part of the video.

Transcript:
{transcript}"""
    
    return prompt

@app.route('/api/features', methods=['GET'])
def get_features():
    """Get feature flags from features.json"""
    try:
        with open('features.json', 'r') as f:
            features = json.load(f)
        return jsonify(features)
    except Exception as e:
        # Default fallback if file missing or error
        return jsonify({
            "chat": True,
            "steps": True,
            "quiz": True
        })

@app.route('/api/chat', methods=['POST'])
def chat_with_video():
    """Chat with the video transcript"""
    try:
        data = request.json
        transcript = data.get('transcript', '')
        question = data.get('question', '')
        
        if not transcript or not question:
            return jsonify({'error': 'Transcript and question are required'}), 400

        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            return jsonify({'error': 'API key not configured'}), 500
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""You are a helpful assistant answering questions based ONLY on the provided video transcript.
        
Transcript:
{transcript}

Question: {question}

Answer (be concise and direct, use markdown for formatting):"""

        response = model.generate_content(prompt)
        return jsonify({'success': True, 'answer': response.text})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/steps', methods=['POST'])
def extract_steps():
    """Extract actionable steps from the transcript"""
    try:
        data = request.json
        transcript = data.get('transcript', '')
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400

        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            return jsonify({'error': 'API key not configured'}), 500
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""Analyze the following transcript and determine if it contains instructions, a tutorial, or actionable advice.
        
If it DOES:
Extract the steps into a clear, numbered list. Use bold for the step title and normal text for the details.
Format as Markdown.

If it DOES NOT (e.g. it's just a vlog or opinion piece without steps):
Return exactly: "NO_STEPS_FOUND"

Transcript:
{transcript}"""

        response = model.generate_content(prompt)
        return jsonify({'success': True, 'steps': response.text})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz', methods=['POST'])
def generate_quiz():
    """Generate a 5-question quiz from the transcript"""
    try:
        data = request.json
        transcript = data.get('transcript', '')
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400

        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            return jsonify({'error': 'API key not configured'}), 500
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Force JSON response for the quiz
        prompt = f"""Generate a 5-question multiple choice quiz based on this transcript.
        Return the result as a raw JSON array of objects (no markdown formatting, no code blocks).
        
        Format:
        [
            {{
                "question": "Question text?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_index": 0  // 0-3 indicating the correct option
            }}
        ]

        Transcript:
        {transcript}"""

        response = model.generate_content(prompt)
        
        # Clean up potential markdown code blocks if the model ignores instructions
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
            
        return jsonify({'success': True, 'quiz': json.loads(text)})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/podcast', methods=['POST'])
def generate_podcast():
    """Generate a podcast dialogue script from the transcript"""
    try:
        data = request.json
        transcript = data.get('transcript', '')
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400

        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            return jsonify({'error': 'API key not configured'}), 500
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""Convert this transcript into an engaging podcast dialogue between two hosts, 'Alex' (Host A) and 'Jamie' (Host B).
        
        Rules:
        1. Make it sound natural, conversational, and enthusiastic.
        2. Alex introduces the topic. Jamie asks insightful questions or adds details.
        3. Keep it concise (about 2-3 minutes of reading time).
        4. Return the result as a JSON array of objects.
        
        Format:
        [
            {{"speaker": "Alex", "text": "Welcome back! Today we're discussing..."}},
            {{"speaker": "Jamie", "text": "I'm excited about this one..."}}
        ]
        
        Transcript:
        {transcript}"""

        response = model.generate_content(prompt)
        
        # Clean up potential markdown code blocks
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
            
        return jsonify({'success': True, 'script': json.loads(text)})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
