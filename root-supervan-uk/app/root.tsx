import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import appStyles from "./app.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  // Main CSS loaded asynchronously (non-blocking) with fallback
  { rel: "preload", href: appStyles, as: "style" },
  { rel: "stylesheet", href: appStyles, media: "print", onLoad: "this.media='all'" },
];

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Supervan.uk" },
    { name: "description", content: "Welcome to Supervan.uk" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {

  // Critical CSS for Navbar & Hero (approximate) to prevent FOUC/Shift
  const criticalCss = `
    body { font-family: 'Inter', sans-serif; margin: 0; background-color: #f8fafc; color: #0f172a; }
    nav { background-color: white; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 50; height: 4rem; }
    .max-w-7xl { max-width: 80rem; margin-left: auto; margin-right: auto; padding-left: 1rem; padding-right: 1rem; }
    .flex { display: flex; } .items-center { align-items: center; } .justify-between { justify-content: space-between; }
    .h-16 { height: 4rem; } 
    .font-bold { font-weight: 700; } .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
    .text-slate-900 { color: #0f172a; }
    .hidden { display: none; }
    @media (min-width: 768px) { .md\\:block { display: block; } .md\\:flex { display: flex; } }
    main { margin-top: 2.5rem; }
    h1 { font-size: 2.25rem; line-height: 2.5rem; font-weight: 800; letter-spacing: -0.025em; color: #0f172a; }
    @media (min-width: 640px) { h1 { font-size: 3rem; line-height: 1; } }
    .text-indigo-600 { color: #4f46e5; }
    .mt-5 { margin-top: 1.25rem; }
    .block { display: block; }
  `;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icon.jpg" />
        <Meta />
        <Links />
        <noscript><link rel="stylesheet" href={appStyles} /></noscript>
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />

        {/* Google Analytics - Lazy Loaded */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var gtmLoaded = false;
                function loadGTM() {
                  if (gtmLoaded) return;
                  gtmLoaded = true;
                  var script = document.createElement('script');
                  script.src = "https://www.googletagmanager.com/gtag/js?id=G-ZGDET9ELC1";
                  script.async = true;
                  document.head.appendChild(script);

                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'G-ZGDET9ELC1');
                }
                // Load on user interaction
                ['click', 'scroll', 'mousemove', 'touchstart'].forEach(event => 
                  window.addEventListener(event, loadGTM, { once: true, passive: true })
                );
                // Fallback: load after 4 seconds
                setTimeout(loadGTM, 4000);
              })();
            `,
          }}
        />
        {/* Google AdSense - Lazy Loaded */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var adSenseLoaded = false;
                function loadAdSense() {
                  if (adSenseLoaded) return;
                  adSenseLoaded = true;
                  var script = document.createElement('script');
                  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3475917359369599";
                  script.async = true;
                  script.crossOrigin = "anonymous";
                  document.head.appendChild(script);
                }
                // Load on user interaction
                ['click', 'scroll', 'mousemove', 'touchstart'].forEach(event => 
                  window.addEventListener(event, loadAdSense, { once: true, passive: true })
                );
                // Fallback: load after 5 seconds if no interaction
                setTimeout(loadAdSense, 5000);
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
