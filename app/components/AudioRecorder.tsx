'use client';

import { useState } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { FaMicrophone, FaMicrophoneSlash, FaPlay, FaArrowRight } from 'react-icons/fa';

interface AudioRecorderProps {
  onNext: (audioBlob: Blob | null, audioUrl: string | null) => void;
}

export default function AudioRecorder({ onNext }: AudioRecorderProps) {
  const {
    state: { isRecording, audioBlob, audioUrl, error: recordingError },
    startRecording,
    stopRecording,
    resetRecording,
    isSupported,
    audioLevel
  } = useAudioRecorder();

  const [isPlaying, setIsPlaying] = useState(false);

  // Toggle recording state
  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      resetRecording();
      await startRecording();
    }
  };

  // Play the recorded audio
  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      setIsPlaying(true);
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audio.play();
    }
  };

  // Proceed to next step
  const handleNext = () => {
    if (audioBlob && audioUrl) {
      onNext(audioBlob, audioUrl);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6">Step 1: Record Your Conversation</h2>
      
      {!isSupported && (
        <div className="mb-6 p-4 bg-red-900 text-red-100 rounded-lg w-full">
          Audio recording is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.
        </div>
      )}
      
      {recordingError && (
        <div className="mb-6 p-4 bg-red-900 text-red-100 rounded-lg w-full">
          {recordingError}
        </div>
      )}
      
      {/* Recording Indicator */}
      <div className="mb-8 flex flex-col items-center">
        <div 
          className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 
            ${isRecording ? 'bg-red-900 border-2 border-red-600' : 'bg-gray-800 border-2 border-gray-700'}`}
        >
          {isRecording ? (
            <div className="flex items-end space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white w-2 rounded-full voice-bar"
                  style={{ 
                    height: `${20 + Math.random() * 30}px`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
          ) : (
            <FaMicrophone className="text-white text-4xl" />
          )}
        </div>
        
        <div className="text-center mb-4">
          {isRecording ? (
            <p className="text-red-400 animate-pulse">Recording in progress...</p>
          ) : audioUrl ? (
            <p className="text-green-400">Recording complete</p>
          ) : (
            <p className="text-gray-400">Click the microphone to start recording</p>
          )}
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex gap-4 mb-8">
        <button
          type="button"
          onClick={toggleRecording}
          disabled={!isSupported}
          className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRecording ? (
            <>
              <FaMicrophoneSlash /> Stop Recording
            </>
          ) : (
            <>
              <FaMicrophone /> Start Recording
            </>
          )}
        </button>
        
        {audioUrl && !isRecording && (
          <button
            type="button"
            onClick={playRecording}
            disabled={isPlaying}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <FaPlay /> Play
          </button>
        )}
      </div>
      
      {/* Next Button */}
      {audioBlob && !isRecording && (
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          Next <FaArrowRight />
        </button>
      )}
    </div>
  );
}
