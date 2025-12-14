# Supervan.uk Monorepo

This repository contains the source code for the Supervan.uk ecosystem.

## Structure

- **`root-supervan-uk/`**: The main website (React Router v7).
  - Hosted at: `https://supervan.uk`
  - Tech Stack: React, React Router, TailwindCSS, Bun.
  - **Note**: Now contains the Marketing Site, Blog, and Privacy Policy.

- **`subdomain-digest-supervan-uk/`**: The YouTube Summarizer application (Python/Flask).
  - Hosted at: `https://digest.supervan.uk`
  - Tech Stack: Python, Flask, yt-dlp.

- **`subdomain-speed-supervan-uk/`**: The Internet Speed Test application (React/Vite).
  - Hosted at: `https://speed.supervan.uk`
  - Tech Stack: React, Vite, TailwindCSS.

## Deployment

Both applications are deployed on Render.com from this single repository.

### Root Site (`root-supervan-uk`)
- **Type:** Web Service
- **Root Directory:** `root-supervan-uk`
- **Build Command:** `bun install && bun --bun run build`
- **Start Command:** `bun --bun run start`

### Summaries App (`subdomain-digest-supervan-uk`)
- **Type:** Web Service
- **Root Directory:** `subdomain-digest-supervan-uk`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app`

### Speed Test App (`subdomain-speed-supervan-uk`)
- **Type:** Static Site
- **Root Directory:** `subdomain-speed-supervan-uk`
- **Build Command:** `bun run build`
- **Publish Directory:** `dist`
