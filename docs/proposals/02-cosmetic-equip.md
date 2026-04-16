## 코스매틱 착장 시스템 시각화 (2D SVG)
### 문제 (Why)
현재 코스매틱 시스템이 둥둥 떠다니는 이모티콘 수준(preview_emoji)으로 제공되어, 장비 구매 및 게임 진행에 대한 보상감이 떨어지고 적극적인 과금 유인이 부족함. 실제 캐릭터 디자인 텍스쳐에 입혀지는 체감적 만족도가 절실함.

### MVP 범위 (3줄 이내)
기존 텍스트/이모지 기반 장착 UI를 구조 개편하여 캐릭터 베이스 이미지 위에 부위별 파츠가 겹쳐지는 시스템 구축.
성능과 구현 비용을 고려해 3D 렌더러 기반 대신 `react-native-svg`를 이용한 2D 벡터 레이어링 도입.
프로필, 캐릭터 탭, 탐험 맵(마커) 전반에 걸쳐 레이어링 착장 결과물 반영.

### DB 스키마 변경
- `character_cosmetics` 테이블: `preview_emoji` 외에 실제 렌더링에 사용할 `asset_url` (로컬 SVG 참조명) 컬럼 추가.
- 파츠별 세부 좌표 보정(예: 모자의 anchor point offset)을 담는 `render_config` (JSONB) 컬럼 추가.

### RPC / Edge Function 변경
- 서버단 비즈니스 로직 및 DB 마이그레이션 외 동작 변경 없음. 기존 장착 로직인 `equip_cosmetic`, `unequip_cosmetic` RPC는 코스매틱 ID만 관리하므로 그대로 재사용.

### 클라이언트 변경 (화면, 컴포넌트)
- `src/components/character/CharacterAvatar.tsx` (신규): Zustand `loadout` 상태를 구독하여 베이스 캐릭터 SVG 위에 파츠별 SVG 서브 컴포넌트를 절대 좌표 기준으로 겹쳐 렌더링.
- `app/(tabs)/character.tsx`: 아바타 시각화 프리뷰 영역 확장.
- `app/character-customize.tsx`: 코스메틱 탈착 시 Avatar 컴포넌트에 즉각 반영되는 인터랙티브 피팅룸 UI.

### 공수 추정 (S/M/L/XL)
L (다양한 체형의 캐릭터와 코스매틱 파츠 간 SVG 좌표 정렬 및 장착 뷰어 구현 난이도 존재)

### 리스크 (Top 2)
- 16종 메인 캐릭터 간의 체형 차이로 인해 공통 코스매틱 파츠의 SVG Anchor 포인트가 어긋나는 부작용 (아트 공수 급증).
- Canvas가 아닌 Pure React Native SVG 레이어 의존 시 노드 급증에 따른 지도 맵 마커 프레임 드랍.

### 명시적으로 MVP에서 제외하는 것
- 착장 부수 기즈모의 라이브 2D/3D(관절별 트래킹) 애니메이션 적용.
- 유저가 직접 아이템 텍스쳐의 RGB 색상을 변경하는 팔레트 커스텀.
