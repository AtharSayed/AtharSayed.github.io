// Vercel Serverless Function for forwarding portfolio chatbot requests to Google Generative Language (Gemini)
// DO NOT commit your API key. Set environment variables in Vercel dashboard: GEMINI_API_KEY and (optionally) GEMINI_API_URL

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  const USE_X_GOOG_HEADER = process.env.GEMINI_API_KEY_HEADER !== 'AUTHORIZATION';

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server not configured with GEMINI_API_KEY' });
  }

  try {
    const { model, prompt, context, history } = req.body || {};

    function buildRequestBody({ model, prompt, context, history }) {
      const historyText = (history || []).map(h => `${h.role}: ${h.content}`).join('\n');
      const fullText = [context || '', 'User:', prompt || '', 'Conversation history:', historyText].filter(Boolean).join('\n\n');
      return {
        contents: [
          {
            parts: [ { text: fullText } ]
          }
        ]
      };
    }

    function extractTextFromResponse(data) {
      if (!data) return '';
      try {
        if (Array.isArray(data.candidates) && data.candidates.length) {
          const texts = data.candidates.map(cand => {
            if (typeof cand === 'string') return cand;
            if (cand.content) {
              if (Array.isArray(cand.content)) return cand.content.map(p => p.text || p).join(' ');
              if (typeof cand.content === 'string') return cand.content;
            }
            if (cand.output) {
              if (cand.output.content && Array.isArray(cand.output.content)) return cand.output.content.map(p => p.text || p).join(' ');
              if (typeof cand.output === 'string') return cand.output;
            }
            return JSON.stringify(cand);
          });
          return texts.join('\n\n');
        }

        if (data.output && Array.isArray(data.output)) {
          const outTexts = data.output.map(o => {
            if (o.content && Array.isArray(o.content)) return o.content.map(c => c.text || JSON.stringify(c)).join(' ');
            return JSON.stringify(o);
          });
          return outTexts.join('\n\n');
        }

        if (data.reply) return data.reply;
        if (data.output?.text) return data.output.text;

        // fallback: find first string
        function findString(obj, seen = new Set()) {
          if (!obj || typeof obj === 'number' || typeof obj === 'boolean') return null;
          if (typeof obj === 'string') return obj;
          if (seen.has(obj)) return null;
          seen.add(obj);
          if (Array.isArray(obj)) {
            for (const v of obj) {
              const s = findString(v, seen);
              if (s) return s;
            }
          } else if (typeof obj === 'object') {
            for (const k of Object.keys(obj)) {
              const s = findString(obj[k], seen);
              if (s) return s;
            }
          }
          return null;
        }
        const found = findString(data);
        return found || JSON.stringify(data);
      } catch (e) {
        return JSON.stringify(data);
      }
    }

    const downstreamBody = buildRequestBody({ model, prompt, context, history });

    const headers = { 'Content-Type': 'application/json' };
    if (USE_X_GOOG_HEADER) headers['X-goog-api-key'] = GEMINI_API_KEY;
    else headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;

    const r = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(downstreamBody)
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    const data = await r.json();
    const reply = extractTextFromResponse(data);
    return res.json({ reply });
  } catch (err) {
    console.error('Vercel function error:', err);
    return res.status(500).json({ error: err.message });
  }
}
