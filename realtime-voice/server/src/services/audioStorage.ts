import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

export interface AudioChunkMetadata {
  sessionId: string;
  sequence: number;
  timestamp: number;
  mimeType: string;
  filePath: string;
  size: number;
}

export interface AudioChunkMessage {
  type: 'audio_chunk';
  sessionId: string;
  sequence: number;
  timestamp: number;
  audioData: string; // Base64 encoded
  mimeType: string;
}

export interface ChunkAckMessage {
  type: 'chunk_ack';
  sequence: number;
  saved: boolean;
  filePath?: string;
  error?: string;
}

export class AudioStorageService {
  private readonly baseDir: string;
  private readonly sessionMetadata: Map<string, AudioChunkMetadata[]> = new Map();

  constructor(baseDir: string = './tmp/audio_chunks') {
    this.baseDir = baseDir;
  }

  // 세션 디렉토리 생성
  private async ensureSessionDirectory(sessionId: string): Promise<string> {
    const sessionDir = path.join(this.baseDir, sessionId);
    
    try {
      await access(sessionDir);
    } catch {
      await mkdir(sessionDir, { recursive: true });
      console.log(`세션 디렉토리 생성: ${sessionDir}`);
    }
    
    return sessionDir;
  }

  // Base64 오디오 데이터를 파일로 저장
  async saveAudioChunk(message: AudioChunkMessage): Promise<ChunkAckMessage> {
    try {
      const { sessionId, sequence, timestamp, audioData, mimeType } = message;
      
      // 세션 디렉토리 확인/생성
      const sessionDir = await this.ensureSessionDirectory(sessionId);
      
      // 파일 확장자 결정
      const extension = this.getFileExtension(mimeType);
      const filename = `${String(sequence).padStart(3, '0')}_${timestamp}.${extension}`;
      const filePath = path.join(sessionDir, filename);
      
      // Base64 데이터를 Buffer로 변환
      const buffer = Buffer.from(audioData, 'base64');
      
      // 파일 저장
      await writeFile(filePath, buffer);
      
      // 메타데이터 저장
      const metadata: AudioChunkMetadata = {
        sessionId,
        sequence,
        timestamp,
        mimeType,
        filePath,
        size: buffer.length
      };
      
      this.addMetadata(sessionId, metadata);
      
      console.log(`청크 저장 완료: ${filePath} (${buffer.length}bytes)`);
      
      return {
        type: 'chunk_ack',
        sequence,
        saved: true,
        filePath
      };
      
    } catch (error) {
      console.error('청크 저장 실패:', error);
      return {
        type: 'chunk_ack',
        sequence: message.sequence,
        saved: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  // 파일 확장자 결정
  private getFileExtension(mimeType: string): string {
    switch (mimeType) {
      case 'audio/webm':
      case 'audio/webm;codecs=opus':
        return 'webm';
      case 'audio/wav':
        return 'wav';
      case 'audio/mp4':
        return 'mp4';
      default:
        return 'webm'; // 기본값
    }
  }

  // 세션 메타데이터 추가
  private addMetadata(sessionId: string, metadata: AudioChunkMetadata): void {
    if (!this.sessionMetadata.has(sessionId)) {
      this.sessionMetadata.set(sessionId, []);
    }
    
    const sessionChunks = this.sessionMetadata.get(sessionId)!;
    sessionChunks.push(metadata);
    
    // 시퀀스 순서로 정렬
    sessionChunks.sort((a, b) => a.sequence - b.sequence);
  }

  // 세션 메타데이터 조회
  getSessionMetadata(sessionId: string): AudioChunkMetadata[] {
    return this.sessionMetadata.get(sessionId) || [];
  }

  // 세션 통계
  getSessionStats(sessionId: string) {
    const chunks = this.getSessionMetadata(sessionId);
    if (chunks.length === 0) {
      return { chunkCount: 0, totalSize: 0, duration: 0 };
    }

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const duration = chunks.length * 5; // 5초 청크 기준
    
    return {
      chunkCount: chunks.length,
      totalSize,
      duration,
      sessionId
    };
  }

  // 세션 정리 (개발용)
  clearSession(sessionId: string): void {
    this.sessionMetadata.delete(sessionId);
    console.log(`세션 메타데이터 정리: ${sessionId}`);
  }
}