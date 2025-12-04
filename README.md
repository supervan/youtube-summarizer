# Supervan.uk Monorepo

This repository contains the source code for the Supervan.uk ecosystem.

## Structure

- **`root-supervan-uk/`**: The main website (React Router).
  - Hosted at: `https://supervan.uk`
  - Tech Stack: React, React Router, TailwindCSS, Bun.

- **`subdomain-yt-supervan-uk/`**: The YouTube Summarizer application (Python/Flask).
  - Hosted at: `https://yt.supervan.uk`
  - Tech Stack: Python, Flask, yt-dlp.

## Deployment

Both applications are deployed on Render.com as separate Web Services from this single repository.

### Root Site (`root-supervan-uk`)
- **Root Directory:** `root-supervan-uk`
- **Build Command:** `bun install && bun --bun run build`
- **Start Command:** `bun --bun run start`

### Summaries App (`subdomain-yt-supervan-uk`)
- **Root Directory:** `subdomain-yt-supervan-uk`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app`
