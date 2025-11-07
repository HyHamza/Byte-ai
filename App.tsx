
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, Modality, Type, LiveSession } from '@google/genai';
import { Message, Role, TextMessage, AppFile, LiveTranscriptPart, AppMessage, ImageMessage } from './types';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import ChatMessage from './components/ChatMessage';
import MessageInput from './components/MessageInput';
import AppPreview from './components/AppPreview';
import ImageEditMessage from './components/ImageEditMessage';
import LiveTranscript from './components/LiveTranscript';
import CallControls from './components/CallControls';
import { encode, decode, decodeAudioData } from './utils/audio';


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [isAppCreationMode, setIsAppCreationMode] = useState(false);
  const [isImageEditMode, setIsImageEditMode] = useState(false);
  const [sourceImage, setSourceImage] = useState<{data: string, mimeType: string} | null>(null);
  
  // Call state
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [liveTranscript, setLiveTranscript] = useState<LiveTranscriptPart[]>([]);
  const sessionPromise = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initializeChat = () => {
    if (process.env.API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
      });
      setChat(newChat);
    }
  };

  useEffect(() => {
    initializeChat();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, liveTranscript]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    setIsGenerating(true);

    if (isAppCreationMode) {
        const userMessage: TextMessage = { role: Role.USER, text, type: 'text' };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        await generateApplication(text);
    } else if (isImageEditMode && sourceImage) {
        await generateImageEdit(text);
    } else {
        const userMessage: TextMessage = { role: Role.USER, text, type: 'text' };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        await generateTextResponse(text);
    }
    
    setIsGenerating(false);
  };

  const generateTextResponse = async (text: string) => {
    if (!chat) return;
    
    const modelMessage: TextMessage = { role: Role.MODEL, text: '', type: 'text' };
    setMessages((prevMessages) => [...prevMessages, modelMessage]);

    try {
      const result = await chat.sendMessageStream({ message: text });
      let accumulatedText = '';
      for await (const chunk of result) {
        accumulatedText += chunk.text;
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          if(lastMessage.type === 'text') {
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              text: accumulatedText,
            };
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: TextMessage = {
        role: Role.MODEL,
        text: 'Sorry, something went wrong. Please try again.',
        type: 'text'
      };
      setMessages((prevMessages) => {
         const newMessages = [...prevMessages];
         newMessages[newMessages.length - 1] = errorMessage;
         return newMessages;
      });
    }
  }

  const generateApplication = async (prompt: string) => {
     if (!process.env.API_KEY) return;
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
     
     const modelMessage: TextMessage = { role: Role.MODEL, text: 'Creating your application, please wait...', type: 'text' };
     setMessages((prevMessages) => [...prevMessages, modelMessage]);

     try {
       const fullPrompt = `You are an expert web developer. Create the files for the following application and respond ONLY in the specified JSON format. The user wants: "${prompt}". Make sure the main HTML file is named index.html. Include CSS and JavaScript in separate files if appropriate.`;
       
       const response = await ai.models.generateContent({
         model: 'gemini-2.5-flash',
         contents: fullPrompt,
         config: {
           responseMimeType: 'application/json',
           responseSchema: {
             type: Type.OBJECT,
             properties: {
               files: {
                 type: Type.ARRAY,
                 items: {
                   type: Type.OBJECT,
                   properties: {
                     fileName: { type: Type.STRING },
                     content: { type: Type.STRING },
                   },
                   required: ['fileName', 'content'],
                 },
               },
             },
             required: ['files'],
           },
         },
       });

       const jsonResponse = JSON.parse(response.text);
       const appFiles: AppFile[] = jsonResponse.files;
       
       const appMessage: AppMessage = { role: Role.MODEL, files: appFiles, type: 'app' };
       
       setMessages((prev) => {
           const newMessages = [...prev];
           newMessages[newMessages.length - 1] = appMessage;
           return newMessages;
       });

     } catch (error) {
       console.error('Error generating application:', error);
       const errorMessage: TextMessage = {
         role: Role.MODEL,
         text: 'Sorry, I encountered an error while building your application. Please try a different prompt.',
         type: 'text',
       };
       setMessages((prev) => {
           const newMessages = [...prev];
           newMessages[newMessages.length - 1] = errorMessage;
           return newMessages;
       });
     }
  }

  const generateImageEdit = async (prompt: string) => {
    if (!process.env.API_KEY || !sourceImage) return;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const message: ImageMessage = {
      role: Role.MODEL,
      prompt,
      sourceImageUrl: `data:${sourceImage.mimeType};base64,${sourceImage.data}`,
      type: 'image',
    };
    setMessages(prev => [...prev, message]);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: sourceImage.data,
                mimeType: sourceImage.mimeType,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      let resultImageUrl: string | undefined;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          resultImageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
          break;
        }
      }

      if (resultImageUrl) {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.type === 'image') {
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              resultImageUrl: resultImageUrl,
            };
          }
          return newMessages;
        });
      } else {
        throw new Error("No image data in API response");
      }
      setSourceImage(null);
      setIsImageEditMode(false);

    } catch (error) {
      console.error('Error editing image:', error);
      const errorMessage: TextMessage = {
        role: Role.MODEL,
        text: 'Sorry, I encountered an error while editing your image. Please try again.',
        type: 'text',
      };
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = errorMessage;
        return newMessages;
      });
    }
  };

  const handleImageUpload = (file: File | null) => {
    if (!file) {
        setSourceImage(null);
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            const base64String = reader.result.split(',')[1];
            setSourceImage({ data: base64String, mimeType: file.type });
        }
    };
    reader.readAsDataURL(file);
  };
  
  const toggleAppCreationMode = () => {
      const newModeState = !isAppCreationMode;
      setIsAppCreationMode(newModeState);
      if (newModeState) {
          setIsImageEditMode(false);
          setSourceImage(null);
      }
  };

  const toggleImageEditMode = () => {
      const newModeState = !isImageEditMode;
      setIsImageEditMode(newModeState);
      setSourceImage(null);
      if (newModeState) {
          setIsAppCreationMode(false);
      }
  };


  const startCall = async () => {
    setCallStatus('connecting');
    setLiveTranscript([]);
    
    try {
        if (!process.env.API_KEY) throw new Error("API Key not found");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // FIX: Cast window to any to support webkitAudioContext for older browsers.
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        // FIX: Cast window to any to support webkitAudioContext for older browsers.
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        let nextStartTime = 0;

        sessionPromise.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    setCallStatus('connected');
                    microphoneStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const source = audioContextRef.current!.createMediaStreamSource(microphoneStreamRef.current);
                    const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = { data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)), mimeType: 'audio/pcm;rate=16000' };
                        sessionPromise.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(audioContextRef.current!.destination);
                },
                onmessage: async (message) => {
                    if (message.serverContent?.outputTranscription) {
                        const { text, isFinal } = message.serverContent.outputTranscription;
                        setLiveTranscript(prev => {
                            const last = prev[prev.length - 1];
                            if(last?.source === 'model' && !last.isFinal) {
                                return [...prev.slice(0, -1), { text: last.text + text, isFinal, source: 'model'}];
                            }
                            return [...prev, { text, isFinal, source: 'model'}];
                        });
                    }
                    if (message.serverContent?.inputTranscription) {
                         const { text, isFinal } = message.serverContent.inputTranscription;
                         setLiveTranscript(prev => {
                            const last = prev[prev.length - 1];
                            if(last?.source === 'user' && !last.isFinal) {
                                return [...prev.slice(0, -1), { text: last.text + text, isFinal, source: 'user'}];
                            }
                            return [...prev, { text, isFinal, source: 'user'}];
                        });
                    }
                     if (message.serverContent?.turnComplete) {
                        const fullTurn = liveTranscript.splice(0);
                        const userTurn = fullTurn.filter(t => t.source === 'user').map(t => t.text).join('');
                        const modelTurn = fullTurn.filter(t => t.source === 'model').map(t => t.text).join('');

                        if (userTurn) {
                            const userMessage: TextMessage = { role: Role.USER, text: userTurn, type: 'text' };
                            setMessages(prev => [...prev, userMessage]);
                        }
                         if (modelTurn) {
                            const modelMessage: TextMessage = { role: Role.MODEL, text: modelTurn, type: 'text' };
                            setMessages(prev => [...prev, modelMessage]);
                        }
                        setLiveTranscript([]);
                    }

                    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if(audioData) {
                        const decodedAudio = decode(audioData);
                        const audioBuffer = await decodeAudioData(decodedAudio, outputAudioContext, 24000, 1);
                        const source = outputAudioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContext.destination);
                        
                        const currentTime = outputAudioContext.currentTime;
                        const startTime = Math.max(currentTime, nextStartTime);
                        source.start(startTime);
                        nextStartTime = startTime + audioBuffer.duration;
                    }
                },
                onerror: (e) => {
                    console.error('Live session error:', e);
                    setCallStatus('error');
                    endCall();
                },
                onclose: () => {
                   // Handled by user action
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
        });
    } catch (error) {
        console.error('Failed to start call:', error);
        setCallStatus('error');
    }
  };

  const endCall = () => {
    sessionPromise.current?.then(session => session.close());
    sessionPromise.current = null;
    microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    setCallStatus('idle');
  };

  const handleNewChat = () => {
    if(callStatus !== 'idle') endCall();
    setMessages([]);
    setIsAppCreationMode(false);
    setIsImageEditMode(false);
    setSourceImage(null);
    initializeChat();
  };

  return (
    <div className="flex flex-col h-screen bg-[#111111] text-white font-sans">
      <Header onNewChat={handleNewChat} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && callStatus === 'idle' ? (
            <WelcomeScreen onPromptClick={handleSendMessage} />
          ) : (
            messages.map((msg, index) => {
              if (msg.type === 'app') {
                  return <AppPreview key={index} files={msg.files} />;
              }
              if (msg.type === 'image') {
                  return <ImageEditMessage key={index} message={msg} />;
              }
              return (
                 <ChatMessage
                    key={index}
                    message={msg}
                    isGenerating={isGenerating && index === messages.length - 1 && msg.role === Role.MODEL}
                 />
              )
            })
          )}
           <div ref={messagesEndRef} />
        </div>
      </main>
      <footer className="p-4 md:p-6 bg-[#111111]">
        <div className="max-w-3xl mx-auto">
          {callStatus !== 'idle' ? (
              <div>
                  <LiveTranscript transcript={liveTranscript} />
                  <CallControls status={callStatus} onEndCall={endCall} />
              </div>
          ) : (
             <>
              <MessageInput 
                onSendMessage={handleSendMessage} 
                isGenerating={isGenerating} 
                onStartCall={startCall}
                isAppCreationMode={isAppCreationMode}
                onToggleAppCreationMode={toggleAppCreationMode}
                isImageEditMode={isImageEditMode}
                onToggleImageEditMode={toggleImageEditMode}
                sourceImage={sourceImage}
                onImageUpload={handleImageUpload}
              />
              <p className="text-xs text-center text-gray-500 mt-4">
                Gemini may display inaccurate info, including about people, so double-check its responses.
              </p>
             </>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
