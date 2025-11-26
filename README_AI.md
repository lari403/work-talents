This repository now includes a minimal AI Course Assistant feature.

Setup (local)
1. Install dependencies:
   npm install

2. Set environment variables in PowerShell (temporary for current session):
   $env:GEMINI_API_KEY = "<your_key_here>"
   $env:GEMINI_API_URL = "<your_gemini_api_url_here>"

   Or set permanently with setx (restart terminal after):
   setx GEMINI_API_KEY "<your_key_here>"
   setx GEMINI_API_URL "<your_gemini_api_url_here>"

3. Start the AI proxy server:
   npm run start:ai

4. Open `index.html` in browser (or run `npm start` for live-server). The chat widget appears as a floating "Assistente" button.

Notes
- The proxy expects a POST request to the configured `GEMINI_API_URL` and that the provider accepts JSON with a `prompt` field. You may need to adapt `server.js` to match the exact Gemini/Vertex AI request/response format.
- The assistant is constrained to use the course catalog from `db.json` as context. If a question is outside the catalog, it will reply that it doesn't have the information.
- Do NOT commit your API key to version control.
