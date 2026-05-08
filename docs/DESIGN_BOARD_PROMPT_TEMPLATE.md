# WhereHere 디자인 보드 프롬프트 템플릿

올려주신 두 보드(Editorial Explorer · Tactile Adventure) 의 **레이아웃과 콘텐츠는 그대로 두고 디자인 톤만 갈아끼우는** 프롬프트 템플릿입니다. ChatGPT 4o image generation, Midjourney, Sora, Adobe Firefly, Figma AI 등에 그대로 붙여넣어 쓰세요.

---

## 사용법

1. 아래 **마스터 프롬프트** 를 복사
2. `[[ ... ]]` 로 표시된 7개 변수를 원하는 톤으로 채움
3. 또는 하단 **5개 프리셋** 중 하나 선택 → 해당 변수값을 통째로 마스터 프롬프트에 대입
4. 생성 도구에 붙여넣어 결과 확인. 만족 안 하면 변수만 바꿔서 다시.

---

## 보드 레이아웃 (절대 안 바뀌는 골격)

```
┌─────────────────────────────────────────────────────────────────┐
│ [BRAND LOCKUP]               [LABEL]    [LABEL]    [LABEL]      │
│ WhereHere                     지도        피드       소셜          │
│                                                                  │
│ [HEADLINE]                  ┌──────┐  ┌──────┐   ┌──────┐       │
│ Editorial Explorer          │      │  │      │   │      │       │
│                             │ phone│  │ phone│   │ phone│       │
│ [TAGLINE]                   │  1   │  │  2   │   │  3   │       │
│ 발견이 모험이 되고                  │      │  │      │   │      │       │
│ 위치가 이야기가 되는 곳              └──────┘  └──────┘   └──────┘       │
│                                                                  │
│ [CONCEPT TAG]                              [LABEL]    [LABEL]    │
│ DESIGN CONCEPT                              캐릭터      프로필      │
│                                                                  │
│ [5 FEATURE BULLETS]                       ┌──────┐   ┌──────┐    │
│ 📍 탐험을 기록하고                                │      │   │      │    │
│ 📷 경험을 공유하고                                │ phone│   │ phone│    │
│ 👥 친구와 연결되고                                │  4   │   │  5   │    │
│ ⭐ 캐릭터를 성장시키고                             │      │   │      │    │
│ 🧭 나만의 여정을 완성하세요                         └──────┘   └──────┘    │
└─────────────────────────────────────────────────────────────────┘
```

- 가로 비율 4:3 또는 16:10
- 좌측 28-32%: 브랜딩 + 콘셉트 + 기능 5개
- 우측 70%: 5개 iPhone mockup (3개 위 + 2개 아래)
- 모든 폰: iOS 17+ Dynamic Island, 9:41 status bar, ●●●● Wi-Fi ▮ 배터리

---

## 5개 폰 화면 콘텐츠 (절대 안 바뀜 — WhereHere 실제 기능 반영)

### 화면 1 — 지도

- 정자동 일대 지도 (한국 도시)
- 본인 위치: 중앙. 캐릭터 아바타 마커 + 체크인 반경 원
- 이벤트 마커 3-4개: 탐험(별)/카페(잔)/자연(잎)/주차장(P)
- 클러스터 마커 1개: 좌상단 "20" + 왕관
- 우측 플로팅 버튼 3개: 알림 / 레이어 / 위치 (스택 세로)
- 우측 하단 FAB: 이벤트 만들기 (펜 아이콘)
- 하단 시트(선택): "황상연님 근처 / 정자동 카페거리 / 도보 2분 거리 · 새로운 장소 3곳" + 친구 아바타 4개 + "+2"
- 하단 탭바: **지도** 활성

### 화면 2 — 피드

- 상단 탭: **추천** 활성 / 팔로잉
- 첫 포스트:
  - 작성자: 이지형 · 정자동 · 4월 19일 (또는 2시간 전)
  - 큰 사진 1장 (자연/카페 풍경)
  - 제목: "봄날의 작은 발견" (큰 흰 글씨, 사진 위)
  - 부제: "정자동 카페거리에서 만난 따뜻한 순간들"
  - 좋아요 ♥ 128, 댓글 💬 32, 공유 ↗ 14
- 두 번째 포스트 부분 노출: 작성자 Kdywj · 불정로 · 5일 전
- 하단 탭바: **피드** 활성

### 화면 3 — 소셜

