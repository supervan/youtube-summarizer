import { Link } from "react-router";

export default function LauncherGrid() {
    const apps = [
        {
            title: "YouTube Summarizer",
            description: "Convert long videos into concise summaries, mind maps, and quizzes.",
            href: "https://digest.supervan.uk",
            icon: (
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h5.586a1 1 0 0 1 .707 .293l5.414 5.414a1 0 0 1 .293 .707V19a2 2 0 0 1 -2 2z" />
                </svg>
            ),
            color: "bg-indigo-700",
        },
        {
            title: "Internet Speed Test",
            description: "Accurate, lightweight speed test for your internet connection.",
            href: "/speed",
            icon: (
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            color: "bg-emerald-700",
        },
    ];

    return (
        <div id="apps" className="py-12 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Our Apps</h2>
                    <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        Tools to Power Your Productivity
                    </p>
                    <p className="mt-4 max-w-2xl text-xl text-slate-600 lg:mx-auto">
                        Explore our suite of specialized digital tools designed for efficiency.
                    </p>
                </div>

                <div className="mt-10 max-w-lg mx-auto grid gap-5 lg:grid-cols-2 lg:max-w-none">
                    {apps.map((app) => (
                        <div key={app.title} className="flex flex-col rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 duration-300">
                            <div className={`flex-shrink-0 flex items-center justify-center h-48 ${app.color}`}>
                                {app.icon}
                            </div>
                            <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                                <div className="flex-1">
                                    <a href={app.href} className="block mt-2">
                                        <p className="text-xl font-semibold text-slate-900">{app.title}</p>
                                        <p className="mt-3 text-base text-slate-600">{app.description}</p>
                                    </a>
                                </div>
                                <div className="mt-6 flex items-center">
                                    <div className="w-full">
                                        <a
                                            href={app.href}
                                            className={`w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${app.color} hover:opacity-90`}
                                        >
                                            Launch App
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
