'use client';

import { useState } from 'react';
import Stepper from './components/Stepper';
import AudioRecorder from './components/AudioRecorder';
import TextEditor from './components/TextEditor';
import ResultsDisplay from './components/ResultsDisplay';

export default function Home() {
  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['Record Audio', 'Edit Text', 'View Ideas'];

  // Data for each step
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [conversationText, setConversationText] = useState('');

  // Analysis state
  const [ideas, setIdeas] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 completion handler
  const handleAudioRecorded = (blob: Blob | null, url: string | null) => {
    setAudioBlob(blob);
    setAudioUrl(url);
    setCurrentStep(1); // Move to text editing step
  };

  // Step 2 completion handler
  const handleTextEdited = (text: string) => {
    setConversationText(text);
    setCurrentStep(2); // Move to results step
    analyzeConversation(text);
  };

  // Go back to previous step
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Reset to first step
  const handleReset = () => {
    setCurrentStep(0);
    setIdeas(null);
    setError('');
  };

  // Analyze the conversation
  const analyzeConversation = async (conversation: string) => {
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
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Conversation Analyzer</h1>

        {/* Stepper */}
        <Stepper currentStep={currentStep} steps={steps} />

        {/* Step Content */}
        <div className="mt-8">
          {currentStep === 0 && (
            <AudioRecorder onNext={handleAudioRecorded} />
          )}

          {currentStep === 1 && (
            <TextEditor
              audioBlob={audioBlob}
              audioUrl={audioUrl}
              onNext={handleTextEdited}
              onBack={handleBack}
            />
          )}

          {currentStep === 2 && (
            <div>
              {error && (
                <div className="mb-8 p-4 bg-red-900 text-red-100 rounded-lg">
                  {error}
                </div>
              )}

              <div className="mb-6 flex justify-between items-center">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white"
                >
                  ← Back to Edit
                </button>

                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                >
                  Start Over
                </button>
              </div>

              <ResultsDisplay ideas={ideas} isLoading={isLoading} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
