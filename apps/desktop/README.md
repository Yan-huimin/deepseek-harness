# DeepSeek Harness Desktop

English | [中文](README.zh.md)

This workspace application packages the existing `dsh web` surface in Electron. The main process starts the production `@deepseek-ai/dsh` CLI on an OS-selected loopback port, waits for its existing readiness signal, and loads that URL in a sandboxed window. Closing the app terminates the owned Web process. The browser CLI and `pnpm dsh web` remain unchanged.

## Development

Build the repository before starting the desktop shell:

```sh
pnpm install
pnpm run build
pnpm --filter dsh-desktop desktop
```

## Installers

Build installers on the target operating system:

```sh
pnpm --filter dsh-desktop dist:win
pnpm --filter dsh-desktop dist:linux
pnpm --filter dsh-desktop dist:mac
```

Windows emits an NSIS installer, Linux emits AppImage and Debian packages, and macOS emits DMG and ZIP artifacts under `apps/desktop/release/installers`. Each command stages the production dependency closure for `@deepseek-ai/dsh`; it does not duplicate the Web server implementation.

The checked-in `build/icon.png` is a placeholder derived from the Web favicon. Replace it with a reviewed 1024×1024 brand asset before a public release. Production distribution also requires platform signing: Authenticode on Windows, an Apple Developer ID plus notarization on macOS, and the distributor's chosen signing policy on Linux.

## Security

The renderer has Node integration disabled, context isolation and Chromium sandboxing enabled, and only receives frozen platform/version metadata from preload. The main process denies permission requests, popups, and navigation away from the owned loopback origin; ordinary HTTP(S) links open in the system browser.

## Known limitations

- Installers must be built on their target OS or in a platform matrix. macOS signing and notarization require macOS.
- The desktop workspace defaults to the user's Documents directory. Workspace selection remains the Web application's responsibility.
- Auto-update and code-signing credentials are intentionally not configured.
