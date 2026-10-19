# 变更日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。三个包（`@virt-table/vanilla` /
`react` / `vue`）共用同一个版本号。

## [未发布]

**首个公开版本。** 能力清单见 [README](./README.md#特性) 与
[文档站](https://kolarorz.github.io/virt-table/)，这里只记与「发布形态」有关的决定，
它们直接影响使用方怎么引这个包。

### 新增

- **三个包**：`@virt-table/vanilla`（表格本体，零框架依赖）、`@virt-table/react`
  （peerDep react ≥18）、`@virt-table/vue`（peerDep vue ≥3）。表格能力全在 vanilla，
  两个封装包只做框架侧桥接；插件与内置组件与框架无关，三端都直接从 vanilla 引。
- **多入口按需引入**：`/plugins`、`/plugins/<名>`、`/components`、
  `/components/vt-filter-builder`、`/ai-query`、`/infer-columns`，各自的 CSS 独立产出。
  实测从 barrel 引 1 个插件只增加约 4.7 kB、1 个组件约 2.8 kB；核心产物 gzip 约 84 kB。
- **ESM + CJS + UMD 三种产物**，`exports` 的 `types` 按 `import` / `require` 条件分流
  （`require` 条件配 `.d.cts`），`moduleResolution: bundler` / `node16` / `nodenext`
  三种解析方式下、消费者自身是 ESM 或 CJS 均已实测通过。
- **`ai-query` 与 `infer-columns` 是零 DOM 的纯逻辑入口**，可以在 Node / 服务端跑
  （模型产出的校验、列推断都更该发生在那一侧）。

### 工程

- 许可证 MIT。
- 新增 `pnpm verify:pack`（`scripts/verify-pack.mjs`）：对着**打包后的 tarball** 校验
  exports 目标、CSS 产物名、`.d.cts` 配对、文件泄漏，并真实 `import()` + `require()`
  每个子路径。本仓库的 demo 与 typecheck 全部走 `src` 别名，产物与 exports 映射没有
  真实消费者，这一步是唯一能兜住它们的地方。
- 新增 `pnpm release` / `pnpm release:dry`（`scripts/release.mjs`），流程见
  [发布流程](./contributing/publishing.md)。
- 依赖的 `@virt-list/core` 升到 0.0.7（其 `update` 事件新增第三个参数 `reason`，
  表格已原样透传；对使用方不是破坏性变更 —— 少写参数的旧 handler 仍然可赋值）。
