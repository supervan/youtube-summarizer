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

// Unregister Service Workers to avoid stale cache issues during development
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
            console.log('ServiceWorker unregistered.');
        }
    });
}
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
let currentVideoId = null; // Global to track current video ID

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
        enabledFeatures = await response.json(); // Update global variable

        // Toggle Ads
        const adFooter = document.getElementById('google-ad-footer');
        const adDeck = document.getElementById('google-ad-deck');

        if (enabledFeatures.ads) {
            if (adFooter) adFooter.classList.remove('hidden');
            if (adDeck) adDeck.classList.remove('hidden');
        } else {
            if (adFooter) adFooter.classList.add('hidden');
            if (adDeck) adDeck.classList.add('hidden');
        }

        // Toggle Tabs based on flags
        const tabsContainer = document.getElementById('tabsContainer');
        if (tabsContainer) {
            const tabs = tabsContainer.querySelectorAll('.tab-btn');
            tabs.forEach(tab => {
                const featureKey = tab.dataset.tab; // 'chat', 'quiz', 'steps'
                if (enabledFeatures[featureKey] === false) {
                    tab.classList.add('hidden');
                } else {
                    tab.classList.remove('hidden');
                }
            });
        }

    } catch (error) {
        console.error('Failed to fetch features:', error);
        // Fallback defaults
        enabledFeatures = { chat: true, steps: true, quiz: true, podcast: true, ads: false };
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            <span class="btn-label">Pause</span>
        `;
        btn.classList.add('active'); // Optional: Add active styling
    } else if (state === 'paused') {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span class="btn-label">Resume</span>
        `;
        btn.classList.add('active'); // Keep active styling
    } else {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <span class="btn-label">Listen</span>
        `;
        btn.classList.remove('active');
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
const CACHE_NAME = 'yt-summarizer-v2034.9';
console.log('YouTube Summarizer v2034.9 Loaded');
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';

// Initialize app
// Global state
let currentTranscript = '';
let enabledFeatures = {};
let player; // YouTube Player instance
// deferredPrompt is now global window.deferredPrompt
let currentPage = 1;
const itemsPerPage = 16;

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
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
        });
    } else {
        console.warn('Mermaid library not loaded/defined.');
    }
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



// Setup event listeners
function setupEventListeners() {
    summarizerForm.addEventListener('submit', handleSubmit);
    copyBtn.addEventListener('click', copySummary);

    // Section Toggles
    if (toggleInputBtn) {
        toggleInputBtn.addEventListener('click', () => toggleInputSection());
    }


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
    // Tabs
    if (tabs.length === 0) console.error("No tabs found during setup!");
    else console.log("Found tabs:", tabs.length);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            console.log("Tab clicked via listener:", tab.dataset.tab);
            switchTab(tab);
        });
    });

    // Video Player Interaction
    videoPlayerWrapper.addEventListener('click', () => {
        const playerDiv = document.getElementById('player');
        const thumb = document.getElementById('videoThumbnail');
        const overlay = videoPlayerWrapper.querySelector('.play-overlay');
        const badge = videoPlayerWrapper.querySelector('.live-badge');

        playerDiv.classList.remove('hidden');
        thumb.classList.add('hidden');
        if (overlay) overlay.classList.add('hidden');
        if (badge) badge.classList.add('hidden');

        if (player && player.playVideo) {
            player.playVideo();
        }
    });

    // Event Listeners
    youtubeUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit(e);
    });

    submitBtn.addEventListener('click', handleSubmit);

    summaryLengthSelect.addEventListener('change', () => {
        // Optional: Trigger re-summarization or just update pref?
        // For now, user must click button to regenerate if they change settings
    });



    // Action Buttons
    document.getElementById('readAloudBtn').addEventListener('click', toggleReadAloud);
    document.getElementById('copyBtn').addEventListener('click', copySummary);
    // document.getElementById('podcastBtn').addEventListener('click', generatePodcast); // Old logic
    document.getElementById('podcastBtn').addEventListener('click', () => {
        // Podcast is now inside the Read Aloud/Podcast section, which has its own generate button.
        // But the top button should probably jump to that section or trigger generation?
        // For now, let's make it scroll to the podcast section
        const podcastSection = document.getElementById('podcastSection');
        if (podcastSection) podcastSection.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatSubmit();
    });

    document.getElementById('copyStepsBtn').addEventListener('click', async () => {
        const content = document.getElementById('stepsContent');
        if (!content) return;

        try {
            const html = content.innerHTML;
            // Improved plain text extraction (simple cleanup)
            // We use the browser's selection to get a better text representation if possible, 
            // or just rely on innerText. innerText in Chrome usually skips list bullets.
            // Let's manually construct a slightly better text version for the plain text fallback.
            // Clone and replace li with * 
            const clone = content.cloneNode(true);
            const lis = clone.querySelectorAll('li');
            lis.forEach(li => {
                li.innerHTML = '• ' + li.innerHTML; // Add bullet for text version
            });
            // Add newlines between block elements
            const blocks = clone.querySelectorAll('p, h2, h3, h4');
            blocks.forEach(b => b.innerHTML = b.innerHTML + '\n');

            const plainText = clone.innerText;

            const clipboardAuthentication = new ClipboardItem({
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([plainText], { type: "text/plain" })
            });

            await navigator.clipboard.write([clipboardAuthentication]);
            showToast('Steps copied to clipboard!');
        } catch (err) {
            console.warn('Rich copy failed, falling back to plain text:', err);
            const text = content.innerText;
            navigator.clipboard.writeText(text).then(() => showToast('Steps copied to clipboard!'));
        }
    });

    document.getElementById('generateStepsBtn').addEventListener('click', handleStepsRequest);
    document.getElementById('startQuizBtn').addEventListener('click', handleQuizRequest);

    // Mind Map Event Listener
    const mmBtn = document.getElementById('generateMindMapBtn');
    if (mmBtn) {

        mmBtn.addEventListener('click', handleMindMapRequest);
    } else {
        console.error("Mind Map Button NOT Found in DOM");
    }

    // Initial Load
    loadHistory(1);
    handleSharedContent();
    // Reset Button Logic
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetApp);
    }

    const updateResetBtnVisibility = () => {
        if (youtubeUrlInput.value.trim()) {
            if (resetBtn) resetBtn.classList.remove('hidden');
        } else {
            if (resetBtn) resetBtn.classList.add('hidden');
        }
    };
    updateResetBtnVisibility();

    // Input Logic (Auto-Load & Live Check)
    youtubeUrlInput.addEventListener('input', () => {
        updateResetBtnVisibility();
        const url = youtubeUrlInput.value.trim();
        const btnText = submitBtn.childNodes[0].nodeType === 3 ? submitBtn : (submitBtn.querySelector('span') || submitBtn);
        // Note: btnText might be the button itself or a span. Let's simplify.
        // Actually, submitBtn content is "Let's Go" or "Generatin...".

        if (url.includes('/live/')) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Live Not Supported';
            showLiveVideoError();
            return;
        }

        // Restore button state if it was showing an error
        if (submitBtn.innerHTML === 'Live Not Supported') {
            submitBtn.innerHTML = `
                <span id="btnText">Let's Go</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                </svg>
                <span id="btnLoader" class="loader hidden"></span>
            `;
            const errorState = document.getElementById('videoErrorState');
            if (errorState) {
                errorState.remove();
                if (resultsContainer) resultsContainer.classList.add('hidden');
            }
        }

        // Enable/Disable based on URL presence
        if (url.trim().length > 0) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }

        if (url) {
            const videoId = extractVideoId(url);
            if (videoId) {
                const history = JSON.parse(localStorage.getItem('yt_summary_history') || '[]');
                const cachedItem = history.find(item => item.id === videoId);
                if (cachedItem) loadHistoryItem(cachedItem);
            }
        }
    });

    // Toggle Summary Button
    const toggleSummaryBtn = document.getElementById('toggleSummaryBtn');
    if (toggleSummaryBtn) {
        toggleSummaryBtn.addEventListener('click', () => {
            const summaryContent = document.getElementById('summaryText');
            if (summaryContent) {
                if (summaryContent.classList.contains('hidden')) {
                    summaryContent.classList.remove('hidden');
                    toggleSummaryBtn.classList.remove('collapsed');
                } else {
                    summaryContent.classList.add('hidden');
                    toggleSummaryBtn.classList.add('collapsed');
                }
            }
        });
    }

}



// Initial check

// Switch Feature Tabs
function switchTab(selectedTab) {

    if (selectedTab.classList.contains('active')) {
        // Toggle off if already active? 
        // Or do nothing? Standard tabs usually stay active.
        // Let's allow toggling off since they are incidental features now.
        selectedTab.classList.remove('active');
        const tabName = selectedTab.dataset.tab;
        const targetId = 'content' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add('hidden');
        return;
    }

    // Deactivate all tabs
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.classList.remove('inactive'); // Clean up
    });

    // Hide all content panes
    tabContents.forEach(content => {
        content.classList.add('hidden');
    });

    // Activate selected
    selectedTab.classList.add('active');

    // Show content
    const tabName = selectedTab.dataset.tab;
    const targetId = 'content' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    const targetContent = document.getElementById(targetId);
    if (targetContent) {
        targetContent.classList.remove('hidden');

        // SAFETY CHECK: Mind Map
        if (targetId === 'contentMindMap') {
            const mmContent = document.getElementById('mindMapContent');
            const mmStartView = document.getElementById('mindMapStartView');
            const mermaidGraph = document.getElementById('mermaidGraph');



            // RELAXED CHECK: If graph has content, show it.
            // LAZY RENDER CHECK: If needs render, triggering it now (because tab is visible)
            if (mermaidGraph && mermaidGraph.dataset.needsRender === 'true') {

                const syntax = mermaidGraph.dataset.pendingSyntax || '';

                // Clear flags
                mermaidGraph.removeAttribute('data-needs-render');
                mermaidGraph.removeAttribute('data-pending-syntax');

                // Render
                renderMindMap(mermaidGraph, syntax);

                // Show content pane
                if (mmStartView) mmStartView.classList.add('hidden');
                if (mmContent) mmContent.classList.remove('hidden');

                // RESIZE FIX: Ensure PanZoom logic is updated when tab becomes visible
                if (panZoomInstance) {
                    setTimeout(() => {
                        panZoomInstance.resize();
                        panZoomInstance.fit();
                        panZoomInstance.center();
                    }, 50);
                }

            } else if (mermaidGraph && mermaidGraph.innerHTML.trim().length > 10) {
                // Already has content
                if (mmStartView) {
                    mmStartView.style.display = 'none'; // Force hide
                    mmStartView.classList.add('hidden');
                }
                if (mmContent) mmContent.classList.remove('hidden');

                // RESIZE FIX: Ensure PanZoom logic is updated when tab becomes visible
                if (panZoomInstance) {
                    setTimeout(() => {
                        panZoomInstance.resize();
                        panZoomInstance.fit();
                        panZoomInstance.center();
                    }, 50);
                }
            } else {
                // console.log('Mind Map empty, showing start view');
            }
        }

        // SAFETY CHECK: If this is the Steps tab, check if we already have steps loaded.
        // If so, force hide the start view (button).
        if (targetId === 'contentSteps') {
            const stepsContent = document.getElementById('stepsContent');
            const startView = document.getElementById('stepsStartView');
            // If stepsContent has meaningful content (more than just whitespace/HTML tags)
            // Or simple check: if it's not hidden and has inner text
            if (stepsContent && stepsContent.innerText.trim().length > 10) {
                if (startView) startView.classList.add('hidden');
                if (startView) startView.style.display = 'none';
                stepsContent.classList.remove('hidden');
            }
        }

        // Scroll to it?
        setTimeout(() => {
            targetContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// Show available features (Tabs)
// Show available features (Tabs)
function showFeatures() {
    // Show Toolbar
    const toolbar = document.querySelector('.summary-actions-toolbar');
    if (toolbar) toolbar.classList.remove('hidden');

    // Show Tabs Container
    if (tabsContainer) tabsContainer.classList.remove('hidden');

    // Show Tab Content Area
    if (tabContent) tabContent.classList.remove('hidden');

    // Ensure NO tab is active initially? Or maybe Chat?
    // User said: "I would like for those to stay visible" which implies the Summary is separate.
    // The previous logic defaulted to 'chat'.
    // If we want tabs to be "closed" by default, we shouldn't click any.
    // But then 'tabContent' would be visible but empty (or all hidden).

    // Let's reset tabs state:
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.add('hidden'));

    // Actually, if we want "Chat/Quiz/Steps" to be optional sections below,
    // maybe we start with them closed.
    // Let's just default to hidden pane content.
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
// --- Steps Feature ---
async function handleStepsRequest() {
    const btn = document.getElementById('generateStepsBtn');
    const content = document.getElementById('stepsContent');
    const startView = document.getElementById('stepsStartView');
    const loading = document.getElementById('stepsLoading');
    const stepsActions = document.getElementById('stepsActions');

    // UI Updates: Disable Button, Show Spinner IN Button
    const originalBtnContent = btn.innerHTML;
    // Store original content on the button element to retrieve if needed
    btn.dataset.originalContent = originalBtnContent;

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner-sm"></div> Generating...`;

    // Ensure separate loading is hidden (we use button loading now)
    loading.classList.add('hidden');

    // Timeout Controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    try {
        const response = await fetch(`${API_BASE}/api/steps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: currentTranscript }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.success) {
            // Success State
            startView.classList.add('hidden'); // Now hide start view
            startView.style.display = 'none'; // Force hide
            content.classList.remove('hidden'); // Show content
            if (stepsActions) stepsActions.classList.remove('hidden');

            if (data.steps.includes('NO_STEPS_FOUND')) {
                content.innerHTML = '<div class="text-center py-8 text-slate-400"><p>No specific tutorial steps found in this video.</p><button class="secondary-btn mt-4" onclick="resetSteps()">Try Again</button></div>';
                if (stepsActions) stepsActions.classList.add('hidden');
            } else {
                content.innerHTML = formatMarkdown(data.steps);

                if (currentVideoId) {
                    updateHistoryItem(currentVideoId, { steps: data.steps });
                }
            }

            // We keep the button disabled (and hidden) until manually reset
            // btn.disabled = false;
            // btn.innerHTML = originalBtnContent;

        } else {
            throw new Error(data.error || 'Failed to generate steps');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            showToast('Request timed out. Please try again.', 'error');
        } else {
            showToast(error.message || 'Network error', 'error');
        }
        console.error(error);

        // Revert UI
        btn.disabled = false;
        btn.innerHTML = originalBtnContent;
        // Ensure start view is visible
        startView.classList.remove('hidden');
    }
}

function resetSteps() {
    document.getElementById('stepsContent').classList.add('hidden');
    const startView = document.getElementById('stepsStartView');
    startView.classList.remove('hidden');
    startView.style.display = ''; // Reset inline style
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
    const loading = document.getElementById('quizLoading');
    const btn = document.getElementById('startQuizBtn');

    // UI Updates: Disable Button, Show Spinner IN Button
    const originalBtnContent = btn.innerHTML;
    btn.dataset.originalContent = originalBtnContent;

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner-sm"></div> Generating...`;

    loading.classList.add('hidden'); // Ensure separate loading is hidden

    // Timeout Controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    try {
        const response = await fetch(`${API_BASE}/api/quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: currentTranscript }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.success) {
            // Success State
            startView.classList.add('hidden');
            quizContent.classList.remove('hidden');
            renderQuiz(data.quiz);

            // Restore button
            btn.disabled = false;
            btn.innerHTML = originalBtnContent;
        } else {
            throw new Error(data.error || 'Failed to generate quiz');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            showToast('Request timed out. Please try again.', 'error');
        } else {
            showToast(error.message || 'Network error', 'error');
        }
        console.error(error);

        // Revert UI
        btn.disabled = false;
        btn.innerHTML = originalBtnContent;
        startView.classList.remove('hidden');
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

    // Add "New Questions" button at the bottom of the active quiz
    const actionDiv = document.createElement('div');
    actionDiv.className = 'quiz-actions-footer';
    actionDiv.style.cssText = 'display: flex; justify-content: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--slate-800);';
    actionDiv.innerHTML = `
        <button class="quiz-retry-btn" onclick="regenerateQuiz()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                <path d="M16 21h5v-5"></path>
            </svg>
            New Questions
        </button>
    `;
    container.appendChild(actionDiv);
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
    document.getElementById('startQuizBtn').textContent = 'Start Quiz';
}


// --- Mind Map Feature ---
const MERMAID_CDN = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js';
let panZoomInstance = null; // Store instance globally for controls

// Control Functions
window.mindMapZoomIn = function () {
    if (panZoomInstance) panZoomInstance.zoomIn();
};

window.mindMapZoomOut = function () {
    if (panZoomInstance) panZoomInstance.zoomOut();
};

window.mindMapReset = function () {
    if (panZoomInstance) {
        panZoomInstance.reset();
        panZoomInstance.fit();
        panZoomInstance.center();
    }
};

window.mindMapFullscreen = function () {
    const container = document.getElementById('mindMapContent');
    if (!container) return;

    container.classList.toggle('fullscreen');

    // Use ResizeObserver for robust handling
    // (This is redundant if we implement the observer globally, but good for the toggle)
    if (panZoomInstance) {
        // Force a resize check after a short delay for transitions
        setTimeout(() => {
            panZoomInstance.resize();
            panZoomInstance.fit();
            panZoomInstance.center();
        }, 300); // Increased delay
    }
};

// Global Resize Observer for the Mind Map Container
const mindMapObserver = new ResizeObserver(entries => {
    if (panZoomInstance) {
        panZoomInstance.resize();
        panZoomInstance.fit();
        panZoomInstance.center();
    }
});
const mmContainer = document.getElementById('mindMapContent');
if (mmContainer) mindMapObserver.observe(mmContainer);

window.mindMapExport = function (format) {
    const container = document.getElementById('mermaidGraph');
    const svg = container.querySelector('svg');
    if (!svg) {
        showToast('No map to export', 'error');
        return;
    }

    // Get SVG Data


    // 1. Clone the SVG node to ensure we don't mess with the live instance
    const clonedSvg = svg.cloneNode(true);

    // 2. Reset Pan/Zoom Transforms (Export the whole map, untouched)
    // svg-pan-zoom usually creates a viewport group, usually the first <g>
    const viewportGroup = clonedSvg.querySelector('.svg-pan-zoom_viewport');
    if (viewportGroup) {
        viewportGroup.removeAttribute('style'); // Clear inline styles
        viewportGroup.setAttribute('transform', 'matrix(1,0,0,1,0,0)'); // Reset transform
    }

    // 3. Determine natural size from viewBox
    // Mermaid usually sets a viewBox. We should use that for the canvas size.
    let width = 800;
    let height = 600;

    // Check viewBox directly on the SVG (it is usually reliable for the full content)
    // Format: "min-x min-y width height"
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
        const parts = viewBox.split(' ').map(parseFloat);
        if (parts.length === 4) {
            width = parts[2];
            height = parts[3];
        }
    } else {
        // Fallback to client dimensions if bbox missing
        width = svg.clientWidth || 800;
        height = svg.clientHeight || 600;
    }

    // Ensure explicit dimensions on the clone
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);

    // Clear any style that forces w/h
    clonedSvg.style.width = null;
    clonedSvg.style.height = null;

    // Serialize
    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(clonedSvg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    if (format === 'svg') {
        downloadFile(url, `mindmap_${Date.now()}.svg`);
    } else if (format === 'png') {
        const canvas = document.createElement('canvas');
        const img = new Image();

        img.onload = function () {
            try {
                // High res export (2x)
                const scale = 2;
                canvas.width = width * scale;
                canvas.height = height * scale;
                const ctx = canvas.getContext('2d');

                // Background
                ctx.fillStyle = '#0f172a'; // Match bg
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const pngUrl = canvas.toDataURL('image/png');
                downloadFile(pngUrl, `mindmap_${Date.now()}.png`);
                showToast('Export successful!', 'success');
            } catch (err) {
                console.error("Export Error:", err);
                showToast('Failed to generate PNG', 'error');
            } finally {
                URL.revokeObjectURL(url);
            }
        };

        img.onerror = function (e) {
            console.error("Image Load Error:", e);
            showToast('Error loading SVG for export', 'error');
            URL.revokeObjectURL(url);
        };

        img.src = url;
    }
};

function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Helper: Dynamically load Mermaid if missing
function ensureMermaidLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof mermaid !== 'undefined') {
            resolve(mermaid);
            return;
        }


        const script = document.createElement('script');
        script.src = MERMAID_CDN;
        script.onload = () => {
            // Initialize Mermaid
            mermaid.initialize({
                startOnLoad: false,
                theme: 'dark',
                securityLevel: 'loose',
                htmlLabels: false // Required for PNG export (canvas taint issues)
            });
            resolve(mermaid);
        };
        script.onerror = () => reject(new Error('Failed to load Mermaid.js'));
        document.head.appendChild(script);
    });
}

// Helper: Sanitize Mermaid Syntax to prevent render errors
function sanitizeMermaidSyntax(syntax) {
    if (!syntax) return '';
    // Replace backticks with single quotes to prevent 'Lexical error'
    // Also ensuring we don't accidentally break existing quotes if possible, 
    // but primarily targeting the known issue where `code` style text breaks the graph label validation.
    return syntax.replace(/`/g, "'");
}

// Helper: Centralized, Robust Rendering
async function renderMindMap(container, syntax) {
    if (!container) return;

    // Clear and Show Loader
    container.innerHTML = `<div class="flex flex-col items-center justify-center p-8 text-slate-400">
        <div class="mapper-loader mb-4"></div>
        <p>Rendering Map...</p>
    </div>`;
    container.removeAttribute('data-processed');

    try {
        await ensureMermaidLoaded();

        // 0. Sanitize Syntax
        const cleanSyntax = sanitizeMermaidSyntax(syntax);

        // 1. Parse Validation (catches syntax errors early)
        await mermaid.parse(cleanSyntax);

        // 2. Set Content - Use the CLEAN syntax for the container
        // Note: Mermaid might still use the text content for callbacks if we used the API differently,
        // but for 'mermaid.run' on a containerElement, it often re-reads. 
        // Best to set the INNER HTML to the clean syntax.
        container.innerHTML = cleanSyntax;

        // 3. Wait for Paint (Fixes "firstChild" crash)
        // We use double RequestAnimationFrame to ensure a paint frame has passed
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        // 4. Render
        // We catch render errors specifically just in case
        await mermaid.run({ nodes: [container] });

        // 5. Initialize Pan/Zoom (After Render)
        // Find the generated SVG
        const svg = container.querySelector('svg');
        if (svg) {
            // Remove fixed sizes to allow scaling
            svg.removeAttribute('style');
            svg.removeAttribute('height');
            svg.removeAttribute('width');
            svg.style.width = '100%';
            svg.style.height = '100%';

            // Simple Pan-Zoom initialization
            if (typeof svgPanZoom !== 'undefined') {
                panZoomInstance = svgPanZoom(svg, {
                    zoomEnabled: true,
                    controlIconsEnabled: false, // We use our own toolbar
                    fit: true,
                    center: true,
                    minZoom: 0.1, // Allow zooming out further
                    maxZoom: 10
                });


                // Attach observer if not already
                const mmContainer = document.getElementById('mindMapContent');
                if (mmContainer && typeof mindMapObserver !== 'undefined') {
                    mindMapObserver.observe(mmContainer);
                }
            } else {
                console.warn('svg-pan-zoom library not loaded');
                showToast('Zoom library missing', 'error');
            }
        }

    } catch (e) {
        console.warn("Mermaid Render Failed:", e);
        container.innerHTML = `<div class="p-4 text-red-400 bg-red-900/20 rounded text-center">
            <div class="mb-2">
                <svg class="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
            </div>
            <p class="font-bold">Error Displaying Mind Map</p>
            <p class="text-sm mb-3 text-red-300">The saved version uses an outdated format.</p>
            <button onclick="handleMindMapRequest()" class="px-4 py-2 bg-red-600 rounded text-sm font-medium hover:bg-red-500 transition-colors">
                Regenerate Mind Map
            </button>
        </div>`;
    }
}

window.handleMindMapRequest = handleMindMapRequest;
async function handleMindMapRequest() {

    const btn = document.getElementById('generateMindMapBtn');
    const content = document.getElementById('mindMapContent');
    const startView = document.getElementById('mindMapStartView');
    const loading = document.getElementById('mindMapLoading');
    const mermaidGraph = document.getElementById('mermaidGraph');

    // UX: If regenerating from error state (where startView is hidden), show feedback in graph area
    if (mermaidGraph && mermaidGraph.innerHTML.includes('Regenerate')) {
        mermaidGraph.innerHTML = `
            <div class="flex flex-col items-center justify-center p-8 text-slate-400">
                <div class="mapper-loader mb-4"></div>
                <p>Constructing new map...</p>
            </div>
        `;
    }

    // UI Updates
    const originalBtnContent = btn.innerHTML;
    btn.dataset.originalContent = originalBtnContent;
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner-sm"></div> Structuring...`;

    loading.classList.remove('hidden'); // Show loading
    startView.classList.add('hidden'); // Hide start

    // Timeout Controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    try {
        const response = await fetch(`${API_BASE}/api/mindmap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: currentTranscript }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.success) {
            // Success State
            loading.classList.add('hidden');
            content.classList.remove('hidden');

            // Render safely
            await renderMindMap(mermaidGraph, data.mindmap);

            if (currentVideoId) {
                updateHistoryItem(currentVideoId, { mindmap: data.mindmap });
            }

            // Keep button state until reset (which happens on new video)
            // But here we want to allow regeneration? Maybe later. 
            // For now, let's reset button so it doesn't look stuck if they reset manually.
            btn.disabled = false;
            btn.innerHTML = originalBtnContent;

        } else {
            throw new Error(data.error || 'Failed to generate mind map');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            showToast('Request timed out.', 'error');
        } else {
            showToast(error.message || 'Network error', 'error');
        }
        console.error(error);

        // Revert UI
        loading.classList.add('hidden');
        startView.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = originalBtnContent;
    }
}

function resetMindMap() {
    const content = document.getElementById('mindMapContent');
    const startView = document.getElementById('mindMapStartView');
    const loading = document.getElementById('mindMapLoading');
    const btn = document.getElementById('generateMindMapBtn');
    const mermaidGraph = document.getElementById('mermaidGraph');

    if (content) content.classList.add('hidden');
    if (loading) loading.classList.add('hidden');

    // CRITICAL: Clear graph content to prevent ghost state
    if (mermaidGraph) {
        mermaidGraph.innerHTML = '';
        mermaidGraph.removeAttribute('data-processed');
    }

    if (startView) {
        startView.classList.remove('hidden');
        startView.style.display = '';
    }

    if (btn) {
        btn.disabled = false;
        if (btn.dataset.originalContent) {
            btn.innerHTML = btn.dataset.originalContent;
        } else {
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v20"></path>
                    <path d="M2 12h20"></path>
                    <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"></path>
                </svg>
                Generate Map
            `;
        }
    }
}

