/**
 * =================================================================
 *   CHAOS-DROP NEON PINBALL SYSTEM - CONFIG & CONSTANTS
 * =================================================================
 * 이 파일은 게임 엔진의 모든 물리 수치, 레이아웃 규격, 컬러스펙트럼,
 * 그리고 레이싱 참가 팀원 등의 정적 구성 변수들을 통합 관리합니다.
 */

// ── 0. 디바이스 감지 (다른 상수보다 먼저 선언해야 BOARD_XSCALE에서 사용 가능) ──
const _DEVICE_MOBILE = window.innerWidth <= 768;
const QUALITY        = _DEVICE_MOBILE ? 0.45 : 1.0;

// 모바일 물리 보드폭 스케일: 물리 공간 자체를 화면 폭에 맞춤 (데스크탑 = 1.0)
const BOARD_XSCALE   = _DEVICE_MOBILE ? (window.innerWidth / 825) : 1.0;

// ── 1. 게임판 기본 레이아웃 규격 ─────────────────────────
const GAME_VWIDTH  = Math.round(825 * BOARD_XSCALE); // 모바일: 화면폭, 데스크탑: 825
const GAME_VHEIGHT = 3200;                            // 가상 세로 높이 (고정)
const PANEL_MIN_OFFSET = 415;                         // 제어판 패널 폭 오버랩 방지
const FUNNEL_TOP_Y    = 2720;                         // 깔때기 수축 시작 Y
const FUNNEL_BOTTOM_X = Math.round(311.25 * BOARD_XSCALE); // 깔때기 하단 좌측 제한 X
const GOAL_Y          = 3120;                         // 최종 골인선 Y

// ── 1.2. 레인터널 (Zone 2.5) 특화 물리/레이아웃 규격 ──────
const TUNNEL_TOP_Y    = 1500;
const TUNNEL_BOTTOM_Y = 1900;
const TUNNEL_LEFT_X   = Math.round(180 * BOARD_XSCALE);
const TUNNEL_RIGHT_X  = Math.round(645 * BOARD_XSCALE);
const TUNNEL_BARRIER_W  = Math.round(60  * BOARD_XSCALE);
const TUNNEL_BARRIER1_X = Math.round(325 * BOARD_XSCALE);
const TUNNEL_BARRIER2_X = Math.round(500 * BOARD_XSCALE);
const TUNNEL_BOOST_ACCEL = 0.52;
const TUNNEL_DECEL_MULT  = 0.88;

// ── 2. 프레임 레이트 및 물리 루프 시간 제한 ──────────────────
const TARGET_FPS    = 60;
const FPS_INTERVAL  = 1000 / TARGET_FPS;

// ── 3. 구슬(RacingBall) 고유 물리 파라미터 ────────────────────
const BALL_R             = _DEVICE_MOBILE ? 7 : 9;
const BALL_GRAVITY       = 0.13;
const BALL_FRICTION_BASE = 0.991;
const BALL_FRICTION_RANGE = 0.005;
const BALL_RESTITUTION   = 0.58;
const MAX_SPEED_NORMAL   = 17;
const MAX_SPEED_BOOST    = 23;
const NEAR_MISS_DURATION = 45;
const NEAR_MISS_COOLDOWN = 240;

// ── 4. 기믹 요소별 고유 규격 (Pegs & Portals & Obstacles) ─────
const PORTAL_R = Math.round(18 * BOARD_XSCALE);

// ── 5. 팀원 이름 초기값 ──────────────────────────────
const DEFAULT_MEMBERS = [
  "김선호", "이종훈", "정현진", "권서진", "조영민",
  "임다혜", "허윤미", "김명호", "박한수", "류대성",
  "김민년", "고세윤", "김윤경"
].join(", ");

// ── 6. 맵 레지스트리 (각 맵 파일이 직접 등록) ────────────────────
const MAPS = {};

// ── 7. 당첨 축하 텍스트용 컬러 스펙트럼 ───────────────────────
const COLOR_SPECTRUM = [
  '#ff3366',
  '#00f0ff',
  '#ffea00',
  '#8c52ff',
  '#33ff57',
  '#ff9900',
  '#ff00ff'
];
