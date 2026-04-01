# WhereHere — 앱스토어 메타데이터

> iOS App Store + Google Play 공통 기준. 플랫폼별 차이는 각 섹션에 명시.

### 법적 고지 URL (Notion)

앱 `설정`과 동일하게 아래를 사용합니다. **노션 페이지에서 「웹에 게시」**를 켜야 스토어 심사·비로그인 사용자가 열 수 있습니다.

- **개인정보 / 약관 (동일 페이지):** [https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16](https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16)
- 약관만 별도 노션 페이지로 쪼갤 경우 `app/settings/index.tsx`의 `TERMS_OF_SERVICE_URL`만 바꾸면 됩니다.

---

## 앱 기본 정보

| 항목 | 값 |
|---|---|
| 앱 이름 | WhereHere |
| 부제목 (iOS 전용, 30자 이내) | 여기서 탐험, 미션, 보상 |
| 번들 ID | com.wherehere.app |
| 버전 | 1.0.0 |
| 카테고리 (iOS) | 게임 > 롤플레잉 / 참조 |
| 카테고리 (Android) | 게임 / 여행 및 지역 정보 |
| 연령 등급 | 4+ (iOS) / 전체 이용가 (Android) |
| 가격 | 무료 (인앱 구매 포함) |
| 언어 | 한국어 |

---

## iOS App Store

### 앱 이름 (30자 이내)
```
WhereHere — 탐험 미션 도시 게임
```

### 부제목 (30자 이내)
```
여기서 발견하고, 체크인하고, 성장하세요
```

### 프로모션 텍스트 (170자 이내, 심사 없이 수정 가능)
```
서울 곳곳의 숨겨진 장소를 탐험하며 미션을 완료하고 나만의 캐릭터를 키워보세요.
지금 바로 탐험을 시작하세요!
```

### 설명 (4000자 이내)

> **App Store Connect 오류** (`영어(미국) - 설명 - 유효하지 않은 문자`):  
> **영어(미국)** 로컬에는 **영문과 기본 문장 부호만** 넣으세요. 한글·이모지·장식용 줄(`───`)·`[ ]` 괄호·스마트 따옴표·긴 대시 `—` 는 **한국어 탭**용으로 두고, 영어 탭에는 **아래 "영어(미국) 전용" 블록**만 붙여넣습니다.

#### 영어 (미국) 전용 — 설명 (복사용, ASCII 위주)

```
Start exploring here and now with WhereHere.

WhereHere is a location-based exploration game built around Seoul streets and landmarks. Visit real places, complete missions, and grow your character.

Explore on foot
GPS helps verify your visits in real time. Discover nearby events on the map and visit them in person. Hidden spots across Seoul are waiting for you.

Missions
- Photo missions: take a photo at a specific place to verify.
- Quiz missions: answer questions about local history and culture.
- Check-in missions: complete with on-site GPS verification.
Earn XP, coins, and special badges when you finish missions.

Grow your character
Choose one of four companions and develop exploration, charm, stamina, and luck. Collect gear and costumes to build your style.

Rewards
- Badge collections for regions and mission types
- Level-up rewards
- Seasonal limited content

Everyday exploration
WhereHere turns everyday movement into exploration: commutes, weekends, and trips.

Download now and begin your first adventure.

Permissions
- Location (required): nearby events and check-in verification.
- Camera (optional): photo missions.
- Notifications (optional): nearby event alerts.
- Background location (optional): automatic nearby event alerts.

Privacy Policy: https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16
Terms of Use: https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16
Support: ekzmwlgud@naver.com
```

#### 한국어 — 설명 (한국어 로컬 탭에만 붙여넣기)

```
여기, 지금, 탐험을 시작하세요 — WhereHere

WhereHere는 서울의 골목과 랜드마크를 게임으로 만든 위치 기반 탐험 앱입니다.
실제로 발걸음을 옮겨 장소를 방문하고, 미션을 완료하고,
나만의 캐릭터를 성장시켜 보세요.

──────────────────────────
🗺 실제 발걸음으로 탐험하세요
──────────────────────────
GPS가 당신의 방문을 실시간으로 검증합니다.
지도에서 주변 이벤트를 발견하고 직접 찾아가세요.
서울 각 지역구의 숨겨진 명소가 기다리고 있습니다.

──────────────────────────
⚔ 다양한 미션에 도전하세요
──────────────────────────
• 포토 미션 — 특정 장소에서 사진을 찍어 인증
• 퀴즈 미션 — 지역 역사와 문화에 관한 퀴즈 풀기
• 체크인 미션 — 현장 GPS 인증으로 완료
미션을 완료하면 XP와 코인, 특별 배지를 획득합니다.

──────────────────────────
🧑 나만의 캐릭터를 키우세요
──────────────────────────
4가지 개성 있는 동반자(도담, 나래, 하람, 별찌) 중 하나를 선택해
탐험력, 매력, 체력, 행운 4가지 스탯을 성장시키세요.
장비와 코스튬으로 나만의 스타일을 완성할 수 있습니다.

──────────────────────────
🏅 보상을 모으세요
──────────────────────────
• 뱃지 컬렉션 — 지역별, 미션별 다양한 배지
• 레벨업 보상 — 레벨이 오를수록 더 큰 보상
• 시즌 이벤트 — 계절마다 새로운 한정 콘텐츠

──────────────────────────
📍 지금 어디 있나요?
──────────────────────────
WhereHere와 함께라면 일상적인 이동이 탐험이 됩니다.
출퇴근길, 주말 나들이, 여행 중에도 — 언제 어디서나 미션이 기다립니다.

지금 다운로드하고 첫 번째 탐험을 시작하세요!

──────────────────────────
개인정보 및 권한 안내
──────────────────────────
• 위치 권한: 주변 이벤트 탐색 및 체크인 검증에 사용됩니다.
• 카메라 권한: 포토 미션 촬영에 사용됩니다 (선택).
• 알림 권한: 주변 이벤트 도착 알림에 사용됩니다 (선택).

개인정보처리방침: https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16
이용약관: https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16
```

