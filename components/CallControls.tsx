import React from 'react';

interface CallControlsProps {
  status: 'connecting' | 'connected' | 'error';
  onEndCall: () => void;
}

const CallControls: React.FC<CallControlsProps> = ({ status, onEndCall }) => {
  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Connected - Live';
      case 'error':
        return 'Connection Error';
      default:
        return '';
    }
  };

  return (
    <div className="flex items-center justify-center flex-col p-4">
      <p className="text-sm text-gray-400 mb-4">{getStatusText()}</p>
      <button
        onClick={onEndCall}
        className="w-16 h-16 rounded-full flex items-center justify-center transition-colors bg-red-500 hover:bg-red-600"
        aria-label="End call"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l-8 8M8 8l8 8" />
        </svg>
      </button>
    </div>
  );
};

export default CallControls;