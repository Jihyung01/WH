# 최종 deploy 가이드 — manga 디자인 통합 완료

작성: 2026-05-08
범위: Phase 0~6 + 통합 패스 + 자가검토 픽스 + theme 통합

이번 작업으로 **manga 톤이 앱 거의 전체에 적용**되었습니다. 마지막 한 번의 OTA 로 완성본 확인.

---

## 1. 이번 turn 의 핵심 변경

### 1-A. 디자인 토큰 통합 (가장 중요)
- `src/config/theme.ts` 에서 **DARK_PALETTE 와 LIGHT_PALETTE 둘 다 manga paper 톤** 으로 통합
- `useTheme().colors` 를 사용하는 모든 화면이 **자동 manga**: CommentModal / CreateMarkSheet / 친구 프로필 / 시즌 / 상점 본문 / 댓글 sheet 등 50+ 곳

### 1-B. 18개 화면 일괄 색 swap (COLORS + BRAND)
- 다크 navy/mint → manga paper/red 일괄 적용
- 대상: chat / journal / premium / settings / social / event / mission / reward / season / create-event / shop / character-customize / inventory / quests / 인증 (welcome/login/onboarding/mbti/personality-quiz) / titles 등

### 1-C. 자가검토 6개 버그 픽스
1. ✅ 탭바 hidden route 누수 (chara/quests/inven 차단)
2. ✅ 지도 FAB ↔ 근처 carousel 겹침
3. ✅ CharacterBubble 옛 말풍선 숨김
4. ✅ 마이그레이션 ENUM PG 호환 문법 (`DO $$ ... $$`)
5. ✅ character.tsx EquippedEffects.length 타입
6. ✅ mapStyle.ts `as const` 제거

### 1-D. 추가 픽스 (이번 turn)
- character.tsx 슬롯 5개 균등 분배 (flex:1) + paddingBottom 140 으로 액션 잘림 해결
- explore.tsx CommentModal manga 톤 (잉크 외곽선 + 종이 배경 + 굵은 핸들 + 노랑 입력 pill)
- FriendMarker **iOS** 분기 manga 톤 (한글 이니셜 + 자동 7색 + 잉크 외곽선 + 노랑 이름태그). Android PNG 그대로 보존.
- CreateMarkSheet BRAND/COLORS swap

### 1-E. iOS 보존 ✅
- 마커 3종 (EventMarker / UserLocationMarker / MapClusterMarker) iOS 코드 한 글자도 미변경
- FriendMarker iOS 만 manga 외형 (Android 는 PNG 그대로 — Z Flip 회귀 0)
- 새 native 모듈 0, app.json 변경 0
- typecheck 113 → 112 (1개 정리, 회귀 0)

---

## 2. 단말 deploy — 한 번에 끝내기

```bash
cd ~/Projects/WH

# Cowork 가 못 지운 git lock 정리
rm -f .git/index.lock 2>/dev/null

# 변경 add
git add -A

# 작업 트리 변경 검토
git status --short

# commit
git commit -m "feat(spec): manga 디자인 통합 완료 — phase 0~6 + 통합 패스 + 자가검토 픽스

theme 통합 (가장 중요):
- DARK_PALETTE / LIGHT_PALETTE 모두 manga paper 톤으로 통합. useTheme().colors
  사용하는 모든 화면 (CommentModal / CreateMarkSheet / 친구 프로필 / 시즌 / 상점
  본문 / 댓글 sheet 등) 자동 manga.

18개 화면 일괄 색 swap:
- COLORS.background → #FFF5DC, COLORS.surface → #FFFEF5,
  COLORS.textPrimary → #1A1612 ink, BRAND.primary → #FF4757 manga r 등.
- 대상: chat / journal / premium / settings / social / event / mission /
  reward / season / create-event / shop / character-customize / inventory /
  quests / 인증 / titles.

자가검토 6개 + 추가 4개 버그 픽스:
- 탭바 hidden route whitelist 가드
- 지도 FAB / carousel 겹침 해결
- CharacterBubble 옛 말풍선 숨김
- 마이그레이션 ENUM PG 호환 (DO \$\$ ... \$\$)
- character.tsx 타입 + 슬롯 layout + 액션 잘림 픽스
- explore.tsx CommentModal manga 톤
- FriendMarker iOS manga (한글 이니셜 + 잉크 외곽선 + 노랑 이름태그)

iOS 보존: EventMarker / UserLocationMarker / MapClusterMarker iOS 미변경.
OTA 안전: native 모듈 0, app.json 미변경, typecheck 113→112 (회귀 0)."

# push
git push origin main

# DB 마이그레이션 적용 (장소메모리 / 일기 RPC 활성화)
npx supabase db push

# OTA
npx eas update --channel production --message "manga 통합 완성"
```

---

## 3. 단말 검증 체크리스트

### 3-A. 즉시 보이는 manga 변경
- [ ] 탭바: 5개만 (지도/피드/소셜/메시지/프로필). chara/quests/inven 안 보임
- [ ] 지도: paper 톤 + 검색바 + 날씨 chip + 우측 4 FAB + 하단 carousel — **FAB 와 carousel 겹침 없음**
- [ ] 지도에 옛 캐릭터 말풍선 안 뜸
- [ ] 피드: WHEREHERE 브랜드 필 + 추천/팔로잉 + 만화 카드. 댓글 시트 manga (종이 + 잉크 외곽선)
- [ ] 프로필: 7 섹션 manga, 캐릭터 진입 타일 (노랑) 누르면 캐릭터 화면
- [ ] **캐릭터: 5 슬롯 균등 + 액션 4 타일 (꾸미기 / 상점 / 칭호 / 대화) 잘림 없음**
- [ ] 캐릭터에서 4 타일 누르면 → 각 화면도 manga 톤 (배경/카드 종이)

