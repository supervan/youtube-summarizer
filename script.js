/**
 * YouTube Summarizer Frontend Script
 * 
 * This script handles:
 * 1. User interactions (clicking buttons, submitting forms).
 * 2. API calls to the backend (extracting transcripts, generating summaries).
 * 3. UI updates (showing loading states, displaying results).
 * 4. Managing the chat interface for querying the video content.
 */

// DOM Elements
const summarizerForm = document.getElementById('summarizerForm');
const youtubeUrlInput = document.getElementById('youtubeUrl');
const summaryLengthSelect = document.getElementById('summaryLength');
const summaryToneSelect = document.getElementById('summaryTone');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');

const inputSection = document.getElementById('inputSection');
const toggleInputBtn = document.getElementById('toggleInputBtn');
const resetBtn = document.getElementById('resetBtn');

const videoInfoCard = document.getElementById('videoInfoCard');
const videoThumbnail = document.getElementById('videoThumbnail');
const thumbnailContainer = document.getElementById('thumbnailContainer');
const playVideoBtn = document.getElementById('playVideoBtn');
const videoTitle = document.getElementById('videoTitle');
const transcriptLength = document.getElementById('transcriptLength');

const summaryCard = document.getElementById('summaryCard');
const summaryContent = document.getElementById('summaryContent');
const copyBtn = document.getElementById('copyBtn');
// readAloudBtn and voiceSelect removed
let voices = [];

const errorCard = document.getElementById('errorCard');
const errorMessage = document.getElementById('errorMessage');

// Install prompt elements
const installPrompt = document.getElementById('installPrompt');
const installLink = document.getElementById('installLink');
const installModal = document.getElementById('installModal');
const closeModal = document.getElementById('closeModal');
const androidInstructions = document.getElementById('androidInstructions');
const iosInstructions = document.getElementById('iosInstructions');

// Mind Map Modal elements
const mindMapModal = document.getElementById('mindMapModal');
const closeMindMapModal = document.getElementById('closeMindMapModal');
const fullScreenMindMap = document.getElementById('fullScreenMindMap');
const expandMindMapBtn = document.getElementById('expandMindMapBtn');

// API Configuration
const API_BASE = window.location.origin;

// Initialize app
// Global state
let currentTranscript = '';
let enabledFeatures = {};
let player; // YouTube Player instance
let deferredPrompt; // For PWA install prompt

// Load YouTube IFrame API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// YouTube API Callback
window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('youtubePlayer', {
        height: '360',
        width: '100%',
        videoId: '', // Will be set later
        playerVars: {
            'playsinline': 1
        }
    });
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupEventListeners();
    // checkInstallPrompt called via event listener now
    handleSharedContent();
    fetchFeatures(); // Fetch feature flags
});

// Capture PWA install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can add to home screen
    const installPrompt = document.getElementById('installPrompt');
    installPrompt.classList.remove('hidden');

    // Hide manual instructions if we have the native prompt
    const androidInstructions = document.getElementById('androidInstructions');
    if (androidInstructions) androidInstructions.classList.add('hidden');
});

// Fetch feature flags
async function fetchFeatures() {
    try {
        const response = await fetch(`${API_BASE}/api/features`);
        enabledFeatures = await response.json();
    } catch (error) {
        console.error('Failed to fetch features:', error);
        // Fallback defaults
        enabledFeatures = { chat: true, steps: true, quiz: true };
    }
}

