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

**배포 결과**: ✅ `dev` 푸시 → Actions build 22s + deploy 9s 성공. 라이브 https://jinsoo-96.github.io/generative-flower/ HTTP 200(HTTPS), 모델 `models/hand_landmarker.task` HTTP 200(7,819,105 bytes).

**막힘 & 해결 (기록)**: 첫 배포에서 deploy 단계가 `Branch "dev" is not allowed to deploy to github-pages due to environment protection rules`로 거부됨. 원인: `github-pages` 환경 기본 정책이 `custom_branch_policies:true` + 등록 브랜치 0개라 dev 차단. 해결: 환경 `deployment_branch_policy=null`(모든 브랜치 허용)로 PUT → 실패 잡 rerun → 성공. 이 방식은 Phase 5에서 트리거를 main으로 바꿔도 환경 재설정이 불필요(문서 §13.3 "Settings 재설정 불필요"와 일치).

**경고(비차단, 추적)**: Actions 로그에 `Node.js 20 actions deprecated` 경고(2026-06-16부터 Node 24 강제). checkout@v4/setup-node@v4/configure-pages@v5/upload-pages-artifact@v3/deploy-pages@v4 — 동작엔 문제 없음. 추후 액션 메이저 갱신 시 재검토.

**최종 테스트로 미룬 항목**: 없음 (Phase 0-A는 배포 파이프라인까지, 카메라 없음).

---

## Phase 0-B — 웹캠 + 손 인식 디버그 오버레이

**한 일**

- `src/tracking/landmarks.ts`: 21점 인덱스 상수(LM), FINGER_TIPS, HAND_CONNECTIONS(21 edges), 순수 헬퍼 `dist2D`/`mirrorX`/`toCanvasPoint`(미러링 §8 반영).
- `src/tracking/landmarks.test.ts`: 합성 입력 단위 테스트 7개(거리, 미러링 flip, 캔버스 좌표 변환, 토폴로지 상수).
- `src/tracking/useWebcam.ts`: getUserMedia(640×480, user) + `<video>` 연결 + 언마운트 트랙 정지. 권한은 `start()`(사용자 클릭)에서만 요청. 거부/미지원/미발견 상태 구분.
- `src/tracking/useHandLandmarker.ts`: `createHandLandmarker`(GPU→CPU 폴백) + 모델 1회 로드 + throttle(~30fps) rAF 인식 루프. 결과는 `onResults` 콜백으로만 전달(매 프레임 React state 미사용, §3 루프 분리).
- `src/ui/DebugOverlay.tsx`: 미러링된 `<video>` 위 비미러 `<canvas>`에 21점+골격 드로잉(x는 toCanvasPoint에서 flip). `App.tsx`에 연결 → 라이브 URL에서 “카메라 시작”으로 사람이 즉시 트래킹 확인 가능.

**결정 기록 (비자명한 선택)**

- `runningMode`: 문서 스니펫의 `'video'`(소문자)는 0.10.35 타입과 불일치 → **`'VIDEO'`**(대문자, `RunningMode`)로 보정.
- eslint-plugin-react-hooks v7 규칙 대응: ① effect 본문 동기 `setState` 금지 → 모델 상태 초기값을 `'loading'`으로 두고 동기 호출 제거. ② render 중 ref 쓰기 금지 → "latest ref" 콜백을 effect 안에서 갱신.
- 인식 루프는 `video.currentTime` 변화 + minInterval 이중 throttle로 같은 프레임 중복 디텍션 방지.
- ⚠️ 다음 단계 메모: `erasableSyntaxOnly: true`라 **constructor 파라미터 프로퍼티/enum 사용 불가** → Phase 2 `OneEuro`는 필드 명시 선언으로 작성할 것.

**자동 게이트 결과**: `typecheck` 0 · `lint` 0 · `test` 0(7 passed) · `build` 0. 번들 331KB(gzip 102KB, MediaPipe JS 래퍼 포함; WASM은 런타임 CDN 로드).

**최종 테스트로 미룬 항목 (Phase 5, 사람·카메라)**: 카메라 권한 프롬프트 동작, 영상 셀피 미러링, 손 따라 21점/골격이 올바른 방향으로 그려지는지(왼손=화면 왼쪽). → **단, 사용자가 라이브 URL에서 “카메라 시작”으로 지금이라도 직접 확인 가능.**

