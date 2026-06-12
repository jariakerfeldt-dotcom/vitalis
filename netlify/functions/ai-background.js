// netlify/functions/ai-background.js
// Background Function – ingen 10s timeout, körs upp till 15 minuter
// Används för bildanalys som tar lång tid

const Anthropic = require('@anthropic-ai/sdk');

// Enkel in-memory store för resultat (räcker för Netlify's execution model)
// I produktion: byt mot Supabase eller KV-store
const results = {};

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  // ── POLL: GET /ai-background?jobId=xxx ──
  if (event.httpMethod === 'GET') {
    const jobId = event.queryStringParameters?.jobId;
    if (!jobId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing jobId' }) };

    const result = results[jobId];
    if (!result) return { statusCode: 200, headers, body: JSON.stringify({ status: 'pending' }) };

    // Rensa minnet efter att resultatet hämtats
    delete results[jobId];
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'done', data: result }) };
  }

  // ── SUBMIT: POST med payload ──
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const jobId = 'job_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

  // Returnera jobId DIREKT – anropet slutar inte vänta
  // (Background Functions håller processen vid liv i bakgrunden)
  const responsePromise = (async () => {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: body.model || 'claude-sonnet-4-5',
        max_tokens: body.max_tokens || 1000,
        system: body.system,
        messages: body.messages,
      });
      results[jobId] = { content: response.content };
    } catch(e) {
      results[jobId] = { error: e.message };
    }
  })();

  // Vänta inte på AI – returnera jobId omedelbart
  return {
    statusCode: 202,
    headers,
    body: JSON.stringify({ jobId, status: 'processing' })
  };
};
