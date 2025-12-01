/**
 * YouTube Summarizer Frontend Script
 * 
 * This script handles:
 * 1. User interactions (clicking buttons, submitting forms).
 * 2. API calls to the backend (extracting transcripts, generating summaries).
 * 3. UI updates (showing loading states, displaying results).
 * 4. Managing the chat interface for querying the video content.
 */

// Global Error Handler
window.onerror = function (msg, url, line, col, error) {
    console.error("Script Error:", msg, "Line:", line, error);
    // alert("Script Error: " + msg + "\nLine: " + line); // Uncomment for aggressive debugging
};

// Icons
const TONE_ICONS = {
    'conversational': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    'professional': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
    'witty': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
    'sarcastic': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 12l-2-2-2 2-2-2-2 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
    'technical': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>'
};

const LENGTH_ICONS = {
    'short': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="12" x2="3" y2="12"></line></svg>',
    'medium': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="14" x2="3" y2="14"></line></svg>',
    'long': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="12" x2="3" y2="12"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>'
};

// DOM Elements
const summarizerForm = document.getElementById('summarizerForm');
const youtubeUrlInput = document.getElementById('youtubeUrl');
const summaryLengthSelect = document.getElementById('summaryLength');
const summaryToneSelect = document.getElementById('summaryTone');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const toggleInputBtn = document.getElementById('toggleInputBtn');

// Results Section Elements
const resultsContainer = document.getElementById('resultsContainer');
const videoThumbnail = document.getElementById('videoThumbnail');
const videoPlayerWrapper = document.getElementById('videoPlayerWrapper');
const videoTitle = document.getElementById('videoTitle');
const summaryText = document.getElementById('summaryText');
const copyBtn = document.getElementById('copyBtn');
const podcastBtn = document.getElementById('podcastBtn');
const toggleResultsBtn = document.getElementById('toggleResultsBtn');
const resultsContent = document.getElementById('resultsContent');
const tabsContainer = document.getElementById('tabsContainer');
const tabContent = document.getElementById('tabContent');

// Log Section Elements
const logSection = document.getElementById('logSection');
const logList = document.getElementById('logList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const scrollToLogBtn = document.getElementById('scrollToLogBtn');

// Tabs
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.chat-container, #contentSteps, #contentQuiz');

let voices = [];
let isReading = false;
let isPaused = false;
let currentCharIndex = 0;
let isSwappingVoice = false;

function populateVoiceList() {
    if (!window.speechSynthesis) return;

    voices = window.speechSynthesis.getVoices();
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;

    // Select 3 voices: 1 Male, 2 Female (Best guess)
    // Common names: "Google US English" (Female), "Google UK English Male", "Google UK English Female"
    // "Microsoft David" (Male), "Microsoft Zira" (Female)

    let selectedVoices = [];

    // Try to find specific high-quality voices first
    const googleUS = voices.find(v => v.name === 'Google US English'); // Often Female
    const googleUKFemale = voices.find(v => v.name === 'Google UK English Female');
    const googleUKMale = voices.find(v => v.name === 'Google UK English Male');

    const microsoftDavid = voices.find(v => v.name.includes('David')); // Male
    const microsoftZira = voices.find(v => v.name.includes('Zira')); // Female
    const microsoftMark = voices.find(v => v.name.includes('Mark')); // Male

    // Build list
    if (googleUS) selectedVoices.push({ name: 'Mary', voice: googleUS });
    else if (microsoftZira) selectedVoices.push({ name: 'Mary', voice: microsoftZira });

    if (googleUKFemale) selectedVoices.push({ name: 'Angela', voice: googleUKFemale });

    if (googleUKMale) selectedVoices.push({ name: 'John', voice: googleUKMale });
    else if (microsoftDavid) selectedVoices.push({ name: 'John', voice: microsoftDavid });
    else if (microsoftMark) selectedVoices.push({ name: 'John', voice: microsoftMark });

    // Fallback if we don't have enough
    if (selectedVoices.length < 3) {
        const englishVoices = voices.filter(v => v.lang.includes('en') && !selectedVoices.some(sv => sv.voice === v));
        const fallbackNames = ['Mary', 'Angela', 'John'];
        englishVoices.slice(0, 3 - selectedVoices.length).forEach((v, i) => {
            const name = fallbackNames[selectedVoices.length] || `Voice ${selectedVoices.length + 1}`;
            selectedVoices.push({ name: `${name}`, voice: v });
        });
    }

    voiceSelect.innerHTML = '';

    selectedVoices.forEach((sv) => {
        const option = document.createElement('option');
        option.textContent = sv.name;
        option.value = sv.voice.name; // Use actual name as value
        voiceSelect.appendChild(option);
    });

    // Add change listener for hot-swap
    voiceSelect.onchange = handleVoiceChange;
}

function handleVoiceChange() {
    if (isReading && !isPaused) {
        // Hot swap
        isSwappingVoice = true;
        window.speechSynthesis.cancel();
        // Use a small timeout to ensure the cancel completes and state is clean before speaking again
        setTimeout(() => {
            speakNextChunk();
        }, 50);
    }
}
// Move initialization to DOMContentLoaded
// populateVoiceList(); // This line was commented out, keeping it that way as per original context.
if (window.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}

let currentUtterance = null; // Global variable to prevent GC

let readAloudTimeout = null;

let speechChunks = [];
let currentChunkIndex = 0;

function speakSummary() {
    const rawText = document.getElementById('summaryText').textContent;

    // Remove timestamps and clean up text
    const text = rawText.replace(/\[\d{1,2}:\d{2}(:\d{2})?\]/g, ' ').replace(/\s+/g, ' ').trim();

    if (text.length === 0) {
        return;
    }

    // Cancel any existing speech
    window.speechSynthesis.cancel();

    // Split into chunks (sentences) to avoid browser limits and bugs with long text
    // Split by period, question mark, exclamation mark, but keep the delimiter
    speechChunks = text.match(/[^.?!]+[.?!]+[\])'"]*|[^.?!]+$/g) || [text];
    currentChunkIndex = 0;

    speakNextChunk();
}

function speakNextChunk() {
    if (currentChunkIndex >= speechChunks.length) {
        isReading = false;
        isPaused = false;
        currentChunkIndex = 0;
        updateReadAloudButton('start');
        return;
    }

    if (!isReading) return; // Stop if flag was cleared

    const chunkText = speechChunks[currentChunkIndex].trim();
    if (!chunkText) {
        currentChunkIndex++;
        speakNextChunk();
        return;
    }

    currentUtterance = new SpeechSynthesisUtterance(chunkText);

    currentUtterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        if (e.error !== 'interrupted') {
            // Move to next chunk on error to avoid getting stuck
            currentChunkIndex++;
            speakNextChunk();
        }
    };

    const voiceSelect = document.getElementById('voiceSelect');
    const selectedVoiceName = voiceSelect.value;

    if (selectedVoiceName) {
        const voice = voices.find(v => v.name === selectedVoiceName);
        if (voice) {
            currentUtterance.voice = voice;
        }
    }

    currentUtterance.onend = () => {
        if (isSwappingVoice) {
            isSwappingVoice = false;
            // Don't advance index, just replay current chunk with new voice?
            // Or just let it continue. For simplicity, let's continue.
            // Actually, if swapping voice, we probably want to restart the current chunk.
            // But handleVoiceChange logic needs to be checked.
        }

        if (isReading && !isPaused) {
            currentChunkIndex++;
            speakNextChunk();
        }
    };

    window.speechSynthesis.speak(currentUtterance);
}

