## 근거리 유저 마주침 알림 (Background Geofencing)
### 문제 (Why)
위치 기반 RPG의 핵심 재미 요소인 "내 주위에 다른 탐험가가 있다"는 현장 체감이 부족함. 근거리 유저를 감지하고 알림을 주어 소셜 상호작용(친선 인사 추파, 크루 가입 제안)을 유도하고 리텐션을 극대화할 강력한 메커니즘이 필요함.

### MVP 범위 (3줄 이내)
반경 100m 내에 다른 앱 유저가 감지되었을 때 즉각적인 로컬 푸시 알림("근처에 별찌 탐험가가 출현했습니다!") 발송.
서버 풀링 부하 및 배터리 방지 차원에서, OS 단 지오펜싱(Significant Location Change)과 Redis(혹은 DB 임시 테이블) 공간 쿼리를 결합.
개인정보 보호 관점에서 명시적인 프로필 노출 동의 완료 유저간에만 스캐닝되며, 일부 마스킹된 닉네임 교차 사용 권장.

### DB 스키마 변경
- `profiles` 테이블: `allow_proximity_alert` (boolean, def: false) 노출 허용 플래그 반영.
- 알림용 임시 위치 데이터 캐싱을 위한 외부 Redis 도입이 이상적이나, MVP는 기존 `friend_locations` 테이블 구조를 차용한 `active_users_location` 임시 테이블과 TTL 기반 스위퍼 관리.

### RPC / Edge Function 변경
- `update_my_location_background` RPC: `allow_proximity_alert`가 true인 경우만 로케이션 스캔 트리거.
- Edge Function `scan-proximity-users`: 유저 위치 갱신 트리거로 실행. 타겟 유저 반경 100m 교집합 도출 시 대상자 쌍방에 Expo Push 발송. (스팸 방지를 위해 DB `proximity_alert_logs` 기록 후 유저 쌍 당 2시간-3시간 내 1회 쿨타임 제한)

### 클라이언트 변경 (화면, 컴포넌트)
- `app/settings/notifications.tsx`: 근거리 마주침 알림 토글 추가. 토글 활성화 시 OS 네이티브 Background Location 승인 프롬프트 연동.
- `src/services/backgroundLocation.ts`: Expo Task Manager의 백그라운드 구동 조건 최적화 (이동 거리 150~200m 임계치마다 호출) 및 에러 핸들링.

### 공수 추정 (S/M/L/XL)
XL (백그라운드 위치 구동 관련 iOS/Android OS의 파편화된 정책 돌파 및 배터리 방어 로직 디버깅에 큰 품 듦)

### 리스크 (Top 2)
- 지속적인 백그라운드 기지국/GPS 수집으로 인한 앱 스토어 리뷰 통과 실패 리스크 또는 사용자 배터리 광탈 불만 제기.
- 악의적 유저가 삼각측량 등 스니핑으로 타 유저 실시간 위치를 추적할 가능성 발생.

### 명시적으로 MVP에서 제외하는 것
- 상대방의 명확한 실시간 핀포인트 좌표를 지도 마커에 전시하는 기능.
- AR 카메라 뷰를 통과시켜 시야 내 캐릭터 3D 공간 연출.
