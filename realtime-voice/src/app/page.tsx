'use client';

import { useState, useRef, useEffect } from 'react';

// 타입 정의
interface AudioChunkMessage {
  type: 'audio_chunk';
  sessionId: string;
  sequence: number;
  timestamp: number;
  audioData: string; // Base64 encoded
  mimeType: string;
}

interface ChunkAckMessage {
  type: 'chunk_ack';
  sequence: number;
  saved: boolean;
  filePath?: string;
  error?: string;
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [chunkCount, setChunkCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sequenceRef = useRef(0);

  // WebSocket 연결
  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8080');
      
      ws.onopen = () => {
        console.log('WebSocket 연결됨');
        setWsConnected(true);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('서버 응답:', message);
          
          if (message.type === 'chunk_ack') {
            const ackMessage = message as ChunkAckMessage;
            if (ackMessage.saved) {
              console.log(`청크 저장 완료: 시퀀스=${ackMessage.sequence}, 경로=${ackMessage.filePath}`);
            } else {
              console.error(`청크 저장 실패: 시퀀스=${ackMessage.sequence}, 오류=${ackMessage.error}`);
            }
          }
        } catch (err) {
          console.error('서버 메시지 파싱 오류:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket 연결 해제됨');
        setWsConnected(false);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket 오류:', error);
        setError('WebSocket 연결 오류가 발생했습니다.');
        setWsConnected(false);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('WebSocket 연결 실패:', err);
      setError('서버 연결에 실패했습니다.');
    }
  };

  // WebSocket 연결 해제
  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // 청크를 Base64로 변환하여 서버 전송
  const sendAudioChunk = async (blob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket이 연결되지 않음');
      return;
    }
    
