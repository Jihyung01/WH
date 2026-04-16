---
name: "fix-ota"
description: "OTA(eas update) 배포 가능한 버그를 수정합니다."
---

# /fix-ota — OTA 배포 가능 버그 수정

당신의 임무는 **`eas update`만으로 배포 가능한 범위에서 버그를 수정**하는 것이다.

## 실행 순서

### 1단계: 범위 확인
사용자 입력을 받은 후 수정 범위 확정:

```markdown
버그 수정 범위 확인:

"<사용자 입력>"

먼저 재현 절차를 확립하고 원인을 파악한 후 OTA-safe 수정을 제안하겠습니다.
진행할까요?
```

### 2단계: 브랜치 생성
```bash
git checkout -b fix/$(echo "<bug-name>" | sed 's/ /-/g')-$(date +%Y%m%d)
```

### 3단계: 재현 & 진단
1. 버그 재현 절차를 코드에서 역추적
2. 관련 파일 확인 (grep, 타입 정의 추적)
3. **알려진 함정 대조**: AGENTS.md 섹션 3의 패턴과 일치하는가?
   - MMKV 관련?
   - Kakao Share TurboModule?
   - Zustand setter 함수 전달?
   - expo-updates runtime mismatch?
   - Sentry plugin 빌드 실패?
   - expo-haptics + Reanimated?
4. 원인 가설 수립

### 4단계: OTA 가능 여부 판별
수정안을 생각한 후 **반드시** 판별:

```markdown
## OTA 배포 가능 여부 분석

수정 대상 파일:
- <file-1> → <OTA-safe | Native>
- <file-2> → <OTA-safe | Native>

결론: [OTA-safe | Native 필요]
```

### 5단계 A: OTA-safe인 경우 → 수정 진행
- 최소 변경 원칙: 버그 수정에 필요한 줄만 수정
- 같은 파일에서 200줄 이상 수정 예상되면 중단하고 사용자 승인 요청
- 타입 안전성 유지 (`any` 금지)
- 변경 후 즉시 검증:
  ```bash
  npx tsc --noEmit
  ```
- 타입 에러 발생 시 원인 파악 후 수정. 무시하고 진행 금지

### 5단계 B: Native 필요인 경우 → 즉시 중단
```markdown
## ⚠️ 네이티브 빌드 필요

이 버그는 OTA로 배포할 수 없습니다.

**이유**: <구체적 이유>
**필요한 변경**: <변경 내역>
**배포 방법**: `eas build --platform all --profile production` 필요 (~30분)

## 대안 검토

- 옵션 1 (OTA-safe): <우회 방법 — 가능한 경우>
- 옵션 2 (Native): 위에 설명한 본래 수정
- 옵션 3: 수정 보류 + 다음 네이티브 빌드 때 일괄 처리

어떻게 진행할까요?
```

사용자 승인 없이는 절대 네이티브 파일 수정 금지.

### 6단계: 검증 & 커밋
수정 완료 후:

1. **타입 체크**: `npx tsc --noEmit` → 0 errors
2. **Lint**: `npx eslint . --max-warnings 0` (있다면)
3. **수동 검증 체크리스트 작성**:
   ```markdown
   ## 검증 체크리스트
   
   ### 재현 단계
   1. ...
   2. ...
   
   ### 예상 결과 (수정 후)
   - ...
   
   ### 반드시 테스트해야 할 시나리오
   - [ ] 정상 케이스
   - [ ] 엣지 케이스 1
   - [ ] 엣지 케이스 2
   - [ ] 회귀 테스트 (인접 기능)
   ```

4. **커밋**:
   ```bash
   git add <files>
   git commit -m "fix(<scope>): <한국어 설명>
   
   - 원인: <원인 한줄>
   - 수정: <수정 내용 한줄>
   - OTA: yes
   - 검증: <검증 방법>"
   ```

### 7단계: 완료 보고
```markdown
## 🐛 버그 수정 완료

### 버그
<원본 설명>

### 원인
<원인 분석 — 1-3줄>

### 수정
- 파일: <file-list>
- 변경 규모: +<add> / -<del> 라인
- 브랜치: <branch>

### OTA 배포 가능 ✅
```bash
# 배포 명령 (사용자가 실행)
eas update --branch production --message "fix: <설명>"
```

### 검증 체크리스트
<위에서 작성한 체크리스트>

### 리스크
- <risk-1>
- <risk-2>

### 다음 단계
- [ ] 개발 기기에서 위 체크리스트 수동 검증
- [ ] 검증 통과 후 `eas update` 배포
- [ ] 프로덕션 Sentry 모니터링
```

## 금지 사항

- ❌ `package.json` 수정
- ❌ `app.json` / `app.config.js`의 plugins, permissions 수정
- ❌ `ios/` 또는 `android/` 폴더 수정
- ❌ `eas build` 또는 `eas update` 자동 실행
- ❌ `git push` 시도
- ❌ 검증 없이 커밋
- ❌ 타입 에러 무시
- ❌ `any` 타입으로 도망
- ❌ Sentry / Mixpanel 자동 설정 변경 (env 값은 사람이)
- ❌ 수정 범위 확장 (버그와 무관한 리팩터링 금지)

## 특수 케이스

### 크래시 원인이 "알려진 함정"인 경우
AGENTS.md 섹션 3의 패턴과 일치하면 즉시 해당 해결책 적용:
- MMKV 발견 → AsyncStorage로 교체
- Kakao Share 직접 호출 → safeKakaoShare 래퍼로 변경
- setter 업데이트 함수 → 최종 값 전달로 변경
- 등등

### 재현 불가능한 버그
재현 못하면 **가설에 기반해 방어 코드만 추가**, 원인 해결은 하지 않음:
- try/catch 추가
- null check 추가
- Sentry breadcrumb 추가
- 사용자에게 재현 단계 요청

### 원인이 데이터 이슈 (서버 쪽)
클라이언트 수정으로 해결 불가면:
- 클라이언트는 방어 코드만
- 서버 쪽 수정 필요사항을 별도 보고
- `supabase-migrations` skill 필요 시 사용자에게 알림
