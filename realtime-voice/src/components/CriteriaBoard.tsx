import React from 'react';
import { Criteria, CriteriaStatus } from '../types';

interface CriteriaBoardProps {
  criteria: Criteria[];
  progress: {
    total: number;
    covered: number;
    weak: number;
    unknown: number;
    percentage: number;
  };
  templateRole?: string;
}

export const CriteriaBoard: React.FC<CriteriaBoardProps> = ({ 
  criteria, 
  progress, 
  templateRole 
}) => {
  const getStatusColor = (status: CriteriaStatus) => {
    switch (status) {
      case 'covered':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'weak':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'unknown':
        return 'bg-gray-100 border-gray-300 text-gray-600';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const getStatusIcon = (status: CriteriaStatus) => {
    switch (status) {
      case 'covered':
        return '✅';
      case 'weak':
        return '⚠️';
      case 'unknown':
        return '❓';
      default:
        return '❓';
    }
  };

  const getStatusLabel = (status: CriteriaStatus) => {
    switch (status) {
      case 'covered':
        return '충족됨';
      case 'weak':
        return '부족함';
      case 'unknown':
        return '미평가';
      default:
        return '미평가';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-800">평가 기준</h2>
          <span className="text-sm text-gray-600">{templateRole}</span>
        </div>
        
        {/* 진행률 바 */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>완료율</span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-semibold text-green-700">{progress.covered}</div>
            <div className="text-green-600">충족</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="font-semibold text-yellow-700">{progress.weak}</div>
            <div className="text-yellow-600">부족</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-semibold text-gray-700">{progress.unknown}</div>
            <div className="text-gray-600">미평가</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {criteria.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-center">
            <div>
              <div className="text-4xl mb-2">📋</div>
              <p>평가 템플릿을</p>
              <p>선택해주세요</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {criteria.map((criterion) => (
              <div 
                key={criterion.id}
                className={`p-4 rounded-lg border-2 transition-all duration-300 ${getStatusColor(criterion.status)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getStatusIcon(criterion.status)}</span>
                    <h3 className="font-semibold">{criterion.label}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-white/50">
                      가중치 {criterion.weight}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/50">
                      {getStatusLabel(criterion.status)}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm mb-3 opacity-90">{criterion.rubric}</p>
                
                {criterion.evidence.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-1">근거:</p>
                    <ul className="text-xs space-y-1">
                      {criterion.evidence.map((evidence, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-gray-500">•</span>
                          <span>{evidence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};