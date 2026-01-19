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
import logging

# Load environment variables from .env file
load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAX_TRANSCRIPT_LENGTH = 50000 # Limit for context window
DEPLOYMENT_ID = "v2025.11.21.42"

app = Flask(__name__, static_folder='.', template_folder='.')
CORS(app)

@app.after_request
def add_header(response):
    """
    Add headers to both force latest IE rendering engine or Chrome Frame,
    and also to cache the rendered page for 10 minutes.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

def extract_video_id(url):
    """Extract video ID from YouTube, Vimeo, and TikTok URL formats"""
    patterns = [
        (r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\n?#]+)', 'youtube'),
        (r'youtube\.com\/watch\?.*v=([^&\n?#]+)', 'youtube'),
        (r'(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(?:channels\/[\w]+\/)?([0-9]+)', 'vimeo'),
        (r'(?:tiktok\.com\/.*\/video\/|vm\.tiktok\.com\/)([\w-]+)', 'tiktok')
    ]
    
    for pattern, platform in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1), platform
            
    return None, None

@app.route('/')
def index():
    """Serve the main HTML file with feature flags"""
    # Feature Flag: Check if ads should be enabled from environment variables
    # Defaults to False if not set.
    # This controls the injection of the AdSense placeholder in the footer of index.html.
    enable_ads = os.getenv('ENABLE_ADS', 'False').lower() == 'true'
    
    # Note: PWA support is handled entirely on the frontend via manifest.json, sw.js, and script.js.
    # The backend simply serves these static files.
    return render_template('index.html', enable_ads=enable_ads, deployment_id=DEPLOYMENT_ID)

@app.route('/ads.txt')
def ads_txt():
    """
    Serve ads.txt for Google AdSense verification.
    This file is required by AdSense to verify domain ownership and authorized sellers.
    """
    return send_from_directory('static', 'ads.txt')

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
        
    def get_proxy(self, protocol_filter=None):
        """
        Get a working proxy, refreshing pool if needed.
        
        Args:
            protocol_filter (str): Optional. 'http' to enforce HTTP/HTTPS proxies only.
        """
        # If we have a known working proxy, try it first
        if self.working_proxy:
            if not protocol_filter or (protocol_filter == 'http' and not self.working_proxy['http'].startswith('socks')):
                return self.working_proxy
            
        # If we have verified proxies, return one
        if self.verified_proxies:
            candidates = self.verified_proxies
            if protocol_filter == 'http':
                candidates = [p for p in candidates if not p.startswith('socks')]
            
            if candidates:
                proxy = random.choice(candidates)
                return {'http': proxy, 'https': proxy}
            
        # Update pool if empty or old (older than 30 minutes)
        if not self.proxies or time.time() - self.last_update > 1800:
            self._refresh_proxies()
            
        # If we still have no verified proxies, try unverified ones as fallback
        if self.proxies:
            candidates = self.proxies
            if protocol_filter == 'http':
                candidates = [p for p in candidates if not p.startswith('socks')]
                
            if candidates:
                proxy = random.choice(candidates)
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
        
        # Sort to put HTTP proxies first (more reliable protocol-wise)
        self.proxies.sort(key=lambda x: 1 if x.startswith('socks') else 0)
        
        print(f"✅ Total unique proxies found: {len(self.proxies)}")
        
        # Validate a subset to find working ones immediately
        self._validate_initial_batch()
        
        self.last_update = time.time()

    def _validate_initial_batch(self):
        """
        Validate a batch of proxies to find some working ones quickly.
        """
        print("🕵️ Validating random subset of proxies...")
        
        # Take top 50 (mostly HTTP due to sort) and some random ones
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

def generate_gemini_content(prompt):
    """
    Generate content using Gemini API with automatic model fallback.
    Prioritizes: 2.0 Flash -> 2.0 Flash Lite -> Flash Latest
    """
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise Exception("API_KEY_INVALID: API key not configured")
        
    genai.configure(api_key=api_key)
    
    models_to_try = [
        'gemini-3-flash-preview', # Preview alias
        'gemini-2.5-flash',      # Latest Flash
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',      # Stable Flash 2.0
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash-exp',  # Experimental Flash
        'gemini-flash-latest',   # Generic latest alias
        'gemini-2.5-pro',        # Pro model (likely lower quota but worth a shot)
        'gemini-2.0-pro-exp-02-05',
        'gemini-exp-1206',
        'gemini-2.5-flash-preview-tts' # Fallback
    ]
    
    last_error = None
    
    for model_name in models_to_try:
        try:
            print(f"🔄 Gemini: Attempting with model: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            print(f"✅ Gemini: Success with model: {model_name}")
            return response
            
        except Exception as e:
            error_str = str(e)
            if "404" in error_str or "not found" in error_str.lower():
                print(f"⚠️ Gemini: Model {model_name} not found (skipping).")
            elif "429" in error_str or "quota" in error_str.lower():
                print(f"⚠️ Gemini: Quota exceeded for {model_name} (skipping).")
            else:
                print(f"⚠️ Gemini: Failed with model {model_name}: {e}")
            
            last_error = e
            continue
            
    if last_error:
        print(f"❌ All Gemini models failed. Last error: {last_error}")
        raise last_error
    else:
        raise Exception("No Gemini models available to try.")

def _get_youtube_transcript_with_cookies(video_id):
    """
    Extract transcript and metadata from YouTube video.
    
    Returns:
        tuple: (transcript_text, metadata_dict, cookie_count)
    """
    
    # Try up to 5 times with different proxies
    max_retries = 5
    last_error = None
    start_time = time.time()
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    print(f"🔍 DEBUG: Starting transcript fetch for {video_id}")
    
    # Handle cookies
    cookies_content = os.getenv('YOUTUBE_COOKIES')
    cookies_file = None
    if cookies_content:
        try:
            fd, cookies_file = tempfile.mkstemp(suffix='.txt', text=True)
            with os.fdopen(fd, 'w') as f:
                f.write(cookies_content)
            print("🔍 DEBUG: Created temporary cookies file")
        except Exception as e:
            print(f"⚠️ DEBUG: Failed to create cookies file: {e}")
            cookies_file = None
    else:
        print("🔍 DEBUG: No YOUTUBE_COOKIES found in env")
            
    # Default metadata
    metadata = {
        'title': 'Unknown Title',
        'uploader': 'Unknown Uploader',
        'upload_date': None,
        'view_count': 0,
        'channel_follower_count': 0,
        'description': ''
    }

    # Check if video is live or was live using yt-dlp first (without proxy if possible, or with)
    # This avoids wasting time on Method 1 if we know we want to block live videos
    try:
         print(f"🔍 Checking if video {video_id} is live/VOD...")
         with yt_dlp.YoutubeDL({'quiet': True, 'skip_download': True}) as ydl:
            info = ydl.extract_info(video_url, download=False)
            if info.get('is_live') or info.get('was_live'):
                print(f"⚠️ Video {video_id} is/was live. Blocking as per configuration.")
                raise Exception("LIVE_VIDEO_NOT_SUPPORTED")
    except Exception as e:
        if "LIVE_VIDEO_NOT_SUPPORTED" in str(e):
            raise e
        # Ignore other errors here (e.g. network), let the main loop handle it or fail later
        print(f"⚠️ Live check failed (ignoring): {e}")
        pass

    # METHOD 1: Try YouTubeTranscriptApi (Fastest)
    method_1_error = None
    method_1_5_error = None
    last_error = None

    try:
        print(f"🚀 Attempting Method 1: YouTubeTranscriptApi for {video_id}...")
        
        # Try direct connection first
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, cookies=cookies_file)
        except Exception as e:
            method_1_error = e
            print(f"⚠️ Direct YouTubeTranscriptApi failed: {e}")
            print(f"🔍 DEBUG: YouTubeTranscriptApi Exception: {e}")
            
            # METHOD 1.5: Try yt-dlp Direct Connection
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
                        'quiet': False,
                        'no_warnings': False,
                        'socket_timeout': 10,
                        'format': 'worst',
                        'ignore_no_formats_error': True,
                        'allow_unplayable_formats': True,
                        'force_ipv4': True,
                        'extractor_args': {'youtube': {'player_client': ['android', 'ios', 'web']}},
                    }
                    if cookies_file:
                        ydl_opts['cookiefile'] = cookies_file
                        print("🔍 DEBUG: Using cookies for yt-dlp")
                            
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        try:
                            info = ydl.extract_info(video_url, download=True)
                        except Exception as e:
                            # If blocked (e.g. 403 or Sign in confirmed), try one more time WITHOUT cookies
                            # YouTube sometimes aggressively blocks Datacenter IPs when logged in
                            if cookies_file and ("Sign in" in str(e) or "403" in str(e) or "private" in str(e).lower()):
                                print("⚠️ Cookies might be causing block. Retrying WITHOUT cookies...")
                                ydl_opts.pop('cookiefile', None)
                                with yt_dlp.YoutubeDL(ydl_opts) as ydl_retry:
                                    info = ydl_retry.extract_info(video_url, download=True)
                            else:
                                raise e
                        
                        # Extract metadata
                        metadata['title'] = info.get('title', 'Unknown Title')
                        metadata['uploader'] = info.get('uploader', 'Unknown Uploader')
                        metadata['upload_date'] = info.get('upload_date')
                        metadata['view_count'] = info.get('view_count', 0)
                        metadata['channel_follower_count'] = info.get('channel_follower_count', 0)
                        metadata['description'] = info.get('description', '')
                        metadata['thumbnail'] = info.get('thumbnail', '')
                        
                        vtt_file = None
                        files_in_dir = os.listdir(temp_dir)
                        for filename in files_in_dir:
                            if filename.endswith('.vtt'):
                                vtt_file = os.path.join(temp_dir, filename)
                                break
                        if vtt_file:
                            with open(vtt_file, 'r', encoding='utf-8') as f:
                                print("✅ Method 1.5 Success! yt-dlp direct worked.")
                                return _parse_vtt(f.read()), metadata, 0
                        else:
                            raise Exception("Method 1.5: No transcript file downloaded (likely no subs found)")
            except Exception as ydl_e:
                method_1_5_error = ydl_e
                print(f"⚠️ Method 1.5 failed: {ydl_e}")
                print("🔄 Falling back to proxies...")

            # Try with proxies
            transcript_list = None
            for attempt in range(3):
                if time.time() - start_time > 45: # Global timeout safety (leave buffer for response)
                    print("⚠️ Method 1 Proxy loop timed out")
                    break
                    
                proxy = proxy_manager.get_proxy()
                if not proxy:
                    break
                print(f"   Retrying YouTubeTranscriptApi with proxy {proxy['http']}...")
                try:
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id, cookies=cookies_file, proxies=proxy)
                    proxy_manager.report_success(proxy['http'])
                    print("   ✅ Proxy success!")
                    break
                except Exception as pe:
                    print(f"   ❌ Proxy failed: {pe}")
                    proxy_manager.mark_failed(proxy)
            
            if not transcript_list:
                raise Exception("All YouTubeTranscriptApi attempts failed")

        # Parse transcript
        formatted_lines = []
        for item in transcript_list:
            start = item['start']
            minutes = int(start // 60)
            seconds = int(start % 60)
            timestamp = f"[{minutes:02d}:{seconds:02d}]"
            formatted_lines.append(f"{timestamp} {item['text']}")
            
        full_text = " ".join(formatted_lines)
        print(f"✅ Method 1 Success! Extracted {len(full_text)} chars")
        
        # Fetch metadata separately since API didn't give it
        try:
            with yt_dlp.YoutubeDL({'quiet': True, 'skip_download': True}) as ydl:
                info = ydl.extract_info(video_url, download=False)
                metadata['title'] = info.get('title', 'Unknown Title')
                metadata['uploader'] = info.get('uploader', 'Unknown Uploader')
                metadata['upload_date'] = info.get('upload_date')
                metadata['view_count'] = info.get('view_count', 0)
                metadata['channel_follower_count'] = info.get('channel_follower_count', 0)
                metadata['description'] = info.get('description', '')
                metadata['thumbnail'] = info.get('thumbnail', '')
        except:
            pass
            
        return full_text, metadata, len(cookies_content) if cookies_content else 0
        
    except Exception as e:
        print(f"⚠️ Method 1 failed: {e}")
        
    # METHOD 2: yt-dlp with Proxy Rotation
    try:
        for attempt in range(max_retries):
            # 45s cutoff to ensure we respond before 60s/100s gateway timeouts
            if time.time() - start_time > 45: 
                print("⚠️ Method 2 timed out")
                break
                
            proxies = proxy_manager.get_proxy()
            if not proxies:
                 continue

            proxy_url = proxies['http']
            print(f"🚀 Attempt {attempt+1}/{max_retries}: Fetching transcript via proxy {proxy_url}")
            
            with tempfile.TemporaryDirectory() as temp_dir:
                try:
                    ydl_opts = {
                        'skip_download': True,
                        'writesubtitles': True,
                        'writeautomaticsub': True,
                        'subtitleslangs': ['en'],
                        'subtitlesformat': 'vtt',
                        'outtmpl': os.path.join(temp_dir, '%(id)s'),
                        'quiet': False,
                        'no_warnings': False,
                        'socket_timeout': 30,
                        'retries': 2,
                        'force_ipv4': True,
                        'format': 'worst',
                        'extractor_args': {'youtube': {'player_client': ['web', 'android']}},
                        'ignore_no_formats_error': True,
                        'allow_unplayable_formats': True,
                        'proxy': proxy_url
                    }
                    if cookies_file:
                        ydl_opts['cookiefile'] = cookies_file
                    
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(video_url, download=True)
                        
                        # Extract metadata
                        metadata['title'] = info.get('title', 'Unknown Title')
                        metadata['uploader'] = info.get('uploader', 'Unknown Uploader')
                        metadata['upload_date'] = info.get('upload_date')
                        metadata['view_count'] = info.get('view_count', 0)
                        metadata['channel_follower_count'] = info.get('channel_follower_count', 0)
                        metadata['description'] = info.get('description', '')
                        metadata['thumbnail'] = info.get('thumbnail', '')
                        
                        vtt_file = None
                        files_in_dir = os.listdir(temp_dir)
                        for filename in files_in_dir:
                            if filename.endswith('.vtt'):
                                vtt_file = os.path.join(temp_dir, filename)
                                break
                        
                        if vtt_file:
                            print(f"✅ Success! Downloaded VTT file via proxy")
                            with open(vtt_file, 'r', encoding='utf-8') as f:
                                vtt_content = f.read()
                            full_text = _parse_vtt(vtt_content)
                            if not full_text:
                                raise Exception("Parsed transcript is empty")
                            
                            proxy_manager.report_success(proxy_url)
                            return full_text, metadata, len(cookies_content) if cookies_content else 0
                        else:
                            raise Exception("No subtitle file downloaded")
                    
                except Exception as e:
                    print(f"❌ Attempt {attempt+1} failed: {str(e)}")
                    last_error = e
                    proxy_manager.mark_failed(proxies)
        
        # If we get here, all attempts failed.
        # Report ALL errors to help diagnostics
        error_msg = f"Failed after {max_retries} attempts."
        if method_1_5_error:
            error_msg += f" Method 1.5 Error: {method_1_5_error}."
        if last_error:
            error_msg += f" Method 2 Last Error: {last_error}."
        if method_1_error and not method_1_5_error:
            error_msg += f" Method 1 Error: {method_1_error}."
            
        raise Exception(error_msg)
        
    finally:
        if cookies_file and os.path.exists(cookies_file):
            try:
                os.unlink(cookies_file)
            except:
                pass


def _fetch_vimeo_transcript(video_id):
    """
    Fetch transcript from Vimeo using yt-dlp and cookies.
    """
    print(f"🔍 DEBUG: Starting Vimeo transcript fetch for {video_id}")
    
    cookies_content = os.getenv('VIMEO_COOKIES')
    cookies_file = None
    
    if cookies_content:
        try:
            fd, cookies_file = tempfile.mkstemp(suffix='.txt', text=True)
            with os.fdopen(fd, 'w') as f:
                f.write(cookies_content)
            print("🔍 DEBUG: Created temporary Vimeo cookies file")
        except Exception as e:
            print(f"⚠️ DEBUG: Failed to create Vimeo cookies file: {e}")
            cookies_file = None
    else:
        print("🔍 DEBUG: No VIMEO_COOKIES found in env")

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            ydl_opts = {
                'skip_download': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['en'],
                'subtitlesformat': 'vtt',
                'outtmpl': os.path.join(temp_dir, '%(id)s'),
                'quiet': False,
                'no_warnings': False,
            }
            if cookies_file:
                ydl_opts['cookiefile'] = cookies_file
                
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://vimeo.com/{video_id}", download=True)
                
                # Extract metadata
                metadata = {
                    'title': info.get('title', 'Unknown Title'),
                    'uploader': info.get('uploader', 'Unknown Uploader'),
                    'upload_date': info.get('upload_date'),
                    'view_count': info.get('view_count', 0),
                    'channel_follower_count': 0,
                    'description': info.get('description', ''),
                    'thumbnail': info.get('thumbnail', '')
                }
                
                vtt_file = None
                files_in_dir = os.listdir(temp_dir)
                for filename in files_in_dir:
                    if filename.endswith('.vtt'):
                        vtt_file = os.path.join(temp_dir, filename)
                        break
                
                if vtt_file:
                    with open(vtt_file, 'r', encoding='utf-8') as f:
                        print("✅ Vimeo Success! Downloaded VTT file.")
                        return _parse_vtt(f.read()), metadata, len(cookies_content) if cookies_content else 0
                else:
                     raise Exception("No subtitle file downloaded from Vimeo")
                     
    except Exception as e:
        print(f"❌ Vimeo fetch failed: {e}")
        raise e
        
    finally:
        if cookies_file and os.path.exists(cookies_file):
            try:
                os.unlink(cookies_file)
            except:
                pass



def _fetch_tiktok_transcript(video_id):
    """
    Fetch transcript from TikTok using yt-dlp and cookies.
    """
    print(f"🔍 DEBUG: Starting TikTok transcript fetch for {video_id}")
    
    cookies_content = os.getenv('TIKTOK_COOKIES')
    cookies_file = None
    
    if cookies_content:
        try:
            fd, cookies_file = tempfile.mkstemp(suffix='.txt', text=True)
            with os.fdopen(fd, 'w') as f:
                f.write(cookies_content)
            print("🔍 DEBUG: Created temporary TikTok cookies file")
        except Exception as e:
            print(f"⚠️ DEBUG: Failed to create TikTok cookies file: {e}")
            cookies_file = None
    else:
        print("🔍 DEBUG: No TIKTOK_COOKIES found in env")

    # Try direct connection first, then fallback to proxies
    max_retries = 5
    # attempts_list = [None] (Direct) + [proxies...]
    attempts = [None] + [proxy_manager.get_proxy(protocol_filter='http') for _ in range(max_retries)]
    
    last_error = None

    try:
        for attempt, proxies in enumerate(attempts):
            proxy_url = proxies['http'] if proxies else None
            conn_type = "DIRECT" if not proxy_url else f"PROXY ({proxy_url})"
            print(f"🚀 TikTok Attempt {attempt+1}/{len(attempts)}: Fetching via {conn_type}")

            with tempfile.TemporaryDirectory() as temp_dir:
                try:
                    ydl_opts = {
                        'skip_download': True,
                        'writesubtitles': True, # TikTok often has them
                        'writeautomaticsub': True,
                        'subtitleslangs': ['en'],
                        'subtitlesformat': 'vtt', 
                        'outtmpl': os.path.join(temp_dir, '%(id)s'),
                        'quiet': False,
                        'no_warnings': False,
                        'socket_timeout': 30,
                    }
                    if cookies_file:
                        ydl_opts['cookiefile'] = cookies_file
                    if proxy_url:
                        ydl_opts['proxy'] = proxy_url

                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        # Construct generic URL using just the ID
                        # Construct URL based on ID format
                        if video_id.isdigit():
                            target_url = f"https://www.tiktok.com/@user/video/{video_id}"
                        else:
                            # Short ID (e.g. ZNRkprvPT) -> use vm.tiktok.com
                            target_url = f"https://vm.tiktok.com/{video_id}"
                        
                        info = ydl.extract_info(target_url, download=True)
                        
                        # Extract metadata
                        metadata = {
                            'title': info.get('title', 'Unknown TikTok'),
                            'uploader': info.get('uploader', 'Unknown User'),
                            'upload_date': info.get('upload_date'),
                            'view_count': info.get('view_count', 0),
                            'channel_follower_count': 0,
                            'description': info.get('description', ''),
                            'thumbnail': info.get('thumbnail', '')
                        }
                        
                        # Check for subtitles
                        vtt_file = None
                        files_in_dir = os.listdir(temp_dir)
                        for filename in files_in_dir:
                            if filename.endswith('.vtt'):
                                vtt_file = os.path.join(temp_dir, filename)
                                break
                        
                        full_text = ""
                        if vtt_file:
                            with open(vtt_file, 'r', encoding='utf-8') as f:
                                print("✅ TikTok Success! Downloaded VTT file.")
                                full_text = _parse_vtt(f.read())
                        else:
                             # Fallback: Description is often the "text" for TikToks
                             print("⚠️ No subtitles found for TikTok. Using description/title as transcript.")
                             full_text = f"{info.get('title', '')}\n\n{info.get('description', '')}"

                        if not full_text:
                            raise Exception("No text content found (captions or description)")

                        if proxy_url:
                            proxy_manager.report_success(proxy_url)
                            
                        return full_text, metadata, len(cookies_content) if cookies_content else 0

                except Exception as e:
                    print(f"❌ TikTok fetch failed (Attempt {attempt+1}): {e}")
                    last_error = e
                    if proxy_url:
                        proxy_manager.mark_failed(proxies)
        
        raise Exception(f"All TikTok attempts failed. Last error: {last_error}")

    finally:
        if cookies_file and os.path.exists(cookies_file):
            try:
                os.unlink(cookies_file)
            except:
                pass


@app.route('/api/extract-transcript', methods=['POST'])
def extract_transcript():
    """Extract transcript from YouTube video"""
    try:
        data = request.json
        youtube_url = data.get('url', '')
        
        print(f"🔍 DEBUG: /api/extract-transcript called with URL: {youtube_url}")
        
        if not youtube_url:
            return jsonify({'error': 'YouTube URL is required'}), 400
        
        # Extract video ID
        video_id, platform = extract_video_id(youtube_url)
        print(f"🔍 DEBUG: Extracted Video ID: {video_id}, Platform: {platform}")
        if not video_id:
            return jsonify({'error': 'Invalid URL'}), 400
        
        # Get transcript and metadata
        try:
            if platform == 'vimeo':
                full_transcript, metadata, cookie_count = _fetch_vimeo_transcript(video_id)
            elif platform == 'tiktok':
                full_transcript, metadata, cookie_count = _fetch_tiktok_transcript(video_id)
            else:
                full_transcript, metadata, cookie_count = _get_youtube_transcript_with_cookies(video_id)
            
            return jsonify({
                'success': True,
                'video_id': video_id,
                'title': metadata['title'],
                'metadata': metadata, # Return full metadata object
                'transcript': full_transcript,
                'length': len(full_transcript),
                'deployment_id': DEPLOYMENT_ID
            })
            
        except Exception as e:
            if "LIVE_VIDEO_NOT_SUPPORTED" in str(e):
                return jsonify({'error': 'LIVE_VIDEO_NOT_SUPPORTED'}), 400
            return jsonify({'error': f'Error fetching transcript: {str(e)} [Deployment ID: {DEPLOYMENT_ID}]'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)} [Deployment ID: {DEPLOYMENT_ID}]'}), 500

@app.route('/api/diagnostics', methods=['GET'])
def diagnostics():
    """Diagnostic endpoint to check configuration"""
    print("🔍 DEBUG: /api/diagnostics called")
    cookies_content = os.getenv('YOUTUBE_COOKIES', '')
    scraperapi_key = os.getenv('SCRAPERAPI_KEY', '')
    
    diagnostics_info = {
        'deployment_id':  DEPLOYMENT_ID,
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
        length = data.get('length', 'short')  # short, medium, long
        tone = data.get('tone', 'conversational')  # conversational, professional, technical
        
        print(f"📝 Generating SUMMARY with Tone: {tone}, Length: {length}")
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400
        
        # Build prompt based on preferences
        prompt = build_summary_prompt(transcript, length, tone)

        # Generate summary using helper with fallback
        response = generate_gemini_content(prompt)
        summary_text = response.text

        return jsonify({
            'success': True,
            'summary': summary_text
        })
        
    except Exception as e:
        error_message = str(e)
        if 'API_KEY_INVALID' in error_message or 'invalid API key' in error_message.lower():
            return jsonify({'error': 'Invalid API key in .env file. Please check your GEMINI_API_KEY.'}), 401
        return jsonify({'error': f'Error generating summary: {error_message}'}), 500

def build_summary_prompt(transcript, length, tone):
    """Build a customized prompt based on user preferences"""
    
    # Length descriptions (for reference)
    length_instructions = {
        'short': 'approx. 1-2 sentences',
        'medium': 'approx. 1 paragraphs with bullet points',
        'long': 'comprehensive and detailed'
    }
    
    # Specific prompts for all combinations
    specific_prompts = {
        # Conversational
        ('conversational', 'short'): """Provide a very short summary (MAXIMUM 2 sentences).
