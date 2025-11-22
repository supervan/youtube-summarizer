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
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkInstallPrompt();
});

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

// Setup event listeners
function setupEventListeners() {
    summarizerForm.addEventListener('submit', handleSubmit);
    copyBtn.addEventListener('click', copySummary);
    toggleInputBtn.addEventListener('click', () => toggleInputSection());
    resetBtn.addEventListener('click', resetApp);

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

// Reset Application
function resetApp() {
    youtubeUrlInput.value = '';
    hideAllCards();
    toggleInputSection(true); // Ensure input is expanded

    // Reset defaults
    summaryLengthSelect.value = 'short';
    summaryToneSelect.value = 'conversational'; // Assuming conversational is default
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

    videoTitle.textContent = `Video ID: ${videoId}`;
    transcriptLength.textContent = `Transcript: ${data.length} characters`;

    videoInfoCard.classList.remove('hidden');
    videoInfoCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Show summary
function showSummary(summary) {
    // Convert markdown-style formatting to HTML
    let formattedSummary = summary
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    // Wrap in paragraph tags
    formattedSummary = `<p>${formattedSummary}</p>`;

    summaryContent.innerHTML = formattedSummary;
    summaryCard.classList.remove('hidden');
    copyBtn.classList.remove('hidden'); // Show copy button
    summaryCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
