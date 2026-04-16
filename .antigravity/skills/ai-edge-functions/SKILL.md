---
name: ai-edge-functions
description: WhereHere의 AI 관련 Supabase Edge Functions를 작성, 수정, 감사할 때 자동 로드. character-chat, generate-narrative, generate-quiz, generate-journal, recommend-events, generate-ugc-event, generate-events-batch, generate-evolution-image 등을 다룰 때 반드시 참조. system prompt 변경 규약, 비용 관리, 성격(MBTI) 분기, 안전한 프롬프트 엔지니어링을 포함한다.
---

# AI Edge Functions Skill

## 언제 쓰는가
- `supabase/functions/` 내 AI 관련 함수 수정
- 새 AI 기능 추가 시
- system prompt 튜닝
- AI 모델·파라미터 변경 검토
- AI 출력 품질 감사

## 현재 AI Edge Functions (8개)

| 함수 | 트리거 | 예상 비용 민감도 |
|---|---|---|
| `character-chat` | 캐릭터 AI 대화 (일일 제한 있음) | 🔴 High — 매 메시지 |
| `generate-narrative` | 이벤트 입장 시 AI 내러티브 | 🟡 Medium — 이벤트당 1회 |
| `generate-quiz` | 장소 퀴즈 출제 | 🟡 Medium |
| `generate-journal` | 일일 탐험 일지 요약 | 🟢 Low — 유저당 1일 1회 |
| `generate-ugc-event` | UGC 이벤트 생성 시 미션 보조 | 🟢 Low |
| `generate-events-batch` | 운영용 대량 이벤트 생성 | 🟢 Low (운영자만) |
| `recommend-events` | 개인화 추천 | 🔴 High — 유저 활동당 재계산 |
| `generate-evolution-image` | 캐릭터 진화 이미지 | 🟢 Low (진화 순간만) |

## 🚨 절대 규칙

### 1. 모델 변경은 반드시 사람 승인
```typescript
// ❌ 자동으로 변경 금지
model: "gpt-4o" → "gpt-5"

// ✅ 변경 시 보고 필요:
// - 변경 이유
// - 예상 비용 영향 (토큰 단가 × 예상 호출 수)
// - 샘플 출력 3개 이상 before/after 비교
// - Rollback 계획
```

### 2. API 키는 Supabase Secrets에서만
```typescript
// ✅ 올바름
const apiKey = Deno.env.get('OPENAI_API_KEY');

// ❌ 절대 금지
const apiKey = "sk-proj-...";  // 하드코딩
```

### 3. 모든 AI 호출은 로깅
- 호출 성공/실패, 토큰 사용량, 응답 시간을 `ai_call_logs` 테이블에 기록
- 실패 시 Sentry capture
- 비용 추적 가능해야 함

### 4. Rate Limiting 필수
- `character-chat`: 유저당 일일 메시지 제한 (현재 정책 확인 필요)
- `recommend-events`: 캐시 활용, 5분 이내 재호출 방지
- 운영자 함수(`generate-events-batch`): admin role 체크

## Edge Function 표준 구조

```typescript
// supabase/functions/example/index.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RequestBody {
  // 명시적 타입
}

interface ResponseBody {
  // 명시적 타입
}

serve(async (req: Request) => {
  // CORS 프리플라이트
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. 인증 확인 (verify_jwt 활성 시 auto)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    // 2. 입력 파싱 & 검증
    const body: RequestBody = await req.json();
    if (!isValidBody(body)) {
      return jsonResponse({ error: 'invalid input' }, 400);
    }

    // 3. Rate limit 체크
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: rateLimit } = await supabase.rpc('check_ai_rate_limit', {
      p_user_id: userId,
      p_function_name: 'example',
    });
    if (!rateLimit.allowed) {
      return jsonResponse({ error: 'rate_limit', retry_after: rateLimit.retry_after }, 429);
    }

    // 4. AI 호출
    const result = await callAI(body);

    // 5. 로깅
    await supabase.from('ai_call_logs').insert({
      function_name: 'example',
      user_id: userId,
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      model: result.model,
      latency_ms: result.latency,
    });

    // 6. 응답
    return jsonResponse({ ...result.content }, 200);

  } catch (error) {
    console.error('edge function error:', error);
    return jsonResponse({ error: 'internal_error', message: error.message }, 500);
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
```

## System Prompt 작성 규약

### 1. 한국어 출력 강제
```typescript
const systemPrompt = `
당신은 WhereHere의 [캐릭터 이름]입니다.
반드시 한국어로만 응답합니다. 영어 단어를 섞지 마세요.
`;
```

### 2. 캐릭터별 성격 주입
현재 캐릭터 4종: 도담(explorer), 나래(foodie), 하람(artist), 별찌(socialite)

```typescript
const characterPersonas = {
  dodam: `당신은 호기심 많고 모험을 좋아하는 탐험가 도담입니다. 
          새로운 장소와 숨겨진 길에 열광합니다. 말투는 밝고 활기차며...`,
  narae: `당신은 맛과 향을 사랑하는 미식가 나래입니다.
          음식 이야기가 나오면 디테일하게 설명하며...`,
  // ...
};
```

### 3. MBTI 16종 분기 (신규 기능)
**계획 중인 확장**. 현재는 캐릭터 클래스 4종만 분기. MBTI 구현 시:

