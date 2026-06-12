// netlify/functions/exercisedb.js
// Säker proxy för ExerciseDB API – nyckeln stannar på servern

exports.handler = async (event) => {
  // Endast GET
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const exercise = event.queryStringParameters?.exercise;
  if (!exercise) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing exercise parameter' }) };
  }

  const apiKey = process.env.EXERCISEDB_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    const url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(exercise)}?limit=1&offset=0`;
    const resp = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
      }
    });

    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: 'ExerciseDB error' }) };
    }

    const data = await resp.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
