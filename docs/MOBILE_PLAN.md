# CHAOS-DROP — 모바일 버전 구현 계획서

## 확정 요건 (2025-05-29)

### 적용 기준
- 뷰포트 너비 **≤ 768px**를 모바일로 판단
- 기존 데스크탑 UI 동작 무변경

---

## 설정 화면 — 2-Step Wizard

### 방향 정책
- **세로(Portrait)**: 정상 동작
- **가로(Landscape)**: "화면을 세로로 돌려주세요" 전체 오버레이 표시, 스텝 UI 숨김

### 스텝 구성

| | Step 1 | Step 2 |
|---|---|---|
| **내용** | 참가자 입력 + 맵 선택 | 규칙 + 당첨 인원 + Freeze 모드 |
| **하단 버튼** | 다음 → | ← 이전 / 시작 |

- 각 스텝은 세로 스크롤 허용
- 기존 form 요소 재사용 (중복 구현 없음)
- Step 1 → Step 2 전환 시 참가자 최소 2명 검증

---

## 게임 화면 오버레이

### 미니 리더보드 (상시 표시, 우측 상단)
- 1등~3등 이름 + 색상 dot + 메달 이모지 표시
- 탭하면 전체 순위 오버레이 확장

### 전체 순위 오버레이 (탭 후)
- 전체 완주자 리더보드 (데스크탑과 동일 데이터)
- 상단 "×" 버튼으로 닫기
- 하단 고정 "처음으로" 버튼
  - 탭 → `confirm('설정으로 되돌아 갑니다.')`
  - 확인 시: 게임 리셋 + Step 1 복귀

---

## 방향 지원 정책

| 화면 | Portrait | Landscape |
|---|---|---|
| 설정 (Step 1/2) | 정상 | 회전 안내 오버레이 |
| 게임 플레이 | 정상 | 정상 (동적 지원) |

---

## 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `index.html` | `data-ms` 스텝 속성, 모바일 스텝 네비, 게임 오버레이, 회전 안내 HTML |
| `style.css` | 모바일 wizard, 오버레이, 회전 안내 스타일 |
| `ui.js` | `isMobile`, `setMobileStep`, `updateMobileMiniLB`, 게임 모드 전환 로직 |
| `race.js` | `renderLeaderboard()` 끝에 모바일 미니 LB 동기 훅 |
| `game.js` | 무변경 |
| `camera.js` | 무변경 |

---

## AI.md 준수 체크

1. **Think Before Coding** — 방향 지원, 스텝 분배, 오버레이 구조 모두 사전 질문으로 확인
2. **Simplicity First** — 기존 form 요소 재사용, 4개 파일만 수정
3. **Surgical Changes** — `data-ms` 속성 추가만으로 스텝 제어, game.js/camera.js 무변경
4. **Goal-Driven Execution** — 목표: "모바일에서 wizard → game overlay → reset 흐름 작동"
