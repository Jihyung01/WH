---
name: "retry"
description: "중단된 작업을 마지막 커밋부터 재개합니다."
---

# /retry — 중단된 작업 재개

당신의 임무는 **이전 세션에서 중단된 작업을 정확히 이어서 수행**하는 것이다.

## 실행 순서

### 1단계: 상태 파악
먼저 현재 작업 상태를 파악하라.

```bash
# 현재 브랜치 확인
git branch --show-current

# 최근 커밋 10개
git log --oneline -10

# 수정 중이지만 커밋되지 않은 변경사항
git status
git diff --stat
```

**중요**: 브랜치명에서 작업 맥락을 추론하라.
- `fix/xxx` → 버그 수정 작업
- `feat/xxx` → 신규 기능 구현
- `refactor/xxx` → 리팩터링
- `audit/xxx` → 감사 (읽기 전용)
- `design/xxx` → 설계 문서 작성

### 2단계: 작업 산출물 확인
작업 디렉토리에서 진행 중인 산출물을 찾아라:

```bash
# 최근 수정된 파일들
find . -type f -name "*.md" -newer /tmp/last-session 2>/dev/null | head -20

# 진행 중 보고서
ls AUDIT_REPORT.md FIX_REPORT.md CHANGES.md TODO.md 2>/dev/null
```

### 3단계: TODO 추출
아래 우선순위로 "다음에 해야 할 일"을 파악:

1. **미완료 TODO 주석**: 코드 내 `// TODO:`, `// FIXME:`, `// WIP:`
2. **산출물 내 체크박스**: AUDIT_REPORT.md 등에서 `- [ ]` 미체크 항목
3. **직전 커밋 메시지**: "part 1 of 3" 같은 힌트
4. **브랜치명 vs 수정 파일**: 작업 범위에서 누락된 영역

### 4단계: 재개 보고
실행 전에 반드시 아래 형식으로 보고하고 **사용자 승인 대기**:

```markdown
## 이전 세션 재개 분석

### 작업 맥락
- 브랜치: <branch-name>
- 마지막 커밋: <hash> <message>
- 작업 유형: <fix/feat/refactor/audit/design>

### 완료된 부분
- ✅ <completed-item-1>
- ✅ <completed-item-2>

### 남은 부분
- [ ] <remaining-item-1>
- [ ] <remaining-item-2>

### 재개 계획
다음 순서로 진행하려 합니다:
1. <step-1>
2. <step-2>
3. <step-3>

진행할까요? (y/n 또는 우선순위 조정 의견)
```

### 5단계: 실행
승인받으면 계획대로 실행. 각 단계 완료마다 중간 커밋하여 다음 재개 시 상태 파악 용이하게.

## 실패 복구 원칙

**같은 오류 3회 반복 시**: 즉시 중단하고 사용자에게 보고.
- 같은 오류 = 같은 에러 메시지 또는 같은 파일 라인에서 실패
- 3회 시도 후에도 진행 못하면 다른 접근 필요 → 사람 판단

**보고 형식**:
```markdown
## 재시도 실패

### 시도한 접근 (3회)
1. <approach-1> → <error>
2. <approach-2> → <error>
3. <approach-3> → <error>

### 추정 원인
<hypothesis>

### 다음 제안
- 옵션 A: <alternative-1>
- 옵션 B: <alternative-2>
- 에스컬레이션 필요한가?

사용자 판단 요청합니다.
```

## 제약사항

- `git push` 금지 (프로젝트에 remote 없음)
- Supabase 마이그레이션 자동 실행 금지
- `package.json` 수정 금지 (사용자 승인 필요)
- 이전 세션이 파괴적 작업(DROP, TRUNCATE)을 시도 중이었다면 **재개 전 반드시 사용자 확인**