function updateReadAloudButton(state) {
    const btn = document.getElementById('readAloudBtn');
    if (!btn) return;

    if (state === 'playing') {
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            Pause
        `;
    } else if (state === 'paused') {
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Resume
        `;
    } else {
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            Read Aloud
        `;
    }
}

function toggleReadAloud() {
    // Clear any pending start
    if (readAloudTimeout) {
        clearTimeout(readAloudTimeout);
        readAloudTimeout = null;
    }

    if (isReading && !isPaused) {
        // Pause
        window.speechSynthesis.pause();
        isPaused = true;
        updateReadAloudButton('paused');
    } else if (isReading && isPaused) {
        // Resume
        window.speechSynthesis.resume();
        isPaused = false;
        updateReadAloudButton('playing');
    } else {
        // Start
        window.speechSynthesis.cancel(); // Stop any other speech
        currentChunkIndex = 0;

        // Small delay to ensure cancel completes
        readAloudTimeout = setTimeout(() => {
            isReading = true;
            isPaused = false;
            updateReadAloudButton('playing');
            speakSummary();
        }, 50);
    }
}

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

// Input Section
const inputSection = document.querySelector('.input-card');

// API Configuration
const API_BASE = window.location.origin;

// Initialize app
// Global state
let currentTranscript = '';
let enabledFeatures = {};
let player; // YouTube Player instance
let deferredPrompt; // For PWA install prompt
// const MAX_HISTORY_ITEMS = 5; // Moved to top of loadHistory logic

// Load YouTube IFrame API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// YouTube API Callback
window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('player', {
        height: '100%',
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
    // checkInstallPrompt called via event listener now
    handleSharedContent();
    fetchFeatures(); // Fetch feature flags
    loadHistory(); // Load recent summaries
    populateVoiceList(); // Initialize voices
});

// --- PWA Install Logic ---
// Capture PWA install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;

    // Show the custom install button
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) installPrompt.classList.remove('hidden');

    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Show the native install prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
                // Hide custom prompt after interaction
                installPrompt.classList.add('hidden');
            }
        });
    }
});

// Hide install prompt if app is successfully installed
window.addEventListener('appinstalled', () => {
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) installPrompt.classList.add('hidden');
    deferredPrompt = null;
    console.log('PWA was installed');
});

// Check if already running in standalone mode (installed)
if (window.matchMedia('(display-mode: standalone)').matches) {
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) installPrompt.classList.add('hidden');
}

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

    // Section Toggles
    if (toggleInputBtn) {
        toggleInputBtn.addEventListener('click', () => toggleInputSection());
    }
    if (toggleResultsBtn) {
        toggleResultsBtn.addEventListener('click', () => toggleResultsSection());
    }

    // Clear History
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }

    // Scroll to Log (Toggle visibility)
    scrollToLogBtn.addEventListener('click', () => {
        if (logSection.classList.contains('hidden')) {
            loadHistory(); // Reload history to ensure it's up to date
            logSection.classList.remove('hidden');
            scrollToLogBtn.classList.add('active');
            setTimeout(() => {
                logSection.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else {
            logSection.classList.add('hidden');
            scrollToLogBtn.classList.remove('active');
        }
    });

    // Play button overlay
    const playOverlay = videoPlayerWrapper.querySelector('.play-overlay');
    if (playOverlay) {
        playOverlay.addEventListener('click', startVideo);
    }

    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab));
    });

    // Video Player Interaction
    videoPlayerWrapper.addEventListener('click', () => {
        const playerDiv = document.getElementById('player');
        const thumb = document.getElementById('videoThumbnail');
        const overlay = videoPlayerWrapper.querySelector('.play-overlay');
        const badge = videoPlayerWrapper.querySelector('.live-badge');

        playerDiv.classList.remove('hidden');
        thumb.classList.add('hidden');
        overlay.classList.add('hidden');
        badge.classList.add('hidden');

        if (player && player.playVideo) {
            player.playVideo();
        }
    });

    // Chat
    document.getElementById('chatSubmitBtn').addEventListener('click', handleChatSubmit);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatSubmit(e);
    });

    // Podcast Button
    const podcastBtn = document.getElementById('podcastBtn');
    if (podcastBtn) {
        // Remove any existing listeners by cloning (optional, but safer to just add one unique listener if we control init)
        // Since we are in init(), we should just add it.
        podcastBtn.replaceWith(podcastBtn.cloneNode(true));
        const newPodcastBtn = document.getElementById('podcastBtn');

        newPodcastBtn.addEventListener('click', handlePodcastRequest);
    }

    // Podcast Controls
    const playPauseBtn = document.getElementById('podcastPlayPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePodcastPlayback);
    }

    const stopBtn = document.getElementById('stopPodcastBtn');
    if (stopBtn) {
        stopBtn.addEventListener('click', stopPodcast);
    }

    // Read Aloud
    const readAloudBtn = document.getElementById('readAloudBtn');
    if (readAloudBtn) {
        readAloudBtn.addEventListener('click', toggleReadAloud);
    }

    // Reset Button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetApp);
        // Show/Hide reset button based on input
        const updateResetBtnVisibility = () => {
            if (youtubeUrlInput.value.trim()) {
                resetBtn.classList.remove('hidden');
            } else {
                resetBtn.classList.add('hidden');
            }
        };

        // Initial check
        updateResetBtnVisibility();

        youtubeUrlInput.addEventListener('input', () => {
            updateResetBtnVisibility();

            const url = youtubeUrlInput.value.trim();
            if (url) {
                // Auto-load from history if match found
                const videoId = extractVideoId(url);
                if (videoId) {
                    const history = JSON.parse(localStorage.getItem('yt_summary_history') || '[]');
                    const cachedItem = history.find(item => item.id === videoId);
                    if (cachedItem) {
                        // Auto-loading from cache
                        loadHistoryItem(cachedItem);
                    }
                }
            }
        });
    }

    // Toggle Summary Button
    const toggleSummaryBtn = document.getElementById('toggleSummaryBtn');
    if (toggleSummaryBtn) {
        toggleSummaryBtn.addEventListener('click', () => {
            const summaryContent = document.getElementById('summaryText');
            if (summaryContent.classList.contains('hidden')) {
                summaryContent.classList.remove('hidden');
                toggleSummaryBtn.classList.remove('collapsed');
            } else {
                summaryContent.classList.add('hidden');
                toggleSummaryBtn.classList.add('collapsed');
            }
        });
    }
}

// Switch Feature Tabs
function switchTab(selectedTab) {
    // Deactivate all tabs
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.classList.add('inactive');
    });

    // Hide all content
    document.getElementById('contentChat').classList.add('hidden');
    document.getElementById('contentSteps').classList.add('hidden');
    document.getElementById('contentQuiz').classList.add('hidden');

    // Activate selected
    selectedTab.classList.add('active');
    selectedTab.classList.remove('inactive');

    // Show content
    const targetId = 'content' + selectedTab.dataset.tab.charAt(0).toUpperCase() + selectedTab.dataset.tab.slice(1);
    document.getElementById(targetId).classList.remove('hidden');
}

// Show available features (Tabs)
function showFeatures() {
    if (tabsContainer) tabsContainer.classList.remove('hidden');
    if (tabContent) tabContent.classList.remove('hidden');

    // Ensure Chat tab is active by default if none active
    const activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab) {
        const chatTab = document.querySelector('.tab-btn[data-tab="chat"]');
        if (chatTab) switchTab(chatTab);
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
    // Resetting app...
    try {
        youtubeUrlInput.value = '';
        hideAllCards();
        window.speechSynthesis.cancel(); // Stop speaking
        if (typeof stopPodcast === 'function') stopPodcast(); // Stop podcast if playing

        // Reset features
        const contentChat = document.getElementById('contentChat');
        if (contentChat) contentChat.classList.remove('hidden'); // Default tab

        const contentSteps = document.getElementById('contentSteps');
        if (contentSteps) contentSteps.classList.add('hidden');

        const contentQuiz = document.getElementById('contentQuiz');
        if (contentQuiz) contentQuiz.classList.add('hidden');

        // Clear chat history
        const chatHistory = document.getElementById('chatHistory');
        if (chatHistory) chatHistory.innerHTML = '<div class="chat-message ai"><div class="message-content"><p>Hi! Ask me anything about this video.</p></div></div>';

        // const stepsContent = document.getElementById('stepsContent');
        // if (stepsContent) stepsContent.innerHTML = '';

        // if (typeof resetQuiz === 'function') resetQuiz();

        // PRESERVE SETTINGS: Do not reset defaults
        // if (summaryLengthSelect) summaryLengthSelect.value = 'short';
        // if (summaryToneSelect) summaryToneSelect.value = 'conversational';

        // Ensure Chat tab is active
        const chatTab = document.querySelector('.tab-btn[data-tab="chat"]');
        if (chatTab) switchTab(chatTab);

        // Expand input section
        toggleInputSection(false); // false means expand (don't collapse)

        // Hide tabs
        if (tabsContainer) tabsContainer.classList.add('hidden');
        if (tabContent) tabContent.classList.add('hidden');

        // Hide results content
        if (resultsContent) resultsContent.classList.add('hidden');
        if (toggleResultsBtn) toggleResultsBtn.classList.add('collapsed');

        // Hide action buttons
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) actionButtons.classList.add('hidden');

        // Ensure reset button is visible if input has value (though we just cleared it, so maybe hide it?)
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.classList.add('hidden');

    } catch (error) {
        console.error('Error resetting app:', error);
    }
}

// Toggle Input Section
function toggleInputSection(forceCollapse = null) {
    const card = document.querySelector('.input-card');
    const btn = document.getElementById('toggleInputBtn');

    if (!card) return;

    const isCollapsed = card.classList.contains('collapsed');
    const shouldCollapse = forceCollapse !== null ? forceCollapse : !isCollapsed;

    if (shouldCollapse) {
        card.classList.add('collapsed');
        if (btn) btn.classList.add('collapsed');
    } else {
        card.classList.remove('collapsed');
        if (btn) btn.classList.remove('collapsed');

        // Ensure reset button is visible if input has text
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn && youtubeUrlInput && youtubeUrlInput.value.trim()) {
            resetBtn.classList.remove('hidden');
        }
    }
}

// Toggle Results Section
function toggleResultsSection(forceCollapse = null) {
    const content = document.getElementById('resultsContent');
    const btn = document.getElementById('toggleResultsBtn');

    if (!content) return;

    const isHidden = content.classList.contains('hidden');
    const shouldCollapse = forceCollapse !== null ? forceCollapse : !isHidden;

    if (shouldCollapse) {
        content.classList.add('hidden');
        if (btn) btn.classList.add('collapsed');
    } else {
        content.classList.remove('hidden');
        if (btn) btn.classList.remove('collapsed');
    }
}

// Hide all result cards
function hideAllCards() {
    resultsContainer.classList.add('hidden');
    // Stop speaking if any
    window.speechSynthesis.cancel();

    // Clear Error State
    const errorState = document.getElementById('videoErrorState');
    if (errorState) errorState.remove();

    // Reset visibility of main components
    videoPlayerWrapper.classList.remove('hidden');
    const summaryContent = document.querySelector('.summary-content-wrapper');
    if (summaryContent) summaryContent.classList.remove('hidden');

    // Hide old error card if visible
    errorCard.classList.add('hidden');
}

// Show error
function showError(message) {
    // Don't hide everything, just stop loading state
    setLoading(false);

    // If we have results shown (e.g. partial load), keep them? 
    // Or if it's a total failure, maybe hide results but keep input open.
    // Let's just show the error card.

    errorMessage.textContent = message;
    errorCard.classList.remove('hidden');
    errorCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Ensure input is visible so they can try again
    // Ensure input is visible so they can try again
    toggleInputSection(false);
}

// Set loading state
function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnText.classList.toggle('hidden', isLoading);
    btnLoader.classList.toggle('hidden', !isLoading);
}

// Show Skeleton Loading
function showSkeletonLoading(videoId) {
    // Show results container
    resultsContainer.classList.remove('hidden');

    // Show Thumbnail immediately if we have ID
    if (videoId) {
        videoThumbnail.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        videoThumbnail.classList.remove('hidden');

        // Reset player wrapper to show thumbnail
        const playerDiv = document.getElementById('player');
        const overlay = videoPlayerWrapper.querySelector('.play-overlay');
        const badge = videoPlayerWrapper.querySelector('.live-badge');

        playerDiv.classList.add('hidden');
        overlay.classList.remove('hidden');
        badge.classList.remove('hidden');

        // Clear previous title/player content
        videoPlayerWrapper.querySelector('.skeleton')?.remove();
    } else {
        // Fallback to skeleton if no ID (shouldn't happen in this flow)
        videoPlayerWrapper.innerHTML = `
            <div class="skeleton" style="width: 100%; height: 100%;"></div>
        `;
    }

    // Reset Summary to Skeleton
    summaryText.innerHTML = `
        <div class="skeleton skeleton-text title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <br>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
    `;

    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    // Stop any active playback
    if (isReading) {
        window.speechSynthesis.cancel();
        isReading = false;
        isPaused = false;
        currentCharIndex = 0;
        updateReadAloudButton('start');
    }

    // Stop podcast if playing
    stopPodcast();

    // Clear previous metadata
    const summaryFooter = document.getElementById('summaryFooter');
    if (summaryFooter) summaryFooter.innerHTML = '';

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

    // Check History Cache
    const history = JSON.parse(localStorage.getItem('yt_summary_history') || '[]');
    const cachedItem = history.find(item =>
        item.id === videoId &&
        item.length === summaryLengthSelect.value &&
        item.tone === summaryToneSelect.value
    );

    if (cachedItem) {
        // Loading from cache
        loadHistoryItem(cachedItem);
        return;
    }

    hideAllCards();

    // Clear chat history for new video
    const chatHistory = document.getElementById('chatHistory');
    if (chatHistory) chatHistory.innerHTML = '<div class="chat-message ai"><div class="message-content"><p>Hi! Ask me anything about this video.</p></div></div>';

    setLoading(true);
    showSkeletonLoading(videoId); // Show thumbnail immediately

    try {
        // Step 1: Extract transcript (with 60s timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds

        const transcriptResponse = await fetch(`${API_BASE}/api/extract-transcript`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: youtubeUrl }),
            signal: controller.signal
        });

        clearTimeout(timeoutId); // Clear timeout on response

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

        // Save to history
        saveToHistory(videoId, transcriptData.title, summaryData.summary, transcriptData.transcript, summaryLengthSelect.value, summaryToneSelect.value, transcriptData.metadata);

        // Show enabled features
        showFeatures();

        // Collapse input only after success
        toggleInputSection(true);

        // Expand results
        toggleResultsSection(false);

    } catch (error) {
        console.error('Summarize error:', error);

        // Handle Timeout specifically
        if (error.name === 'AbortError') {
            showVideoLoadError('Request Timed Out. The video might be too long or the server is busy. Please try again.');
        }
        // Check for specific errors that should show the "Video Unavailable" UI
        // SyntaxError usually means the response wasn't JSON (e.g. 500/524 HTML error page)
        else if (error instanceof SyntaxError || error.message.includes('Unexpected token') || error.message.includes('JSON')) {
            showVideoLoadError('Server Timeout or Invalid Response. The video might be too long or unavailable.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showVideoLoadError('Network Error. Please check your connection.');
        } else {
            // For other errors, we can also use the nice UI if we want, or fallback to toast
            showVideoLoadError(error.message || 'Something went wrong while processing the video.');
        }
    } finally {
        setLoading(false);
    }
}

// Show Video Load Error (In-place UI)
function showVideoLoadError(message) {
    // Hide skeleton/loading
    // We want to keep the results container visible but replace content
    resultsContainer.classList.remove('hidden');

    // Hide video player wrapper (which contains thumbnail)
    videoPlayerWrapper.classList.add('hidden');

    // Hide summary content
    const summaryContent = document.querySelector('.summary-content-wrapper');
    if (summaryContent) summaryContent.classList.add('hidden');

    // Remove any existing error container
    const existingError = document.getElementById('videoErrorState');
    if (existingError) existingError.remove();

    // Create error container
    const errorContainer = document.createElement('div');
    errorContainer.id = 'videoErrorState';
    errorContainer.className = 'video-error-state';

    errorContainer.innerHTML = `
        <div class="error-icon-wrapper">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        </div>
        <h3 class="error-title">Oops! Video Unavailable</h3>
        <p class="error-message">${message}</p>
        <button onclick="resetApp()" class="try-again-btn">Try Another Video</button>
    `;

    // Insert into results container
    resultsContainer.appendChild(errorContainer);

    // Ensure input is visible
    toggleInputSection(false);
}

// Save to History
// Save to History
function saveToHistory(videoId, title, summary, transcript, length, tone, metadata) {
    const historyItem = {
        id: videoId,
        title: title,
        summary: summary,
        transcript: transcript,
        length: length,
        tone: tone,
        metadata: metadata,
        timestamp: Date.now()
    };

    let history = JSON.parse(localStorage.getItem('yt_summary_history') || '[]');

    // Remove duplicate if exists (same video AND same params)
    history = history.filter(item => !(item.id === videoId && item.length === length && item.tone === tone));

    // Add new item to top
    history.unshift(historyItem);

    // Limit size
    if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
    }

    localStorage.setItem('yt_summary_history', JSON.stringify(history));
    loadHistory();
}

// Load History
const MAX_HISTORY_ITEMS = 50;
let currentPage = 1;
let itemsPerPage = window.innerWidth < 768 ? 5 : 10;

// Listen for resize to update items per page
window.addEventListener('resize', () => {
    const newItemsPerPage = window.innerWidth < 768 ? 5 : 10;
    if (newItemsPerPage !== itemsPerPage) {
        itemsPerPage = newItemsPerPage;
        currentPage = 1; // Reset to first page on layout change to avoid confusion
        loadHistory();
    }
});

// Load History
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('yt_summary_history') || '[]');

    // Clear list
    logList.innerHTML = '';

    if (history.length === 0) {
        logList.innerHTML = '<div class="text-slate-500 text-sm text-center py-4">No recent history</div>';
        return;
    }

    // Pagination Logic
    const totalPages = Math.ceil(history.length / itemsPerPage);

    // Ensure current page is valid
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = history.slice(startIndex, endIndex);

    currentItems.forEach(item => {
        const date = new Date(item.timestamp).toLocaleDateString();
        const lengthLabel = item.length ? item.length.charAt(0).toUpperCase() + item.length.slice(1) : '';
        const toneLabel = item.tone ? item.tone.charAt(0).toUpperCase() + item.tone.slice(1) : '';

        const toneIcon = item.tone ? (TONE_ICONS[item.tone] || TONE_ICONS['conversational']) : '';
        const lengthIcon = item.length ? (LENGTH_ICONS[item.length] || LENGTH_ICONS['medium']) : '';

        const el = document.createElement('div');
        el.className = 'log-item';
        el.innerHTML = `
            <div class="log-thumbnail-wrapper">
                <img src="https://img.youtube.com/vi/${item.id}/mqdefault.jpg" alt="Thumbnail" class="log-thumbnail">
            </div>
            <div class="log-info">
                <h4 class="log-item-title">${item.title || 'Video Summary'}</h4>
                <div class="log-meta">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    ${date}
                </div>
                <div class="log-params">
                    ${lengthLabel ? `<span class="meta-badge ${item.length}">${lengthIcon} ${lengthLabel}</span>` : ''}
                    ${toneLabel ? `<span class="meta-badge ${item.tone}">${toneIcon} ${toneLabel}</span>` : ''}
                </div>
            </div>
            <button class="log-open-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                </svg>
            </button>
        `;
        // Click on the whole item to load, except if clicking specific buttons if we add them later
        el.addEventListener('click', () => loadHistoryItem(item));
        logList.appendChild(el);
    });

    // Render Pagination Controls
    if (totalPages > 1) {
        renderPaginationControls(totalPages);
    }
}

function renderPaginationControls(totalPages) {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'pagination-controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
        </svg>
        Previous
    `;
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            loadHistory();
            // Scroll to top of log list
            document.getElementById('logSection').scrollIntoView({ behavior: 'smooth' });
        }
    };

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = `
        Next
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
        </svg>
    `;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadHistory();
            document.getElementById('logSection').scrollIntoView({ behavior: 'smooth' });
        }
    };

    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    controlsContainer.appendChild(prevBtn);
    controlsContainer.appendChild(pageInfo);
    controlsContainer.appendChild(nextBtn);

    logList.appendChild(controlsContainer);
}

