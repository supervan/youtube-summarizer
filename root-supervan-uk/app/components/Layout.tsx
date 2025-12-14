import { Link, Outlet } from "react-router";

export default function Layout() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Navigation */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
                                <span className="font-bold text-xl text-slate-900 tracking-tight hover:text-indigo-600 transition-colors">
                                    SuperVan Digital
                                </span>
                            </Link>
                            <div className="hidden md:block">
                                <div className="ml-10 flex items-baseline space-x-6">
                                    <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                                        Home
                                    </Link>
                                    <a href="/#features" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                                        Features
                                    </a>
                                    <Link to="/about" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                                        About
                                    </Link>
                                    <a href="/blog/index.html" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                                        Engineering Blog
                                    </a>
                                    <Link to="/contact" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                                        Contact
                                    </Link>
                                    <a href="https://digest.supervan.uk" className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                                        Open Web App
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
                            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">About</h3>
                            <p className="mt-4 text-base text-slate-500">
                                SuperVan Digital is the home of cutting-edge AI tools and tech insights. We explore the intersection of artificial intelligence, engineering, and the future of work.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Legal</h3>
                            <ul className="mt-4 space-y-4">
                                <li>
                                    <Link to="/privacy" className="text-base text-slate-500 hover:text-slate-900 transition-colors">
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/terms" className="text-base text-slate-500 hover:text-slate-900 transition-colors">
                                        Terms of Service
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Connect</h3>
                            <ul className="mt-4 space-y-4">
                                <li>
                                    <Link to="/contact" className="text-base text-slate-500 hover:text-slate-900 transition-colors">
                                        Contact Us
                                    </Link>
                                </li>
                                <li>
                                    <a href="https://github.com/supervan" className="text-base text-slate-500 hover:text-slate-900 transition-colors">
                                        GitHub
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 border-t border-slate-200 pt-8 md:flex md:items-center md:justify-between">
                        <p className="text-base text-slate-400">
                            &copy; {new Date().getFullYear()} SuperVan Digital. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
