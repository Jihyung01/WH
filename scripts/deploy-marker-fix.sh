#!/usr/bin/env bash
# 마커 깨짐(Z Flip) 핫픽스 → commit + push + OTA 한 번에.
# 사용:  bash scripts/deploy-marker-fix.sh
#
# Cowork 샌드박스가 .git/index.lock 잠금파일 정리 권한이 없어 만들어둔 헬퍼.
# 단말 터미널에서 한 번 돌려주면 됩니다.

set -euo pipefail
cd "$(dirname "$0")/.."

# 1) 샌드박스가 못 지운 stale lock 정리
rm -f .git/index.lock .git/HEAD.lock .git/objects/maintenance.lock 2>/dev/null || true

# 2) 변경 staged & 직전 커밋(있으면 그대로 사용) — 작업트리 변경이 있을 때만 새 commit
if ! git diff --quiet src/components/map/EventMarker.tsx src/components/map/UserLocationMarker.tsx 2>/dev/null \
   || ! git diff --cached --quiet src/components/map/EventMarker.tsx src/components/map/UserLocationMarker.tsx 2>/dev/null; then
  git add src/components/map/EventMarker.tsx src/components/map/UserLocationMarker.tsx
  git commit -m "fix(android): Samsung One UI(Z Flip) 마커 비트맵에 SVG도 누락 → 순수 View 로 재작성

- EventMarker / UserLocationMarker Android 분기에서 react-native-svg 제거.
  버블·헤일로·세 동심원 모두 RN <View> + borderRadius 로 다시 그림.
- 카테고리/캐릭터 아이콘은 굵은 ASCII 한 글자 <Text> 로 표시 (시스템 sans 폰트
  글리프는 OEM ROM 비트맵 스냅샷이 가장 안정적으로 보존하는 자원).
- iOS 분기(Ionicons + Reanimated pulse + heading cone + CharacterAvatar)는
  한 글자도 건드리지 않음.
- 사용 안 하는 import / 상수 / SVG path 모두 정리.

OTA 안전: 새 네이티브 모듈 없음, app.json 변경 없음."
fi

# 3) push (직전 커밋 fcd83fb 가 아직 origin에 안 올라가 있을 가능성도 있어서 무조건 push)
git push origin main

# 4) OTA — production 채널
npx eas update --channel production --message "fix(android): Z Flip 마커 SVG 누락 → 순수 View 로 재작성"

echo "✅ Deploy complete. Z Flip 단말에서 앱 재기동 후 지도 마커 확인."
