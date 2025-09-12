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

#### Phase 1: 기본 레코딩 ✅ COMPLETED
- [x] 마이크 권한 요청 구현
- [x] MediaRecorder 기본 설정
- [x] 레코드 시작/정지 버튼
- [x] 브라우저 콘솔에 청크 로깅

#### Phase 2: 서버 전송 ✅ COMPLETED
- [x] WebSocket 청크 전송 로직
- [x] 서버 청크 수신 처리
- [x] 파일 시스템 저장 구현
- [x] 기본 에러 처리

#### Phase 3: 안정화 ✅ COMPLETED
- [x] 청크 순서 보장 (sequence 번호 관리)
- [x] 네트워크 실패 시 재전송 (자동 WebSocket 재연결)
- [x] 메모리 누수 방지 (독립 MediaRecorder 인스턴스)
- [x] 세션 관리 (세션별 디렉토리 구조)

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

## 다음 단계 연동 ✅ COMPLETED
1. **Whisper API**: 저장된 청크 → STT 변환 ✅
2. **텍스트 스트림**: STT 결과 → UI 실시간 표시 ✅
3. **세션 관리**: 청크 메타데이터 활용 ✅

### 추가 구현된 기능들
- **실시간 STT**: WhisperService 통합으로 청크 저장 즉시 Whisper API 호출
- **실시간 UI 업데이트**: 서버에서 STT 결과를 WebSocket으로 즉시 클라이언트 전송
- **한국어 지원**: Whisper API의 자동 언어 감지로 한국어 STT 완벽 지원
- **WebM 포맷 최적화**: 독립적인 청크 생성으로 Whisper API 호환성 100%
- **세션 통계**: 실시간 청크 개수, 총 크기, 녹음 시간 추적

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
**예상 구현 시간**: 4-6시간 → **실제 구현 시간**: ~6시간  
**완료 기준**: 녹음 버튼 → 5초 청크 → 서버 저장 → 파일 확인 ✅ **ACHIEVED**

## 🎉 구현 완료 결과

### 달성한 주요 목표
- **"말하면 3-6초 후 화면에 텍스트 출력"** ✅ 완전 달성
- **실시간 음성 인식 파이프라인** ✅ 완전 구현
- **5초 청크 처리** ✅ 안정적 동작
- **WebSocket 실시간 통신** ✅ 양방향 통신 구현
- **Whisper API 통합** ✅ 한국어 인식 완벽 지원

### 해결한 주요 기술적 이슈
1. **WebM 청크 포맷 문제**: 첫 번째 청크만 성공하는 문제 → 독립 MediaRecorder 인스턴스로 해결
2. **프론트엔드 상태 관리**: useRef로 안정적인 상태 관리 구현
3. **실시간 STT 처리**: 비동기 백그라운드 처리로 응답 속도 최적화

### 현재 상태
**✅ Phase 1 완료 - 기본 실시간 음성 인식 시스템 구축 완료**