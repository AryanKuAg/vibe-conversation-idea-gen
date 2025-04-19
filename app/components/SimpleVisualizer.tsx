'use client';

import { useEffect, useRef } from 'react';

interface SimpleVisualizerProps {
  isRecording: boolean;
  mediaRecorder?: MediaRecorder | null;
  blob?: Blob | null;
  width: number;
  height: number;
}

export default function SimpleVisualizer({
  isRecording,
  mediaRecorder,
  blob,
  width,
  height
}: SimpleVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Set up visualization for recording
  useEffect(() => {
    // Only run this effect on the client side
    if (typeof window === 'undefined') return;

    if (!isRecording || !mediaRecorder || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Create audio context and analyzer
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.minDecibels = -85;
      analyserRef.current.maxDecibels = -10;
      analyserRef.current.smoothingTimeConstant = 0.6;

      // Get the media stream from the media recorder
      const stream = mediaRecorder.stream;
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      // Start visualization
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const draw = () => {
        if (!canvas || !ctx || !analyserRef.current) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get frequency data
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate bar width and gap
        const barCount = Math.min(dataArray.length, 128);
        const barWidth = 2;
        const gap = 1;
        const totalWidth = barCount * (barWidth + gap) - gap;
        const startX = (canvas.width - totalWidth) / 2;

        // Draw bars
        for (let i = 0; i < barCount; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
          const x = startX + i * (barWidth + gap);
          const y = (canvas.height - barHeight) / 2;

          ctx.fillStyle = 'white';
          ctx.fillRect(x, y, barWidth, barHeight);
        }

        // Continue animation
        animationRef.current = requestAnimationFrame(draw);
      };

      // Start animation
      draw();
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
    }

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }

      analyserRef.current = null;
    };
  }, [isRecording, mediaRecorder, width, height]);

  // Set up visualization for playback
  useEffect(() => {
    // Only run this effect on the client side
    if (typeof window === 'undefined') return;

    if (isRecording || !blob || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Create audio element for playback visualization
    const audioElement = new Audio();
    audioElement.src = URL.createObjectURL(blob);
    audioElementRef.current = audioElement;

    // Create audio context and analyzer
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.minDecibels = -85;
      analyserRef.current.maxDecibels = -10;
      analyserRef.current.smoothingTimeConstant = 0.6;

      // Connect audio element to analyzer
      const source = audioContextRef.current.createMediaElementSource(audioElement);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      // Start visualization
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const draw = () => {
        if (!canvas || !ctx || !analyserRef.current) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get frequency data
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate bar width and gap
        const barCount = Math.min(dataArray.length, 128);
        const barWidth = 2;
        const gap = 1;
        const totalWidth = barCount * (barWidth + gap) - gap;
        const startX = (canvas.width - totalWidth) / 2;

        // Draw bars
        for (let i = 0; i < barCount; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
          const x = startX + i * (barWidth + gap);
          const y = (canvas.height - barHeight) / 2;

          ctx.fillStyle = 'white';
          ctx.fillRect(x, y, barWidth, barHeight);
        }

        // Continue animation
        animationRef.current = requestAnimationFrame(draw);
      };

      // Start animation
      draw();
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
    }

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (audioElementRef.current) {
        const url = audioElementRef.current.src;
        audioElementRef.current = null;
        URL.revokeObjectURL(url);
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }

      analyserRef.current = null;
    };
  }, [isRecording, blob, width, height]);

  // Draw a simple line when not recording or playing
  useEffect(() => {
    // Only run this effect on the client side
    if (typeof window === 'undefined') return;

    if ((isRecording && mediaRecorder) || (!isRecording && blob)) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw a simple line
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.1, canvas.height / 2);
    ctx.lineTo(canvas.width * 0.9, canvas.height / 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

  }, [isRecording, mediaRecorder, blob, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
