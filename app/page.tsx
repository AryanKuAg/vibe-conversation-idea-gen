'use client';

import { useState } from 'react';
import ConversationInput from './components/ConversationInput';
import ResultsDisplay from './components/ResultsDisplay';

export default function Home() {
  const [ideas, setIdeas] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyzeConversation = async (conversation: string) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setIdeas(data.ideas);
    } catch (err) {
      console.error('Failed to analyze conversation:', err);
      setError('Failed to analyze conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Conversation Analyzer</h1>
          <p className="text-gray-600">
            Input a conversation to identify business opportunities and viable solutions
          </p>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <ConversationInput onSubmit={handleAnalyzeConversation} />

        <ResultsDisplay ideas={ideas} isLoading={isLoading} />
      </div>
    </div>
  );
}
