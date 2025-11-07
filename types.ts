
export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export enum Mode {
  CHAT = 'Gemini Flash (Chat)',
  LITE = 'Gemini Flash Lite (Fast)',
  PRO = 'Gemini 2.5 Pro (Complex Reasoning)',
  SEARCH = 'Web Search',
  IMAGE_GEN = 'Image Generation',
  IMAGE_EDIT = 'Image Editing',
  IMAGE_UNDERSTAND = 'Image Understanding',
  APP_GEN = 'App Generation',
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface AppFile {
  fileName: string;
  content: string;
}

export interface TextMessage {
  role: Role;
  text: string;
  type: 'text';
  // For user messages with an image for understanding
  imageUrl?: string;
  // For model messages with grounding
  groundingSources?: GroundingSource[];
}

export interface AppMessage {
    role: Role;
    files: AppFile[];
    type: 'app';
}

export interface ImageEditMessage {
  role: Role.MODEL; // The message block is always from the model for a consistent UI
  prompt: string;
  sourceImageUrl: string;
  resultImageUrl?: string;
  type: 'image_edit';
}

export interface GeneratedImageMessage {
  role: Role.MODEL;
  prompt: string;
  imageUrls: string[];
  type: 'generated_image';
}

export type Message = TextMessage | AppMessage | ImageEditMessage | GeneratedImageMessage;


export interface LiveTranscriptPart {
  text: string;
  isFinal: boolean;
  source: 'user' | 'model';
}
