# 손동작 기반 제너러티브 꽃 미디어아트 — 개발 플로우 (에이전트 실행용)

> **이 문서의 사용법**
> 이 문서는 Claude 코딩 에이전트(Claude Code 등)가 **사람의 추가 개입을 최소화하며 단계적으로 구현**하도록 작성된 실행 명세다.
> 레포 루트에 `docs/DEV_PLAN.md`로 두거나 `CLAUDE.md`에서 이 파일을 참조하라.
> 각 Phase의 **완료 기준(DoD)** 을 통과하기 전에는 다음 Phase로 넘어가지 말 것. 막히면 임의로 우회하지 말고 그 지점을 기록한 뒤 사람에게 질문할 것.

---

## 0. 목표

웹캠으로 손을 인식하고(MediaPipe HandLandmarker), 손가락 제스처에 반응하는 **제너러티브 꽃 비주얼**을 Three.js(React Three Fiber)로 렌더링하는 1인용 인터랙티브 웹 데모. **GitHub Pages 정적 배포**로 누구나 브라우저에서 체험 가능.

**중요 전제: 모델 학습·데이터 수집 없음.** 구글이 사전학습해 배포한 모델을 브라우저에서 **추론(inference)만** 한다.

### 성공 정의 (프로젝트 전체 DoD)

- [ ] 카메라 권한 허용 후 손을 비추면, 손 위치를 따라 꽃이 이동한다.
- [ ] 엄지–검지 핀치로 꽃이 봉오리↔만개로 **부드럽게(떨림 없이)** 개화한다.
- [ ] 펼친 손가락 수로 꽃 종류가 바뀐다(최소 3종).
- [ ] 주먹을 쥐면 꽃잎이 파티클로 흩어진다.
- [ ] Bloom 후처리로 발광 느낌이 살아 있고, 끌 수 있다.
- [ ] 온보딩 UI(권한 요청·사용법·로딩 상태)가 있다.
- [ ] **GitHub Pages URL(HTTPS)에서 동일하게 동작**한다.
- [ ] 데스크톱 Chrome 기준 **30fps 이상** 유지.

### 범위

- **v1 포함:** 한 손 인식, 위치/개화/종류/회전/흩뿌리기, Bloom, 온보딩 UI, GH Pages 배포.
- **v1 제외(백로그):** 양손 동시 인식, 모바일 심화 최적화, 사운드, 녹화/공유, 다국어. (12절 참고)

---

## 1. 에이전트 작업 원칙 (반드시 준수)

1. **Phase 순서 엄수.** 각 Phase의 DoD(자동 게이트)를 만족하고 **dev 브랜치에 커밋·푸시**한 뒤에만 다음으로 진행.
2. **검증 게이트 — 개발 중엔 자동만.** 매 Phase 종료 시 ① 로컬 자동 게이트 `npm run typecheck` · `npm run lint` · `npm run build`(+해당 Phase면 `npm test`)가 모두 통과 → ② `dev`에 푸시 → Actions 빌드·배포 성공(= 항상 배포 가능 상태 유지). **개발 중에는 브라우저를 열어 카메라/비주얼을 사람이 확인하지 않는다.** 카메라 권한·시각·인터랙션 검증은 **전부 최종 테스트(Phase 5)로 미룬다.** 자동 게이트가 하나라도 실패하면 다음 Phase 금지.
3. **작은 커밋 + 푸시.** Phase별로 의미 있는 커밋(각 Phase에 메시지 제안 포함)을 dev에 푸시 → 자동 배포(빌드 헬스 체크).
4. **진행 로그.** 레포 루트 `PROGRESS.md`에 Phase 완료 시 "한 일 / 자동 게이트 결과 / **최종 테스트로 미룬 항목** / 남은 이슈"를 3~5줄 append.
5. **버전 확인.** 설치 직전 `npm view <pkg> version`으로 현재 버전을 확인. 본 문서 baseline(2절)과 **메이저 버전이 다르면** PROGRESS.md에 기록하고, 호환 규칙(R3F 메이저 ↔ React 메이저)을 최우선으로 지킬 것.
6. **카메라 없이 최대한 검증(중요).** 웹캠 영상은 자동 테스트가 불가하므로, **그 외 로직은 전부 합성 입력으로 단위 테스트**해 커버리지를 넓힌다 — 제스처 추출·스무딩뿐 아니라 **손 위치→월드 좌표 매핑, 미러링, 개화 매핑**까지 고정/시퀀스 랜드마크 배열을 흘려 출력을 검증한다. 실제 카메라로 손→꽃이 움직이는 **E2E와 미감 판정만** 최종 테스트(사람)로 남긴다. ⚠️ 이렇게 하면 트래킹 파이프라인 결함이 최종에야 드러날 수 있으니, 합성 테스트를 빠짐없이 작성할 것.
7. **시크릿/네트워크.** API 키 불필요. 외부 통신은 ① MediaPipe WASM(jsdelivr CDN) ② 모델 파일 다운로드뿐.
8. **막히면 질문.** 라이브러리 임의 교체나 아키텍처 변경 전 사람에게 확인.
9. **결정 기록.** 비자명한 선택(임계값, 보간 계수 등)은 코드 주석 + PROGRESS.md에 근거를 남길 것.

### Git 브랜치 & 지속 배포 전략 (반드시 준수)

- **전제:** 아래 **사전 준비(Preflight)** 가 완료되어 있어야 한다. 저장소 생성부터 시작한다(Phase 0).
- **브랜치 모델:** `main`(릴리스/프로덕션) + `dev`(작업/프리뷰). **모든 Phase 작업은 `dev`에서만.** `main`에는 직접 커밋하지 않는다.
- **지속 배포(빌드 헬스 체크용).** GitHub Actions가 **`dev` 푸시마다 GitHub Pages로 자동 배포**한다. 배포 셋업은 끝이 아니라 **Phase 0에서** 끝내, 라이브 URL은 Phase 0부터 살아 있다. 단, **개발 중 이 배포는 "여전히 빌드·배포되는가"의 자동 신호일 뿐, 사람이 열어 카메라/비주얼을 확인하지 않는다**(그 확인은 최종 테스트로 미룸 — 1절 원칙 2).
- **단일 Pages 사이트 사실:** GitHub Pages는 저장소당 URL이 하나다. 개발 중에는 그 URL이 **dev 내용**을 비춘다(workflow 트리거 = `dev`). **모든 Phase 완료 후**(Phase 5) 트리거를 `main`으로 바꾸고 `dev→main` 머지로 프로덕션 승격한다. `base` 경로는 두 경우 모두 `/<REPO_NAME>/`로 동일 → 변경 불필요.
- **Pages는 공개 저장소 권장:** 무료 플랜에서 **private 저장소의 Pages는 유료(Pro/Team)**다. 이 데모는 공유가 목적이므로 **`--public`** 으로 만든다(민감정보 없음). private이 꼭 필요하면 사람에게 확인.
- (선택) dev/prod **동시 2개 URL**이 필요하면 `gh-pages` 브랜치 + 서브경로(`/dev/`) 퍼블리시 기법이 있으나 v1에선 불필요. 단일 사이트 2단계 전환으로 간다.

### 사전 준비 (Preflight — 사람이 개발 시작 전 1회 완료)

