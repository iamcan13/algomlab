import { InterviewTemplate, Criteria, CriteriaUpdate } from '../../types';

export class CriteriaManager {
  private template: InterviewTemplate | null = null;
  private conversationHistory: string[] = [];
  private lastUpdateTime: number = 0;

  /**
   * 템플릿 설정
   */
  setTemplate(template: InterviewTemplate): void {
    this.template = { ...template };
    this.conversationHistory = [];
    this.lastUpdateTime = Date.now();
    console.log(`평가 기준 템플릿 설정: ${template.role} (${template.criteria.length}개 기준)`);
  }

  /**
   * 현재 템플릿 반환
   */
  getTemplate(): InterviewTemplate | null {
    return this.template ? { ...this.template } : null;
  }

  /**
   * 기준 업데이트 적용
   */
  applyCriteriaUpdates(updates: CriteriaUpdate[]): void {
    if (!this.template) {
      console.warn('템플릿이 설정되지 않아 기준 업데이트를 적용할 수 없습니다');
      return;
    }

    let updateCount = 0;
    for (const update of updates) {
      const criteriaIndex = this.template.criteria.findIndex(c => c.id === update.id);
      
      if (criteriaIndex === -1) {
        console.warn(`존재하지 않는 기준 ID: ${update.id}`);
        continue;
      }

      const criteria = this.template.criteria[criteriaIndex];
      
      // 상태 업데이트 (후퇴 방지)
      if (this.isStatusUpgrade(criteria.status, update.status)) {
        criteria.status = update.status;
        updateCount++;
      }

      // 증거 추가 (중복 제거)
      const newEvidence = update.evidence.filter(e => !criteria.evidence.includes(e));
      criteria.evidence.push(...newEvidence);

      console.log(`기준 업데이트: ${update.id} → ${update.status} (신뢰도: ${update.confidence})`);
    }

    if (updateCount > 0) {
      this.lastUpdateTime = Date.now();
      console.log(`${updateCount}개 기준 상태 업데이트 완료`);
    }
  }

  /**
   * 상태 업그레이드 여부 확인
   */
  private isStatusUpgrade(currentStatus: string, newStatus: string): boolean {
    const statusPriority = { unknown: 0, weak: 1, covered: 2 };
    return statusPriority[newStatus as keyof typeof statusPriority] > 
           statusPriority[currentStatus as keyof typeof statusPriority];
  }

  /**
   * 대화 내역 추가
   */
  addToConversationHistory(transcript: string): void {
    if (transcript.trim().length === 0) return;
    
    this.conversationHistory.push(transcript.trim());
    
    // 최근 10개만 유지
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
    
    console.log(`대화 내역 추가: "${transcript.substring(0, 50)}..." (전체: ${this.conversationHistory.length}개)`);
  }

  /**
   * 대화 내역 반환
   */
  getConversationHistory(): string[] {
    return [...this.conversationHistory];
  }

  /**
   * 미검증/약한 기준 반환
   */
  getWeakCriteria(): Criteria[] {
    if (!this.template) return [];
    
    return this.template.criteria.filter(c => 
      c.status === 'unknown' || c.status === 'weak'
    );
  }

  /**
   * 완료된 기준 반환
   */
  getCoveredCriteria(): Criteria[] {
    if (!this.template) return [];
    
    return this.template.criteria.filter(c => c.status === 'covered');
  }

  /**
   * 진행률 계산
   */
  getProgress(): { total: number; covered: number; weak: number; unknown: number; percentage: number } {
    if (!this.template) {
      return { total: 0, covered: 0, weak: 0, unknown: 0, percentage: 0 };
    }

    const total = this.template.criteria.length;
    const covered = this.template.criteria.filter(c => c.status === 'covered').length;
    const weak = this.template.criteria.filter(c => c.status === 'weak').length;
    const unknown = this.template.criteria.filter(c => c.status === 'unknown').length;
    const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;

    return { total, covered, weak, unknown, percentage };
  }

  /**
   * 통계 정보 반환
   */
  getStats() {
    const progress = this.getProgress();
    const weakCriteria = this.getWeakCriteria();
    
    return {
      hasTemplate: !!this.template,
      templateRole: this.template?.role || null,
      progress,
      weakCriteriaCount: weakCriteria.length,
      conversationTurns: this.conversationHistory.length,
      lastUpdateTime: this.lastUpdateTime
    };
  }

  /**
   * 상태 초기화
   */
  reset(): void {
    this.template = null;
    this.conversationHistory = [];
    this.lastUpdateTime = 0;
    console.log('기준 관리자 상태 초기화 완료');
  }
}