// Setup event listeners
function setupEventListeners() {
    summarizerForm.addEventListener('submit', handleSubmit);
    copyBtn.addEventListener('click', copySummary);
    // readAloudBtn listener removed
    toggleInputBtn.addEventListener('click', () => toggleInputSection());

    // Voice selection removed
    resetBtn.addEventListener('click', resetApp);

    // Feature Tabs
    document.querySelectorAll('.feature-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab));
    });

    // Chat
    document.getElementById('chatSubmitBtn').addEventListener('click', handleChatSubmit);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatSubmit(e);
    });

    // Steps
    document.getElementById('generateStepsBtn').addEventListener('click', handleStepsRequest);

    // Quiz
    document.getElementById('startQuizBtn').addEventListener('click', handleQuizRequest);
    document.getElementById('retryQuizBtn').addEventListener('click', resetQuiz);

    // Podcast
    document.getElementById('podcastBtn').addEventListener('click', handlePodcastRequest);
    document.getElementById('podcastPlayPauseBtn').addEventListener('click', togglePodcastPlayback);
    document.getElementById('podcastStopBtn').addEventListener('click', stopPodcast);

    // Install prompt listeners
    installLink.addEventListener('click', async (e) => {
        e.preventDefault();

        if (deferredPrompt) {
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // We've used the prompt, so it can't be used again, discard it
            deferredPrompt = null;
            // Hide the prompt button
            installPrompt.classList.add('hidden');
        } else {
            // Fallback to manual instructions
            installModal.classList.remove('hidden');
        }
    });

    // Close modal when clicking outside
    installModal.addEventListener('click', (e) => {
        if (e.target === installModal) {
            installModal.classList.add('hidden');
        }
    });

    closeModal.addEventListener('click', () => {
        installModal.classList.add('hidden');
    });
}

// Switch Feature Tabs
function switchTab(selectedTab) {
    // Deactivate all tabs and hide content
    document.querySelectorAll('.feature-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.feature-content').forEach(content => content.classList.add('hidden'));

    // Activate selected tab and show content
    selectedTab.classList.add('active');
    const targetId = selectedTab.dataset.target;
    document.getElementById(targetId).classList.remove('hidden');
}

// Show available features
function showFeatures() {
    const container = document.getElementById('featuresContainer');
    let hasFeatures = false;

    if (enabledFeatures.chat) {
        document.getElementById('tabChat').classList.remove('hidden');
        hasFeatures = true;
    }
    if (enabledFeatures.steps) {
        document.getElementById('tabSteps').classList.remove('hidden');
        hasFeatures = true;
    }
    if (enabledFeatures.quiz) {
        document.getElementById('tabQuiz').classList.remove('hidden');
        hasFeatures = true;
    }


    if (hasFeatures) {
        container.classList.remove('hidden');
        // Activate first available tab
        const firstTab = container.querySelector('.feature-tab:not(.hidden)');
        if (firstTab) switchTab(firstTab);
    }
}

// --- Chat Feature ---
async function handleChatSubmit(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('chatInput');
    const question = input.value.trim();
    if (!question) return;

    // Add user message
    addChatMessage(question, 'user');
    input.value = '';

    // Show loading state
    const loadingId = addChatMessage('Thinking...', 'ai', true);

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: currentTranscript, question })
        });
        const data = await response.json();

        // Remove loading message
        document.getElementById(loadingId).remove();

        if (data.success) {
            addChatMessage(data.answer, 'ai');
        } else {
            addChatMessage('Sorry, I encountered an error.', 'ai');
        }
    } catch (error) {
        document.getElementById(loadingId).remove();
        addChatMessage('Network error. Please try again.', 'ai');
    }
}

function addChatMessage(text, sender, isLoading = false) {
    const history = document.getElementById('chatHistory');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}`;
    const id = 'msg-' + Date.now();
    msgDiv.id = id;

    let contentHtml = isLoading ? '<em>Thinking...</em>' : formatMarkdown(text);

    msgDiv.innerHTML = `
        <div class="message-content">
            ${contentHtml}
        </div>
    `;
    history.appendChild(msgDiv);
    history.scrollTop = history.scrollHeight;
    return id;
}

// --- Steps Feature ---
async function handleStepsRequest() {
    const btn = document.getElementById('generateStepsBtn');
    const content = document.getElementById('stepsContent');

    btn.disabled = true;
    btn.textContent = 'Generating Steps...';
    content.innerHTML = '<div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>';

    try {
        const response = await fetch(`${API_BASE}/api/steps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: currentTranscript })
        });
        const data = await response.json();

        if (data.success) {
            if (data.steps.includes('NO_STEPS_FOUND')) {
                content.innerHTML = '<p>No specific tutorial steps found in this video.</p>';
            } else {
                content.innerHTML = formatMarkdown(data.steps);
            }
            btn.classList.add('hidden'); // Hide button after success
        } else {
            content.innerHTML = '<p class="error">Failed to generate steps.</p>';
            btn.disabled = false;
            btn.textContent = 'Try Again';
        }
    } catch (error) {
        content.innerHTML = '<p class="error">Network error.</p>';
        btn.disabled = false;
        btn.textContent = 'Try Again';
    }
}

