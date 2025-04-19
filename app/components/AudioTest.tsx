'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

export default function AudioTest() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        toast.success('Recording saved successfully!');
      };
      
      audioChunksRef.current = [];
      mediaRecorder.start();
      setRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };
  
  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Audio Recording Test</h2>
      
      <div className="flex gap-4 mb-4">
        {!recording ? (
          <button 
            onClick={startRecording}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Start Test Recording
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Stop Test Recording
          </button>
        )}
      </div>
      
      {audioURL && (
        <div className="mt-4">
          <p className="mb-2">Test Recording:</p>
          <audio src={audioURL} controls className="w-full" />
        </div>
      )}
    </div>
  );
}