function loadHistoryItem(item) {
    hideAllCards();
    stopPodcast(); // Stop podcast if playing

    // Stop Read Aloud if playing
    if (isReading) {
        window.speechSynthesis.cancel();
        isReading = false;
        isPaused = false;
        currentCharIndex = 0;
        updateReadAloudButton('start');
    }

    // Clear previous feature data
    const chatHistory = document.getElementById('chatHistory');
    if (chatHistory) chatHistory.innerHTML = '<div class="chat-message ai"><div class="message-content"><p>Hi! Ask me anything about this video.</p></div></div>';

    const stepsContent = document.getElementById('stepsContent');
    if (stepsContent) stepsContent.innerHTML = '';

    resetQuiz();

    // Set global state
    currentTranscript = item.transcript;
    youtubeUrlInput.value = `https://www.youtube.com/watch?v=${item.id}`;

    // Ensure reset button is visible
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.classList.remove('hidden');

    // Show UI
    showVideoInfo(item.id, { title: item.title, length: item.transcript.length, metadata: item.metadata });

    // Update dropdowns to match history item
    if (item.length && summaryLengthSelect) summaryLengthSelect.value = item.length;
    if (item.tone && summaryToneSelect) summaryToneSelect.value = item.tone;

    showSummary(item.summary);
    showFeatures();

    // Collapse input
    toggleInputSection(true);

    // Expand results
    toggleResultsSection(false);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearHistory() {
    if (confirm('Clear all recent summaries?')) {
        localStorage.removeItem('yt_summary_history');
        loadHistory();
    }
}

function toggleHistorySection() {
    const list = document.getElementById('recentHistoryList');
    const btn = document.getElementById('toggleHistoryBtn');

    if (list.classList.contains('collapsed')) {
        // Expand
        list.classList.remove('collapsed');
        list.style.display = 'flex';
        btn.classList.remove('collapsed');
    } else {
        // Collapse
        list.classList.add('collapsed');
        list.style.display = 'none';
        btn.classList.add('collapsed');
    }
}

// Show video information
// Format number (e.g. 1200 -> 1.2k)
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k'; // Lowercase k, no decimals for thousands usually in UI
    return num.toString();
}

