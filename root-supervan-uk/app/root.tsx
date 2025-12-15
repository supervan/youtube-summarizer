import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

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
];

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Supervan.uk" },
    { name: "description", content: "Welcome to Supervan.uk" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {



  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icon.jpg" />
        <Meta />
        <Links />
        {/* Google Analytics */}
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZGDET9ELC1"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-ZGDET9ELC1');
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