// --- Quiz Feature ---
async function handleQuizRequest() {
    const startView = document.getElementById('quizStartView');
    const quizContent = document.getElementById('quizContent');
    const btn = document.getElementById('startQuizBtn');

    btn.disabled = true;
    btn.textContent = 'Generating Quiz...';

    try {
        const response = await fetch(`${API_BASE}/api/quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: currentTranscript })
        });
        const data = await response.json();

        if (data.success) {
            startView.classList.add('hidden');
            quizContent.classList.remove('hidden');
            renderQuiz(data.quiz);
        } else {
            alert('Failed to generate quiz');
            btn.disabled = false;
            btn.textContent = 'Start Quiz';
        }
    } catch (error) {
        alert('Network error');
        btn.disabled = false;
        btn.textContent = 'Start Quiz';
    }
}

let currentQuizScore = 0;

function renderQuiz(questions) {
    const container = document.getElementById('quizContent');
    container.innerHTML = '';
    currentQuizScore = 0;

    questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'quiz-question-card';

        let optionsHtml = '';
        q.options.forEach((opt, i) => {
            optionsHtml += `<button class="quiz-option-btn" onclick="checkAnswer(this, ${i}, ${q.correct_index}, ${index})">${opt}</button>`;
        });

        card.innerHTML = `
            <div class="quiz-question-text">${index + 1}. ${q.question}</div>
            <div class="quiz-options" id="q-options-${index}">
                ${optionsHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

window.checkAnswer = function (btn, selectedIndex, correctIndex, questionIndex) {
    const parent = document.getElementById(`q-options-${questionIndex}`);
    const buttons = parent.querySelectorAll('.quiz-option-btn');

    // Disable all buttons in this question
    buttons.forEach(b => b.disabled = true);

    if (selectedIndex === correctIndex) {
        btn.classList.add('correct');
        currentQuizScore++;
    } else {
        btn.classList.add('incorrect');
        buttons[correctIndex].classList.add('correct'); // Show correct answer
    }

    // Check if all answered (simple check: count disabled groups)
    const totalQuestions = document.querySelectorAll('.quiz-question-card').length;
    const answeredQuestions = document.querySelectorAll('.quiz-option-btn[disabled]').length / 4; // Approx

    // Show score if it's the last question interaction (or just show a "Finish" button? Let's auto-show score at bottom)
    // Actually, let's just update a score counter or show the score view at the end.
    // For simplicity, let's add a "Finish" button at the bottom or detect completion.

    // Let's just show the score section if all questions are answered.
    // A better way:
    const allCards = document.querySelectorAll('.quiz-question-card');
    let allAnswered = true;
    allCards.forEach(card => {
        if (!card.querySelector('.quiz-option-btn[disabled]')) allAnswered = false;
    });

    if (allAnswered) {
        document.getElementById('quizContent').classList.add('hidden');
        document.getElementById('quizScore').classList.remove('hidden');
        document.getElementById('scoreValue').textContent = currentQuizScore;
    }
};

function resetQuiz() {
    document.getElementById('quizScore').classList.add('hidden');
    document.getElementById('quizStartView').classList.remove('hidden');
    document.getElementById('startQuizBtn').disabled = false;
    document.getElementById('startQuizBtn').textContent = 'Start Quiz';
}

// Reset Application
function resetApp() {
    youtubeUrlInput.value = '';
    hideAllCards();
    window.speechSynthesis.cancel(); // Stop speaking
    toggleInputSection(true); // Ensure input is expanded

    // Reset features
    document.getElementById('featuresContainer').classList.add('hidden');
    document.getElementById('chatHistory').innerHTML = '<div class="chat-message ai"><div class="message-content"><p>Hi! Ask me anything about this video.</p></div></div>';
    document.getElementById('stepsContent').innerHTML = '';
    document.getElementById('generateStepsBtn').classList.remove('hidden');
    document.getElementById('generateStepsBtn').disabled = false;
    document.getElementById('generateStepsBtn').textContent = 'Generate Steps';
    resetQuiz();

    // Reset defaults
    summaryLengthSelect.value = 'short';
    summaryToneSelect.value = 'conversational';
}

// Toggle Input Section
function toggleInputSection(forceState = null) {
    console.log('🔄 Toggle called! forceState:', forceState);
    const isCollapsed = inputSection.classList.contains('collapsed');
    console.log('   Current collapsed state:', isCollapsed);
    const shouldCollapse = forceState !== null ? !forceState : !isCollapsed;
    console.log('   Should collapse:', shouldCollapse);

    const iconMinus = document.getElementById('iconMinus');
    const iconPlus = document.getElementById('iconPlus');

    if (shouldCollapse) {
        // Collapse
        console.log('   → Collapsing...');
        inputSection.classList.add('collapsed');
        inputSection.setAttribute('style', 'max-height: 0 !important; opacity: 0 !important; margin-bottom: 0 !important; overflow: hidden !important; transition: all 0.3s ease !important;');

        if (iconMinus) {
            iconMinus.setAttribute('style', 'display: none !important;');
        }
        if (iconPlus) {
            iconPlus.setAttribute('style', 'display: block !important;');
        }
    } else {
        // Expand
        console.log('   → Expanding...');
        inputSection.classList.remove('collapsed');
        inputSection.setAttribute('style', 'max-height: 500px !important; opacity: 1 !important; margin-bottom: 1.5rem !important; overflow: hidden !important; transition: all 0.3s ease !important;');

        if (iconMinus) {
            iconMinus.setAttribute('style', 'display: block !important;');
        }
        if (iconPlus) {
            iconPlus.setAttribute('style', 'display: none !important;');
        }
    }
    console.log('   ✅ Toggle complete. Applied styles:', inputSection.getAttribute('style'));
}

// Hide all result cards
function hideAllCards() {
    videoInfoCard.classList.add('hidden');
    summaryCard.classList.add('hidden');
    errorCard.classList.add('hidden');
    document.getElementById('featuresContainer').classList.add('hidden');
    window.speechSynthesis.cancel(); // Stop speaking
}

// Show error
function showError(message) {
    hideAllCards();
    errorMessage.textContent = message;
    errorCard.classList.remove('hidden');
    errorCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    toggleInputSection(true); // Expand input on error
}

// Set loading state
function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnText.classList.toggle('hidden', isLoading);
    btnLoader.classList.toggle('hidden', !isLoading);
}

// Show Skeleton Loading
function showSkeletonLoading() {
    // Video Info Skeleton
    // Hide player and thumbnail
    const playerContainer = document.getElementById('playerContainer');
    if (playerContainer) playerContainer.classList.add('hidden');
    if (thumbnailContainer) thumbnailContainer.classList.add('hidden');

    // Create skeleton if not exists
    let skeletonThumb = videoInfoCard.querySelector('.skeleton-thumbnail');
    if (!skeletonThumb) {
        skeletonThumb = document.createElement('div');
        skeletonThumb.className = 'skeleton skeleton-thumbnail';
        videoInfoCard.querySelector('.video-preview').prepend(skeletonThumb);
    } else {
        skeletonThumb.classList.remove('hidden');
    }

    videoTitle.innerHTML = '<div class="skeleton skeleton-text title"></div>';
    transcriptLength.innerHTML = '<div class="skeleton skeleton-text short"></div>';

    videoInfoCard.classList.remove('hidden');

    // Summary Skeleton
    summaryContent.innerHTML = `
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <br>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
    `;
    summaryCard.classList.remove('hidden');
    summaryCard.classList.remove('hidden');
    copyBtn.classList.add('hidden'); // Ensure copy button is hidden
}

// Extract video ID from URL
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Handle form submission
/**
 * Handles the summarization process.
 * 1. Validates the YouTube URL.
 * 2. Calls the backend to extract the transcript.
 * 3. Calls the backend to generate a summary.
 * 4. Updates the UI with the results.
 */
async function handleSubmit(e) {
    e.preventDefault();

    const youtubeUrl = youtubeUrlInput.value.trim();

    if (!youtubeUrl) {
        showError('Please enter a YouTube URL');
        return;
    }

    // Validate URL
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
        showError('Invalid YouTube URL. Please enter a valid YouTube video link.');
        return;
    }

    hideAllCards();
    setLoading(true);
    toggleInputSection(false); // Collapse input
    showSkeletonLoading(); // Show skeletons

    try {
        // Step 1: Extract transcript
        const transcriptResponse = await fetch(`${API_BASE}/api/extract-transcript`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: youtubeUrl })
        });

        const transcriptData = await transcriptResponse.json();

        if (!transcriptResponse.ok) {
            throw new Error(transcriptData.error || 'Failed to extract transcript');
        }

        // Store transcript globally for other features
        currentTranscript = transcriptData.transcript;

        // Show video info (removes skeleton)
        showVideoInfo(videoId, transcriptData);

        // Step 2: Generate summary (API key is now in backend .env file)
        const summaryResponse = await fetch(`${API_BASE}/api/summarize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcript: transcriptData.transcript,
                length: summaryLengthSelect.value,
                tone: summaryToneSelect.value
            })
        });

        const summaryData = await summaryResponse.json();

        if (!summaryResponse.ok) {
            throw new Error(summaryData.error || 'Failed to generate summary');
        }

        // Show summary
        showSummary(summaryData.summary);

        // Show enabled features
        showFeatures();

    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

// Show video information
// Show video information
function showVideoInfo(videoId, data) {
    // Remove skeleton
    const skeletonThumb = videoInfoCard.querySelector('.skeleton-thumbnail');
    if (skeletonThumb) skeletonThumb.classList.add('hidden');

    // Show thumbnail, hide player initially
    const playerContainer = document.getElementById('playerContainer');
    if (playerContainer) playerContainer.classList.add('hidden');

    if (thumbnailContainer) {
        thumbnailContainer.classList.remove('hidden');
        videoThumbnail.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    // Prepare player (but don't auto-play yet)
    if (player && player.cueVideoById) {
        player.cueVideoById(videoId);
    } else {
        setTimeout(() => {
            if (player && player.cueVideoById) player.cueVideoById(videoId);
        }, 1000);
    }

    videoTitle.textContent = data.title || `Video ID: ${videoId}`;
    transcriptLength.textContent = `Transcript: ${data.length} characters`;

    videoInfoCard.classList.remove('hidden');
    videoInfoCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Show summary
function showSummary(summary) {
    // Convert markdown-style formatting to HTML
    let formattedSummary = formatMarkdown(summary);

    summaryContent.innerHTML = formattedSummary;
    summaryCard.classList.remove('hidden');
    copyBtn.classList.remove('hidden'); // Show copy button
    document.getElementById('podcastBtn').classList.remove('hidden'); // Show podcast button
    summaryCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Populate Voice List removed
// Toggle Read Aloud removed
// updateReadButton removed

// Copy summary to clipboard
async function copySummary() {
    const text = summaryContent.innerText;
    const url = youtubeUrlInput.value.trim();
    const clipboardText = url ? `${url}\n\n${text}` : text;

    try {
        await navigator.clipboard.writeText(clipboardText);

        // Visual feedback
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.5 2L6 9.5L2.5 6" stroke="currentColor" fill="none" stroke-width="2"/>
            </svg>
            Copied!
        `;

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);

    } catch (error) {
        console.error('Failed to copy:', error);
    }
}

