'use client';

import { useState, useEffect, useRef } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { FaMicrophone, FaMicrophoneSlash, FaPause, FaPlay, FaUpload, FaFile, FaPaperPlane } from 'react-icons/fa';

export default function VoiceInterface({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  const {
    state: { isRecording, audioBlob, audioUrl, error: recordingError },
    startRecording,
    stopRecording,
    resetRecording,
    isSupported,
    audioLevel
  } = useAudioRecorder();

  const [isPaused, setIsPaused] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visualizerRef = useRef<HTMLDivElement>(null);
  const [visualElements, setVisualElements] = useState<JSX.Element[]>([]);

  // Generate visual elements for the voice visualizer
  useEffect(() => {
    if (!isRecording) return;

    const elements: JSX.Element[] = [];
    const count = 30; // Number of bars
    
    for (let i = 0; i < count; i++) {
      // Calculate height based on audio level and position
      // Center bars are taller, edges are shorter
      const distanceFromCenter = Math.abs(i - count / 2) / (count / 2);
      const baseHeight = 10 + Math.random() * 10; // Random base height
      const heightMultiplier = isRecording ? (audioLevel / 100) * (1 - distanceFromCenter * 0.8) : 0;
      const height = baseHeight + heightMultiplier * 40;
      
      elements.push(
        <div
          key={i}
          className="bg-white rounded-full w-1"
          style={{ 
            height: `${height}px`,
            transition: 'height 100ms ease-in-out',
            animationDelay: `${i * 50}ms`
          }}
        />
      );
    }
    
    setVisualElements(elements);
  }, [isRecording, audioLevel]);

  const handleSubmit = () => {
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
      setIsPaused(false);
    }
  };

  // Toggle pause/resume
  const togglePause = () => {
    setIsPaused(!isPaused);
    // Actual pause/resume functionality would be implemented here
    // This would require modifications to the MediaRecorder implementation
  };

  // Trigger file upload dialog
  const handleUploadClick = () => {
    setShowFileUpload(!showFileUpload);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Handle the file - for now just log it
      console.log('File selected:', file.name);
      
      // For audio files, we could create an audio URL
      if (file.type.startsWith('audio/')) {
        const url = URL.createObjectURL(file);
        // We could play this or process it
        console.log('Audio URL created:', url);
      }
      
      // For text files, we could read the content
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setText(content);
        };
        reader.readAsText(file);
      }
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
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Conversation Analyzer</h1>
          <p className="text-gray-400">
            Speak or upload a conversation to identify business opportunities
          </p>
        </div>
        
        {!isSupported && (
          <div className="mb-6 p-4 bg-red-900 text-red-100 rounded-lg">
            Audio recording is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.
          </div>
        )}
        
        {recordingError && (
          <div className="mb-6 p-4 bg-red-900 text-red-100 rounded-lg">
            {recordingError}
          </div>
        )}
        
        {/* Voice Visualizer */}
        <div className="mb-8 flex flex-col items-center">
          <div 
            ref={visualizerRef}
            className={`w-40 h-40 rounded-full flex items-center justify-center mb-4 relative ${
              isRecording ? 'bg-gray-800' : 'bg-gray-900'
            }`}
          >
            {isRecording ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-end justify-center gap-[2px] h-20 w-20">
                  {visualElements}
                </div>
              </div>
            ) : (
              <FaMicrophone className="text-white text-4xl" />
            )}
          </div>
          
          <div className="text-center">
            {isRecording ? (
              <p className="text-red-400 animate-pulse">Recording in progress...</p>
            ) : audioUrl ? (
              <p className="text-green-400">Recording complete</p>
            ) : (
              <p className="text-gray-400">Click the microphone to start recording</p>
            )}
          </div>
        </div>
        
        {/* Text Input */}
        <div className="mb-6">
          <textarea
            className="w-full p-4 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={5}
            placeholder="Type or paste conversation here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={!isSupported}
            className={`p-4 rounded-full ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? <FaMicrophoneSlash size={24} /> : <FaMicrophone size={24} />}
          </button>
          
          {isRecording && (
            <button
              type="button"
              onClick={togglePause}
              className={`p-4 rounded-full ${
                isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
              title={isPaused ? 'Resume Recording' : 'Pause Recording'}
            >
              {isPaused ? <FaPlay size={24} /> : <FaPause size={24} />}
            </button>
          )}
          
          {audioUrl && !isRecording && (
            <button
              type="button"
              onClick={playRecording}
              className="p-4 rounded-full bg-purple-600 hover:bg-purple-700"
              title="Play Recording"
            >
              <FaPlay size={24} />
            </button>
          )}
          
          <button
            type="button"
            onClick={handleUploadClick}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600"
            title="Upload File"
          >
            <FaUpload size={24} />
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="p-4 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Submit"
          >
            <FaPaperPlane size={24} />
          </button>
        </div>
        
        {/* File Upload Section */}
        {showFileUpload && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg font-medium mb-2">Upload File</h3>
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700">
                  <FaFile size={24} className="text-gray-400" />
                  <span className="text-gray-400">Choose a file or drag it here</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              Supported formats: Audio files (MP3, WAV), Text files (TXT)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
