import type { Route } from "./+types/contact";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Contact Us - Supervan.uk" },
        { name: "description", content: "Get in touch with the Supervan.uk team." },
    ];
}

export default function Contact() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-white mb-8">Contact Us</h1>
            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-xl">
                <p className="text-lg text-slate-300 mb-8">
                    Have a question, suggestion, or just want to say hello? We'd love to hear from you!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Get in Touch</h2>
                        <p className="text-slate-400 mb-4">
                            For general inquiries, feedback, or partnership opportunities, please email us at:
                        </p>
                        <a href="mailto:contact@supervan.uk" className="text-purple-400 hover:text-purple-300 text-lg font-medium transition-colors">
                            contact@supervan.uk
                        </a>

                        <div className="mt-8">
                            <h3 className="text-lg font-semibold text-white mb-2">Follow Us</h3>
                            <div className="flex space-x-4">
                                <a href="#" className="text-slate-400 hover:text-white transition-colors">Twitter</a>
                                <a href="#" className="text-slate-400 hover:text-white transition-colors">LinkedIn</a>
                                <a href="#" className="text-slate-400 hover:text-white transition-colors">GitHub</a>
                            </div>
                        </div>
                    </div>

                    <div>
                        <form
                            className="space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const name = formData.get("name");
                                const email = formData.get("email");
                                const message = formData.get("message");

                                const subject = `Contact from ${name} via Supervan.uk`;
                                const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

                                window.location.href = `mailto:contact@supervan.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                            }}
                        >
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    required
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="Your Name"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    required
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="your@email.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-slate-400 mb-1">Message</label>
                                <textarea
                                    name="message"
                                    id="message"
                                    rows={4}
                                    required
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="How can we help?"
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
