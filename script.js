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
const videoTitle = document.getElementById('videoTitle');
const transcriptLength = document.getElementById('transcriptLength');

const summaryCard = document.getElementById('summaryCard');
const summaryContent = document.getElementById('summaryContent');
const copyBtn = document.getElementById('copyBtn');
const readAloudBtn = document.getElementById('readAloudBtn');
const voiceSelect = document.getElementById('voiceSelect');
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

// API Configuration
const API_BASE = window.location.origin;

// Initialize app
// Global state
let currentTranscript = '';
let enabledFeatures = {};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkInstallPrompt();
    handleSharedContent();
    fetchFeatures(); // Fetch feature flags
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
    summarizerForm.addEventListener('submit', handleSubmit);
    copyBtn.addEventListener('click', copySummary);
    readAloudBtn.addEventListener('click', toggleReadAloud);
    toggleInputBtn.addEventListener('click', () => toggleInputSection());

    // Voice selection
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    populateVoiceList();
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

    // Install prompt listeners
    installLink.addEventListener('click', (e) => {
        e.preventDefault();
        installModal.classList.remove('hidden');
    });

    closeModal.addEventListener('click', () => {
        installModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    installModal.addEventListener('click', (e) => {
        if (e.target === installModal) {
            installModal.classList.add('hidden');
        }
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
    const isCollapsed = inputSection.classList.contains('collapsed');
    const shouldCollapse = forceState !== null ? !forceState : !isCollapsed;

    if (shouldCollapse) {
        inputSection.classList.add('collapsed');
        toggleInputBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14" />
            </svg>
        `; // Plus icon
    } else {
        inputSection.classList.remove('collapsed');
        toggleInputBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14" />
            </svg>
        `; // Minus icon
    }
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
    videoThumbnail.src = ''; // Clear previous
    videoThumbnail.classList.add('hidden');

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
    readAloudBtn.classList.add('hidden'); // Ensure read button is hidden
    voiceSelect.classList.add('hidden'); // Ensure voice select is hidden
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
function showVideoInfo(videoId, data) {
    // Remove skeleton
    const skeletonThumb = videoInfoCard.querySelector('.skeleton-thumbnail');
    if (skeletonThumb) skeletonThumb.classList.add('hidden');

    videoThumbnail.classList.remove('hidden');

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Try high quality thumbnail first, with fallback to medium quality
    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    // Make thumbnail clickable
    videoThumbnail.src = thumbnailUrl;
    videoThumbnail.alt = 'Video Thumbnail - Click to watch';
    videoThumbnail.style.cursor = 'pointer';
    videoThumbnail.onclick = () => window.open(videoUrl, '_blank');
    videoThumbnail.title = 'Click to watch video on YouTube';

    // Fallback to default thumbnail if high quality fails
    videoThumbnail.onerror = () => {
        videoThumbnail.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        videoThumbnail.onerror = null; // Prevent infinite loop
    };

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
    summaryCard.classList.remove('hidden');
    copyBtn.classList.remove('hidden'); // Show copy button
    readAloudBtn.classList.remove('hidden'); // Show read aloud button
    if (voices.length > 0) voiceSelect.classList.remove('hidden'); // Show voice select if voices available
    summaryCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Populate Voice List
function populateVoiceList() {
    const allVoices = window.speechSynthesis.getVoices();

    // Filter for English voices only
    voices = allVoices.filter(voice => voice.lang.startsWith('en'));

    // Sort voices: Google/Microsoft first, then others
    voices.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const isAGood = aName.includes('google') || aName.includes('microsoft') || aName.includes('natural');
        const isBGood = bName.includes('google') || bName.includes('microsoft') || bName.includes('natural');

        if (isAGood && !isBGood) return -1;
        if (!isAGood && isBGood) return 1;
        return aName.localeCompare(bName);
    });

    voiceSelect.innerHTML = '';

    if (voices.length === 0) {
        // Fallback if no English voices found
        voices = allVoices;
    }

    voices.forEach((voice) => {
        const option = document.createElement('option');
        let label = voice.name;

        // Clean up label for better readability
        label = label.replace('Microsoft ', '').replace('Google ', '').replace(' English', '');

        option.textContent = `${label} (${voice.lang})`;

        if (voice.default) {
            option.textContent += ' -- Default';
        }

        option.setAttribute('data-lang', voice.lang);
        option.setAttribute('data-name', voice.name);
        voiceSelect.appendChild(option);
    });

    // Select default voice: Prioritize UK English Female, then UK English, then US English
    let defaultVoice = voices.find(v => v.name.includes('UK English Female') || v.name.includes('Google UK English Female'));

    if (!defaultVoice) {
        defaultVoice = voices.find(v => v.lang === 'en-GB' && (v.name.includes('Female') || v.name.includes('Google')));
    }

    if (!defaultVoice) {
        defaultVoice = voices.find(v => v.lang === 'en-GB');
    }

    if (!defaultVoice) {
        defaultVoice = voices.find(v => v.default) || voices[0];
    }

    if (defaultVoice) {
        voiceSelect.value = defaultVoice.name;
        // Manually select the option by text content if value doesn't work directly for some browsers
        for (let i = 0; i < voiceSelect.options.length; i++) {
            if (voiceSelect.options[i].getAttribute('data-name') === defaultVoice.name) {
                voiceSelect.selectedIndex = i;
                break;
            }
        }
    }

    // Show/hide dropdown based on availability
    if (voices.length > 0) {
        voiceSelect.classList.remove('hidden');
    } else {
        voiceSelect.classList.add('hidden');
    }
}

// Toggle Read Aloud
function toggleReadAloud() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        updateReadButton(false);
    } else {
        const text = summaryContent.innerText;
        const utterance = new SpeechSynthesisUtterance(text);

        // Set selected voice
        const selectedOption = voiceSelect.selectedOptions[0];
        if (selectedOption) {
            const selectedVoiceName = selectedOption.getAttribute('data-name');
            const voice = voices.find(v => v.name === selectedVoiceName);
            if (voice) utterance.voice = voice;
        }

        utterance.onend = () => {
            updateReadButton(false);
        };

        utterance.onerror = () => {
            updateReadButton(false);
        };

        window.speechSynthesis.speak(utterance);
        updateReadButton(true);
    }
}

function updateReadButton(isSpeaking) {
    if (isSpeaking) {
        readAloudBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            Stop
        `;
        readAloudBtn.classList.add('btn-active');
    } else {
        readAloudBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            Read
        `;
        readAloudBtn.classList.remove('btn-active');
    }
}

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
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
}

// Handle shared content from Web Share Target
function handleSharedContent() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url') || urlParams.get('text');

    if (sharedUrl) {
        // Check if it's a YouTube URL
        const videoId = extractVideoId(sharedUrl);
        if (videoId) {
            // Populate the input field
            youtubeUrlInput.value = sharedUrl;

            // Expand input section if collapsed
            if (inputSection.classList.contains('collapsed')) {
                toggleInputSection(true);
            }

            // Scroll to input
            youtubeUrlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Optional: Auto-submit after a short delay
            // setTimeout(() => summarizerForm.requestSubmit(), 500);
        }

        // Clean up URL (remove query params)
        window.history.replaceState({}, document.title, '/');
    }
}

// Check if install prompt should be shown
function checkInstallPrompt() {
    // Check if already installed (running in standalone mode)
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Show prompt only on mobile AND when not installed
    if (isMobile && !isInstalled) {
        installPrompt.classList.remove('hidden');

        // Show appropriate instructions based on platform
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            androidInstructions.classList.add('hidden');
            iosInstructions.classList.remove('hidden');
        }
    }
}
