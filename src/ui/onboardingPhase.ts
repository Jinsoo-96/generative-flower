import type { WebcamStatus } from '../tracking/useWebcam'
import type { LandmarkerStatus } from '../tracking/useHandLandmarker'

export type OnboardingPhaseName = 'intro' | 'loading' | 'error' | 'hidden'

/** Which onboarding state to show for the given camera + model status. */
export function onboardingPhase(cam: WebcamStatus, model: LandmarkerStatus): OnboardingPhaseName {
  if (cam === 'ready' && model === 'ready') return 'hidden'
  if (cam === 'denied' || cam === 'unsupported' || cam === 'error') return 'error'
  if (cam === 'starting' || (cam === 'ready' && model === 'loading')) return 'loading'
  return 'intro'
}
