# 2025-09-16 UX 개선 및 트레이싱 구현

## 개요
사용자 피드백 기반으로 실시간 면접 코파일럿의 UX 개선 및 디버깅 트레이싱 기능을 구현했습니다.

## 구현된 기능

### 1. 실시간 전사문 자동 스크롤 기능
**위치**: `src/components/Transcript.tsx`

**문제**: 전사문이 업데이트되어도 사용자가 수동으로 스크롤해야 최신 내용을 볼 수 있었음

**해결**:
```typescript
const scrollRef = useRef<HTMLDivElement>(null);

// 새로운 전사문이 추가될 때마다 하단으로 스크롤
useEffect(() => {
  if (scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [transcriptions]);
```

**효과**: 실시간으로 전사문이 업데이트될 때 자동으로 최신 내용이 보이도록 개선

### 2. 오디오 청크 길이 환경변수 설정
**위치**: 
- `server/.env`: `AUDIO_CHUNK_DURATION_SECONDS=5`
- `.env.local`: `NEXT_PUBLIC_AUDIO_CHUNK_DURATION_SECONDS=5`
- `src/hooks/useAudioCapture.ts`

**문제**: 오디오 청크 길이가 하드코딩되어 있어 배포 환경별로 조정이 불가능했음

**해결**:
```typescript
// 환경변수에서 청크 지속시간 읽기 (기본값: 5초)
const chunkDurationMs = parseInt(
  process.env.NEXT_PUBLIC_AUDIO_CHUNK_DURATION_SECONDS || '5'
) * 1000;

// 환경변수에서 설정한 주기마다 새로운 독립적인 청크 생성
chunkIntervalRef.current = setInterval(createChunk, chunkDurationMs);
```

**효과**: 배포 환경에 따라 청크 길이를 유연하게 조정 가능 (예: 개발 환경 3초, 프로덕션 5초)

### 3. 포괄적인 LLM 호출 트레이싱 시스템
**위치**: `server/src/LLMMapper.ts`

**문제**: LLM 호출 과정이 불투명하여 디버깅과 성능 모니터링이 어려웠음

**해결**: 요청 ID 기반 상세 로깅 시스템 구현
```typescript
const startTime = Date.now();
const requestId = Math.random().toString(36).substr(2, 9);

// 호출 시작 정보
console.log(`🚀 [LLM-${requestId}] 호출 시작`);
console.log(`📝 [LLM-${requestId}] 입력 텍스트: "${transcript.substring(0, 100)}..."`);
console.log(`📊 [LLM-${requestId}] 템플릿: ${template.role} (${template.criteria.length}개 기준)`);
console.log(`🧠 [LLM-${requestId}] 모델: ${this.model}`);

// API 호출 시간 측정
const apiCallStart = Date.now();
// ... API 호출 ...
const apiCallTime = Date.now() - apiCallStart;
console.log(`⏱️ [LLM-${requestId}] API 호출 시간: ${apiCallTime}ms`);

// 토큰 사용량 추적
if (response.usage) {
  console.log(`💰 [LLM-${requestId}] 토큰 사용량: ${response.usage.prompt_tokens} + ${response.usage.completion_tokens} = ${response.usage.total_tokens}`);
}

// 성공/실패 로그
console.log(`✅ [LLM-${requestId}] 처리 완료: ${llmResponse.criteria_updates.length}개 기준 업데이트, ${llmResponse.next_questions.length}개 질문 생성`);
console.log(`⏱️ [LLM-${requestId}] 총 처리 시간: ${totalTime}ms\n`);
```

**트레이싱 정보**:
- 🚀 요청 시작 (요청 ID, 입력 텍스트 미리보기, 템플릿 정보, 사용 모델)
- 📄 프롬프트 길이
- ⏱️ API 호출 시간 (순수 OpenAI API 응답 시간)
- 💰 토큰 사용량 (프롬프트 + 완료 + 총합)
- 📤 응답 길이
- ✅ 처리 결과 (업데이트된 기준 수, 생성된 질문 수)
- ⏱️ 총 처리 시간 (전체 프로세스)
- ❌ 에러 발생 시 상세 정보

## 기술적 개선사항

### 성능 모니터링
- **API 호출 시간**: 순수 OpenAI API 응답 시간 측정
- **총 처리 시간**: 전체 프로세스 소요 시간 측정
- **토큰 효율성**: 입력/출력 토큰 사용량 추적

### 디버깅 지원
- **요청 ID**: 각 LLM 호출을 고유하게 식별
- **컨텍스트 정보**: 입력 데이터와 템플릿 정보 로깅
- **에러 추적**: 실패 시 상세한 에러 정보와 스택 트레이스

### 사용자 경험
- **자동 스크롤**: 실시간 전사문 자동 추적
- **설정 유연성**: 환경변수 기반 청크 길이 조정

## 검증 결과

### 테스트 환경
- 프론트엔드: http://localhost:3000 ✅
- 백엔드: http://localhost:3001 ✅  
- WebSocket: ws://localhost:8080 ✅

### 동작 확인
1. ✅ 전사문 섹션 자동 스크롤 동작
2. ✅ 환경변수 기반 청크 길이 설정 적용
3. ✅ LLM 호출 시 상세 로그 출력 확인

## 다음 단계
- 실제 음성 입력을 통한 전체 파이프라인 테스트
- LLM 트레이싱 데이터를 활용한 성능 분석
- 사용자 피드백 기반 추가 UX 개선

## 주요 파일 변경사항
- `src/components/Transcript.tsx`: 자동 스크롤 기능 추가
- `src/hooks/useAudioCapture.ts`: 환경변수 기반 청크 길이 설정
- `server/src/LLMMapper.ts`: 포괄적인 LLM 호출 트레이싱 시스템
- `server/.env`: 서버사이드 환경변수 설정
- `.env.local`: 클라이언트사이드 환경변수 설정