/**
 * useAudioRecorder Hook
 *
 * A custom React hook that provides audio recording functionality.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AudioRecorder, AudioRecorderState, isAudioRecordingSupported } from '../utils/audioRecorder';

export interface AudioRecorderHookResult {
  state: AudioRecorderState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | undefined>;
  resetRecording: () => void;
  isSupported: boolean;
  audioLevel: number;
  mediaRecorder: MediaRecorder | null;
}

export function useAudioRecorder(): AudioRecorderHookResult {
  // Initial state
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    audioBlob: null,
    audioUrl: null,
    error: null,
  });

  // Ref to track recording state for use in callbacks
  const isRecordingRef = useRef<boolean>(false);

  // Update ref when state changes
  useEffect(() => {
    isRecordingRef.current = state.isRecording;
  }, [state.isRecording]);

  // Audio level for visualization
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Create instances for recorder
  const [recorder] = useState<AudioRecorder>(() => new AudioRecorder());
  const streamRef = useRef<MediaStream | null>(null);

  // Check browser support
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(isAudioRecordingSupported());
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recorder.cleanup();

      // Revoke any object URLs to prevent memory leaks
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }

      // Stop any active media streams and close audio context
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());

        // Close audio context if it exists
        if ((streamRef.current as any).audioContext) {
          try {
            (streamRef.current as any).audioContext.close();
          } catch (e) {
            console.error('Error closing audio context:', e);
          }
        }

        // Clear any update timeout
        if ((streamRef.current as any).updateTimeout) {
          clearTimeout((streamRef.current as any).updateTimeout);
          (streamRef.current as any).updateTimeout = null;
        }

        streamRef.current = null;
      }
    };
  }, [recorder, state.audioUrl]);

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

      // Verify that MediaRecorder was initialized
      if (!recorder.getMediaRecorder()) {
        throw new Error('MediaRecorder could not be initialized');
      }

      // Get the media stream for visualization
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Set a more sensitive audio level update mechanism
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024; // Higher FFT size for better frequency resolution
      analyser.minDecibels = -85; // More sensitive to quiet sounds
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.5; // More responsive

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Store the audio context for cleanup
      (streamRef.current as any).audioContext = audioContext;

      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const timeData = new Uint8Array(analyser.fftSize);

      // Update audio level periodically
      let updateTimeout: NodeJS.Timeout | null = null;

      const updateLevel = () => {
        if (!isRecordingRef.current) {
          if (updateTimeout) {
            clearTimeout(updateTimeout);
            updateTimeout = null;
          }
          return;
        }

        // Get both frequency and time domain data for better analysis
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(timeData);

        // Calculate RMS (Root Mean Square) from time domain data for volume
        let rms = 0;
        for (let i = 0; i < timeData.length; i++) {
          // Convert from 0-255 to -1 to 1
          const amplitude = (timeData[i] / 128) - 1;
          rms += amplitude * amplitude;
        }
        rms = Math.sqrt(rms / timeData.length);

        // Calculate frequency energy (focusing on speech frequencies 300-3000 Hz)
        const speechFreqStart = Math.floor(300 / (audioContext.sampleRate / analyser.fftSize));
        const speechFreqEnd = Math.ceil(3000 / (audioContext.sampleRate / analyser.fftSize));

        let speechEnergy = 0;
        for (let i = speechFreqStart; i < speechFreqEnd && i < frequencyData.length; i++) {
          speechEnergy += frequencyData[i];
        }
        speechEnergy /= (speechFreqEnd - speechFreqStart);

        // Combine RMS and frequency data with sensitivity adjustment
        const sensitivity = 1.8; // Higher sensitivity
        const combinedLevel = (rms * 100 * sensitivity + speechEnergy / 255 * 100) / 2;

        // Apply non-linear scaling to make small sounds more visible
        const scaledLevel = Math.pow(combinedLevel / 100, 0.6) * 100;

        // Ensure the level is within 0-100 range
        const level = Math.min(100, Math.max(0, scaledLevel));

        setAudioLevel(level);

        // Dispatch audio level event for the visualizer
        try {
          window.dispatchEvent(new CustomEvent('audio-level-update', {
            detail: { level }
          }));
        } catch (e) {
          console.error('Error dispatching audio level event:', e);
        }

        updateTimeout = setTimeout(updateLevel, 50); // Faster updates for more responsive visualization
      };

      // Store the timeout for cleanup
      (streamRef.current as any).updateTimeout = updateTimeout;

      updateLevel();

      // Start recording
      recorder.start();

      // Update state
      setState(prev => ({
        ...prev,
        isRecording: true,
        audioBlob: null,
        audioUrl: null,
        error: null
      }));
    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: error instanceof Error
          ? error.message
          : 'Failed to start recording. Please check microphone permissions.'
      }));

      // No need to clean up visualizer resources anymore

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());

        // Clear any update timeout
        if ((streamRef.current as any).updateTimeout) {
          clearTimeout((streamRef.current as any).updateTimeout);
          (streamRef.current as any).updateTimeout = null;
        }

        streamRef.current = null;
      }
    }
  }, [isSupported, recorder]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!state.isRecording) return;

    try {
      // No need to clean up visualizer resources anymore

      // Stop media stream and close audio context
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());

        // Close audio context if it exists
        if ((streamRef.current as any).audioContext) {
          try {
            (streamRef.current as any).audioContext.close();
          } catch (e) {
            console.error('Error closing audio context:', e);
          }
        }

        // Clear any update timeout
        if ((streamRef.current as any).updateTimeout) {
          clearTimeout((streamRef.current as any).updateTimeout);
          (streamRef.current as any).updateTimeout = null;
        }

        streamRef.current = null;
      }

      // Reset audio level
      setAudioLevel(0);

      // Stop the recording and get the audio blob
      const audioBlob = await recorder.stop();

      // Create a URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob);

      // Update state
      setState(prev => ({
        ...prev,
        isRecording: false,
        audioBlob,
        audioUrl
      }));

      // Clean up the recorder
      recorder.cleanup();

      return audioBlob;
    } catch (error) {
      console.error('Error stopping recording:', error);
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: error instanceof Error
          ? error.message
          : 'Failed to stop recording.'
      }));

      // Clean up the recorder
      recorder.cleanup();
    }
  }, [state.isRecording, recorder]);

  // Reset the recording state
  const resetRecording = useCallback(() => {
    // No need to clean up visualizer resources anymore

    // Stop media stream and close audio context
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());

      // Close audio context if it exists
      if ((streamRef.current as any).audioContext) {
        try {
          (streamRef.current as any).audioContext.close();
        } catch (e) {
          console.error('Error closing audio context:', e);
        }
      }

      // Clear any update timeout
      if ((streamRef.current as any).updateTimeout) {
        clearTimeout((streamRef.current as any).updateTimeout);
        (streamRef.current as any).updateTimeout = null;
      }

      streamRef.current = null;
    }

    // Reset audio level
    setAudioLevel(0);

    // Revoke any existing audio URL
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    // Reset state
    setState({
      isRecording: false,
      audioBlob: null,
      audioUrl: null,
      error: null
    });

    // Clean up the recorder
    recorder.cleanup();
  }, [state.audioUrl, recorder]);

  return {
    state,
    startRecording,
    stopRecording,
    resetRecording,
    isSupported,
    audioLevel,
    mediaRecorder: recorder.getMediaRecorder()
  };
}
