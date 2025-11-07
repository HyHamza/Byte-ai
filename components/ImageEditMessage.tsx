import React from 'react';
import { ImageMessage } from '../types';

const ModelIcon = () => (
    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
    </div>
);

interface ImageEditMessageProps {
  message: ImageMessage;
}

const ImageEditMessage: React.FC<ImageEditMessageProps> = ({ message }) => {
  return (
    <div className="flex items-start gap-4">
      <ModelIcon />
      <div className="max-w-[85%] md:max-w-[75%] w-full rounded-2xl p-4 bg-gray-700 rounded-bl-none">
        <p className="mb-3 text-gray-200 italic">"{message.prompt}"</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold mb-2 text-center text-gray-400">Original</h4>
            <img src={message.sourceImageUrl} alt="Original image to be edited" className="rounded-lg w-full aspect-square object-cover" />
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2 text-center text-gray-400">Result</h4>
            {message.resultImageUrl ? (
              <img src={message.resultImageUrl} alt="Edited image result" className="rounded-lg w-full aspect-square object-cover" />
            ) : (
              <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditMessage;
