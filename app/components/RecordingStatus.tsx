'use client';

import { useEffect, useState } from 'react';
import { FaCheckCircle } from 'react-icons/fa';

interface RecordingStatusProps {
  isRecording: boolean;
  elapsedTime: number;
  currentChunkIndex: number;
  chunkDuration: number;
}

export default function RecordingStatus({
  isRecording,
  elapsedTime,
  currentChunkIndex,
  chunkDuration
}: RecordingStatusProps) {
  const [showBackupNotification, setShowBackupNotification] = useState(false);
  const [lastChunkTime, setLastChunkTime] = useState(0);

  // Format time as MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress towards next chunk
  const chunkProgress = ((elapsedTime % chunkDuration) / chunkDuration) * 100;

  // Show backup notification when a new chunk is saved
  useEffect(() => {
    // Skip during server-side rendering
    if (typeof window === 'undefined') return;

    if (currentChunkIndex > 0 && lastChunkTime !== currentChunkIndex) {
      setLastChunkTime(currentChunkIndex);
      setShowBackupNotification(true);

      // Hide notification after 3 seconds
      const timer = setTimeout(() => {
        setShowBackupNotification(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentChunkIndex, lastChunkTime]);

  return (
    <div className="w-full">
      {/* Recording timer */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-lg font-semibold">
          {formatTime(elapsedTime)}
        </div>

        {/* Backup notification */}
        {showBackupNotification && (
          <div className="flex items-center text-sm text-green-400 animate-fadeOut">
            <FaCheckCircle className="mr-1" />
            Backup saved
          </div>
        )}
      </div>

      {/* Progress bar for current chunk */}
      {isRecording && (
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ width: `${chunkProgress}%` }}
          />
        </div>
      )}

      {/* Saved chunks indicator (only show if there are chunks) */}
      {currentChunkIndex > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          {currentChunkIndex} {currentChunkIndex === 1 ? 'backup' : 'backups'} saved
        </div>
      )}
    </div>
  );
}
