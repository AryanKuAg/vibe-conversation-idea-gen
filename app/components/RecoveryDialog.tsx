'use client';

import { useState } from 'react';
import { FaExclamationTriangle, FaCheck, FaTimes } from 'react-icons/fa';

interface RecoveryDialogProps {
  onRecover: () => Promise<void>;
  onDiscard: () => void;
}

export default function RecoveryDialog({ onRecover, onDiscard }: RecoveryDialogProps) {
  const [isRecovering, setIsRecovering] = useState(false);
  
  const handleRecover = async () => {
    setIsRecovering(true);
    await onRecover();
    setIsRecovering(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center mb-4 text-yellow-400">
          <FaExclamationTriangle className="text-2xl mr-3" />
          <h3 className="text-xl font-bold">Recover Previous Recording?</h3>
        </div>
        
        <p className="mb-6 text-gray-300">
          We found a previous recording that wasn't properly saved. Would you like to recover it or start a new recording?
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={onDiscard}
            disabled={isRecovering}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center"
          >
            <FaTimes className="mr-2" /> Discard
          </button>
          
          <button
            onClick={handleRecover}
            disabled={isRecovering}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center"
          >
            {isRecovering ? (
              <>
                <span className="animate-spin mr-2">⟳</span> Recovering...
              </>
            ) : (
              <>
                <FaCheck className="mr-2" /> Recover
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
