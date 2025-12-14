import type { Route } from "./+types/privacy";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Privacy Policy | SuperVan Digital" },
        { name: "description", content: "Privacy Policy for Supervan.uk and Digest App" },
    ];
}

export default function Privacy() {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Privacy Policy</h1>

            <div className="prose prose-indigo prose-lg text-slate-500">
                <p>Last Updated: December 2025</p>

                <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">Introduction</h3>
                <p>At SuperVan Digital ("we", "our", or "us"), we respect your privacy and are committed to protecting it
                    through our compliance with this policy. This policy describes the types of information we may collect
                    from you or that you may provide when you visit the website supervan.uk or use our application
                    digest.supervan.uk.</p>

                {/* MANDATORY DATA PROCESSING SECTION */}
                <div className="bg-slate-100 p-6 rounded-lg border-l-4 border-indigo-500 my-8">
                    <h3 className="text-slate-900 font-bold mt-0 text-lg mb-2">Data Processing & YouTube Content Usage</h3>
                    <p className="mb-2">Our Service, supervan.uk (and its application digest.supervan.uk), operates strictly as a data
                        analysis tool. We use the YouTube Data API and public caption tracks to generate text-based
                        summaries and analysis.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>No Video Downloading:</strong> We do not download, store, cache, or redistribute video
                            or audio files from YouTube.</li>
                        <li><strong>No Copyright Circumvention:</strong> This tool does not bypass Digital Rights Management
                            (DRM) or access private/paywalled content.</li>
                        <li><strong>Data Retention:</strong> Summaries and chat logs are generated in real-time. We do not
                            permanently store the original video content on our servers.</li>
                        <li><strong>User Responsibility:</strong> Users agree to use the generated summaries for personal,
                            educational, or research purposes in accordance with the YouTube Terms of Service.</li>
                    </ul>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">Information We Collect</h3>
                <p>We collect minimal information to provide our services:</p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                    <li><strong>Usage Data:</strong> We may collect anonymous metrics about how you interact with our
                        service (e.g., number of summaries generated) to improve performance.</li>
                    <li><strong>Cookies:</strong> We use cookies to store your preferences (such as summary length or voice
                        selection) locally on your device. We also use third-party cookies for Google AdSense and Analytics.
                    </li>
                </ul>

                <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">Third-Party Services</h3>
                <p>We use third-party services which may collect information used to identify you:</p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                    <li><strong>Google AdSense:</strong> Used to display advertisements. Google may use cookies to serve ads
                        based on your prior visits to our website or other websites.</li>
                    <li><strong>Google Analytics:</strong> Used to analyze traffic and user behavior.</li>
                </ul>

                <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">Contact Us</h3>
                <p>If you have any questions about this Privacy Policy, please contact us at: <a
                    href="mailto:privacy@supervan.uk" className="text-indigo-600 hover:underline">privacy@supervan.uk</a></p>
            </div>
        </div>
    );
}
