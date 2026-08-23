#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  SessionStart hook — persist git author identity across sessions
# =============================================================================
# 원격 실행 환경은 세션(컨테이너)마다 로컬 git config가 초기화되어, 커밋
# author가 플레이스홀더(Claude <noreply@anthropic.com>)로 찍히는 문제가 있다.
#
# 이 훅은 세션 시작 시 git 신원을 실제 작업자 계정으로 고정한다. 단,
# 이름/이메일 같은 개인정보는 저장소에 커밋되지 않도록 **환경변수**에서만
# 읽어온다 (환경 설정에 등록 → 세션 간 유지, 저장소에는 남지 않음).
#
# 필요한 환경변수 (환경 설정에서 지정):
#   GIT_AUTHOR_NAME   커밋 author 이름
#   GIT_AUTHOR_EMAIL  커밋 author 이메일
# 자세한 설정법은 .claude/hooks/README.md 참고.
# =============================================================================

name="${GIT_AUTHOR_NAME:-}"
email="${GIT_AUTHOR_EMAIL:-}"

# 환경변수가 없으면 세션을 깨지 않고 조용히 통과 (기존 신원 유지).
if [[ -z "$name" || -z "$email" ]]; then
  echo "[session-start] GIT_AUTHOR_NAME / GIT_AUTHOR_EMAIL 미설정 — git 신원을 변경하지 않습니다." >&2
  exit 0
fi

git config user.name "$name"
git config user.email "$email"
echo "[session-start] git 신원 설정 완료: ${name} <${email}>"
