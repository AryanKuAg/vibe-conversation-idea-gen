/**
 * Audio Recorder Utility
 *
 * This utility provides functions for recording audio using the browser's
 * MediaRecorder API and Web Audio API.
 */

// Types for our audio recorder
export interface AudioRecorderState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
}

export interface AudioRecorderHook {
  state: AudioRecorderState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resetRecording: () => void;
}

// Class to handle audio recording functionality
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  // Get the MediaRecorder instance
  getMediaRecorder(): MediaRecorder | null {
    return this.mediaRecorder;
  }

  // Initialize the recorder
  async initialize(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // Start recording
  start(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
      this.audioChunks = [];
      this.mediaRecorder.start();
    }
  }

  // Stop recording and return the audio blob
  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      const handleStop = () => {
        // Create a single blob from all the chunks
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        resolve(audioBlob);

        // Clean up event listener
        if (this.mediaRecorder) {
          this.mediaRecorder.removeEventListener('stop', handleStop);
        }
      };

      // Add stop event listener
      this.mediaRecorder.addEventListener('stop', handleStop);

      // Stop recording
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  // Clean up resources
  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

// Check if the browser supports audio recording
export function isAudioRecordingSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.MediaRecorder
  );
}
