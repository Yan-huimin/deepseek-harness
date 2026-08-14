/** Supervision of the packaged `dsh web` child process. */

import type { ChildProcessByStdio, SpawnOptions } from 'node:child_process'
import { spawn } from 'node:child_process'
import type { Readable } from 'node:stream'

const READY_LINE = /^dsh web: (http:\/\/127\.0\.0\.1:\d+)/m
const START_TIMEOUT_MS = 30_000
const STOP_TIMEOUT_MS = 5_000

/** A running local Web service owned by the desktop application. */
export interface DesktopServer {
  /** Canonical loopback URL reported by `dsh web`. */
  url: string
  /** Request graceful termination and wait until the child reaches quiescence. */
  stop(): Promise<void>
}

/** Injectable process launcher used by lifecycle tests. */
export type SpawnServer = (
  command: string,
  args: readonly string[],
  options: Omit<SpawnOptions, 'stdio'> & { stdio: ['ignore', 'pipe', 'pipe'] },
) => ChildProcessByStdio<null, Readable, Readable>

/** Options for starting the packaged Web service. */
export interface StartDesktopServerOptions {
  /** Electron executable, reused as Node through ELECTRON_RUN_AS_NODE. */
  executable: string
  /** Built `@deepseek-ai/dsh` bin entry. */
  serverEntry: string
  /** Default workspace directory for sessions opened by the desktop app. */
  workspace: string
  /** Process environment inherited by the server. */
  env: NodeJS.ProcessEnv
  /** Test replacement for node:child_process.spawn. */
  spawnServer?: SpawnServer
  /** Readiness deadline in milliseconds. */
  startTimeoutMs?: number
  /** Graceful shutdown deadline in milliseconds. */
  stopTimeoutMs?: number
}

/**
 * Start `dsh web` on an OS-selected loopback port and resolve only after its
 * existing readiness line is emitted.
 * @param options - executable, deployed CLI entry, workspace, and lifecycle hooks.
 * @returns the ready local service and its quiescent stop operation.
 */
export async function startDesktopServer(options: StartDesktopServerOptions): Promise<DesktopServer> {
  const spawnServer = options.spawnServer ?? spawn
  const child = spawnServer(options.executable, [options.serverEntry, 'web', '--host', '127.0.0.1', '--port', '0'], {
    cwd: options.workspace,
    env: { ...options.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  let output = ''
  let settled = false

  const url = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error(`desktop: dsh web did not become ready within ${String(options.startTimeoutMs ?? START_TIMEOUT_MS)} ms`))
    }, options.startTimeoutMs ?? START_TIMEOUT_MS)
    const finish = (action: () => void): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      action()
    }
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8')
      const match = READY_LINE.exec(output)
      const readyUrl = match?.[1]
      if (readyUrl !== undefined) finish(() => { resolve(readyUrl) })
    })
    child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.once('error', (error) => { finish(() => { reject(error) }) })
    child.once('exit', (code, signal) => {
      finish(() => {
        reject(new Error(`desktop: dsh web exited before readiness (code ${String(code)}, signal ${String(signal)})\n${output.trim()}`))
      })
    })
  })

  return {
    url,
    async stop() {
      if (child.exitCode !== null || child.signalCode !== null) return
      const exited = new Promise<void>((resolve) => { child.once('exit', () => { resolve() }) })
      child.kill('SIGTERM')
      const timeoutMs = options.stopTimeoutMs ?? STOP_TIMEOUT_MS
      const timeout = new Promise<void>((resolve) => {
        setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
          resolve()
        }, timeoutMs)
      })
      await Promise.race([exited, timeout])
    },
  }
}
