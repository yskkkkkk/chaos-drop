# SessionStart 훅 — git author 신원 고정

원격 실행 환경은 세션(컨테이너)이 새로 생성될 때마다 로컬 git config가
초기화되어, AI 세션이 만드는 커밋의 author가 플레이스홀더
(`Claude <noreply@anthropic.com>`)로 찍힌다. 이 훅은 세션 시작 시 git 신원을
실제 작업자 계정으로 고정한다.

## 동작 방식

`.claude/settings.json`이 `SessionStart` 이벤트에 `session-start.sh`를 등록한다.
세션이 시작되면 훅이 **환경변수**에서 신원을 읽어 `git config`에 적용한다.

| 환경변수 | 용도 |
|---|---|
| `GIT_AUTHOR_NAME` | 커밋 author 이름 |
| `GIT_AUTHOR_EMAIL` | 커밋 author 이메일 |

환경변수가 하나라도 비어 있으면 훅은 **아무것도 바꾸지 않고 조용히 통과**한다
(세션이 깨지지 않는다).

## 왜 파일에 이름/이메일을 하드코딩하지 않는가

이름·이메일 같은 개인정보를 저장소에 커밋된 파일에 문자열로 남기지 않기 위해서다.
신원 값은 **환경 설정(environment)** 에만 등록하며, 이 값은 세션 간 유지되고
저장소에는 남지 않는다. 커밋 메타데이터(authorship)에만 실제 신원이 기록된다.

## 설정 방법 (1회)

원격 실행 환경 설정에서 아래 두 환경변수를 등록한다:

```
GIT_AUTHOR_NAME=<본인 이름>
GIT_AUTHOR_EMAIL=<본인 이메일>
```

등록 후 새로 시작되는 세션부터 자동 적용된다.

## 수동 검증

```bash
# 1) 신원을 플레이스홀더로 오염
git config user.name "Claude"
git config user.email "noreply@anthropic.com"

# 2) 환경변수를 준 상태로 훅 실행 → 복원 확인
GIT_AUTHOR_NAME="<이름>" GIT_AUTHOR_EMAIL="<이메일>" \
  bash .claude/hooks/session-start.sh

git config user.name    # → <이름>
git config user.email   # → <이메일>
```
