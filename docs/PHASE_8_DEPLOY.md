# Phase 8 Deploy Notes

## Scope

- 지도 검색 시트 연결
- 지도 FAB와 근처 탐험지 캐러셀 겹침 조정
- 친구 프로필 1:1 메시지 연결
- 메시지 탭 QuickAction 연결
- 그룹 채팅 생성, 번개 약속, 단체 영상 상태 RPC 추가
- 일기 생성 함수 JWT 검증 설정 정리
- 다크 placeholder 화면 제거

## Database

Applied with `npx supabase db push`.

- `20260509110000_phase8_chat_actions.sql`
  - `create_group_chat_room`
  - `start_group_call`
  - `end_group_call`
  - `lightning_meetups`
  - `lightning_meetup_invitees`
  - `create_lightning_meetup`
  - `respond_lightning_meetup`

## Edge Functions

Deployed with `npx supabase functions deploy generate-journal`.

- `generate-journal`
  - gateway JWT verification disabled in `supabase/config.toml`
  - function body still verifies the Bearer token with Supabase Auth

## OTA

Use production environment variables:

```bash
eas update --channel production --environment production --message "Phase 8 지도 검색과 메시지 기능 연결"
```

## Manual Smoke Test

1. 지도 탭 검색바를 누르고 장소를 검색한다.
2. 검색 결과를 누르면 지도 카메라가 이동하는지 확인한다.
3. 메시지 탭에서 그룹 만들기, 단체 영상, 번개 약속, 위치 공유를 각각 누른다.
4. 친구 프로필에서 1:1 메시지 버튼이 채팅방으로 이동하는지 확인한다.
5. 일기 생성과 일기/메모리 사진 업로드를 다시 확인한다.
