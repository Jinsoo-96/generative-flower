/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: GitHub Pages project page → "/<REPO_NAME>/". Every asset must be
// referenced via import.meta.env.BASE_URL so it resolves under this base
// (especially public/models/hand_landmarker.task). See docs/DEV_PLAN.md §13.
export default defineConfig({
  base: '/generative-flower/',
  plugins: [react()],
  test: {
    // Pure-function units (gesture/mapping/smoothing) run in node by default.
    // DOM-dependent specs opt in per-file with `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
