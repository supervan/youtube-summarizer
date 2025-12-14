# SuperVan Speed Test

A professional-grade internet speed test application built with React and Vite.
Hosted at: [https://supervan.uk/speed](https://supervan.uk/speed)

## Features

-   **Download Speed:** Simulates file downloads to measure bandwidth.
-   **Upload Speed:** Simulates file uploads.
-   **Ping/Latency:** Measures connection response time.
-   **Local History:** Automatically saves test results to the browser's LocalStorage.
-   **Visual Gauge:** Smooth, animated gauge for real-time feedback.
-   **AdSense Compliance:** Includes footer with Privacy/Terms links.

## Tech Stack

-   **React 19**: Core framework.
-   **Vite**: Build tool and dev server.
-   **TailwindCSS 4**: Styling.
-   **Bun**: Package manager.
-   **Recharts**: Charting library (ready for future graph implementations).
-   **Lucide React**: Icon library.

## Development

1.  **Install dependencies:**
    ```bash
    bun install
    ```

2.  **Run Dev Server:**
    ```bash
    bun run dev
    ```

3.  **Build for Production:**
    ```bash
    bun run build
    ```
    Output will be in the `dist` directory.

## Deployment

Deployed as a **Static Site** on Render.com.
-   **Build Command:** `bun run build`
-   **Publish Directory:** `dist`
