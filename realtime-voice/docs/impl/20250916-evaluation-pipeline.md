# 2주차 구현: 평가 파이프라인 & 실시간 매핑

**날짜**: 2025년 9월 14일  
**목표**: 텍스트 → 평가 → 질문 제안 파이프라인 완성  
**예상 시간**: 3시간 (기존 2시간에서 조정)

## 🎯 전체 목표

**Definition of Progress**: 말하면 → 텍스트 변환 → 평가 기준 자동 업데이트 → 질문 제안까지 실시간 동작

## 📋 3단계 점진적 구현 전략

### Phase 2A: 핵심 MVP (90분)
> **핵심 가치**: "텍스트 → 평가 결과" 파이프라인 완성

#### Task 1: 면접 템플릿 시스템 (30분)
```yaml
파일 생성:
  - templates/fe_junior.json
  - server/src/services/templateService.ts

구현 내용:
  - 주니어 프론트엔드 평가 기준 5-7개 정의
  - 상태: unknown → weak → covered
  - weight 및 rubric 정의
  - 서버에서 템플릿 로딩 API

검증:
  - GET /api/templates/fe_junior 동작 확인
  - JSON 구조 유효성 검사
```

#### Task 2: LLM 평가 엔진 (60분) ⚠️ 핵심 작업
```yaml
파일 생성:
  - server/src/services/gptEvaluator.ts
  - .env에 GPT_MODEL, OPENAI_API_KEY 설정

구현 내용:
  - OpenAI API 연동 (gpt-4o-mini)
  - 프롬프트 엔지니어링:
    * 입력: 최근 텍스트 + 현재 평가 상태
    * 출력: JSON 형식의 기준별 업데이트
  - 응답 파싱 및 검증
  - 상태 전이 로직 (unknown → weak → covered)

프롬프트 설계:
  - 한국어 면접 상황 최적화
  - evidence 기반 판정 (환각 방지)
  - 보수적 평가 정책

검증:
  - 텍스트 입력 → JSON 응답 파싱 성공
  - 잘못된 응답 처리 (fallback)
  - 여러 기준 동시 업데이트 테스트
```

#### Task 3: 기본 평가 UI (30분)
```yaml
수정 파일:
  - src/app/page.tsx

구현 내용:
  - 현재 UI 하단에 평가 결과 섹션 추가
  - 기준별 카드 표시 (id, label, status, evidence)
  - 상태별 색상 구분:
    * unknown: 회색
    * weak: 주황색  
    * covered: 초록색

검증:
  - STT 결과 → 평가 API 호출 → UI 업데이트
  - 실시간 상태 변화 확인
```

**Phase 2A 완료 기준**: 말하기 → 평가 카드 업데이트까지 End-to-End 동작

---

### Phase 2B: UX 개선 (60분)
> **핵심 가치**: 사용자 경험 향상 및 질문 제안

#### Task 4: 3분할 레이아웃 리팩토링 (45분)
```yaml
파일 생성:
  - components/Transcript.tsx
  - components/CriteriaBoard.tsx  
  - components/NextQuestions.tsx

수정 파일:
  - src/app/page.tsx (레이아웃 전면 리팩토링)

구현 내용:
  - 좌측(33%): 실시간 텍스트 스트림
  - 중앙(34%): 평가 기준 카드들
  - 우측(33%): 제안 질문 패널
  - 반응형 레이아웃 (모바일 대응)

검증:
  - 3분할 레이아웃 동작 확인
  - 각 패널 독립적 스크롤
  - 데이터 흐름 유지
```

#### Task 5: 질문 제안 엔진 (15분)
```yaml
수정 파일:
  - server/src/services/gptEvaluator.ts (응답 구조 확장)
  - components/NextQuestions.tsx

구현 내용:
  - LLM 응답에 next_questions 배열 추가
  - unknown/weak 기준 우선 타겟팅
  - 질문 클릭 복사 기능

검증:
  - 미검증 기준 → 질문 자동 생성
  - 클립보드 복사 동작
```

**Phase 2B 완료 기준**: 3분할 UI + 질문 제안까지 완전 동작

---

### Phase 2C: 통합 & 테스트 (30분)
> **핵심 가치**: 안정성 및 사용자 시나리오 검증

#### Task 6: 전체 통합 테스트 (30분)
```yaml
테스트 시나리오:
  1. 서버/클라이언트 연결
  2. 마이크 권한 및 녹음
  3. STT → 평가 → UI 업데이트 파이프라인
  4. 여러 발화를 통한 상태 전이 확인
  5. 질문 제안 및 복사 기능
  6. 템플릿 교체 동작 (optional)

성능 최적화:
  - LLM 호출 빈도 제한 (5초 간격)
  - 오류 처리 및 재시도 로직
  - 로딩 상태 표시

문서화:
  - README.md 업데이트
  - API 문서 정리
```

**Phase 2C 완료 기준**: 3분 데모 시연 가능한 완성품

## 🔧 기술적 고려사항

### 프롬프트 엔지니어링 (핵심!)
```yaml
입력 구조:
  - 최근 STT 텍스트 (최대 500자)
  - 현재 평가 상태 배열
  - 면접 도메인 (주니어 프론트엔드)

출력 구조:
  - criteria_updates: 기준별 상태/evidence 업데이트
  - next_questions: 미검증 기준 타겟팅 질문
  - confidence: 평가 신뢰도

품질 제어:
  - evidence 필수 (환각 방지)
  - 보수적 판정 (uncertain → weak 신중하게)
  - 한국어 면접 상황 최적화
```

### 상태 관리 전략
```yaml
클라이언트 상태:
  - transcriptions: STT 결과 배열
  - evaluations: 평가 기준 상태
  - questions: 제안 질문 배열

서버 상태:
  - 세션별 평가 히스토리
  - 템플릿 캐싱
  - LLM 호출 제한 (rate limiting)
```

### 오류 처리
```yaml
STT 실패: 재시도 + 사용자 알림
LLM API 실패: 이전 상태 유지 + 로그
네트워크 단절: 재연결 로직
잘못된 JSON: fallback 응답
```

## 📊 성공 지표

### Phase 2A
- [ ] 템플릿 API 응답 시간 < 100ms
- [ ] LLM 평가 응답 시간 < 3초  
- [ ] 텍스트 → 평가 업데이트 성공률 > 90%

### Phase 2B
- [ ] 3분할 레이아웃 렌더링 < 500ms
- [ ] 질문 생성 정확도 (수동 검증)
- [ ] UI 반응성 (모든 인터랙션 < 200ms)

### Phase 2C
- [ ] End-to-end 시나리오 성공
- [ ] 연속 15분 사용 안정성
- [ ] 데모 시연 준비 완료

## 🚨 리스크 대응

### 높은 리스크
- **LLM 응답 일관성**: 프롬프트 테스트 + 검증 로직 강화
- **상태 동기화**: WebSocket 연결 상태 모니터링
- **UI 복잡도**: 컴포넌트 단위 개발 + 점진적 통합

### 낮은 리스크
- **템플릿 로딩**: 단순 JSON 파일 읽기
- **기본 UI**: 기존 패턴 재활용
- **WebSocket 안정성**: 1주차에서 검증 완료

## 📅 타임라인

```
09:00-10:30 Phase 2A (90분) - 핵심 MVP
10:30-10:45 휴식 (15분)
10:45-11:45 Phase 2B (60분) - UX 개선  
11:45-12:15 Phase 2C (30분) - 통합 테스트
```

**총 소요시간**: 3시간 (휴식 포함 3시간 15분)