- 상단 탭: **친구** 활성 / 크루
- 위치 공유 카드: "📍 실시간 위치 공유 · 친구 지도에 내 위치 표시 · 토글 ON(초록)"
- 친구 추가 검색바: "닉네임으로 친구 추가" + [추가] 버튼
- 친구 4명 카드 리스트:
  1. 권 (보라색) · 권재우 · Lv.1 · 공유 중 · 최근 위치 없음 · 5분 전
  2. 정 (빨강) · 정유노 · Lv.1 · 공유 중 · 최근 위치 없음 · 1시간 전
  3. 주 (초록) · 주정빈 · Lv.1 · 3시간 전
  4. 황 (올리브) · 황상연 · Lv.2 · 공유 중 · 최근 위치 없음 · 온라인
- 각 캐릭터 색 동그라미 + 한글 이니셜
- 하단 탭바: **소셜** 활성

### 화면 4 — 캐릭터

- 상단: "별의 항해사 ›" + 코인 뱃지 "🪙 492,330"
- 중앙 hero 카드:
  - 별찌 캐릭터 (큰 별/일러스트)
  - 라벨: ★ Adult
  - 큰 텍스트: "Lv.20 별찌"
  - XP 진행바 + "101,585 / 10,000 XP"
  - "별찌의 기분: 행복한 😊"
  - 칩: "탐지 +80m" / "스트릭 보호"
- 코스메틱 슬롯 5개 (가로 배치): 모자 / 의상 / 악세 / 배경 / 오라
- 액션 버튼 4개 (2x2): 꾸미기 / 상점 / 칭호 / 대화
- 하단 탭바: **캐릭터** 활성

### 화면 5 — 프로필

- 상단 탭: 프로필 활성 / 탐험 / 가방
- 본인 프로필 카드:
  - 별찌 아바타 (마법사 모자 쓴 캐릭터)
  - 별의 항해사 · Lv.20
  - XP 진행바 "101,585 / 10,000"
  - "다음 진화까지 11레벨!"
- (선택) 멤버십 카드: WhereHere 멤버십 · 프리미엄 · 유효기간
- 탐험 허브 6개 타일 (3x2):
  1. 탐험 허브 (소셜·크루·위치)
  2. 시즌 패스 (보상 트랙)
  3. 탐험 일지 (AI 일지·공유)
  4. 프리미엄 (구독·혜택)
  5. 캐릭터 채팅 (AI 대화)
  6. 이벤트 제안 (UGC 생성)
- 설정 리스트: 알림 설정 / 위치 권한 관리 / 앱 버전 1.0.0
- 하단 탭바: **프로필** 활성

---

## 마스터 프롬프트 (복사해서 쓰기)

