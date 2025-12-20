export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    date: string;
    imageUrl?: string;
    videoUrl?: string;
    category: string;
}

export const posts: BlogPost[] = [
    {
        id: "ai-infographics",
        slug: "introducing-ai-infographics",
        title: "Introducing AI Infographics: Turn Video Summaries into Visuals",
        excerpt: "We've added a powerful new feature that automatically generates beautiful, style-aware infographics for every video summary.",
        content: `A picture is worth a thousand words, especially when trying to digest complex video content. That's why we're thrilled to announce our newest feature: **AI Infographics**.

Now, whenever you generate a summary, our AI also creates a custom vector infographic that visualizes the key concepts, stats, and flows from the transcript.

### 5 Unique Visual Styles
The infographic isn't just a generic template. It adapts to the "Tone" you select for your summary:

*   **Conversational:** A friendly, hand-drawn "whiteboard" sketch style with marker icons.
*   **Professional:** A clean, corporate Swiss-design aesthetic with a structured grid.
*   **Technical:** A schematic blueprint looking like a technical wireframe.
*   **Witty:** A vibrant Pop Art style with bold colors and comic-book elements.
*   **Sarcastic:** A dark, "glitch art" aesthetic with neon accents.

### Solved: The "Missing Image" Copy Problem
Have you ever tried to copy a webpage with an SVG image and paste it into Gmail, only to see a broken box? We fixed that.

We built a custom rendering engine that automatically rasterizes our SVG infographics into high-resolution PNG images the moment you click "Copy". This means you can paste your full summary—including the beautiful new infographic—directly into emails, Docs, or Slack without any broken images.

Try it out today on any video!`,
        date: "2025-12-20",
        imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
        videoUrl: "",
        category: "Product Update"
    },
    {
        id: "new-speed-test",
        slug: "internet-speed-test",
        title: "Introducing SuperVan Speed Test: Professional Grade Diagnostics",
        excerpt: "A professional-grade internet diagnostic tool designed for accuracy, privacy, and ease of use.",
        content: `We are excited to launch our second major tool: SuperVan Speed Test, a professional-grade internet diagnostic tool designed for accuracy, privacy, and ease of use.
        
Most internet speed tests are cluttered with ads, slow to load, or track excessive amounts of user data. We wanted to build something different: a tool that is lightweight, beautiful, and privacy-focused.

Key Features:
- Detailed Metrics: Measure Download, Upload, and Ping latency with high precision.
- Historical Logging: Automatically save your test history locally.
- Privacy First: No account required.
- Dark Mode UI: A sleek, modern interface.`,
        date: "2025-12-14",
        imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&q=80",
        videoUrl: "",
        category: "Product Launch"
    },
    {
        id: "1",
        slug: "ai-expert-warning-2030",
        title: "AI Expert: (Warning) 2030 Might Be The Point Of No Return!",
        excerpt: "Professor Stuart Russell warns that the race for superintelligence is heading off a cliff, driven by corporate greed.",
        content: `Professor Stuart Russell, a legendary AI expert, warns that the race for superintelligence is heading off a cliff, driven by corporate greed and a 'Midas touch' desire for massive economic rewards. He believes governments must urgently intervene to mandate safe AI development, ensuring these powerful systems act solely as beneficial tools for humanity.

Based solely on the transcript, the jobs and job sectors that are gone or are expected to go away due to AI and automation include:

*   **All forms of human work** (including professional pursuits)
*   **White collar jobs** (whole layers eliminated by computerization, and eventually all of them)
*   **Office jobs**
*   **Manufacturing employment** (destroyed by automation and robotics)
*   **Jobs where people are interchangeable** ("where you hire people by the hundred")
*   **Driving** (driverless cars)
*   **Surgeons/Medicine** (robots are expected to be 10 times better than any surgeon)
*   **Warehouse workers** (Amazon plans to replace all of its warehouse workers with robots)
*   **Corporate jobs** (Amazon is cutting corporate jobs due to AI)`,
        date: "2025-12-04",
        imageUrl: "https://img.youtube.com/vi/P7Y-fynYsgE/maxresdefault.jpg",
        videoUrl: "https://youtu.be/P7Y-fynYsgE",
        category: "Artificial Intelligence"
    },
    {
        id: "2",
        slug: "freecad-3d-modeling-intro",
        title: "FreeCAD 3D Modeling: Pad, Pocket & Parametric Design!",
        excerpt: "Learn the basic operations like Pad and Pocket in FreeCAD, a totally free 3D CAD system.",
        content: `Hey there! This video is a great intro to FreeCAD, a totally free 3D CAD system, showing you the fastest way to start modeling by building a simple part. You'll learn the basic operations like Pad and Pocket, and see how easy it is to make design changes later thanks to its parametric features.

FreeCAD is an open-source parametric 3D modeler made primarily to design real-life objects of any size. Parametric modeling allows you to easily modify your design by going back into your model history and changing its parameters.`,
        date: "2025-12-03",
        imageUrl: "https://img.youtube.com/vi/JyGK0S1KGQU/maxresdefault.jpg",
        videoUrl: "https://youtu.be/JyGK0S1KGQU",
        category: "Design & Engineering"
    },
    {
        id: "3",
        slug: "ferrari-vs-lamborghini-vs-aston-martin",
        title: "Ferrari 12C vs Lamborghini Revuelto vs Aston Martin Vanquish!",
        excerpt: "A battle of the V12s: Naturally aspirated Ferrari vs Twin-turbo Aston Martin vs Hybrid Lamborghini.",
        content: `To celebrate the mighty V12, a naturally aspirated Ferrari, a twin-turbo Aston Martin, and a hybrid Lamborghini faced off in a series of drag races. Unsurprisingly, the powerful, AWD hybrid Lamborghini dominated the competition, although the Ferrari barely managed to edge out the Aston Martin in an incredibly close battle.

The V12 engine is a V engine with 12 cylinders mounted on the crankcase in two banks of six cylinders, usually but not always at a 60° angle to each other, with all 12 pistons driving a common crankshaft.`,
        date: "2025-12-02",
        imageUrl: "https://img.youtube.com/vi/mabtGPNZRGs/maxresdefault.jpg",
        videoUrl: "https://youtu.be/mabtGPNZRGs",
        category: "Automotive"
    },
    // Placeholders to reach content volume
    {
        id: "4",
        slug: "future-of-renewable-energy",
        title: "The Future of Renewable Energy: Solar & Wind",
        excerpt: "Exploring the latest advancements in solar panel efficiency and wind turbine technology.",
        content: "Renewable energy is the future. Solar panels are becoming more efficient, and wind turbines are generating more power than ever before. The transition to green energy is accelerating...",
        date: "2025-12-01",
        imageUrl: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80",
        category: "Technology"
    },
    {
        id: "5",
        slug: "python-vs-javascript-2025",
        title: "Python vs JavaScript: Which to Learn in 2025?",
        excerpt: "A comprehensive comparison of the two most popular programming languages.",
        content: "Python continues to dominate in AI and Data Science, while JavaScript remains the king of the web. Which one should you learn? It depends on your goals...",
        date: "2025-11-30",
        imageUrl: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=800&q=80",
        category: "Programming"
    },
    {
        id: "6",
        slug: "mindfulness-meditation-guide",
        title: "A Beginner's Guide to Mindfulness Meditation",
        excerpt: "Reduce stress and improve focus with these simple meditation techniques.",
        content: "Mindfulness is the practice of being present in the moment. Just 10 minutes a day can significantly reduce stress levels and improve cognitive function...",
        date: "2025-11-29",
        imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
        category: "Lifestyle"
    },
    {
        id: "7",
        slug: "space-exploration-mars-mission",
        title: "SpaceX's Mars Mission: What We Know So Far",
        excerpt: "An update on the Starship program and the timeline for human colonization of Mars.",
        content: "SpaceX is pushing the boundaries of space travel. The Starship rocket is the largest flying object ever built, designed to carry humans to Mars...",
        date: "2025-11-28",
        imageUrl: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&q=80",
        category: "Science"
    }
];
