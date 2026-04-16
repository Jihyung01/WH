## MBTI 기반 AI 성격 16종 분기
### 문제 (Why)
기존 `character-chat` 대화와 AI 기반 콘텐츠 기능인 `generate-narrative`가 공통 시스템 프롬프트를 사용하여 캐릭터 간의 차별화된 매력이 부재함. 온보딩에서 배정받은 16종 타입(MBTI 기반)에 맞춰 AI NPC의 리액션이 최적화·개인화되어야 유저의 컨셉 몰입도를 견인할 수 있음.

### MVP 범위 (3줄 이내)
Supabase Edge Function 내 기존 AI 프롬프트 스크립트에 유저의 성향 타입(`type_code`)과 연동되는 '성격 주입 토큰'을 동적으로 할당.
MBTI 포지션 16개 코드를 4가지 뿌리(도담/나래/하람/별찌) 클래스로 대분류 매핑하여, 어조·이모지 빈도·제1관심사 지시문을 Prompt Layer에 단순 Append.
값비싼 A/B 테스트나 모델 훈련 절차 없이 정적 룰셋 텍스트 기반으로 빠르게 시장 MVP 검증.

### DB 스키마 변경
- DB Layer 데이터 구조 변경 없음. (대화 히스토리는 기존 스키마 유지).
- 프롬프트 템플릿의 형상 관리는 `supabase/functions/*/` 폴더 하위 소스코드의 Constants/JSON 맵으로 단순하게 구현.

### RPC / Edge Function 변경
- Edge Function `character-chat`, `generate-journal`: 요청 payload를 통해 프론트엔드의 `type_code`를 Param으로 수신.
- Deno Function 내부: 초기화된 `base_system_prompt` 뒤에 `getPersonalityToken(type_code)` 유틸리티를 호출하여 스트링을 결합 (예: "ISTJ 맵핑 속성이므로 원리원칙을 중시하고 감정 표현 이모지는 최소화해, 말투는 공식적인 어조야.").

### 클라이언트 변경 (화면, 컴포넌트)
- `src/lib/api.ts`: LLM API 호출 래퍼에서 Zustand `characterStore` 혹은 `profileStore`가 쥐고 있는 `explorer_type.type_code` 상태를 페이로드에 자동 주입시키도록 의존성 보강.

### 공수 추정 (S/M/L/XL)
S (프롬프트 텍스트 엔지니어링 리서치 및 Edge Function 문자열 결합만 수행하므로 개발 총 비용이 매우 낮음)

### 리스크 (Top 2)
- GPT 등 생성 모델에 Fine-tuning 없이 프롬프트 텍스트 인젝션만 사용하여, 대화 턴이 계속되면 주입된 성격 지시어의 컨텍스트를 망각할 확률 큼(할루시네이션 가속).
- 16종 각기 다른 성격 지시어로 인해 예상 밖의 부적절 발언이나 Open AI 윤리 필터링(Moderation) 규칙과 충돌 발생 가능.

### 명시적으로 MVP에서 제외하는 것
- LLM Weight Fine-tuning 적용 방식이나 RAG(검색 증강 생성) 기반 유저 개인별 대화 히스토리 DB 벡터 검색/기억 모델.
- 유저 개인이 프롬프트를 텍스트로 직접 수정하는 "내 커스텀 AI 가르치기" 창 뷰.
