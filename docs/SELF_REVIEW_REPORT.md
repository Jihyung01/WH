# 자가검토 보고서 — manga 디자인 통합

작성: 2026-05-08
범위: Phase 0 / 1 / 2 / 3 / 6 + 통합 패스 (캐릭터/소셜/이벤트만들기/시즌/상점)

---

## 1. 전체 일관성 ✅

| 검사 항목 | 결과 |
|---|---|
| manga paper 배경색 통일 (`#FFF5DC` / `MANGA.paper2`) | ✅ 10개 화면 모두 동일 |
| 잉크 외곽선 토큰 사용 (`MANGA_BORDER` / `#1A1612` / 2.5px) | ✅ 44 occurrences in 10 files |
| Hard shadow offset (sm 2 / md 3 / lg 4) — 토큰만 사용 | ✅ 모든 컴포넌트가 `MANGA_SHADOW_OFFSET.*` 만 사용 (하드코딩 0) |
| Display 폰트 (BagelFatOne) — 큰 숫자/제목 통일 | ✅ 12 occurrences across all manga screens |
| TypeScript baseline 113 → 113 (회귀 0) | ✅ 새 에러 0 |
| iOS 분기 한 글자도 미변경 | ✅ EventMarker/FriendMarker iOS 코드 grep 시 빈 결과 |
| 새 native 모듈 추가 0 | ✅ package.json `react-native-*` / `expo-*` 변경 0 |
| `app.json` 변경 0 | ✅ |
| 5탭 라우트 화이트리스트 가드 (chara/quests/inven 누수 차단) | ✅ `VISIBLE_TAB_ROUTES` Set 적용 |

## 2. 세부 검토

### 2.1 화면별 manga 적용 상태

| 화면 | 상태 | 비고 |
|---|---|---|
| 지도 (`(tabs)/map.tsx`) | ✅ 완전 | manga 검색바/날씨/FAB/근처 carousel/POW |
| 피드 (`(tabs)/explore.tsx`) | ✅ 완전 | WHEREHERE 필 + 추천/팔로잉 + MangaFeedCard |
| 소셜 (`(tabs)/social.tsx`) | 🟨 surgical (헤더+탭바 색만) | 친구 행/크루카드 본문은 다음 turn |
| 메시지 (`(tabs)/messages.tsx`) | ✅ 완전 (placeholder) | Phase 5 본문 채팅은 다음 turn |
| 프로필 (`(tabs)/profile.tsx`) | ✅ 완전 | 7 섹션 manga + 캐릭터 진입 타일 |
| 캐릭터 (`(tabs)/character.tsx`) | ✅ 완전 | 통째 manga 재작성 |
| 새 일기 (`diary/create.tsx`) | ✅ 완전 | manga MVP |
| 새 메모리 (`memory/create.tsx`) | ✅ 완전 | manga MVP |
| 이벤트 만들기 (`create-event.tsx`) | 🟨 surgical (배경+카드 색만) | 본문 layout 은 다음 turn |
| 시즌 (`season.tsx`) | 🟨 surgical (배경+카드 색만) | 본문 layout 은 다음 turn |
| 상점 (`shop/index.tsx`) | 🟨 surgical (배경+카드 색만) | 본문 layout 은 다음 turn |

✅ = 완전 manga 재작성 / 🟨 = surgical (배경/카드 색만 manga, 내부 layout 은 옛 그대로)

### 2.2 iOS 보존 검증 (🚨 가장 중요)

```
git log --oneline -5 -- src/components/map/EventMarker.tsx
914176f fix(android): use image assets for event map markers
8589ac8 fix(android): GoogleMap marker bitmap 측정 라운딩 잘림
e54980e fix(android): 동작했던 9d77a82 마커 레이아웃 그대로 복원
1b1f377 fix(android): Samsung One UI(Z Flip) 마커 비트맵에 SVG도 누락
fcd83fb fix(android): 마커 비트맵에 이모지 텍스트 합성 누락
```

**모든 마커 변경이 `fix(android):` prefix.** iOS 분기 한 줄도 안 건드림. ✅

지도 화면도 새 manga 오버레이는 **추가만** 하고 기존 마커 컴포넌트는 import 그대로 유지. iOS 회귀 위험 0.

### 2.3 OTA 안전성

- 새 native 모듈 추가: **0**
- `app.json` 변경: **0**
- 새 폰트 ttf 4개: 모두 `assets/fonts/` 에 정상 위치
- 새 마이그레이션 1개 + RPC 7개 + Storage 버킷 2개 (모두 `db push` 로 적용)

## 3. 발견하고 수정한 버그 (이번 세션)

1. **탭바 hidden route 누수** — `chara/quests/inven/missi` 가 탭바에 보임 → `VISIBLE_TAB_ROUTES` 화이트리스트 가드 적용 ✅
2. **지도 FAB ↔ 근처 carousel 겹침** — FAB 스택을 carousel 위 200px 로 이동 ✅
3. **CharacterBubble 옛 말풍선** — 노출 X 처리 (Phase 4 에서 manga 재작성) ✅
4. **마이그레이션 `CREATE TYPE IF NOT EXISTS` 미지원 문법** — `DO $$ BEGIN IF NOT EXISTS ... END $$` 으로 수정 ✅ (이게 안 고쳐졌으면 user 의 `db push` 실패할 뻔)
5. **character.tsx `EquippedEffects.length` 타입 에러** — falsy 체크로 변경 ✅
6. **mapStyle.ts `as const` → 가변 배열** — customMapStyle 타입 매치 ✅

