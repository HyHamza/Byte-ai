import React, { useState, useRef, useEffect } from 'react';

// TypeScript support for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isGenerating: boolean;
  onStartCall: () => void;
  isAppCreationMode: boolean;
  onToggleAppCreationMode: () => void;
  isImageEditMode: boolean;
  onToggleImageEditMode: () => void;
  onImageUpload: (file: File | null) => void;
  sourceImage: { data: string; mimeType: string } | null;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
    onSendMessage, 
    isGenerating, 
    onStartCall, 
    isAppCreationMode, 
    onToggleAppCreationMode,
    isImageEditMode,
    onToggleImageEditMode,
    onImageUpload,
    sourceImage
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);


  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

       recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          onImageUpload(e.target.files[0]);
      }
  };

  const placeholderText = isAppCreationMode 
    ? "Describe the application you want to build..." 
    : isImageEditMode
    ? "Describe how you want to edit the image..."
    : "Enter a prompt here";

  const isSubmitDisabled = !input.trim() || isGenerating || (isImageEditMode && !sourceImage);

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-gray-800 rounded-2xl shadow-lg">
      {isImageEditMode && (
          <div className="p-2 mb-2 border-b border-gray-700">
              {!sourceImage ? (
                  <label htmlFor="image-upload" className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-300 bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                      Click to upload an image
                      <input id="image-upload" type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleFileChange} disabled={isGenerating} />
                  </label>
              ) : (
                  <div className="flex items-center gap-3">
                      <img src={`data:${sourceImage.mimeType};base64,${sourceImage.data}`} alt="Selected preview" className="w-12 h-12 rounded-md object-cover" />
                      <p className="text-sm text-gray-400 flex-1">Image ready to be edited.</p>
                      <button type="button" onClick={() => onImageUpload(null)} disabled={isGenerating} className="p-2 text-gray-400 hover:text-white rounded-full bg-gray-700 hover:bg-gray-600 transition-colors" aria-label="Remove image">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                  </div>
              )}
          </div>
      )}
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 resize-none focus:outline-none max-h-48"
          rows={1}
          disabled={isGenerating}
        />
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
        >
          {isGenerating ? (
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
          ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
          )}
        </button>
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700">
        <button type="button" onClick={onStartCall} className="p-2 text-gray-400 hover:text-white transition-colors" aria-label="Start call">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
        </button>
         {recognitionRef.current && (
            <button type="button" onClick={toggleListening} className={`p-2 transition-colors ${isListening ? 'text-red-500' : 'text-gray-400 hover:text-white'}`} aria-label="Use microphone">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm5 4a1 1 0 11-2 0V4a1 1 0 112 0v4zM3 9a1 1 0 00-1 1v1a5 5 0 005 5h1a1 1 0 100-2H8a3 3 0 01-3-3v-1a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            </button>
         )}
         <button type="button" onClick={onToggleImageEditMode} className={`p-2 transition-colors ${isImageEditMode ? 'text-green-400' : 'text-gray-400 hover:text-white'}`} aria-label="Toggle image edit mode">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
         </button>
        <button type="button" onClick={onToggleAppCreationMode} className={`p-2 transition-colors ${isAppCreationMode ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`} aria-label="Toggle application creation mode">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 00-1 1v1.586l-1.707 1.707A1 1 0 003 8v6a1 1 0 001 1h2v1.586l-1.707 1.707A1 1 0 005 20h10a1 1 0 00.707-1.707L14 16.586V15h2a1 1 0 001-1V8a1 1 0 00-.293-.707L15 5.586V3a1 1 0 00-1-1H5zm5 4a1 1 0 10-2 0v2a1 1 0 102 0V6z" clipRule="evenodd" /></svg>
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
