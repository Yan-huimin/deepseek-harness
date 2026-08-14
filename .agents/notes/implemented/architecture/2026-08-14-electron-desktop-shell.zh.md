# Agent Note: 基于 Web 应用的 Electron 桌面外壳

Status: implemented

[English](2026-08-14-electron-desktop-shell.md) | 中文

## Problem

DeepSeek Harness 需要可安装的 Windows、Linux 和 macOS 应用，同时不能引入第二套 UI 或服务实现，也不能改变 `dsh web` 的 CLI 约定。

## Decision

工作区 `apps/desktop` 是正式 `@deepseek-ai/dsh` CLI 的 Electron 监管进程。打包时使用 `pnpm deploy` 暂存 CLI 的生产依赖闭包。运行时，Electron 可执行文件以 Node 模式运行已部署的 CLI，传入现有的 `web --host 127.0.0.1 --port 0` 参数，等待现有的 `dsh web:` 就绪行，再加载其中报告的回环 URL。

渲染进程启用上下文隔离和 Chromium 沙箱，并禁用 Node 集成。预加载层只暴露冻结的平台与 Electron 版本信息。主进程拒绝权限请求和新窗口，将导航限制在其拥有的回环源，并将普通 HTTP(S) 链接交给系统浏览器。

桌面进程拥有子服务的生命周期。应用退出时向 CLI 发送其常规终止信号并等待退出；如果子进程无法完全停稳，则在有界等待后强制终止。

## Alternatives considered

- **将 Web 组合包导入 Electron 主进程。** 这样可以避免子进程，但会把 Electron 生命周期和模块解析与 Cordis 应用树耦合，并让桌面端特有故障影响服务进程。
- **通过 `file://` 直接加载构建后的前端。** Web 外壳不能独立运行：`dsh web` 注入启动数据，并负责 API、WebSocket、信任检查和静态路由。
- **为 Electron 重新实现 HTTP/API host。** 这会复制受支持的 Web 路径，并造成 CLI 与桌面端行为分化。

## Consequences

- 浏览器与桌面用户运行相同的 profile 组合、前端产物、持久化和 API 实现。
- 桌面安装包同时包含 Electron 和已部署的正式 CLI 依赖闭包；安装包会增大，但换取进程隔离和不变的服务所有权。
- 安装包生成属于平台矩阵工作；签名、公证、发布凭据和自动更新策略仍由分发方负责。
- 生命周期测试在不启动 Electron 的情况下覆盖就绪、提前失败和完全停稳的退出；目标系统冒烟测试仍需验证打包资源路径和原生依赖。
