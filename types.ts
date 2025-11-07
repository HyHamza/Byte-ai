export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface AppFile {
  fileName: string;
  content: string;
}

export interface TextMessage {
  role: Role;
  text: string;
  type: 'text';
}

export interface AppMessage {
    role: Role;
    files: AppFile[];
    type: 'app';
}

export interface ImageMessage {
  role: Role.MODEL; // The message block is always from the model for a consistent UI
  prompt: string;
  sourceImageUrl: string;
  resultImageUrl?: string;
  type: 'image';
}

export type Message = TextMessage | AppMessage | ImageMessage;


export interface LiveTranscriptPart {
  text: string;
  isFinal: boolean;
  source: 'user' | 'model';
}