```
A high-fidelity mobile app design board for "WhereHere" — a Korean location-based exploration social app combining map discovery, character growth, and AI narrative.

LAYOUT:
4:3 aspect canvas, [[BACKGROUND_TREATMENT]].
Left column (~30%): brand lockup at top reading "WhereHere" in [[HEADER_TYPOGRAPHY]]. Below, headline "[[CONCEPT_NAME]]" in oversized [[HEADER_TYPOGRAPHY]] with the tagline "[[TAGLINE_KO]]" in [[BODY_TYPOGRAPHY]]. Then "DESIGN CONCEPT" small caps label, a horizontal divider, and 5 feature bullets each with a small icon: 탐험을 기록하고 / 경험을 공유하고 / 친구와 연결되고 / 캐릭터를 성장시키고 / 나만의 여정을 완성하세요.

Right area (~70%): five iPhone 15 Pro mockups arranged 3 across the top row and 2 in the bottom row, each with Dynamic Island and 9:41 status bar. Above each phone, small sans-serif label in Korean reading 지도 / 피드 / 소셜 / 캐릭터 / 프로필 in that exact order.

DESIGN TONE:
[[TONE_DESCRIPTION]]
Primary accent color: [[ACCENT_HEX]]. Secondary: [[SECONDARY_HEX]]. Background: [[BG_HEX]].
Icons rendered as [[ICON_STYLE]]. Character "별찌" rendered as [[CHARACTER_STYLE]]. Cards use [[CARD_STYLE]]. Map tiles styled as [[MAP_STYLE]]. Tab bar [[TABBAR_STYLE]].

PHONE 1 (지도): Map of 정자동 Bundang Korea. User location centered with character avatar marker and check-in radius circle. 3-4 event markers scattered (exploration star, cafe cup, nature leaf). One cluster marker top-left labelled "20" with a small crown. Right side stack of 3 floating circular buttons (notification bell, layers, location compass). Bottom-right floating action button with pencil icon. Bottom info card: "황상연님 근처 / 정자동 카페거리 · 도보 2분 거리 · 새로운 장소 3곳" with 4 friend avatar circles "+2".

PHONE 2 (피드): Top tabs "추천" (active) and "팔로잉". First post: author "이지형 · 정자동 · 4월 19일", large landscape photo of a sunlit cafe interior with houseplants, overlay title "봄날의 작은 발견" and subtitle "정자동 카페거리에서 만난 따뜻한 순간들". Reaction row "♥ 128 · 💬 32 · ↗ 14". Below, beginning of next post with avatar "Kdywj · 불정로 · 5일 전".

PHONE 3 (소셜): Top tabs "친구" (active) and "크루". Real-time location share card with toggle ON in green: "📍 실시간 위치 공유 · 친구 지도에 내 위치를 표시해요". Search bar "닉네임으로 친구 추가" with [추가] button. List "친구 (4)" with 4 friend rows, each with circular avatar showing single Korean character (권 purple, 정 red, 주 green, 황 olive), name, level Lv.1-2, location/status, and timestamp.

PHONE 4 (캐릭터): Header "별의 항해사 ›" and coin badge "🪙 492,330". Hero card centered: large 별찌 character illustration with "★ Adult" label below, then "Lv.20 별찌" in large display weight, XP progress bar "101,585 / 10,000 XP", mood "별찌의 기분: 행복한 😊", chips "탐지 +80m" and "스트릭 보호". Row of 5 circular cosmetic slots labelled 모자 / 의상 / 악세 / 배경 / 오라. Then 2x2 grid of large action buttons: 꾸미기 (palette icon) / 상점 (shop icon) / 칭호 (badge icon) / 대화 (chat icon).

PHONE 5 (프로필): Top tabs 프로필 (active) / 탐험 / 가방. Profile card with 별찌 wizard-hat avatar, "별의 항해사" subtitle, "Lv.20" badge, XP progress "101,585 / 10,000 XP", caption "다음 진화까지 11레벨!". 3x2 bento grid of "탐험 허브" tiles each with icon + label + sublabel: 탐험허브(친구·크루·위치) / 시즌패스(보상 트랙) / 탐험일지(AI 일지·공유) / 프리미엄(구독·혜택) / 캐릭터채팅(AI 대화) / 이벤트제안(UGC 생성). Below, settings list rows "알림 설정 / 위치 권한 관리 / 앱 버전 1.0.0".

All 5 phones share the same bottom tab bar with 5 tabs: 지도 / 피드 / 소셜 / 캐릭터 / 프로필 — each phone highlights its own tab as active in [[ACCENT_HEX]].

STYLE DIRECTIVES:
- Photorealistic phone frames, accurate iOS chrome.
- Korean typography rendered correctly (use system Korean fonts).
- High visual fidelity, marketing-board quality.
- No watermarks, no logos other than WhereHere branding.
- Aspect ratio 4:3.
```

---

## 5종 톤 프리셋 — 복사해서 변수에 대입

### 프리셋 A. 만화 모험 (Manga Adventure) — 추천

```
[[BACKGROUND_TREATMENT]] = warm cream paper background with subtle ink texture and small ink-splatter accents in corners
[[CONCEPT_NAME]] = Manga Adventure
[[TAGLINE_KO]] = 한 컷 한 컷, 너의 모험이 펼쳐지는 곳
[[HEADER_TYPOGRAPHY]] = bold serif italic with hand-inked feel (think shonen manga title card)
[[BODY_TYPOGRAPHY]] = clean Korean sans-serif (Pretendard)
[[TONE_DESCRIPTION]] = Bright manga adventure aesthetic. Thick black ink outlines (3-4px) on every UI element, screen-tone dot patterns for shading, warm cream paper background, single bright yellow accent color, manga-style speed lines and sparkle effects around hero elements, comic-book speech bubble shapes for important callouts.
[[ACCENT_HEX]] = #FFE15A (bright manga yellow)
[[SECONDARY_HEX]] = #F87171 (action red for sparkles)
[[BG_HEX]] = #FFFCF5 (cream paper)
[[ICON_STYLE]] = bold ink-line icons with thick black outlines, white fill, occasional yellow accent
[[CHARACTER_STYLE]] = round chibi-style 별찌 character with bold black outline, big sparkle eyes, expressive pose, screen-tone shading on one side
[[CARD_STYLE]] = white cards with thick 2.5px black borders, no shadows (manga panels)
[[MAP_STYLE]] = ink-line manga map with bold black roads, hatched green parks, serif italic Korean labels
[[TABBAR_STYLE]] = white background with thick 2.5px black top border, active tab in yellow
```

