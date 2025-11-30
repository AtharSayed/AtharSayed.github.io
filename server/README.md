# Gemini Proxy for Portfolio Chatbot

This simple Express proxy forwards chat requests from the portfolio front-end to a Gemini 2.5 (or other) model endpoint. Keep your API key on the server; do not expose it in client-side code.

## Setup (PowerShell)

Open PowerShell in `e:\Portfolio\server` and run:

```powershell
cd e:\Portfolio\server
npm install
$env:GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
$env:GEMINI_API_URL="https://your-gemini-endpoint"
npm start
```

- `GEMINI_API_URL` should be the full HTTP endpoint you will call (for Google Vertex AI, that will be the model generate endpoint for `gemini-2.5` or similar).
- The server listens on port `5173` by default (change via `PORT` env var).

## Notes
- The `index.js` uses a generic request/response shape. You must adapt `downstreamBody` to match your provider's required JSON schema (especially for Vertex AI / Google Generative Language API).
- For streaming support, update the proxy to stream the model response through (SSE or chunked transfer).
- In production, lock down CORS and add authentication/throttling to protect your API key and budget.

## Quick test
- Run the server as above.
- Serve or open the portfolio site from an HTTP server (not `file://`) so that `fetch('/api/gemini')` works against the same origin or adjust client to point to your proxy origin.

## Deploying to Vercel (recommended for your Vercel-hosted portfolio)

Instead of running a separate Express server, you can deploy the proxy as a serverless function on Vercel. I added `api/gemini.js` to this repo which is compatible with Vercel serverless functions.

Steps:

1. Push this repository to GitHub (if not already).
2. In Vercel, create a new project and import this GitHub repository.
3. In your Vercel project settings -> Environment Variables, add **GEMINI_API_KEY** (your API key) and optionally **GEMINI_API_URL** (if not using default). DO NOT commit your API key to the repo.
	- Example variable: `GEMINI_API_KEY` = `AIzaSyAEUaAYB0XSLI7-L3GscnTbVOpAcIHiWOo` (paste your key in Vercel UI only)
4. Deploy the project. The serverless endpoint will be available at `https://<your-vercel-domain>/api/gemini`.

Client-side notes:
- The front-end already posts to `/api/gemini`. When deployed on Vercel, the browser will call the serverless endpoint on the same origin and everything should work.
- If you test locally, either run the local `server/index.js` or use `vercel dev` (install Vercel CLI) to emulate serverless functions locally.

Security reminder (important):
- Never commit secrets into source control. Use Vercel environment variables or a secret manager.
- Consider adding additional protections on your serverless endpoint (IP allowlist, require a short-lived token, rate limits) if you expect public traffic.

If you'd like, I can:
- Add `vercel.json` with custom builds / runtime config.
- Add a small health-check route or basic token-based protection (you'll still place the secret in Vercel envs, not in the repo).
