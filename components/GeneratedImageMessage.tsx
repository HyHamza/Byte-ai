
import React from 'react';
import { GeneratedImageMessage as GeneratedImageMessageData } from '../types';

const ModelIcon = () => (
    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
    </div>
);

interface GeneratedImageMessageProps {
  message: GeneratedImageMessageData;
}

const GeneratedImageMessage: React.FC<GeneratedImageMessageProps> = ({ message }) => {
  return (
    <div className="flex items-start gap-4">
      <ModelIcon />
      <div className="max-w-[85%] md:max-w-[75%] w-full rounded-2xl p-4 bg-gray-700 rounded-bl-none">
        <p className="mb-3 text-gray-200 italic">"{message.prompt}"</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {message.imageUrls.length > 0 ? (
            message.imageUrls.map((url, index) => (
              <img key={index} src={url} alt={`Generated image ${index + 1} for prompt: ${message.prompt}`} className="rounded-lg w-full aspect-square object-cover" />
            ))
          ) : (
            // Loading state
            Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneratedImageMessage;
