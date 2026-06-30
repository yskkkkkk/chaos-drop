# 성능 최적화 진행 문서

본 문서는 로또 모드(45구) 및 저사양 환경(사무용 노트북 등)에서의 성능 병목을 해소하기 위한 최적화 계획과 구현 내역을 관리합니다.

## 1. 개요
* **목적**: 45구 동시 경주 시 발생하는 프레임 드랍, 끊김, 오디오 왜곡 등 병목 현상 개선
* **기준 브랜치**: `main` (아래 항목들은 모두 main에 머지 완료)

## 2. 최적화 우선순위 로드맵

1. **Audio Voice Limiter (사운드 폴리포니 제한)**
   * 대상 파일: `sound.js`
   * 내용: 초당 수백 회 발생하는 `playPeg`, `playBounce` 등 충돌음에 대한 스로틀링(Throttling) 및 최대 동시 발음 수(Voice Limiter) 제한 구현.

2. **Low-end QUALITY mode (저사양 렌더링 모드)**
   * 대상 파일: `ui.js`, `style.css`, `constants.js`, `ball.js`, `entities.js`
   * 내용: V8 엔진 GC 압박과 GPU 병목을 유발하는 `shadowBlur`, `shadowColor` 등 글로우 효과를 강제 비활성화.
   * ⚠️ **변경 사항**: UI 수동 토글(ON/OFF 버튼)은 제거됨. `game.js` 내 실시간 FPS 모니터링이 45fps 이하 지속 감지 시 `LOW_END_MODE`를 자동으로 활성화하는 방식만 유지.

3. **`isFinished` mutual exclusion (물리 연산 배제)**
   * 대상 파일: `game.js`
   * 내용: 이미 결승선에 도착한(종료된) 구슬들끼리는 물리 충돌(Ball-to-Ball) 연산에서 제외하여 불필요한 O(N^2) 연산 제거.

4. **`isFinished` ball gradient caching (종료된 구슬 렌더링 캐싱)**
   * 대상 파일: `ball.js`
   * 내용: 종료된 구슬은 움직임이나 시각적 변화가 없으므로 `createRadialGradient`를 매 프레임 호출하지 않고 캐싱하여 재사용.

5. **Active ball gradient caching (활성 구슬 그라데이션 캐싱)**
   * 대상 파일: `ball.js`
   * 내용: 이동 중인 구슬도 매 프레임 `createRadialGradient`를 호출하던 것을, **컬러별로 그라데이션 객체를 캐싱**(`getActiveGradient` / `_cachedActiveGradients`)하여 재사용. 당초 검토했던 OffscreenCanvas 비트맵 캐싱은 5px급 단색 원에는 초기화·메모리 비용이 더 커, 그라데이션 객체 캐싱이라는 더 가벼운 방식으로 대체 구현함.

6. **충돌 탐색 범위 최적화 (이진 탐색)**
   * 대상 파일: `collision.js`, `utils.js`
   * 내용: 본격적인 Spatial Hash Grid 도입 전에, 정렬된 정적 장애물 특성을 활용한 이진 탐색으로 충돌 후보 범위를 좁혀 O(N) 부담을 완화.
     * **핀 충돌**: 핀을 Y 기준 정렬(`sortPegsForCollision`) 후, 공 근방(±60px) 핀만 `_pegLowerBound` 이진 탐색으로 추려 검사.
     * **벽 프로파일 조회**: `getWallAtY`가 매 호출 인덱스 0부터 선형 탐색하던 것을 `interpolateWallAtY` 이진 탐색 보간으로 교체 (Canyon ~125 정점 기준 O(n)→O(log n), 200만 호출 마이크로벤치 약 3.9배).

7. **Spatial Hash Grid (공간 분할 - 필요 시)**
   * 대상 파일: `collision.js`
   * 내용: 위 1~6번 최적화 후에도 CPU 병목이 발생할 경우, 캔버스를 격자로 분할하여 인접한 객체끼리만 충돌을 검사하도록 도입 검토. **현재까지는 미도입(불필요).**

## 3. 진행 상황 (체크리스트)
* [x] 1. Audio Voice Limiter 구현
* [x] 2. Low-end QUALITY mode 구현 (수동 토글 제거, FPS 자동 감지만 유지)
* [x] 3. `isFinished` mutual exclusion 구현
* [x] 4. `isFinished` ball gradient caching 구현
* [x] 5. Active ball gradient caching 구현 (OffscreenCanvas 대신 컬러별 그라데이션 캐싱)
* [x] 6. 충돌 탐색 범위 이진 탐색 최적화 (핀 lower-bound + 벽 프로파일 보간)
* [ ] 7. Spatial Hash Grid 구현 (현재 불필요 — 미도입)
