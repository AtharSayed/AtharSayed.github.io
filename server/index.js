// Enhanced Express proxy for Google Generative Language / Gemini endpoints
// Keep your API key server-side. This proxy uses the header `X-goog-api-key` by default
// to match the curl example provided. Adapt `buildRequestBody` if your provider expects
// a different JSON schema.

require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '1mb' }));
// In development allow all origins; restrict in production
app.use(cors());

const PORT = process.env.PORT || 5173;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // your API key
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
// By default we use the X-goog-api-key header as in the user's curl example.
const USE_X_GOOG_HEADER = process.env.GEMINI_API_KEY_HEADER !== 'AUTHORIZATION';

if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. Proxy will not work until configured.');
}

// Build request body for Google Generative Language `generateContent` endpoint
function buildRequestBody({ model, prompt, context, history }) {
  // Combine context and history into a single user prompt. Keep concise to avoid large payloads.
  const historyText = (history || []).map(h => `${h.role}: ${h.content}`).join('\n');
  // Instruction to make responses concise, resume-grounded, and plain-text only
  const systemInstruction = `You are an assistant that answers questions about the user's resume and portfolio. Use ONLY the provided profile context and conversation history to answer. Provide concise, relevant answers: maximum 3 short sentences or up to 3 bullet points. If the answer is not present in the context, reply with "I don't know." Return plain text only — do not wrap the answer in JSON or other markup.`;

  const fullText = [
    `System Instruction:\n${systemInstruction}`,
    `Profile Context:\n${context || ''}`,
    `Conversation history:\n${historyText}`,
    `User Question:\n${prompt || ''}`
  ].filter(Boolean).join('\n\n');

  return {
    contents: [
      {
        parts: [
          {
            text: fullText
          }
        ]
      }
    ]
    // You can add `temperature`, `maxOutputTokens`, etc. depending on the API
  };
}

// Robust extractor to find readable text in a provider response
function extractTextFromResponse(data) {
  if (!data) return '';
  // Google GL `generateContent` often returns `candidates` with `output` or `content` fields
  try {
    if (Array.isArray(data.candidates) && data.candidates.length) {
      // candidates may contain `content` or `output` or nested parts
      const texts = data.candidates.map(cand => {
        if (typeof cand === 'string') return cand;
        if (cand.content) {
          // content may be array of parts
          if (Array.isArray(cand.content)) return cand.content.map(p => p.text || p).join(' ');
          if (typeof cand.content === 'string') return cand.content;
        }
        if (cand.output) {
          // output could contain `content` array
          if (cand.output.content && Array.isArray(cand.output.content)) return cand.output.content.map(p => p.text || p).join(' ');
          if (typeof cand.output === 'string') return cand.output;
        }
        // fallback stringify candidate
        return JSON.stringify(cand);
      });
      return texts.join('\n\n');
    }

    // Some responses place text in output[0].content[0].text or similar
    if (data.output && Array.isArray(data.output)) {
      const outTexts = data.output.map(o => {
        if (o.content && Array.isArray(o.content)) return o.content.map(c => c.text || JSON.stringify(c)).join(' ');
        return JSON.stringify(o);
      });
      return outTexts.join('\n\n');
    }

    // Try common simple fields
    if (data.reply) return data.reply;
    if (data.output?.text) return data.output.text;

    // As a last resort, try to find the first string anywhere in the JSON
    const seen = new Set();
    function findString(obj) {
      if (!obj || typeof obj === 'number' || typeof obj === 'boolean') return null;
      if (typeof obj === 'string') return obj;
      if (seen.has(obj)) return null;
      seen.add(obj);
      if (Array.isArray(obj)) {
        for (const v of obj) {
          const s = findString(v);
          if (s) return s;
        }
      } else if (typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
          const s = findString(obj[k]);
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

// Sanitize final reply: strip non-text wrappers, remove unwanted characters,
// limit to two short sentences, and avoid long greetings.
function sanitizeFinalReply(raw) {
  if (!raw) return "I don't know.";
  // Ensure string
  let s = String(raw);
  // Remove common JSON-like wrappers if present
  s = s.replace(/^[\s\n\r]*\{[\s\S]*?\:[\s\S]*?\}?[\s\n\r]*$/g, match => match);
  // Replace newlines with spaces
  s = s.replace(/[\r\n]+/g, ' ');
  // Remove characters that are not letters, numbers, basic punctuation or spaces
  s = s.replace(/[^A-Za-z0-9 \.,!\?\-']/g, '');
  // Collapse multiple spaces
  s = s.replace(/\s{2,}/g, ' ').trim();
  // Remove leading casual greetings like "hi", "hello"
  s = s.replace(/^\s*(hi|hello|hey)[\.,!\s-]*/i, '');
  // Split into sentences and keep first 2 short sentences
  const sentences = s.match(/[^.!?]+[.!?]?/g) || [s];
  const short = sentences.slice(0, 2).join(' ').trim();
  if (!short) return "I don't know.";
  return short;
}

app.post('/api/gemini', async (req, res) => {
  try {
    const { model, prompt, context, history } = req.body || {};

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server not configured with GEMINI_API_KEY' });
    }

    // Intercept trivial greetings and respond with a concise, third-person hint
    const normalizedPrompt = (prompt || '').toString().trim().toLowerCase();
    if (/^(hi|hello|hey|hey there|hello there|good morning|good afternoon|good evening)[.!]?$/i.test(normalizedPrompt)) {
      // Respond as a third-person assistant describing Athar
      return res.json({ reply: "Hello — ask me about Athar's skills, recent projects, experience, or contact information." });
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
    const raw = extractTextFromResponse(data);
    const reply = sanitizeFinalReply(raw);
    return res.json({ reply });
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}`);
});
