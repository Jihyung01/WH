# WhereHere — Antigravity Agent Setup

이 번들은 Antigravity(그리고 AGENTS.md 호환 도구인 Cursor, Claude Code 등)에서 WhereHere 프로젝트를 **일관되고 안전하게** 작업시키기 위한 규약 파일 세트입니다.

## 📦 번들 구성

```
wherehere-agent-setup/
├── AGENTS.md                              # 루트에 복사 (핵심 규약)
└── .antigravity/
    ├── skills/                            # 상황별 자동 로드되는 전문 지식
    │   ├── supabase-rpc/SKILL.md
    │   ├── supabase-migrations/SKILL.md
    │   ├── ai-edge-functions/SKILL.md
    │   ├── kakao-integration/SKILL.md
    │   ├── zustand-stores/SKILL.md
    │   └── expo-ota-safety/SKILL.md
    └── workflows/                         # /로 호출하는 매크로
        ├── retry.md                       # /retry
        ├── audit.md                       # /audit <scope>
        └── fix-ota.md                     # /fix-ota <bug>
```

## 🚀 설치 방법

### 1. 압축 해제 / 파일 복사
WhereHere 프로젝트 루트에서:

```bash
# AGENTS.md를 프로젝트 루트에
cp wherehere-agent-setup/AGENTS.md /path/to/wherehere-app/

# .antigravity 폴더를 프로젝트 루트에
cp -r wherehere-agent-setup/.antigravity /path/to/wherehere-app/
```

또는 Windows (PowerShell):
```powershell
Copy-Item wherehere-agent-setup\AGENTS.md C:\path\to\wherehere-app\
Copy-Item -Recurse wherehere-agent-setup\.antigravity C:\path\to\wherehere-app\
```

### 2. 블루프린트 파일 배치
`WHEREHERE_PROJECT_BLUEPRINT.md`를 프로젝트 루트에 두세요. AGENTS.md가 이 파일을 참조합니다.

### 3. 최종 구조 확인
프로젝트 루트가 이렇게 보여야 합니다:

```
wherehere-app/
├── AGENTS.md                          # ← 새로 추가
├── WHEREHERE_PROJECT_BLUEPRINT.md     # ← 이미 있음 (또는 추가)
├── .antigravity/                      # ← 새로 추가
│   ├── skills/...
│   └── workflows/...
├── app/
├── src/
├── supabase/
├── package.json
├── app.json
├── app.config.js
├── eas.json
└── tsconfig.json
```

### 4. Antigravity 재시작
설치 후 Antigravity IDE를 재시작해야 Rules/Skills/Workflows가 인식됩니다.

## 🎯 사용법

### AGENTS.md
- **자동 로드**. 아무것도 할 필요 없음. 모든 에이전트가 작업 시작 시 읽음.
- 새 규칙이 필요하면 이 파일을 편집 (300-600줄 유지 권장)

### Skills
- **자동 로드**. 에이전트가 작업 맥락에서 관련 skill을 스스로 판단하여 로드.
- 예: Supabase RPC 관련 질문 → `supabase-rpc` skill 자동 로드
- 예: 카카오 로그인 버그 → `kakao-integration` skill 자동 로드
- 수동 참조도 가능. 프롬프트에 "supabase-rpc skill 참조해서..." 라고 명시.

### Workflows (슬래시 명령)
Antigravity 에이전트 채팅창에서 `/` 입력 시 나타남.

```
/retry                    # 중단된 작업 재개
/audit 탐험 일지 기능      # 읽기 전용 감사
/fix-ota 탐험 일지 버튼    # OTA 안전 범위에서 버그 수정
```

## 🧠 설계 의도

### 왜 AGENTS.md를 따로 두나?
<!-- AGENTS.md는 여러 AI 도구(Antigravity, Cursor, Claude Code)가 공통으로 읽는 cross-tool 규약 표준입니다. 한 번 작성하면 도구를 바꿔도 규칙 유지. -->
여러 AI 도구에서 공통 규약을 쓰기 위함. Cursor로 가도, Claude Code로 가도 동일한 규칙 적용됨.

### 왜 Skills를 쪼개 놓았나?
에이전트의 **컨텍스트 윈도우를 아끼기 위함**. 블루프린트(844줄)를 매번 전부 로드하면:
- 응답 속도 저하
- IDE freeze 증가
- 관련없는 지식에 산만해져서 품질 저하

Skills는 **Progressive Disclosure**: 작업 관련 skill만 그때그때 로드됩니다. 예를 들어 UI 컴포넌트 수정 시 `supabase-migrations` skill은 로드되지 않음.

### 왜 Workflows를 만들었나?
반복되는 작업 패턴을 **한 글자 명령**(`/audit`, `/retry`, `/fix-ota`)으로 축약. 매번 "읽기 전용으로 감사해줘, 증거는 파일:라인 붙이고..." 같은 긴 프롬프트 재작성 방지.

## 🔄 유지보수

### 새 함정 발견 시
실제 버그가 재현되면 `AGENTS.md` 섹션 3에 추가:

```markdown
### 3.X 새 함정 이름
- **증상**: ...
- **조건**: ...
- **해결**: ...
- **파일**: ...
```

### 새 기능 영역이 생기면
관련 Skill을 만들어서 `.antigravity/skills/<name>/SKILL.md` 생성. YAML frontmatter의 `description`을 명확히 작성해야 에이전트가 언제 로드할지 판단함.

### 새 반복 작업 발견 시
Workflow로 저장. `.antigravity/workflows/<name>.md`.

## ⚠️ 주의사항

### Git Remote 추가 권장
현재 WhereHere는 **Git remote가 없어서** 이 규약 파일들도 로컬에만 존재. 데이터 손실 방지를 위해:
```bash
# GitHub에 private repo 만들고 연결
git remote add origin <private-repo-url>
git push -u origin main
```

### Antigravity 버전 확인
AGENTS.md 지원은 **Antigravity v1.20.3 이상**. 구버전이면 Settings에서 업데이트.

### Skill 디렉토리 위치
`.antigravity/skills/` — 프로젝트 로컬 skill. Antigravity는 이 경로를 자동 인식.
`~/.antigravity/skills/` — 전역 skill (모든 프로젝트). WhereHere 특화 skill은 **프로젝트 로컬**에 두는 것이 맞음.

## 🆘 문제 해결

### "Antigravity가 AGENTS.md를 읽지 않는 것 같다"
1. 파일이 프로젝트 루트에 있는지 확인 (하위 폴더 아님)
2. Antigravity 재시작
3. 파일 인코딩이 UTF-8인지 확인 (Windows에서 UTF-16 저장되는 경우 있음)
4. 새 대화 시작 (기존 대화는 이전 컨텍스트 유지)

### "Workflow가 슬래시 명령으로 안 뜬다"
1. `.antigravity/workflows/*.md` 경로 확인
2. frontmatter(`---` 블록)의 `description` 필드 누락 여부
3. Antigravity 재시작

### "Skill이 자동 로드되지 않는 것 같다"
1. `description` 필드가 구체적인지 확인 — "언제 로드될지" 에이전트가 판단함
2. 프롬프트에 관련 키워드가 있는지 (예: "RPC", "마이그레이션")
3. 수동 참조: "supabase-rpc skill을 참조해서..."

---

> 이 번들은 2026-04-16 기준 WhereHere 코드베이스(블루프린트 v1.2.0)에 맞춰 작성됨.
> 코드베이스가 크게 변경되면 번들도 업데이트 필요.
