/**
 * useAudioRecorder Hook
 *
 * A custom React hook that provides audio recording functionality.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AudioRecorder, AudioRecorderState, isAudioRecordingSupported } from '../utils/audioRecorder';
import { AudioVisualizer } from '../utils/audioVisualizer';

export interface AudioRecorderHookResult {
  state: AudioRecorderState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | undefined>;
  resetRecording: () => void;
  isSupported: boolean;
  audioLevel: number;
}

export function useAudioRecorder(): AudioRecorderHookResult {
  // Initial state
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    audioBlob: null,
    audioUrl: null,
    error: null,
  });

  // Audio level for visualization
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Create instances for recorder and visualizer
  const [recorder] = useState<AudioRecorder>(() => new AudioRecorder());
  const visualizerRef = useRef<AudioVisualizer | null>(null);
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
      if (visualizerRef.current) {
        visualizerRef.current.stop();
        visualizerRef.current = null;
      }

      recorder.cleanup();

      // Revoke any object URLs to prevent memory leaks
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }

      // Stop any active media streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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

      // Get the media stream for visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Initialize visualizer
      visualizerRef.current = new AudioVisualizer();
      visualizerRef.current.initialize(stream, (level) => {
        setAudioLevel(level);
      });

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

      // Clean up resources
      if (visualizerRef.current) {
        visualizerRef.current.stop();
        visualizerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isSupported, recorder]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!state.isRecording) return;

    try {
      // Stop visualization
      if (visualizerRef.current) {
        visualizerRef.current.stop();
        visualizerRef.current = null;
      }

      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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
    // Stop visualization
    if (visualizerRef.current) {
      visualizerRef.current.stop();
      visualizerRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
    audioLevel
  };
}
