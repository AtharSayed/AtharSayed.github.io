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

  // Helper: collect all leaf strings in an object/array (avoid keys)
  function collectStrings(obj, out = []) {
    if (obj === null || obj === undefined) return out;
    if (typeof obj === 'string') {
      const s = obj.trim();
      if (s) out.push(s);
      return out;
    }
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      out.push(String(obj));
      return out;
    }
    if (Array.isArray(obj)) {
      for (const v of obj) collectStrings(v, out);
      return out;
    }
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) collectStrings(obj[k], out);
      return out;
    }
    return out;
  }

  try {
    // 1) Google GL / Gemini-style: candidates -> content | output
    if (Array.isArray(data.candidates) && data.candidates.length) {
      const texts = data.candidates.map(cand => {
        // cand.content may be array of parts { text }
        if (cand.content) {
          if (Array.isArray(cand.content)) {
            return cand.content
              .map(p => p?.text ?? (typeof p === 'string' ? p : ''))
              .filter(Boolean)
              .join('\n');
          } else if (typeof cand.content === 'string') {
            return cand.content;
          } else if (cand.content.parts && Array.isArray(cand.content.parts)) {
            return cand.content.parts
              .map(p => p?.text || '')
              .filter(Boolean)
              .join('\n');
          }
        }
        if (cand.output) {
          if (cand.output.content && Array.isArray(cand.output.content)) {
            return cand.output.content
              .map(p => p?.text || '')
              .filter(Boolean)
              .join('\n');
          }
          if (typeof cand.output === 'string') return cand.output;
        }
        if (typeof cand === 'string') return cand;

        const leafs = collectStrings(cand);
        return leafs.join('\n');
      }).filter(Boolean);

      if (texts.length) return texts.join('\n\n');
    }

    // 2) Old-style output array: output[].content[].text
    if (Array.isArray(data.output) && data.output.length) {
      const out = data.output.map(o => {
        if (o.content && Array.isArray(o.content)) {
          return o.content
            .map(c => c?.text ?? (typeof c === 'string' ? c : ''))
            .filter(Boolean)
            .join('\n');
        }
        return '';
      }).filter(Boolean);
      if (out.length) return out.join('\n\n');
    }

    // 3) Gemini-like: data.content.parts[*].text
    if (data.content && Array.isArray(data.content.parts)) {
      const txt = data.content.parts
        .map(p => p?.text ?? '')
        .filter(Boolean)
        .join('\n');
      if (txt) return txt;
    }

    // 4) OpenAI-like: choices[].message.content.parts or choices[].text
    if (Array.isArray(data.choices) && data.choices.length) {
      for (const c of data.choices) {
        const parts = c?.message?.content?.parts || c?.message?.content;
        if (Array.isArray(parts) && parts.length) {
          const txt = parts
            .map(p => (typeof p === 'string' ? p : (p?.text || '')))
            .filter(Boolean)
            .join('\n\n');
          if (txt) return txt;
        }
        if (typeof c.text === 'string' && c.text.trim()) return c.text.trim();
        if (typeof c?.message?.content === 'string' && c.message.content.trim()) {
          return c.message.content.trim();
        }
      }
    }

    // 5) Simple fields
    if (typeof data.reply === 'string' && data.reply.trim()) return data.reply.trim();
    if (typeof data.text === 'string' && data.text.trim()) return data.text.trim();
    if (typeof data.output?.text === 'string' && data.output.text.trim()) return data.output.text.trim();

    // 6) FINAL fallback: leaf strings (not JSON.stringify)
    const leaves = collectStrings(data);
    if (leaves.length) {
      return leaves.join('\n').trim();
    }

    // Last resort
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch (e) {
    return typeof data === 'string' ? data : JSON.stringify(data);
  }
}


// Sanitize final reply but keep punctuation & line breaks
function sanitizeFinalReply(rawText) {
  if (!rawText) return "I don't know.";

  let s = String(rawText);

  // 1) Normalize line endings
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // 2) Collapse multiple blank lines
  s = s.replace(/\n{2,}/g, '\n\n');

  // 3) Keep punctuation & newlines, drop control chars
  s = s.replace(/[^\x20-\x7E\n]/g, ' ');

  // 4) Collapse extra whitespace but keep sentence structure
  s = s.replace(/[ \t]{2,}/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // 5) Remove leading greetings
  s = s.replace(/^\s*(hi|hello|hey|greetings)[\.,!\s-]+/i, '');

  // 6) Limit to first 3 sentences or ~450 chars
  const sentences = s.match(/[^.!?]+[.!?]?/g) || [s];
  const selected = sentences.slice(0, 3).join(' ').trim();
  const result = selected.length
    ? selected
    : (s.length > 450 ? s.slice(0, 450).trim() + '...' : s);

  return result || "I don't know.";
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
