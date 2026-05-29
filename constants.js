/**
 * =================================================================
 *   CHAOS-DROP NEON PINBALL SYSTEM - CONFIG & CONSTANTS
 * =================================================================
 * 이 파일은 게임 엔진의 모든 물리 수치, 레이아웃 규격, 컬러스펙트럼,
 * 그리고 레이싱 참가 팀원 등의 정적 구성 변수들을 통합 관리합니다.
 */

// ── 1. 게임판 기본 레이아웃 규격 ─────────────────────────
const GAME_VWIDTH = 825;       // 가상 가로 너비 (구슬 경주 가상 보드 사이즈)
const GAME_VHEIGHT = 3200;     // 가상 세로 높이 (3200px 대규모 세로 맵)
const PANEL_MIN_OFFSET = 415;  // 제어판 패널 폭 오버랩 방지 최소 가로 오프셋
const FUNNEL_TOP_Y = 2720;     // 지그재그 벽 종료 및 깔때기 수축 시작 Y축
const FUNNEL_BOTTOM_X = 311.25;  // 최종 깔때기 수축 시작 X축 좌측 제한 (기존 300에서 10% 골라인 축소)
const GOAL_Y = 3120;           // 최종 센서 골인선 Y축

// ── 1.2. 레인터널 (Zone 2.5) 특화 물리/레이아웃 규격 ──────
const TUNNEL_TOP_Y = 1500;        // 3레인 터널 시작 Y축
const TUNNEL_BOTTOM_Y = 1900;     // 3레인 터널 종료 Y축 (총 400px 연장)
const TUNNEL_LEFT_X = 180;        // 터널 구역의 고정 좌벽 X축 (안쪽 수축)
const TUNNEL_RIGHT_X = 645;       // 터널 구역의 고정 우벽 X축 (안쪽 수축)
const TUNNEL_BARRIER_W = 60;      // 터널 레인 분리벽(섬 장벽) 두께 (px, 60px 확장)


const TUNNEL_BARRIER1_X = 325;    // 첫 번째 분리벽 중심 X축 (150 + 175)
const TUNNEL_BARRIER2_X = 500;    // 두 번째 분리벽 중심 X축 (150 + 350)
const TUNNEL_BOOST_ACCEL = 0.52;  // 가속 레인 중력 가속 추가분 (2배 가속 효과)
const TUNNEL_DECEL_MULT = 0.88;   // 감속 레인 저항 드래그 계수 (0.5배 감속 효과)



// ── 2. 프레임 레이트 및 물리 루프 시간 제한 ──────────────────
const TARGET_FPS = 60;                   // 고정 표출 프레임 타겟 (60 FPS)
const FPS_INTERVAL = 1000 / TARGET_FPS;  // 60FPS 기준 간격 (16.67ms)

// ── 3. 구슬(RacingBall) 고유 물리 파라미터 ────────────────────
const BALL_R = 9;                        // 구슬 반지름 (Radius)
const BALL_GRAVITY = 0.13;               // 낙하 중력 기본값
const BALL_FRICTION_BASE = 0.991;        // 마찰 저항 기본 랜덤 하한
const BALL_FRICTION_RANGE = 0.005;       // 마찰 저항 기본 랜덤 범위 (0.991 ~ 0.996)
const BALL_RESTITUTION = 0.58;           // 탄성 반사 기본값 (Bouncy Coefficient)
const MAX_SPEED_NORMAL = 17;             // 평소 최대 속도 제한
const MAX_SPEED_BOOST = 23;              // 부스터/폭주 시 최대 속도 해제 상한
const NEAR_MISS_DURATION = 45;           // 프리즈/무중력 호버링 연출 프레임수 (45프레임)
const NEAR_MISS_COOLDOWN = 240;          // 프리즈 효과 재발생 쿨다운 (4초)

// ── 4. 기믹 요소별 고유 규격 (Pegs & Portals & Obstacles) ─────
const PORTAL_R = 18;                     // 단방향 순간이동 포탈 반지름

// ── 5. 팀원 이름 초기값 ──────────────────────────────
const DEFAULT_MEMBERS = [
  "김선호", "이종훈", "정현진", "권서진", "조영민",
  "임다혜", "허윤미", "김명호", "박한수", "류대성",
  "김민년", "고세윤", "김윤경"
].join(", ");

// ── 6. 맵 레지스트리 (각 맵 파일이 직접 등록) ────────────────────
const MAPS = {};

// ── 7. 렌더링 품질 계수 (모바일 최적화) ─────────────────────────
const _DEVICE_MOBILE = window.innerWidth < 768;
const QUALITY = _DEVICE_MOBILE ? 0.45 : 1.0;

// ── 8. 당첨 축하 텍스트용 컬러 스펙트럼 ───────────────────────
const COLOR_SPECTRUM = [
  '#ff3366', // 핫핑크
  '#00f0ff', // 일렉트릭 시안
  '#ffea00', // 네온 골드
  '#8c52ff', // 크리스탈 퍼플
  '#33ff57', // 사이키델릭 그린
  '#ff9900', // AWS 오렌지
  '#ff00ff'  // 마젠타
];
