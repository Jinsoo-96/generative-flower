# CLAUDE.md

이 저장소의 개발 명세는 **[docs/DEV_PLAN.md](docs/DEV_PLAN.md)** 가 단일 진실 소스다. 에이전트는 그 문서의 Phase 순서·DoD·원칙을 따른다. 진행 로그는 [PROGRESS.md](PROGRESS.md).

## 핵심 규칙 (요약 — 상세는 DEV_PLAN.md)

- **브랜치:** 모든 작업은 `dev`. `main` 직접 커밋 금지. Phase 5에서만 트리거를 `main`으로 바꾸고 머지.
- **자동 게이트(매 Phase 종료):** `npm run typecheck` · `npm run lint` · `npm run build` (+해당 시 `npm test`) 전부 통과 → `dev` 푸시 → Actions 배포 성공.
- **개발 중 카메라 미사용.** 카메라/시각/인터랙션 검증은 전부 최종 테스트(Phase 5, 사람)로 미룬다. 그 외 로직은 합성 입력으로 단위 테스트.
- **미러링:** 화면 기준 x는 `1 - lm.x` (DEV_PLAN §8).
- **자산 경로:** 절대경로 금지, `${import.meta.env.BASE_URL}...` 사용 (GH Pages base = `/generative-flower/`).
- **상태:** 제스처 상태는 React state가 아니라 `useRef` + mutable 객체로 매 프레임 갱신. 인식 루프(throttle)와 렌더 루프(useFrame) 분리.
- **MediaPipe WASM 버전(`MP_VERSION`)은 설치된 `@mediapipe/tasks-vision` 버전(0.10.35)과 정확히 일치.**

## 명령어

```bash
npm run dev | typecheck | lint | test | build | preview
```
