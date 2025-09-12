# MediaRecorder 오디오 캡처 구현 계획

## 목표
오디오 레코드 버튼을 누르면 연속적으로 오디오를 녹음하여 청크 단위로 서버에 전송하는 시스템 구현

## 아키텍처 개요

### 클라이언트 (Next.js)
```
[마이크] → [MediaRecorder] → [청크 생성] → [WebSocket 전송] → [UI 상태 업데이트]
```

### 서버 (Express)
```
[WebSocket 수신] → [청크 저장] → [파일 관리] → [STT 준비]
```

## 기술적 세부사항

### 1. 오디오 캡처 설정
- **MediaRecorder API** 사용
- **청크 크기**: 5초 (5000ms) - PLANS.md 기준
- **포맷**: WAV 또는 WebM (브라우저 호환성 고려)
- **샘플링 레이트**: 16kHz (Whisper 최적화)

### 2. 청크 처리 플로우
```typescript
// 클라이언트
1. getUserMedia() → 마이크 권한 요청
2. MediaRecorder 인스턴스 생성
3. ondataavailable 이벤트로 청크 수신
4. 청크를 Base64 또는 ArrayBuffer로 인코딩
5. WebSocket으로 서버 전송
6. UI에 녹음 상태 표시

// 서버  
1. WebSocket으로 청크 수신
2. tmp/audio_chunks/ 디렉토리에 저장
3. 파일명: {timestamp}_{sequence}.wav
4. 청크 메타데이터 관리 (시작시간, 길이 등)
```

### 3. 데이터 구조

#### 클라이언트 → 서버 메시지
```typescript
interface AudioChunkMessage {
  type: 'audio_chunk';
  sessionId: string;
  sequence: number;
  timestamp: number;
  audioData: string; // Base64 encoded
  mimeType: string;
}
```

#### 서버 응답
```typescript
interface ChunkAckMessage {
  type: 'chunk_ack';
  sequence: number;
  saved: boolean;
  filePath?: string;
}
```

### 4. 파일 시스템 구조
```
server/
├── tmp/
│   └── audio_chunks/
│       ├── session_123/
│       │   ├── 001_1694234567890.wav
│       │   ├── 002_1694234572890.wav
│       │   └── metadata.json
│       └── session_124/
└── src/
    ├── services/
    │   ├── audioStorage.ts
    │   └── chunkManager.ts
    └── routes/
        └── websocket.ts
```

### 5. 구현 단계

#### Phase 1: 기본 레코딩
- [ ] 마이크 권한 요청 구현
- [ ] MediaRecorder 기본 설정
- [ ] 레코드 시작/정지 버튼
- [ ] 브라우저 콘솔에 청크 로깅

#### Phase 2: 서버 전송
- [ ] WebSocket 청크 전송 로직
- [ ] 서버 청크 수신 처리
- [ ] 파일 시스템 저장 구현
- [ ] 기본 에러 처리

#### Phase 3: 안정화
- [ ] 청크 순서 보장
- [ ] 네트워크 실패 시 재전송
- [ ] 메모리 누수 방지
- [ ] 세션 관리

## 기술적 고려사항

### 성능
- **동시성 제한**: 청크 처리 3개 제한 (PLANS.md)
- **메모리 관리**: 청크 처리 후 즉시 해제
- **파일 정리**: 오래된 청크 자동 삭제

### 호환성
- **브라우저**: Chrome, Firefox, Safari 지원
- **코덱**: WebM (Chrome), MP4 (Safari) 폴백
- **권한**: HTTPS 필수 (로컬 개발용 예외)

### 에러 처리
- 마이크 권한 거부
- WebSocket 연결 실패  
- 디스크 공간 부족
- 청크 손실 감지

## 다음 단계 연동
1. **Whisper API**: 저장된 청크 → STT 변환
2. **텍스트 스트림**: STT 결과 → UI 실시간 표시
3. **세션 관리**: 청크 메타데이터 활용

## 예상 결과물
```bash
# 사용자가 5분 녹음 시
tmp/audio_chunks/session_abc123/
├── 001_1694234567890.wav (5초)
├── 002_1694234572890.wav (5초)
├── ...
├── 060_1694234862890.wav (5초)
└── metadata.json
```

## 테스트 계획
1. **단위 테스트**: 청크 생성, 저장, 메타데이터
2. **통합 테스트**: 클라이언트-서버 전체 플로우
3. **성능 테스트**: 장시간 녹음, 동시 사용자
4. **에러 테스트**: 네트워크 단절, 권한 거부

---
**예상 구현 시간**: 4-6시간  
**완료 기준**: 녹음 버튼 → 5초 청크 → 서버 저장 → 파일 확인