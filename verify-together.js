// Direct verification of Together API connectivity
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const apiKey = process.env.TOGETHER_API_KEY;
console.log('API Key available:', !!apiKey);

const options = {
  hostname: 'api.together.xyz',
  path: '/v1/models',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
};

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('API connection successful!');
      console.log('Available models:');
      try {
        const models = JSON.parse(data);
        console.log(`Found ${models.data.length} models`);
        // List a few models as example
        models.data.slice(0, 3).forEach(model => {
          console.log(`- ${model.id}`);
        });
        console.log('Together API is properly configured and working!');
      } catch (e) {
        console.error('Error parsing response:', e);
        console.log('Raw response:', data);
      }
    } else {
      console.error('API request failed with status:', res.statusCode);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error making request:', error);
});

req.end();