Tone: Friendly, conversational, and easy to read. Use natural language.
CRITICAL: Do not exceed 2 sentences.
Transcript:
{transcript}""",
        
        ('conversational', 'medium'): """Provide a balanced summary with an overview, key points (3-5 bullet points) (max of 1 short paragraph, 3-4 sentences), and a brief conclusion.
Tone: Friendly, conversational, and easy to read. Use natural language.
Transcript:
{transcript}""",
        
        ('conversational', 'long'): """Provide a comprehensive, detailed summary covering all major topics, subtopics, important details, examples, and conclusions.
Tone: Friendly, conversational, and easy to read. Use natural language.
Transcript:
{transcript}""",

        # Professional
        ('professional', 'short'): """Provide a very short summary (MAXIMUM 2 sentences).
Tone: Formal, professional, and objective. Suitable for business contexts.
CRITICAL: Do not exceed 2 sentences.
Transcript:
{transcript}""",

        ('professional', 'medium'): """Provide a balanced summary with an overview, key points (3-5 bullet points) (max of 1 short paragraph, 3-4 sentences), and a brief conclusion.
Tone: Formal, professional, and objective. Suitable for business contexts.
Transcript:
{transcript}""",

        ('professional', 'long'): """Provide a comprehensive, detailed summary covering all major topics, subtopics, important details, examples, and conclusions.
