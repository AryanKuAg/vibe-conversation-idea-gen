'use client';

import { useState, useRef, useEffect } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { FaPlay, FaArrowRight, FaPause, FaTimes } from 'react-icons/fa';

// Import our simple visualizer component
import SimpleVisualizer from './SimpleVisualizer';

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
    mediaRecorder
  } = useAudioRecorder();

  const [isPlaying, setIsPlaying] = useState(false);
  const [containerWidth, setContainerWidth] = useState(500);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    // Initial update
    updateWidth();

    // Add resize listener
    window.addEventListener('resize', updateWidth);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Cancel recording
  const cancelRecording = async () => {
    if (isRecording) {
      await stopRecording();
      resetRecording();
    }
  };

  // Start recording
  const handleStartRecording = async () => {
    resetRecording();
    await startRecording();
  };

  // Play the recorded audio
  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle audio playback end
  useEffect(() => {
    const handleEnded = () => setIsPlaying(false);

    if (audioRef.current) {
      audioRef.current.addEventListener('ended', handleEnded);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, [audioUrl]);

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

      {/* Voice Visualizer */}
      <div className="mb-8 flex flex-col items-center w-full">
        <div ref={containerRef} className="w-full h-24 flex items-center justify-center mb-4 relative rounded-lg bg-gray-900 border border-gray-800 overflow-hidden">
          <SimpleVisualizer
            isRecording={isRecording}
            mediaRecorder={mediaRecorder}
            blob={audioBlob}
            width={containerWidth}
            height={96}
          />
        </div>

        <div className="text-center mb-4">
          {isRecording ? (
            <p className="text-red-400 animate-pulse">Recording in progress...</p>
          ) : audioUrl ? (
            <p className="text-green-400">Recording complete</p>
          ) : (
            <p className="text-gray-400">Click Start Recording to begin</p>
          )}
        </div>
      </div>

      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} className="hidden" />
      )}

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {!isRecording ? (
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={!isSupported}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2
              bg-blue-600 hover:bg-blue-700 text-white
              ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Start Recording
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={stopRecording}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <FaPause className="mr-2" /> Pause
            </button>

            <button
              type="button"
              onClick={cancelRecording}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <FaTimes className="mr-2" /> Cancel
            </button>
          </>
        )}

        {audioUrl && !isRecording && (
          <button
            type="button"
            onClick={playRecording}
            disabled={isPlaying}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <FaPlay className="mr-2" /> Play
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
