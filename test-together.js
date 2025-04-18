// Simple script to test the Together API
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.TOGETHER_API_KEY;
console.log('API Key available:', !!apiKey);

const testTogetherAPI = async () => {
  try {
    const response = await fetch('https://api.together.xyz/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        prompt: 'Hello, can you confirm that you are working correctly?',
        max_tokens: 100,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    console.log('Test successful!');
  } catch (error) {
    console.error('Error testing Together API:', error);
  }
};

testTogetherAPI();