Tone: Formal, professional, and objective. Suitable for business contexts.
Transcript:
{transcript}""",

        # Technical
        ('technical', 'short'): """Provide a very short summary (MAXIMUM 2 sentences).
Tone: Direct, technical, and dense. Omit all introductions. Focus purely on facts.
CRITICAL: Do not exceed 2 sentences.
Transcript:
{transcript}""",

        ('technical', 'medium'): """Provide a balanced summary with an overview, key points (3-5 bullet points) (max of 1 short paragraph, 3-4 sentences), and a brief conclusion.
Tone: Direct, technical, and dense. Omit all introductions, greetings, and conversational transition phrases. Verbosity is useless; reduce it to zero. The information will be presented directly to an audience of university students. Focus purely on facts, data, and technical details.
Transcript:
{transcript}""",

        ('technical', 'long'): """Provide a comprehensive, detailed summary covering all major topics, subtopics, important details, examples, and conclusions.
Tone: Direct, technical, and dense. Omit all introductions, greetings, and conversational transition phrases. Verbosity is useless; reduce it to zero. The information will be presented directly to an audience of university students. Focus purely on facts, data, and technical details.
Transcript:
{transcript}""",

        # Witty
        ('witty', 'short'): """I need a Short summary (MAXIMUM 2 sentences). Tone: Sharp, witty, and clever.
