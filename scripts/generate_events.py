#!/usr/bin/env python3
"""
WhereHere AI 이벤트 자동 생성 스크립트
======================================

사용법:
  python scripts/generate_events.py                    # 전체 서울 주요 지역 (기본 5개씩)
  python scripts/generate_events.py --district 홍대    # 특정 지역만
  python scripts/generate_events.py --count 10         # 지역당 10개
  python scripts/generate_events.py --all --count 8    # 전체 지역 × 8개

필수 환경변수 (.env 파일 또는 직접 설정):
  SUPABASE_URL            - Supabase 프로젝트 URL
  SUPABASE_SERVICE_ROLE_KEY - Service Role Key (관리자 권한)
  ANTHROPIC_API_KEY        - Claude API 키

설치:
  pip install httpx python-dotenv
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

try:
    import httpx
except ImportError:
    print("httpx 패키지가 필요합니다: pip install httpx")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("python-dotenv 패키지가 필요합니다: pip install python-dotenv")
    sys.exit(1)

# .env 로드 (프로젝트 루트의 .env 또는 .env.local)
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / ".env.local")

SUPABASE_URL = os.getenv("EXPO_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")

SEOUL_DISTRICTS = [
    "홍대/신촌",
    "성수동",
    "강남/역삼",
    "이태원/한남",
    "종로/인사동",
    "여의도",
    "잠실/송파",
    "합정/망원",
    "을지로/충무로",
    "북촌/삼청동",
    "신사/가로수길",
    "연남동",
]

CATEGORIES = ["exploration", "photo", "quiz", "partnership"]

CLAUDE_PROMPT_TEMPLATE = """당신은 WhereHere 앱의 수석 콘텐츠 디자이너입니다.
서울 {district} 지역의 **실제 존재하는** 명소/핫플레이스 {count}곳을 탐험 이벤트 JSON 배열로 생성하세요.

## 핵심 규칙
1. 모든 장소는 2024-2025년 기준 서울 {district}에 실제 존재하는 상호/랜드마크여야 합니다
2. 인스타그램에서 핫한 카페, 레스토랑, 갤러리, 팝업스토어, 랜드마크를 우선 선정하세요
3. GPS 좌표(lat, lng)는 해당 장소의 실제 위치여야 합니다 (대한민국 서울: 위도 37.4~37.7, 경도 126.8~127.2)
4. 카테고리는 {categories} 중에서 골고루 분배
5. 난이도는 1~5 사이, 보상 XP는 난이도 × 50 + 50

## 미션 규칙
각 이벤트에 미션 2~3개:
- 첫 번째 미션: 반드시 "gps_checkin" 타입
- 두 번째 미션: "photo", "quiz", "text" 중 하나
- quiz 미션의 config: {{"question": "질문", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "해설"}}
- photo 미션의 config: {{"prompt": "촬영 지시문"}}
- partnership 카테고리이면 세 번째 미션 추가

## 서사(narrative) 작성
캐릭터가 모험을 시작하는 느낌으로, 한국어 3문장, 신비롭고 감성적인 톤으로 작성하세요.

