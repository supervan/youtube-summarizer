
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
        /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(?:channels\/[\w]+\/)?([0-9]+)/,
        /(?:tiktok\.com\/.*\/video\/|vm\.tiktok\.com\/)([\w-]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

const urls = [
    "https://vm.tiktok.com/ZNRkprvPT/",
    "https://www.tiktok.com/@lauradee94/video/7595658492527004983"
];

urls.forEach(url => {
    console.log(`URL: ${url} -> ID: ${extractVideoId(url)}`);
});
