# DeepSeek Harness 桌面端

[English](README.md) | 中文

这个工作区应用使用 Electron 打包现有的 `dsh web` 界面。主进程在操作系统分配的回环端口上启动正式的 `@deepseek-ai/dsh` CLI，等待其现有就绪信号，再由沙箱窗口加载该 URL。关闭应用时会终止其拥有的 Web 进程。浏览器 CLI 与 `pnpm dsh web` 的行为不变。

## 开发

启动桌面外壳前先构建仓库：

```sh
pnpm install
pnpm run build
pnpm --filter dsh-desktop desktop
```

## 安装包

在目标操作系统上构建安装包：

```sh
pnpm --filter dsh-desktop dist:win
pnpm --filter dsh-desktop dist:linux
pnpm --filter dsh-desktop dist:mac
```

Windows 生成 NSIS 安装器，Linux 生成 AppImage 和 Debian 包，macOS 生成 DMG 与 ZIP；产物位于 `apps/desktop/release/installers`。每条命令都会暂存 `@deepseek-ai/dsh` 的生产依赖闭包，不会复制 Web 服务实现。

仓库中的 `build/icon.png` 是从 Web favicon 生成的占位图标。公开发布前应替换为审核过的 1024×1024 品牌资源。正式分发还需要平台签名：Windows 使用 Authenticode，macOS 使用 Apple Developer ID 并完成公证，Linux 遵循分发渠道的签名策略。

## 安全

渲染进程禁用 Node 集成，启用上下文隔离与 Chromium 沙箱；预加载层只提供冻结的平台和版本信息。主进程拒绝权限请求、弹窗和离开自有回环源的页面导航；普通 HTTP(S) 链接交由系统浏览器打开。

## 已知限制

- 安装包必须在目标系统或平台矩阵中构建；macOS 签名和公证必须在 macOS 上完成。
- 桌面端默认以用户的“文档”目录作为工作区，工作区选择仍由 Web 应用负责。
- 本方案有意不配置自动更新和代码签名凭据。
