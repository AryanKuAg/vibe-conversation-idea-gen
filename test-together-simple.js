// Simple script to test if the Together API key is valid
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.TOGETHER_API_KEY;
console.log('API Key available:', !!apiKey);
console.log('API Key length:', apiKey.length);
console.log('API Key format valid:', /^[a-zA-Z0-9]+$/.test(apiKey));

// Make a simple request to check API key validity
const testTogetherAPI = async () => {
  try {
    const response = await fetch('https://api.together.xyz/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.log('Response text:', responseText);
      throw new Error(`API request failed with status ${response.status}`);
    }

    console.log('API key is valid!');
    console.log('Test successful!');
  } catch (error) {
    console.error('Error testing Together API:', error);
  }
};

testTogetherAPI();