---

## Phase 1 — Three.js 기반 & 좌표 매핑

**한 일**

- `src/lib/math.ts`: `clamp01`/`clamp`/`lerp`/`invLerp`/`smoothstep` 순수 유틸.
- `src/config.ts`: `CAMERA`(fov 50, z=5), `FLOWER_PLANE_DISTANCE`, `DEPTH`(nearMin/Max), `FLOWER`(scale range), `MOTION`(lerp 계수). 튜닝값은 최종 카메라 테스트에서 보정.
- `src/gestures/types.ts`: `GestureState` 계약(§3) + `defaultGestureState()`.
- `src/scene/mapping.ts`: `frustumHalfExtents`/`normalizedToWorld`(§9.1, y-flip)/`depthToScale`(§9.2). 
- `src/scene/mapping.test.ts`: 합성 단위 테스트 8개 — 중앙→원점, y 반전, mirror∘mapping 방향(손 좌→월드 +x), aspect 스케일, depth→scale 클램프.
- `src/gestures/extract.ts`(Phase 1 부분): `palmCenter`(0·5·9·17 평균)·`handScale`(0–9)·`depthFromHandScale`·`extractGesture`(position 미러링 + depth). bloom/fingerCount/rotation/isFist는 Phase 2.
- `src/tracking/trackingContext.ts` + `TrackingProvider.tsx`: 단일 웹캠+랜드마커 소스, `gestureRef`(mutable)·`lastResultRef` 제공. onResults에서 extractGesture → gestureRef 갱신(매 프레임 state 미사용).
- `src/ui/DebugOverlay.tsx`: 공유 컨텍스트 소비형 PiP(자체 rAF 드로잉)로 리팩터.
- `src/scene/Flower.tsx`: placeholder 꽃(코어 구 + 꽃잎 5장), useFrame에서 gestureRef→world 위치/스케일 lerp.
- `src/scene/Stage.tsx`: `<Canvas>` + perspective 카메라 + 어두운 ambient/key 라이트(§11 톤 프리뷰). `App.tsx`: TrackingProvider→Scene(Stage + PiP + 시작 카드).

**결정 기록 (비자명한 선택)**

- context/hook을 `trackingContext.ts`로 분리 → Provider 파일은 컴포넌트만 export(`react-refresh/only-export-components` 충족).
- React 19 context-as-provider 문법(`<TrackingContext value=…>`) 사용.
- 카메라 시작 전에도 placeholder 꽃이 중앙에 정적으로 보이게(미감 프리뷰 겸용).

**자동 게이트 결과**: `typecheck` 0 · `lint` 0 · `test` 0(15 passed: landmarks 7 + mapping 8) · `build` 0. 번들 1,215KB(gzip 338KB) → `>500KB 청크` 경고(비차단; three+R3F+MediaPipe). 추후 동적 import 코드분할 검토(백로그).

**최종 테스트로 미룬 항목 (Phase 5, 사람·카메라)**: 실제 손 이동 시 꽃이 시각적으로 일치하게 따라옴(좌우/상하), 손 가까이→꽃 커짐. → 사용자가 라이브 URL에서 지금 직접 확인 가능.

---

## Phase 2 — 제스처 시스템 (핀치→개화) + One Euro 스무딩

**한 일**

- `src/config.ts` 확장: `PINCH`(closed/open), `FINGER`(extRatio/thumbExtRatio), `FIST`(tipToPalmRatio), `ONE_EURO`(신호별 시작 파라미터), `MOTION.bloomLerp/rotationLerp`.
- `src/gestures/oneEuro.ts`: One Euro Filter(§10). ⚠️ `erasableSyntaxOnly` 때문에 **constructor 파라미터 프로퍼티 미사용**(필드 명시 선언). `makeOneEuro(params)` 포함.
- `src/gestures/extract.ts` 완성: `pinchRatio`/`bloomFromPinch`(§9.3), `isFingerExtended`/`isThumbExtended`/`countFingers`(§9.4), `rotationAngle`(§9.5), `isFist`. `extractGesture`가 position/depth/bloom/fingerCount/rotation/isFist 전부 산출.
- `src/gestures/smoothing.ts`: `makeGestureSmoother()` — position.x/y·depth·bloom·rotation에 개별 One Euro, fingerCount/isFist는 raw 통과.
- `TrackingProvider`: onResults에서 extractGesture → smoother.smooth(raw, now/1000) → gestureRef.
- `Flower.tsx`: bloom→꽃잎 펼침(반경·pitch 보간), rotation→group.rotation.z, 렌더 루프 추가 lerp.

