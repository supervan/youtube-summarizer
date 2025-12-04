import type { Route } from "./+types/privacy";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Privacy Policy - Supervan.uk" },
        { name: "description", content: "Privacy Policy for Supervan.uk" },
    ];
}

export default function Privacy() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
            <div className="prose prose-invert max-w-none text-slate-300">
                <p className="mb-4">Last updated: December 04, 2025</p>

                <p className="mb-4">
                    At Supervan.uk, accessible from https://supervan.uk, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Supervan.uk and how we use it.
                </p>

                <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Log Files</h2>
                <p className="mb-4">
                    Supervan.uk follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable.
                </p>

                <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Cookies and Web Beacons</h2>
                <p className="mb-4">
                    Like any other website, Supervan.uk uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
                </p>

                <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Google DoubleClick DART Cookie</h2>
                <p className="mb-4">
                    Google is one of a third-party vendor on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to www.website.com and other sites on the internet. However, visitors may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy at the following URL – <a href="https://policies.google.com/technologies/ads" className="text-purple-400 hover:text-purple-300">https://policies.google.com/technologies/ads</a>
                </p>

                <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Privacy Policies</h2>
                <p className="mb-4">
                    You may consult this list to find the Privacy Policy for each of the advertising partners of Supervan.uk.
                </p>
                <p className="mb-4">
                    Third-party ad servers or ad networks uses technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on Supervan.uk, which are sent directly to users' browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.
                </p>
                <p className="mb-4">
                    Note that Supervan.uk has no access to or control over these cookies that are used by third-party advertisers.
                </p>

                <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Consent</h2>
                <p className="mb-4">
                    By using our website, you hereby consent to our Privacy Policy and agree to its Terms and Conditions.
                </p>
            </div>
        </div>
    );
}