// Format date (YYYYMMDD -> Nov 28, 2025)
function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return '';
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Show video information
function showVideoInfo(videoId, data) {
    // Update thumbnail
    videoThumbnail.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

    // Reset player
    const playerDiv = document.getElementById('player');
    const thumb = document.getElementById('videoThumbnail');
    const overlay = videoPlayerWrapper.querySelector('.play-overlay');
    const badge = videoPlayerWrapper.querySelector('.live-badge');

    playerDiv.classList.add('hidden');
    thumb.classList.remove('hidden');
    overlay.classList.remove('hidden');
    badge.classList.remove('hidden');

    // Prepare player
    if (player && player.cueVideoById) {
        player.cueVideoById(videoId);
    } else {
        setTimeout(() => {
            if (player && player.cueVideoById) player.cueVideoById(videoId);
        }, 1000);
    }

    videoTitle.textContent = data.title || `Video ID: ${videoId}`;

    // Render Metadata if available
    const metadata = data.metadata || {};
    const uploader = metadata.uploader || 'Unknown Channel';
    const subscribers = metadata.channel_follower_count ? formatNumber(metadata.channel_follower_count) + ' subscribers' : '';
    const views = metadata.view_count ? formatNumber(metadata.view_count) + ' views' : '';
    const uploadDate = formatDate(metadata.upload_date);

    // Create or update metadata container BELOW the video player
    let metaContainer = document.getElementById('videoMetadata');
    if (!metaContainer) {
        metaContainer = document.createElement('div');
        metaContainer.id = 'videoMetadata';
        metaContainer.className = 'video-metadata-container'; // Changed class name to avoid conflicts/styling issues
        // Insert after videoPlayerWrapper
        videoPlayerWrapper.parentNode.insertBefore(metaContainer, videoPlayerWrapper.nextSibling);
    }

    // Use a generic channel icon
    const channelIcon = `
        <div class="channel-icon-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
        </div>
    `;

    metaContainer.innerHTML = `
        <h3 class="video-info-title">${data.title || `Video ID: ${videoId}`}</h3>
        <div class="video-metadata-row">
            <div class="meta-left">
                ${channelIcon}
                <div class="meta-channel-info">
                    <div class="meta-channel-name">
                        ${uploader}
                        <svg class="verified-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-7.9 7.9z"/>
                        </svg>
                    </div>
                    <div class="meta-sub-count">${subscribers}</div>
                </div>
                <button class="subscribe-btn">Subscribe</button>
            </div>
            <div class="meta-right">
                <span class="meta-views">${views}</span>
                ${(views && uploadDate) ? '<span class="meta-dot">•</span>' : ''}
                <span class="meta-date">${uploadDate}</span>
            </div>
        </div>
    `;

    // Show results container
    resultsContainer.classList.remove('hidden');
    videoPlayerWrapper.classList.remove('hidden');
}

