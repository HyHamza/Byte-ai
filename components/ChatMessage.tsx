
import React from 'react';
import { TextMessage, Role } from '../types';

interface ChatMessageProps {
  message: TextMessage;
  isGenerating: boolean;
  onSpeak: () => void;
  isSpeaking: boolean;
}

const UserIcon = () => (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white flex-shrink-0">
        U
    </div>
);

const ModelIcon = () => (
    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
    </div>
);


const BlinkingCursor = () => (
    <span className="inline-block w-2 h-5 bg-gray-400 animate-pulse ml-1" aria-hidden="true"></span>
);

// Simple markdown-to-HTML, very basic for demonstration
const formatText = (text: string) => {
    // Escape HTML to prevent XSS
    const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
        
    const formatted = escapedText
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-900 rounded-md p-3 my-2 overflow-x-auto"><code>$1</code></pre>')
        // Inline code
        .replace(/`(.*?)`/g, '<code class="bg-gray-700 rounded-sm px-1.5 py-0.5 text-red-300">$1</code>')
        // New lines
        .replace(/\n/g, '<br />');

    return { __html: formatted };
};

const SpeakerIcon = ({ isSpeaking }: { isSpeaking: boolean }) => {
    if (isSpeaking) {
        return (
             <div className="w-4 h-4 flex items-center justify-center">
                <span className="w-1 h-1 bg-white rounded-full animate-pulse delay-0"></span>
                <span className="w-1 h-1 bg-white rounded-full animate-pulse delay-150 mx-0.5"></span>
                <span className="w-1 h-1 bg-white rounded-full animate-pulse delay-300"></span>
            </div>
        )
    }
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
        </svg>
    )
};


const ChatMessage: React.FC<ChatMessageProps> = ({ message, isGenerating, onSpeak, isSpeaking }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
        {!isUser && <ModelIcon />}
        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${isUser ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
             {message.imageUrl && (
                <img src={message.imageUrl} alt="User upload" className="rounded-lg mb-3 max-h-60 w-auto" />
             )}
            <div className="prose prose-invert prose-sm md:prose-base leading-relaxed" dangerouslySetInnerHTML={formatText(message.text)}></div>
            {isGenerating && message.text.length === 0 && <BlinkingCursor />}
            {message.groundingSources && message.groundingSources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-600">
                    <h4 className="text-xs font-semibold text-gray-400 mb-2">Sources:</h4>
                    <div className="flex flex-col gap-2">
                        {message.groundingSources.map((source, i) => (
                            <a href={source.uri} key={i} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate block">
                                {i+1}. {source.title || source.uri}
                            </a>
                        ))}
                    </div>
                </div>
            )}
            {!isUser && message.text && !isGenerating && (
                <div className="text-right -mr-2 -mb-2 mt-2">
                    <button onClick={onSpeak} disabled={isSpeaking} className="p-2 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white transition-colors disabled:opacity-50">
                       <SpeakerIcon isSpeaking={isSpeaking} />
                    </button>
                </div>
            )}
        </div>
        {isUser && <UserIcon />}
    </div>
  );
};

export default ChatMessage;
