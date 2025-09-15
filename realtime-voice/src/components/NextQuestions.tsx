import React from 'react';
import { NextQuestion } from '../types';

interface NextQuestionsProps {
  questions: NextQuestion[];
  onCopyQuestion: (question: string) => void;
}

export const NextQuestions: React.FC<NextQuestionsProps> = ({ 
  questions, 
  onCopyQuestion 
}) => {
  const handleCopyQuestion = (question: string) => {
    navigator.clipboard.writeText(question);
    onCopyQuestion(question);
  };

  const handleCopyAll = () => {
    const allQuestions = questions.map((q, index) => `${index + 1}. ${q.ask}`).join('\n\n');
    navigator.clipboard.writeText(allQuestions);
    onCopyQuestion('모든 질문을 복사했습니다');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">제안 질문</h2>
        {questions.length > 0 && (
          <button
            onClick={handleCopyAll}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            전체 복사
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {questions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-center">
            <div>
              <div className="text-4xl mb-2">💡</div>
              <p>음성 분석이 완료되면</p>
              <p>맞춤형 질문이</p>
              <p>제안됩니다</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((question, index) => (
              <div 
                key={`${question.id}-${index}`}
                className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 bg-blue-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs text-blue-600 font-medium">
                        {question.id}
                      </span>
                    </div>
                    <p className="text-gray-800 leading-relaxed">
                      {question.ask}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyQuestion(question.ask)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-200 rounded"
                    title="질문 복사"
                  >
                    📋
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {questions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">
              질문을 클릭해서 복사하고 면접에 활용하세요
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <span>총 {questions.length}개 질문</span>
              <span>•</span>
              <span>실시간 업데이트</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};