// Show summary
function showSummary(summary) {
    // Update summary text
    summaryText.innerHTML = formatMarkdown(summary);

    // Update metadata footer
    const summaryFooter = document.getElementById('summaryFooter');
    if (summaryFooter) {
        const lengthText = summaryLengthSelect.options[summaryLengthSelect.selectedIndex].text;
        const toneText = summaryToneSelect.options[summaryToneSelect.selectedIndex].text;
        const lengthVal = summaryLengthSelect.value;
        const toneVal = summaryToneSelect.value;

        const lengthIcon = LENGTH_ICONS[lengthVal] || LENGTH_ICONS['medium'];
        const toneIcon = TONE_ICONS[toneVal] || TONE_ICONS['conversational'];

        // Use short labels for badges (e.g. "Short", "Technical") instead of full text
        const lengthLabel = lengthVal.charAt(0).toUpperCase() + lengthVal.slice(1);
        const toneLabel = toneVal.charAt(0).toUpperCase() + toneVal.slice(1);

        summaryFooter.innerHTML = `
            ${lengthVal ? `<span class="meta-badge ${lengthVal}">${lengthIcon} ${lengthLabel}</span>` : ''}
            ${toneVal ? `<span class="meta-badge ${toneVal}">${toneIcon} ${toneLabel}</span>` : ''}
        `;
    }

    // Ensure results are visible
    resultsContainer.classList.remove('hidden');
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Show action buttons
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) actionButtons.classList.remove('hidden');
}



