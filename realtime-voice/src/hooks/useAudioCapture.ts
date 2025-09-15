import { useState, useRef, useCallback } from 'react';

interface UseAudioCaptureReturn {
  // State
  isRecording: boolean;
  hasPermission: boolean | null;
  error: string | null;
  
  // Actions
  requestPermission: () => Promise<boolean>;
  startRecording: (onAudioChunk: (blob: Blob, sequence: number) => void) => Promise<void>;
  stopRecording: () => void;
  
  // Session info
  sessionId: string;
}

export const useAudioCapture = (): UseAudioCaptureReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => 
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // 환경변수에서 청크 지속시간 읽기 (기본값: 5초)
  const chunkDurationMs = parseInt(
    process.env.NEXT_PUBLIC_AUDIO_CHUNK_DURATION_SECONDS || '5'
  ) * 1000;
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sequenceRef = useRef(0);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);
  const onAudioChunkRef = useRef<((blob: Blob, sequence: number) => void) | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      console.log('마이크 권한 요청 중...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      console.log('마이크 권한 승인됨');
      
      return true;
    } catch (err) {
      console.error('마이크 권한 거부:', err);
      setError('마이크 권한이 필요합니다. 브라우저 설정을 확인해주세요.');
      setHasPermission(false);
      return false;
    }
  }, []);

  const createMediaRecorder = useCallback((audioStream: MediaStream) => {
    let supportedMimeType = '';
    
    if (MediaRecorder.isTypeSupported('audio/wav')) {
      supportedMimeType = 'audio/wav';
    } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      supportedMimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      supportedMimeType = 'audio/webm';
    }

    console.log(`사용할 MIME 타입: ${supportedMimeType}`);

    const recorder = new MediaRecorder(audioStream, {
      mimeType: supportedMimeType,
      audioBitsPerSecond: 128000
    });
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0 && onAudioChunkRef.current) {
        const sequence = ++sequenceRef.current;
        console.log('오디오 청크 생성:', {
          size: event.data.size,
          type: event.data.type,
          sequence
        });
        
        onAudioChunkRef.current(event.data, sequence);
      }
    };
    
    recorder.onstart = () => {
      console.log(`청크 ${sequenceRef.current + 1} 녹음 시작`);
    };
    
    recorder.onstop = () => {
      console.log(`청크 ${sequenceRef.current + 1} 녹음 완료`);
    };
    
    recorder.onerror = (event) => {
      console.error('MediaRecorder 에러:', event);
      setError('녹음 중 오류가 발생했습니다.');
    };
    
    return recorder;
  }, []);

  const createChunk = useCallback(() => {
    if (!streamRef.current || !isRecordingRef.current) {
      return;
    }
    
    // 현재 MediaRecorder 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // 새로운 MediaRecorder로 다음 청크 시작
    setTimeout(() => {
      if (!streamRef.current || !isRecordingRef.current) {
        return;
      }
      
      const newRecorder = createMediaRecorder(streamRef.current);
      mediaRecorderRef.current = newRecorder;
      newRecorder.start();
    }, 100);
  }, [createMediaRecorder]);

  const startRecording = useCallback(async (onAudioChunk: (blob: Blob, sequence: number) => void) => {
    try {
      setError(null);
      
      // 권한이 없으면 요청
      let stream = streamRef.current;
      if (!stream) {
        const hasPermission = await requestPermission();
        if (!hasPermission) return;
        stream = streamRef.current;
        if (!stream) return;
      }

      onAudioChunkRef.current = onAudioChunk;
      sequenceRef.current = 0;

      // 첫 번째 MediaRecorder 설정 및 시작
      const recorder = createMediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.start();
      
      setIsRecording(true);
      isRecordingRef.current = true;

      // 환경변수에서 설정한 주기마다 새로운 독립적인 청크 생성
      chunkIntervalRef.current = setInterval(createChunk, chunkDurationMs);
      
    } catch (err) {
      console.error('녹음 시작 실패:', err);
      setError('녹음을 시작할 수 없습니다.');
    }
  }, [requestPermission, createMediaRecorder, createChunk]);

  const stopRecording = useCallback(() => {
    console.log('녹음 중지');
    
    setIsRecording(false);
    isRecordingRef.current = false;
    onAudioChunkRef.current = null;
    
    // 청크 생성 인터벌 중지
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    
    // MediaRecorder 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setHasPermission(null);
  }, []);

  return {
    isRecording,
    hasPermission,
    error,
    requestPermission,
    startRecording,
    stopRecording,
    sessionId
  };
};