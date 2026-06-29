const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

console.log('Loaded env keys:');
console.log('GEOAPIFY_API_KEY:', env.GEOAPIFY_API_KEY ? 'Present' : 'Missing');
console.log('GEMINI_API_KEY:', env.GEMINI_API_KEY ? 'Present' : 'Missing');
console.log('AVIATIONSTACK_API_KEY:', env.AVIATIONSTACK_API_KEY ? 'Present' : 'Missing');
console.log('SERPAPI_KEY_FLIGHTS:', env.SERPAPI_KEY_FLIGHTS ? 'Present' : 'Missing');
console.log('SERPAPI_KEY_HOTELS:', env.SERPAPI_KEY_HOTELS ? 'Present' : 'Missing');

async function testGeoapify() {
  const apiKey = env.GEOAPIFY_API_KEY;
  if (!apiKey) throw new Error('GEOAPIFY_API_KEY is not defined');
  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=Paris&type=city&format=json&apiKey=${apiKey}`;
  console.log('\n--- Testing Geoapify API ---');
  const res = await fetch(url);
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    console.log('Geoapify Success! Found city:', data.results[0].city, 'Country:', data.results[0].country);
  } else {
    throw new Error('Geoapify returned no results: ' + JSON.stringify(data));
  }
}

async function testGemini() {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  console.log('\n--- Testing Gemini 2.5 Flash API ---');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say hello' }] }]
    })
  });
  const data = await res.json();
  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    console.log('Gemini Success! Response:', data.candidates[0].content.parts[0].text.trim());
  } else {
    throw new Error('Gemini failed: ' + JSON.stringify(data));
  }
}

async function testAviationstack() {
  const apiKey = env.AVIATIONSTACK_API_KEY;
  if (!apiKey) throw new Error('AVIATIONSTACK_API_KEY is not defined');
  const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&dep_iata=DEL&arr_iata=BOM&limit=1`;
  console.log('\n--- Testing Aviationstack API ---');
  const res = await fetch(url);
  const data = await res.json();
  if (data.data) {
    console.log('Aviationstack Success! Found flights count:', data.data.length);
    if (data.data.length > 0) {
      console.log('Flight Number:', data.data[0].flight?.number);
    }
  } else {
    throw new Error('Aviationstack failed: ' + JSON.stringify(data));
  }
}

async function testGoogleHotels() {
  const apiKey = env.SERPAPI_KEY_HOTELS || env.SERPAPI_KEY;
  if (!apiKey) throw new Error('SERPAPI_KEY_HOTELS is not defined');
  
  const today = new Date();
  const arrival = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const departure = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const url = `https://serpapi.com/search.json?engine=google_hotels&q=Paris+hotels&check_in_date=${arrival}&check_out_date=${departure}&adults=1&currency=USD&api_key=${apiKey}`;
  console.log('\n--- Testing SerpAPI Google Hotels ---');
  
  const res = await fetch(url);
  const data = await res.json();
  if (data.properties && data.properties.length > 0) {
    console.log('Google Hotels Success! Found hotels count:', data.properties.length);
    console.log('First Hotel Name:', data.properties[0].name);
    console.log('First Hotel Price:', data.properties[0].rate_per_night?.extracted_lowest);
  } else {
    throw new Error('Google Hotels failed: ' + JSON.stringify(data));
  }
}
async function main() {
  const tests = [
    { name: 'Geoapify', fn: testGeoapify },
    { name: 'Gemini', fn: testGemini },
    { name: 'Aviationstack', fn: testAviationstack },
    { name: 'Google Hotels', fn: testGoogleHotels }
  ];

  let anyFailed = false;
  for (const test of tests) {
    try {
      await test.fn();
    } catch (err) {
      console.error(`\n❌ Test ${test.name} failed:`, err.message || err);
      if (test.name === 'Google Hotels') {
        anyFailed = true;
      }
    }
  }

  console.log('\n=========================================');
  if (anyFailed) {
    console.log('SOME CRITICAL API TESTS FAILED!');
    process.exit(1);
  } else {
    console.log('ALL ELIGIBLE API CALLS ARE WORKING SUCCESSFULLY!');
  }
  console.log('=========================================');
}

main();
