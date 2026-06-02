# 🌸 Generative Flower — 손동작 기반 제너러티브 꽃 미디어아트

웹캠으로 손을 인식하고(MediaPipe HandLandmarker), 손가락 제스처에 반응하는 **제너러티브 꽃 비주얼**을 Three.js(React Three Fiber)로 렌더링하는 1인용 인터랙티브 웹 데모. 모델 학습·데이터 수집 없이, 구글 사전학습 모델을 브라우저에서 **추론만** 한다.

**라이브 데모:** https://jinsoo-96.github.io/generative-flower/

> ⚠️ 웹캠과 카메라 권한이 필요합니다. **데스크톱 Chrome 권장.** HTTPS(GitHub Pages)에서만 카메라가 동작합니다.

## 조작법

| 손동작 | 반응 |
| --- | --- |
| 손 이동 | 꽃이 손을 따라 이동 |
| 손 가까이/멀리 | 꽃 크기 변화 |
| 엄지–검지 핀치 | 봉오리 ↔ 만개 개화 |
| 펼친 손가락 수(1·2·3) | 꽃 종류 전환 |
| 손목 회전 | 꽃 회전 |
| 주먹 | 꽃잎 흩뿌리기 |

## 개발

```bash
npm install
npm run dev        # 로컬 개발 서버
npm run typecheck  # tsc -b --noEmit
npm run lint
npm run test       # vitest (합성 입력 단위 테스트)
npm run build      # tsc -b && vite build
```

- 기술 스택: Vite + React 19 + TypeScript, React Three Fiber v9 / drei v10 / postprocessing v3, `@mediapipe/tasks-vision`.
- 상세 개발 명세: [docs/DEV_PLAN.md](docs/DEV_PLAN.md), 진행 로그: [PROGRESS.md](PROGRESS.md).

## 배포

GitHub Actions가 `dev` 푸시마다 GitHub Pages로 자동 배포(빌드 헬스 체크). 릴리스 시 트리거를 `main`으로 전환해 프로덕션 승격. 자세한 내용은 [docs/DEV_PLAN.md](docs/DEV_PLAN.md) §13 참고.
