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
const editInputBtn = document.getElementById('editInputBtn');
const inputCard = document.querySelector('.input-card');

// Results Section Elements
const resultsContainer = document.getElementById('resultsContainer');
const videoThumbnail = document.getElementById('videoThumbnail');
const videoPlayerWrapper = document.getElementById('videoPlayerWrapper');
const videoTitle = document.getElementById('videoTitle');
const summaryText = document.getElementById('summaryText');
const copyBtn = document.getElementById('copyBtn');
const podcastBtn = document.getElementById('podcastBtn');
// const toggleResultsBtn = document.getElementById('toggleResultsBtn'); // Removed
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
const tabContents = document.querySelectorAll('.tab-pane');

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
    if (googleUS) selectedVoices.push({ name: 'Zoe', voice: googleUS });
    else if (microsoftZira) selectedVoices.push({ name: 'Zoe', voice: microsoftZira });

    if (googleUKFemale) selectedVoices.push({ name: 'Anna', voice: googleUKFemale });

    if (googleUKMale) selectedVoices.push({ name: 'John', voice: googleUKMale });
    else if (microsoftDavid) selectedVoices.push({ name: 'John', voice: microsoftDavid });
    else if (microsoftMark) selectedVoices.push({ name: 'John', voice: microsoftMark });

    // Fallback if we don't have enough
    if (selectedVoices.length < 3) {
        // Filter for English voices
        const englishVoices = voices.filter(v => v.lang.startsWith('en'));

        // Prioritize "Google" voices on Android as they are often better
        const androidBestVoices = englishVoices.filter(v => v.name.includes('Google') || v.name.includes('English United States'));
        const otherVoices = englishVoices.filter(v => !v.name.includes('Google') && !v.name.includes('English United States'));

        const candidates = [...androidBestVoices, ...otherVoices];

        candidates.forEach(v => {
            if (selectedVoices.length >= 3) return;
            if (!selectedVoices.some(sv => sv.voice.name === v.name)) {
                // Try to guess gender/name based on voice name or just assign a generic one
                let name = `Voice ${selectedVoices.length + 1}`;
                if (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Susan')) {
                    // Alternate between Zoe and Anna if one is taken
                    name = selectedVoices.some(sv => sv.name === 'Zoe') ? 'Anna' : 'Zoe';
                }
                else if (v.name.includes('Male') || v.name.includes('David') || v.name.includes('George')) name = 'John';

                // If we already have a John/Zoe/Anna, append number
                if (selectedVoices.some(sv => sv.name === name)) {
                    name = `${name} ${selectedVoices.length + 1}`;
                }

                selectedVoices.push({ name: `${name} (${v.name})`, voice: v });
            }
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
if (window.speechSynthesis) {
    // Chrome loads voices asynchronously
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
}

// Fetch feature flags
async function fetchFeatures() {
    try {
        const response = await fetch(`${API_BASE}/api/features`);
        const features = await response.json();

        // Toggle Ads
        const adFooter = document.getElementById('google-ad-footer');
        const adDeck = document.getElementById('google-ad-deck');

        if (features.ads) {
            if (adFooter) adFooter.classList.remove('hidden');
            if (adDeck) adDeck.classList.remove('hidden');
        } else {
            if (adFooter) adFooter.classList.add('hidden');
            if (adDeck) adDeck.classList.add('hidden');
        }

        // Toggle other features if needed (e.g. hide tabs if disabled)
        // ...

    } catch (error) {
        console.error('Failed to fetch features:', error);
    }
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
    const selectedVoiceName = voiceSelect.value; // This is the voice name (or URI)

    if (selectedVoiceName) {
        // Re-fetch voices to ensure we have the latest objects (Android quirk)
        const currentVoices = window.speechSynthesis.getVoices();
        const voice = currentVoices.find(v => v.name === selectedVoiceName);
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
// deferredPrompt is now global window.deferredPrompt
const MAX_HISTORY_ITEMS = 5;

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
    // if (toggleResultsBtn) {
    //     toggleResultsBtn.addEventListener('click', () => toggleResultsSection());
    // }

    // Edit Button (Expand Header)
    if (editInputBtn) {
        editInputBtn.addEventListener('click', () => {
            inputCard.classList.remove('collapsed');
            editInputBtn.classList.add('hidden');
            // Optional: Focus input?
        });
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

    // Copy Button
    document.getElementById('copyBtn').addEventListener('click', copySummary);

    // Share Button
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        if (navigator.share) {
            shareBtn.classList.remove('hidden');
            shareBtn.addEventListener('click', shareSummary);
        }
    }

    // Chat
    document.getElementById('chatSubmitBtn').addEventListener('click', handleChatSubmit);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatSubmit(e);
    });

    // Podcast Button (Toggle Controls)
    const podcastBtn = document.getElementById('podcastBtn');
    if (podcastBtn) {
        podcastBtn.replaceWith(podcastBtn.cloneNode(true));
        const newPodcastBtn = document.getElementById('podcastBtn');
        newPodcastBtn.addEventListener('click', togglePodcastControls);
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

            // Check for live video URL immediately
            if (url.includes('/live/')) {
                submitBtn.disabled = true;
                btnText.textContent = 'Live Not Supported';
                showLiveVideoError();
                return;
            } else {
                // Reset button state if it was disabled by this check
                if (btnText.textContent === 'Live Not Supported') {
                    // Reset button text
                    submitBtn.disabled = false;
                    btnText.textContent = "Let's Go";

                    // Focus input
                    setTimeout(() => {
                        youtubeUrlInput.focus();
                    }, 100);
                    // Hide error if it's the live error
                    const errorState = document.getElementById('videoErrorState');
                    if (errorState && errorState.classList.contains('live-error')) {
                        errorState.remove();
                        resultsContainer.classList.add('hidden');
                        // Expand input if it was collapsed (though it shouldn't be collapsed on error)
                        toggleInputSection(false);
                    }
                }
            }

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
                    // Valid URL
                    if (btnText.textContent === "Let's Go") {
                        submitBtn.disabled = false;
                    }
                } else {
                    // Invalid URL (not a YouTube URL)
                    if (btnText.textContent === "Let's Go") {
                        submitBtn.disabled = true;
                    }
                }
            } else {
                // Empty URL
                if (btnText.textContent === "Let's Go") {
                    submitBtn.disabled = true;
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

    // Steps Generation
    const generateStepsBtn = document.getElementById('generateStepsBtn');
    if (generateStepsBtn) {
        generateStepsBtn.addEventListener('click', handleStepsRequest);
    }

    // Quiz Generation
    const startQuizBtn = document.getElementById('startQuizBtn');
    if (startQuizBtn) {
        startQuizBtn.addEventListener('click', handleQuizRequest);
    }
}

// Switch Feature Tabs
function switchTab(selectedTab) {
    // Deactivate all tabs
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.classList.add('inactive');
    });

    // Hide all content panes
    tabContents.forEach(content => {
        content.classList.add('hidden');
    });

    // Activate selected
    selectedTab.classList.add('active');
    selectedTab.classList.remove('inactive');

    // Show content
    const tabName = selectedTab.dataset.tab;
    const targetId = 'content' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    const targetContent = document.getElementById(targetId);
    if (targetContent) {
        targetContent.classList.remove('hidden');
    }
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
    const startView = document.getElementById('stepsStartView');

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Generating Steps...';

    // content.innerHTML = '<div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>';

    try {
        const response = await fetch(`${API_BASE}/api/steps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: currentTranscript })
        });
        const data = await response.json();

        if (data.success) {
            startView.classList.add('hidden');
            content.classList.remove('hidden');

            if (data.steps.includes('NO_STEPS_FOUND')) {
                content.innerHTML = '<div class="text-center py-8 text-slate-400"><p>No specific tutorial steps found in this video.</p><button class="secondary-btn mt-4" onclick="resetSteps()">Try Again</button></div>';
            } else {
                content.innerHTML = formatMarkdown(data.steps);
                // Add a reset button at the bottom? Or just leave it.
            }
        } else {
            showToast('Failed to generate steps', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (error) {
        showToast('Network error', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function resetSteps() {
    document.getElementById('stepsContent').classList.add('hidden');
    document.getElementById('stepsStartView').classList.remove('hidden');
    const btn = document.getElementById('generateStepsBtn');
    btn.disabled = false;
    btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
        </svg>
        Generate Steps
    `;
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
        const scoreView = document.getElementById('quizScore');
        scoreView.classList.remove('hidden');

        document.getElementById('scoreValue').textContent = currentQuizScore;

        // Add feedback message
        let feedback = '';
        if (currentQuizScore === 5) feedback = 'Perfect Score! 🌟';
        else if (currentQuizScore >= 3) feedback = 'Great Job! 👍';
        else feedback = 'Keep Learning! 📚';

        // Check if feedback element exists, if not create it
        let feedbackEl = scoreView.querySelector('.quiz-feedback');
        if (!feedbackEl) {
            feedbackEl = document.createElement('p');
            feedbackEl.className = 'quiz-feedback';
            scoreView.insertBefore(feedbackEl, scoreView.querySelector('button'));
        }
        feedbackEl.textContent = feedback;
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

        // Reset Header
        if (inputCard) {
            inputCard.classList.remove('collapsed');
            if (editInputBtn) editInputBtn.classList.add('hidden');
        }

        // Reset Tabs
        const summaryTab = document.querySelector('.tab-btn[data-tab="summary"]');
        if (summaryTab) switchTab(summaryTab);

        const contentSteps = document.getElementById('contentSteps');
        if (contentSteps) contentSteps.classList.add('hidden');

        const contentQuiz = document.getElementById('contentQuiz');
        if (contentQuiz) contentQuiz.classList.add('hidden');

        // Clear chat history
        const chatHistory = document.getElementById('chatHistory');
        if (chatHistory) chatHistory.innerHTML = '<div class="chat-message ai"><div class="message-content"><p>Hi! Ask me anything about this video.</p></div></div>';

        const stepsContent = document.getElementById('stepsContent');
        if (stepsContent) {
            stepsContent.innerHTML = '';
            stepsContent.classList.add('hidden');
        }
        const stepsStartView = document.getElementById('stepsStartView');
        if (stepsStartView) {
            stepsStartView.classList.remove('hidden');
            const btn = document.getElementById('generateStepsBtn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                    </svg>
                    Generate Steps
                `;
            }
        }

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
        // if (toggleResultsBtn) toggleResultsBtn.classList.add('collapsed');

        // Hide action buttons
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) actionButtons.classList.add('hidden');

        // Ensure reset button is visible if input has value (though we just cleared it, so maybe hide it?)
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.classList.add('hidden');

        // Focus input
        setTimeout(() => {
            youtubeUrlInput.focus();
        }, 100);

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

// Toggle Results Section - Deprecated/Removed
// function toggleResultsSection(forceCollapse = null) {
//     const content = document.getElementById('resultsContent');
//     const btn = document.getElementById('toggleResultsBtn');
//
//     if (!content) return;
//
//     const isHidden = content.classList.contains('hidden');
//     const shouldCollapse = forceCollapse !== null ? forceCollapse : !isHidden;
//
//     if (shouldCollapse) {
//         content.classList.add('hidden');
//         if (btn) btn.classList.add('collapsed');
//     } else {
//         content.classList.remove('hidden');
//         if (btn) btn.classList.remove('collapsed');
//     }
// }

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
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\n?#]+)/,
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

    try {
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
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('yt_summary_history') || '[]');
        } catch (err) {
            console.error('History parse error:', err);
            history = [];
        }

        const cachedItem = history.find(item =>
            item.id === videoId &&
            item.length === summaryLengthSelect.value &&
            item.tone === summaryToneSelect.value
        );

        if (cachedItem) {
            // Loading from cache
            console.log('Loading from cache:', cachedItem);
            loadHistoryItem(cachedItem);
            return;
        }

        hideAllCards();

        // Clear chat history for new video
        const chatHistory = document.getElementById('chatHistory');
        if (chatHistory) chatHistory.innerHTML = '<div class="chat-message ai"><div class="message-content"><p>Hi! Ask me anything about this video.</p></div></div>';

        setLoading(true);
        showSkeletonLoading(videoId); // Show thumbnail immediately

        // Show summary loading animation
        const summaryLoading = document.getElementById('summaryLoading');
        if (summaryLoading) summaryLoading.classList.remove('hidden');
        const summaryText = document.getElementById('summaryText');
        if (summaryText) summaryText.innerHTML = ''; // Clear previous summary

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

        // Step 3: Show results
        showSummary(summaryData.summary);
        showFeatures(); // Show tabs

        // Save to history
        saveToHistory({
            id: videoId,
            title: transcriptData.title,
            length: summaryLengthSelect.value,
            tone: summaryToneSelect.value,
            summary: summaryData.summary,
            transcript: transcriptData.transcript,
            metadata: transcriptData.metadata
        });

    } catch (error) {
        console.error('Summarization error:', error);
        if (error.name === 'AbortError') {
            showError('Request timed out. The video might be too long or the server is busy.');
        } else {
            showError(error.message || 'An unexpected error occurred.');
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

    // Ensure it's visible
    setTimeout(() => {
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Show Live Video Error
function showLiveVideoError() {
    // Hide skeleton/loading
    resultsContainer.classList.remove('hidden');
    videoPlayerWrapper.classList.add('hidden');
    const summaryContent = document.querySelector('.summary-content-wrapper');
    if (summaryContent) summaryContent.classList.add('hidden');

    const existingError = document.getElementById('videoErrorState');
    if (existingError) existingError.remove();

    const errorContainer = document.createElement('div');
    errorContainer.id = 'videoErrorState';
    errorContainer.className = 'video-error-state live-error';

    errorContainer.innerHTML = `
        <div class="live-error-content">
            <div class="live-error-image-wrapper">
                 <img src="live_video_not_supported.png" alt="Live Video Not Supported" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                 <div class="fallback-icon" style="display:none">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M10 9l5 3-5 3z"></path>
                        <line x1="8" y1="12" x2="8" y2="12"></line>
                        <line x1="16" y1="12" x2="16" y2="12"></line>
                    </svg>
                 </div>
            </div>
            <h3 class="error-title">YouTube Live Not Supported</h3>
            <p class="error-message">
                We can't summarize live streams (or past live streams) just yet.<br>
                Please try a regular uploaded video instead!
            </p>
            <button onclick="resetApp()" class="try-again-btn">Try Another Video</button>
        </div>
    `;

    resultsContainer.appendChild(errorContainer);
    toggleInputSection(false);

    // Ensure it's visible
    setTimeout(() => {
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, // Add thumbnail URL
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
// Load History
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('yt_summary_history') || '[]');

    // Clear list
    logList.innerHTML = '';

    if (history.length === 0) {
        logList.innerHTML = '<div class="text-slate-500 text-sm italic p-4">No history yet.</div>';
        return;
    }

    history.forEach(item => {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        logItem.onclick = () => loadHistoryItem(item);

        // Truncate title
        const title = item.title.length > 50 ? item.title.substring(0, 50) + '...' : item.title;
        const date = new Date(item.timestamp).toLocaleDateString();

        logItem.innerHTML = `
            <div class="log-thumbnail-wrapper">
                <img src="${item.thumbnail || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`}" alt="${title}" class="log-thumbnail">
                <div class="log-play-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
            </div>
            <div class="log-info">
                <h4 class="log-item-title" title="${item.title}">${title}</h4>
                <div class="log-meta">
                    <span class="meta-badge ${item.length}">${item.length}</span>
                    <span class="meta-badge ${item.tone}">${item.tone}</span>
                    <span class="text-xs text-slate-500 ml-auto">${date}</span>
                </div>
            </div>
        `;
        logList.appendChild(logItem);
    });
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
    // toggleResultsSection(false);

    // Scroll handled by showSummary
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
        // Show results
        resultsContainer.classList.remove('hidden');

        // Collapse Header
        if (inputCard) {
            inputCard.classList.add('collapsed');
            if (editInputBtn) editInputBtn.classList.remove('hidden');
        }

        // Switch to Summary Tab
        const summaryTab = document.querySelector('.tab-btn[data-tab="summary"]');
        if (summaryTab) switchTab(summaryTab);

        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Ensure results are visible
    resultsContainer.classList.remove('hidden');

    // Collapse Header
    if (inputCard) {
        inputCard.classList.add('collapsed');
        if (editInputBtn) editInputBtn.classList.remove('hidden');
    }

    // Switch to Summary Tab
    const summaryTab = document.querySelector('.tab-btn[data-tab="summary"]');
    if (summaryTab) switchTab(summaryTab);

    // Scroll to Summary Header (Title/Buttons)
    const summaryHeader = document.querySelector('.summary-header');
    if (summaryHeader) {
        setTimeout(() => {
            summaryHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    } else {
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Show action buttons
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) actionButtons.classList.remove('hidden');

    // Ensure Podcast Controls are hidden initially
    const podcastControls = document.getElementById('podcastControls');
    if (podcastControls) podcastControls.classList.add('hidden');
}

// Toggle Podcast Controls
function togglePodcastControls() {
    const controls = document.getElementById('podcastControls');
    if (controls.classList.contains('hidden')) {
        controls.classList.remove('hidden');
        handlePodcastRequest(); // Generate if needed
    } else {
        controls.classList.add('hidden');
        stopPodcast();
    }
}



// Copy Summary
function copySummary() {
    const summaryElement = document.getElementById('summaryText');
    const rawSummaryText = summaryElement.innerText;
    const rawSummaryHtml = summaryElement.innerHTML;
    const videoTitle = document.getElementById('videoTitle').textContent;

    const videoId = extractVideoId(youtubeUrlInput.value);
    const shortUrl = videoId ? `https://youtu.be/${videoId}` : youtubeUrlInput.value;

    const promoText = "\n\nSummarized by TL;DW - https://yt.supervan.uk\n(Installable as an App on Mobile & Desktop)";
    const promoHtml = "<br><br><p>Summarized by <a href='https://yt.supervan.uk'>TL;DW</a><br><em>(Installable as an App on Mobile & Desktop)</em></p>";

    // --- Plain Text Version ---
    // Remove timestamps [MM:SS]
    const cleanSummaryText = rawSummaryText.replace(/\[\d{1,2}:\d{2}(:\d{2})?\]\s*/g, '');
    const clipboardText = `${videoTitle}\n${shortUrl}\n\n${cleanSummaryText}${promoText}`;

    // --- HTML Version ---
    // Convert timestamps [MM:SS] to links
    let cleanSummaryHtml = rawSummaryHtml;

    if (videoId) {
        cleanSummaryHtml = cleanSummaryHtml.replace(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g, (match, p1, p2, p3) => {
            let seconds = 0;
            if (p3) {
                // HH:MM:SS
                seconds = parseInt(p1) * 3600 + parseInt(p2) * 60 + parseInt(p3);
            } else {
                // MM:SS
                seconds = parseInt(p1) * 60 + parseInt(p2);
            }
            return `<a href="https://youtu.be/${videoId}?t=${seconds}" target="_blank">${match}</a>`;
        });
    }

    const clipboardHtml = `
        <h2>${videoTitle}</h2>
        <p><a href="${shortUrl}">${shortUrl}</a></p>
        <hr>
        ${cleanSummaryHtml}
        ${promoHtml}
    `;

    // Create ClipboardItem with both formats
    const item = new ClipboardItem({
        'text/plain': new Blob([clipboardText], { type: 'text/plain' }),
        'text/html': new Blob([clipboardHtml], { type: 'text/html' })
    });

    navigator.clipboard.write([item]).then(() => {
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
        console.error('Copy failed:', err);
        showError('Failed to copy summary');
    });
}

// Share Summary (Web Share API)
async function shareSummary() {
    const summaryElement = document.getElementById('summaryText');
    const rawSummaryText = summaryElement.innerText;
    const videoTitle = document.getElementById('videoTitle').textContent;
    const videoId = extractVideoId(youtubeUrlInput.value);
    const shortUrl = videoId ? `https://youtu.be/${videoId}` : youtubeUrlInput.value;

    // Clean text (remove timestamps for cleaner share)
    const cleanSummaryText = rawSummaryText.replace(/\[\d{1,2}:\d{2}(:\d{2})?\]\s*/g, '');

    const shareData = {
        title: `Summary: ${videoTitle}`,
        text: `${videoTitle}\n\n${cleanSummaryText.substring(0, 2000)}...`, // Limit text length for safety
        url: shortUrl
    };

    try {
        if (navigator.share) {
            // Notify user about plain text limitation
            showToast('Sharing plain text. For rich text, use Copy & Paste.', 'info');
            // Delay to let toast appear and be read
            setTimeout(async () => {
                await navigator.share(shareData);
            }, 2000);
        } else {
            showError('Sharing not supported on this device');
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Share failed:', err);
            showError('Failed to share');
        }
    }
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

    // 6b. Lists (Ordered)
    // Replace lines starting with 1. 2. etc with <li class="ordered">
    text = text.replace(/^\d+\.\s+(.*$)/gm, '<li class="ordered">$1</li>');

    // Wrap adjacent <li class="ordered"> in <ol>
    text = text.replace(/(<li class="ordered">.*<\/li>(\n|$))+/g, '<ol>$&</ol>');

    // Clean up class="ordered" (optional, but keeps HTML clean)
    text = text.replace(/class="ordered"/g, '');

    // 7. Timestamps
    text = text.replace(/\[(\d{1,2}):(\d{2})\]/g, '<a href="#" class="timestamp-link" onclick="seekTo($1 * 60 + $2 * 1); return false;">[$1:$2]</a>');

    // 8. Paragraphs (double newlines)
    text = text.replace(/\n\n/g, '<br><br>');

    // 9. Cleanup excessive whitespace after headers
    // If a header is followed by <br><br>, remove the breaks because CSS margins handle the spacing
    text = text.replace(/(<\/h[2-4]>)\s*(<br>\s*){1,2}/g, '$1');

    // Cleanup <ul><br> and <ol><br> issues if any
    text = text.replace(/<\/ul><br><br>/g, '</ul>');
    text = text.replace(/<\/ol><br><br>/g, '</ol>');

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

// --- Initialization ---



// PWA Logic - Global Scope
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;

    // Update UI notify the user they can install the PWA
    const installContainer = document.getElementById('installContainer');
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (installContainer && !isInstalled) {
        installContainer.classList.remove('hidden');
    }
});

// Initial check on load
document.addEventListener('DOMContentLoaded', () => {
    handleSharedContent();
    fetchFeatures();

    const installButton = document.getElementById('installBtn');
    const installContainer = document.getElementById('installContainer');
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    // If event fired before DOMContentLoaded, show button now
    if (deferredPrompt && installContainer && !isInstalled) {
        installContainer.classList.remove('hidden');
    }

    // Handle click
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
                if (installContainer) installContainer.classList.add('hidden');
            } else {
                // Manual Instructions Fallback (only if button is somehow visible without prompt)
                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                const msg = isIOS
                    ? 'Tap Share -> "Add to Home Screen"'
                    : 'Tap Menu (⋮) -> "Install App"';
                alert(msg);
            }
        });
    }
});
