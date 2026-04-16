## 크루 소셜 확장 (오프라인 모임 연동)
### 문제 (Why)
현재 크루 시스템은 멤버 목록과 주간 누적 기여도(XP)만 조회·공유하는 단편적인 구성에 머물러 있음. "위치 탐험"의 취지를 살리고 바이럴을 강화하기 위해 크루 단위의 실제 오프라인 만남과 합동 퀘스트 수행 플로우가 필요함.

### MVP 범위 (3줄 이내)
크루장이 특정 장소(기존 Event Location 활용)에 '크루 오프라인 모임(번개)'을 생성하고 공유하는 기능 추가.
크루원들의 참석 여부(RSVP) 투표 기능과 당일 해당 모임 위치에서 GPS 기반 '단체 체크인' 플로우 구현.
모임 성공적 참석(체크인 완료) 인원 전원에게 크루 활성 테마에 맞는 보너스 XP 및 코인 분배.

### DB 스키마 변경
- 정보의 독립적 관리를 위해 신규 테이블 구축 (기존 crews 확장 지양).
- `crew_meetings` 신규 생성: `crew_id`, `event_id`(장소 매핑), `meeting_time`, `status`.
- `crew_meeting_rsvps` 신규 생성: `meeting_id`, `user_id`, `status` (going, declined 등), `checked_in_at` (GPS 인증 시간).

### RPC / Edge Function 변경
- `create_crew_meeting` RPC: 모임 단위 레코드 및 메타데이터 트랜잭션 기록.
- `verify_crew_meeting_checkin` RPC: 기존 `verify_and_create_checkin` 코어 활용 구축. 설정 시간에 반경 반경 거리 내에 도달 시, RSVP된 상태를 완료로 업데이트 하고 크루 보너스 배수를 곱해 리워드 지급.

### 클라이언트 변경 (화면, 컴포넌트)
- `app/(tabs)/social.tsx`: 크루 상세뷰 내부에 '예정된 오프라인 모임' 섹션 리스트 컴포넌트 추가.
- `app/social/create-meeting.tsx` (신규): 모임 장소(지도 마커 및 주소 노출) 및 집결 시간 등 설정 폼.
- `src/components/social/MeetingCard.tsx` (신규): 참석 여부 관리 버튼(RSVP) 및 D-Day 카운트다운 표시.

### 공수 추정 (S/M/L/XL)
L (RSVP 상태 사이클 변경 사이클과 단체 체크인 동기화 로직 복잡성 수반)

### 리스크 (Top 2)
- 정해진 시간에 단체 체크인 트래픽이 몰릴 시 발생하는 GPS 인증 관련 서버 RPC 병목 우려.
- 크루 내 어뷰징(가짜 GPS 조작 툴로 원격 단체 체크인하여 팀 보상만 반복 수령하는 행위) 방어책 파훼.

### 명시적으로 MVP에서 제외하는 것
- 크루 멤버 전용 인앱 실시간 단체 채팅방 (현재의 피드형 기조 유지 우선).
- 모임 당일 결제 발생 비용 정산 혹은 N빵 더치페이 관련 유틸리티 연동.
