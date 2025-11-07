import React from 'react';
import { TextMessage, Role } from '../types';

interface ChatMessageProps {
  message: TextMessage;
  isGenerating: boolean;
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


const ChatMessage: React.FC<ChatMessageProps> = ({ message, isGenerating }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
        {!isUser && <ModelIcon />}
        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${isUser ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
            <div className="prose prose-invert prose-sm md:prose-base leading-relaxed" dangerouslySetInnerHTML={formatText(message.text)}></div>
            {isGenerating && message.text.length === 0 && <BlinkingCursor />}
        </div>
        {isUser && <UserIcon />}
    </div>
  );
};

export default ChatMessage;