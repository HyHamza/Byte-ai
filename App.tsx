
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, Modality, Type, LiveSession, GroundingChunk } from '@google/genai';
import { Message, Role, TextMessage, AppFile, LiveTranscriptPart, AppMessage, ImageEditMessage, GeneratedImageMessage, Mode } from './types';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import ChatMessage from './components/ChatMessage';
import MessageInput from './components/MessageInput';
import AppPreview from './components/AppPreview';
import ImageEditMessageComponent from './components/ImageEditMessage';
import GeneratedImageMessageComponent from './components/GeneratedImageMessage';
import LiveTranscript from './components/LiveTranscript';
import CallControls from './components/CallControls';
import { encode, decode, decodeAudioData } from './utils/audio';


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [mode, setMode] = useState<Mode>(Mode.CHAT);
  const [sourceImage, setSourceImage] = useState<{data: string, mimeType: string} | null>(null);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  
  // Call state
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [liveTranscript, setLiveTranscript] = useState<LiveTranscriptPart[]>([]);
  const sessionPromise = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const ttsAudioContextRef = useRef<AudioContext | null>(null);


  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let modelName = 'gemini-2.5-flash';
      const config: { systemInstruction?: string, thinkingConfig?: object } = {};

      switch(mode) {
        case Mode.LITE:
          modelName = 'gemini-flash-lite-latest';
          break;
        case Mode.PRO:
          modelName = 'gemini-2.5-pro';
          config.thinkingConfig = { thinkingBudget: 32768 };
          break;
      }
      
      // Only create persistent chat sessions for conversational modes
      if ([Mode.CHAT, Mode.LITE, Mode.PRO].includes(mode)) {
        const newChat = ai.chats.create({ model: modelName, config });
        setChat(newChat);
      } else {
        setChat(null); // No persistent chat for single-turn modes
      }
    }
  }, [mode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, liveTranscript]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() && mode !== Mode.IMAGE_UNDERSTAND) return;

    setIsGenerating(true);

    const userMessage: TextMessage = { 
        role: Role.USER, 
        text, 
        type: 'text',
        imageUrl: (mode === Mode.IMAGE_UNDERSTAND || mode === Mode.IMAGE_EDIT) && sourceImage 
            ? `data:${sourceImage.mimeType};base64,${sourceImage.data}`
            : undefined
    };
    if (mode !== Mode.IMAGE_EDIT) { // ImageEdit has its own message type
        setMessages(prev => [...prev, userMessage]);
    }

    switch(mode) {
        case Mode.APP_GEN:
            await generateApplication(text);
            break;
        case Mode.IMAGE_EDIT:
            await generateImageEdit(text);
            break;
        case Mode.IMAGE_GEN:
            await generateImage(text);
            break;
        case Mode.IMAGE_UNDERSTAND:
            await generateTextResponse(text, sourceImage ?? undefined);
            break;
        case Mode.CHAT:
        case Mode.LITE:
        case Mode.PRO:
        case Mode.SEARCH:
            await generateTextResponse(text);
            break;
    }
    
    if (mode === Mode.IMAGE_UNDERSTAND || mode === Mode.IMAGE_EDIT) {
        setSourceImage(null);
    }
    setIsGenerating(false);
  };

  const generateTextResponse = async (text: string, image?: {data: string, mimeType: string}) => {
     if (!process.env.API_KEY) return;
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
     const modelMessage: TextMessage = { role: Role.MODEL, text: '', type: 'text' };
     setMessages((prevMessages) => [...prevMessages, modelMessage]);

    try {
        // Handle single-turn modes that don't use the streaming Chat API
        if (mode === Mode.SEARCH || mode === Mode.IMAGE_UNDERSTAND) {
            let modelName = 'gemini-2.5-flash';
            const contents: any = { parts: [{ text }] };
            const config: any = {};
            
            if (image) {
                contents.parts.unshift({
                    inlineData: { data: image.data, mimeType: image.mimeType }
                });
            }
             if (mode === Mode.SEARCH) {
                config.tools = [{ googleSearch: {} }];
            }

            const response = await ai.models.generateContent({ model: modelName, contents, config });
            
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const groundingSources = groundingChunks
                ?.map((c: GroundingChunk) => c.web)
                .filter(Boolean)
                .map(web => ({ uri: web.uri, title: web.title || web.uri }));


            const finalMessage: TextMessage = {
                role: Role.MODEL,
                text: response.text,
                type: 'text',
                groundingSources: groundingSources
            };

            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[newMessages.length - 1] = finalMessage;
                return newMessages;
            });

        } else { // Handle streaming chat modes
            if (!chat) return;
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

    const modelMessage: TextMessage = { role: Role.MODEL, text: '', type: 'text' };
    setMessages((prevMessages) => [...prevMessages, modelMessage]);

    try {
      const appSchema = {
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
      };

      const fullPrompt = `You are an expert web developer. Create all the necessary files for a web application based on the user's request.
The main HTML file must be named index.html. Include CSS and JavaScript in separate files if appropriate.
Do not add any commentary, explanation, or markdown formatting. Your entire response must be only the JSON object.
User request: "${prompt}"`;
      
      const result = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: appSchema,
        }
      });

      let accumulatedText = '';
      for await (const chunk of result) {
        accumulatedText += chunk.text;
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.type === 'text') {
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              text: '```json\n' + accumulatedText + '\n```',
            };
          }
          return newMessages;
        });
      }

      // After streaming is complete, robustly parse the final text
      const jsonMatch = accumulatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch || !jsonMatch[0]) {
        throw new Error("Could not find a valid JSON object in the model's response.");
      }
      
      const jsonString = jsonMatch[0];
      const jsonResponse = JSON.parse(jsonString);
      const appFiles: AppFile[] = jsonResponse.files;

      if (!appFiles || appFiles.length === 0) {
        throw new Error("No files found in the generated JSON.");
      }

      const appMessage: AppMessage = { role: Role.MODEL, files: appFiles, type: 'app' };

      setMessages((prev) => {
        const newMessages = [...prev];
        // Replace the streaming text message with the final app preview
        newMessages[newMessages.length - 1] = appMessage;
        return newMessages;
      });
    } catch (error: any) {
      console.error('Error generating application:', error);
      const errorMessage: TextMessage = {
        role: Role.MODEL,
        text: `Sorry, I encountered an error while building your application. Please try a different prompt.\n\nDetails: ${error.message}`,
        type: 'text',
      };
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = errorMessage;
        return newMessages;
      });
    }
  };
  
  const generateImage = async (prompt: string) => {
    if (!process.env.API_KEY) return;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const placeholder: GeneratedImageMessage = {
        role: Role.MODEL,
        prompt,
        imageUrls: [],
        type: 'generated_image'
    };
    setMessages(prev => [...prev, placeholder]);

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 2,
              outputMimeType: 'image/png',
              aspectRatio: '1:1',
            },
        });

        const imageUrls = response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.type === 'generated_image') {
            newMessages[newMessages.length - 1] = { ...lastMessage, imageUrls };
          }
          return newMessages;
        });

    } catch (error) {
       console.error('Error generating image:', error);
       const errorMessage: TextMessage = {
         role: Role.MODEL,
         text: 'Sorry, I encountered an error while generating your image.',
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

    const message: ImageEditMessage = {
      role: Role.MODEL,
      prompt,
      sourceImageUrl: `data:${sourceImage.mimeType};base64,${sourceImage.data}`,
      type: 'image_edit',
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
          if (lastMessage.type === 'image_edit') {
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

  const handleSpeak = async (text: string, index: number) => {
    if (speakingMessageIndex !== null || !process.env.API_KEY) return;
    setSpeakingMessageIndex(index);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio) {
        if (!ttsAudioContextRef.current) {
            ttsAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioContext = ttsAudioContextRef.current;
        const decodedAudio = decode(base64Audio);
        const audioBuffer = await decodeAudioData(decodedAudio, audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        source.onended = () => {
            setSpeakingMessageIndex(null);
        };
      } else {
         setSpeakingMessageIndex(null);
      }
    } catch(error) {
        console.error("TTS Error:", error);
        setSpeakingMessageIndex(null);
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
  
  const startCall = async () => {
    setCallStatus('connecting');
    setLiveTranscript([]);
    
    try {
        if (!process.env.API_KEY) throw new Error("API Key not found");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
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
                onclose: () => { /* Handled by user action */ },
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
    setSourceImage(null);
    setMode(Mode.CHAT);
  };

  return (
    <div className="flex flex-col h-screen bg-[#111111] text-white font-sans">
      <Header onNewChat={handleNewChat} mode={mode} setMode={setMode} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && callStatus === 'idle' ? (
            <WelcomeScreen onPromptClick={(prompt) => {
                setMode(Mode.CHAT);
                handleSendMessage(prompt);
            }} />
          ) : (
            messages.map((msg, index) => {
              switch(msg.type) {
                case 'app':
                    return <AppPreview key={index} files={msg.files} />;
                case 'image_edit':
                    return <ImageEditMessageComponent key={index} message={msg} />;
                case 'generated_image':
                    return <GeneratedImageMessageComponent key={index} message={msg} />;
                case 'text':
                    return <ChatMessage
                        key={index}
                        message={msg}
                        isGenerating={isGenerating && index === messages.length - 1 && msg.role === Role.MODEL}
                        onSpeak={() => handleSpeak(msg.text, index)}
                        isSpeaking={speakingMessageIndex === index}
                    />;
                default:
                    return null;
              }
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
                mode={mode}
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