// Copy Summary
function copySummary() {
    const summaryText = document.getElementById('summaryText').innerText;
    const videoTitle = document.getElementById('videoTitle').textContent;

    const videoId = extractVideoId(youtubeUrlInput.value);
    const shortUrl = videoId ? `https://youtu.be/${videoId}` : youtubeUrlInput.value;

    const promoText = "\n\nSummarized by TL;DW - https://yt.supervan.uk\n(Installable as an App on Mobile & Desktop)";
    const clipboardText = `${videoTitle}\n${shortUrl}\n\n${summaryText}${promoText}`;

    navigator.clipboard.writeText(clipboardText).then(() => {
        const copyBtn = document.getElementById('copyBtn');
        const originalContent = copyBtn.innerHTML;

        copyBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
        `;

        setTimeout(() => {
            copyBtn.innerHTML = originalContent;
        }, 2000);
    }).catch(err => {
        showError('Failed to copy summary');
    });
}

// Format markdown to HTML (improved implementation)
function formatMarkdown(text) {
    if (!text) return '';

    // 1. Code blocks
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // 2. Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 3. Headers
    text = text.replace(/^### (.*$)/gm, '<h4>$1</h4>');
    text = text.replace(/^## (.*$)/gm, '<h3>$1</h3>');
    text = text.replace(/^# (.*$)/gm, '<h2>$1</h2>');

    // 4. Bold and Italic
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 5. Blockquotes
    text = text.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');

    // 6. Lists (Unordered) - Simple implementation
    // Replace lines starting with * or - with <li>
    text = text.replace(/^[\*\-] (.*$)/gm, '<li>$1</li>');

    // Wrap adjacent <li> in <ul> (This is a bit tricky with regex only, but let's try a simple approach)
    // We'll wrap the whole block of <li>s
    text = text.replace(/(<li>.*<\/li>(\n|$))+/g, '<ul>$&</ul>');

    // 7. Timestamps
    text = text.replace(/\[(\d{1,2}):(\d{2})\]/g, '<a href="#" class="timestamp-link" onclick="seekTo($1 * 60 + $2 * 1); return false;">[$1:$2]</a>');

    // 8. Paragraphs (double newlines)
    text = text.replace(/\n\n/g, '<br><br>');

    // Cleanup <ul><br> issues if any
    text = text.replace(/<\/ul><br><br>/g, '</ul>');

    return text;
}

// Start video playback (switch from thumbnail to player)
function startVideo() {
    // Hide thumbnail and overlay
    videoThumbnail.classList.add('hidden');
    const overlay = videoPlayerWrapper.querySelector('.play-overlay');
    if (overlay) overlay.classList.add('hidden');
    const badge = videoPlayerWrapper.querySelector('.live-badge');
    if (badge) badge.classList.add('hidden');

    // Show player
    const playerElement = document.getElementById('player');
    if (playerElement) playerElement.classList.remove('hidden');

    if (player && player.playVideo) {
        player.playVideo();
    }
}

// Seek video to timestamp
window.seekTo = function (seconds) {
    startVideo();
    if (player && player.seekTo) {
        player.seekTo(seconds, true);
        player.playVideo();
    }
};


// --- Podcast Feature ---
async function handlePodcastRequest(e) {
    // Use event target if available, fallback to ID
    const btn = e ? e.currentTarget : document.getElementById('podcastBtn');
    if (!btn) return;

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
            body: JSON.stringify({
                transcript: currentTranscript,
                length: summaryLengthSelect.value,
                tone: summaryToneSelect.value
            })
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

            // Show controls
            const controls = document.getElementById('podcastControls');
            controls.classList.remove('hidden');
            controls.style.display = 'flex';

            playPodcastScript(data.script, () => {
                // On end
                btn.classList.remove('btn-active');
                btn.innerHTML = originalText;
            });
        } else {
            showToast(data.error || 'Failed to generate podcast', 'error');
        }
    } catch (error) {
        console.error('Podcast generation failed:', error);
        showToast('Network error', 'error');
    } finally {
        // Ensure button is re-enabled and text restored in all cases
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
let podcastOnEndCallback = null;
let podcastTimer = null;
let podcastStartTime = 0;
let podcastElapsedTime = 0;
let podcastTotalDuration = 0;

function calculateDuration(script) {
    // Estimate duration: ~150 words per minute (2.5 words/sec)
    const totalWords = script.reduce((acc, line) => acc + line.text.split(/\s+/).length, 0);
    return Math.ceil(totalWords / 2.5);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function updatePodcastTime() {
    const timeDisplay = document.getElementById('podcastTimeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = `${formatTime(podcastElapsedTime)} / ${formatTime(podcastTotalDuration)}`;
    }
}

function startPodcastTimer() {
    stopPodcastTimer();
    podcastStartTime = Date.now() - (podcastElapsedTime * 1000);
    podcastTimer = setInterval(() => {
        podcastElapsedTime = Math.floor((Date.now() - podcastStartTime) / 1000);
        // Cap at total duration
        if (podcastElapsedTime > podcastTotalDuration) podcastElapsedTime = podcastTotalDuration;
        updatePodcastTime();
    }, 1000);
}

function stopPodcastTimer() {
    if (podcastTimer) {
        clearInterval(podcastTimer);
        podcastTimer = null;
    }
}



function playPodcastScript(script, onEnd) {
    // Update global script
    podcastScript = script;
    podcastOnEndCallback = onEnd;

    // Calculate duration
    podcastTotalDuration = calculateDuration(script);
    podcastElapsedTime = 0;

    // Reset state
    window.speechSynthesis.cancel();
    isPodcastPlaying = true;
    isPodcastPaused = false;
    currentLineIndex = 0;

    // Update UI
    updatePodcastUI('playing');
    updatePodcastTime();
    startPodcastTimer();

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
            // updatePodcastProgress(); // Removed
            speakNextLine();
        }
    };

    utterance.onerror = (e) => {
        console.error('Speech error:', e);
        if (isPodcastPlaying && !isPodcastPaused) {
            currentLineIndex++;
            // updatePodcastProgress(); // Removed
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
        startPodcastTimer();
        updatePodcastUI('playing');
    } else {
        // Pause
        isPodcastPaused = true;
        window.speechSynthesis.pause();
        stopPodcastTimer();
        updatePodcastUI('paused');
    }
}

function stopPodcast() {
    isPodcastPlaying = false;
    isPodcastPaused = false;
    currentLineIndex = 0;
    window.speechSynthesis.cancel();
    stopPodcastTimer();
    podcastElapsedTime = 0;
    updatePodcastTime();

    // Hide controls
    document.getElementById('podcastControls').classList.add('hidden');

    if (podcastOnEndCallback) {
        podcastOnEndCallback();
        podcastOnEndCallback = null;
    }
}

function updatePodcastUI(state) {
    const playPauseBtn = document.getElementById('podcastPlayPauseBtn');
    const statusText = document.getElementById('podcastStatus');

    if (state === 'playing') {
        playPauseBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
        `;
        statusText.textContent = 'Playing...';
    } else {
        playPauseBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
        `;
        statusText.textContent = 'Paused';
    }
}

// function updatePodcastProgress() { ... } // Removed

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

// Toast Notification
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Add to document
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
