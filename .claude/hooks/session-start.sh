#!/usr/bin/env bash
set -euo pipefail

# git author 신원을 GIT_AUTHOR_NAME/EMAIL 환경변수에서 고정한다. 배경과
# 설정법은 README.md 참고.

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
