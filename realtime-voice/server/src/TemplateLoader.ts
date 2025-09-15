import fs from 'fs';
import path from 'path';
import { InterviewTemplate } from '../../types';

export class TemplateLoader {
  private templatesPath: string;
  private cache: Map<string, InterviewTemplate> = new Map();

  constructor() {
    this.templatesPath = path.join(__dirname, '../../templates');
  }

  /**
   * 사용 가능한 템플릿 목록 반환
   */
  async getAvailableTemplates(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.templatesPath);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.error('템플릿 디렉토리 읽기 실패:', error);
      return [];
    }
  }

  /**
   * 특정 템플릿 로드
   */
  async loadTemplate(templateId: string): Promise<InterviewTemplate | null> {
    // 캐시에서 먼저 확인
    if (this.cache.has(templateId)) {
      return this.cache.get(templateId)!;
    }

    try {
      const filePath = path.join(this.templatesPath, `${templateId}.json`);
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      const template: InterviewTemplate = JSON.parse(fileContent);
      
      // 템플릿 유효성 검증
      if (!this.validateTemplate(template)) {
        console.error(`유효하지 않은 템플릿: ${templateId}`);
        return null;
      }

      // 캐시에 저장
      this.cache.set(templateId, template);
      
      console.log(`템플릿 로드 완료: ${templateId} (${template.criteria.length}개 기준)`);
      return template;
    } catch (error) {
      console.error(`템플릿 로드 실패: ${templateId}`, error);
      return null;
    }
  }

  /**
   * 템플릿 유효성 검증
   */
  private validateTemplate(template: any): template is InterviewTemplate {
    if (!template || typeof template !== 'object') {
      return false;
    }

    if (!template.role || typeof template.role !== 'string') {
      return false;
    }

    if (!Array.isArray(template.criteria)) {
      return false;
    }

    // 각 기준 유효성 검증
    for (const criteria of template.criteria) {
      if (!criteria.id || !criteria.label || !criteria.rubric) {
        return false;
      }
      if (typeof criteria.weight !== 'number') {
        return false;
      }
      if (!['unknown', 'weak', 'covered'].includes(criteria.status)) {
        return false;
      }
      if (!Array.isArray(criteria.evidence)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 템플릿 캐시 초기화
   */
  clearCache(): void {
    this.cache.clear();
    console.log('템플릿 캐시 초기화 완료');
  }

  /**
   * 기본 템플릿 반환 (fe_junior)
   */
  async getDefaultTemplate(): Promise<InterviewTemplate | null> {
    return await this.loadTemplate('fe_junior');
  }
}