    try {
      // Blob을 ArrayBuffer로 변환
      const arrayBuffer = await blob.arrayBuffer();
      // ArrayBuffer를 Base64로 인코딩
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const message: AudioChunkMessage = {
        type: 'audio_chunk',
        sessionId,
        sequence: ++sequenceRef.current,
        timestamp: Date.now(),
        audioData: base64,
        mimeType: blob.type
      };
      
      console.log(`청크 전송: 시퀀스=${message.sequence}, 크기=${base64.length} chars`);
      wsRef.current.send(JSON.stringify(message));
      
      // UI 업데이트
      setChunkCount(sequenceRef.current);
      setTotalSize(prev => prev + blob.size);
      
    } catch (err) {
      console.error('청크 전송 실패:', err);
      setError('오디오 청크 전송에 실패했습니다.');
    }
  };

  // 컴포넌트 마운트 시 WebSocket 연결
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      disconnectWebSocket();
    };
  }, []);

  // 마이크 권한 요청
  const requestMicrophonePermission = async () => {
    try {
      setError(null);
      console.log('마이크 권한 요청 중...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Whisper 최적화
          channelCount: 1,   // 모노
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      console.log('마이크 권한 승인됨', stream);
      
      return stream;
    } catch (err) {
      console.error('마이크 권한 거부:', err);
      setError('마이크 권한이 필요합니다. 브라우저 설정을 확인해주세요.');
      setHasPermission(false);
      return null;
    }
  };

  // 녹음 시작
  const startRecording = async () => {
    try {
      setError(null);
      
      // 권한이 없으면 요청
      let stream = streamRef.current;
      if (!stream) {
        stream = await requestMicrophonePermission();
        if (!stream) return;
      }

      // MediaRecorder 설정
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus' // Chrome 최적화
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // 청크 데이터 처리
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('오디오 청크 수신:', {
            size: event.data.size,
            type: event.data.type,
            timestamp: Date.now()
          });
          
          // 서버로 전송
          sendAudioChunk(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('녹음 시작됨');
        setIsRecording(true);
      };

      mediaRecorder.onstop = () => {
        console.log('녹음 중지됨');
        setIsRecording(false);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder 에러:', event);
        setError('녹음 중 오류가 발생했습니다.');
      };

      // 5초 간격으로 청크 생성
      mediaRecorder.start(5000);
      
    } catch (err) {
      console.error('녹음 시작 실패:', err);
      setError('녹음을 시작할 수 없습니다.');
    }
  };

  // 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // 스트림 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setHasPermission(null);
    }
  };

  return (
    <div className="font-sans min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            실시간 면접 코파일럿
          </h1>
          <p className="text-gray-600">
            Phase 1: MediaRecorder 기본 구현 (마이크 권한 + 청크 로깅)
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">오디오 녹음</h2>
          
          {/* 상태 표시 */}
          <div className="mb-4 p-3 rounded-md bg-gray-100 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span>세션 ID:</span>
              <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                {sessionId}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>WebSocket:</span>
              <span className={`font-medium ${wsConnected ? 'text-green-600' : 'text-red-600'}`}>
                {wsConnected ? '연결됨' : '연결 안됨'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>권한 상태:</span>
              <span className={`font-medium ${
                hasPermission === true ? 'text-green-600' : 
                hasPermission === false ? 'text-red-600' : 'text-gray-600'
              }`}>
                {hasPermission === true ? '승인됨' : 
                 hasPermission === false ? '거부됨' : '미확인'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>녹음 상태:</span>
              <span className={`font-medium ${isRecording ? 'text-red-600' : 'text-gray-600'}`}>
                {isRecording ? '녹음 중' : '대기 중'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>전송 통계:</span>
              <span className="font-medium text-blue-600">
                청크 {chunkCount}개, 총 {Math.round(totalSize / 1024)}KB
              </span>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* 컨트롤 버튼 */}
          <div className="flex gap-4 flex-wrap">
            {!wsConnected && (
              <button
                onClick={connectWebSocket}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                🔌 서버 연결
              </button>
            )}
            
            {!hasPermission && wsConnected && (
              <button
                onClick={requestMicrophonePermission}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                🎤 마이크 권한 요청
              </button>
            )}
            
            {hasPermission && !isRecording && wsConnected && (
              <button
                onClick={startRecording}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                🎤 녹음 시작
              </button>
            )}
            
            {isRecording && (
              <button
                onClick={stopRecording}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                ⏹️ 녹음 중지
              </button>
            )}
            
            {wsConnected && (
              <button
                onClick={disconnectWebSocket}
                className="px-3 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
              >
                연결 해제
              </button>
            )}
          </div>
        </div>

        {/* 개발자 정보 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-3">개발자 콘솔 & 서버 로그</h3>
          <p className="text-sm text-gray-600 mb-2">
            브라우저 개발자 도구(F12) → Console 탭과 서버 터미널에서 로그를 확인하세요.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="text-xs bg-blue-50 p-3 rounded font-mono">
              <div className="font-semibold mb-1 text-blue-800">클라이언트 로그:</div>
              • WebSocket 연결/해제<br/>
              • 마이크 권한 요청/승인<br/>
              • MediaRecorder 상태 변화<br/>
              • 오디오 청크 생성 및 전송<br/>
              • 서버 응답 (chunk_ack)
            </div>
            <div className="text-xs bg-green-50 p-3 rounded font-mono">
              <div className="font-semibold mb-1 text-green-800">서버 로그:</div>
              • 클라이언트 연결/해제<br/>
              • 오디오 청크 수신 처리<br/>
              • 파일 시스템 저장<br/>
              • 세션 통계 업데이트<br/>
              • tmp/audio_chunks/ 디렉토리 확인
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <h4 className="font-semibold text-sm mb-2">테스트 방법:</h4>
            <ol className="text-xs text-gray-600 space-y-1">
              <li>1. 서버 실행: <code className="bg-gray-200 px-1 rounded">cd server && npm run dev</code></li>
              <li>2. 클라이언트 실행: <code className="bg-gray-200 px-1 rounded">npm run dev</code></li>
              <li>3. 브라우저에서 localhost:3000 접속</li>
              <li>4. 서버 연결 → 마이크 권한 → 녹음 시작</li>
              <li>5. 5초마다 청크 파일이 server/tmp/audio_chunks/ 에 저장됨</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}