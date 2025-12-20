import type { Route } from "./+types/post";
import { posts } from "../data/posts";
import { Link } from "react-router";
import ReactMarkdown from "react-markdown";

export function meta({ params }: Route.MetaArgs) {
    const post = posts.find((p) => p.slug === params.slug);
    if (!post) {
        return [{ title: "Post Not Found - SuperVan Digital" }];
    }
    return [
        { title: `${post.title} | SuperVan Digital` },
        { name: "description", content: post.excerpt },
    ];
}

// Generate static paths for all posts
export function prerender() {
    return posts.map((post) => `/post/${post.slug}`);
}

// Server loader for SSG/Prerendering
export async function loader({ params }: Route.LoaderArgs) {
    const post = posts.find((p) => p.slug === params.slug);
    if (!post) {
        throw new Response("Not Found", { status: 404 });
    }
    return { post };
}

export function clientLoader({ params }: Route.ClientLoaderArgs) {
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
                <Link to="/" className="text-indigo-600 hover:text-indigo-500 transition-colors mb-4 inline-block font-medium">
                    &larr; Back to Home
                </Link>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-700 font-medium">{post.category}</span>
                    <span>{post.date}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">{post.title}</h1>
                {post.imageUrl && (
                    <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-64 md:h-96 object-cover rounded-2xl shadow-lg mb-8 border border-slate-200"
                    />
                )}
            </div>

            <div className="prose prose-indigo prose-lg max-w-none text-slate-500">
                <ReactMarkdown
                    components={{
                        p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-slate-900 mt-8 mb-4" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-slate-900 mt-6 mb-3" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                        li: ({ node, ...props }) => <li className="text-slate-600" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                        a: ({ node, ...props }) => <a className="text-indigo-600 hover:text-indigo-500 underline" {...props} />,
                    }}
                >
                    {post.content}
                </ReactMarkdown>
            </div>
        </div>
    );
}
