// Vercel Serverless Function for forwarding portfolio chatbot requests to Google Generative Language (Gemini)
// Set environment variables in Vercel dashboard: GEMINI_API_KEY and (optionally) GEMINI_API_URL

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_API_URL =
    process.env.GEMINI_API_URL ||
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  const USE_X_GOOG_HEADER = process.env.GEMINI_API_KEY_HEADER !== 'AUTHORIZATION';

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server not configured with GEMINI_API_KEY' });
  }

  try {
    const { model, prompt, context, history } = req.body || {};

    // Intercept trivial greetings and respond with a concise, third-person hint
    const normalizedPrompt = (prompt || '').toString().trim().toLowerCase();
    if (/^(hi|hello|hey|hey there|hello there|good morning|good afternoon|good evening)[.!]?$/i.test(normalizedPrompt)) {
      return res.status(200).json({
        reply: "Hello — ask me about Athar's skills, recent projects, experience, or contact information."
      });
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

    // (optional) log a preview for debugging in Vercel logs
    // console.log('Gemini raw keys:', Object.keys(data || {}));
    // console.log('Gemini raw preview:', JSON.stringify(data).slice(0, 500));

    const raw = extractTextFromResponse(data);
    const reply = sanitizeFinalReply(raw);
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Vercel function error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/* --------------------------
   Build request body
   -------------------------- */
function buildRequestBody({ model, prompt, context, history }) {
  const historyText = (history || []).map(h => `${h.role}: ${h.content}`).join('\n');

  const systemInstruction = `You are an assistant that answers questions about Athar Sayed's resume and portfolio.
Use ONLY the provided profile context and conversation history to answer.
Provide concise, relevant answers: maximum 3 short sentences or up to 3 bullet points.
If the answer is not present in the context, reply with "I don't know."
Return plain text only — do not wrap the answer in JSON or other markup.`;

  const fullText = [
    `System Instruction:\n${systemInstruction}`,
    `Profile Context:\n${context || ''}`,
    `Conversation history:\n${historyText}`,
    `User Question:\n${prompt || ''}`
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    contents: [
      {
        parts: [{ text: fullText }]
      }
    ]
  };
}

/* --------------------------
   Robust extractor
   -------------------------- */
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
    // 1) Gemini GL-style: candidates -> content | output
    if (Array.isArray(data.candidates) && data.candidates.length) {
      const texts = data.candidates
        .map(cand => {
          if (typeof cand === 'string') return cand;

          // cand.content.{parts[]}
          if (cand.content) {
            if (Array.isArray(cand.content)) {
              return cand.content
                .map(p => (typeof p === 'string' ? p : p?.text || p?.content || ''))
                .filter(Boolean)
                .join('\n');
            } else if (typeof cand.content === 'string') {
              return cand.content;
            } else if (cand.content.parts && Array.isArray(cand.content.parts)) {
              return cand.content.parts.map(p => p?.text || '').filter(Boolean).join('\n');
            }
          }

          // cand.output.content[]
          if (cand.output) {
            if (cand.output.content && Array.isArray(cand.output.content)) {
              return cand.output.content.map(p => p?.text || '').filter(Boolean).join('\n');
            }
            if (typeof cand.output === 'string') return cand.output;
          }

          // Fallback: all leaf strings in candidate
          const leafs = collectStrings(cand);
          return leafs.join('\n');
        })
        .filter(Boolean);

      if (texts.length) return texts.join('\n\n');
    }

    // 2) Old-style output array: output[].content[].text
    if (Array.isArray(data.output) && data.output.length) {
      const out = data.output
        .map(o => {
          if (o.content && Array.isArray(o.content)) {
            return o.content
              .map(c => c?.text ?? (typeof c === 'string' ? c : ''))
              .filter(Boolean)
              .join('\n');
          }
          return '';
        })
        .filter(Boolean);
      if (out.length) return out.join('\n\n');
    }

    // 3) Gemini-like 'content.parts[*].text'
    if (data.content && Array.isArray(data.content.parts)) {
      const txt = data.content.parts.map(p => p?.text ?? '').filter(Boolean).join('\n');
      if (txt) return txt;
    }

    // 4) OpenAI-like choices -> message -> content -> parts, or choices[].text
    if (Array.isArray(data.choices) && data.choices.length) {
      for (const c of data.choices) {
        const parts = c?.message?.content?.parts || c?.message?.content;
        if (Array.isArray(parts) && parts.length) {
          const txt = parts
            .map(p => (typeof p === 'string' ? p : p?.text || ''))
            .filter(Boolean)
            .join('\n\n');
          if (txt) return txt;
        }
        if (typeof c.text === 'string' && c.text.trim()) return c.text.trim();
        if (typeof c?.message?.content === 'string' && c.message.content.trim())
          return c.message.content.trim();
      }
    }

    // 5) Simple fields
    if (typeof data.reply === 'string' && data.reply.trim()) return data.reply.trim();
    if (typeof data.text === 'string' && data.text.trim()) return data.text.trim();
    if (typeof data.output?.text === 'string' && data.output.text.trim()) return data.output.text.trim();

    // 6) FINAL fallback: collect leaf strings (not JSON.stringify keys)
    const leaves = collectStrings(data);
    if (leaves.length) {
      return leaves.join('\n').trim();
    }

    // Really last resort
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch (e) {
    return typeof data === 'string' ? data : JSON.stringify(data);
  }
}

/* --------------------------
   Safe sanitizer (keeps punctuation)
   -------------------------- */
function sanitizeFinalReply(rawText) {
  if (!rawText) return "I don't know.";

  let s = String(rawText);

  // Normalize line endings
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Collapse multiple blank lines
  s = s.replace(/\n{2,}/g, '\n\n');

  // Remove non-printable / control chars but KEEP punctuation and spaces
  s = s.replace(/[^\x20-\x7E\n]/g, ' ');

  // Collapse extra spaces but keep newlines
  s = s
    .split('\n')
    .map(line => line.replace(/[ \t]{2,}/g, ' ').trim())
    .join('\n')
    .trim();

  // Remove leading casual greeting if present
  s = s.replace(/^\s*(hi|hello|hey|greetings)[\.,!\s-]+/i, '');

  // Keep it concise: first 3 sentences or 450 chars
  const sentences = s.match(/[^.!?]+[.!?]?/g) || [s];
  const selected = sentences.slice(0, 3).join(' ').trim();
  const result =
    selected.length > 0
      ? selected
      : s.length > 450
      ? s.slice(0, 450).trim() + '...'
      : s;

  return result || "I don't know.";
}