자율 개발 중 멈추지 않도록 **인증·환경은 전부 먼저** 끝낸다. 아래가 안 되어 있으면 에이전트는 시작하지 말고 사람에게 요청할 것.

- [ ] **GitHub CLI 인증 + `workflow` 스코프.** `gh auth login` 후 **반드시** `gh auth refresh -s workflow` 실행. ⚠️ 이 스코프가 없으면 `.github/workflows/deploy.yml`이 포함된 커밋 **푸시가 거부**된다(가장 흔한 막힘). 확인: `gh auth status`에 `workflow` 표시.
- [ ] **git 사용자 설정:** `git config --global user.name "..."` / `user.email "..."`.
- [ ] **Node 20 LTS+ / npm** 설치 확인: `node -v`(≥20), `npm -v`.
- [ ] **저장소 이름 결정** + 공개(`--public`)로 만들 것 합의. (`<REPO_NAME>`, `<owner>` 확정)
- [ ] **GitHub Actions 사용 가능**(기본 켜짐). 조직 계정이면 Actions가 막혀있지 않은지 확인.
- [ ] **카메라 권한은 사전 불필요.** 개발 중엔 카메라를 쓰지 않는다. **최종 테스트(Phase 5) 때** 데스크톱 **Chrome**(웹캠 연결)에서 1회 권한 허용. → 이게 "중간 카메라 확인 없이 완주, 마지막에 테스트" 요구의 핵심.

---

## 2. 기술 스택 & 버전 baseline

> 설치 시점에 더 최신이 있으면 사용하되, **메이저 호환 규칙**은 반드시 지킨다. (R3F v9 ↔ React 19)

| 항목      | 패키지                                                           | baseline 버전                   | 비고                                                 |
| --------- | ---------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------- |
| 빌드      | `vite`                                                           | 최신 (`npm create vite@latest`) | 메이저 핀 금지, 최신 사용                            |
| 런타임    | `react`, `react-dom`                                             | `^19`                           | R3F v9 전제                                          |
| 3D 렌더러 | `@react-three/fiber`                                             | `^9`                            | **v9 = React 19 전용** (v8은 React 18)               |
| 3D 헬퍼   | `@react-three/drei`                                              | `^10`                           | v10이 R3F v9/React 19 대응                           |
| 후처리    | `@react-three/postprocessing`                                    | `^3`                            | R3F v9 대응. `postprocessing` 동반 설치됨            |
| Three     | `three`                                                          | 최신                            | R3F가 요구하는 버전에 맞춰 설치 후 핀                |
| 손 인식   | `@mediapipe/tasks-vision`                                        | `^0.10.35`                      | API 안정. WASM 버전은 이 값과 **정확히 일치**시킬 것 |
| 타입      | `typescript`, `@types/three`, `@types/react`, `@types/react-dom` | 최신                            | TS 사용                                              |
| 린트      | `eslint` + 템플릿 기본 설정                                      | 최신                            | `npm create vite` react-ts 템플릿 동봉               |

**런타임 요구:** Node.js **20 LTS 이상**.

**언어: TypeScript 사용.** 타입체크 자체가 에이전트의 검증 게이트가 되어 자율 개발 안정성을 높인다.

**상태관리:** 외부 라이브러리 없이 시작. 제스처 상태는 **React state가 아니라 `useRef` + mutable 객체**로 들고 매 프레임 갱신한다(리렌더 폭발 방지). 전역 공유가 필요해지면 그때 `zustand` 도입을 검토(백로그).

---

## 3. 아키텍처 / 데이터 흐름

핵심 멘탈 모델은 **단방향 파이프라인**이다. 랜드마크 좌표를 씬에 직접 꽂지 말고, **의미 있는 중간값(제스처 상태)으로 한 번 추상화**한 뒤 비주얼에 매핑한다. 이래야 매핑을 자유롭게 바꿀 수 있다.

```
[Webcam getUserMedia]
        │  <video> element (mirrored, 640×480)
        ▼
[MediaPipe HandLandmarker]  detectForVideo(video, timestampMs)
        │  raw 21 landmarks (per hand)  + handedness
        ▼
[Gesture Extraction]  순수 함수: landmarks → GestureState (raw)
        │  position / pinch / fingerCount / rotation / fist
        ▼
[Smoothing]  One Euro Filter (스칼라/축별)
        │  GestureState (smoothed)  ──저장──▶ gestureRef.current (mutable)
        ▼
[Render Loop · useFrame 60fps]  gestureRef 읽어 lerp 보간 → 씬 파라미터
        ▼
[Three.js Scene]  Flower(개화/종류/회전) + Particles(흩뿌리기)
        ▼
[Postprocessing]  EffectComposer → Bloom (토글 가능)
```

### 두 개의 루프를 분리하라 (성능·부드러움의 핵심)

- **인식 루프:** `requestAnimationFrame` 안에서 `detectForVideo` 호출. 필요 시 **20~30fps로 throttle**(매 프레임 디텍션은 비쌈). 결과로 `gestureRef.current`만 갱신. **React state를 건드리지 않는다.**
- **렌더 루프:** R3F `useFrame`(60fps). `gestureRef.current`를 읽어 현재 씬 값으로 `lerp`/`damp` 보간. 인식이 느려도 비주얼은 부드럽게 유지된다.

### 데이터 계약 (이 인터페이스를 먼저 고정하라)

```ts
// src/gestures/types.ts
export interface GestureState {
  detected: boolean; // 손이 보이는가
  position: { x: number; y: number }; // 화면 정규화 좌표 [0,1], 미러링 반영 후
  depth: number; // 손 크기 기반 0(멀다)~1(가깝다)
  bloom: number; // 개화량 0(봉오리)~1(만개)  ← 핀치에서 유도
  fingerCount: 0 | 1 | 2 | 3 | 4 | 5; // 펼친 손가락 수
  rotation: number; // 라디안, 화면평면 회전(roll)
  isFist: boolean; // 주먹
}
```

비주얼 레이어는 **오직 `GestureState`만** 소비한다. MediaPipe 타입을 비주얼 컴포넌트로 새어 나가게 하지 말 것.

---

## 4. 목표 디렉터리 구조

```
.
├─ docs/
│  └─ DEV_PLAN.md                 # 이 문서
├─ public/
│  └─ models/
│     └─ hand_landmarker.task     # Phase 0에서 다운로드 (또는 CDN 사용)
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ tracking/
│  │  ├─ useWebcam.ts             # getUserMedia, <video> 셋업, 정리
│  │  ├─ useHandLandmarker.ts     # 모델 로드 + 인식 루프 (throttle) → gestureRef
│  │  └─ landmarks.ts             # 랜드마크 인덱스 상수, 헬퍼(거리/각도)
│  ├─ gestures/
│  │  ├─ types.ts                 # GestureState
│  │  ├─ extract.ts               # landmarks → GestureState(raw) (순수 함수)
│  │  ├─ extract.test.ts          # 합성 입력 단위 테스트
│  │  └─ oneEuro.ts               # One Euro Filter
│  ├─ scene/
│  │  ├─ Stage.tsx                # <Canvas> + 카메라/조명 + 후처리
│  │  ├─ Flower.tsx               # 꽃(개화/회전/종류) 비주얼
│  │  ├─ flowerGeometry.ts        # 꽃잎/씨앗 배치 수학(phyllotaxis 등)
│  │  ├─ Petals.tsx               # 흩뿌리기 파티클
│  │  └─ shaders/                 # GLSL (vertex/fragment, 또는 인라인)
│  ├─ ui/
│  │  ├─ Onboarding.tsx           # 권한 요청·사용법·로딩
│  │  ├─ HUD.tsx                  # 현재 꽃 종류, 디버그 토글, Bloom 토글
│  │  └─ DebugOverlay.tsx         # 2D 캔버스 랜드마크 디버그 (Phase 0)
│  ├─ config.ts                   # 임계값/계수 상수 (한곳에 모아 튜닝)
│  └─ styles.css
├─ .github/workflows/deploy.yml   # Phase 5
├─ vite.config.ts
├─ PROGRESS.md
└─ package.json
```

