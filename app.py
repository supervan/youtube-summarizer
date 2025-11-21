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
    # Simple regex to extract text from <text> tags
    # Example: <text start="0" dur="1.5">Hello world</text>
    import html
    text_parts = re.findall(r'<text.+?>(.+?)</text>', xml_content)
    # Decode HTML entities (e.g. &amp; -> &)
    decoded_parts = [html.unescape(t) for t in text_parts]
    return " ".join(decoded_parts)

def _get_youtube_transcript_with_cookies(video_id):
    """Extract transcript from YouTube video using yt-dlp, with optional cookies."""
    cookies_content = os.getenv('YOUTUBE_COOKIES')
    # ... (rest of function setup) ...
    cookies_file = None
    loaded_cookie_count = 0
    
    # 1. Setup Cookies
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
    except Exception as e:
        print(f"⚠️ Cookie setup failed: {e}")

    # 2. Setup Session (needed for pre-check and manual fetches)
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

    # 3. Diagnostics & Pre-checks
    import shutil
    ffmpeg_path = shutil.which('ffmpeg')
    print(f"📽️ ffmpeg available: {ffmpeg_path}")
    print(f"📦 yt-dlp version: {yt_dlp.version.__version__}")

    url = f"https://www.youtube.com/watch?v={video_id}"
    pre_check_info = "Pre-check not run"
    
    try:
        print(f"🔍 Pre-checking video page: {url}")
        page_response = session.get(url)
        page_content = page_response.text
        
        # Extract title
        page_title_match = re.search(r'<title>(.*?)</title>', page_content)
        page_title = page_title_match.group(1) if page_title_match else "Unknown Title"
        print(f"📄 Page Title: {page_title}")
        
        pre_check_info = f"Page Title: '{page_title}'"
        
        # Check for common block messages
        if "Sign in to confirm you’re not a bot" in page_content:
            pre_check_info += " [DETECTED: Bot Verification Block]"
        elif "Google Account" in page_title and "Sign in" in page_content:
                pre_check_info += " [DETECTED: Sign-in Redirect]"
        else:
                pre_check_info += " [No obvious block detected]"
                
    except Exception as e:
        print(f"⚠️ Pre-check warning: {e}")
        pre_check_info = f"Pre-check failed: {str(e)}"

    # 4. Attempt with youtube-transcript-api (Primary Method)
    yta_error = None
    try:
        print("🚀 Attempting to fetch transcript with youtube-transcript-api...")
        # Use the cookies file we created
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id, cookies=cookies_file)
            
            # Try to find English transcript (manual or generated)
            transcript = None
            try:
                transcript = transcript_list.find_manually_created_transcript(['en'])
            except:
                try:
                    transcript = transcript_list.find_generated_transcript(['en'])
                except:
                    pass
            
            if transcript:
                fetched_transcript = transcript.fetch()
                # Join text parts
                full_text = " ".join([t['text'] for t in fetched_transcript])
                # Basic cleaning of whitespace
                full_text = " ".join(full_text.split())
                
                print("✅ youtube-transcript-api success!")
                return full_text, loaded_cookie_count
            else:
                print("⚠️ youtube-transcript-api: No English transcript found")
                yta_error = "No English transcript found"
                
        except AttributeError:
            # Fallback for older versions that don't have list_transcripts
            print("⚠️ list_transcripts not found, trying get_transcript...")
            fetched_transcript = YouTubeTranscriptApi.get_transcript(video_id, cookies=cookies_file)
            full_text = " ".join([t['text'] for t in fetched_transcript])
            full_text = " ".join(full_text.split())
            print("✅ youtube-transcript-api (get_transcript) success!")
            return full_text, loaded_cookie_count

    except Exception as e:
        print(f"⚠️ youtube-transcript-api failed: {e}")
        yta_error = str(e)
        # Continue to yt-dlp as backup

    # 5. Download Subtitles with yt-dlp (Backup Method)
    ydl_error = None
    try:
        # Use a temporary directory for the download
        with tempfile.TemporaryDirectory() as temp_dir:
            ydl_opts = {
                'skip_download': True, # Don't download video
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['en'],
                'quiet': False, # Enable logs
                'verbose': True,
                'force_ipv4': True, # Force IPv4 to avoid potential IPv6 blocks
                'format': 'best', # Ensure we select a valid format even if skipping download
                'extractor_args': {'youtube': {'player_client': ['web']}}, # Switch to WEB client (matches requests)
                'cookiefile': cookies_file if cookies_file else None,
                'outtmpl': f"{temp_dir}/%(id)s.%(ext)s",
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.youtube.com/',
                }
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Download metadata and subtitles
                try:
                    ydl.download([url])
                except Exception as e:
                    ydl_error = str(e)
                    print(f"⚠️ yt-dlp download error: {e}")
                
                # List all files in temp dir
                files = os.listdir(temp_dir)
                print(f"📂 Files in temp dir: {files}")
                
                # Find the downloaded VTT file
                vtt_files = [f for f in files if f.endswith('.vtt')]
                
                if vtt_files:
                    # Read the first VTT file found
                    vtt_path = os.path.join(temp_dir, vtt_files[0])
                    file_size = os.path.getsize(vtt_path)
                    print(f"📄 Reading subtitles from: {vtt_path} (Size: {file_size} bytes)")
                    
                    with open(vtt_path, 'r', encoding='utf-8') as f:
                        vtt_content = f.read()
                        
                    print(f"📄 Raw VTT length: {len(vtt_content)}")
                    full_text = _parse_vtt(vtt_content)
                    
                    if full_text:
                        return full_text, loaded_cookie_count
    except Exception as e:
        print(f"⚠️ yt-dlp block failed: {e}")

    # 6. Manual Fallback (since pre-check worked)
    print("⚠️ yt-dlp failed, attempting manual extraction from page content...")
    manual_error = None
    try:
        # We already have page_content from the pre-check
        if 'page_content' in locals() and page_content:
            import json
            
            # Try to extract ytInitialPlayerResponse
            # It usually looks like: var ytInitialPlayerResponse = {...};
            json_match = re.search(r'var ytInitialPlayerResponse\s*=\s*({.+?});', page_content)
            
            if json_match:
                try:
                    player_response = json.loads(json_match.group(1))
                    
                    # Navigate to captions
                    # captions -> playerCaptionsTracklistRenderer -> captionTracks
                    captions = player_response.get('captions', {})
                    pctr = captions.get('playerCaptionsTracklistRenderer', {})
                    tracks = pctr.get('captionTracks', [])
                    
                    if tracks:
                        caption_url = None
                        # Find English track
                        for track in tracks:
                            if track.get('languageCode') == 'en':
                                caption_url = track.get('baseUrl')
                                break
                        
                        # Fallback to first track if no English
                        if not caption_url and tracks:
                             caption_url = tracks[0].get('baseUrl')
                             print("⚠️ No English track found, using first available track.")

                        if caption_url:
                            print(f"⬇️ Manual fallback: Fetching captions from {caption_url}")
                            # Try VTT first
                            vtt_url = caption_url + '&fmt=vtt' if '&fmt=' not in caption_url else caption_url
                            
                            print(f"🔗 Caption URL (VTT): {vtt_url}")
                                
                            cap_response = session.get(vtt_url)
                            cap_response.raise_for_status()
                            
                            raw_content = cap_response.text
                            print(f"📄 Manual raw content first 200 chars: {raw_content[:200]}")
                            
                            if len(raw_content) > 0:
                                full_text = _parse_vtt(raw_content)
                                if full_text:
                                    print("✅ Manual fallback (VTT) successful!")
                                    return full_text, loaded_cookie_count
                            
                            # If VTT failed or empty, try XML (original URL)
                            print("⚠️ VTT fetch empty or failed, trying XML...")
                            xml_url = caption_url # Original URL is usually XML
                            print(f"🔗 Caption URL (XML): {xml_url}")
                            
                            xml_response = session.get(xml_url)
                            xml_response.raise_for_status()
                            xml_content = xml_response.text
                            
                            if len(xml_content) > 0:
                                full_text = _parse_xml(xml_content)
                                if full_text:
                                    print("✅ Manual fallback (XML) successful!")
                                    return full_text, loaded_cookie_count
                                else:
                                    manual_error = "Parsed XML content was empty"
                            else:
                                manual_error = f"Fetched caption file was empty (Raw len: {len(raw_content)})"
                        else:
                            manual_error = "No caption URL found in tracks"
                    else:
                        manual_error = "No captionTracks found in player_response"
                        
                except json.JSONDecodeError as je:
                    manual_error = f"Failed to parse ytInitialPlayerResponse JSON: {je}"
            else:
                manual_error = "ytInitialPlayerResponse not found in HTML"
        else:
            manual_error = "Page content not available for fallback"
            
    except Exception as e:
        print(f"⚠️ Manual fallback error: {e}")
        manual_error = str(e)

    # If we get here, everything failed
    error_details = f"[Pre-check: {pre_check_info}] "
    if yta_error:
        error_details += f"[youtube-transcript-api error: {yta_error}] "
    if ydl_error:
        error_details += f"[yt-dlp error: {ydl_error}] "
    if manual_error:
        error_details += f"[Manual fallback error: {manual_error}] "
    
    raise Exception(f"Failed to extract transcript. {error_details}")
            
    # Cleanup is handled by tempfile context managers, but we need to clean up cookies
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
