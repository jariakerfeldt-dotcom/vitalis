// netlify/functions/exercisedb.js
// Primär: wger.de (gratis, öppen källkod, riktiga övningsbilder)
// Returnerar övningsbild + metadata

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const exercise = event.queryStringParameters?.exercise;
  if (!exercise) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing exercise parameter' }) };
  }

  // ── 1. wger.de sökning ──
  try {
    // Sök övning
    const searchResp = await fetch(
      `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(exercise)}&language=english&format=json`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'VitalisFlow/1.0' } }
    );

    if (searchResp.ok) {
      const searchData = await searchResp.json();
      const hit = searchData?.suggestions?.[0];

      if (hit?.data?.id) {
        const exerciseBaseId = hit.data.base_id || hit.data.id;

        // Hämta bilder
        const imgResp = await fetch(
          `https://wger.de/api/v2/exerciseimage/?exercise_base=${exerciseBaseId}&format=json`,
          { headers: { 'Accept': 'application/json', 'User-Agent': 'VitalisFlow/1.0' } }
        );

        if (imgResp.ok) {
          const imgData = await imgResp.json();
          const images = imgData?.results || [];

          if (images.length > 0) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify([{
                name: hit.value || exercise,
                gifUrl: images[0].image.startsWith('http') ? images[0].image : `https://wger.de${images[0].image}`,
                bodyPart: hit.data?.category || '',
                equipment: '',
                target: hit.data?.muscles?.[0] || '',
                secondaryMuscles: [],
                source: 'wger'
              }])
            };
          }
        }
      }
    }
  } catch(e) {
    console.log('wger error:', e.message);
  }

  // ── 2. wger exerciseinfo (bredare sökning) ──
  try {
    const infoResp = await fetch(
      `https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=20`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'VitalisFlow/1.0' } }
    );

    if (infoResp.ok) {
      const infoData = await infoResp.json();
      const ex = (infoData?.results || []).find(e =>
        e.translations?.some(t =>
          t.name?.toLowerCase().includes(exercise.toLowerCase())
        )
      );

      if (ex?.images?.length > 0) {
        const name = ex.translations?.find(t => t.language === 2)?.name || exercise;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([{
            name,
            gifUrl: ex.images[0].image.startsWith('http') ? ex.images[0].image : `https://wger.de${ex.images[0].image}`,
            bodyPart: ex.category?.name || '',
            target: ex.muscles?.[0]?.name_en || '',
            secondaryMuscles: ex.muscles_secondary?.map(m => m.name_en) || [],
            source: 'wger'
          }])
        };
      }
    }
  } catch(e) {
    console.log('wger info error:', e.message);
  }

  // ── 3. Ingen bild hittad ──
  return { statusCode: 200, headers, body: JSON.stringify([]) };
};