---

## 5. Phase별 구현 계획

> 각 Phase: **목표 → 작업 → 완료 기준(DoD) → 검증 → 커밋**. DoD 통과 전 진행 금지.
>
> **Phase 1~4 공통 규칙:** 모든 작업은 `dev`에서. 각 Phase 종료 시 ① 로컬 **자동 게이트**(typecheck/lint/build, 해당 시 test)가 통과 → ② `dev`에 커밋·푸시 → 자동 배포 성공(빌드 헬스). **개발 중에는 브라우저를 열어 카메라/비주얼을 확인하지 않는다** — 카메라·시각·인터랙션 검증은 전부 **최종 테스트(Phase 5)**로 미룬다(1절 원칙 2·6). 따라서 아래 각 Phase의 DoD 중 카메라/시각이 필요한 항목은 "⏸ 최종 테스트"로 표시되어 있고, 개발 중 게이트는 자동 항목만으로 통과시킨다.

### Phase 0 — 타당성 검증 & 세팅 (가장 먼저, 가장 중요)

여기서 "웹캠 영상 위에 내 손의 21개 점이 따라 그려진다"까지 되면 프로젝트의 가장 큰 리스크가 해소된다.

**작업 — A. 저장소 & 배포 파이프라인 (이걸 먼저 끝내 라이브 URL을 띄운다)**

1. (사람 완료 가정) `gh auth login`.
2. Vite 스캐폴드 + 의존성: `npm create vite@latest . -- --template react-ts` → `npm install` → baseline 패키지 설치(2절). 설치 전 `npm view <pkg> version`으로 확인 후 PROGRESS.md 기록.
3. `package.json` 스크립트: `"typecheck": "tsc --noEmit"` 추가(lint/build/preview는 템플릿 제공). 단위테스트용 `vitest` 추가.
4. 문서/로그 파일: 이 문서를 `docs/DEV_PLAN.md`로 두고, `PROGRESS.md`, 간단한 `README.md` 생성.
5. `vite.config.ts`에 **`base: '/<REPO_NAME>/'`** 설정(13절). 모든 자산은 `import.meta.env.BASE_URL` 기준.
6. `.github/workflows/deploy.yml` 추가(13.3절 YAML, **트리거 = `dev`**).
7. git 초기화 → 최초 커밋(main) → 원격 생성(`--public`) → push → `dev` 브랜치 생성·전환 (16절 명령 블록 그대로 실행).
8. 레포 **Settings → Pages → Source = GitHub Actions**로 1회 설정(또는 13.3절의 `gh api` 사용).
9. `dev`에 push → Actions 배포 성공 확인 → **dev URL `https://<user>.github.io/<REPO_NAME>/`** 가 HTTPS로 열리는지 브라우저 확인(이 시점엔 Vite 기본 화면이면 OK). **이때부터 라이브 dev 환경이 살아 있다.**

**작업 — B. 웹캠 + 손 인식 디버그** 10. 모델 파일 준비(택1): - **권장(GH Pages 경로 안정):** `hand_landmarker.task`를 `public/models/`에 저장.
URL: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`
코드에서는 **`${import.meta.env.BASE_URL}models/hand_landmarker.task`** 로 참조. - 대안: 모델도 CDN URL 직접 참조. 11. `tracking/useWebcam.ts`: `getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })`, `<video autoplay muted playsInline>`에 연결, 언마운트 시 트랙 정지. 12. `tracking/useHandLandmarker.ts`: 아래 **초기화 스니펫** 그대로 사용. `numHands: 1`, `runningMode: 'video'`, GPU delegate. 13. `ui/DebugOverlay.tsx`: `<video>` 위에 `<canvas>`를 겹쳐, 매 인식 결과의 21개 점과 골격 라인을 그린다. **영상은 `transform: scaleX(-1)`로 미러링**하고, 캔버스에 그릴 때 **x를 `1 - x`로 반전**(8절 미러링 규칙).

**MediaPipe 초기화 스니펫 (검증된 API):**

```ts
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const MP_VERSION = "0.10.35"; // ⚠️ 설치된 @mediapipe/tasks-vision 버전과 정확히 일치시킬 것

export async function createHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`,
  );
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `${import.meta.env.BASE_URL}models/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "video",
    numHands: 1,
  });
}

