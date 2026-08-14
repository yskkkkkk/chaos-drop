/**
 * =================================================================
 *   CHAOS-DROP — UTILS UNIT TESTS
 * =================================================================
 * 실행: node --test tests/
 * 의존성 없음 — Node 내장 테스트 러너(node:test) 사용
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  escapeHtml,
  sanitizeMemberNames,
  interpolateWallAtY,
  MEMBER_NAME_MAX_LEN,
  MEMBER_COUNT_MAX,
} = require('../js/utils.js');

// ── escapeHtml ────────────────────────────────────────────────

test('escapeHtml: HTML 특수문자 5종을 모두 엔티티로 치환한다', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('xss')">&`),
    '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;'
  );
});

test('escapeHtml: 일반 한글/영문 이름은 변형하지 않는다', () => {
  assert.equal(escapeHtml('홍길동 Kim-99'), '홍길동 Kim-99');
});

test('escapeHtml: 문자열이 아닌 값도 안전하게 문자열화한다', () => {
  assert.equal(escapeHtml(42), '42');
  assert.equal(escapeHtml(null), 'null');
});

// ── sanitizeMemberNames ───────────────────────────────────────

test('sanitizeMemberNames: 쉼표/개행 구분 파싱 및 공백 트림', () => {
  assert.deepEqual(
    sanitizeMemberNames(' 철수 , 영희\n민수\r\n , , '),
    ['철수', '영희', '민수']
  );
});

test('sanitizeMemberNames: 이름 길이를 MEMBER_NAME_MAX_LEN(30자)으로 자른다', () => {
  const long = 'a'.repeat(100);
  const out = sanitizeMemberNames(long);
  assert.equal(out.length, 1);
  assert.equal(out[0], 'a'.repeat(MEMBER_NAME_MAX_LEN));
});

test('sanitizeMemberNames: 기존 인원을 포함해 MEMBER_COUNT_MAX(200명)를 넘지 않는다', () => {
  const csv = Array.from({ length: 500 }, (_, i) => `m${i}`).join(',');
  assert.equal(sanitizeMemberNames(csv).length, MEMBER_COUNT_MAX);
  // 기존 190명이 있으면 10명만 추가 허용
  assert.equal(sanitizeMemberNames(csv, 190).length, 10);
  // 이미 꽉 찼으면 0명
  assert.equal(sanitizeMemberNames(csv, MEMBER_COUNT_MAX).length, 0);
});

test('sanitizeMemberNames: 빈 입력은 빈 배열을 반환한다', () => {
  assert.deepEqual(sanitizeMemberNames(''), []);
  assert.deepEqual(sanitizeMemberNames('  ,\n, '), []);
});

test('sanitizeMemberNames: 동명이인(중복 이름)은 허용한다', () => {
  assert.deepEqual(sanitizeMemberNames('김철수,김철수'), ['김철수', '김철수']);
});

// ── interpolateWallAtY ────────────────────────────────────────

const PROFILE = [
  { y: 0,    lx: 0,   rx: 800 },
  { y: 100,  lx: 50,  rx: 750 },
  { y: 300,  lx: 100, rx: 700 },
  { y: 1000, lx: 0,   rx: 800 },
];

test('interpolateWallAtY: 프로파일 정점과 정확히 일치하는 y', () => {
  assert.deepEqual(interpolateWallAtY(PROFILE, 100, 800), { lx: 50, rx: 750 });
});

test('interpolateWallAtY: 두 정점 사이는 선형 보간한다', () => {
  // y=200은 (100,300) 구간의 중간 → lx 50~100의 중간=75, rx 750~700의 중간=725
  assert.deepEqual(interpolateWallAtY(PROFILE, 200, 800), { lx: 75, rx: 725 });
});

test('interpolateWallAtY: 범위 밖 y는 양 끝 정점으로 클램프한다', () => {
  assert.deepEqual(interpolateWallAtY(PROFILE, -50, 800), { lx: 0, rx: 800 });
  assert.deepEqual(interpolateWallAtY(PROFILE, 5000, 800), { lx: 0, rx: 800 });
});

test('interpolateWallAtY: 빈/누락 프로파일은 풀폭 기본값을 반환한다', () => {
  assert.deepEqual(interpolateWallAtY([], 100, 825), { lx: 0, rx: 825 });
  assert.deepEqual(interpolateWallAtY(null, 100, 825), { lx: 0, rx: 825 });
});

test('interpolateWallAtY: 대형 프로파일(125 정점)에서 선형 탐색 결과와 동일하다', () => {
  // canyon.js 실제 패턴 재현: y=50부터 25 간격
  const big = [{ y: 0, lx: 0, rx: 825 }];
  for (let y = 50; y <= 3120; y += 25) {
    big.push({ y, lx: 10 + (y % 200), rx: 815 - (y % 170) });
  }

  // 레퍼런스: 기존 collision.js의 선형 탐색 구현
  function linearRef(profile, y) {
    if (y <= profile[0].y) return profile[0];
    if (y >= profile[profile.length - 1].y) return profile[profile.length - 1];
    for (let i = 0; i < profile.length - 1; i++) {
      const v0 = profile[i], v1 = profile[i + 1];
      if (y >= v0.y && y <= v1.y) {
        const t = (y - v0.y) / (v1.y - v0.y);
        return { lx: v0.lx + t * (v1.lx - v0.lx), rx: v0.rx + t * (v1.rx - v0.rx) };
      }
    }
    return profile[profile.length - 1];
  }

  for (let y = -10; y <= 3200; y += 7) {
    const expected = linearRef(big, y);
    const actual = interpolateWallAtY(big, y, 825);
    assert.ok(Math.abs(actual.lx - expected.lx) < 1e-9, `lx mismatch at y=${y}`);
    assert.ok(Math.abs(actual.rx - expected.rx) < 1e-9, `rx mismatch at y=${y}`);
  }
});