## 출력 형식
순수 JSON 배열만 출력하세요. 코드 블록(```)이나 추가 설명 절대 금지.

[
  {{
    "title": "이벤트 제목 (15자 이내)",
    "description": "한 줄 설명",
    "narrative": "몰입감 있는 서사 3문장",
    "lat": 37.xxxxx,
    "lng": 126.xxxxx,
    "address": "서울시 실제 도로명 주소",
    "place_name": "실제 장소명",
    "category": "exploration",
    "difficulty": 2,
    "reward_xp": 150,
    "missions": [
      {{
        "step_order": 1,
        "mission_type": "gps_checkin",
        "title": "장소 도착 인증",
        "description": "장소에 도착하여 GPS 체크인을 완료하세요.",
        "config": {{"radius_m": 100}},
        "required": true
      }},
      {{
        "step_order": 2,
        "mission_type": "quiz",
        "title": "퀴즈",
        "description": "퀴즈 설명",
        "config": {{
          "question": "질문",
          "options": ["A", "B", "C", "D"],
          "correct_index": 0,
          "explanation": "해설"
        }},
        "required": true
      }}
    ]
  }}
]"""


def extract_json_array(text: str) -> list:
    """Claude 응답에서 JSON 배열을 안전하게 추출"""
    # 코드 블록 안의 JSON
    import re
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fenced:
        text = fenced.group(1).strip()

    # 배열 추출
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("JSON 배열을 찾을 수 없습니다")
    return json.loads(text[start:end + 1])


def validate_event(evt: dict, idx: int) -> bool:
    """이벤트 데이터 유효성 검증"""
    required = ["title", "lat", "lng", "category", "missions"]
    for key in required:
        if key not in evt:
            print(f"  [SKIP] 이벤트 {idx}: '{key}' 필드 누락")
            return False

    if not (33 < evt["lat"] < 39 and 124 < evt["lng"] < 132):
        print(f"  [SKIP] 이벤트 {idx} '{evt['title']}': 좌표가 한국 범위 밖")
        return False

    if not isinstance(evt["missions"], list) or len(evt["missions"]) < 2:
        print(f"  [SKIP] 이벤트 {idx} '{evt['title']}': 미션 2개 미만")
        return False

    valid_cats = {"exploration", "photo", "quiz", "partnership"}
    if evt.get("category") not in valid_cats:
        evt["category"] = "exploration"

    evt["difficulty"] = max(1, min(5, int(evt.get("difficulty", 2))))
    evt["reward_xp"] = int(evt.get("reward_xp", evt["difficulty"] * 50 + 50))

    return True


def call_claude(district: str, count: int) -> list:
    """Claude API를 호출하여 이벤트 생성"""
    prompt = CLAUDE_PROMPT_TEMPLATE.format(
        district=district,
        count=count,
        categories=", ".join(CATEGORIES),
    )

    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 8000,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=120,
    )

    if resp.status_code != 200:
        raise Exception(f"Claude API 에러 {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    raw_text = data["content"][0]["text"]
    return extract_json_array(raw_text)


def insert_events(events: list, district: str) -> int:
    """Supabase REST API로 이벤트 + 미션 일괄 삽입"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    base = f"{SUPABASE_URL}/rest/v1"
    inserted = 0

    for evt in events:
        # Insert event
        event_payload = {
            "title": evt["title"],
            "description": evt.get("description", evt.get("place_name", "")),
            "narrative": evt.get("narrative"),
            "location": f"SRID=4326;POINT({evt['lng']} {evt['lat']})",
            "address": evt.get("address", ""),
            "district": district,
            "category": evt["category"],
            "difficulty": evt["difficulty"],
            "reward_xp": evt["reward_xp"],
            "creator_type": "ai_generated",
            "is_active": True,
            "is_seasonal": False,
        }

        resp = httpx.post(f"{base}/events", headers=headers, json=event_payload)
        if resp.status_code not in (200, 201):
            print(f"  [ERROR] 이벤트 '{evt['title']}' 삽입 실패: {resp.text[:200]}")
            continue

        event_data = resp.json()
        event_id = event_data[0]["id"] if isinstance(event_data, list) else event_data["id"]

        # Insert missions
        missions = []
        for m in evt.get("missions", []):
            missions.append({
                "event_id": event_id,
                "step_order": m.get("step_order", 1),
                "mission_type": m.get("mission_type", "gps_checkin"),
                "title": m.get("title", "미션"),
                "description": m.get("description", ""),
                "config": m.get("config", {}),
                "required": m.get("required", True),
            })

        if missions:
            resp = httpx.post(f"{base}/missions", headers=headers, json=missions)
            if resp.status_code not in (200, 201):
                print(f"  [ERROR] 미션 삽입 실패 (이벤트 {event_id}): {resp.text[:200]}")
                # Rollback event
                httpx.delete(f"{base}/events?id=eq.{event_id}", headers=headers)
                continue

        inserted += 1
        print(f"  [OK] {evt['title']} ({evt['category']}, 난이도 {evt['difficulty']}, {len(missions)}개 미션)")

    return inserted


def main():
    parser = argparse.ArgumentParser(description="WhereHere AI 이벤트 자동 생성")
    parser.add_argument("--district", "-d", type=str, help="특정 지역만 생성 (예: 홍대)")
    parser.add_argument("--count", "-n", type=int, default=5, help="지역당 이벤트 수 (기본: 5, 최대: 15)")
    parser.add_argument("--all", "-a", action="store_true", help="전체 서울 주요 지역")
    parser.add_argument("--dry-run", action="store_true", help="DB 삽입 없이 AI 결과만 출력")
    args = parser.parse_args()

    # 환경변수 검증
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL")
    if not SUPABASE_SERVICE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if not ANTHROPIC_KEY:
        missing.append("ANTHROPIC_API_KEY")
    if missing:
        print(f"[ERROR] 환경변수 누락: {', '.join(missing)}")
        print("        .env 파일에 설정하거나 터미널에서 export 해주세요.")
        sys.exit(1)

    count = max(1, min(15, args.count))

    # 대상 지역 결정
    if args.district:
        districts = [args.district]
    elif args.all:
        districts = SEOUL_DISTRICTS
    else:
        districts = SEOUL_DISTRICTS[:6]

    print(f"{'=' * 60}")
    print(f"  WhereHere AI 이벤트 생성기")
    print(f"  대상 지역: {len(districts)}개")
    print(f"  지역당 이벤트: {count}개")
    print(f"  예상 총 이벤트: {len(districts) * count}개")
    print(f"  Claude API 호출: {len(districts)}회")
    print(f"  예상 비용: ~${len(districts) * 0.03:.2f} (약 ₩{int(len(districts) * 40)})")
    if args.dry_run:
        print(f"  [DRY-RUN 모드] DB 삽입 없이 결과만 출력합니다.")
    print(f"{'=' * 60}\n")

    total_generated = 0
    total_inserted = 0

    for i, district in enumerate(districts, 1):
        print(f"[{i}/{len(districts)}] {district} 지역 이벤트 생성 중...")

        try:
            events = call_claude(district, count)
            print(f"  Claude가 {len(events)}개 이벤트를 생성했습니다.")

            # 검증
            valid_events = []
            for idx, evt in enumerate(events):
                if validate_event(evt, idx):
                    valid_events.append(evt)

            print(f"  검증 통과: {len(valid_events)}/{len(events)}개")
            total_generated += len(valid_events)

            if args.dry_run:
                for evt in valid_events:
                    print(f"    - {evt['title']} ({evt['lat']}, {evt['lng']}) [{evt['category']}]")
            else:
                inserted = insert_events(valid_events, district.split("/")[0])
                total_inserted += inserted
                print(f"  DB 삽입 완료: {inserted}개")

        except Exception as e:
            print(f"  [ERROR] {district}: {e}")

        # API 레이트 리밋 방지
        if i < len(districts):
            print(f"  (2초 대기...)\n")
            time.sleep(2)

    print(f"\n{'=' * 60}")
    print(f"  완료!")
    print(f"  생성: {total_generated}개 이벤트")
    if not args.dry_run:
        print(f"  DB 삽입: {total_inserted}개 이벤트")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