// 인식 루프 (throttle 예시: ~30fps)
// const now = performance.now();
// const result = handLandmarker.detectForVideo(videoEl, now);
// result.landmarks[0] → 21개 {x,y,z} (정규화 좌표)
```

> ⚠️ **WASM 버전 불일치 주의:** jsdelivr WASM 버전과 설치된 npm 패키지 버전이 다르면 런타임 에러가 날 수 있다. 위 `MP_VERSION`을 설치 버전과 맞춰라.

**DoD — 개발 중 (자동)**

- [ ] `gh repo create --public`로 저장소 생성, 작업 브랜치는 `dev`.
- [ ] `dev` push 시 Actions가 자동 배포되고, **dev URL이 HTTPS로 200 응답**(빈 스캐폴드라도 OK), 빌드 로그에 자산/모델/WASM 경로 경고 없음.
- [ ] webcam/landmarker/overlay 코드가 typecheck/lint/build 통과(컴파일·번들 성공).
- [ ] (있다면) 디버그 그리기·좌표 변환 헬퍼의 **합성 입력 단위 테스트** 통과.

**DoD — ⏸ 최종 테스트(Phase 5, 사람·카메라)**

- [ ] 로컬/라이브에서 카메라 권한 프롬프트가 뜨고 허용된다.
- [ ] 영상이 거울처럼(셀피) 표시되고, 손을 따라 21개 점/골격이 **올바른 방향으로** 그려진다(왼손이 화면 왼쪽 = 미러링 정상).

**검증**: 개발 중엔 빌드·배포 성공 + 단위 테스트로만 판정. 미러링/실제 트래킹은 최종 테스트에서 "손을 우로 → 점도 우로"로 확인(반대면 8절 재확인).

**커밋(dev에 푸시)**:

1. `chore: scaffold vite+react-ts and github pages dev deploy pipeline`
2. `feat: webcam + mediapipe hand landmarker debug overlay`

---

### Phase 1 — Three.js 기반 & 좌표 매핑

**작업**

1. `scene/Stage.tsx`: R3F `<Canvas>` 설정. 카메라(perspective, 적당한 fov/거리) + 기본 조명(ambient + directional/point).
2. 아주 단순한 꽃 placeholder 하나 렌더(예: 중심 구 + 평면 꽃잎 5장).
3. **좌표 매핑 구현(9.1절 공식):** 정규화 손 좌표(미러링 반영) → 카메라 프러스텀에 맞춘 월드 평면 위 (x, y). 손 크기→`depth`→스케일.
4. `<video>`+`DebugOverlay`는 화면 한쪽 작은 PiP로 남겨 디버그 유지(나중에 토글로 숨김).
5. **좌표 매핑 단위 테스트(`scene/mapping.test.ts`):** 합성 손 좌표(예: 중앙·좌상·우하 + 미러링) 입력 → 기대 월드 (x,y)·스케일 출력 검증. (카메라 없이 트래킹 로직을 자동 검증하는 핵심)

**DoD — 개발 중 (자동)**

- [ ] 좌표 매핑/미러링/`depth`→스케일이 **단위 테스트 통과**(손 좌표 → 기대 월드 좌표).
- [ ] typecheck/lint/build 통과, dev 배포 성공.

**DoD — ⏸ 최종 테스트(사람·카메라)**

- [ ] 실제 손을 움직이면 placeholder 꽃이 **손과 시각적으로 일치**하게 따라온다(좌우/상하 방향 정확).
- [ ] 손을 카메라에 가까이 → 꽃이 커진다.

**커밋**: `feat: r3f stage + landmark-to-world coordinate mapping (+ unit tests)`

---

### Phase 2 — 제스처 시스템 (핀치→개화부터 완벽히)

**작업**

1. `gestures/extract.ts`: `landmarks → GestureState(raw)` **순수 함수**로 구현(9.2~9.5절).
   - `position` = **손바닥 중심 = 랜드마크 0·5·9·17의 평균**(손가락 하나보다 안정적 → 꽃이 손을 매끄럽게 따라옴), `depth`(손 크기), `bloom`(핀치 정규화), `fingerCount`, `rotation`, `isFist`. 모든 x는 미러링 반영(`1 - x`, 8절).
2. `gestures/oneEuro.ts`: One Euro Filter(10절 레퍼런스 구현). `bloom`, `position.x/y`, `rotation` 등 **각 스칼라에 개별 필터** 적용.
3. `useHandLandmarker.ts`에서 추출+스무딩 결과를 `gestureRef.current`에 기록.
4. `Flower.tsx`의 `useFrame`에서 `gestureRef`를 읽어 개화/위치/회전을 `lerp`(또는 drei `damp`)로 보간.
5. **우선 "핀치 → 개화" 하나만** 끝까지 매끄럽게 연결한 뒤 나머지.
6. `gestures/extract.test.ts`: **합성 랜드마크**로 단위 테스트 — 봉오리/만개/중간의 `bloom`, 손가락 0~5의 `fingerCount`, 주먹의 `isFist`, 그리고 **`position`(손 좌→우 이동 시 x 증가, 미러링 방향 일치)**·`rotation` 검증. 추가로 `oneEuro.test.ts`: 노이즈 섞은 **시퀀스 입력**을 흘려 출력 분산이 입력보다 작아지는지(떨림 감소) 검증.

**DoD — 개발 중 (자동)**

- [ ] `extract.test.ts`·`oneEuro.test.ts` 통과: `position`(손→꽃 트래킹 매핑)·`bloom`·`fingerCount`·`isFist`·스무딩이 기대대로.
- [ ] typecheck/lint/build 통과, dev 배포 성공.

**DoD — ⏸ 최종 테스트(사람·카메라)**

- [ ] 엄지–검지를 붙이면 봉오리, 벌리면 만개로 **떨림 없이 부드럽게** 전환.
- [ ] 손을 멀리/가까이 해도 개화 정도가 거리와 무관하게 일정.

**검증**: 손을 가만히 두었을 때 꽃이 미세하게 떨리면 One Euro의 `minCutoff`를 낮추고, 빠른 동작에 끈적이면 `beta`를 높여 튜닝(10절). 값은 `config.ts`에 모으고 근거를 주석으로.

**커밋**: `feat: gesture extraction (pinch→bloom) + one-euro smoothing + unit tests`

---

### Phase 3 — 꽃 다양성 & 비주얼

> 톤은 **11절 "발광·몽환" 토큰 확정**. 꽃잎 셰이더의 색·발광·rim은 전부 `TONE`(config.ts)에서 읽는다.

**작업** 0. **스타일 프리뷰(카메라 불필요, 비차단):** 제스처 배선 없이 `TONE` 토큰만 적용한 **정적 꽃 1송이 + 배경 + Bloom** 화면을 `?preview=1`(또는 별도 라우트)로 만든다. 카메라가 없어도 렌더되므로 dev URL에서 언제든 톤을 볼 수 있다. **단, 미감 사인오프는 최종 테스트로 미룬다** — 개발을 여기서 멈추지 말 것. (원하면 사람이 중간에 열어볼 수 있게 만들어 두는 용도)

1. `flowerGeometry.ts`: 꽃 형태 수학(9.6절).
   - **Phyllotaxis(황금각 137.5°)** 로 중심부 씨앗 배치(데이지/해바라기류).
   - **꽃잎 인스턴싱**: 꽃잎 1개를 중심 둘레로 N회 회전 복제. 개화량 `bloom`으로 꽃잎 펼침 각도를 봉오리(접힘)↔만개(펼침)로 보간.
2. 최소 **3종** 꽃 정의(예: `1=장미형(겹꽃)`, `2=데이지형(phyllotaxis 중심+홑꽃잎)`, `3=연꽃형(넓은 꽃잎)`). `fingerCount`로 종류 전환하되, **전환 시 모핑/크로스페이드**로 튀지 않게.
3. **꽃잎 셰이더(GLSL)**: base→tip 그라데이션, **프레넬 림 라이트**, 약한 노이즈로 자연스러운 음영. (drei `shaderMaterial` 또는 `MeshStandardMaterial` 확장)
4. 성능: `InstancedMesh` 사용, 지오메트리 재사용, 불필요한 재생성 금지.

**DoD — 개발 중 (자동)**

- [ ] `fingerCount → 꽃 종류 선택` 매핑이 **단위 테스트 통과**(1→장미, 2→데이지, 3→연꽃 등).
- [ ] 3종 지오메트리·셰이더가 빌드되고 `?preview=1`이 렌더(에러 없이). typecheck/lint/build 통과, dev 배포 성공.

**DoD — ⏸ 최종 테스트(사람·카메라/시각)**

- [ ] 손가락 수를 바꾸면 꽃 종류가 **부드럽게** 전환(최소 3종).
- [ ] 꽃잎 그라데이션·림 라이트로 평면적이지 않음, 회전 제스처로 꽃이 돈다.
- [ ] 30fps 유지(데스크톱 Chrome).

**커밋**: `feat: multiple flower species (instanced petals + phyllotaxis) with petal shader`

---

### Phase 4 — 파티클·후처리·UI 폴리시

**작업**

1. `Petals.tsx`: `isFist`가 true가 되는 순간 **꽃잎 흩뿌리기 버스트**(파티클). 수명/중력/페이드. 파티클 수 상한 둘 것.
2. `@react-three/postprocessing`의 `EffectComposer` + `Bloom`. **강도/threshold를 HUD에서 토글·조절** 가능하게(비용 큼 → 켜고 끌 수 있어야).
3. `ui/Onboarding.tsx`: 첫 진입 시 사용법 안내 + "카메라 시작" 버튼(권한은 사용자 제스처 후 요청하는 게 안정적). 모델/카메라 **로딩 스피너**, 권한 거부/미지원 **에러 상태** 처리.
4. `ui/HUD.tsx`: 현재 꽃 종류 표시, 디버그 오버레이 토글, Bloom 토글.
5. 비주얼 디렉션(11절) 점검: 배경, 색, 모션의 절제.

**DoD — 개발 중 (자동)**

- [ ] `getUserMedia` 거부/미지원을 **모킹한 테스트**에서 앱이 크래시 없이 에러 상태 UI로 폴백(카메라 없이 검증 가능).
- [ ] Bloom 토글·HUD 상태 전환 로직이 동작(상태 단위 테스트 또는 렌더 스모크). typecheck/lint/build 통과, dev 배포 성공.

**DoD — ⏸ 최종 테스트(사람·카메라/시각)**

- [ ] 주먹 쥐면 꽃잎 흩뿌리기 연출이 보인다.
- [ ] Bloom on/off가 시각적으로 동작하고, off일 때 프레임이 회복된다.
- [ ] 권한 거부/구형 브라우저에서 안내 메시지가 실제로 뜬다.

**커밋**: `feat: petal burst particles, bloom postprocessing, onboarding + HUD`

---

### Phase 5 — 최종 릴리스: dev → main 머지 & 프로덕션 승격

배포 파이프라인은 Phase 0에서 이미 구축됨. 이 단계는 **dev에서 검증을 마친 결과를 main(프로덕션)으로 승격**하는 것이다.

**작업**

1. **최종 테스트 = 첫 카메라/비주얼 검증(사람).** 개발 내내 미뤄둔 카메라·시각·인터랙션 확인을 **여기서 처음 한 번에** 한다. 데스크톱 Chrome(웹캠)에서 dev URL을 열어 카메라 권한 허용 → 14절 수동 체크리스트 전 항목 + 각 Phase의 "⏸ 최종 테스트" 항목 + 11절 미감 사인오프(필요 시 `TONE` 값 튜닝)를 통과시킨다. 미통과는 dev에서 고쳐 다시 푸시(여기서 멈추지 말 것).
2. **프로덕션 트리거 전환:** `deploy.yml` 트리거를 `dev` → **`main`** 으로 변경(13.4절). 이로써 프로덕션 배포는 main에서만 일어난다. dev에 커밋.
   > Pages는 저장소당 1개 사이트이므로 main이 단일 프로덕션 소스가 된다. `base`는 그대로 `/<REPO_NAME>/`(변경 불필요). Settings → Pages 재설정 불필요(소스는 계속 "GitHub Actions").
3. **머지:** `dev → main` PR 생성 후 머지(`--no-ff` 권장, 히스토리 보존). 16절 명령 사용.
4. **프로덕션 배포 확인:** main 머지가 Actions를 트리거 → 배포 성공 → **동일 URL이 main 내용으로** 서비스되는지, 14절 핵심 시나리오 재확인.
5. **문서 마감:** `README.md`에 라이브 데모 URL·사용법·브라우저 요구사항·스크린샷/GIF 기재. `PROGRESS.md` 최종 정리.

**DoD**

- [ ] 14절 전 시나리오가 **라이브 URL**에서 통과.
- [ ] `deploy.yml`이 `main` 트리거로 전환됨, main 머지 시 자동 배포 동작.
- [ ] `dev → main` 머지 완료(히스토리 보존).
- [ ] 콘솔에 404(자산/모델/WASM)·런타임 에러 없음, 30fps+ 유지.
- [ ] README에 데모 URL·사용법 기재.

**커밋/머지**:

1. `ci: switch pages deploy trigger from dev to main for production`
2. `docs: finalize readme with live demo link and usage`
3. 머지 커밋: `Merge dev into main: release v1`

---

## 6. (요약) 제스처 → 꽃 매핑 명세

| 입력(손)                      | 추출값         | 꽃 반응              |
| ----------------------------- | -------------- | -------------------- |
| 손바닥 중심 위치              | `position.x/y` | 꽃의 화면 위치       |
| 손 크기(0↔9 거리)             | `depth`        | 꽃 크기/원근         |
| 엄지(4)–검지(8) 거리 / 손크기 | `bloom 0~1`    | 봉오리↔만개 개화     |
| 펼친 손가락 수                | `fingerCount`  | 꽃 종류 선택(1/2/3…) |
| 손목(0)→중지MCP(9) 각도       | `rotation`     | 꽃 회전(roll)        |
| 주먹                          | `isFist`       | 꽃잎 흩뿌리기 버스트 |

---

## 7. 랜드마크 인덱스 레퍼런스

MediaPipe Hand 21점: `0`=손목, 엄지 `1·2·3·4`(4=끝), 검지 `5·6·7·8`(8=끝), 중지 `9·10·11·12`, 약지 `13·14·15·16`, 새끼 `17·18·19·20`. 각 손가락 끝(TIP)은 `4,8,12,16,20`. `9`(중지 MCP)는 손바닥 기준점으로 유용.

좌표는 **정규화값**: `x,y ∈ [0,1]`(입력 영상 기준, 원점 좌상단, x→오른쪽, y→아래), `z`는 상대 깊이(손목 기준, 작을수록 카메라에 가까움).

---

## 8. ⚠️ 미러링 규칙 (가장 흔한 버그)

셀피 뷰는 영상을 좌우 반전(`scaleX(-1)`)해서 보여준다. MediaPipe 랜드마크는 **반전 전 원본 영상 기준**이므로, 화면과 일치시키려면 **x를 반드시 뒤집는다.**

```ts
const mx = 1 - lm.x; // 미러링된 화면 기준 x
const my = lm.y; // y는 그대로
```

- 각도(`rotation`) 계산도 미러링된 좌표(`mx`)로 하거나, 부호를 반전해야 회전 방향이 맞는다.
- **증상별 진단:** 손을 오른쪽으로 옮겼는데 꽃이 왼쪽으로 → x 반전 누락/중복. 손을 시계방향으로 돌렸는데 꽃이 반시계 → 각도 부호 문제.

---

## 9. 핵심 알고리즘 & 수식

### 9.1 좌표 매핑 (정규화 → 월드)

화면 정규화 좌표를 NDC로, 다시 카메라 프러스텀에 맞춘 월드 평면 좌표로 변환한다(perspective 카메라, 꽃을 카메라에서 거리 `D`인 평면에 둔다고 가정).

```ts
// 1) 미러링 반영 정규화 → NDC [-1,1]
const ndcX = mx * 2 - 1;
const ndcY = -(my * 2 - 1); // 화면 y(아래로 증가)를 NDC y(위로 증가)로 뒤집기

