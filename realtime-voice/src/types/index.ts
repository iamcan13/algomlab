// 평가 기준 상태
export type CriteriaStatus = 'unknown' | 'weak' | 'covered';

// 평가 기준 정의
export interface Criteria {
  id: string;
  label: string;
  weight: number;
  rubric: string;
  status: CriteriaStatus;
  evidence: string[];
}

// 면접 템플릿 구조
export interface InterviewTemplate {
  role: string;
  criteria: Criteria[];
}

// LLM 평가 응답 구조
export interface CriteriaUpdate {
  id: string;
  status: CriteriaStatus;
  evidence: string[];
  confidence: number;
}

export interface NextQuestion {
  id: string;
  ask: string;
}

export interface LLMResponse {
  criteria_updates: CriteriaUpdate[];
  next_questions: NextQuestion[];
}

// WebSocket 메시지 타입
export interface TranscriptMessage {
  type: 'transcript';
  text: string;
  timestamp: number;
}

export interface CriteriaUpdateMessage {
  type: 'criteria_update';
  updates: CriteriaUpdate[];
  progress: {
    total: number;
    covered: number;
    weak: number;
    unknown: number;
    percentage: number;
  };
  timestamp: number;
}

export interface QuestionsMessage {
  type: 'questions';
  questions: NextQuestion[];
  timestamp: number;
}

// 기존 WebSocket 메시지 타입들 (1주차 호환성)
export interface AudioChunkMessage {
  type: 'audio_chunk';
  sessionId: string;
  sequence: number;
  timestamp: number;
  audioData: string; // Base64 encoded
  mimeType: string;
}

export interface ChunkAckMessage {
  type: 'chunk_ack';
  sequence: number;
  saved: boolean;
  filePath?: string;
  error?: string;
}

export interface TranscriptionResultMessage {
  type: 'transcription_result';
  sessionId: string;
  sequence: number;
  text: string;
  duration?: number;
  timestamp: number;
}

export type WebSocketMessage = 
  | TranscriptMessage 
  | CriteriaUpdateMessage 
  | QuestionsMessage
  | AudioChunkMessage
  | ChunkAckMessage
  | TranscriptionResultMessage;