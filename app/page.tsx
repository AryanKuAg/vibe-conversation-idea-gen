'use client';

import { useState } from 'react';
import VoiceInterface from './components/VoiceInterface';
import ResultsDisplay from './components/ResultsDisplay';

export default function Home() {
  const [ideas, setIdeas] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleAnalyzeConversation = async (conversation: string) => {
    setIsLoading(true);
    setError('');
    setShowResults(true);

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

  const handleBackToRecording = () => {
    setShowResults(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {!showResults ? (
        <VoiceInterface onSubmit={handleAnalyzeConversation} />
      ) : (
        <div className="max-w-4xl mx-auto p-6">
          {error && (
            <div className="mb-8 p-4 bg-red-900 text-red-100 rounded-md">
              {error}
            </div>
          )}

          <button
            onClick={handleBackToRecording}
            className="mb-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-white"
          >
            ← Back to Recording
          </button>

          <ResultsDisplay ideas={ideas} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
