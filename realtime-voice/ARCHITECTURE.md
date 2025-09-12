# 실시간 면접 코파일럿 - 프로젝트 아키텍처

## 프로젝트 개요

**목표**: 3주 내 완성 가능한 실시간 면접 도우미 프로토타입
- 면접 중 마이크 입력 → STT → 평가 기준별 분석 → 다음 질문 제안
- 로컬 실행 기준, 한국어 지원

## 기술 스택

### Frontend
- **Framework**: Next.js + React + TypeScript
- **Audio**: Web Audio API + MediaRecorder
- **Communication**: WebSocket Client
- **UI**: TailwindCSS (간단한 3분할 레이아웃)

### Backend  
- **Runtime**: Node.js + Express + TypeScript
- **Communication**: WebSocket Server (ws library)
- **STT**: OpenAI Whisper API (3-5초 청크 업로드)
- **LLM**: OpenAI GPT (평가/질문 생성)
- **Storage**: 로컬 JSON 파일 (DB 없음)

## 디렉토리 구조

```
/realtime-voice/
├── src/                          # Next.js Frontend (App Router)
│   └── app/
│       ├── page.tsx              # 메인 UI 레이아웃
│       ├── layout.tsx            # 루트 레이아웃
│       └── globals.css           # 전역 스타일
├── components/                   # React 컴포넌트 (예정)
│   ├── Transcript.tsx            # 좌측: 실시간 텍스트 스트림
│   ├── CriteriaBoard.tsx         # 중앙: 평가 기준 카드들
│   └── NextQuestions.tsx         # 우측: 제안 질문 패널
├── hooks/                        # 커스텀 훅 (예정)
│   ├── useAudioCapture.ts        # 오디오 녹음 로직
│   └── useWebSocket.ts           # 소켓 통신 로직
├── server/                       # Backend Server
│   ├── src/
│   │   └── index.ts              # Express + WebSocket 서버
│   ├── package.json              # 서버 의존성
│   └── tsconfig.json             # 서버 TypeScript 설정
├── templates/                    # 면접 템플릿 (예정)
│   └── fe_junior.json            # 주니어 프론트엔드 면접
├── types/                        # 공통 타입 정의 (예정)
│   └── index.ts                  # 타입 정의
├── package.json                  # Next.js 설정
├── tsconfig.json                 # 프론트엔드 TypeScript 설정
├── tailwind.config.js            # TailwindCSS 설정
└── README.md                     # 실행 가이드
```

## 데이터 플로우

### 1. 오디오 캡처 파이프라인
```
브라우저 마이크 → MediaRecorder (3-5초 청크) → WebSocket 업로드 → 서버 큐잉
```

### 2. STT 처리 파이프라인  
```
서버 큐 → Whisper API 호출 → 텍스트 + 타임스탬프 → 클라이언트 푸시
```

### 3. 평가 매핑 파이프라인
```
최근 텍스트 + 평가 템플릿 → LLM 프롬프트 → 기준별 상태 업데이트 → UI 갱신
```

## 핵심 컴포넌트

### 평가 템플릿 구조
```json
{
  "role": "주니어 프론트엔드",
  "criteria": [
    {
      "id": "cs_fund",
      "label": "CS 기초",
      "weight": 2,
      "rubric": "자료구조/네트워크 기본",
      "status": "unknown",
      "evidence": []
    }
  ]
}
```

### LLM 응답 구조
```json
{
  "criteria_updates": [
    {
      "id": "react",
      "status": "weak",
      "evidence": ["후크 원리 설명 모호"],
      "confidence": 0.62
    }
  ],
  "next_questions": [
    {
      "id": "react", 
      "ask": "useEffect 의존성 배열을 빈 배열로 둘 때의 리스크는?"
    }
  ]
}
```

## 주요 기능

### 1. 실시간 오디오 처리
- 3-5초 청크로 분할 (완전 실시간은 3주에 과함)
- WAV/PCM 포맷으로 서버 전송
- 큐잉 시스템으로 순서 보장

### 2. 평가 기준 매핑
- 상태: `unknown` → `weak` → `covered`
- evidence 기반 판정 (환각 방지)
- 가중치 적용된 종합 점수

### 3. 질문 제안 엔진
- `unknown`/`weak` 기준 우선 타겟팅
- 한국어 직설형 짧은 질문
- 클릭 복사 기능

## 실행 계획

**상세한 실행 계획과 체크리스트는 PLANS.md 문서를 참조하세요.**

### 현재 진행 상황 (1주차)
- [x] 환경 설정 및 프로젝트 구조
- [x] 서버 WebSocket 에코 테스트 (HTTP: 3001, WS: 8080)
- [ ] 오디오 캡처 (MediaRecorder)
- [ ] Whisper API 연동
- [ ] 텍스트 스트림 UI

## 환경 변수

```bash
# .env.local
OPENAI_API_KEY=your_openai_api_key
WHISPER_MODEL=whisper-1
GPT_MODEL=gpt-4o-mini
SERVER_PORT=3001
WS_PORT=8080
```

## 실행 가이드

```bash
# 1. 의존성 설치
npm install
cd server && npm install

# 2. 환경 변수 설정
cp .env.example .env.local

# 3. 개발 서버 실행
npm run dev          # Next.js (포트 3000)
npm run server:dev   # Backend (포트 3001)

# 4. 브라우저 접속
open http://localhost:3000
```

## 리스크 및 대응방안

### 높은 리스크
- **STT 지연**: 3-5초 타협, 헤드셋 권장
- **한국어 정확도**: Whisper 최적화, 잡음 제거
- **LLM 환각**: 보수적 판정, evidence 필수

### 낮은 리스크  
- **WebSocket 안정성**: 재연결 로직
- **UI 반응성**: 로딩 상태 표시
- **확장성**: 모듈형 설계

---

**Definition of Done**: 로컬에서 마이크 → 텍스트 → 평가 → 질문이 실시간으로 동작하는 웹앱