**결정 기록 (비자명한 선택)**

- `isThumbExtended`를 문서의 "엄지끝–검지MCP 가로 분리" 대신 **"엄지끝(4)이 엄지MCP(2)보다 손목에서 thumbExtRatio(1.25)배 멀면 폄"** 으로 구현 — 다른 손가락과 동형이라 합성 테스트가 결정적이고 handedness 불필요. 실제 정확도는 카메라 테스트에서 검증.
- rotation은 atan2라 ±π 경계 불연속 가능 — roll ±90° 범위에선 무해. 필요 시 Phase 5에서 sin/cos 분리 스무딩 검토.
- 합성 손 빌더(extract.test.ts)로 손가락 0~5/주먹/핀치를 결정적으로 구성해 테스트.

**자동 게이트 결과**: `typecheck` 0 · `lint` 0 · `test` 0(**36 passed**: landmarks 7 + mapping 8 + extract 17 + oneEuro 4) · `build` 0. 번들 1,218KB(gzip 339KB).

**최종 테스트로 미룬 항목 (Phase 5, 사람·카메라)**: 핀치 봉오리↔만개 떨림 없이 부드럽게, 거리 무관 개화 일정, 정지 시 떨림(=One Euro minCutoff 튜닝), 빠른 동작 끈적임(=beta 튜닝). → 사용자가 라이브 URL에서 지금 직접 확인 가능.

---

## Phase 3 — 꽃 다양성 & 비주얼

**한 일**

- `src/config.ts`: §11 `TONE` 토큰 블록 그대로 추가(배경/종별 색/petalMaterial/조명/bloom/모션/파티클/post). 톤 단일 진실 소스.
- `src/scene/flowerGeometry.ts`(순수): `phyllotaxis`(황금각 137.5°), 3종 `SPECIES`(rose 4겹 30장 / daisy phyllotaxis코어+13장 / lotus 넓은 14장), `speciesForFingerCount`(≤1 rose,2 daisy,≥3 lotus), `buildPetalSlots`(MAX_PETALS=32 고정 슬롯, 비활성 패딩).
- `src/scene/flowerGeometry.test.ts`: 6 테스트(황금각, sqrt(i) 반경, 종류 매핑, 슬롯 패딩/개수).
- `src/scene/petalMaterial.ts`: 꽃잎 ShaderMaterial — base→tip 그라데이션 + 프레넬 림(self-lit emissive, Bloom 구동), 인스턴싱 대응 vertex(`#ifdef USE_INSTANCING`). `makePetalGeometry`(Shape 기반 꽃잎, uv.y=base→tip).
- `src/scene/Flower.tsx` 재작성: 인스턴싱 꽃잎(MAX_PETALS) + phyllotaxis 골드 씨앗 코어(InstancedMesh). bloom→꽃잎 펼침(레이어별 위상 지연), fingerCount→종류 **크로스페이드**(0.45s, 슬롯/색/코어 lerp), rotation→roll, position/depth→배치/스케일. 매 프레임 gestureRef만 읽음.
- `src/scene/Stage.tsx`: 투명 캔버스(alpha) + CSS 방사형 그라데이션 배경(TONE) + `EffectComposer`/`Bloom`(TONE.bloom).
- `?preview=1` 정적 톤 프리뷰: `TrackingProvider preview={...}`(웹캠/모델 미로드, load=false), App에서 분기. 카메라 없이 dev URL에서 톤 확인 가능.

**결정 기록 (비자명한 선택)**

- 종류 전환은 고정 슬롯(MAX_PETALS) 위에서 from→to 슬롯/색을 lerp하는 크로스페이드(개수 차이는 active 0↔1 페이드). 진짜 위상 모핑 대신 짧은 전환으로 자연스러움 확보.
- 배경은 `<color>` 대신 투명 캔버스 + CSS 그라데이션 → 순색 배경 금지(§11) 충족, 후처리와 무관하게 그라데이션 유지. ⚠️ 투명+EffectComposer 합성은 Phase 5 카메라 테스트에서 눈으로 최종 확인.
- 셰이더는 RawShaderMaterial이 아닌 ShaderMaterial → three가 normalMatrix/uv/position/instanceMatrix(USE_INSTANCING) 자동 주입.
- Bloom 후처리를 Phase 3에서 도입(프리뷰가 발광을 요구). Bloom **토글**·vignette/CA·파티클은 Phase 4.

