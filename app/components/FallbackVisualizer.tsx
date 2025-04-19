'use client';

import { useEffect, useRef, useState } from 'react';

interface FallbackVisualizerProps {
  isRecording: boolean;
}

export default function FallbackVisualizer({ isRecording }: FallbackVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [randomSeed] = useState(() => Math.random()); // Random seed for variation
  const [audioLevel, setAudioLevel] = useState(0);

  // Get audio level from the parent component
  useEffect(() => {
    if (isRecording) {
      // Listen for audio level updates from the global window object
      const handleAudioLevelUpdate = (event: CustomEvent) => {
        setAudioLevel(event.detail.level);
      };

      window.addEventListener('audio-level-update' as any, handleAudioLevelUpdate as any);

      return () => {
        window.removeEventListener('audio-level-update' as any, handleAudioLevelUpdate as any);
      };
    }
  }, [isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions with higher resolution for sharper rendering
    const setCanvasDimensions = () => {
      const displaySize = 240;
      const scale = window.devicePixelRatio || 2;

      canvas.width = displaySize * scale;
      canvas.height = displaySize * scale;

      // Scale the context to ensure correct drawing operations
      ctx.scale(scale, scale);

      // Set the CSS size
      canvas.style.width = `${displaySize}px`;
      canvas.style.height = `${displaySize}px`;
    };

    setCanvasDimensions();

    // Animation variables
    let phase = 0;

    // Generate random bar properties for more modern look
    const barCount = 64; // More bars for smoother appearance
    const bars = Array.from({ length: barCount }, (_, i) => ({
      speed: 0.3 + Math.random() * 0.3, // Slower for smoother animation
      offset: randomSeed * Math.PI * 2 + (i / barCount) * Math.PI * 2,
      maxHeight: 5 + Math.random() * 5, // Base height (will be amplified by audio level)
      frequency: 1 + Math.floor(Math.random() * 3) // Different frequency ranges
    }));

    // Draw function
    const draw = () => {
      if (!canvas || !ctx) return;

      // Get the display size
      const displayWidth = parseInt(canvas.style.width || '240', 10);
      const displayHeight = parseInt(canvas.style.height || '240', 10);

      // Clear canvas
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      // Center of the canvas
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;

      // Base circle radius
      const baseRadius = displayWidth * 0.25;

      // Draw base white circle with modern gradient
      const gradient = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.5,
        centerX, centerY, baseRadius
      );
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add subtle inner shadow for depth
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();
      ctx.shadowColor = 'transparent';

      if (isRecording) {
        // Apply non-linear scaling to make the visualization more responsive
        // This makes quiet sounds more visible
        const scaledLevel = Math.pow(audioLevel / 100, 0.5) * 100;

        // Draw animated bars around the circle
        const barWidth = 2; // Thinner bars for modern look
        const barGap = 1;

        for (let i = 0; i < barCount; i++) {
          const bar = bars[i];
          // Calculate position around the circle
          const angle = (i / barCount) * Math.PI * 2;

          // Calculate frequency-based multiplier (simulates frequency bands)
          let freqMultiplier = 1;
          if (bar.frequency === 1) freqMultiplier = 0.8 + (scaledLevel / 100) * 1.5; // Low freq
          if (bar.frequency === 2) freqMultiplier = 0.5 + (scaledLevel / 100) * 2.0; // Mid freq
          if (bar.frequency === 3) freqMultiplier = 0.3 + (scaledLevel / 100) * 2.5; // High freq

          // Calculate bar height with multiple sine waves and audio level
          const primaryWave = Math.sin(phase * bar.speed + bar.offset) * 0.3 + 0.7;
          const secondaryWave = Math.sin(phase * bar.speed * 1.5 + bar.offset * 0.7) * 0.2 + 0.8;
          const combinedWave = (primaryWave * 0.7 + secondaryWave * 0.3);

          // Apply audio level to bar height with frequency-based multiplier
          const barHeight = bar.maxHeight + (scaledLevel / 10) * freqMultiplier * combinedWave * 3;

          // Calculate start and end points
          const startX = centerX + Math.cos(angle) * (baseRadius + 2);
          const startY = centerY + Math.sin(angle) * (baseRadius + 2);
          const endX = centerX + Math.cos(angle) * (baseRadius + 2 + barHeight);
          const endY = centerY + Math.sin(angle) * (baseRadius + 2 + barHeight);

          // Draw bar with gradient
          const barGradient = ctx.createLinearGradient(startX, startY, endX, endY);
          barGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          barGradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.lineWidth = barWidth;
          ctx.lineCap = 'round';
          ctx.strokeStyle = barGradient;
          ctx.stroke();
        }

        // Add dynamic glow effect based on audio level
        const glowIntensity = scaledLevel / 100;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${glowIntensity * 0.15})`;
        ctx.filter = `blur(${8 + glowIntensity * 5}px)`;
        ctx.fill();
        ctx.filter = 'none';

        // Update phase for animation - speed varies based on audio level
        phase += 0.03 + (scaledLevel / 100) * 0.05;
      } else {
        // Subtle animation even when not recording
        phase += 0.01;

        // Draw subtle pulsing circle
        const pulseSize = Math.sin(phase) * 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    // Animation loop
    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, randomSeed, audioLevel]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-full"
      style={{ width: '240px', height: '240px' }}
    />
  );
}
