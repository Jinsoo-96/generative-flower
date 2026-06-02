import './styles.css'
import { DebugOverlay } from './ui/DebugOverlay'

/**
 * Phase 0-B: webcam + MediaPipe hand-landmark debug overlay.
 * The R3F flower scene replaces this in Phase 1+. The debug view is kept
 * (later behind a toggle) so tracking can be eyeballed from the live URL.
 */
function App() {
  return (
    <main className="app">
      <header className="app-title">
        <h1>🌸 Generative Flower</h1>
        <p className="muted">Phase 0-B · 손 인식 디버그 — “카메라 시작”을 눌러 손을 비춰보세요</p>
      </header>
      <DebugOverlay />
    </main>
  )
}

export default App