### 키워드 (100자 이내, 쉼표 구분)
```
탐험,미션,위치게임,체크인,서울,지도,캐릭터,RPG,산책,숨은명소
```

### 지원 URL
```
mailto:ekzmwlgud@naver.com
```
(또는 추후 웹 고객센터 URL)

### 개인정보처리방침 URL
```
https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16
```

### 저작권
```
© 2026 WhereHere
```

---

## Google Play Store

### 앱 이름 (50자 이내)
```
WhereHere — 탐험 미션 위치 게임
```

### 간단한 설명 (80자 이내)
```
서울을 탐험하며 미션을 완료하고 캐릭터를 성장시키는 위치 기반 게임
```

### 자세한 설명 (4000자 이내)
```
여기, 지금, 탐험을 시작하세요 — WhereHere

WhereHere는 서울의 골목과 랜드마크를 게임으로 만든 위치 기반 탐험 앱입니다.
실제로 발걸음을 옮겨 장소를 방문하고, 미션을 완료하고,
나만의 캐릭터를 성장시켜 보세요.

🗺 실제 발걸음으로 탐험하세요
GPS가 당신의 방문을 실시간으로 검증합니다.
지도에서 주변 이벤트를 발견하고 직접 찾아가세요.
서울 각 지역구의 숨겨진 명소가 기다리고 있습니다.

⚔ 다양한 미션에 도전하세요
• 포토 미션 — 특정 장소에서 사진을 찍어 인증
• 퀴즈 미션 — 지역 역사와 문화에 관한 퀴즈 풀기
• 체크인 미션 — 현장 GPS 인증으로 완료
미션을 완료하면 XP와 코인, 특별 배지를 획득합니다.

🧑 나만의 캐릭터를 키우세요
4가지 개성 있는 동반자(도담, 나래, 하람, 별찌) 중 하나를 선택해
탐험력, 매력, 체력, 행운 4가지 스탯을 성장시키세요.
장비와 코스튬으로 나만의 스타일을 완성할 수 있습니다.

🏅 보상을 모으세요
• 뱃지 컬렉션 — 지역별, 미션별 다양한 배지
• 레벨업 보상 — 레벨이 오를수록 더 큰 보상
• 시즌 이벤트 — 계절마다 새로운 한정 콘텐츠

📍 지금 어디 있나요?
WhereHere와 함께라면 일상적인 이동이 탐험이 됩니다.
출퇴근길, 주말 나들이, 여행 중에도 — 언제 어디서나 미션이 기다립니다.

지금 다운로드하고 첫 번째 탐험을 시작하세요!

──────────────────────────
권한 안내
──────────────────────────
• 위치 (필수): 주변 이벤트 탐색 및 체크인 검증
• 카메라 (선택): 포토 미션 촬영
• 알림 (선택): 주변 이벤트 도착 알림
• 백그라운드 위치 (선택): 근처 이벤트 자동 알림

개인정보처리방침: https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16
이용약관: https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16
고객센터: support@wherehere.app
```

### 앱 카테고리
- 기본: 게임 > 롤플레잉
- 태그: 위치 기반, 탐험, 미션

### 연락처 이메일
```
support@wherehere.app
```

### 개인정보처리방침 URL
```
https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16
```

---

## 연령 등급 설문 답변

### iOS (App Store Connect)
| 항목 | 답변 |
|---|---|
| 폭력 (만화/환상) | 없음 |
| 폭력 (현실) | 없음 |
| 성인 및 선정적 주제 | 없음 |
| 공포/공포 테마 | 없음 |
| 의료/치료 정보 | 없음 |
| 알코올, 담배 또는 약물 사용 | 없음 |
| 도박 | 없음 |
| 성적 콘텐츠 및 누드 | 없음 |
| 위치 공유 | 예 (사용자 자신만) |
| 인앱 구매 | 예 |

→ **예상 등급: 4+**

### Android (Google Play)
- 대상 연령: 만 14세 이상
- 인터랙티브 요소: 디지털 구매, 위치 공유 (사용자 자신)
- → **예상 등급: 전체 이용가**

---

## 스토어 제출 시 URL 체크

| 용도 | URL |
|---|---|
| 개인정보처리방침 | `https://jungle-bearskin-b04.notion.site/335048355db7806eab9af84e3afe8f16` |
| 이용약관 | 위와 동일(한 페이지) 또는 별도 노션 공개 페이지 |
| 고객 지원 | `mailto:support@wherehere.app` 등 |

> 로컬 HTML 백업: `docs/store-submission/privacy-policy.html`, `terms-of-service.html`  
> **Notion은 반드시 「웹에 게시」** 후 시크릿 창에서 URL이 열리는지 확인하세요.
