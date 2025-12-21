import { Link, Outlet } from "react-router";
import { useState, useEffect, useRef } from "react";

export default function Layout() {
    const [isAppsOpen, setIsAppsOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsAppsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Navigation */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex-shrink-0 flex items-center">
                                <img
                                    src="/logo-wide.png"
                                    alt="SuperVan Digital"
                                    className="h-8 w-auto sm:h-10"
                                />
                            </Link>
                            <div className="hidden md:block">
                                <div className="ml-10 flex items-baseline space-x-6 -mt-2.5">
                                    <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                        Home
                                    </Link>
                                    <a href="/#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                        Features
                                    </a>
                                    <Link to="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                        About
                                    </Link>
                                    <a href="/blog/index.html" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                        Engineering Blog
                                    </a>
                                    <Link to="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                        Contact
                                    </Link>

                                    {/* App Launcher */}
                                    <div className="ml-4 relative" ref={dropdownRef}>
                                        <button
                                            onClick={() => setIsAppsOpen(!isAppsOpen)}
                                            className={`p-2 rounded-full transition-colors focus:outline-none ${isAppsOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                                            title="SuperVan Apps"
                                            aria-label="Open App Launcher"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="1" />
                                                <circle cx="19" cy="12" r="1" />
                                                <circle cx="5" cy="12" r="1" />
                                                <circle cx="12" cy="5" r="1" />
                                                <circle cx="19" cy="5" r="1" />
                                                <circle cx="5" cy="5" r="1" />
                                                <circle cx="12" cy="19" r="1" />
                                                <circle cx="19" cy="19" r="1" />
                                                <circle cx="5" cy="19" r="1" />
                                            </svg>
                                        </button>

                                        {isAppsOpen && (
                                            <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-slate-100 py-3 z-50 ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100">
                                                <div className="px-4 pb-2 border-b border-slate-50 mb-2 flex justify-between items-center">
                                                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">SuperVan Apps</p>
                                                </div>
                                                <div className="grid grid-cols-1 gap-1 px-2">
                                                    <a href="https://digest.supervan.uk" className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0 -2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">Digest</p>
                                                            <p className="text-xs text-slate-600 leading-tight mt-0.5">AI Video Summarizer & Mind Maps</p>
                                                        </div>
                                                    </a>
                                                    <a href="/speed" className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10Z" /><path d="m16.192 15.519 -4.95 -4.95" /><path d="M4.93 19.07 7.76 16.24" /><path d="M16.24 7.76l2.83 -2.83" /></svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">Speed Test</p>
                                                            <p className="text-xs text-slate-600 leading-tight mt-0.5">Professional Network Analysis</p>
                                                        </div>
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="-mr-2 flex md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                type="button"
                                className="bg-white inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                aria-controls="mobile-menu"
                                aria-expanded="false"
                            >
                                <span className="sr-only">Open main menu</span>
                                {!isMobileMenuOpen ? (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                ) : (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu, show/hide based on menu state. */}
                {isMobileMenuOpen && (
                    <div className="md:hidden" id="mobile-menu">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            <Link
                                to="/"
                                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Home
                            </Link>
                            <a
                                href="/#features"
                                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Features
                            </a>
                            <Link
                                to="/about"
                                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                About
                            </Link>
                            <a
                                href="/blog/index.html"
                                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Engineering Blog
                            </a>
                            <Link
                                to="/contact"
                                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Contact
                            </Link>
                        </div>
                        <div className="pt-4 pb-4 border-t border-slate-200">
                            <div className="px-2 space-y-1">
                                <a href="https://digest.supervan.uk" className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50">
                                    Digest App
                                </a>
                                <Link to="/speed" className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50">
                                    Speed Test
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Content */}
            <main className="flex-grow">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 mt-auto">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-600 tracking-wider uppercase">About</h3>
                            <p className="mt-4 text-base text-slate-600">
                                SuperVan Digital is the home of cutting-edge AI tools and tech insights. We explore the intersection of artificial intelligence, engineering, and the future of work.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-600 tracking-wider uppercase">Legal</h3>
                            <ul className="mt-4 space-y-4">
                                <li>
                                    <Link to="/privacy" className="text-base text-slate-600 hover:text-slate-900 transition-colors">
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/terms" className="text-base text-slate-600 hover:text-slate-900 transition-colors">
                                        Terms of Service
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-600 tracking-wider uppercase">Connect</h3>
                            <ul className="mt-4 space-y-4">
                                <li>
                                    <Link to="/contact" className="text-base text-slate-600 hover:text-slate-900 transition-colors">
                                        Contact Us
                                    </Link>
                                </li>
                                <li>
                                    <a href="https://github.com/supervan" className="text-base text-slate-600 hover:text-slate-900 transition-colors">
                                        GitHub
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 border-t border-slate-200 pt-8 md:flex md:items-center md:justify-between">
                        <p className="text-base text-slate-600">
                            &copy; {new Date().getFullYear()} SuperVan Digital. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
