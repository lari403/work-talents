
# Work Talents — CapacitaMais Prototype

This repository contains a small static site plus a Node.js proxy used for an AI assistant (RAG). It is designed for local development and optional deployment.

## Quick local run

1. Install dependencies:

```powershell
npm install
```

2. Create a `.env` file at the project root with these variables (do NOT commit this file):

```
GEMINI_API_KEY=your_api_key_here
GEMINI_API_URL=https://generativelanguage.googleapis.com
PORT=4000
GEMINI_EMBED_MODEL=textembedding-gecko-001
GEMINI_MODEL=text-bison-001
```

3. Start the mock JSON server (optional):

```powershell
npm run mock-server
```

4. Start the AI proxy server (serves static files too):

```powershell
npm run start:ai
```

5. Open the site in your browser (if using `live-server`):

```powershell
npm start
```

## Generating vectors (embeddings)

The project includes a script to chunk course content and call the embeddings API to create `vectors.json`:

```powershell
node .\scripts\build_vectors.js
```

Make sure `GEMINI_API_KEY` and `GEMINI_API_URL` are set in `.env` before running. The script will write `vectors.json` at repository root.

## Deploy notes

- Do NOT commit `.env` to the repository. Use the hosting provider's environment variable panel to set keys.
- If you deploy the Node proxy to a service like Render or Heroku, set `start` command to `node server.js` (or use `npm run start:ai`).
- You can host static files alone (GitHub Pages, Netlify, Vercel) and run the Node proxy separately; update `scripts/ai-widget.js` to point at the proxy URL.

## Recommended workflow

1. Keep source in Git and push to GitHub.
2. Use a staging branch or preview deploy on Render/Vercel for testing before production.
3. Generate `vectors.json` on the server or locally (but avoid committing API keys).
4. After initial deployment, update code and push — the host will redeploy automatically if connected to the repo.

## Security

- Treat `GEMINI_API_KEY` like a secret. Rotate keys if accidentally leaked.
- Use `vectors.json` safely — it may contain trimmed text from your course content; decide whether to store it in the repo or generate on the server.

## Next steps I can help with

- Create a GitHub repo and push your code (I can prepare commands and, if you allow, run them here to create commits and show the `git` commands).
- Configure a Render/Vercel site and set env vars for you.
- Finalize embeddings generation and test RAG end-to-end.

If you want me to initialize Git and make the initial commit, reply 'Yes' and I'll run the commands locally and commit the files.