// Format markdown to HTML (basic implementation)
function formatMarkdown(text) {
    return text
        .replace(/### (.*?)(\n|$)/g, '<h4>$1</h4>')
        .replace(/## (.*?)(\n|$)/g, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\* (.*?)(\n|$)/g, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/\[(\d{1,2}):(\d{2})\]/g, '<a href="#" class="timestamp-link" onclick="seekTo($1 * 60 + $2 * 1); return false;">[$1:$2]</a>') // Timestamp linking
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
}

// Start video playback (switch from thumbnail to player)
function startVideo() {
    if (thumbnailContainer) thumbnailContainer.classList.add('hidden');
    const playerContainer = document.getElementById('playerContainer');
    if (playerContainer) playerContainer.classList.remove('hidden');

    if (player && player.playVideo) {
        player.playVideo();
    }
}

// Seek video to timestamp
window.seekTo = function (seconds) {
    // Ensure player is visible
    if (thumbnailContainer && !thumbnailContainer.classList.contains('hidden')) {
        startVideo();
    }

    if (player && player.seekTo) {
        player.seekTo(seconds, true);
        player.playVideo();
    }
};


// --- Podcast Feature ---
async function handlePodcastRequest() {
    const btn = document.getElementById('podcastBtn');
    const originalText = btn.innerHTML;

    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        btn.innerHTML = originalText.replace('Stop', 'Podcast');
        btn.classList.remove('btn-active');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = 'Generating...';

    try {
        const response = await fetch(`${API_BASE}/api/podcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: currentTranscript })
        });
        const data = await response.json();

        if (data.success) {
            btn.disabled = false;
            btn.classList.add('btn-active');
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
                Stop Podcast
            `;

            playPodcastScript(data.script, () => {
                // On end
                btn.classList.remove('btn-active');
                btn.innerHTML = originalText;
            });
        } else {
            alert('Failed to generate podcast');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (error) {
        console.error(error);
        alert('Network error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// --- Podcast Feature ---
let isPodcastPlaying = false;
let isPodcastPaused = false;
let podcastScript = [];
let currentLineIndex = 0;
let podcastVoices = { a: null, b: null };

async function handlePodcastRequest() {
    const btn = document.getElementById('podcastBtn');
    const originalText = btn.innerHTML;

    // If already playing, just scroll to controls
    if (isPodcastPlaying) {
        document.getElementById('podcastControls').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="loader" style="width: 16px; height: 16px;"></div> Generating...';

    try {
        const response = await fetch(`${API_BASE}/api/podcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: currentTranscript })
        });
        const data = await response.json();

        if (data.success) {
            // Show controls
            const controls = document.getElementById('podcastControls');
            controls.classList.remove('hidden');
            controls.style.display = 'flex';

            // Start playback
            podcastScript = data.script;
            playPodcastScript(podcastScript);
        } else {
            alert('Failed to generate podcast');
        }
    } catch (error) {
        console.error(error);
        alert('Network error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function playPodcastScript(script) {
    // Reset state
    window.speechSynthesis.cancel();
    isPodcastPlaying = true;
    isPodcastPaused = false;
    currentLineIndex = 0;

    // Update UI
    // Update UI
    updatePodcastUI('playing');
    updatePodcastProgress();

    const voices = window.speechSynthesis.getVoices();
    // Select two distinct voices
    podcastVoices.a = voices.find(v => v.name.includes('Male') || v.name.includes('Google US English')) || voices[0];
    podcastVoices.b = voices.find(v => v.name.includes('Female') || v.name.includes('Google UK English Female')) || voices[1] || voices[0];

    speakNextLine();
}

function speakNextLine() {
    if (!isPodcastPlaying || isPodcastPaused) return;

    if (currentLineIndex >= podcastScript.length) {
        stopPodcast();
        return;
    }

    const line = podcastScript[currentLineIndex];
    const utterance = new SpeechSynthesisUtterance(line.text);

    // Assign voice based on speaker
    utterance.voice = (line.speaker === 'Alex') ? podcastVoices.a : podcastVoices.b;

    utterance.onend = () => {
        if (isPodcastPlaying && !isPodcastPaused) {
            currentLineIndex++;
            updatePodcastProgress();
            speakNextLine();
        }
    };

    utterance.onerror = (e) => {
        console.error('Speech error:', e);
        if (isPodcastPlaying && !isPodcastPaused) {
            currentLineIndex++;
            updatePodcastProgress();
            speakNextLine();
        }
    };

    window.speechSynthesis.speak(utterance);
}

function togglePodcastPlayback() {
    if (!isPodcastPlaying) return;

    if (isPodcastPaused) {
        // Resume
        isPodcastPaused = false;
        window.speechSynthesis.resume();
        // If nothing was speaking (e.g. paused between lines), start next line
        if (!window.speechSynthesis.speaking) {
            speakNextLine();
        }
        updatePodcastUI('playing');
    } else {
        // Pause
        isPodcastPaused = true;
        window.speechSynthesis.pause();
        updatePodcastUI('paused');
    }
}

function stopPodcast() {
    isPodcastPlaying = false;
    isPodcastPaused = false;
    currentLineIndex = 0;
    window.speechSynthesis.cancel();

    // Hide controls
    document.getElementById('podcastControls').classList.add('hidden');
}

function updatePodcastUI(state) {
    const playPauseBtn = document.getElementById('podcastPlayPauseBtn');
    const statusText = document.getElementById('podcastStatus');

    if (state === 'playing') {
        playPauseBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            Pause
        `;
        statusText.textContent = 'Playing...';
    } else {
        playPauseBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Resume
        `;
        statusText.textContent = 'Paused';
    }
}

function updatePodcastProgress() {
    if (!podcastScript.length) return;

    const progress = Math.min(100, Math.round((currentLineIndex / podcastScript.length) * 100));
    document.getElementById('podcastProgressBar').style.width = `${progress}%`;
    document.getElementById('podcastProgressText').textContent = `${progress}%`;
}

// Handle shared content from Web Share Target
function handleSharedContent() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url') || urlParams.get('text') || urlParams.get('title');

    if (sharedUrl) {
        // Check if it's a YouTube URL
        let videoId = extractVideoId(sharedUrl);

        // If direct extraction failed, try to find a URL inside the text
        if (!videoId) {
            const urlMatch = sharedUrl.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
                videoId = extractVideoId(urlMatch[0]);
                if (videoId) {
                    youtubeUrlInput.value = urlMatch[0];
                }
            }
        } else {
            youtubeUrlInput.value = sharedUrl;
        }

        if (videoId) {
            // Expand input section if collapsed
            if (inputSection.classList.contains('collapsed')) {
                toggleInputSection(true);
            }

            // Scroll to input
            youtubeUrlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Clean up URL (remove query params)
        window.history.replaceState({}, document.title, '/');
    }
}

// Check if install prompt should be shown (Fallback for when beforeinstallprompt doesn't fire but we want to show manual instructions)
function checkInstallPrompt() {
    // Only run this if deferredPrompt hasn't already fired
    if (deferredPrompt) return;

    // Check if already installed (running in standalone mode)
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Show prompt only on mobile AND when not installed
    if (isMobile && !isInstalled) {
        // We don't automatically show it here anymore to avoid conflict with native prompt logic.
        // But we can show it if we want to offer manual instructions.
        // For now, let's rely on beforeinstallprompt for Android, and this for iOS (which doesn't support beforeinstallprompt)

        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            installPrompt.classList.remove('hidden');
            androidInstructions.classList.add('hidden');
            iosInstructions.classList.remove('hidden');
        }
    }
}