function regenerateQuiz() {
    // Directly switch to loading state to avoid "flash" of start view
    document.getElementById('quizContent').classList.add('hidden');
    document.getElementById('quizScore').classList.add('hidden');
    document.getElementById('quizStartView').classList.add('hidden');

    // Show spinner
    document.getElementById('quizLoading').classList.remove('hidden');

    // Trigger the actual generation logic
    // We can click the button, but we've already hidden the UI it relies on being visible.
    // However, handleQuizRequest handles the "Start View" hiding itself.
    // So if we just click the button, handleQuizRequest will run.
    const btn = document.getElementById('startQuizBtn');
    if (btn) btn.click();
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

        // Reset Sections
        if (typeof resetQuiz === 'function') resetQuiz();
        if (typeof resetSteps === 'function') resetSteps();
        if (typeof resetMindMap === 'function') resetMindMap();
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

    // Also handle the main summary loading indicator
    const summaryLoading = document.getElementById('summaryLoading');
    if (summaryLoading) {
        if (isLoading) {
            // We don't necessarily want to show it here, as it's shown explicitly in handleSubmit
            // But we definitely want to HIDE it when isLoading is false
        } else {
            summaryLoading.classList.add('hidden');
        }
    }
}

// Show Skeleton Loading
function showSkeletonLoading(videoId) {
    // Show results container
    resultsContainer.classList.remove('hidden');

    // Hide Toolbar and Tabs explicitly during loading
    const toolbar = document.querySelector('.summary-actions-toolbar');
    if (toolbar) toolbar.classList.add('hidden');

    if (tabsContainer) tabsContainer.classList.add('hidden');

    // Show Thumbnail immediately if we have ID
    if (videoId) {
        videoThumbnail.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        videoThumbnail.classList.remove('hidden');

        // Reset player wrapper to show thumbnail
        const playerDiv = document.getElementById('player');
        const overlay = videoPlayerWrapper.querySelector('.play-overlay');
        const badge = videoPlayerWrapper.querySelector('.live-badge');

        playerDiv.classList.add('hidden');
        if (overlay) overlay.classList.remove('hidden');
        if (badge) badge.classList.remove('hidden');

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
        currentVideoId = videoId; // Update global ID

        // Reset Steps and Quiz UI for new video
        resetQuiz();
        resetSteps();

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
function saveToHistory(data) {
    const historyItem = {
        id: data.id,
        title: data.title,
        summary: data.summary,
        transcript: data.transcript,
        length: data.length,
        tone: data.tone,
        metadata: data.metadata,
        thumbnail: `https://img.youtube.com/vi/${data.id}/mqdefault.jpg`,
        timestamp: Date.now()
    };

    let history = JSON.parse(localStorage.getItem('yt_summary_history') || '[]');

    // Remove duplicate if exists (same video AND same params)
    history = history.filter(item => !(item.id === data.id && item.length === data.length && item.tone === data.tone));

    // Add new item to top
    history.unshift(historyItem);

    // Limit size - Removed to allow pagination

    localStorage.setItem('yt_summary_history', JSON.stringify(history));
    loadHistory();
}

// Update History Item (Partial Update)
function updateHistoryItem(id, updates) {
    let history = JSON.parse(localStorage.getItem('yt_summary_history') || '[]');
    const index = history.findIndex(item => item.id === id);

    if (index !== -1) {
        history[index] = { ...history[index], ...updates };
        localStorage.setItem('yt_summary_history', JSON.stringify(history));
        // We don't reload list here to avoid distracting re-renders
    }
}

// Load History
function loadHistory(page = 1) {

    currentPage = page;
    let history = JSON.parse(localStorage.getItem('yt_summary_history') || '[]');


    // Filter out corrupted items (where id is not a string)
    history = history.filter(item => item && typeof item.id === 'string');

    // Sort by timestamp descending (newest first) - assuming timestamp exists
    // If timestamp is missing, it might rely on array order (push adds to end, so reverse)
    // Let's reverse it to show newest first if they were pushed chronologically
    history.reverse();

    const totalItems = history.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Validate page
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    // Slice for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = history.slice(startIndex, endIndex);

    // Clear list
    logList.innerHTML = '';

    if (totalItems === 0) {
        logList.innerHTML = '<div class="text-slate-500 text-sm italic p-4">No history yet.</div>';
        renderPagination(0);
        return;
    }

    currentItems.forEach(item => {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        logItem.onclick = () => loadHistoryItem(item);

        // Truncate title
        const displayTitle = item.title || 'Untitled Video';
        const title = displayTitle.length > 50 ? displayTitle.substring(0, 50) + '...' : displayTitle;
        const date = item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '';

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

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const paginationControls = document.getElementById('paginationControls');
    if (!paginationControls) return;

    paginationControls.innerHTML = '';


    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
    `;
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => loadHistory(currentPage - 1);
    paginationControls.appendChild(prevBtn);

    // Page Numbers
    // Simple version: show all pages if small number, or just current?
    // Let's show up to 5 page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => loadHistory(i);
        paginationControls.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
    `;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => loadHistory(currentPage + 1);
    paginationControls.appendChild(nextBtn);
}



function loadHistoryItem(item) {
    // CRITICAL FIX: Fetch the latest version of this item from localStorage
    // The 'item' passed here is stale (captured when the list was rendered).
    // If we generated Steps/Quiz since then, this stale object won't have them.
    const allHistory = JSON.parse(localStorage.getItem('yt_summary_history') || '[]');
    const freshItem = allHistory.find(i => i.id === item.id) || item;

    // Use freshItem for everything below
    item = freshItem;
    currentVideoId = item.id; // Update global ID

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
    // Clear previous feature data
    const chatHistory = document.getElementById('chatHistory');
    if (chatHistory) chatHistory.innerHTML = '<div class="chat-message ai"><div class="message-content"><p>Hi! Ask me anything about this video.</p></div></div>';

    const stepsContent = document.getElementById('stepsContent');
    const stepsStartView = document.getElementById('stepsStartView');
    const stepsActions = document.getElementById('stepsActions');

    if (stepsContent) stepsContent.innerHTML = '';

    resetQuiz();
    if (typeof resetSteps === 'function') resetSteps();

    // Check for saved steps
    if (item.steps) {
        if (stepsContent) {
            stepsContent.innerHTML = formatMarkdown(item.steps);
            stepsContent.classList.remove('hidden');
        }
        if (stepsStartView) {
            stepsStartView.classList.add('hidden');
            stepsStartView.style.display = 'none'; // Force hide
        }
        if (stepsActions) stepsActions.classList.remove('hidden');
    }

    resetMindMap();
    // Check for saved mind map
    if (item.mindmap) {
        const mmContent = document.getElementById('mindMapContent');
        const mmStartView = document.getElementById('mindMapStartView');
        const mermaidGraph = document.getElementById('mermaidGraph');

        if (mmContent) {
            mmContent.classList.remove('hidden');
            // Important: Mark it as active/loaded so switchTab doesn't reset it
            mmContent.dataset.loaded = 'true';
        }
        if (mmStartView) {
            mmStartView.classList.add('hidden');
            mmStartView.style.display = 'none';
        }

        // Use centralized renderer in LAZY MODE
        if (mermaidGraph) {
            // We do NOT render immediately because tab is hidden (display:none)
            // Mermaid will crash (getBBox failure) if rendered in hidden container.
            // Instead, we stage the data.
            mermaidGraph.dataset.needsRender = 'true';
            mermaidGraph.dataset.pendingSyntax = item.mindmap;
            mermaidGraph.innerHTML = ''; // Clear old content
        }
    } else {
        // Reset state if no mindmap
        const mmContent = document.getElementById('mindMapContent');
        const mmStartView = document.getElementById('mindMapStartView');
        const mermaidGraph = document.getElementById('mermaidGraph');
        if (mmContent) {
            mmContent.classList.add('hidden');
            delete mmContent.dataset.loaded;
        }
        if (mmStartView) {
            mmStartView.classList.remove('hidden');
            mmStartView.style.display = 'block';
        }
        if (mermaidGraph) mermaidGraph.innerHTML = '';
    }

    // Assuming resetChat doesn't exist, we manually reset chat if needed or leave as is since we clear innerHTML above
    // Actually, chat history is cleared in line 1695-1696.


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

    const videoTitle = document.getElementById('videoTitle');
    if (videoTitle) {
        videoTitle.textContent = data.title || `Video ID: ${videoId}`;
    }

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
function showSummary(text) {
    const summaryText = document.getElementById('summaryText');
    if (!summaryText) return;

    // Update summary text
    summaryText.innerHTML = formatMarkdown(text);

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

// Toast Notification
function showToast(message, type = 'info') {
    // Create toast container if not exists
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon based on type
    const icon = type === 'error' ? '❌' : (type === 'success' ? '✅' : 'ℹ️');

    toast.style.cssText = `
        background: ${type === 'error' ? '#ef4444' : '#1e293b'};
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideUpFade 0.3s ease-out;
        pointer-events: auto;
        border: 1px solid rgba(255,255,255,0.1);
    `;

    toast.innerHTML = `<span>${icon}</span> ${message}`;

    // Add to container
    toastContainer.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function clearHistory() {
    if (confirm('Are you sure you want to clear your entire history?')) {
        localStorage.removeItem('yt_summary_history');
        loadHistory();
        showToast('History cleared.');
    }
}
