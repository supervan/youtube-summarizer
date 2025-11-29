# YouTube Video Summarizer

An AI-powered web application that extracts transcripts from YouTube videos and generates comprehensive summaries using Google's Gemini AI.

![YouTube Summarizer](https://img.shields.io/badge/AI-Powered-blue) ![Python](https://img.shields.io/badge/Python-3.8+-green) ![Flask](https://img.shields.io/badge/Flask-3.0-lightgrey)

## ✨ Demo
https://youtube.supervan.uk/

## ✨ Features

- 🎬 **YouTube Transcript Extraction** - Automatically extracts video transcripts
- 🤖 **AI-Powered Summaries** - Uses Google Gemini AI for intelligent summarization
- 🎧 **Audio Podcast Generation** - Converts summaries into engaging 2-host audio dialogues
- 📜 **History Log** - Automatically saves your recent summaries for easy access
- 💬 **Interactive Chat** - Ask questions and chat with the video content
- 🧠 **Mind Map Visualization** - View a visual breakdown of the video's key concepts
- 📝 **Quiz Mode** - Test your understanding with auto-generated quizzes
- 📱 **PWA Support** - Install as a native app on mobile and desktop
- 📏 **Customizable Length** - Choose from short, medium, or long summaries
- 🎯 **Adjustable Tone** - Select conversational, professional, or technical (direct & dense) tone
- 🎨 **Beautiful UI** - Modern dark mode design with glassmorphism effects
- 📋 **Copy to Clipboard** - Easy one-click summary copying

## 🔒 Security & Privacy

- **API Key Storage**: Your Gemini API key is stored securely in a `.env` file on your local machine and never exposed to the frontend
- **No Data Collection**: No video data or summaries are stored on any server
- **Local Processing**: All processing happens locally on your machine
- **HTTPS Ready**: Can be easily configured for HTTPS in production

> **Note**: The `.env` file is excluded from version control via `.gitignore` to prevent accidental exposure of your API key

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure your API key**
   
   Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Run the application**
   ```bash
   python3 app.py
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5000`

That's it! You're ready to start summarizing YouTube videos.

## 📖 How to Use

1. **Start the server** (if not already running)
   ```bash
   python3 app.py
   ```

2. **Open the application** in your browser at `http://localhost:5000`

3. **Paste a YouTube URL** into the input field

4. **Click "Summarize"** and wait for the magic to happen!

The application will:
-   Extract the video transcript
-   Display video information with thumbnail
-   Generate an AI-powered summary
-   Allow you to copy the summary with one click the "Copy" button to copy the summary to your clipboard

## 🛠️ Technical Details

### Dependencies

-   **Flask 3.0.0** - Web framework
-   **Flask-CORS 4.0.0** - Cross-origin resource sharing
-   **youtube-transcript-api 1.2.3** - YouTube transcript extraction
-   **google-generativeai 0.8.5** - Google Gemini AI integration
-   **python-dotenv 1.0.0** - Environment variable management

### Frontend
- **Inter Font** - Clean, modern typography

## 🎨 Design Features

- Dark mode with vibrant gradient accents
- Glassmorphism card effects
- Smooth animations and transitions
- Responsive layout for all screen sizes
- Custom scrollbars
- Micro-interactions on hover

## 📝 API Endpoints

### `POST /api/extract-transcript`
Extracts transcript from a YouTube video.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "video_id": "VIDEO_ID",
  "transcript": "Full transcript text...",
  "length": 12345
}
```

### `POST /api/summarize`
Generates an AI summary of the transcript.

**Request Body:**
```json
{
  "transcript": "Full transcript text...",
  "api_key": "YOUR_GEMINI_API_KEY"
}
```

**Response:**
```json
{
  "success": true,
  "summary": "AI-generated summary..."
}
```
```

### `POST /api/podcast`
Generates an audio podcast script from the transcript.

**Request Body:**
```json
{
  "transcript": "Full transcript text..."
}
```

**Response:**
```json
{
  "success": true,
  "script": [
      {"speaker": "Alex", "text": "..."},
      {"speaker": "Jamie", "text": "..."}
  ]
}
```
## ⚠️ Troubleshooting

### "No transcript found for this video"
- The video may not have captions/subtitles enabled
- Try a different video with auto-generated or manual captions

### "Invalid API key"
- Verify your Gemini API key is correct
- Get a new key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### CORS errors
- Make sure the Flask server is running on `http://localhost:5000`
- Check that flask-cors is properly installed

## 📄 License

This project is open source and available for personal and educational use.

## 🙏 Acknowledgments

- Google Gemini AI for powerful summarization
- YouTube Transcript API for transcript extraction
- The open-source community

---

**Made with ❤️ using Flask and Gemini AI**
