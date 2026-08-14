import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { startDesktopServer } from '../src/server-process.ts'

const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/${name}`, import.meta.url))

describe('desktop server process', () => {
  it('uses the existing readiness line and reaches quiescence on stop', async () => {
    const server = await startDesktopServer({
      executable: process.execPath,
      serverEntry: fixture('ready-server.mjs'),
      workspace: process.cwd(),
      env: process.env,
      startTimeoutMs: 2_000,
      stopTimeoutMs: 2_000,
    })
    expect(server.url).toBe('http://127.0.0.1:43123')
    await server.stop()
  })

  it('reports output when the server exits before readiness', async () => {
    await expect(startDesktopServer({
      executable: process.execPath,
      serverEntry: fixture('failed-server.mjs'),
      workspace: process.cwd(),
      env: process.env,
      startTimeoutMs: 2_000,
    })).rejects.toThrow(/fixture startup failure/)
  })
})
