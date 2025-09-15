import OpenAI from 'openai';
import { InterviewTemplate, LLMResponse, CriteriaUpdate, NextQuestion } from '../../types';

export class LLMMapper {
  private openai: OpenAI;
  private model: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = process.env.GPT_MODEL || 'gpt-4o-mini';
    console.log(`LLMMapper 초기화: 모델=${this.model}`);
  }

  /**
   * 텍스트를 기반으로 평가 기준 업데이트 및 질문 생성
   */
  async processTranscript(
    transcript: string,
    template: InterviewTemplate,
    conversationHistory: string[] = []
  ): Promise<LLMResponse | null> {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log(`\n🚀 [LLM-${requestId}] 호출 시작`);
    console.log(`📝 [LLM-${requestId}] 입력 텍스트: "${transcript.substring(0, 100)}..."`);
    console.log(`📊 [LLM-${requestId}] 템플릿: ${template.role} (${template.criteria.length}개 기준)`);
    console.log(`🧠 [LLM-${requestId}] 모델: ${this.model}`);
    
    try {
      const prompt = this.buildPrompt(transcript, template, conversationHistory);
      console.log(`📄 [LLM-${requestId}] 프롬프트 길이: ${prompt.length}자`);
      
      const apiCallStart = Date.now();
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const apiCallTime = Date.now() - apiCallStart;
      console.log(`⏱️ [LLM-${requestId}] API 호출 시간: ${apiCallTime}ms`);
      
      // 토큰 사용량 로그
      if (response.usage) {
        console.log(`💰 [LLM-${requestId}] 토큰 사용량: ${response.usage.prompt_tokens} + ${response.usage.completion_tokens} = ${response.usage.total_tokens}`);
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI 응답이 비어있습니다');
      }

      console.log(`📤 [LLM-${requestId}] 응답 길이: ${content.length}자`);
      
      const llmResponse: LLMResponse = JSON.parse(content);
      
      // 응답 유효성 검증
      if (!this.validateLLMResponse(llmResponse)) {
        throw new Error('유효하지 않은 LLM 응답 형식');
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ [LLM-${requestId}] 처리 완료: ${llmResponse.criteria_updates.length}개 기준 업데이트, ${llmResponse.next_questions.length}개 질문 생성`);
      console.log(`⏱️ [LLM-${requestId}] 총 처리 시간: ${totalTime}ms\n`);
      
      return llmResponse;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [LLM-${requestId}] 처리 실패 (${totalTime}ms):`, error);
      console.error(`🔍 [LLM-${requestId}] 에러 상세:`, {
        message: error instanceof Error ? error.message : '알 수 없는 오류',
        type: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined
      });
      console.log(`\n`);
      return null;
    }
  }

  /**
   * 프롬프트 구성
   */
  private buildPrompt(
    transcript: string,
    template: InterviewTemplate,
    conversationHistory: string[]
  ): string {
    const criteriaList = template.criteria
      .map(c => `- ${c.id}: ${c.label} (${c.rubric}) [현재: ${c.status}]`)
      .join('\n');

    const historyText = conversationHistory.length > 0 
      ? `\n\n이전 대화:\n${conversationHistory.slice(-5).join('\n')}`
      : '';

    return `
당신은 ${template.role} 면접을 평가하는 전문가입니다.

평가 기준:
${criteriaList}

현재 면접자의 답변:
"${transcript}"
${historyText}

지시사항:
1. 답변을 분석하여 각 평가 기준에 대한 상태를 업데이트하세요
2. 상태: unknown(정보없음) → weak(부족함) → covered(충족함)
3. evidence는 구체적이고 객관적으로 작성하세요
4. confidence는 0.0-1.0 사이로 평가하세요
5. 미검증/약한 기준에 대해 1-2개의 질문을 제안하세요
6. 질문은 한국어로 직설적이고 명확하게 작성하세요

응답은 반드시 다음 JSON 형식으로 작성하세요:
{
  "criteria_updates": [
    {
      "id": "기준_id",
      "status": "unknown|weak|covered",
      "evidence": ["구체적인 근거1", "구체적인 근거2"],
      "confidence": 0.85
    }
  ],
  "next_questions": [
    {
      "id": "기준_id",
      "ask": "명확하고 구체적인 질문"
    }
  ]
}

중요: 답변에서 언급되지 않은 기준은 업데이트하지 마세요. 추측이나 가정으로 평가하지 마세요.
`;
  }

  /**
   * LLM 응답 유효성 검증
   */
  private validateLLMResponse(response: any): response is LLMResponse {
    if (!response || typeof response !== 'object') {
      return false;
    }

    // criteria_updates 검증
    if (!Array.isArray(response.criteria_updates)) {
      return false;
    }

    for (const update of response.criteria_updates) {
      if (!update.id || !update.status || !Array.isArray(update.evidence)) {
        return false;
      }
      if (!['unknown', 'weak', 'covered'].includes(update.status)) {
        return false;
      }
      if (typeof update.confidence !== 'number' || update.confidence < 0 || update.confidence > 1) {
        return false;
      }
    }

    // next_questions 검증
    if (!Array.isArray(response.next_questions)) {
      return false;
    }

    for (const question of response.next_questions) {
      if (!question.id || !question.ask) {
        return false;
      }
    }

    return true;
  }

  /**
   * 건강성 체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      
      return !!response.choices[0]?.message?.content;
    } catch (error) {
      console.error('LLM 건강성 체크 실패:', error);
      return false;
    }
  }

  /**
   * 통계 정보 반환
   */
  getStats() {
    return {
      model: this.model,
      hasApiKey: !!process.env.OPENAI_API_KEY
    };
  }
}