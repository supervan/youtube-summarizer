# Supervan.uk (Root Site)

This is the main website for Supervan.uk, built with React Router.

## Features
- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling

## Getting Started

### Installation

Install the dependencies:

```bash
bun install
```

### Development

Start the development server:

```bash
bun --bun run dev
```

Your application will be available at `http://localhost:5173`.

### Building for Production

Create a production build:

```bash
bun --bun run build
```

## Deployment (Render.com)

This project is configured to be deployed on Render.com as a Web Service.

**Settings:**
- **Build Command:** `bun install && bun --bun run build`
- **Start Command:** `bun --bun run start`
- **Root Directory:** `root-supervan-uk`

**Environment Variables:**
Set these in the Render Dashboard:
- `VITE_GOOGLE_ANALYTICS_ID`: Your Google Analytics Measurement ID (e.g., `G-XXXXXXXXXX`)
- `VITE_GOOGLE_ADSENSE_ID`: Your Google AdSense Publisher ID (e.g., `ca-pub-XXXXXXXXXXXXXXXX`)