### 프리셋 B. 픽셀 RPG (Pixel Quest)

```
[[BACKGROUND_TREATMENT]] = pixel-art tiled background with 8-bit dithered gradient sky
[[CONCEPT_NAME]] = Pixel Quest
[[TAGLINE_KO]] = 도시가 던전이 되는 순간
[[HEADER_TYPOGRAPHY]] = pixel/bitmap font with chunky letterforms (DotumChe-style)
[[BODY_TYPOGRAPHY]] = monospace pixel font for body
[[TONE_DESCRIPTION]] = Retro pixel-art RPG aesthetic. Everything rendered at 2x pixel scale, 16-bit Game Boy Advance era palette, dithered gradients, pixel-perfect borders, sprite-like character rendering, NES/SNES UI conventions (chunky bordered cards, life-bar style XP), CRT scanline overlay subtle.
[[ACCENT_HEX]] = #5EE270 (pixel green)
[[SECONDARY_HEX]] = #FF8855 (RPG orange)
[[BG_HEX]] = #1A1F3D (deep night blue)
[[ICON_STYLE]] = 16x16 pixel sprite icons with limited color palette
[[CHARACTER_STYLE]] = 32x32 pixel sprite of 별찌 with 4-color palette, idle pose with subtle 2-frame animation feel
[[CARD_STYLE]] = chunky pixel-bordered windows with 2px black outlines and 1px highlight (Final Fantasy menu style)
[[MAP_STYLE]] = top-down JRPG town map with pixel-tile streets, sprite buildings, 16-bit Korean labels
[[TABBAR_STYLE]] = pixel HUD bar at bottom, chunky icons, active tab glows
```

### 프리셋 C. 우주 모험 (Cosmic Voyager)

```
[[BACKGROUND_TREATMENT]] = deep space gradient with star particles, distant nebula glow, faint constellations
[[CONCEPT_NAME]] = Cosmic Voyager
[[TAGLINE_KO]] = 별의 길을 따라, 너의 우주가 열린다
[[HEADER_TYPOGRAPHY]] = futuristic geometric sans-serif with light weight
[[BODY_TYPOGRAPHY]] = modern Korean sans-serif (Pretendard Light)
[[TONE_DESCRIPTION]] = Cinematic space exploration aesthetic. Deep navy gradient backgrounds, star particle overlays, glowing accent lines, soft purple-to-cyan gradients on hero elements, holographic glass-morphism cards with subtle border glow, rim-light on character, comet trail motifs, constellation connector lines.
[[ACCENT_HEX]] = #5EEAD4 (cosmic teal)
[[SECONDARY_HEX]] = #C084FC (nebula purple)
[[BG_HEX]] = #0B0B1F (deep space)
[[ICON_STYLE]] = thin glowing line icons with subtle teal halo
[[CHARACTER_STYLE]] = painterly cosmic 별찌 — golden star with rim light, surrounded by tiny orbiting particles, standing on a small floating rock platform
[[CARD_STYLE]] = dark glass-morphism cards with 1px teal-glow border, soft inner gradient
[[MAP_STYLE]] = dark cosmic map — roads as glowing constellation lines, parks as nebula clouds, labels in faint cyan
[[TABBAR_STYLE]] = transparent dark bar with glowing teal active state
```

### 프리셋 D. 시티팝 레트로 (Citypop Retro)

