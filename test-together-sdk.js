// Simple script to test the Together API using the SDK
require('dotenv').config({ path: '.env.local' });
const Together = require('together');

const apiKey = process.env.TOGETHER_API_KEY;
console.log('API Key available:', !!apiKey);

const together = new Together(apiKey);

const testTogetherAPI = async () => {
  try {
    const response = await together.completions.create({
      model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      prompt: 'Hello, can you confirm that you are working correctly?',
      max_tokens: 100,
      temperature: 0.7
    });

    console.log('API Response:', response);
    console.log('Test successful!');
  } catch (error) {
    console.error('Error testing Together API:', error);
  }
};

testTogetherAPI();
