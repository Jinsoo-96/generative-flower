import type { WebcamStatus } from '../tracking/useWebcam'
import type { LandmarkerStatus } from '../tracking/useHandLandmarker'
import { onboardingPhase } from './onboardingPhase'

export interface OnboardingProps {
  camStatus: WebcamStatus
  modelStatus: LandmarkerStatus
  camError: string | null
  modelError: string | null
  onStart: () => void
}

/**
 * Onboarding / permission gate (DEV_PLAN §4 Onboarding). Pure DOM, prop-driven
 * (no Canvas / context) so it renders & tests in jsdom. Permission is requested
 * only on the user's "시작" click (DEV_PLAN §13.4).
 */
export function Onboarding({ camStatus, modelStatus, camError, modelError, onStart }: OnboardingProps) {
  const phase = onboardingPhase(camStatus, modelStatus)
  if (phase === 'hidden') return null

  return (
    <div className="start-card" role="dialog" aria-label="onboarding">
      <h1>🌸 Generative Flower</h1>

      {phase === 'intro' && (
        <>
          <p>손동작으로 피어나는 제너러티브 꽃</p>
          <ul className="howto">
            <li>✋ 손을 움직이면 꽃이 따라옵니다</li>
            <li>🤏 엄지–검지 핀치로 봉오리 ↔ 만개</li>
            <li>☝️ 펼친 손가락 수(1·2·3)로 꽃 종류 전환</li>
            <li>✊ 주먹을 쥐면 꽃잎이 흩어집니다</li>
          </ul>
          <button type="button" onClick={onStart}>
            카메라 시작
          </button>
          <p className="muted">데스크톱 Chrome 권장 · 카메라 권한이 필요합니다</p>
        </>
      )}

      {phase === 'loading' && (
        <>
          <div className="spinner" aria-label="loading" />
          <p className="muted">
            {camStatus === 'starting' ? '카메라 권한 요청 중…' : '손 인식 모델 로딩 중…'}
          </p>
        </>
      )}

      {phase === 'error' && (
        <>
          <p className="debug-error">{camError ?? modelError ?? '문제가 발생했습니다.'}</p>
          <button type="button" onClick={onStart}>
            다시 시도
          </button>
        </>
      )}
    </div>
  )
}