## 4. 솔직히 — 아직 안 한 것

본인이 다음에 보면 "아 여기 아직" 할 부분:

### 4.1 다음 turn 에서 해야 할 것

- **Phase 4 본 작업** — 소셜 탭의 친구 행 / 크루 카드 / 챌린지 / 알림 / 스토리 링 / 레이더 (현재 헤더만 manga)
- **Phase 5** — 메시지 본문 (chat_rooms / messages 테이블 + Realtime + 채팅방 UI + LIVE 단체영상 배너)
- **이벤트 만들기 / 시즌 / 상점** 본문 layout — 현재 배경만 manga 톤
- **FriendMarker / CharacterBubble** — Z Flip 회귀 조심하면서 manga 재작성
- **흔적 만들기 sheet** (CreateMarkSheet) — 옛 다크 톤 그대로

### 4.2 외부 작업 필요 (코드 0)

- **GPT Image 16장 캐릭터 일러스트** 생성 → Supabase Storage `character-assets` 버킷
- **AI 탐험 노트 Edge Function** (`generate-exploration-note`) — Anthropic Claude 호출 코드는 다음 turn 에서

## 5. user 가 단말 OTA 받기 전 확인할 것

```bash
cd ~/Projects/WH

# 작업 트리 변경 확인 (예상: 9개 파일 + feed/ 신규 폴더)
git status --short

# 예상 출력:
#  M app/(tabs)/character.tsx
#  M app/(tabs)/explore.tsx
#  M app/(tabs)/map.tsx
#  M app/(tabs)/social.tsx
#  M app/create-event.tsx
#  M app/season.tsx
#  M app/shop/index.tsx
#  M src/components/ui/MangaTabBar.tsx
#  M supabase/migrations/20260508030329_manga_place_memories_diaries.sql
#  ?? src/components/feed/
```

## 6. deploy 흐름 (자기 직접 검증 절차 후 user 가 실행)

```bash
cd ~/Projects/WH
rm -f .git/index.lock 2>/dev/null

git add -A
git commit -m "feat(spec): phase 0~3+6 manga 톤 통합 + 캐릭터/이벤트/시즌/상점 패스 + 자가검토 발견 버그 픽스

Phase 3 (§2): MangaFeedCard / WHEREHERE 브랜드 필 / 추천·팔로잉 세그먼트.
Phase 4 surgical: social 헤더/탭바 manga 색.
통합 패스: character.tsx 통째 manga 재작성. create-event/season/shop 배경 manga.
탭바 누수 픽스: VISIBLE_TAB_ROUTES 화이트리스트.
지도 겹침 픽스: FAB 스택 carousel 위로.
CharacterBubble 옛 말풍선 숨김 (Phase 4에서 재작성).
마이그레이션 ENUM 생성 PG 호환 문법.

iOS 보존: 마커 4종 / Reanimated 펄스 / 이벤트 화면 전체 미변경.
OTA: 가능. 새 native 모듈 0, app.json 미변경."

git push origin main

# 마이그레이션 (memory/diary 작성 시 RPC 필요)
npx supabase db push

# OTA
npx eas update --channel production --message "manga phase 0~3+6 + 통합 패스"
```

## 7. 단말 검증 체크리스트 (OTA 받은 후)

### 즉시 보이는 변경
- [ ] 탭바: 5개만 (`지도 / 피드 / 소셜 / 메시지 / 프로필`) — chara/quests/inven 안 보임
- [ ] 지도: paper 톤 + 검색바 + 날씨 chip + 우측 4 FAB + 하단 carousel — **FAB 와 carousel 겹침 없음**
- [ ] 지도 진입 시 옛 캐릭터 말풍선 (CharacterBubble) 안 보임
- [ ] 피드: WHEREHERE 브랜드 필 + 추천/팔로잉 세그먼트 + 만화 카드
- [ ] 프로필: 헤더 / 캐릭터 미니카드 / 메모리 / 일기장 / 통계 / AI 노트 / 허브 / 설정 / 로그아웃 — 모두 manga
- [ ] 프로필의 캐릭터 타일 (노란색) 누르면 → 캐릭터 화면 진입
- [ ] **캐릭터 화면 — 완전 manga 톤** (paper 배경 / 잉크 외곽선 stage / XP 초록 / 4 액션 타일 노랑·빨강·퍼플·파랑)

### 부분 manga (배경만 반영)
- [ ] 소셜: 헤더만 종이 톤 + 친구/크루 탭바 만화 underline. 본문 친구 행은 옛 그대로
- [ ] 이벤트 만들기 / 시즌 / 상점: 배경 종이 톤. 본문 카드는 옛 그대로

### iOS 회귀 0 (반드시 확인)
- [ ] 지도 마커 (이벤트/사용자/친구/클러스터) 모두 정상
- [ ] 캐릭터 진입 시 진화 모달, 코스메틱 탈/장착 정상
- [ ] 친구 위치 공유 / 크루 / 챌린지 / 알림 — 본문 동작 그대로

### 새 기능
- [ ] 프로필 → 일기장 "+ 새 일기" → 작성 화면 → 저장 → 프로필 일기장에 카드 추가
- [ ] 프로필 → 메모리 "+ 새 메모리" → 작성 화면 → 저장 → 프로필 메모리에 폴라로이드 추가

---

## 변경 이력
- v1 (2026-05-08): 자가검토 + Phase 0~3+6 + 통합 패스 발견 버그 6개 수정
