'use client';

import { useState, useRef, useEffect } from 'react';
import { FaPlay, FaArrowRight, FaPause, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import SimpleVisualizer from './SimpleVisualizer'; // Keeping this import
import RecoveryDialog from './RecoveryDialog'; // Keeping this import

interface AudioRecorderProps {
  onNext: (audioBlob: Blob | null, audioUrl: string | null) => void;
}

// TypeScript definitions for the File System Access API
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<any>;
  }
}

export default function AudioRecorder({ onNext }: AudioRecorderProps) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [containerWidth, setContainerWidth] = useState(500);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // Check if browser supports MediaRecorder
  const isSupported = typeof window !== 'undefined' && 
    typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 
    'MediaRecorder' in window;

  // Update container width on mount and resize
  useEffect(() => {
    // Skip during server-side rendering
    if (typeof window === 'undefined') return;

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

  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTimeRef.current + pausedTimeRef.current;
        setElapsedTime(elapsed);
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Log browser info on mount to help with debugging
  useEffect(() => {
    // Skip during server-side rendering
    if (typeof window === 'undefined') return;

    // Check browser
    const browserInfo = {
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      platform: navigator.platform
    };
    console.log("Browser info:", browserInfo);
    
    // Check audio support
    const audioContext = window.AudioContext || (window as any).webkitAudioContext;
    console.log("AudioContext supported:", !!audioContext);

    // Check for recovery on mount
    const savedRecording = localStorage.getItem('recoveredRecording');
    if (savedRecording) {
      setRecoveryAvailable(true);
    }
  }, []);

  // Audio playback end handler
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

  // Start recording
  const startRecording = async () => {
    try {
      // Reset state
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingError(null);
      setElapsedTime(0);
      pausedTimeRef.current = 0;
      audioChunksRef.current = [];

      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' 
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log(`Received audio chunk: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log(`Recording stopped with ${audioChunksRef.current.length} chunks`);
        
        // Only process recording if we weren't canceled
        if (audioChunksRef.current.length > 0) {
          // Create blob and URL
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          console.log(`Created audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
          
          if (audioBlob.size < 100) {
            setRecordingError("Audio file is too small. There might be an issue with your microphone.");
            return;
          }
          
          const url = URL.createObjectURL(audioBlob);
          console.log(`Created audio URL: ${url}`);
          
          setAudioBlob(audioBlob);
          setAudioUrl(url);
          
          // Save recording for recovery
          try {
            localStorage.setItem('recoveredRecording', url);
          } catch (e) {
            console.warn("Couldn't save recording to localStorage:", e);
          }
          
          toast.success("Recording saved successfully!");
        } else {
          console.log("Recording was cancelled, not creating blob");
        }
      };
      
      // Start recording
      mediaRecorder.start(1000); // Capture in 1-second chunks
      startTimeRef.current = Date.now();
      setIsRecording(true);
      
      console.log("Recording started successfully");
      toast.success("Recording started!");
      
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecordingError(`Failed to start recording: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Failed to start recording");
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (!mediaRecorderRef.current || (!isRecording && !isPaused)) {
      console.warn("No active recording to stop");
      return;
    }
    
    try {
      // Stop the MediaRecorder
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      // Stop all tracks in the stream
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      // Update state
      setIsRecording(false);
      setIsPaused(false);
      
      console.log("Recording stopped successfully");
    } catch (error) {
      console.error("Error stopping recording:", error);
      setRecordingError(`Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Failed to stop recording");
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    try {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
        pausedTimeRef.current += Date.now() - startTimeRef.current;
        setIsPaused(true);
        setIsRecording(false);
        console.log("Recording paused");
      }
    } catch (error) {
      console.error("Error pausing recording:", error);
      toast.error("Failed to pause recording");
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (!mediaRecorderRef.current || !isPaused) return;
    
    try {
      if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
        startTimeRef.current = Date.now();
        setIsPaused(false);
        setIsRecording(true);
        console.log("Recording resumed");
      }
    } catch (error) {
      console.error("Error resuming recording:", error);
      toast.error("Failed to resume recording");
    }
  };

  // Reset recording
  const resetRecording = () => {
    // Clear any previous audio URL to avoid errors
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    // Stop any ongoing recording
    if (mediaRecorderRef.current && (isRecording || isPaused)) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    
    // Reset state
    setIsRecording(false);
    setIsPaused(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsedTime(0);
    pausedTimeRef.current = 0;
    audioChunksRef.current = [];
    
    // Clear URL from localStorage
    localStorage.removeItem('recoveredRecording');
    
    console.log("Recording reset");
  };

  // Recover recording
  const recoverRecording = async () => {
    try {
      const savedUrl = localStorage.getItem('recoveredRecording');
      if (!savedUrl) {
        toast.error("No recording found to recover");
        return;
      }
      
      console.log("Attempting to recover recording from:", savedUrl);
      
      // Fetch the blob from the URL
      const response = await fetch(savedUrl);
      const recoveredBlob = await response.blob();
      
      console.log(`Recovered audio blob: ${recoveredBlob.size} bytes, type: ${recoveredBlob.type}`);
      
      if (recoveredBlob.size < 100) {
        toast.error("Recovered recording seems corrupted");
        return;
      }
      
      setAudioBlob(recoveredBlob);
      setAudioUrl(savedUrl);
      
      toast.success("Recording recovered successfully!");
    } catch (error) {
      console.error("Error recovering recording:", error);
      toast.error("Failed to recover recording");
    }
  };

  // Cancel recording
  const cancelRecording = async () => {
    if (isRecording || isPaused) {
      // Clear chunks first to prevent blob creation on stop
      audioChunksRef.current = [];
      await stopRecording();
      resetRecording();
    }
  };

  // Toggle pause/resume recording
  const togglePauseResume = () => {
    if (isRecording) {
      pauseRecording();
    } else if (isPaused) {
      resumeRecording();
    }
  };

  // Play the recorded audio
  const playRecording = () => {
    if (!audioUrl || !audioBlob) {
      console.error("No audio available to play");
      return;
    }

    console.log("Audio blob type:", audioBlob.type);
    console.log("Audio URL:", audioUrl);
    console.log("Audio blob size:", audioBlob.size);

    // Try to use the ref first
    if (audioRef.current) {
      console.log('Playing audio using the audio element');

      // Make sure the audio element is properly loaded
      audioRef.current.load();

      // Log the audio element's properties
      console.log('Audio element readyState:', audioRef.current.readyState);
      console.log('Audio element src:', audioRef.current.src);
      console.log('Audio element error:', audioRef.current.error);

      // Play with error handling
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playback started successfully');
            setIsPlaying(true);
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            
            // Fall back to creating a new audio element
            createAndPlayTempAudio();
          });
      }
    } else {
      // No ref available, create a new audio element
      createAndPlayTempAudio();
    }
  };

  // Helper function to create and play a temporary audio element
  const createAndPlayTempAudio = () => {
    if (!audioUrl) return;
    
    // Using custom toast since toast.info is not available
    toast('Using alternative playback method', {
      icon: '🔊',
    });
    
    const tempAudio = new Audio();
    tempAudio.src = audioUrl;
    
    // Explicitly set type if known
    if (audioBlob && audioBlob.type) {
      console.log("Setting mime type:", audioBlob.type);
    }
    
    tempAudio.oncanplaythrough = () => {
      console.log("Temp audio can play through");
      tempAudio.play()
        .then(() => {
          console.log("Temp audio playing successfully");
          setIsPlaying(true);
          tempAudio.onended = () => {
            console.log("Temp audio playback ended");
            setIsPlaying(false);
          };
        })
        .catch(err => {
          console.error("Failed to play temp audio:", err);
          toast.error("Unable to play audio. Try downloading instead.");
        });
    };
    
    tempAudio.onerror = (e) => {
      console.error("Temp audio error event:", e);
      console.error("Temp audio error code:", tempAudio.error ? tempAudio.error.code : "unknown");
      console.error("Temp audio error message:", tempAudio.error ? tempAudio.error.message : "unknown");
      toast.error("Audio playback error. Try downloading the file.");
      
      // Final fallback - offer direct download
      offerDirectDownload();
    };
    
    // Start loading
    tempAudio.load();
  };

  // Offer direct download as a last resort
  const offerDirectDownload = () => {
    if (!audioUrl) return;
    
    toast((t) => (
      <div>
        <p>Playback not working. Use download button instead.</p>
        <button 
          onClick={() => {
            window.open(audioUrl, '_blank');
            toast.dismiss(t.id);
          }}
          className="mt-2 bg-blue-600 text-white px-3 py-1 rounded"
        >
          Download Now
        </button>
      </div>
    ), { duration: 5000 });
  };

  // Verify audio is playable before proceeding to next step
  const verifyAndProceed = () => {
    if (!audioBlob || !audioUrl) {
      toast.error("No recording available");
      return;
    }

    // Create a test audio element to verify playability
    const testAudio = new Audio(audioUrl);
    
    // Set a timeout to prevent hanging if audio takes too long to load
    const timeoutId = setTimeout(() => {
      // Proceed anyway after timeout
      console.log("Audio verification timed out, proceeding anyway");
      // Using custom toast since toast.warning is not available
      toast('Audio verification timed out, proceeding anyway', {
        icon: '⚠️',
      });
      onNext(audioBlob, audioUrl);
    }, 3000);
    
    testAudio.oncanplaythrough = () => {
      clearTimeout(timeoutId);
      console.log("Audio verified as playable");
      onNext(audioBlob, audioUrl);
    };
    
    testAudio.onerror = (e) => {
      clearTimeout(timeoutId);
      console.error("Audio verification failed:", e);
      
      // Proceed anyway with a warning
      toast('There may be issues with the audio recording, but proceeding anyway', {
        icon: '⚠️',
      });
      onNext(audioBlob, audioUrl);
    };
    
    // Start loading
    testAudio.load();
  };

  // Handle recovery dialog
  const handleRecover = async () => {
    await recoverRecording();
    setShowRecoveryDialog(false);
  };

  // Discard recovery
  const handleDiscardRecovery = () => {
    resetRecording();
    setShowRecoveryDialog(false);
  };

  // Save audio to file system (experimental feature)
  const saveToFileSystem = async () => {
    if (!audioBlob) return;
    
    try {
      // Check if the File System Access API is available
      if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: 'recording.webm',
          types: [{
            description: 'Audio File',
            accept: {
              'audio/webm': ['.webm'],
              'audio/wav': ['.wav'],
              'audio/mp3': ['.mp3']
            }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(audioBlob);
        await writable.close();
        
        toast.success("File saved successfully");
      } else {
        // Fallback to the download attribute
        const a = document.createElement('a');
        a.href = audioUrl || '';
        a.download = 'recording.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error("Failed to save file");
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
      <div className="mb-4 flex flex-col items-center w-full">
        <div ref={containerRef} className="w-full h-24 flex items-center justify-center mb-2 relative rounded-lg bg-gray-900 border border-gray-800 overflow-hidden">
          <SimpleVisualizer
            isRecording={isRecording || isPaused}
            mediaRecorder={mediaRecorderRef.current}
            blob={audioBlob}
            width={containerWidth}
            height={96}
          />
        </div>

        {/* Recording Timer */}
        {(isRecording || isPaused) && (
          <div className="w-full px-2 mb-4 text-center">
            <div className="text-lg font-semibold">
              {new Date(elapsedTime).toISOString().substring(14, 19)}
            </div>
          </div>
        )}

        <div className="text-center mb-4">
          {isRecording ? (
            <p className="text-red-400 animate-pulse">Recording in progress...</p>
          ) : isPaused ? (
            <p className="text-yellow-400">Recording paused</p>
          ) : audioUrl ? (
            <p className="text-green-400">Recording complete</p>
          ) : (
            <p className="text-gray-400">Click Start Recording to begin</p>
          )}
        </div>
      </div>

      {/* Audio playback section */}
      {audioBlob && audioUrl && (
        <div className="mb-4 w-full">
          {/* Enhanced audio player with multiple formats */}
          <audio
            ref={audioRef}
            className="w-full"
            controls
            preload="metadata"
            onError={(e) => {
              // Only log errors when we have an actual audio URL
              if (audioUrl) {
                console.error('Audio playback error:', e);
                if (e.currentTarget.error) {
                  console.error('Error code:', e.currentTarget.error.code);
                  console.error('Error message:', e.currentTarget.error.message);
                }
              }
            }}
          >
            {/* Only add source elements if we have an audio URL */}
            {audioUrl && (
              <>
                <source src={audioUrl} type={audioBlob.type || "audio/webm"} />
                <source src={audioUrl} type="audio/webm" />
                <source src={audioUrl} type="audio/wav" />
                <source src={audioUrl} type="audio/mpeg" />
                <source src={audioUrl} type="audio/mp4" />
                Your browser does not support the audio element.
              </>
            )}
          </audio>
          <p className="text-xs text-gray-500 mt-1 text-center">
            Use this player to listen to your recording
          </p>

          {/* Download options */}
          <div className="mt-2 flex justify-center gap-2">
            <a
              href={audioUrl}
              download="recording.webm"
              className="inline-block px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Download Recording
            </a>
            
            <button
              onClick={saveToFileSystem}
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
            >
              Save As...
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {!isRecording && !isPaused ? (
          <button
            type="button"
            onClick={startRecording}
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
              onClick={togglePauseResume}
              className={`px-6 py-3 ${isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white rounded-lg font-medium flex items-center gap-2`}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            {/* <button
              type="button"
              onClick={cancelRecording}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <FaTimes className="mr-2" /> Cancel
            </button> */}

            {isRecording && (
              <button
                type="button"
                onClick={stopRecording}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2"
              >
                <FaPlay className="mr-2" /> Stop & Save
              </button>
            )}
          </>
        )}

        {audioUrl && !isRecording && !isPaused && (
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
      {audioBlob && !isRecording && !isPaused && (
        <button
          onClick={verifyAndProceed}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          Next <FaArrowRight />
        </button>
      )}

      {/* Recovery Dialog */}
      {showRecoveryDialog && (
        <RecoveryDialog
          onRecover={handleRecover}
          onDiscard={handleDiscardRecovery}
        />
      )}
    </div>
  );
}