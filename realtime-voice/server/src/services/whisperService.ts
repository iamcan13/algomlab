import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

export interface WhisperTranscription {
  text: string;
  duration?: number;
  language?: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface WhisperResponse {
  success: boolean;
  transcription?: WhisperTranscription;
  error?: string;
  chunkSequence: number;
  sessionId: string;
}

export class WhisperService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.openai.com/v1/audio/transcriptions';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.WHISPER_MODEL || 'whisper-1';
    
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
    }
    
    console.log(`WhisperService 초기화: 모델=${this.model}`);
  }

  // 오디오 파일을 Whisper API로 전송하여 텍스트 변환
  async transcribeAudioFile(
    filePath: string, 
    sessionId: string, 
    chunkSequence: number
  ): Promise<WhisperResponse> {
    try {
      // 파일 존재 확인
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `파일을 찾을 수 없습니다: ${filePath}`,
          chunkSequence,
          sessionId
        };
      }

      console.log(`Whisper API 호출: ${filePath} (세션=${sessionId}, 시퀀스=${chunkSequence})`);

      // FormData 생성
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('model', this.model);
      formData.append('language', 'ko'); // 한국어 명시
      formData.append('response_format', 'verbose_json'); // 상세 정보 포함
      formData.append('temperature', '0'); // 일관된 결과를 위해 0으로 설정

      // API 호출
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Whisper API 오류:', response.status, errorText);
        return {
          success: false,
          error: `Whisper API 오류: ${response.status} ${errorText}`,
          chunkSequence,
          sessionId
        };
      }

      const result = await response.json() as any;
      
      console.log(`STT 완료: "${result.text}" (${result.duration}초)`);

      return {
        success: true,
        transcription: {
          text: result.text.trim(),
          duration: result.duration,
          language: result.language,
          segments: result.segments
        },
        chunkSequence,
        sessionId
      };

    } catch (error) {
      console.error('Whisper 변환 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        chunkSequence,
        sessionId
      };
    }
  }

  // 여러 청크를 순차적으로 처리 (동시성 제한)
  async transcribeChunksBatch(
    filePaths: Array<{ filePath: string; sequence: number }>,
    sessionId: string,
    concurrencyLimit: number = 3
  ): Promise<WhisperResponse[]> {
    const results: WhisperResponse[] = [];
    const chunks = [...filePaths];

    console.log(`배치 STT 시작: ${chunks.length}개 청크, 동시성 제한=${concurrencyLimit}`);

    // 동시성 제한으로 처리
    while (chunks.length > 0) {
      const batch = chunks.splice(0, concurrencyLimit);
      const batchPromises = batch.map(chunk => 
        this.transcribeAudioFile(chunk.filePath, sessionId, chunk.sequence)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      console.log(`배치 완료: ${batchResults.length}개 처리, 남은 청크=${chunks.length}개`);
    }

    // 시퀀스 순서로 정렬
    results.sort((a, b) => a.chunkSequence - b.chunkSequence);
    
    return results;
  }

  // 건강 상태 확인
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) return false;
      
      // 간단한 테스트 (실제 파일 없이 API 키 유효성만 확인)
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  // 통계 정보
  getStats() {
    return {
      model: this.model,
      apiConfigured: !!this.apiKey,
      baseUrl: this.baseUrl
    };
  }
}