'use client';

import { useState, useEffect } from 'react';
import { FaArrowRight, FaArrowLeft } from 'react-icons/fa';

interface TextEditorProps {
  audioBlob: Blob | null;
  audioUrl: string | null;
  onNext: (text: string) => void;
  onBack: () => void;
}

export default function TextEditor({ audioBlob, audioUrl, onNext, onBack }: TextEditorProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // For now, we'll simulate text extraction
  // In a real implementation, this would call a speech-to-text API
  useEffect(() => {
    if (audioBlob) {
      setIsLoading(true);
      setError('');
      
      // Simulate API call delay
      const timer = setTimeout(() => {
        // This is a placeholder. In a real app, you would:
        // 1. Send the audioBlob to a speech-to-text API
        // 2. Get the transcribed text back
        // 3. Set the text state with the result
        setText("This is a simulated transcription of your audio. In a real implementation, this would be the actual text extracted from your recording. Please edit this text as needed before proceeding to the next step.");
        setIsLoading(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [audioBlob]);

  const handleNext = () => {
    if (text.trim()) {
      onNext(text);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-2xl font-bold mb-6">Step 2: Edit Transcribed Text</h2>
      
      {error && (
        <div className="mb-6 p-4 bg-red-900 text-red-100 rounded-lg w-full">
          {error}
        </div>
      )}
      
      {/* Audio Playback */}
      {audioUrl && (
        <div className="mb-6 w-full">
          <p className="text-gray-400 mb-2">Review your recording:</p>
          <audio 
            controls 
            src={audioUrl} 
            className="w-full"
          />
        </div>
      )}
      
      {/* Text Editor */}
      <div className="w-full mb-6">
        <p className="text-gray-400 mb-2">Edit the transcribed text if needed:</p>
        {isLoading ? (
          <div className="w-full h-48 bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-48 p-4 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Transcribed text will appear here..."
          />
        )}
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <FaArrowLeft /> Back
        </button>
        
        <button
          onClick={handleNext}
          disabled={!text.trim() || isLoading}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next <FaArrowRight />
        </button>
      </div>
    </div>
  );
}
