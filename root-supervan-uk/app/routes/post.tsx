import type { Route } from "./+types/post";
import { posts } from "../data/posts";
import { Link } from "react-router";
import ReactMarkdown from "react-markdown";

export function meta({ params }: Route.MetaArgs) {
    const post = posts.find((p) => p.slug === params.slug);
    if (!post) {
        return [{ title: "Post Not Found - Supervan.uk" }];
    }
    return [
        { title: `${post.title} - Supervan.uk` },
        { name: "description", content: post.excerpt },
    ];
}

export function loader({ params }: Route.LoaderArgs) {
    const post = posts.find((p) => p.slug === params.slug);
    if (!post) {
        throw new Response("Not Found", { status: 404 });
    }
    return { post };
}

export default function Post({ loaderData }: Route.ComponentProps) {
    const { post } = loaderData;

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-8">
                <Link to="/" className="text-purple-400 hover:text-purple-300 transition-colors mb-4 inline-block">
                    &larr; Back to Home
                </Link>
                <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                    <span className="bg-slate-800 px-3 py-1 rounded-full text-slate-300">{post.category}</span>
                    <span>{post.date}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">{post.title}</h1>
                {post.imageUrl && (
                    <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-64 md:h-96 object-cover rounded-2xl shadow-2xl mb-8 border border-slate-800"
                    />
                )}
            </div>

            <div className="prose prose-invert prose-lg max-w-none text-slate-300">
                <ReactMarkdown
                    components={{
                        p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-white mt-8 mb-4" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-white mt-6 mb-3" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                        li: ({ node, ...props }) => <li className="text-slate-300" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                        a: ({ node, ...props }) => <a className="text-purple-400 hover:text-purple-300 underline" {...props} />,
                    }}
                >
                    {post.content}
                </ReactMarkdown>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-800">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-4 text-center">Advertisement</p>
                {/* AdSense Placeholder */}
                <div className="bg-slate-900 w-full h-32 flex items-center justify-center text-slate-600 rounded-lg border border-dashed border-slate-800">
                    Google AdSense Placeholder
                </div>
            </div>
        </div>
    );
}