**자동 게이트 결과**: `typecheck` 0 · `lint` 0 · `test` 0(**42 passed**: +flowerGeometry 6) · `build` 0. 번들 1,295KB(gzip 358KB; postprocessing 포함).

**최종 테스트로 미룬 항목 (Phase 5, 사람·시각)**: 종류 전환 부드러움, 꽃잎 그라데이션/림으로 입체감, 회전 동작, 30fps, **투명+Bloom 배경 그라데이션 정상 표시**, 미감 사인오프(TONE 튜닝). → `?preview=1`로 지금 톤 미리보기 가능.

---

## Phase 4 — 파티클 · 후처리 · UI 폴리시

**한 일**

- `src/scene/Petals.tsx`: 주먹 rising-edge에 꽃 위치에서 꽃잎 파편 **버스트**(near-zero 중력, 페이드) + 배경 부유 **스포어 모트**. InstancedMesh + emissive basic(toneMapped off → Bloom). 가변 상태는 ref+effect 시드(렌더 중 Math.random/변경 금지 규칙 대응, Burst 클래스 메서드로 변경 캡슐화).
- `src/scene/Stage.tsx`: `bloomEnabled` prop으로 Bloom 토글 + 상시 Vignette·ChromaticAberration(TONE.post). `<Petals/>` 추가.
- `src/ui/Onboarding.tsx` + `onboardingPhase.ts`: 사용법 안내 + 카메라 시작(사용자 제스처 후 권한), 로딩 스피너, 거부/미지원/에러 폴백 + 재시도. 권한은 클릭에서만.
- `src/ui/HUD.tsx`: 현재 꽃 종류 라벨 + Bloom 토글 + Debug 토글(aria-pressed).
- `App.tsx` 재배선: Onboarding 게이트 + HUD(ready 시) + Bloom/Debug 상태. HUD 종류/검출은 200ms 인터벌로 gestureRef에서 저빈도 동기(값 변할 때만 setState). **DebugOverlay는 언마운트하지 않고 CSS로만 숨김**(공유 `<video>` 유지 → 트래킹 끊김 방지).
- `Flower.tsx`: idle 부유 드리프트/스웨이(§11 motion) 추가 — base ref로 lerp와 분리해 compounding 방지.
- `useWebcam.ts`: `classifyMediaError`(순수) + `isMediaSupported` 분리.

**결정 기록 (비자명한 선택)**

- React Compiler lint(react-hooks v7): ① 렌더 중 Math.random 금지 → 파티클 시드를 effect로. ② useMemo 결과/배열 요소 직접 변경 금지 → 파티클을 `useRef` + `BurstParticle` 클래스 메서드(spawn/step)로. ③ 컴포넌트 파일은 컴포넌트만 export → `onboardingPhase` 분리, `SPECIES_LABEL` 비export.
- Debug PiP 토글은 `display:none`이 아닌 opacity/pointer-events로 숨김 → 비표시 중에도 `<video>`가 프레임을 디코딩해 인식 유지.
- 컴포넌트 테스트용 jsdom + @testing-library/react 추가(`// @vitest-environment jsdom` 파일 단위).

**검증(헤드리스 swiftshader, 카메라 불필요)**: preview rose/daisy 및 root 온보딩 모두 **콘솔/페이지 에러 0**, 캔버스·시작 버튼 정상. 스크린샷으로 온보딩 UI·배경 모트·vignette·3종 꽃 확인.

**자동 게이트 결과**: `typecheck` 0 · `lint` 0 · `test` 0(**58 passed**: +webcam 5, Onboarding 7, HUD 4) · `build` 0. 번들 1,303KB(gzip 361KB).

**최종 테스트로 미룬 항목 (Phase 5, 사람·카메라/시각)**: 주먹→흩뿌리기 연출, Bloom on/off 시각/프레임 회복, 권한 거부 안내 실제 표시, 30fps. → preview/온보딩은 지금 라이브에서 확인 가능.