// 2) 카메라 거리 D 평면에서의 가시 반높이/반너비
const halfH = Math.tan((camera.fov * Math.PI) / 180 / 2) * D;
const halfW = halfH * camera.aspect;

// 3) 월드 좌표
const worldX = ndcX * halfW;
const worldY = ndcY * halfH;
// 꽃 mesh.position.set(worldX, worldY, cameraZ - D) (lerp로 보간)
```

### 9.2 손 크기 / depth

거리에 강건한 기준 길이로 **손목(0)–중지MCP(9)** 거리를 쓴다(개별 손가락보다 안정적).

```ts
const handScale = dist2D(lm[0], lm[9]); // 정규화 좌표 거리
// depth: 경험적 범위를 [0,1]로 정규화(튜닝값은 config.ts)
const depth = clamp01((handScale - NEAR_MIN) / (NEAR_MAX - NEAR_MIN));
```

### 9.3 핀치 → 개화(bloom)

핀치 거리를 **손 크기로 정규화**해 카메라 거리와 무관하게 만든 뒤, 닫힘/열림 임계로 0~1 매핑.

```ts
const pinch = dist2D(lm[4], lm[8]) / handScale; // 손크기 정규화
// PINCH_CLOSED ≈ 0.25, PINCH_OPEN ≈ 1.1 (config.ts에서 튜닝)
const bloomRaw = smoothstep(PINCH_CLOSED, PINCH_OPEN, pinch); // 0~1
// → One Euro로 스무딩 후 GestureState.bloom
```

### 9.4 펼친 손가락 수

각 손가락이 "펴졌는지"는 **TIP이 PIP보다 손목에서 더 멀리 있는가**로 판단(엄지는 별도 처리).

```ts
function isFingerExtended(lm, tip, pip) {
  return dist2D(lm[tip], lm[0]) > dist2D(lm[pip], lm[0]) * EXT_RATIO; // EXT_RATIO≈1.0~1.1
}
// 검지(8,6) 중지(12,10) 약지(16,14) 새끼(20,18)
// 엄지(4): 손목 기준 거리 대신, 엄지끝(4)과 검지MCP(5)의 가로 분리 + handedness로 판정
const fingerCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;
```

`isFist`: 네 손가락(검지~새끼)이 모두 접힘 = `fingerCount`(엄지 제외) ≤ 0, 그리고 TIP들이 손바닥 중심에 가까움.

### 9.5 손 회전(roll)

```ts
const v = { x: 1 - lm[9].x - (1 - lm[0].x), y: lm[9].y - lm[0].y }; // 미러링 반영
const rotation = Math.atan2(v.y, v.x); // 라디안
```

### 9.6 꽃 형태 생성

**Phyllotaxis(중심부 씨앗 배치):**

```ts
const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // ≈137.5°
for (let i = 0; i < n; i++) {
  const theta = i * GOLDEN;
  const r = c * Math.sqrt(i); // c: 간격 계수
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
}
```

**꽃잎 인스턴싱 + 개화 보간:**

```ts
// N장 꽃잎: i*(2π/N)로 회전 복제
// 개화량 b∈[0,1]: 꽃잎 pitch를 봉오리(접힘)↔만개(펼침)로 보간
const pitch = lerp(PETAL_PITCH_BUD, PETAL_PITCH_OPEN, b); // 라디안
// + b에 따라 바깥으로 약간 translate / scale → 자연스러운 개화
// InstancedMesh: 각 인스턴스 matrix를 useFrame에서 갱신
```

장미형은 꽃잎 레이어를 여러 겹(층마다 위상 오프셋), 연꽃형은 넓고 적은 꽃잎으로 파라미터만 바꿔 재사용.

---

## 10. One Euro Filter (레퍼런스 구현)

떨림 제거의 핵심. 스칼라 신호마다 인스턴스 하나씩. 벡터는 축별로 적용.

```ts
// src/gestures/oneEuro.ts
const alpha = (cutoff: number, dt: number) => {
  const r = 2 * Math.PI * cutoff * dt;
  return r / (r + 1);
};

