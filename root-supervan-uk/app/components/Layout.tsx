import { Link, Outlet } from "react-router";

export default function Layout() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200 font-sans">
            {/* Navigation */}
            <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-purple-500/30 transition-all">
                                    S
                                </div>
                                <span className="font-bold text-xl text-white tracking-tight group-hover:text-purple-400 transition-colors">
                                    Supervan.uk
                                </span>
                            </Link>
                            <div className="hidden md:block">
                                <div className="ml-10 flex items-baseline space-x-4">
                                    <Link to="/" className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                        Home
                                    </Link>
                                    <Link to="/about" className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                        About
                                    </Link>
                                    <Link to="/contact" className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                        Contact
                                    </Link>
                                    <a href="https://yt.supervan.uk" className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                        App
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
            <footer className="bg-slate-900 border-t border-slate-800 mt-auto">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">About</h3>
                            <p className="mt-4 text-base text-slate-500">
                                Supervan.uk is the home of cutting-edge AI tools and tech insights. We explore the intersection of artificial intelligence, engineering, and the future of work.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Legal</h3>
                            <ul className="mt-4 space-y-4">
                                <li>
                                    <Link to="/privacy" className="text-base text-slate-500 hover:text-slate-300 transition-colors">
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/terms" className="text-base text-slate-500 hover:text-slate-300 transition-colors">
                                        Terms of Service
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Connect</h3>
                            <ul className="mt-4 space-y-4">
                                <li>
                                    <Link to="/contact" className="text-base text-slate-500 hover:text-slate-300 transition-colors">
                                        Contact Us
                                    </Link>
                                </li>
                                <li>
                                    <a href="https://github.com/supervan" className="text-base text-slate-500 hover:text-slate-300 transition-colors">
                                        GitHub
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 border-t border-slate-800 pt-8 md:flex md:items-center md:justify-between">
                        <p className="text-base text-slate-500">
                            &copy; {new Date().getFullYear()} Supervan.uk. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
