# SessionStart 훅 — git author 신원 고정

컨테이너가 새로 생성될 때마다 git config가 초기화되어 커밋 author가
플레이스홀더(`Claude <noreply@anthropic.com>`)로 찍히는 문제를 막는다.
`session-start.sh`가 세션 시작 시 `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`
환경변수를 읽어 `git config user.name`/`user.email`에 적용한다. 둘 중
하나라도 비어 있으면 아무것도 바꾸지 않고 조용히 통과한다.

개인정보를 저장소 파일에 남기지 않기 위해 이름/이메일은 훅 스크립트가 아닌
**환경 설정(environment)의 환경변수**로만 관리한다.

## 설정 (1회)

원격 실행 환경 설정에 등록:

```
GIT_AUTHOR_NAME=<본인 이름>
GIT_AUTHOR_EMAIL=<본인 이메일>
```

이후 새로 시작되는 세션부터 자동 적용된다.

## 수동 검증

```bash
git config user.name "Claude"; git config user.email "noreply@anthropic.com"
GIT_AUTHOR_NAME="<이름>" GIT_AUTHOR_EMAIL="<이메일>" bash .claude/hooks/session-start.sh
git config user.name   # → <이름>
```
