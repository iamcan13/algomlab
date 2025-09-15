import React, { useEffect, useRef } from 'react';

interface TranscriptItem {
  sequence: number;
  text: string;
  timestamp: number;
}

interface TranscriptProps {
  transcriptions: TranscriptItem[];
  isRecording: boolean;
}

export const Transcript: React.FC<TranscriptProps> = ({ transcriptions, isRecording }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새로운 전사문이 추가될 때마다 하단으로 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  const handleCopyAll = () => {
    const fullText = transcriptions.map(t => t.text).join(' ');
    navigator.clipboard.writeText(fullText);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">실시간 텍스트 변환</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-sm text-gray-600">
            {isRecording ? '녹음 중' : '대기 중'}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {transcriptions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-center">
            <div>
              <div className="text-4xl mb-2">🎤</div>
              <p>녹음을 시작하면</p>
              <p>음성이 실시간으로</p>
              <p>텍스트로 변환됩니다</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {transcriptions.map((transcription) => (
              <div 
                key={transcription.sequence}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="flex-shrink-0 w-7 h-7 bg-blue-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {transcription.sequence}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 leading-relaxed">{transcription.text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(transcription.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {transcriptions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              총 {transcriptions.length}개 세그먼트
            </span>
            <button
              onClick={handleCopyAll}
              className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1"
            >
              📋 전체 복사
            </button>
          </div>
        </div>
      )}
    </div>
  );
};