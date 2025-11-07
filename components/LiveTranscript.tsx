import React from 'react';
import { LiveTranscriptPart } from '../types';

interface LiveTranscriptProps {
  transcript: LiveTranscriptPart[];
}

const LiveTranscript: React.FC<LiveTranscriptProps> = ({ transcript }) => {
  return (
    <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg h-32 overflow-y-auto mb-4 text-gray-300">
      {transcript.length === 0 && <p className="text-gray-500">Listening...</p>}
      {transcript.map((part, index) => (
        <span key={index} className={`${part.source === 'user' ? 'text-blue-400' : 'text-purple-300'}`}>
          {part.text}
        </span>
      ))}
    </div>
  );
};

export default LiveTranscript;