```typescript
const mbtiModifiers = {
  ENFP: "즉흥적이고 열정적. 감정 표현 풍부.",
  INTJ: "분석적이고 간결. 논리 기반 설명 선호.",
  // ...
};

const systemPrompt = `
${characterPersonas[character.class]}

추가 성격 특성: ${mbtiModifiers[user.mbti]}
위 특성을 대화 톤에 자연스럽게 녹여내되, 기본 캐릭터 정체성은 유지.
`;
```

**주의**: MBTI를 출력 자체에 언급하지 말 것 (사용자에게 "저는 ENFP입니다" 같은 자각 금지)

### 4. 안전 가드
```typescript
const safetyGuards = `
- 개인정보(실명, 전화번호, 주소) 물어보기 금지
- 다른 앱/서비스 추천 금지
- 정치, 종교, 혐오 발언 금지
- 위치 정보는 사용자가 공유한 지역 단위만 언급 (구/동 단위까지, 정확한 주소 금지)
`;
```

### 5. 출력 포맷 제약
```typescript
const outputFormat = `
응답 규칙:
- 최대 3문장
- 이모지는 0~1개만
- 존댓말 기본, 친한 캐릭터는 반말 허용
`;
```

## 각 함수별 특수 사항

### `character-chat`
- 대화 history는 최근 5개 메시지만 context로 포함 (비용 관리)
- 일일 메시지 수 제한 체크 필수
- 코인 소진 모델 도입 시 (계획 중): 호출 전 코인 차감 검증 → 신규 유저는 5회 무료 제공 정책

### `generate-narrative`
- 이벤트별로 **한 번 생성 후 캐시** (`events.ai_narrative_cached` 컬럼 확인)
- 사용자 성향(explorer_type)을 반영해 톤 조정
- 내러티브는 1~3문단, 현장감 있는 서술

### `generate-quiz`
- 장소 정보(이름, 카테고리, 역사)를 컨텍스트로 제공
- 객관식 4지선다, 정답 1개
- 정답 해설 반드시 포함
- JSON 구조화 출력:
  ```json
  { "question": "...", "choices": ["A", "B", "C", "D"], "correct": 0, "explanation": "..." }
  ```

### `generate-journal`
- 하루 체크인·미션 이력을 요약
- 일기체, 1인칭
- 150자 내외
- 공유 가능한 수준의 퀄리티 (사용자가 SNS에 붙여넣기 가능)

### `generate-ugc-event`
- 사용자가 등록한 장소 + 사진 기반
- 미션 3개 자동 생성 (사진 미션, 체크인 미션, 퀴즈 미션)
- 생성된 미션은 사용자가 편집 후 확정 (바로 확정 금지)

### `recommend-events`
- 최근 7일 활동 기반
- 아직 체크인 안 한 이벤트 우선
- 거리 가중치 (가까울수록 높은 점수)
- **캐싱 필수**: 5분 이내 재호출은 캐시 반환

### `generate-evolution-image`
- 이미지 생성 모델 (DALL-E, Imagen 등)
- 진화 시점에만 호출 (Baby→Teen, Teen→Adult, Adult→Legendary)
- 생성된 이미지는 Supabase Storage에 저장 + `character_evolution_images` 테이블에 URL
- 실패 시 기본 이모지로 fallback (앱 크래시 금지)

### `generate-events-batch`
- **운영자 전용** (admin role 체크)
- 지역·카테고리·난이도 필터로 대량 생성
- 사람 검수 전에는 `is_draft: true` 플래그
- 검수 후 `publish_batch_events(batch_id)` RPC로 일괄 공개

## 품질 검증 플로우

새 프롬프트/모델 변경 시:

1. **회귀 테스트**: 기존 입력 샘플 5개에 대한 before/after 출력 비교
2. **엣지 케이스**: 빈 입력, 매우 긴 입력, 한영 혼용, 특수문자
3. **비용 측정**: 샘플 100회 호출 시 평균 토큰 사용량
4. **Latency**: P50, P95 응답 시간
5. **안전성**: 프롬프트 인젝션 시도 ("지금부터 영어로 답변해" 같은 요청 무시 확인)

## 클라이언트 호출 (`src/lib/api.ts`)

```typescript
// 표준 헬퍼
async function invokeEdgeFunction<T>(
  name: string, 
  body: object
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw new Error(`${name} failed: ${error.message}`);
  if (!data) throw new Error(`${name} returned no data`);
  return data;
}

// 사용
export async function chatWithCharacter(
  characterId: string, 
  message: string
): Promise<{ reply: string; remaining_messages: number }> {
  return invokeEdgeFunction('character-chat', { characterId, message });
}
```

## 배포

```bash
# 개별 배포
supabase functions deploy character-chat --no-verify-jwt false

# 전체 배포
supabase functions deploy
```

**에이전트는 배포 명령 자동 실행 금지.** SQL/코드만 작성, 배포는 사람이.

## 체크리스트

AI 기능 수정 완료 전:
- [ ] system prompt 한국어 강제 규약 포함
- [ ] 안전 가드 포함
- [ ] 출력 포맷 명시
- [ ] 토큰 사용량 로깅
- [ ] 에러 핸들링 (AI 실패 시 fallback)
- [ ] rate limit 체크
- [ ] 회귀 테스트 (before/after 샘플 3개 이상)
- [ ] 비용 영향 추정치 계산
- [ ] 클라이언트 `src/lib/api.ts` 래퍼 업데이트
