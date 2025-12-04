import type { Route } from "./+types/about";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "About Us - Supervan.uk" },
        { name: "description", content: "About Supervan.uk and our mission." },
    ];
}

export default function About() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-white mb-8">About Us</h1>
            <div className="prose prose-invert max-w-none">
                <p className="text-lg text-slate-300 mb-6">
                    Welcome to <strong>Supervan.uk</strong>, your premier destination for exploring the cutting edge of technology, artificial intelligence, and digital innovation.
                </p>
                <p className="text-slate-400 mb-6">
                    Founded in 2025, our mission is to demystify complex technological advancements and make them accessible to everyone. We believe that AI and automation are not just buzzwords, but transformative forces that are reshaping our world.
                </p>
                <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Our Vision</h2>
                <p className="text-slate-400 mb-6">
                    We strive to provide insightful analysis, practical tools, and engaging content that empowers our readers to stay ahead of the curve. Whether you're a developer, a tech enthusiast, or just curious about the future, Supervan.uk is here to guide you.
                </p>
                <h2 className="text-2xl font-semibold text-white mt-8 mb-4">The Team</h2>
                <p className="text-slate-400 mb-6">
                    We are a passionate team of engineers, writers, and futurists dedicated to curating the best content from around the web and developing useful applications like our signature <strong>YouTube Summarizer</strong>.
                </p>
            </div>
        </div>
    );
}
