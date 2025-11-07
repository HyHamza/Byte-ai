
import React from 'react';
import { Mode } from '../types';

interface HeaderProps {
    onNewChat: () => void;
    mode: Mode;
    setMode: (mode: Mode) => void;
}

const Header: React.FC<HeaderProps> = ({ onNewChat, mode, setMode }) => {
    return (
        <header className="flex items-center justify-between p-2 md:p-4 border-b border-gray-700 bg-[#212121] z-10 flex-wrap">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                </div>
                <h1 className="text-lg md:text-xl font-semibold text-gray-200">Gemini Chat</h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
                 <div className="relative">
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as Mode)}
                        className="appearance-none bg-gray-700 text-white text-sm font-medium rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                        {Object.values(Mode).map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
                <button
                    onClick={onNewChat}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden md:inline">New Chat</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