CRITICAL: Do not exceed 2 sentences.
Transcript:
{transcript}""",

        ('witty', 'medium'): """I need a Medium length summary (1 short paragraph, 3-4 sentences). Tone: High-brow humor and wit. Instructions:
Summarize the narrative arc of the video with the flair of a stand-up comedian.
Point out the irony in the video's content.
Use sophisticated vocabulary and clever metaphors to explain the topic.
Transcript:
{transcript}""",

        ('witty', 'long'): """I need a Long, detailed summary. Tone: Witty, observational, and charmingly humorous. Instructions:
Provide a detailed breakdown of the video's chapters, but rewrite the concepts as if you are a humorous columnist for a magazine.
Look for 'unintentional comedy' in the video and highlight it.
Use puns related to the specific topic of the video.
End with a witty philosophical observation based on the video's conclusion.
Transcript:
{transcript}""",

        # Sarcastic
        ('sarcastic', 'short'): """I need a Short summary (MAXIMUM 2 sentences). Tone: Extremely sarcastic.
CRITICAL: Do not exceed 2 sentences.
Transcript:
{transcript}""",
        
        ('sarcastic', 'medium'): """I need a Medium length summary (1 short paragraph, 3-4 sentences). Tone: Heavy sarcasm and biting irony. Instructions:
Summarize the content but frame it as if the creator is stating the obvious or trying too hard.
Use rhetorical questions to highlight absurdities.
End with a backhanded compliment about the video.
Transcript:
{transcript}""",

        ('sarcastic', 'long'): """I need a Long, detailed summary. Tone: Scathing, dry, and hilariously negative. Instructions:
Break the summary down into bullet points, but title each bullet point with a sarcastic header.
Deeply analyze the 'insights' of the video and explain why they are underwhelming.
Critique the presenter's style or logic using satire.
Conclude with a 'Final Verdict' that discourages anyone else from watching it.
Transcript:
{transcript}"""
    }

    # Get the prompt template
    prompt_template = specific_prompts.get((tone, length))
    
    # Fallback if combination not found (should not happen with full coverage)
    if not prompt_template:
        prompt_template = f"""Please summarize the following YouTube video transcript.
Length: {length_instructions.get(length, 'medium')}
Tone: {tone}
Transcript:
{{transcript}}"""

    # Inject transcript and common instructions
    prompt = prompt_template.format(transcript=transcript)
    
    # Append timestamp instruction only for medium and long summaries
    if length in ['medium', 'long']:
        prompt += "\n\nIMPORTANT: You MUST include timestamps [MM:SS] from the transcript for every key point or major topic change."
    
    return prompt

@app.route('/api/features', methods=['GET'])
def get_features():
    """Get feature flags from features.json"""
    try:
        with open('features.json', 'r') as f:
            features = json.load(f)
        
        # Add ads flag from environment variable
        features['ads'] = os.getenv('ENABLE_ADS', 'False').lower() == 'true'
        
        return jsonify(features)
    except Exception as e:
        # Default fallback if file missing or error
        return jsonify({
            "chat": True,
            "steps": True,
            "quiz": True,
            "podcast": True,
            "ads": False
        })

@app.route('/share', methods=['POST', 'GET'])
def share_target():
    """Handle PWA share target requests."""
    if request.method == 'POST':
        # Extract data from form
        text = request.form.get('text', '')
        url = request.form.get('url', '')
        title = request.form.get('title', '')
        
        # Combine to find a URL
        content = f"{url} {text} {title}"
        
        # Simple regex to find URL
        import re
        found_url = re.search(r'https?://[^\s]+', content)
        
        target_url = found_url.group(0) if found_url else (url or text)
        
        # Redirect to home with URL
        return redirect(url_for('index', url=target_url))
    
    # Fallback for GET
    url = request.args.get('url') or request.args.get('text')
    return redirect(url_for('index', url=url))

@app.route('/api/chat', methods=['POST'])
def chat():
    """Chat with the video content using Gemini (Context Caching manually implemented for now)"""
    data = request.json
    transcript_text = data.get('transcript')
    question = data.get('question')

    if not transcript_text or not question:
        return jsonify({'error': 'Missing transcript or question'}), 400

    try:
        # Construct prompt
        prompt = f"""
        You are a helpful AI assistant answering questions about a YouTube video based on its transcript.
        
        TRANSCRIPT:
        {transcript_text[:MAX_TRANSCRIPT_LENGTH]}
        
        USER QUESTION: {question}
        
        ANSWER (be concise and direct):
        """
        
        answer = generate_gemini_content(prompt)
        return jsonify({'success': True, 'answer': answer})

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/mindmap', methods=['POST'])
def generate_mindmap():
    """Generates a Mermaid.js mind map from the transcript"""
    data = request.json
    transcript_text = data.get('transcript')

    if not transcript_text:
        return jsonify({'error': 'Missing transcript'}), 400

    try:
        # Construct prompt for Mermaid.js (Using Graph LR for robustness)
        prompt = f"""
        Create a Mermaid.js diagram to visualize the key concepts of this video transcript.
        Use a Left-to-Right Graph (flowchart) style, which looks like a mind map.

        Rules:
        1. Start with `graph LR`
        2. Define the central topic node using double circles: `root((Central Topic))`
        3. Connect nodes using arrows `-->`.
        4. USE QUOTED LABELS for child nodes: `id["Node Label"]`.
        5. DO NOT use double quotes `"` INSIDE the label. Use single quotes `'` instead if needed.
        6. Assign unique IDs to every node (e.g., A, B, C1, C2).
        7. Keep labels concise (1-5 words).
        8. Return ONLY the raw Mermaid syntax. Do not use markdown blocks.

        Example Format:
        graph LR
            root((Start))
            root --> A[Topic A]
            root --> B[Topic B]
            A --> A1[Detail 1]
            A --> A2[Detail 2]
            B --> B1[Detail 3]

        TRANSCRIPT:
        {transcript_text[:MAX_TRANSCRIPT_LENGTH]}
        
        MERMAID SYNTAX:
        """
        
        response = generate_gemini_content(prompt)
        mermaid_syntax = response.text
        
        # Cleanup: Remove markdown code blocks
        mermaid_syntax = mermaid_syntax.replace('```mermaid', '').replace('```', '').strip()

        # Basic cleanup
        if not mermaid_syntax.startswith('graph'):
             # If model forgot 'graph LR', try to prepend it if it looks like edges
             if '-->' in mermaid_syntax:
                 mermaid_syntax = "graph LR\n" + mermaid_syntax

        # Safety: Ensure content inside [] is quoted if not already
        # Pattern: [ followed by non-quote chars, ending with ]
        # Replace with ["contents"]
        # This fixes issues like [Facebook (2011)] breaking syntax
        mermaid_syntax = re.sub(r'\[([^"\]]+?)\]', r'["\1"]', mermaid_syntax)
        
        return jsonify({'success': True, 'mindmap': mermaid_syntax})

    except Exception as e:
        logger.error(f"Mind map error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/steps', methods=['POST'])
def extract_steps():
    """Extract actionable steps from the transcript"""
    try:
        data = request.json
        transcript = data.get('transcript', '')
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400

        print(f"DEBUG: Steps Transcript length: {len(transcript)} chars")
        
        prompt = f"""Analyze the following transcript and determine if it contains instructions, a tutorial, or actionable advice.
        
