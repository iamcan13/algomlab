'use client';

import { useState, useEffect } from 'react';
import { Transcript } from '../components/Transcript';
import { CriteriaBoard } from '../components/CriteriaBoard';
import { NextQuestions } from '../components/NextQuestions';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { InterviewTemplate } from '../types';

export default function Home() {
  const [template, setTemplate] = useState<InterviewTemplate | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  
  const {
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
  } = useWebSocket();

  const {
    isRecording,
    hasPermission,
    error: audioError,
    requestPermission,
    startRecording,
    stopRecording,
    sessionId
  } = useAudioCapture();

  // 템플릿 로드
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        // 기본 템플릿 설정
        const templateResponse = await fetch('http://localhost:3001/api/criteria/template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: 'fe_junior' })
        });
        
        if (templateResponse.ok) {
          const result = await templateResponse.json();
          setTemplate(result.template);
          console.log('템플릿 설정 완료:', result.template.role);
        }
      } catch (error) {
        console.error('템플릿 로드 실패:', error);
      }
    };

    if (isConnected) {
      loadTemplate();
    }
  }, [isConnected]);

  const handleStartRecording = async () => {
    await startRecording((blob, sequence) => {
      sendAudioChunk(blob, sessionId, sequence);
    });
  };

  const handleCopyQuestion = (feedback: string) => {
    setCopyFeedback(feedback);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleClearSession = () => {
    if (isRecording) {
      stopRecording();
    }
    clearTranscriptions();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">실시간 면접 코파일럿</h1>
              <p className="text-sm text-gray-600">
                {template ? `${template.role} 평가` : '템플릿 로딩 중...'}
              </p>
            </div>
            
            {/* 상태 및 컨트롤 */}
            <div className="flex items-center gap-4">
              {/* 연결 상태 */}
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-600">서버</span>
              </div>

              {/* 세션 정보 */}
              <div className="text-xs text-gray-500">
                <div>세션: {sessionId.slice(-8)}</div>
                <div>{chunkCount}개 청크, {Math.round(totalSize / 1024)}KB</div>
              </div>

              {/* 컨트롤 버튼 */}
              <div className="flex gap-2">
                {!isConnected && (
                  <button
                    onClick={connect}
                    className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                  >
                    연결
                  </button>
                )}
                
                {!hasPermission && isConnected && (
                  <button
                    onClick={requestPermission}
                    className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                  >
                    마이크 권한
                  </button>
                )}
                
                {hasPermission && !isRecording && isConnected && (
                  <button
                    onClick={handleStartRecording}
                    className="px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                  >
                    🎤 녹음 시작
                  </button>
                )}
                
                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                  >
                    ⏹️ 녹음 중지
                  </button>
                )}

                <button
                  onClick={handleClearSession}
                  className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {audioError && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {audioError}
            </div>
          )}

          {/* 복사 피드백 */}
          {copyFeedback && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              {copyFeedback}
            </div>
          )}
        </div>
      </header>

      {/* 메인 3분할 레이아웃 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 좌측: 실시간 텍스트 스트림 */}
        <div className="w-1/3 bg-white border-r p-6">
          <Transcript 
            transcriptions={transcriptions}
            isRecording={isRecording}
          />
        </div>

        {/* 중앙: 평가 기준 카드들 */}
        <div className="w-1/3 bg-gray-50 p-6">
          <CriteriaBoard 
            criteria={template?.criteria || []}
            progress={progress || {
              total: 0,
              covered: 0,
              weak: 0,
              unknown: 0,
              percentage: 0
            }}
            templateRole={template?.role}
          />
        </div>

        {/* 우측: 제안 질문 패널 */}
        <div className="w-1/3 bg-white border-l p-6">
          <NextQuestions 
            questions={nextQuestions}
            onCopyQuestion={handleCopyQuestion}
          />
        </div>
      </main>

      {/* 하단 상태바 */}
      <footer className="bg-white border-t p-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>🎯 2주차 완성: 템플릿 → STT → LLM 분석 → 기준 업데이트 → 질문 제안</span>
          </div>
          <div className="flex items-center gap-4">
            {progress && (
              <span>
                진행률: {progress.percentage}% ({progress.covered}/{progress.total})
              </span>
            )}
            <span>실시간 면접 코파일럿 v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}