/**
 * Enhanced Audio Visualizer Utility
 *
 * This utility provides functions for visualizing audio input levels
 * during recording with improved responsiveness.
 */

export interface AudioVisualizerOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
  minDecibels?: number;
  maxDecibels?: number;
  sensitivity?: number;
}

export class AudioVisualizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private onLevelChange: ((level: number) => void) | null = null;
  private levelHistory: number[] = [];
  private historySize = 5; // Number of samples to keep for smoothing

  constructor(private options: AudioVisualizerOptions = {}) {
    this.options = {
      fftSize: 1024, // Larger FFT size for better frequency resolution
      smoothingTimeConstant: 0.5, // More responsive
      minDecibels: -90,
      maxDecibels: -10,
      sensitivity: 1.5, // Amplification factor for levels
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
      this.analyser.fftSize = this.options.fftSize || 1024;
      this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant || 0.5;
      this.analyser.minDecibels = this.options.minDecibels || -90;
      this.analyser.maxDecibels = this.options.maxDecibels || -10;

      // Create media stream source
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.mediaStreamSource.connect(this.analyser);

      // Create data arrays for frequency and time domain data
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);

      // Set callback
      this.onLevelChange = onLevelChange;

      // Initialize level history
      this.levelHistory = Array(this.historySize).fill(0);

      // Start visualization
      this.visualize();
    } catch (error) {
      console.error('Error initializing audio visualizer:', error);
    }
  }

  // Start visualization loop
  private visualize(): void {
    if (!this.analyser || !this.frequencyData || !this.timeData || !this.onLevelChange) return;

    const updateLevel = () => {
      // Get both frequency and time domain data for better analysis
      this.analyser!.getByteFrequencyData(this.frequencyData!);
      this.analyser!.getByteTimeDomainData(this.timeData!);

      // Calculate RMS (Root Mean Square) from time domain data for volume
      let rms = 0;
      for (let i = 0; i < this.timeData!.length; i++) {
        // Convert from 0-255 to -1 to 1
        const amplitude = (this.timeData![i] / 128) - 1;
        rms += amplitude * amplitude;
      }
      rms = Math.sqrt(rms / this.timeData!.length);

      // Calculate frequency energy (focusing on speech frequencies 300-3000 Hz)
      const speechFreqStart = Math.floor(300 / (this.audioContext!.sampleRate / this.analyser!.fftSize));
      const speechFreqEnd = Math.ceil(3000 / (this.audioContext!.sampleRate / this.analyser!.fftSize));

      let speechEnergy = 0;
      for (let i = speechFreqStart; i < speechFreqEnd && i < this.frequencyData!.length; i++) {
        speechEnergy += this.frequencyData![i];
      }
      speechEnergy /= (speechFreqEnd - speechFreqStart);

      // Combine RMS and frequency data with sensitivity adjustment
      const sensitivity = this.options.sensitivity || 1.5;
      const combinedLevel = (rms * 100 * sensitivity + speechEnergy / 255 * 100) / 2;

      // Add to history and calculate smoothed level
      this.levelHistory.push(combinedLevel);
      if (this.levelHistory.length > this.historySize) {
        this.levelHistory.shift();
      }

      // Use a weighted average that emphasizes recent values
      let weightedSum = 0;
      let weightSum = 0;
      for (let i = 0; i < this.levelHistory.length; i++) {
        const weight = i + 1; // More recent values get higher weights
        weightedSum += this.levelHistory[i] * weight;
        weightSum += weight;
      }

      const smoothedLevel = weightedSum / weightSum;

      // Apply non-linear scaling to make small sounds more visible
      // and prevent excessive movement for loud sounds
      const scaledLevel = Math.pow(smoothedLevel / 100, 0.7) * 100;

      // Ensure the level is within 0-100 range
      const finalLevel = Math.min(100, Math.max(0, scaledLevel));

      // Call callback with level
      this.onLevelChange(finalLevel);

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
    this.frequencyData = null;
    this.timeData = null;
    this.onLevelChange = null;
    this.levelHistory = [];
  }
}
