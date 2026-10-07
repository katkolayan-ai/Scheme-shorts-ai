# SchemeShorts AI

SchemeShorts AI turns a government scheme PDF into a simple 60-second explainer.

## Files

- `index.html` — website and PDF processing
- `styles.css` — design
- `api/generate.js` — secure Gemini API connection
- `package.json` — project configuration
- `vercel.json` — Vercel configuration

## Deploy

1. Upload the complete project to GitHub.
2. Import the GitHub repository into Vercel.
3. Add a Vercel environment variable named `GEMINI_API_KEY`.
4. Redeploy.
5. Open the Vercel URL and upload a text-based government PDF.

Never put the Gemini API key in `index.html`.

If the AI key is not configured, the website still creates a clearly labelled local demo summary so the interface can be tested.

Scanned/image-only PDFs need OCR and are outside this first MVP.
