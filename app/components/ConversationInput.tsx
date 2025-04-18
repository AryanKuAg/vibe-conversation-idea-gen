'use client';

import { useState, useEffect } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

export default function ConversationInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  const {
    state: { isRecording, audioBlob, audioUrl, error: recordingError },
    startRecording,
    stopRecording,
    resetRecording,
    isSupported,
    audioLevel
  } = useAudioRecorder();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text);
      setText('');
      resetRecording();
    }
  };

  // Toggle recording state
  const toggleRecording = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        // We'll implement speech-to-text conversion in the next step
        // For now, just log that we have the audio blob
        console.log('Recording stopped, audio blob size:', blob.size);
      }
    } else {
      await startRecording();
    }
  };

  // Play the recorded audio
  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Input Conversation</h2>

      {!isSupported && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md">
          Audio recording is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.
        </div>
      )}

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

        {isRecording && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-sm text-red-600 font-medium">Recording in progress...</span>
            </div>
            <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={!isSupported}
            className={`px-4 py-2 rounded-md font-medium ${
              isRecording
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>

          {audioUrl && !isRecording && (
            <button
              type="button"
              onClick={playRecording}
              className="px-4 py-2 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700"
            >
              Play Recording
            </button>
          )}

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
