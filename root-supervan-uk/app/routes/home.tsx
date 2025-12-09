import type { Route } from "./+types/home";
import { posts } from "../data/posts";
import { Link } from "react-router";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Supervan.uk - Home" },
    { name: "description", content: "Welcome to Supervan.uk - AI, Tech, and Engineering Insights" },
  ];
}

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-8">
          <img src="/logo-full.png" alt="Supervan.uk" className="h-24 md:h-32 object-contain" />
        </div>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
          Exploring the frontiers of Artificial Intelligence, Engineering, and the Future of Tech.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="https://yt.supervan.uk"
            className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-full transition-all hover:scale-105 shadow-lg shadow-purple-900/20"
          >
            <img src="/logo.png" alt="App Logo" className="h-8 w-8 rounded-lg shadow-sm" />
            Launch YouTube Summarizer
          </a>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-full transition-all border border-slate-700"
          >
            Learn More
          </Link>
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 font-bold py-3 px-6 rounded-full transition-all border border-red-700/50"
            title="Video Tutorial Coming Soon"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Tutorial
          </a>
          {import.meta.env.DEV && (
            <a
              href="http://localhost:5174"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-cyan-900/50 hover:bg-cyan-800/50 text-cyan-300 font-bold py-3 px-6 rounded-full transition-all border border-cyan-700/50"
            >
              ⚡ Local Speed Test
            </a>
          )}
        </div>
      </div>

      {/* Blog Grid */}
      <h2 className="text-2xl font-bold text-white mb-8 border-b border-slate-800 pb-4">Latest Articles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post) => (
          <Link key={post.id} to={`/post/${post.slug}`} className="group bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-purple-500/50 transition-all hover:shadow-2xl hover:shadow-purple-900/10 flex flex-col h-full">
            <div className="aspect-video w-full overflow-hidden bg-slate-950 relative">
              {post.imageUrl ? (
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                  No Image
                </div>
              )}
              <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-purple-400 border border-slate-700">
                {post.category}
              </div>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <div className="text-sm text-slate-500 mb-2">{post.date}</div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors line-clamp-2">
                {post.title}
              </h3>
              <p className="text-slate-400 text-sm line-clamp-3 mb-4 flex-grow">
                {post.excerpt}
              </p>
              <div className="flex items-center text-purple-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Read Article &rarr;
              </div>
            </div>
          </Link>
        ))}
      </div>


    </div>
  );
}