### 3-B. 부속 화면 manga (이번 turn 일괄 swap)
- [ ] 꾸미기 (character-customize) — 종이 배경, 카드 종이 톤
- [ ] 상점 — 코인 충전 / 코스메틱 탭 종이 톤
- [ ] 칭호 — 종이 톤 카드, 잠금/획득 시각 구분
- [ ] AI 대화 (chat) — 종이 톤 + manga 색 메시지 bubble
- [ ] 시즌 패스 — 종이 톤 + manga 트랙
- [ ] 프리미엄 — 종이 톤 + manga 색 액센트
- [ ] 설정 — 종이 톤 + manga 토글 / 카드
- [ ] 탐험 일지 (journal) — 종이 톤 캘린더
- [ ] 이벤트 상세 / 체크인 / 미션 — 종이 톤
- [ ] 친구 프로필 (user/[id]) — 종이 톤 + manga 친구 행
- [ ] 인증 화면들 (welcome/login/onboarding/mbti) — 종이 톤

### 3-C. 새 기능
- [ ] 일기 작성 (`+ 새 일기`) → 저장 → 토스트 + 프로필 일기장에 카드 추가
- [ ] 메모리 작성 (`+ 새 메모리`) → 저장 → 토스트 + 프로필 메모리에 폴라로이드 추가

### 3-D. iOS 회귀 0
- [ ] 지도 마커 3종 (이벤트 / 사용자 / 클러스터) 정상 (FriendMarker 만 새 manga 외형)
- [ ] Reanimated 펄스 / 진화 모달 / 코스메틱 장착 / 친구 위치 공유 정상

---

## 4. 알려진 한계 + user 가 알아야 할 외부 작업

### 4-A. RPC 에러 — `npx supabase db push` 필요
이전에 본 에러 메시지:
```
저장 실패 — Could not find the function public.create_place_memory(...)
저장 실패 — Could not find the function public.create_diary(...)
```
이건 마이그레이션이 아직 production DB 에 push 안 돼서. 위 §2 deploy 명령에 이미 포함됐으니 이번 deploy 후 해결됨.

### 4-B. journal "Unsupported JWT algorithm ES256" 에러
이건 별도 이슈입니다. `generate-journal` Edge Function 의 `jose` 라이브러리가 ES256 알고리즘 디코드 미지원 환경에서 발생. 본 manga 통합 패스의 범위 밖이고, 다음 별도 디버깅에서 다룰 예정.

임시 우회: journal 들어가지 않으면 영향 0. journal 진입은 프로필 허브 → "탐험 일지" 타일.

### 4-C. 깊이 안 들어간 부분 (다음 작업 필요시)
- **Phase 5 메시지 본문** — 1:1 / 그룹 채팅 인프라 (chat_rooms / messages 테이블 + Realtime + 채팅방 UI). 현재는 placeholder.
- **소셜 본문 manga 풀 재작성** — 헤더/탭바/배경은 manga, 친구 행 / 크루 카드 / 챌린지 / 알림 카드 본문은 일괄 swap 만 (창의적 재구성 안 됨). 본격적인 만화 카드 layout 필요.
- **Phase 7 expansion** — 사진 업로드 (place-memories / diary-photos 버킷), AI 노트 Edge Function 작성, 흔적 만들기 sheet 풀 manga.
- **캐릭터 일러스트 16장** — `docs/CHARACTER_IMAGE_PROMPTS.md` 의 GPT Image 프롬프트로 생성 → Supabase Storage `character-assets` 버킷 업로드.
- **Phase 8 설정 sub-routes** — 스토리 공개범위 / 차단 / 데이터 / 약관 등 신규 설정 화면.

### 4-D. 이번 swap 의 한계 (시각적 미세 조정 후속 필요)
일괄 swap 은 색만 바꿈. 다음과 같은 **본격 manga 디테일** 은 화면별로 추가 작업이 필요:
- 카드 모서리 잉크 외곽선 2.5px + hard shadow (현재 일부만)
- BagelFatOne 으로 큰 숫자/제목 (현재 일부 화면만)
- 도장 누르기 효과 버튼 (`InkButton`) — 현재 일부 화면만 적용
- 종이 텍스처 / 만화 패널 프레임 / 스피드 라인 등 장식

본인이 단말에서 확인하고 "이 화면은 더 정성껏 디자인해줘" 알려주시면 차례로 재작업 가능.

---

## 5. 자가검토 결과 요약

| 검사 | 결과 |
|---|---|
| typecheck 회귀 | 113 → 112 (1개 정리) ✅ |
| 옛 다크 톤 (`COLORS.background/surface`) 잔존 | 0 ✅ |
| 새 native 모듈 추가 | 0 ✅ |
| `app.json` 변경 | 0 ✅ |
| iOS 마커 코드 변경 | EventMarker / UserLocationMarker / MapClusterMarker 미변경. FriendMarker iOS 는 의도된 manga 외형 ✅ |
| manga 토큰 사용 화면 | 28 개 (앱 라우트 거의 전부) ✅ |

---

## 변경 이력
- v1 (2026-05-08): 최종 deploy 가이드. theme 통합 + 18 화면 일괄 swap + 자가검토 6 + 추가 4 픽스.
- v2 (2026-05-08): 잉크 외곽선 borderWidth 1→2 (16+ 화면 일괄) + SHADOWS.glow 제거 + CharacterBubble manga 재작성(노랑 말풍선) + map.tsx 에서 다시 활성화.
