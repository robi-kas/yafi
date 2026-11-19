import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname) } },
  test: {
    // Pure unit tests only; the *.test.ts files that need a live database are
    // run manually with `npx vitest run test/<file>`.
    include: ['test/**/*.unit.test.ts'],
  },
})
