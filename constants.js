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
const FUNNEL_TOP_Y = 2960;     // 지그재그 벽 종료 및 깔때기 수축 시작 Y축
const GOAL_Y = 3120;           // 최종 센서 골인선 Y축

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
const MAX_SPEED_BOOST = 25;              // 부스터/폭주 시 최대 속도 해제 상한
const NEAR_MISS_DURATION = 45;           // 프리즈/무중력 호버링 연출 프레임수 (45프레임)
const NEAR_MISS_COOLDOWN = 240;          // 프리즈 효과 재발생 쿨다운 (4초)

// ── 4. 기믹 요소별 고유 규격 (Pegs & Portals & Obstacles) ─────
const PORTAL_R = 18;                     // 단방향 순간이동 포탈 반지름

// ── 5. 팀원 이름 초기값 ──────────────────────────────
const DEFAULT_MEMBERS = [
  "김선호", "정현진", "이종훈", "조영민", "권서진", 
  "김민년", "허윤미", "류대성", "고세윤", "김명호", "임다혜"
].join(", ");

// ── 6. 당첨 축하 텍스트용 컬러 스펙트럼 ───────────────────────
const COLOR_SPECTRUM = [
  '#ff3366', // 핫핑크
  '#00f0ff', // 일렉트릭 시안
  '#ffea00', // 네온 골드
  '#8c52ff', // 크리스탈 퍼플
  '#33ff57', // 사이키델릭 그린
  '#ff9900', // AWS 오렌지
  '#ff00ff'  // 마젠타
];
