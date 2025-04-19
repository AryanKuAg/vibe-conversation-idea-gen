'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChunkedRecorder, ChunkedRecordingState } from '../utils/chunkedRecorder';
import toast from 'react-hot-toast';

export interface ChunkedAudioRecorderState extends ChunkedRecordingState {
  recoveryAvailable: boolean;
}

export interface ChunkedAudioRecorderHookResult {
  state: ChunkedAudioRecorderState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  recoverRecording: () => Promise<boolean>;
  isSupported: boolean;
  mediaRecorder: MediaRecorder | null;
  currentChunkIndex: number;
  elapsedTime: number;
}

// Check if audio recording is supported in the browser
export const isAudioRecordingSupported = (): boolean => {
  // Return false during server-side rendering
  if (typeof window === 'undefined') return false;

  return !!(
    typeof window !== 'undefined' &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
};

export function useChunkedAudioRecorder(chunkDuration = 60000): ChunkedAudioRecorderHookResult {
  // Initial state
  const [state, setState] = useState<ChunkedAudioRecorderState>({
    isRecording: false,
    chunks: [],
    currentChunkStartTime: 0,
    totalDuration: 0,
    mainBlob: null,
    mainAudioUrl: null,
    error: null,
    recoveryAvailable: false
  });

  const streamRef = useRef<MediaStream | null>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to track state for use in callbacks
  const isRecordingRef = useRef<boolean>(false);
  const elapsedTimeRef = useRef(0);

  // Update refs when state changes
  useEffect(() => {
    isRecordingRef.current = state.isRecording;
  }, [state.isRecording]);

  useEffect(() => {
    elapsedTimeRef.current = elapsedTime;
  }, [elapsedTime]);

  const [recorder] = useState<ChunkedRecorder>(() => new ChunkedRecorder({
    chunkDuration,
    onChunkComplete: (chunk, index) => {
      console.log(`Chunk ${index} completed, size: ${chunk.size} bytes`);

      // Show toast notification
      const timestamp = new Date().toLocaleTimeString();
      const totalSeconds = Math.round(elapsedTimeRef.current / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      toast.success(
        `Recording saved (${timeString})`,
        {
          duration: 3000,
          icon: '🔊',
        }
      );

      // Update state with new chunk
      setState(prev => ({
        ...prev,
        chunks: [...prev.chunks, chunk]
      }));
    },
    onError: (error) => {
      console.error('Chunked recorder error:', error);

      // Show error toast
      toast.error(`Recording error: ${error.message}`);

      setState(prev => ({
        ...prev,
        error: error.message
      }));
    }
  }));

  // Check if recording is supported
  const isSupported = isAudioRecordingSupported();

  // Check for recovery on mount
  useEffect(() => {
    // Skip during server-side rendering
    if (typeof window === 'undefined') return;

    const checkRecovery = async () => {
      try {
        const recovery = await recorder.checkForRecovery();
        setState(prev => ({
          ...prev,
          recoveryAvailable: recovery.hasRecovery
        }));
      } catch (error) {
        console.error('Error checking for recovery:', error);
      }
    };

    if (isSupported) {
      checkRecovery();
    }
  }, [isSupported, recorder]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Audio recording is not supported in this browser.'
      }));
      return;
    }

    try {
      // Reset any previous state
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: null
      }));

      // Initialize the recorder
      await recorder.initialize();

      // Get the media stream for visualization
      const mediaRecorder = recorder.getMediaRecorder();
      if (mediaRecorder) {
        streamRef.current = mediaRecorder.stream;
      }

      // Start recording
      recorder.start();

      // Start timer for elapsed time
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1000);
      }, 1000);

      // Reset chunk index and elapsed time
      setCurrentChunkIndex(0);
      setElapsedTime(0);

      // Update state
      setState(prev => ({
        ...prev,
        isRecording: true,
        chunks: [],
        mainBlob: null,
        mainAudioUrl: null,
        error: null,
        recoveryAvailable: false
      }));

      // Show toast notification
      toast.success(
        `Recording started. Backups every 10s`,
        {
          icon: '🎤',
          duration: 3000
        }
      );
    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: error instanceof Error
          ? error.message
          : 'Failed to start recording. Please check microphone permissions.'
      }));

      // Clean up resources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isSupported, recorder]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop recording
    const blob = recorder.stop();

    // Get recorder state before updating our state
    const recorderState = recorder.getState();

    // Update state
    setState(prev => {
      return {
        ...prev,
        isRecording: false,
        chunks: recorderState.chunks,
        mainBlob: recorderState.mainBlob,
        mainAudioUrl: recorderState.mainAudioUrl
      };
    });

    // Show toast notification
    const duration = Math.round(elapsedTimeRef.current / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    toast.success(
      `Recording completed (${timeString})`,
      {
        icon: '💾',
        duration: 4000
      }
    );

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    return blob;
  }, [recorder, elapsedTime]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Pause recording
    recorder.pause();

    // Update state
    setState(prev => ({
      ...prev,
      isRecording: false
    }));
  }, [recorder]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    // Resume recording
    recorder.resume();

    // Restart timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1000);
    }, 1000);

    // Update state
    setState(prev => ({
      ...prev,
      isRecording: true
    }));
  }, [recorder]);

  // Reset recording
  const resetRecording = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset recorder
    recorder.cleanup();

    // Reset state
    setState({
      isRecording: false,
      chunks: [],
      currentChunkStartTime: 0,
      totalDuration: 0,
      mainBlob: null,
      mainAudioUrl: null,
      error: null,
      recoveryAvailable: false
    });

    // Reset chunk index and elapsed time
    setCurrentChunkIndex(0);
    setElapsedTime(0);

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [recorder]);

  // Recover recording
  const recoverRecording = useCallback(async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Recovering previous recording...');

      const recovery = await recorder.checkForRecovery();

      if (recovery.hasRecovery && recovery.recording) {
        // Create URL for the recovered recording
        const audioUrl = URL.createObjectURL(recovery.recording);

        // Update state
        setState(prev => ({
          ...prev,
          mainBlob: recovery.recording,
          mainAudioUrl: audioUrl,
          recoveryAvailable: false
        }));

        // Show success toast
        toast.success('Recording recovered successfully!', {
          id: loadingToast,
          icon: '✅',
        });

        return true;
      } else {
        // Show error toast
        toast.error('No recording found to recover', {
          id: loadingToast,
        });
      }

      return false;
    } catch (error) {
      console.error('Error recovering recording:', error);

      // Show error toast
      toast.error(`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return false;
    }
  }, [recorder]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Clean up recorder
      recorder.cleanup();

      // Revoke any object URLs to prevent memory leaks
      if (state.mainAudioUrl) {
        URL.revokeObjectURL(state.mainAudioUrl);
      }

      // Stop any active media streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [recorder, state.mainAudioUrl]);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    recoverRecording,
    isSupported,
    mediaRecorder: recorder.getMediaRecorder(),
    currentChunkIndex,
    elapsedTime
  };
}
