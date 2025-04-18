'use client';

import { useState } from 'react';

export default function ConversationInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };

  // This is a placeholder for the recording functionality
  // We'll implement this later
  const toggleRecording = async () => {
    setRecordingError('');
    
    if (isRecording) {
      setIsRecording(false);
      // Stop recording logic will go here
    } else {
      try {
        setIsRecording(true);
        // Start recording logic will go here
      } catch (error) {
        setIsRecording(false);
        setRecordingError('Could not access microphone. Please check permissions.');
        console.error('Recording error:', error);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Input Conversation</h2>
      
      {recordingError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {recordingError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="conversation" className="block text-sm font-medium text-gray-700 mb-1">
            Enter conversation text or record audio
          </label>
          <textarea
            id="conversation"
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type or paste conversation here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={toggleRecording}
            className={`px-4 py-2 rounded-md font-medium ${
              isRecording 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Analyze Conversation
          </button>
        </div>
      </form>
    </div>
  );
}
