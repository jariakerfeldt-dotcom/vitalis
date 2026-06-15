// netlify/functions/exercisedb.js
// Giphy API – söker tränings-GIFs för varje övning

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const exercise = (event.queryStringParameters?.exercise || '').trim();
  if (!exercise) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing exercise parameter' }) };
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  // Bygg sökterm: lägg till "exercise" för bättre träffar
  const searchTerm = exercise + ' exercise workout';

  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(searchTerm)}&limit=1&rating=g&lang=en`;
    const resp = await fetch(url);

    if (!resp.ok) {
      return { statusCode: resp.status, headers, body: JSON.stringify({ error: 'Giphy error' }) };
    }

    const data = await resp.json();
    const gif = data?.data?.[0];

    if (gif) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([{
          name: exercise,
          gifUrl: gif.images?.original?.url || gif.images?.fixed_height?.url,
          bodyPart: '',
          equipment: '',
          target: exercise,
          secondaryMuscles: [],
          source: 'giphy'
        }])
      };
    }

    // Ingen GIF hittad
    return { statusCode: 200, headers, body: JSON.stringify([]) };

  } catch(e) {
    console.log('Giphy error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
