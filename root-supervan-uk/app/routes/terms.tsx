import type { Route } from "./+types/terms";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Terms of Service - SuperVan Digital" },
        { name: "description", content: "Terms of Service for Supervan.uk" },
    ];
}

export default function Terms() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Terms of Service</h1>
            <div className="prose prose-indigo prose-lg max-w-none text-slate-500">
                <p className="mb-4">Last updated: December 04, 2025</p>

                <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
                <p className="mb-4">
                    By accessing and using Supervan.uk, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                </p>

                <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">2. Description of Service</h2>
                <p className="mb-4">
                    Supervan.uk provides users with access to a collection of resources, including various communications tools, forums, shopping services, personalized content and branded programming through its network of properties. You understand and agree that the Service may include advertisements and that these advertisements are necessary for Supervan.uk to provide the Service.
                </p>

                <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">3. User Conduct</h2>
                <p className="mb-4">
                    You agree to use the website only for lawful purposes. You agree not to take any action that might compromise the security of the site, render the site inaccessible to others, or otherwise cause damage to the site or the Content.
                </p>

                <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">4. Intellectual Property</h2>
                <p className="mb-4">
                    All content included on this site, such as text, graphics, logos, button icons, images, audio clips, digital downloads, data compilations, and software, is the property of Supervan.uk or its content suppliers and protected by international copyright laws.
                </p>

                <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">5. Disclaimer of Warranties</h2>
                <p className="mb-4">
                    The site is provided on an "as is" and "as available" basis. Supervan.uk makes no representations or warranties of any kind, express or implied, as to the operation of this site or the information, content, materials, or products included on this site.
                </p>

                <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">6. Limitation of Liability</h2>
                <p className="mb-4">
                    Supervan.uk will not be liable for any damages of any kind arising from the use of this site, including, but not limited to direct, indirect, incidental, punitive, and consequential damages.
                </p>

                <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">7. Changes to Terms</h2>
                <p className="mb-4">
                    Supervan.uk reserves the right to update or modify these Terms of Service at any time without prior notice. Your use of the Supervan.uk website following any such change constitutes your agreement to follow and be bound by the Terms of Service as changed.
                </p>

                <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">8. Contact Information</h2>
                <p className="mb-4">
                    Questions about the Terms of Service should be sent to us at <a href="mailto:contact@supervan.uk" className="text-indigo-600 hover:text-indigo-500">contact@supervan.uk</a>.
                </p>
            </div>
        </div>
    );
}
