# Agent Note: Electron desktop shell over the Web application

Status: implemented

English | [中文](2026-08-14-electron-desktop-shell.zh.md)

## Problem

DeepSeek Harness needs installable Windows, Linux, and macOS applications without introducing a second UI or server implementation and without changing the `dsh web` CLI contract.

## Decision

The `apps/desktop` workspace is an Electron supervisor for the production `@deepseek-ai/dsh` CLI. Packaging stages the CLI's production dependency closure with `pnpm deploy`. At runtime the Electron executable runs that deployed CLI in Node mode with the existing `web --host 127.0.0.1 --port 0` arguments, waits for the existing `dsh web:` readiness line, and loads the reported loopback URL.

The renderer uses context isolation and Chromium sandboxing with Node integration disabled. Preload exposes only frozen platform and Electron-version metadata. The main process denies permission requests and new windows, keeps navigation on the owned loopback origin, and sends ordinary HTTP(S) links to the system browser.

The desktop process owns the child service lifecycle. Application shutdown sends the CLI its ordinary termination signal and waits for exit, with a bounded forced termination for a child that does not reach quiescence.

## Alternatives considered

- **Import the Web bundle into the Electron main process.** This avoids a child process, but couples Electron lifetime and module resolution to the Cordis application tree and gives desktop-only failures access to the server process.
- **Load the built frontend directly from `file://`.** The Web shell is not standalone: `dsh web` injects boot data and owns the API, WebSocket, trust checks, and static routes.
- **Reimplement the HTTP/API host for Electron.** This duplicates the supported Web path and would make CLI and desktop behavior drift.

## Consequences

- Browser and desktop users execute the same profile composition, frontend artifacts, persistence, and API implementation.
- A desktop installation includes Electron and the deployed production CLI closure, increasing installer size in exchange for process isolation and unchanged server ownership.
- Installer generation is platform-matrix work. Signing, notarization, release credentials, and auto-update policy remain distributor-owned.
- Lifecycle tests exercise readiness, early failure, and quiescent shutdown without starting Electron; target-system smoke tests still verify packaged resource paths and native dependencies.
