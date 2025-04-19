import { useState, useEffect, useRef } from 'react';

export default function EnhancedAudioVisualizer() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioData, setAudioData] = useState<number[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Create audio context with cross-browser support
      const AudioContextClass = window.AudioContext || 
        ((window as any).webkitAudioContext as typeof AudioContext);
      
      audioContextRef.current = new AudioContextClass();
      
      // Create analyser with more detailed settings for better visualization
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 512; // More detailed frequency data
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.85;
      
      analyserRef.current = analyser;
      
      // Initialize data array
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      // Connect microphone to analyser
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Start analyzing audio
      updateAudioData();
      
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Unable to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;
    setIsRecording(false);
    setAudioLevel(0);
    setAudioData([]);
  };

  const updateAudioData = () => {
    if (!analyserRef.current || !dataArrayRef.current || !isRecording) return;
    
    // Get frequency data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Calculate overall audio level
    const sum = dataArrayRef.current.reduce((acc, val) => acc + val, 0);
    const avg = sum / dataArrayRef.current.length;
    const scaledLevel = Math.min(100, Math.max(0, avg * 2));
    
    // Create array of processed data for visualization (use only part of the spectrum)
    const processedData = Array.from(dataArrayRef.current.slice(0, 128))
      .map(value => value / 255); // Normalize to 0-1
    
    setAudioLevel(scaledLevel);
    setAudioData(processedData);
    
    // Continue updating
    animationFrameRef.current = requestAnimationFrame(updateAudioData);
  };

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Interactive Audio Visualizer</h2>
      
      <div className="w-full h-96 bg-black rounded-lg p-4 mb-6 relative overflow-hidden">
        <DynamicVisualizer 
          isRecording={isRecording} 
          audioLevel={audioLevel} 
          audioData={audioData} 
        />
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={toggleRecording}
          className={`px-6 py-3 rounded-full font-bold text-lg transition-all ${
            isRecording 
              ? "bg-red-500 hover:bg-red-600 text-white" 
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {isRecording ? "Stop Microphone" : "Start Microphone"}
        </button>
        
        {isRecording && (
          <div className="flex items-center bg-gray-800 px-4 py-2 rounded-full">
            <div className="w-4 h-4 rounded-full bg-red-500 mr-2 animate-pulse"></div>
            <span className="text-white font-medium">Recording...</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface VisualizerProps {
  isRecording: boolean;
  audioLevel: number;
  audioData: number[];
}

function DynamicVisualizer({ isRecording, audioLevel, audioData }: VisualizerProps) {
  // Render different visualizations depending on state
  return (
    <div className="w-full h-full relative">
      {/* Base background animation */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-purple-900">
        {isRecording && audioLevel > 5 && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-blue-500/30 animate-pulse" 
               style={{ animationDuration: `${1000 - audioLevel * 5}ms` }}></div>
        )}
      </div>
      
      {/* Main circular visualizer */}
      <div className="absolute inset-0 flex items-center justify-center">
        <CircularVisualizer audioData={audioData} isRecording={isRecording} audioLevel={audioLevel} />
      </div>
      
      {/* Wave visualizer on bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40">
        <WaveVisualizer audioData={audioData} isRecording={isRecording} audioLevel={audioLevel} />
      </div>
      
      {/* Status text */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white font-bold text-lg bg-black/30 px-4 py-1 rounded-full">
        {isRecording ? 
          (audioLevel < 5 ? "Waiting for sound..." : 
           audioLevel < 30 ? "I hear you!" : 
           audioLevel < 60 ? "Nice and clear!" : 
           "Wow, that's loud!") : 
          "Click Start to begin"
        }
      </div>
    </div>
  );
}

function CircularVisualizer({ audioData, isRecording, audioLevel }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      const size = Math.min(container.clientWidth, container.clientHeight) * 0.8;
      canvas.width = size;
      canvas.height = size;
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    let rotation = 0;
    
    const draw = () => {
      if (!canvas || !ctx) return;
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      if (isRecording && audioData.length > 0) {
        // Draw circles
        const maxRadius = Math.min(width, height) * 0.4;
        const minRadius = maxRadius * 0.2;
        const particles = 32;
        
        // Rotate the entire visualization
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        rotation += 0.005 + (audioLevel / 5000);
        
        // Draw circular bars
        for (let i = 0; i < particles; i++) {
          const angle = (i / particles) * Math.PI * 2;
          const dataIndex = Math.floor((i / particles) * audioData.length);
          const value = audioData[dataIndex] || 0;
          
          // Calculate radius with audio reactivity
          const radius = minRadius + (value * (maxRadius - minRadius));
          
          // Calculate position
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          // Draw connecting lines
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(x, y);
          ctx.lineWidth = 2 + value * 5;
          
          // Color based on position and audio level
          const hue = (240 + i * 5 + audioLevel) % 360;
          ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.4 + value * 0.6})`;
          ctx.stroke();
          
          // Draw particle at end
          ctx.beginPath();
          ctx.arc(x, y, 3 + value * 8, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 90%, 70%, ${0.8 + value * 0.2})`;
          ctx.fill();
        }
        
        ctx.restore();
        
        // Draw inner pulsing circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, minRadius * (0.8 + audioLevel / 100), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + audioLevel / 200})`;
        ctx.fill();
      } else {
        // Draw idle state - simple pulsing circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, width * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 100, 255, 0.2)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, width * 0.15, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(150, 150, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };
    
    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [isRecording, audioData, audioLevel]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="block"
      style={{ 
        opacity: isRecording ? 1 : 0.7,
        transition: 'opacity 0.5s ease-in-out'
      }}
    />
  );
}

function WaveVisualizer({ audioData, isRecording, audioLevel }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    // Keep track of wave movement
    let phase = 0;
    
    const draw = () => {
      if (!canvas || !ctx) return;
      
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      if (isRecording) {
        // Draw audio waveform
        ctx.beginPath();
        
        // Start at left side
        ctx.moveTo(0, height / 2);
        
        const points = 100; // Number of points in the wave
        
        for (let i = 0; i <= points; i++) {
          const x = (width * i) / points;
          
          // Get data point (or interpolate)
          const dataIndex = Math.floor((i / points) * audioData.length);
          const value = audioData[dataIndex] || 0;
          
          // Calculate y position with some wave movement
          const sineOffset = Math.sin(phase + i * 0.2) * 10;
          const amplitude = height * 0.4 * value; // Scale based on audio value
          const y = (height / 2) + sineOffset + (isRecording ? -amplitude : 0);
          
          // Draw point
          ctx.lineTo(x, y);
        }
        
        // Complete the path
        ctx.lineTo(width, height / 2);
        
        // Create gradient for the wave
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `rgba(150, 100, 255, ${0.5 + audioLevel/200})`);
        gradient.addColorStop(1, 'rgba(50, 50, 250, 0.1)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw stroke on top
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(200, 200, 255, ${0.7 + audioLevel/300})`;
        ctx.stroke();
        
        // Update wave movement
        phase += 0.05 + (audioLevel / 500); // Speed based on audio level
      } else {
        // Draw idle state - flat line with slight movement
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        
        for (let i = 0; i <= 100; i++) {
          const x = (width * i) / 100;
          const y = (height / 2) + Math.sin(phase + i * 0.1) * 2;
          ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = 'rgba(100, 100, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        phase += 0.02;
      }
    };
    
    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [isRecording, audioData, audioLevel]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full h-full"
    />
  );
}