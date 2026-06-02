# PROGRESS

손동작 기반 제너러티브 꽃 미디어아트 — 진행 로그. Phase 완료 시 3~5줄 append.

- 저장소: `Jinsoo-96/generative-flower` (public)
- 라이브 dev URL: https://jinsoo-96.github.io/generative-flower/
- 작업 브랜치: `dev` (개발 중 배포 트리거 = dev), `main`은 Phase 5에서 프로덕션 승격.

---

## Phase 0-A — 스캐폴드 & 배포 파이프라인

**한 일**

- `npm create vite@latest . --template react-ts` 스캐폴드. baseline 의존성 설치.
- `package.json` 스크립트 추가: `typecheck`, `test`, `test:watch`.
- `vite.config.ts`: `base: '/generative-flower/'` + vitest 설정.
- `.github/workflows/deploy.yml`(트리거=dev), `docs/DEV_PLAN.md`, `PROGRESS.md`, `README.md` 생성.
- `public/models/hand_landmarker.task`(7.8MB, float16) 다운로드.

**버전 확인 (npm view, baseline 대비)**

| 패키지 | 설치 | baseline | 비고 |
| --- | --- | --- | --- |
| vite | 8.0.16 | 최신 | 메이저 핀 없음 (OK) |
| react / react-dom | 19.2.7 | ^19 | R3F v9 전제 충족 |
| @react-three/fiber | 9.6.1 | ^9 | React 19 전용 ✓ |
| @react-three/drei | 10.7.7 | ^10 | ✓ |
| @react-three/postprocessing | 3.0.4 | ^3 | postprocessing 6.39.1 동반 |
| three | 0.184.0 | 최신 | 자체 타입 미동봉 → @types/three 필요 |
| @types/three | 0.184.1 | 최신 | three 0.184와 메이저/마이너 일치 ✓ |
| @mediapipe/tasks-vision | 0.10.35 | ^0.10.35 | **WASM MP_VERSION=0.10.35 정확 일치** |
| vitest | 4.1.8 | 최신 | |
| typescript | 6.0.x | 최신 | 템플릿 제공 |

**결정 기록 (비자명한 선택)**

- `typecheck` 스크립트를 문서의 `tsc --noEmit` 대신 **`tsc -b --noEmit`** 로 설정. 이유: 템플릿은 project references(`tsconfig.json` `files:[]` + app/node 참조) 구조라 `tsc --noEmit`은 참조 프로젝트를 검사하지 않음. `-b`(build mode)가 references를 따라 실제 타입 검사를 수행 (TS 5.6+ `--noEmit` 지원).
- 모델 파일은 CDN 직접 참조 대신 **`public/models/`에 저장**(문서 권장, GH Pages 경로 안정). 코드에서 `${import.meta.env.BASE_URL}models/hand_landmarker.task` 로 참조.
- `MP_VERSION = "0.10.35"` (jsdelivr WASM)을 설치된 `@mediapipe/tasks-vision` 버전과 일치.

**자동 게이트 결과**: `typecheck` ✅ · `lint` ✅ · `test` ✅(파일 없음, passWithNoTests) · `build` ✅. dist/index.html이 `/generative-flower/`로 자산 경로를 올바르게 재작성, 모델 dist/models/에 복사됨.

**최종 테스트로 미룬 항목**: 없음 (Phase 0-A는 배포 파이프라인까지, 카메라 없음).

**남은 이슈**: dev 푸시 → Actions 배포 성공 + dev URL HTTPS 200 확인.
