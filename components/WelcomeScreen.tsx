
import React from 'react';

interface WelcomeScreenProps {
  onPromptClick: (prompt: string) => void;
}

const ExamplePrompts = [
    { title: "Plan a trip", description: "to see the Northern Lights" },
    { title: "Write a thank-you note", description: "to my interviewer" },
    { title: "Explain a concept", description: "like quantum computing in simple terms" },
    { title: "Give me ideas", description: "for a 10-year-old’s birthday party" }
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPromptClick }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-300 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        Hello! How can I help today?
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-12 w-full max-w-2xl">
        {ExamplePrompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onPromptClick(`${prompt.title} ${prompt.description}`)}
            className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition-colors duration-200"
          >
            <p className="font-semibold text-white">{prompt.title}</p>
            <p className="text-sm text-gray-400">{prompt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WelcomeScreen;
