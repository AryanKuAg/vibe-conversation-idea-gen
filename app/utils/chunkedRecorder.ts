'use client';

/**
 * ChunkedRecorder Utility
 *
 * This utility provides functionality for recording audio in chunks
 * while maintaining a seamless recording experience for the user.
 */

export interface ChunkedRecordingState {
  isRecording: boolean;
  chunks: Blob[];
  currentChunkStartTime: number;
  totalDuration: number;
  mainBlob: Blob | null;
  mainAudioUrl: string | null;
  error: string | null;
}

export interface ChunkedRecorderOptions {
  chunkDuration: number; // Duration of each chunk in milliseconds
  onChunkComplete?: (chunk: Blob, chunkIndex: number) => void;
  onError?: (error: Error) => void;
}

export class ChunkedRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private currentChunkIndex = 0;
  private chunkStartTime = 0;
  private recordingStartTime = 0;
  private chunkTimer: NodeJS.Timeout | null = null;
  private options: ChunkedRecorderOptions;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private mainBlob: Blob | null = null;
  private mainAudioUrl: string | null = null;

  constructor(options: ChunkedRecorderOptions = { chunkDuration: 10000 }) {
    this.options = {
      chunkDuration: 10000, // Default to 10 second chunks for testing
      ...options
    };
  }

  // Initialize the recorder
  async initialize(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Use the most widely supported format
      let options = {};

      // Try to use a widely supported format if available
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      }

      console.log('Creating MediaRecorder with options:', options);

      // Create media recorder with the supported options
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);

          // Save to IndexedDB for recovery
          this.saveChunkToStorage(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        try {
          // Create main blob from all audio chunks with a widely supported format
          // Use audio/wav which is widely supported
          const mimeType = 'audio/wav';

          console.log('Using MIME type for recording:', mimeType);
          this.mainBlob = new Blob(this.audioChunks, { type: mimeType });

          // Create URL for the blob
          if (this.mainAudioUrl) {
            URL.revokeObjectURL(this.mainAudioUrl);
          }
          this.mainAudioUrl = URL.createObjectURL(this.mainBlob);

          console.log('Created audio URL:', this.mainAudioUrl, 'MIME type:', mimeType);

          // Save complete recording to storage
          this.saveCompleteRecordingToStorage();
        } catch (error) {
          console.error('Error creating audio blob:', error);
        }
      };

      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // Start recording
  start(): void {
    if (!this.mediaRecorder) {
      throw new Error('Media recorder not initialized');
    }

    // Reset state
    this.chunks = [];
    this.audioChunks = [];
    this.currentChunkIndex = 0;
    this.recordingStartTime = Date.now();
    this.chunkStartTime = this.recordingStartTime;
    this.isRecording = true;

    // Start recording
    this.mediaRecorder.start();

    // Set up chunk timer
    this.startChunkTimer();
  }

  // Stop recording
  stop(): Blob | null {
    if (!this.mediaRecorder || !this.isRecording) {
      return null;
    }

    // Clear chunk timer
    this.clearChunkTimer();

    // Stop recording
    this.mediaRecorder.stop();
    this.isRecording = false;

    // Complete the current chunk
    this.completeCurrentChunk();

    return this.mainBlob;
  }

  // Pause recording (stops the media recorder but keeps the state)
  pause(): void {
    if (!this.mediaRecorder || !this.isRecording) {
      return;
    }

    // Clear chunk timer
    this.clearChunkTimer();

    // Stop media recorder
    this.mediaRecorder.stop();

    // Complete the current chunk
    this.completeCurrentChunk();
  }

  // Resume recording
  resume(): void {
    if (!this.mediaRecorder || this.isRecording) {
      return;
    }

    // Update chunk start time
    this.chunkStartTime = Date.now();

    // Start media recorder
    this.mediaRecorder.start();

    // Restart chunk timer
    this.startChunkTimer();
  }

  // Get the current recording state
  getState(): ChunkedRecordingState {
    return {
      isRecording: this.isRecording,
      chunks: this.chunks,
      currentChunkStartTime: this.chunkStartTime,
      totalDuration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
      mainBlob: this.mainBlob,
      mainAudioUrl: this.mainAudioUrl,
      error: null
    };
  }

  // Get the media recorder instance
  getMediaRecorder(): MediaRecorder | null {
    return this.mediaRecorder;
  }

  // Clean up resources
  cleanup(): void {
    // Stop recording if active
    if (this.isRecording) {
      this.stop();
    }

    // Clear chunk timer
    this.clearChunkTimer();

    // Stop media stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Release audio URL
    if (this.mainAudioUrl) {
      URL.revokeObjectURL(this.mainAudioUrl);
      this.mainAudioUrl = null;
    }

    // Reset state
    this.mediaRecorder = null;
    this.chunks = [];
    this.audioChunks = [];
    this.currentChunkIndex = 0;
    this.isRecording = false;
    this.mainBlob = null;
  }

  // Private methods

  // Start the chunk timer
  private startChunkTimer(): void {
    // Clear any existing timer
    this.clearChunkTimer();

    // Set up new timer
    this.chunkTimer = setTimeout(() => {
      this.completeCurrentChunk();

      // If still recording, start a new chunk
      if (this.isRecording && this.mediaRecorder) {
        this.mediaRecorder.stop();
        this.chunkStartTime = Date.now();
        this.mediaRecorder.start();
        this.startChunkTimer();
      }
    }, this.options.chunkDuration);
  }

  // Clear the chunk timer
  private clearChunkTimer(): void {
    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }
  }

  // Complete the current chunk
  private completeCurrentChunk(): void {
    if (this.audioChunks.length === 0) {
      return;
    }

    // Create blob for the current chunk with a widely supported format
    const mimeType = 'audio/wav';

    const chunkBlob = new Blob(this.audioChunks, { type: mimeType });
    console.log('Created chunk blob with MIME type:', mimeType);

    // Add to chunks array
    this.chunks.push(chunkBlob);

    // Call callback if provided
    if (this.options.onChunkComplete) {
      this.options.onChunkComplete(chunkBlob, this.currentChunkIndex);
    }

    // Increment chunk index
    this.currentChunkIndex++;
  }

  // Save chunk to IndexedDB for recovery - only keep the latest chunk
  private saveChunkToStorage(chunk: Blob): void {
    try {
      // Use IndexedDB to store the chunk
      const request = indexedDB.open('AudioRecordingDB', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('recordings')) {
          db.createObjectStore('recordings', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;

          // Check if the object store exists
          if (!db.objectStoreNames.contains('chunks')) {
            // Create the store if it doesn't exist
            const version = db.version + 1;
            db.close();
            const upgradeRequest = indexedDB.open('AudioRecordingDB', version);

            upgradeRequest.onupgradeneeded = (e) => {
              const upgradeDb = (e.target as IDBOpenDBRequest).result;
              if (!upgradeDb.objectStoreNames.contains('chunks')) {
                upgradeDb.createObjectStore('chunks', { keyPath: 'id' });
              }
              if (!upgradeDb.objectStoreNames.contains('recordings')) {
                upgradeDb.createObjectStore('recordings', { keyPath: 'id' });
              }
            };

            upgradeRequest.onsuccess = () => {
              this.saveChunkToStorage(chunk); // Try again after upgrade
            };

            return;
          }

          const transaction = db.transaction(['chunks'], 'readwrite');
          const store = transaction.objectStore('chunks');

          // First clear all existing chunks
          store.clear().onsuccess = () => {
            // Then store only the latest chunk
            store.put({
              id: 'latest_chunk',
              data: chunk,
              index: this.currentChunkIndex,
              timestamp: Date.now(),
              duration: this.isRecording ? Date.now() - this.recordingStartTime : 0
            });
          };
        } catch (innerError) {
          console.error('Error in IndexedDB transaction:', innerError);
        }
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event);
      };
    } catch (error) {
      console.error('Error saving chunk to storage:', error);
    }
  }

  // Save complete recording to storage
  private saveCompleteRecordingToStorage(): void {
    if (!this.mainBlob) return;

    try {
      // Use IndexedDB to store the complete recording
      const request = indexedDB.open('AudioRecordingDB', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('recordings')) {
          db.createObjectStore('recordings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;

          // Check if the object store exists
          if (!db.objectStoreNames.contains('recordings')) {
            // Create the store if it doesn't exist
            const version = db.version + 1;
            db.close();
            const upgradeRequest = indexedDB.open('AudioRecordingDB', version);

            upgradeRequest.onupgradeneeded = (e) => {
              const upgradeDb = (e.target as IDBOpenDBRequest).result;
              if (!upgradeDb.objectStoreNames.contains('recordings')) {
                upgradeDb.createObjectStore('recordings', { keyPath: 'id' });
              }
              if (!upgradeDb.objectStoreNames.contains('chunks')) {
                upgradeDb.createObjectStore('chunks', { keyPath: 'id' });
              }
            };

            upgradeRequest.onsuccess = () => {
              this.saveCompleteRecordingToStorage(); // Try again after upgrade
            };

            return;
          }

          const transaction = db.transaction(['recordings'], 'readwrite');
          const store = transaction.objectStore('recordings');

          // First clear all existing recordings
          store.clear().onsuccess = () => {
            // Then store only the latest recording
            store.put({
              id: 'latest_recording',
              data: this.mainBlob,
              timestamp: Date.now(),
              duration: this.recordingStartTime ? Date.now() - this.recordingStartTime : 0
            });
          };
        } catch (innerError) {
          console.error('Error in IndexedDB transaction:', innerError);
        }
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event);
      };
    } catch (error) {
      console.error('Error saving recording to storage:', error);
    }
  }

  // Check for and recover previous recording
  async checkForRecovery(): Promise<{ hasRecovery: boolean, recording?: Blob }> {
    return new Promise((resolve) => {
      try {
        // Check if IndexedDB is available
        if (!window.indexedDB) {
          console.log('IndexedDB not supported');
          resolve({ hasRecovery: false });
          return;
        }

        const request = indexedDB.open('AudioRecordingDB', 1);

        request.onupgradeneeded = (event) => {
          // Create stores if they don't exist
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('recordings')) {
            db.createObjectStore('recordings', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('chunks')) {
            db.createObjectStore('chunks', { keyPath: 'id' });
          }
          // No data yet, so no recovery
          resolve({ hasRecovery: false });
        };

        request.onsuccess = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;

            // Check if the recordings store exists
            if (!db.objectStoreNames.contains('recordings')) {
              console.log('Recordings store does not exist');
              resolve({ hasRecovery: false });
              return;
            }

            try {
              const transaction = db.transaction(['recordings'], 'readonly');
              const store = transaction.objectStore('recordings');
              const getRequest = store.get('latest_recording');

              getRequest.onsuccess = () => {
                const recording = getRequest.result;

                if (recording && recording.data) {
                  console.log('Found latest recording with duration:', recording.duration);

                  // Return the latest recording
                  resolve({
                    hasRecovery: true,
                    recording: recording.data
                  });
                } else {
                  console.log('No recordings found');
                  resolve({ hasRecovery: false });
                }
              };

              getRequest.onerror = (e) => {
                console.error('Error getting recordings:', e);
                resolve({ hasRecovery: false });
              };
            } catch (txError) {
              console.error('Transaction error:', txError);
              resolve({ hasRecovery: false });
            }
          } catch (dbError) {
            console.error('Database error:', dbError);
            resolve({ hasRecovery: false });
          }
        };

        request.onerror = (event) => {
          console.error('IndexedDB error:', event);
          resolve({ hasRecovery: false });
        };
      } catch (error) {
        console.error('Error checking for recovery:', error);
        resolve({ hasRecovery: false });
      }
    });
  }

  // Clear all stored recordings
  clearStoredRecordings(): Promise<void> {
    return new Promise((resolve) => {
      try {
        // Check if IndexedDB is available
        if (!window.indexedDB) {
          console.log('IndexedDB not supported');
          resolve();
          return;
        }

        const request = indexedDB.open('AudioRecordingDB', 1);

        request.onupgradeneeded = (event) => {
          // Create stores if they don't exist
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('recordings')) {
            db.createObjectStore('recordings', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('chunks')) {
            db.createObjectStore('chunks', { keyPath: 'id' });
          }
          resolve();
        };

        request.onsuccess = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;

            // Check if the stores exist
            if (!db.objectStoreNames.contains('chunks') && !db.objectStoreNames.contains('recordings')) {
              resolve();
              return;
            }

            // Clear chunks store
            if (db.objectStoreNames.contains('chunks')) {
              try {
                const chunksTransaction = db.transaction(['chunks'], 'readwrite');
                const chunksStore = chunksTransaction.objectStore('chunks');
                const clearRequest = chunksStore.clear();

                clearRequest.onsuccess = () => {
                  console.log('Chunks store cleared');
                };

                clearRequest.onerror = (e) => {
                  console.error('Error clearing chunks store:', e);
                };
              } catch (chunksError) {
                console.error('Error with chunks transaction:', chunksError);
              }
            }

            // Clear recordings store
            if (db.objectStoreNames.contains('recordings')) {
              try {
                const recordingsTransaction = db.transaction(['recordings'], 'readwrite');
                const recordingsStore = recordingsTransaction.objectStore('recordings');
                const clearRequest = recordingsStore.clear();

                clearRequest.onsuccess = () => {
                  console.log('Recordings store cleared');
                };

                clearRequest.onerror = (e) => {
                  console.error('Error clearing recordings store:', e);
                };
              } catch (recordingsError) {
                console.error('Error with recordings transaction:', recordingsError);
              }
            }

            resolve();
          } catch (dbError) {
            console.error('Database error:', dbError);
            resolve();
          }
        };

        request.onerror = (event) => {
          console.error('IndexedDB error:', event);
          resolve();
        };
      } catch (error) {
        console.error('Error clearing stored recordings:', error);
        resolve();
      }
    });
  }
}
