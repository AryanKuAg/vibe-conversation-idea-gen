// Test a simple chat completion with Together API
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const apiKey = process.env.TOGETHER_API_KEY;
console.log('API Key available:', !!apiKey);

const data = JSON.stringify({
  model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say hello and confirm you are working.' }
  ],
  max_tokens: 50,
  temperature: 0.7
});

const options = {
  hostname: 'api.together.xyz',
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Length': data.length
  }
};

console.log('Sending request to Together API...');

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
    console.log('Received chunk of data');
  });
  
  res.on('end', () => {
    console.log('Response completed');
    if (res.statusCode === 200) {
      try {
        const parsedData = JSON.parse(responseData);
        console.log('API Response:');
        console.log('Message:', parsedData.choices[0].message.content);
        console.log('Together API is working correctly!');
      } catch (e) {
        console.error('Error parsing response:', e);
        console.log('Raw response:', responseData);
      }
    } else {
      console.error('API request failed with status:', res.statusCode);
      console.error('Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error making request:', error);
});

req.write(data);
req.end();

console.log('Request sent, waiting for response...');