```
[[BACKGROUND_TREATMENT]] = vaporwave gradient background — deep purple at top transitioning to hot pink and warm orange at bottom, subtle grid lines overlaid, distant Mt. Fuji silhouette
[[CONCEPT_NAME]] = Citypop Retro
[[TAGLINE_KO]] = 80년대의 너, 2026년의 도시를 걷다
[[HEADER_TYPOGRAPHY]] = bold display sans with 80s arcade neon outline (chrome treatment)
[[BODY_TYPOGRAPHY]] = clean modern Korean sans
[[TONE_DESCRIPTION]] = 80s Japanese citypop / vaporwave aesthetic. Pink and cyan neon palette, chrome highlights, retro grid floor perspective lines, palm tree silhouettes, lens-flare sparkles, chrome typography with neon outline, Macross-era anime references.
[[ACCENT_HEX]] = #FF6B9D (citypop pink)
[[SECONDARY_HEX]] = #00E5E5 (neon cyan)
[[BG_HEX]] = #1A0140 (deep night purple)
[[ICON_STYLE]] = chrome icons with cyan-magenta neon outlines, glossy highlights
[[CHARACTER_STYLE]] = 별찌 as chrome metallic star with cyan core, glowing magenta outer rim, retro Macross style
[[CARD_STYLE]] = dark cards with magenta-cyan gradient borders, occasional grid line texture
[[MAP_STYLE]] = dark citypop map with neon cyan main roads, magenta secondary roads, grid floor perspective, minimal POI
[[TABBAR_STYLE]] = dark bar with neon cyan/magenta active border, retro arcade feel
```

### 프리셋 E. 자연 도감 (Naturalist Field Notes)

```
[[BACKGROUND_TREATMENT]] = aged botanical sketchbook paper with faint pressed-leaf imprints in corners
[[CONCEPT_NAME]] = Naturalist Field Notes
[[TAGLINE_KO]] = 도시 속 작은 자연을 기록하는 탐사 일지
[[HEADER_TYPOGRAPHY]] = elegant serif (Cormorant or Tiempos style) with refined italic
[[BODY_TYPOGRAPHY]] = serif body for editorial feel + Pretendard Korean
[[TONE_DESCRIPTION]] = 19th-century naturalist field journal aesthetic. Aged paper textures, sepia ink illustrations, watercolor washes for color, hand-lettered Korean labels, botanical-illustration-style icons, brass compass and magnifier motifs, taxonomic-style information tables, serif editorial typography.
[[ACCENT_HEX]] = #5C7C3C (botanical green)
[[SECONDARY_HEX]] = #B8893E (brass)
[[BG_HEX]] = #F5EBD3 (aged paper)
[[ICON_STYLE]] = sepia ink illustrations of botanical icons with watercolor wash fill
[[CHARACTER_STYLE]] = 별찌 as a hand-painted watercolor star with botanical ornaments, looking like a pressed specimen plate
[[CARD_STYLE]] = aged paper cards with sepia ink borders, optional ribbon-like header
[[MAP_STYLE]] = hand-drawn sepia map style with watercolor green parks and blue rivers, calligraphic Korean labels
[[TABBAR_STYLE]] = aged paper bar with sepia line icons, active tab in botanical green
```

---

## 사용 예시 (만화 모험 톤으로 생성하는 경우)

위 프리셋 A 의 9개 변수값을 **마스터 프롬프트** 의 `[[ ... ]]` 자리에 그대로 대입한 뒤 ChatGPT 4o image / Midjourney / Sora / Adobe Firefly 에 붙여넣으면 됩니다.

대입 후 결과는:
- 좌측: WhereHere 로고 + "Manga Adventure" 큰 헤드라인 + "한 컷 한 컷, 너의 모험이 펼쳐지는 곳" 태그라인 + 5개 기능 리스트
- 우측: 5개 폰 mockup, 모두 만화 톤 (잉크선 + 옐로우 액센트 + 크림 종이)
- 모든 폰의 콘텐츠는 위에 명시한 WhereHere 실제 기능 그대로

---

## 자주 쓸 때 팁

- **AI image gen 별 강점**:
  - **ChatGPT 4o image** = 한국어 텍스트 정확도 가장 높음 (Korean labels 제대로 렌더)
  - **Midjourney v6+** = 보드 전체 분위기 / 폰 mockup 디테일 가장 폴리시
  - **Sora image** = 일러스트 스타일 캐릭터 가장 자연스러움
  - **Adobe Firefly** = 상업 사용 라이선스 안전
- **한국어가 깨지면**: 라벨을 영문으로 받고 후작업으로 한국어 덮기 (Figma/Photoshop)
- **5개 폰을 한 번에 못 만들면**: 폰 1개씩 따로 생성 후 보드에 합성
- **새 톤 프리셋 만들 때**: 9개 변수만 정의하면 됨. 톤 일관성을 위해 `ACCENT_HEX` 는 1개만 강하게, `SECONDARY` 는 보조

---

## 변경 이력

- v1 (2026-05-08): 첫 릴리스. Editorial Explorer / Tactile Adventure 두 보드 기반 추출. 5종 프리셋 (만화/픽셀/우주/시티팝/자연도감).