If it DOES:
Extract the steps into a clear, numbered list. Use bold for the step title and normal text for the details.
Format as Markdown.

If it DOES NOT (e.g. it's just a vlog or opinion piece without steps):
Return exactly: "NO_STEPS_FOUND"

Transcript:
{transcript}"""

        response = generate_gemini_content(prompt)
        return jsonify({'success': True, 'steps': response.text})
        
    except Exception as e:
        error_message = str(e)
        print(f"❌ Error in summarize route: {error_message}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_message}), 500

@app.route('/api/generate-infographic', methods=['POST'])
def generate_infographic():
    data = request.json
    summary_text = data.get('summary', '')
    tone = data.get('tone', 'conversational')
    
    if not summary_text:
        return jsonify({'error': 'Summary text is required'}), 400
        
    print(f"📊 Generating Infographic for tone: {tone}")
    
    try:
        # Style Mapping
        TONE_STYLE_MAP = {
            'conversational': "Friendly, hand-drawn whiteboard sketch with colorful marker icons and arrow connectors.",
            'professional': "Clean Swiss design, corporate blue and slate palette, minimalist flat icons, and structured grid layout.",
            'technical': "Schematic blueprint style, detailed wireframes, monospaced fonts, and data-heavy node-and-edge diagrams.",
            'witty': "Vibrant pop-art style, bold typography, comic-book speech bubbles, and high-contrast saturated colors.",
            'sarcastic': "Dark humor aesthetic, 'dystopian corporate' glitch art, cynical meme-inspired layout with ironic neon accents."
        }
        
        # Get style based on tone, default to conversational
        visual_style = TONE_STYLE_MAP.get(tone, TONE_STYLE_MAP['conversational'])
        
        # Construct Prompt
        infographic_prompt = f"""
        Create a comprehensive SVG infographic in the style: "{visual_style}"
        
        Task:
        1. Extract the key concepts from the following transcript summary.
        2. Visualize them using shapes, icons, and text appropriate for the requested style.
        3. The Title of the infographic must include the literal string "INFOGRAPHIC".
        
        Visual Layout Constraints (CRITICAL):
        - Aspect Ratio: Use a vertical 9:16 ratio (e.g., viewBox="0 0 900 1600").
        - Safe Zones: Ensure all text and headings have at least 10% padding from all edges to prevent clipping.
        - Heading Management: For long headings (e.g., "The AI Rube Goldberg Infographic"), force a multi-line stack or reduce font size to ensure it fits the width. Do NOT let text overflow.
        - Text Contrast: Ensure high contrast for text on colorful blocks (e.g., use dark text on yellow/pink/orange, white text on dark backgrounds). Readability is paramount.
        
        Technical Requirements:
        - Return ONLY raw SVG code.
        - Start with <svg and end with </svg>.
        - Width: 100%, Height: auto.
        - Use a modern color palette compatible with the requested style.
        
        Transcript Summary:
        {summary_text}
        """
        
        # Use same model logic (fast/flash preferred)
        infographic_response = generate_gemini_content(infographic_prompt)
        raw_text = infographic_response.text
        
        # Extract SVG using regex
        import re
        svg_match = re.search(r'<svg.*?</svg>', raw_text, re.DOTALL | re.IGNORECASE)
        infographic_text = svg_match.group(0) if svg_match else ""
        
        return jsonify({
            'success': True,
            'infographic': infographic_text
        })
        
    except Exception as e:
        print(f"❌ Error generating infographic: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz', methods=['POST'])
def generate_quiz():
    """Generate a 5-question quiz from the transcript"""
    try:
        data = request.json
        transcript = data.get('transcript', '')
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400

        print(f"DEBUG: Quiz Transcript length: {len(transcript)} chars")
        
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

        response = generate_gemini_content(prompt)
        
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
        length = data.get('length', 'medium')
        tone = data.get('tone', 'conversational')
        
        print(f"🎙️ Generating podcast with Tone: {tone}, Length: {length}")
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400

        print(f"DEBUG: Podcast Transcript length: {len(transcript)} chars")
        
        # Tone instructions for podcast
        tone_map = {
            'conversational': 'natural, friendly, and enthusiastic',
            'professional': 'professional, structured, and insightful',
            'academic': 'intellectual, precise, and analytical',
            'witty': 'humorous, witty, and fun',
            'sarcastic': 'sarcastic, cynical, and dryly humorous',
            'technical': 'dense, factual, and straight to the point'
        }
        
        # Length instructions for podcast
        length_map = {
            'short': 'Keep it brief (about 1-2 minutes reading time). Focus only on the main takeaway.',
            'medium': 'Standard length (about 2-3 minutes reading time). Cover key points.',
            'long': 'Detailed discussion (about 3-5 minutes reading time). Explore topics in depth.'
        }
        
        selected_tone = tone_map.get(tone, tone_map['conversational'])
        selected_length = length_map.get(length, length_map['medium'])
        
        prompt = f"""Convert this transcript into an engaging podcast dialogue between two hosts, 'Alex' (Host A) and 'Jamie' (Host B).
        
        Settings:
        - Tone: {selected_tone}
        - Length: {selected_length}
        
        Rules:
        1. Make it sound {selected_tone}.
        2. Alex introduces the topic. Jamie asks insightful questions or adds details.
        3. {selected_length}
        4. Return the result as a JSON array of objects.
        
        Format:
        [
            {{"speaker": "Alex", "text": "Welcome back! Today we're discussing..."}},
            {{"speaker": "Jamie", "text": "I'm excited about this one..."}}
        ]
        
        Transcript:
        {transcript}"""

        response = generate_gemini_content(prompt)
        
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
        print(f"❌ Error in generate_podcast: {str(e)}")
        import traceback
        traceback.print_exc()
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
    app.run(host='0.0.0.0', port=port, debug=False)