class LowPass {
  private s = 0;
  private init = false;
  filter(x: number, a: number) {
    this.s = this.init ? a * x + (1 - a) * this.s : x;
    this.init = true;
    return this.s;
  }
}

export class OneEuro {
  private xF = new LowPass();
  private dxF = new LowPass();
  private lastTime: number | null = null;
  private lastRaw = 0;
  constructor(
    private minCutoff = 1.0, // ↓ 낮출수록 정지 시 더 매끄럽지만 지연 증가
    private beta = 0.02, // ↑ 높일수록 빠른 동작에서 지연 감소
    private dCutoff = 1.0,
  ) {}
  /** t는 초 단위 (performance.now()/1000) */
  filter(x: number, t: number): number {
    if (this.lastTime == null) {
      this.lastTime = t;
      this.lastRaw = x;
      return x;
    }
    const dt = Math.max(1e-6, t - this.lastTime);
    this.lastTime = t;
    const dx = (x - this.lastRaw) / dt;
    this.lastRaw = x;
    const edx = this.dxF.filter(dx, alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xF.filter(x, alpha(cutoff, dt));
  }
}
```

**튜닝 가이드:** 정지 시 떨림 → `minCutoff` ↓(예: 0.5). 빠른 동작에서 끈적/지연 → `beta` ↑(예: 0.05). 시작점 `minCutoff=1.0, beta=0.02`.

---

## 11. 비주얼 디렉션 — "발광·몽환(Bioluminescent / Ethereal)" 확정

**무드:** 밤의 심해 · 발광 해파리 · 안개 낀 야광 정원. 어둠 속에서 **안에서부터 빛나는**, 느리고 부유하는 느낌. 빛은 외부 조명이 아니라 **꽃잎의 emissive**에서 나온다(이게 이 톤의 핵심 시그니처). Bloom이 그 발광을 번지게 한다.

> ⚠️ **이 토큰 블록이 톤의 단일 진실 소스.** 아래 `TONE` 객체를 `src/config.ts`에 그대로 넣고, 모든 비주얼 컴포넌트는 여기서만 색·수치를 읽는다. 톤 조정은 이 객체 하나만 수정한다. **`petalMaterial.emissiveIntensity`가 Bloom 발광의 마스터 다이얼**이다.

```ts
// src/config.ts — VISUAL TONE: "Bioluminescent / Ethereal" (발광·몽환)
export const TONE = {
  mood: "밤의 심해 · 발광 해파리 · 야광 정원. 어둠 속에서 안에서부터 빛나는, 느리고 부유하는.",
  refKeywords: [
    "bioluminescent jellyfish",
    "glowing flower in the dark",
    "deep sea light",
  ],

  // 배경: 수직/방사형 그라데이션 (어두운 보라/인디고). 순흑·단색 회색 금지.
  background: {
    top: "#080115", // 바깥/위 (거의 검정 보라)
    bottom: "#1a0838", // 중앙/아래 (깊은 보라)
    glow: "#2a0f55", // 중앙의 약한 발광 포켓
  },

  // 꽃 종류별 꽃잎 그라데이션: base(안쪽/어두움) → tip(바깥/발광) + emissive 틴트 + rim 색
  species: {
    rose: {
      base: "#3a0a4a",
      tip: "#ff5fd2",
      emissive: "#ff7ae0",
      rim: "#ffb0ee",
    }, // 마젠타 발광
    daisy: {
      base: "#06283d",
      tip: "#52f0ff",
      emissive: "#7afcff",
      rim: "#c4ffff",
    }, // 시안 발광
    lotus: {
      base: "#1a0840",
      tip: "#9b7bff",
      emissive: "#b89bff",
      rim: "#dcccff",
    }, // 라벤더→아쿠아
    core: "#ffd86b", // 중심부 씨앗 = 따뜻한 골드 발광 (차가운 꽃잎과 대비 포인트)
  },

  // 꽃잎 머티리얼: MeshStandardMaterial(emissive) + 커스텀 프레넬 rim, 반투명
  petalMaterial: {
    roughness: 0.35,
    metalness: 0.0,
    emissiveIntensity: 1.6, // ★ Bloom 구동 마스터 다이얼 (1.2~2.2 사이 튜닝)
    opacity: 0.88,
    transparent: true,
    fresnelPower: 2.5, // 가장자리 발광 = 역광 투과(translucency) 느낌
    fresnelIntensity: 1.2,
  },

  // 조명: 어둡게. 꽃은 대부분 self-lit, 조명은 형태감만 살짝.
  lighting: {
    ambientColor: "#1a1030",
    ambientIntensity: 0.3,
    keyColor: "#6a4cff",
    keyIntensity: 0.6,
  },

  // Bloom: threshold 낮게 → 발광 꽃잎이 잘 번지게. 단 전체가 흐려지지 않도록 smoothing.
  bloom: {
    enabled: true,
    intensity: 1.15,
    luminanceThreshold: 0.2,
    luminanceSmoothing: 0.9,
    mipmapBlur: true,
    radius: 0.6,
  },

  // 모션: 느리고 부유하는. 모든 변화는 damp 보간. idle은 물속에 떠 있는 듯.
  motion: {
    dampSmoothTime: 0.3, // 초 (drei easing.damp)
    idleSwayDeg: 2.5, // idle 회전 흔들림 진폭(도)
    idleDriftWorld: 0.04, // idle 위치 부유 진폭(월드 단위)
    idleFreqHz: 0.3, // 느린 호흡 주기
    petalEase: "easeInOutCubic",
  },

  // 파티클: 발광 꽃잎 파편(주먹) + 배경 부유 스포어(분위기).
  particles: {
    burstCount: 60, // 주먹 시 흩뿌리는 꽃잎 파편 수
    burstSize: 0.06,
    burstLifetime: 2.2, // 초
    burstGravity: -0.2, // 거의 무중력, 살짝 떠오름
    burstFade: true,
    ambientMotes: 40, // 배경 부유 스포어 (선택이지만 강력 권장 — 톤을 살림)
    ambientMoteOpacity: 0.25,
  },

  // 부가 후처리: 약하게. 과하면 싸구려.
  post: {
    vignette: { enabled: true, darkness: 0.4, offset: 0.3 }, // 가장자리 어둡혀 발광에 집중
    chromaticAberration: { enabled: true, offset: 0.0008 }, // 아주 약한 몽환 엣지
    grain: { enabled: false, opacity: 0.04 }, // 원하면 켜기(유기적 질감)
  },
} as const;
```

### 적용 규칙 (에이전트)

- **발광은 emissive로**, 외부 조명을 밝히지 마라. 어두운 씬 + 밝은 꽃잎의 대비가 핵심. 조명을 키워 밝히면 톤이 죽는다.
- **꽃잎 그라데이션**은 `base`(안쪽)→`tip`(바깥)으로 셰이더에서 보간하고, 프레넬 rim(`rim` 색)을 더해 가장자리를 더 밝게 → 역광 투과 느낌.
- **중심부(`core`)는 따뜻한 골드**로 두어 차가운 꽃잎과 대비 → 꽃이 "발광 코어"처럼 읽힌다.
- **배경 스포어(`ambientMotes`)** 는 선택이지만 이 톤에서 효과가 크다. 아주 느리게 떠다니는 저투명 발광 점들 — "물속 먼지" 느낌. 산만하지 않게 수·투명도 절제.
- **모션은 전부 `damp`**(`dampSmoothTime`)로 느리게. idle 흔들림으로 "살아 부유하는" 느낌을 주되 진폭 작게.
- **UI 크롬**은 최소·반투명·얇은 타이포. 발광 씬을 가리지 않게, 텍스트도 은은한 발광 톤(예: 옅은 시안/라벤더)으로.

### 톤 튜닝 다이얼 (눈으로 맞출 때 이 순서로)

1. 너무 어둡거나 칙칙 → `petalMaterial.emissiveIntensity` ↑ (마스터 다이얼).
2. 전체가 뿌옇게 번짐 → `bloom.luminanceThreshold` ↑ 또는 `bloom.intensity` ↓.
3. 발광이 약함 → `bloom.intensity` ↑ + threshold 약간 ↓.
4. 움직임이 산만/빠름 → `motion.dampSmoothTime` ↑, `idleSwayDeg`·`idleDriftWorld` ↓.
5. 색감 조정은 `species` hex만 바꾼다(나머지 로직 불변).

### ★ 스타일 프리뷰 먼저 (Phase 3 진입 시 권장 게이트)

꽃 비주얼을 본격 구현하기 전에, **제스처 배선 없이** `TONE` 토큰만 적용한 **정적 꽃 1송이 + 배경 + Bloom** 프리뷰 화면을 먼저 만들어 톤을 눈으로 확정하라(`bloom`/`emissiveIntensity`/`species` 색을 빠르게 바꿔보며 합의). 미감은 피드백 루프가 짧아야 산다. 톤 OK 후 제스처에 연결.

---

## 12. 성능 목표 & 수칙

- **목표:** 데스크톱 Chrome 30fps+ (가능하면 60fps).
- 인식 루프 **30fps throttle**, 렌더 60fps 분리.
- 웹캠 입력 **640×480** 고정(해상도↑ = 인식 비용↑).
- `numHands: 1`, GPU delegate.
- 꽃잎/파티클 **InstancedMesh**, 지오메트리·머티리얼 재사용, 매 프레임 객체 생성 금지.
- 파티클 수 상한, 수명 종료 시 풀 재사용.
- Bloom은 토글·강도 조절 가능(가장 무거운 후처리).
- `stats.js`나 r3f-perf로 프레임 측정하고 PROGRESS.md에 수치 기록.

---

## 13. GitHub Pages 배포 상세

### 13.1 핵심 사실

- **웹캠은 HTTPS(보안 컨텍스트)에서만 동작 → GH Pages가 HTTPS 자동 제공.** 별도 인증서 불필요.
- GH Pages는 **정적 호스팅 전용**(서버 없음). 이 앱은 100% 클라이언트라 문제없음.
- GH Pages는 **COOP/COEP 헤더를 못 건다.** MediaPipe 단일 스레드 WASM(jsdelivr) 기본 사용은 그게 없어도 동작. (멀티스레드/SIMD 고급 옵션을 켜지 않는 한 OK)
- **저장소당 Pages 사이트는 1개.** 개발 중엔 그 URL이 `dev` 내용을 비추고(트리거=`dev`), 릴리스 시 트리거를 `main`으로 바꿔 프로덕션을 승격한다(13.3, Phase 5).
- **무료 플랜에서 private 저장소 Pages는 유료.** 이 데모는 **`--public`** 저장소로 만든다(민감정보 없음).

### 13.2 vite.config

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/<REPO_NAME>/", // ⚠️ 프로젝트 페이지면 레포명. <user>.github.io 레포면 "/"
});
```

> 모든 자산은 `import.meta.env.BASE_URL` 기준으로 참조해야 base path에서 404가 안 난다(특히 `public/models/hand_landmarker.task`). 절대경로 `/models/...` **금지** → `${import.meta.env.BASE_URL}models/...` 사용.

### 13.3 GitHub Actions 워크플로

**개발 중에는 트리거 = `dev`**(dev 푸시마다 프리뷰 배포). 릴리스(Phase 5) 때 `dev` → `main`으로만 바꾼다.

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [dev] # ← 개발 중: dev. 릴리스(Phase 5) 때 main으로 변경.
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Pages 소스 = GitHub Actions 설정(1회):**

- UI: 레포 **Settings → Pages → Build and deployment → Source = GitHub Actions** (가장 확실).
- 또는 CLI: `gh api -X POST repos/<owner>/<REPO_NAME>/pages -f build_type=workflow` (이미 활성화면 422 → 무시).

> 소스를 "GitHub Actions"로 두면 Pages는 **어느 브랜치에서 배포했든 마지막 `deploy-pages` 결과**를 서비스한다. 따라서 dev→main 전환은 **워크플로의 트리거 한 줄만** 바꾸면 되고 Settings 재설정은 불필요하다.

### 13.4 배포 트러블슈팅

- **흰 화면 + 자산 404:** `base`가 레포명과 불일치. `/<REPO_NAME>/` 재확인.
- **모델/WASM 404:** 모델 경로가 `BASE_URL` 기준인지, WASM 버전이 설치 버전과 일치하는지 확인.
- **카메라 안 뜸:** HTTP로 접속했는지 확인(반드시 https). 브라우저 권한 차단 여부 확인.
- **권한 프롬프트 미표시:** 사용자 클릭(버튼) 이후 `getUserMedia`를 호출하도록(자동 호출은 일부 브라우저서 차단).
- **dev push했는데 배포 안 됨:** 워크플로 트리거 브랜치 확인(개발 중 `dev`인지). 첫 배포면 Settings→Pages 소스가 "GitHub Actions"인지 확인.
- **머지했는데 프로덕션이 안 바뀜:** Phase 5에서 트리거를 `main`으로 바꿨는지, main 머지가 Actions를 실제로 트리거했는지 확인.

---

## 14. 최종 테스트 (사람·카메라, Phase 5에서 1회)

개발 중에는 수행하지 않는다. **모든 Phase 완료 후 단 한 번**, 데스크톱 Chrome + 웹캠으로 dev URL에서 순서대로 확인(= 그동안 미뤄둔 카메라/시각 검증 전부):

1. URL 접속 → 온보딩 표시 → "시작" 클릭 → 권한 허용 → 로딩 후 씬 진입.
2. 빈 화면에 손 진입 → 꽃 등장, 손 따라 이동(좌우 방향 정상).
3. 손 가까이/멀리 → 꽃 크기 변화.
4. 핀치 닫기/열기 → 봉오리↔만개, 정지 시 떨림 없음.
5. 손가락 1·2·3 → 꽃 종류 전환(부드럽게).
6. 손 회전 → 꽃 회전 방향 정상.
7. 주먹 → 꽃잎 흩뿌리기.
8. Bloom 토글, 디버그 오버레이 토글 동작.
9. 손을 화면 밖으로 → 적절히 사라지거나 마지막 상태 유지(튀지 않음).
10. 권한 거부 시 에러 안내, 앱 비충돌.

각 항목 결과를 PROGRESS.md에 기록.

---

## 15. 백로그 (v1 이후)

- 양손 동시 인식(`numHands: 2`): 두 송이 또는 두 손 사이 거리로 파라미터 제어.
- 모바일 최적화(해상도/연산 적응, 터치 UI).
- 사운드(개화·흩뿌리기 효과음, 제스처-오디오 매핑).
- 장면 녹화/스크린샷 공유.
- 꽃 종류 5종+ 및 계절 테마, 시간에 따른 색 변화.
- WebGPU 렌더러(three 신규) 실험.
- `zustand` 도입(상태가 복잡해질 때).

---

## 16. 빠른 참조 (명령어)

```bash
# ── Phase 0-A: 저장소 & dev 배포 파이프라인 ──────────────────────
# (gh auth login 은 사람이 완료)
npm create vite@latest . -- --template react-ts
npm install
npm i @react-three/fiber @react-three/drei @react-three/postprocessing three @mediapipe/tasks-vision
npm i -D @types/three vitest

# (이후) vite.config.ts에 base 설정, .github/workflows/deploy.yml(트리거 dev) 추가,
#        docs/DEV_PLAN.md · PROGRESS.md · README.md 생성

git init -b main
git add -A && git commit -m "chore: scaffold vite+react-ts and github pages dev deploy pipeline"
gh repo create <REPO_NAME> --public --source=. --remote=origin --push   # main 푸시
git switch -c dev
git push -u origin dev          # ← dev 첫 푸시 → Actions 자동 배포

# Settings→Pages 소스를 GitHub Actions로 (UI 또는):
gh api -X POST repos/<owner>/<REPO_NAME>/pages -f build_type=workflow   # 이미 켜져 있으면 422 무시

# 라이브 dev URL:  https://<owner>.github.io/<REPO_NAME>/

# ── 검증 게이트 (매 Phase 끝, dev에서) ──────────────────────────
npm run typecheck   # tsc --noEmit
npm run lint
npm run build
npm test            # vitest (gesture 단위 테스트)
npm run dev         # 로컬 미리보기 / npm run preview

# ── 매 Phase 커밋·푸시 (dev) → 자동 배포 → 라이브 확인 ──────────
git add -A && git commit -m "feat: ..."   # 각 Phase 메시지
git push                                   # dev → 자동 배포

# ── Phase 5: 프로덕션 승격 ──────────────────────────────────────
# 1) deploy.yml 트리거 dev → main 으로 수정 후 커밋·푸시(dev)
git add .github/workflows/deploy.yml && git commit -m "ci: switch pages deploy trigger from dev to main for production" && git push
# 2) dev → main 머지 (PR)
gh pr create --base main --head dev --title "Release v1" --body "All phases complete"
gh pr merge --merge        # 또는 GitHub UI에서 머지 (--no-ff 히스토리 보존)
# 3) main 머지가 Actions 트리거 → 프로덕션 배포 → 동일 URL에서 재확인
```

> `<REPO_NAME>` / `<owner>`는 실제 값으로 치환. 사용자 페이지(`<owner>.github.io` 저장소)를 쓸 게 아니면 프로젝트 페이지이며 `base`는 `/<REPO_NAME>/`.

---

### 부록: 자주 틀리는 6가지 (에이전트 주의)

1. **미러링 x 반전 누락** → 손과 꽃이 반대로 움직임(8절).
2. **스무딩 없음** → 무조건 떨림. One Euro 필수(10절).
3. **인식/렌더 루프 미분리** → 끊김. ref로 분리(3절).
4. **자산 절대경로** → GH Pages 404. `BASE_URL` 사용(13절).
5. **WASM/패키지 버전 불일치** → 런타임 에러. 버전 일치(Phase 0).
6. **브랜치/배포 혼동** → 작업은 항상 `dev`, 개발 중 트리거도 `dev`. main 직접 커밋 금지. Phase 5에서만 트리거를 main으로 바꾸고 머지(1절·13절·Phase 5).
