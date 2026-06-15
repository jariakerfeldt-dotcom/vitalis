// netlify/functions/exercisedb.js
// Statisk mappning av övningar → wger.de bildlänkar (alltid rätt bild)
// wger exercise base IDs: https://wger.de/en/exercise/overview/

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const exercise = (event.queryStringParameters?.exercise || '').toLowerCase().trim();
  if (!exercise) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing exercise parameter' }) };
  }

  // ── Statisk mappning: sökterm → wger exercise base ID ──
  // wger bilder: https://wger.de/api/v2/exerciseimage/?exercise_base=ID
  const EXERCISE_MAP = {
    // Knäböj / Squat
    'squat': 8, 'squats': 8, 'knäböj': 8, 'bodyweight squat': 8,
    'front squat': 8, 'goblet squat': 8, 'wall squat': 8,
    // Push-up / Armhävning  
    'push-up': 192, 'push up': 192, 'pushup': 192,
    'armhävning': 192, 'armhävningar': 192, 'väggarmhävning': 192,
    // Plank
    'plank': 151, 'plankan': 151, 'side plank': 344, 'sidoplanka': 344,
    // Lunge / Utfall
    'lunge': 68, 'lunges': 68, 'utfall': 68, 'reverse lunge': 68,
    // Sit-up / Crunch
    'sit up': 42, 'sit-up': 42, 'crunch': 42, 'crunches': 42,
    'situps': 42, 'magövning': 42,
    // Deadlift / Marklyft
    'deadlift': 29, 'marklyft': 29, 'romanian deadlift': 29,
    // Pull-up / Chins
    'pull-up': 31, 'pull up': 31, 'pullup': 31, 'chin up': 31,
    'chins': 31, 'pullups': 31,
    // Shoulder press / Axelpress
    'shoulder press': 78, 'axelpress': 78, 'overhead press': 78,
    // Bicep curl
    'bicep curl': 13, 'biceps': 13, 'curl': 13, 'hammer curl': 13,
    // Tricep dip
    'tricep dip': 24, 'triceps': 24, 'dips': 24, 'dippar': 24,
    // Calf raise / Tåhävning
    'calf raise': 117, 'tåhävning': 117, 'tåhävningar': 117,
    // Glute bridge / Höftlyft
    'glute bridge': 291, 'höftlyft': 291, 'hip thrust': 291,
    // Russian twist
    'russian twist': 390,
    // Leg raise
    'leg raise': 226, 'leg raises': 226,
    // Back extension / Rygglyft
    'back extension': 114, 'rygglyft': 114,
    // Burpee
    'burpee': 364, 'burpees': 364,
    // Mountain climber / Bergklättrare
    'mountain climber': 363, 'bergklättrare': 363,
    // Jumping jack
    'jumping jack': 365, 'jumping jacks': 365,
    // High knees / Höga knän
    'high knees': 366, 'höga knän': 366,
    // Bench press / Bänkpress
    'bench press': 192, 'bänkpress': 192, 'bröstpress': 192,
    // Bent over row / Rodd
    'bent over row': 65, 'rodd': 65, 'roddning': 65,
    // Step up
    'step up': 68, 'steguppgång': 68,
    // Kettlebell swing
    'kettlebell': 367, 'swing': 367,
    // Cycling / Crosstrainer
    'cycling': 8, 'crosstrainer': 151, 'rowing': 65,
    'löpning': 366, 'jogging': 366,
  };

  // Hitta bästa match
  let baseId = null;
  let matchedName = null;

  // Exakt match först
  for (const [key, id] of Object.entries(EXERCISE_MAP)) {
    if (exercise === key) { baseId = id; matchedName = key; break; }
  }
  // Partiell match
  if (!baseId) {
    for (const [key, id] of Object.entries(EXERCISE_MAP)) {
      if (exercise.includes(key) || key.includes(exercise)) {
        baseId = id; matchedName = key; break;
      }
    }
  }

  if (baseId) {
    try {
      const imgResp = await fetch(
        `https://wger.de/api/v2/exerciseimage/?exercise_base=${baseId}&format=json`,
        { headers: { 'Accept': 'application/json', 'User-Agent': 'VitalisFlow/1.0' } }
      );

      if (imgResp.ok) {
        const imgData = await imgResp.json();
        const images = imgData?.results || [];

        if (images.length > 0) {
          const imgUrl = images[0].image.startsWith('http')
            ? images[0].image
            : `https://wger.de${images[0].image}`;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify([{
              name: exercise,
              gifUrl: imgUrl,
              bodyPart: '',
              equipment: '',
              target: matchedName,
              secondaryMuscles: [],
              source: 'wger'
            }])
          };
        }
      }
    } catch(e) {
      console.log('wger image fetch error:', e.message);
    }
  }

  // Ingen bild hittad – frontend visar YouTube
  return { statusCode: 200, headers, body: JSON.stringify([]) };
};
