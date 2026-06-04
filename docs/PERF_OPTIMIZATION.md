# 성능 최적화 진행 문서

본 문서는 로또 모드(45구) 및 저사양 환경(사무용 노트북 등)에서의 성능 병목을 해소하기 위한 최적화 계획과 구현 내역을 관리합니다.

## 1. 개요
* **목적**: 45구 동시 경주 시 발생하는 프레임 드랍, 끊김, 오디오 왜곡 등 병목 현상 개선
* **기준 브랜치**: `main`
* **작업 브랜치**: `feature/develop_성능최적화`

## 2. 최적화 우선순위 로드맵

1. **Audio Voice Limiter (사운드 폴리포니 제한)**
   * 대상 파일: `sound.js`
   * 내용: 초당 수백 회 발생하는 `playPeg`, `playBounce` 등 충돌음에 대한 스로틀링(Throttling) 및 최대 동시 발음 수(Voice Limiter) 제한 구현.

2. **Low-end QUALITY mode (저사양 렌더링 모드)**
   * 대상 파일: `ui.js`, `style.css`, `constants.js`, `ball.js`, `entities.js`
   * 내용: 환경 설정에서 '저사양 모드' 활성화 시, V8 엔진 GC 압박과 GPU 병목을 유발하는 `shadowBlur`, `shadowColor` 등 글로우 효과를 강제 비활성화.

3. **`isFinished` mutual exclusion (물리 연산 배제)**
   * 대상 파일: `game.js`
   * 내용: 이미 결승선에 도착한(종료된) 구슬들끼리는 물리 충돌(Ball-to-Ball) 연산에서 제외하여 불필요한 O(N^2) 연산 제거.

4. **`isFinished` ball gradient caching (종료된 구슬 렌더링 캐싱)**
   * 대상 파일: `ball.js`
   * 내용: 종료된 구슬은 움직임이나 시각적 변화가 없으므로 `createRadialGradient`를 매 프레임 호출하지 않고 캐싱하여 재사용.

5. **Active ball texture bitmap caching (활성 구슬 비트맵 캐싱)**
   * 대상 파일: `ball.js`
   * 내용: 이동 중인 구슬들에 대해서도 오프스크린 캔버스(Offscreen Canvas)를 활용한 비트맵 렌더링 캐싱 기법 적용으로 프레임 드랍 방지.

6. **Spatial Hash Grid (공간 분할 - 필요 시)**
   * 대상 파일: `collision.js`
   * 내용: 위 1~5번 최적화 후에도 CPU 병목이 발생할 경우, 캔버스를 격자로 분할하여 인접한 객체끼리만 충돌을 검사하도록 O(N) 최적화 도입.

## 3. 진행 상황 (체크리스트)
## 3. 진행 상황 (체크리스트)
* [x] 1. Audio Voice Limiter 구현
* [x] 2. Low-end QUALITY mode 구현
* [x] 3. `isFinished` mutual exclusion 구현
* [x] 4. `isFinished` ball gradient caching 구현
* [ ] 5. Active ball texture bitmap caching 구현
* [ ] 6. Spatial Hash Grid 구현 (필요시)
