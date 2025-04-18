/**
 * Audio Visualizer Utility
 * 
 * This utility provides functions for visualizing audio input levels
 * during recording.
 */

export interface AudioVisualizerOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
  minDecibels?: number;
  maxDecibels?: number;
}

export class AudioVisualizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private onLevelChange: ((level: number) => void) | null = null;

  constructor(private options: AudioVisualizerOptions = {}) {
    this.options = {
      fftSize: 256,
      smoothingTimeConstant: 0.8,
      minDecibels: -90,
      maxDecibels: -10,
      ...options
    };
  }

  // Initialize the visualizer with a media stream
  initialize(stream: MediaStream, onLevelChange: (level: number) => void): void {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create analyzer
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.options.fftSize || 256;
      this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant || 0.8;
      this.analyser.minDecibels = this.options.minDecibels || -90;
      this.analyser.maxDecibels = this.options.maxDecibels || -10;
      
      // Create media stream source
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.mediaStreamSource.connect(this.analyser);
      
      // Create data array for frequency data
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Set callback
      this.onLevelChange = onLevelChange;
      
      // Start visualization
      this.visualize();
    } catch (error) {
      console.error('Error initializing audio visualizer:', error);
    }
  }

  // Start visualization loop
  private visualize(): void {
    if (!this.analyser || !this.dataArray || !this.onLevelChange) return;

    const updateLevel = () => {
      // Get frequency data
      this.analyser!.getByteFrequencyData(this.dataArray!);
      
      // Calculate average level
      const average = this.dataArray!.reduce((acc, val) => acc + val, 0) / this.dataArray!.length;
      
      // Convert to percentage (0-100)
      const level = Math.min(100, Math.max(0, (average / 255) * 100));
      
      // Call callback with level
      this.onLevelChange(level);
      
      // Continue loop
      this.animationFrameId = requestAnimationFrame(updateLevel);
    };

    // Start loop
    this.animationFrameId = requestAnimationFrame(updateLevel);
  }

  // Stop visualization
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.onLevelChange = null;
  }
}
