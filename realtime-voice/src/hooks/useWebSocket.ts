import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  WebSocketMessage, 
  TranscriptionResultMessage, 
  CriteriaUpdateMessage, 
  QuestionsMessage,
  AudioChunkMessage,
  NextQuestion,
  CriteriaUpdate
} from '../types';

interface TranscriptItem {
  sequence: number;
  text: string;
  timestamp: number;
}

interface Progress {
  total: number;
  covered: number;
  weak: number;
  unknown: number;
  percentage: number;
}

interface UseWebSocketReturn {
  // Connection state
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  
  // Data
  transcriptions: TranscriptItem[];
  criteriaUpdates: CriteriaUpdate[];
  nextQuestions: NextQuestion[];
  progress: Progress | null;
  
  // Actions
  sendAudioChunk: (blob: Blob, sessionId: string, sequence: number) => Promise<void>;
  clearTranscriptions: () => void;
  
  // Stats
  chunkCount: number;
  totalSize: number;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptItem[]>([]);
  const [criteriaUpdates, setCriteriaUpdates] = useState<CriteriaUpdate[]>([]);
  const [nextQuestions, setNextQuestions] = useState<NextQuestion[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:8080');
      
      ws.onopen = () => {
        console.log('WebSocket 연결됨');
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('서버 응답:', message);
          
          switch (message.type) {
            case 'chunk_ack':
              if (message.saved) {
                console.log(`청크 저장 완료: 시퀀스=${message.sequence}`);
              }
              break;
              
            case 'transcription_result':
              const transcriptionMessage = message as TranscriptionResultMessage;
              console.log(`STT 결과: "${transcriptionMessage.text}"`);
              
              setTranscriptions(prev => {
                const newTranscription = {
                  sequence: transcriptionMessage.sequence,
                  text: transcriptionMessage.text,
                  timestamp: transcriptionMessage.timestamp
                };
                
                const updated = [...prev, newTranscription].sort((a, b) => a.sequence - b.sequence);
                return updated;
              });
              break;
              
            case 'criteria_update':
              const criteriaMessage = message as CriteriaUpdateMessage;
              console.log(`기준 업데이트: ${criteriaMessage.updates.length}개`);
              
              setCriteriaUpdates(prev => [...prev, ...criteriaMessage.updates]);
              setProgress(criteriaMessage.progress);
              break;
              
            case 'questions':
              const questionsMessage = message as QuestionsMessage;
              console.log(`질문 제안: ${questionsMessage.questions.length}개`);
              
              setNextQuestions(questionsMessage.questions);
              break;
              
            case 'transcription_error':
              console.error(`STT 오류: ${message.error}`);
              break;
              
            default:
              console.log('알 수 없는 메시지 타입:', message);
          }
        } catch (err) {
          console.error('메시지 파싱 오류:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket 연결 해제됨');
        setIsConnected(false);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket 오류:', error);
        setIsConnected(false);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('WebSocket 연결 실패:', err);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendAudioChunk = useCallback(async (blob: Blob, sessionId: string, sequence: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket이 연결되지 않음');
      return;
    }
    
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const message: AudioChunkMessage = {
        type: 'audio_chunk',
        sessionId,
        sequence,
        timestamp: Date.now(),
        audioData: base64,
        mimeType: blob.type
      };
      
      console.log(`청크 전송: 시퀀스=${sequence}, 크기=${base64.length} chars`);
      wsRef.current.send(JSON.stringify(message));
      
      setChunkCount(sequence);
      setTotalSize(prev => prev + blob.size);
      
    } catch (err) {
      console.error('청크 전송 실패:', err);
    }
  }, []);

  const clearTranscriptions = useCallback(() => {
    setTranscriptions([]);
    setCriteriaUpdates([]);
    setNextQuestions([]);
    setProgress(null);
    setChunkCount(0);
    setTotalSize(0);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    transcriptions,
    criteriaUpdates,
    nextQuestions,
    progress,
    sendAudioChunk,
    clearTranscriptions,
    chunkCount,
    totalSize
  };
};