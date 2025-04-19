'use client';

import { useEffect, useRef, useState } from 'react';

interface VoiceWaveformProps {
  isRecording: boolean;
  audioLevel: number;
}

export default function VoiceWaveform({ isRecording, audioLevel }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = useState(160); // Default size

  // Wave properties
  const waveCount = 5; // Number of waves
  const waveColors = [
    'rgba(255, 255, 255, 0.9)',
    'rgba(255, 255, 255, 0.8)',
    'rgba(255, 255, 255, 0.6)',
    'rgba(255, 255, 255, 0.4)',
    'rgba(255, 255, 255, 0.2)'
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions with higher resolution for sharper rendering
    const setCanvasDimensions = () => {
      const displaySize = Math.min(window.innerWidth * 0.8, 300);
      setCanvasSize(displaySize);

      // Use higher resolution for canvas (2x)
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
    window.addEventListener('resize', setCanvasDimensions);

    // Animation variables
    let phase = 0;
    const waves: {
      amplitude: number;
      frequency: number;
      speed: number;
      offset: number;
    }[] = [];

    // Initialize waves with different properties for more organic movement
    for (let i = 0; i < waveCount; i++) {
      waves.push({
        amplitude: 4 + Math.random() * 4,
        frequency: 0.05 + Math.random() * 0.05,
        speed: 0.03 + Math.random() * 0.07,
        offset: Math.random() * Math.PI * 2 // Random phase offset for each wave
      });
    }

    // Draw function
    const draw = () => {
      if (!canvas || !ctx) return;

      // Get the display size (not the actual canvas pixel size)
      const displayWidth = parseInt(canvas.style.width || `${canvasSize}`, 10);
      const displayHeight = parseInt(canvas.style.height || `${canvasSize}`, 10);

      // Clear canvas - use the display size, not the actual canvas size
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      // Center of the canvas
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;

      // Base circle radius
      const baseRadius = Math.min(displayWidth, displayHeight) * 0.35;

      // Draw base white circle with subtle gradient
      const gradient = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.7,
        centerX, centerY, baseRadius
      );
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add subtle inner shadow
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();
      ctx.shadowColor = 'transparent';

      if (isRecording) {
        // Calculate dynamic amplitude based on audio level with non-linear scaling
        // This makes it more responsive to quiet sounds
        const scaledLevel = Math.pow(audioLevel / 100, 0.7) * 100;
        const dynamicAmplitude = (scaledLevel / 100) * 35;

        // Draw each wave
        for (let w = 0; w < waves.length; w++) {
          const wave = waves[w];
          const waveRadius = baseRadius + 3 + (w * 4);

          ctx.beginPath();

          // Draw wave around the circle with higher resolution
          for (let angle = 0; angle < Math.PI * 2; angle += 0.005) {
            // Calculate wave effect with multiple frequencies for more organic movement
            const primaryWave = Math.sin(angle * 8 + phase * wave.speed + wave.offset) * wave.amplitude;
            const secondaryWave = Math.sin(angle * 12 + phase * wave.speed * 1.5) * (wave.amplitude * 0.3);
            const tertiaryWave = Math.sin(angle * 5 + phase * wave.speed * 0.7) * (wave.amplitude * 0.2);

            // Combine waves and apply dynamic amplitude
            const combinedWave = (primaryWave + secondaryWave + tertiaryWave) * (1 + dynamicAmplitude / 15);

            // Add a subtle pulse effect based on audio level
            const pulseEffect = 1 + (Math.sin(phase * 2) * 0.03 * scaledLevel / 100);

            const noisyRadius = waveRadius * pulseEffect + combinedWave;

            const x = centerX + Math.cos(angle) * noisyRadius;
            const y = centerY + Math.sin(angle) * noisyRadius;

            if (angle === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          ctx.closePath();

          // Create gradient for wave
          const waveGradient = ctx.createLinearGradient(
            centerX - waveRadius, centerY - waveRadius,
            centerX + waveRadius, centerY + waveRadius
          );
          waveGradient.addColorStop(0, waveColors[w]);
          waveGradient.addColorStop(1, waveColors[Math.min(w + 1, waveColors.length - 1)]);

          ctx.strokeStyle = waveGradient;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Add subtle glow effect when audio level is high
        if (audioLevel > 30) {
          const glowIntensity = (audioLevel - 30) / 70; // 0 to 1 scale
          ctx.beginPath();
          ctx.arc(centerX, centerY, baseRadius * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${glowIntensity * 0.2})`;
          ctx.filter = `blur(${glowIntensity * 10}px)`;
          ctx.fill();
          ctx.filter = 'none';
        }

        // Update phase for animation - speed based on audio level
        phase += 0.05 + (audioLevel / 100) * 0.1;
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
      window.removeEventListener('resize', setCanvasDimensions);
    };
  }, [isRecording, audioLevel, canvasSize]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="rounded-full"
        style={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}
      />
    </div>
  );
}
