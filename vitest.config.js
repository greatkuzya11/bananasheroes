import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/globals.js'],
    environmentOptions: {
      jsdom: {
        // Allows jsdom to execute inline <script> tags – used by loadScript helper
        runScripts: 'dangerously',
      },
    },
    coverage: {
      provider: 'v8',
      include: ['js/**/*.js'],
      reporter: ['text', 'html'],
    },
  },
})
