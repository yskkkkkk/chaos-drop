# AI.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. No Redundant Documentation

**Say each thing once. Pick the one place it belongs.**

- Don't restate in a script/code comment what a nearby README, doc, or docstring already says. Comments explain *why*, not what's already documented elsewhere.
- Don't pad a README with a section for every possible subtopic. One short paragraph that answers "what is this, why does it exist, how do I use it" beats five headed sections.
- Commit messages and PR descriptions: state what changed and why in as few lines as it takes. Skip emoji headers, restating the diff line-by-line, and "✅ done / ⚠️ note" bullet theater.
- Before adding a comment, doc section, or PR paragraph, ask: does this information already exist somewhere else nearby? If yes, link or skip it instead of duplicating it.
- If a file you wrote could lose a third of its lines with no loss of information, it needs another pass.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 6. 🚨 PROJECT ABSOLUTE CORE RULE (가장 중요한 핵심 원칙) 🚨

**100% Deterministic Fixed-Timestep Physics (모든 환경에서 동일한 60프레임 고정 물리 연산 보장)**

이 프로젝트의 생명은 "공정성"입니다. 코드를 수정함에 있어 디바이스의 사양, 모니터 주사율(60Hz, 144Hz 등), 일시적인 브라우저 렉 등에 의해 물리 연산 결과(공의 궤적, 게임 진행 속도)가 변형되는 것은 **절대 용납되지 않습니다.**
- **렌더링과 물리 분리**: 화면을 그리는 속도(`requestAnimationFrame`)는 모니터 주사율을 따라가게 두어 부드러움을 극대화하되, 물리 연산(`updatePhysicsStep`)은 반드시 `accumulator`를 이용해 **정확히 16.66ms(60FPS) 단위**로만 실행되어야 합니다.
- **프레임 제한 로직 금지**: 고주사율 모니터를 방어한답시고 `requestAnimationFrame` 초입에서 `return`으로 프레임을 인위적으로 버리지 마십시오. 이는 `accumulator`의 시간 누적을 이중으로 계산하게 만들어 속도를 망가뜨립니다.
- **물리 상수 변경 주의**: 중력, 마찰력, 반발력 등의 상수를 수정할 때 "프레임에 비례한 가속(delta time multiplier)" 같은 가변 연산을 섞지 마십시오. 물리 엔진은 언제나 "1틱(16.66ms)당 고정된 수치"로만 동작하는 완전 결정론적(Deterministic) 상태를 유지해야 합니다.
