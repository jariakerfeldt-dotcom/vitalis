// netlify/functions/ai-background.js
// Fallback för långsamma AI-anrop – använder fetch istället för SDK (ingen package.json behövs)

const results = {};

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  // ── POLL: GET ?jobId=xxx ──
  if (event.httpMethod === 'GET') {
    const jobId = event.queryStringParameters?.jobId;
    if (!jobId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing jobId' }) };

    const result = results[jobId];
    if (!result) return { statusCode: 200, headers, body: JSON.stringify({ status: 'pending' }) };

    delete results[jobId];
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'done', data: result }) };
  }

  // ── SUBMIT: POST ──
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const jobId = 'job_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

  // Kör AI-anropet med fetch (ingen SDK-dependency)
  (async () => {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: body.model || 'claude-sonnet-4-5',
          max_tokens: body.max_tokens || 1000,
          system: body.system,
          messages: body.messages
        })
      });
      const data = await resp.json();
      results[jobId] = { content: data.content };
    } catch(e) {
      results[jobId] = { error: e.message };
    }
  })();

  // Returnera jobId direkt utan att vänta på AI
  return {
    statusCode: 202,
    headers,
    body: JSON.stringify({ jobId, status: 'processing' })
  };
};
